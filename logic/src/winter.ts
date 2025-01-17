function view(
    _target: any,
    _context: ClassMethodDecoratorContext
) {
    // View decorator just marks the method
}

function external(
    _target: any,
    _context: ClassMethodDecoratorContext
) {
    // External decorator just marks the method
}

class winter {
    private x: number;
    private y: number;

    constructor(initialValue: number = 0) {
        this.x = initialValue;
        this.y = initialValue;
    }

    @view
    public getX(): number {
        return this.x;
    }

    @external
    public moveX(): number {
        this.x += 1;
        return this.x;
    }

    @external
    public moveY(): number {
        this.y -= 1;
        return this.y;
    }

    @external
    public moveBoth(x: number, y: number): number {
        this.x += x;
        this.y += y;
        return this.x;
    }
}

export default winter;