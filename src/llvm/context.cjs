/** CodegenContext: 
 */
class CodegenContext {
    constructor() {
        this.tempCounter = 0;   // It is a sequential name generator that works like a base-26 numbering system  similar to Excel columns.
        this.emitedCode = [];   // It is an array that stores the lines of LLVM IR code generated 
        this.allocaCounter = 0; // It is a sequential name generator for alloca instructions, which are used to allocate memory on the stack for variables. 
        this.globals = [];      // It is an array that stores the lines of LLVM IR code for global declarations
        this.labelCounter = 0;  // It is a sequential name generator for labels, which are used to mark positions in the code for control flow
    }
    nextLabel(prefix = 'label') {
        return `${prefix}_${this.labelCounter++}`;
    }
    nextTemp() { // It is a sequential name generator that works like a base-26 numbering system (lowercase letters a to z), similar to Excel columns.
        const index = this.tempCounter++;
        let name = '';
        let n = index;
        do {
            name = String.fromCharCode('a'.charCodeAt(0) + (n % 26)) + name;
            n = Math.floor(n / 26) - 1;
        } while (n >= 0);
        return `%tmp_${name}`;
    }
    emit(line, { global = false } = {}) {
        if (line) {
            if (global) {
                this.globals.push(line);
            } else {
                this.emitedCode.push(line);
            }
        }
    }
    getCode() {
        return this.emitedCode.join('\n');
    }
    nextAllocaName(dragonName) {
        const clean = String(dragonName || '').replace(/^\$/, '') || 'var';
        const id = this.allocaCounter++;
        return `%.${clean}.${id}.addr`;
    }
    setAddress(address, astNode) {
        if (astNode && astNode._symbolEntry) {
            astNode._symbolEntry.address = address;
        }
    }

}

module.exports = CodegenContext;