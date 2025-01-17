

export interface CairoContract {
    name: string;
    storage: CairoStorage[];
    functions: CairoFunction[];
    events?: CairoEvent[];
}

export interface CairoStorage {
    name: string;
    type: string;
}

export interface CairoFunction {
    name: string;
    parameters: CairoParameter[];
    returnType: string;
    body: string[];
    visibility: 'public' | 'private' | 'external' | 'view';
    decorators: string[];
}

export interface CairoParameter {
    name: string;
    type: string;
}

export interface CairoEvent {
    name: string;
    parameters: CairoParameter[];
}