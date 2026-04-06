/**
 * Scope Analysis Module
 * 
 * Performs semantic analysis on the AST to:
 * 1. Build symbol tables for each block
 * 2. Resolve variable declarations and uses
 * 3. Validate scope constraints:
 *    - No undeclared variables
 *    - No redeclarations in the same block
 *    - Break statements only inside loops
 */

const traverse = require('@babel/traverse').default;
const { extractTypeInfo: extractTypeFromNode } = require('./ast-builders.cjs');

/**
 * Represents a symbol (variable) in a scope.
 * 
 * Properties:
 *   - name: variable identifier
 *   - type: {baseType, dimensions}
 *   - declaredAt: source location {line, column}
 *   - block: the BlockStatement where declared
 */
class SymbolEntry {
    constructor(name, type, sourceLocation, block) {
        this.name = name;
        this.type = type;              // {baseType: 'int'|'float'|'bool'|'char', dimensions: []}
        this.declaredAt = sourceLocation;
        this.block = block; //  Reference to the AST BlockStatement node where this symbol was declared
    }
}

/**
 * Represents a scope (symbol table) for a block.
 * 
 * Properties:
 *   - block: the BlockStatement node
 *   - parent: parent Scope (null for global)
 *   - symbols: Map<name, SymbolEntry>
 */
class Scope {
    constructor(block, parent = null) {
        this.block = block;   // Reference to the AST BlockStatement node that this scope corresponds to
        this.parent = parent; // Parent scope (null for global)
        this.symbols = new Map(); // Map of variable name to SymbolEntry for variables declared in this block
    }

    /**
     * Look up a symbol in this scope or parent scopes.
     * Returns the SymbolEntry or null if not found.
     */
    lookup(name) {
       /* fill here */
    }

    /**
     * Define a symbol in this scope only.
     * Returns true if successful, false if already exists in this scope.
     */
    define(name, entry) {
        /* fill here */
    }

    /**
     * Get all symbols defined in this scope (not parents).
     */
    getLocalSymbols() {
        /* fill here */
    }
}

/**
 * Scope analysis visitor - performs AST traversal and semantic analysis.
 */
class ScopeAnalysis {
    constructor(ast, options = {}) {
        this.ast = ast;
        this.options = options;
        this.globalScope = null;
        this.currentScope = null;
        this.loopStack = [];           // Stack of currently active loop nodes
        this.errors = [];
    }

    analyze(ast) {
        /* fill here */ 
    }

    /* fill here the methods of this class */
    
}

function scopeAnalyze(ast, options = {}) {
    const analyzer = new ScopeAnalysis(ast, options);
    analyzer.analyze(ast);
    // Attach errors to AST for access by CLI
    ast._scopeErrors = analyzer.errors;
    return ast;
}

module.exports = {
    Scope,
    SymbolEntry,
    ScopeAnalysis,
    scopeAnalyze,
};