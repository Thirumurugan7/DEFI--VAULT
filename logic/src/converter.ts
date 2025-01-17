import * as ts from 'typescript';

interface CairoType {
    name: string;
    cairoType: string;
}

interface CairoParameter {
    name: string;
    type: string;
}

interface CairoFunction {
    name: string;
    parameters: CairoParameter[];
    returnType: string;
    visibility: 'external' | 'internal';
    body: string[];
    isView: boolean;
}

interface CairoStorage {
    name: string;
    type: string;
}

interface CairoContract {
    name: string;
    storage: CairoStorage[];
    functions: CairoFunction[];
}

export class TypeScriptToCairoConverter {
    private sourceFile: ts.SourceFile;
    private contract: CairoContract;
    private typeMap: Map<string, string>;

    constructor(sourceCode: string) {
        this.sourceFile = ts.createSourceFile(
            'temp.ts',
            sourceCode,
            ts.ScriptTarget.Latest,
            true
        );
        
        this.contract = {
            name: '',
            storage: [],
            functions: [],
        };

        this.typeMap = new Map([
            ['number', 'felt252'],
            ['string', 'felt252'],
            ['boolean', 'bool'],
            ['bigint', 'u256'],
        ]);
    }

    private hasViewDecorator(node: ts.MethodDeclaration): boolean {
        const decorators = ts.getDecorators(node);
        if (!decorators || decorators.length === 0) return false;
        
        return decorators.some((decorator: ts.Decorator) => {
            const expr = decorator.expression;
            return ts.isIdentifier(expr) && expr.text === 'view';
        });
    }

    private hasExternalDecorator(node: ts.MethodDeclaration): boolean {
        const decorators = ts.getDecorators(node);
        if (!decorators || decorators.length === 0) return false;
        
        return decorators.some((decorator: ts.Decorator) => {
            const expr = decorator.expression;
            return ts.isIdentifier(expr) && expr.text === 'external';
        });
    }

    private processNode(node: ts.Node) {
        if (ts.isClassDeclaration(node)) {
            this.contract.name = node.name?.text || 'Contract';
            this.processClass(node);
        }
        ts.forEachChild(node, child => this.processNode(child));
    }

    private processClass(node: ts.ClassDeclaration) {
        // Process properties for storage
        node.members.forEach(member => {
            if (ts.isPropertyDeclaration(member)) {
                const name = member.name.getText();
                const type = member.type ? 
                    this.convertType(member.type) : 
                    'felt252';
                
                this.contract.storage.push({ name, type });
            }
        });

        // Process methods
        node.members.forEach(member => {
            if (ts.isMethodDeclaration(member)) {
                this.processMember(member);
            }
        });
    }

    private processMember(node: ts.MethodDeclaration) {
        if (!node.name) return;

        const methodName = node.name.getText();
        const parameters = this.processParameters(node.parameters);
        const returnType = node.type ? 
            this.convertType(node.type) : 
            'felt252';

        // Use the correct decorator check
        const isView = this.hasViewDecorator(node);
        const body = this.analyzeFunctionBody(node, isView);

        let cairoFunction: CairoFunction = {
            name: methodName,
            parameters,
            returnType,
            visibility: 'external',
            body,
            isView
        };

        this.contract.functions.push(cairoFunction);
    }

    private getReturnVariable(node: ts.Block): string | undefined {
        let returnVar: string | undefined;
        
        const visitor = (node: ts.Node) => {
            if (ts.isReturnStatement(node)) {
                if (node.expression && ts.isPropertyAccessExpression(node.expression)) {
                    if (node.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
                        returnVar = node.expression.name.getText();
                    }
                }
            }
            ts.forEachChild(node, visitor);
        };
        
        visitor(node);
        return returnVar;
    }
    private findReturnExpression(node: ts.Block): string | undefined {
        const returnStmt = this.findReturnStatement(node);
        if (!returnStmt || !returnStmt.expression) return undefined;

        // Handle property access (this.x, this.y)
        if (ts.isPropertyAccessExpression(returnStmt.expression)) {
            const prop = returnStmt.expression.name.getText();
            return `self.${prop}.read()`;
        }

        // Handle binary expression (this.x , this.y)
        if (ts.isBinaryExpression(returnStmt.expression)) {
            if (ts.isPropertyAccessExpression(returnStmt.expression.left)) {
                const prop = returnStmt.expression.left.name.getText();
                return `self.${prop}.read()`;
            }
        }

        return undefined;
    }

    private findReturnStatement(node: ts.Block): ts.ReturnStatement | undefined {
        let returnStmt: ts.ReturnStatement | undefined;

        const visitor = (node: ts.Node) => {
            if (ts.isReturnStatement(node)) {
                returnStmt = node;
                return;
            }
            ts.forEachChild(node, visitor);
        };

        visitor(node);
        return returnStmt;
    }

