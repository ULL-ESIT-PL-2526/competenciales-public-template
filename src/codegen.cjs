/*
Elegant JavaScript code generation using Babel traverse and Emitter class.
This approach separates code emission from AST traversal and avoids AST pollution.
*/

const generate = require("@babel/generator").default;
const path = require('path');
const { SourceMapGenerator } = require('source-map');
const traverse = require('@babel/traverse').default;

/**
 * Emitter class: Handles code generation without polluting the AST
 * Uses a WeakMap to associate nodes with their emitted code
 */
class Emitter {
    constructor() {
        this.output = [];
        this.nodeCode = new WeakMap();  // Maps AST nodes to generated code
        this.nodeMappings = new WeakMap();  // Maps AST nodes to source mappings
        this.indent = 0;
    }

    /**
     * Store generated code for a node without modifying it
     */
    setCode(node, code) {
       /* fill here */   
    }

    /**
     * Retrieve generated code for a node
     */
    getCode(node) {
        /* fill here */
    }

    /**
     * Store source mappings for a node
     */
    setMappings(node, mappings) {
        /* fill here */
    }

    /**
     * Retrieve source mappings for a node
     */
    getMappings(node) {
        /* fill here */
    }

    /**
     * Count lines in a string
     */
    countLines(text) {
        /* fill here */
    }

    /**
     * Create a source mapping
     */
    createMapping(node, generatedLine) {
        /* fill here */
    }

    /**
     * Shift mappings by line offset
     */
    shiftMappings(mappings, lineOffset) {
        /* fill here */
    }

    /**
     * Get final generated code
     */
    finalize() {
        return this.output.join('');
    }
}

/**
 * Main codegen function
 */
function generateJavaScript(ast, options = {}, source = '', sourceFile = '') {
    if (options.codegen === 'manual') {
        return generateJSManually(ast, source, sourceFile);
    }

    const result = generate(
        ast,
        {
            sourceMaps: true,
            sourceFileName: sourceFile,
            compact: false,
            retainLines: true
        },
        source
    );

    // Clean source map names (remove $ prefix from Dragon variables)
    if (result.map) {
        result.map = cleanSourceMapNames(result.map);
    }

    return result;
}

/**
 * Custom manual code generation using Emitter
 */
function generateJSManually(ast, source = '', sourceFile = '') {
    const emitter = new Emitter();

    // Traverse the AST and emit code for each node type
    traverse(ast, {
        noScope: true,

        NumericLiteral(path) {
            emitter.setCode(path.node, String(path.node.value));
        },

        /* fill here. Implement other node types similarly, using emitter.setCode() to store generated code and emitter.setMappings() to store source mappings for each node. */
    });

    // Extract final code and mappings
    const code = emitter.getCode(ast) || '';
    const mappings = emitter.getMappings(ast) || [];

    return {
        code,
        map: buildSourceMap(code, source, sourceFile, mappings),
    };
}

/**
 * Build a source map from mappings
 */
function buildSourceMap(code, source, sourceFile, mappings) {
    if (!sourceFile) return null;

    /* fill here  */
    const sourceMap = map.toJSON();
    return cleanSourceMapNames(sourceMap);
}

/**
 * Remove $ prefix from Dragon variable names in source maps
 */
function cleanSourceMapNames(sourceMap) {
    /* fill here */
    return sourceMap;
}

module.exports = generateJavaScript;