    private analyzeFunctionBody(node: ts.MethodDeclaration, isView: boolean): string[] {
        if (!node.body) return [];
        const body: string[] = [];

        if (isView) {
            const stateVar = this.findStateVariableAccess(node.body)[0];
            return [`self.${stateVar}.read()`];
        }

        // Handle state modifications
        const modifications = this.extractStateModifications(node.body);
        modifications.forEach(mod => {
            body.push(`self.${mod.variable}.write(${mod.expression});`);
        });

        // Handle return statement
        const returnExpr = this.findReturnExpression(node.body);
        if (returnExpr) {
            body.push(returnExpr);
        }

        return body;
    }
    private findStateVariableAccess(node: ts.Node): string[] {
        const stateVars: string[] = [];
        const visitor = (node: ts.Node) => {
            if (ts.isPropertyAccessExpression(node) && 
                node.expression.kind === ts.SyntaxKind.ThisKeyword) {
                stateVars.push(node.name.getText());
            }
            ts.forEachChild(node, visitor);
        };
        visitor(node);
        return [...new Set(stateVars)];
    }

    private checkIfModifiesState(node: ts.Node): boolean {
        let modifiesState = false;
        const visitor = (node: ts.Node) => {
            if (ts.isBinaryExpression(node) && 
                ts.isPropertyAccessExpression(node.left) &&
                node.left.expression.kind === ts.SyntaxKind.ThisKeyword) {
                modifiesState = true;
            }
            ts.forEachChild(node, visitor);
        };
        visitor(node);
        return modifiesState;
    }
    private extractStateModifications(node: ts.Node): Array<{type: 'assignment', variable: string, expression: string}> {
        const modifications: Array<{type: 'assignment', variable: string, expression: string}> = [];
        
        const visitor = (node: ts.Node) => {
            if (ts.isBinaryExpression(node)) {
                if (ts.isPropertyAccessExpression(node.left) && 
                    node.left.expression.kind === ts.SyntaxKind.ThisKeyword) {
                    const variable = node.left.name.getText();
                    let expression: string;
                    
                    if (node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken) {
                        const amount = node.right.getText();
                        expression = `self.${variable}.read() + ${amount}`;
                    } else if (node.operatorToken.kind === ts.SyntaxKind.MinusEqualsToken) {
                        const amount = node.right.getText();
                        expression = `self.${variable}.read() - ${amount}`;
                    } else {
                        // Regular assignment
                        if (ts.isPropertyAccessExpression(node.right) && 
                            node.right.expression.kind === ts.SyntaxKind.ThisKeyword) {
                            // Handle assignments between state variables
                            const rightVar = node.right.name.getText();
                            expression = `self.${rightVar}.read()`;
                        } else {
                            expression = node.right.getText();
                        }
                    }
                    
                    modifications.push({
                        type: 'assignment',
                        variable,
                        expression
                    });
                }
            }
            ts.forEachChild(node, visitor);
        };
        
        visitor(node);
        return modifications;
    }

    private hasReturnStatement(node: ts.Node): boolean {
        let hasReturn = false;
        const visitor = (node: ts.Node) => {
            if (ts.isReturnStatement(node)) {
                hasReturn = true;
            }
            if (!hasReturn) {
                ts.forEachChild(node, visitor);
            }
        };
        visitor(node);
        return hasReturn;
    }

    private processParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>): CairoParameter[] {
        return parameters.map(param => ({
            name: param.name.getText(),
            type: param.type ? this.convertType(param.type) : 'felt252'
        }));
    }

    private convertType(typeNode: ts.TypeNode): string {
        const typeText = typeNode.getText();
        return this.typeMap.get(typeText) || 'felt252';
    }

    public convert(): string {
        this.processNode(this.sourceFile);
        return this.generateCairoCode();
    }

   

    private generateCairoCode(): string {
        let code = [
            '#[starknet::interface]',
            `pub trait I${this.contract.name}<TContractState> {`,
            this.generateInterfaceFunctions(),
            '}',
            '',
            '#[starknet::contract]',
            `mod ${this.contract.name} {`,
            '    use core::starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};',
            '',
            '    #[storage]',
            '    struct Storage {',
            this.generateStorageVariables(),
            '    }',
            '',
            '    #[abi(embed_v0)]',
            `    impl ${this.contract.name}Impl of super::I${this.contract.name}<ContractState> {`,
            this.generateImplementationFunctions(),
            '    }',
            '}'
        ];

        return code.join('\n');
    }

    


    private generateStorageVariables(): string {
        return this.contract.storage
            .map(storage => `        ${storage.name}: ${storage.type}`)
            .join(',\n');
    }

    private generateInterfaceFunctions(): string {
        return this.contract.functions.map(func => {
            const params = func.parameters
                .map(p => `${p.name}: ${p.type}`)
                .join(', ');
            // For view functions use @TContractState, for others use ref
            const selfParam = func.isView ? 
                'self: @TContractState' : 
                'ref self: TContractState';
            const allParams = [selfParam, params].filter(Boolean).join(', ');
            return `    fn ${func.name}(${allParams}) -> ${func.returnType};`;
        }).join('\n');
    }

    private generateImplementationFunctions(): string {
        return this.contract.functions.map(func => {
            const params = func.parameters
                .map(p => `${p.name}: ${p.type}`)
                .join(', ');
            // For view functions use @ContractState, for others use ref
            const selfParam = func.isView ? 
                'self: @ContractState' : 
                'ref self: ContractState';
            const allParams = [selfParam, params].filter(Boolean).join(', ');
            
            return [
                `        fn ${func.name}(${allParams}) -> ${func.returnType} {`,
                ...func.body.map(line => `            ${line}`),
                '        }'
            ].join('\n');
        }).join('\n\n');
    }


}