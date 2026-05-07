/**
 * Test Helpers for Dragon Compiler Tests
 * 
 * Provides reusable utilities to eliminate boilerplate in test files.
 * Reduces duplication from ~25 repeated test setup patterns.
 */

const path = require('path');
const fs = require('fs');
const parser = require('../src/parser.cjs');
const { scopeAnalyze } = require('../src/scope-analysis.cjs');
const { typeCheck } = require('../src/type-check.cjs');

/**
 * Setup pipeline: Parse → Scope Analysis → Type Checking
 * This is the standard test pattern repeated 25+ times across test files.
 * 
 * @param {string} sourcePath - Path to .drg file (relative to __dirname or absolute)
 * @param {Object} options - Configuration options
 * @param {boolean} options.skipScopeAnalysis - Skip scope analysis phase (default: false)
 * @param {boolean} options.skipTypeCheck - Skip type checking phase (default: false)
 * @returns {Object} AST with {_scopeErrors, _typeErrors} attached
 * @throws {Error} If file reading or parsing fails
 * 
 * @example
 * // Standard usage
 * const ast = setupDragonCode('fixtures/type-err01.drg');
 * expect(ast._typeErrors.length).toBeGreaterThan(0);
 * 
 * @example
 * // Skip type checking
 * const ast = setupDragonCode('fixtures/scope-err01.drg', { skipTypeCheck: true });
 * expect(ast._scopeErrors.length).toBeGreaterThan(0);
 */
function setupDragonCode(sourcePath, options = {}) {
    const { skipScopeAnalysis = false, skipTypeCheck = false } = options;
    
    // Resolve path - support both relative to test file and absolute paths
    const resolvedPath = sourcePath.startsWith('/') 
        ? sourcePath 
        : path.resolve(__dirname, sourcePath);
    
    // Read source file
    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Test fixture not found: ${resolvedPath}`);
    }
    const source = fs.readFileSync(resolvedPath, 'utf8');
    
    // Parse
    let ast = parser.parse(source);
    
    // Scope analysis
    if (!skipScopeAnalysis) {
        ast = scopeAnalyze(ast);
    }
    
    // Type checking
    if (!skipScopeAnalysis && !skipTypeCheck) {
        ast = typeCheck(ast);
    }
    
    return ast;
}

/**
 * Setup pipeline with inline source code
 * 
 * @param {string} source - Dragon source code as string
 * @param {Object} options - Configuration options (same as setupDragonCode)
 * @returns {Object} AST with errors attached
 * 
 * @example
 * const ast = setupDragonCodeInline('{ int x; print(x); }');
 * expect(ast._typeErrors).toBeDefined();
 */
function setupDragonCodeInline(source, options = {}) {
    const { skipScopeAnalysis = false, skipTypeCheck = false } = options;
    
    // Parse
    let ast = parser.parse(source);
    
    // Scope analysis
    if (!skipScopeAnalysis) {
        ast = scopeAnalyze(ast);
    }
    
    // Type checking
    if (!skipScopeAnalysis && !skipTypeCheck) {
        ast = typeCheck(ast);
    }
    
    return ast;
}

/**
 * Assert that errors exist of a specific type
 * 
 * @param {Object} ast - AST with errors
 * @param {number} expectedCount - Expected number of errors (or null to just check existence)
 * @param {string} errorType - Error type to check: 'Scope', 'Type', etc. (or null to check any)
 * 
 * @example
 * const ast = setupDragonCode('fixtures/type-err01.drg');
 * expectErrors(ast, 1, 'Type');  // Expect exactly 1 type error
 * 
 * @example
 * expectErrors(ast, undefined, 'Scope');  // Expect at least 1 scope error
 */
function expectErrors(ast, expectedCount, errorType) {
    let errors = [];
    let errorsProp = null;
    
    // Determine which error property to check
    if (errorType === 'Scope') {
        errors = ast._scopeErrors || [];
        errorsProp = '_scopeErrors';
    } else if (errorType === 'Type') {
        errors = ast._typeErrors || [];
        errorsProp = '_typeErrors';
    } else if (errorType) {
        // Generic error type
        errors = (ast._scopeErrors || []).concat(ast._typeErrors || [])
            .filter(e => e.type === errorType);
    } else {
        // Any error type
        errors = (ast._scopeErrors || []).concat(ast._typeErrors || []);
    }
    
    // Assertions
    expect(errors).toBeDefined();
    expect(errors.length).toBeGreaterThan(0);
    
    if (expectedCount !== undefined && expectedCount !== null) {
        expect(errors.length).toBe(expectedCount);
    }
}

/**
 * Assert that NO errors exist of a specific type
 * 
 * @param {Object} ast - AST with errors
 * @param {string} errorType - Error type to check: 'Scope', 'Type', etc. (or null for all)
 * 
 * @example
 * const ast = setupDragonCode('fixtures/simple00.drg');
 * expectNoErrors(ast, 'Type');  // No type errors allowed
 */
function expectNoErrors(ast, errorType) {
    let errors = [];
    
    if (errorType === 'Scope') {
        errors = ast._scopeErrors || [];
    } else if (errorType === 'Type') {
        errors = ast._typeErrors || [];
    } else if (errorType) {
        // Generic error type
        errors = (ast._scopeErrors || []).concat(ast._typeErrors || [])
            .filter(e => e.type === errorType);
    } else {
        // Any error type
        errors = (ast._scopeErrors || []).concat(ast._typeErrors || []);
    }
    
    expect(errors).toBeDefined();
    expect(errors.length).toBe(0);
}

/**
 * Get specific error message from error list
 * Useful for assertion on error content
 * 
 * @param {Object} ast - AST with errors
 * @param {number} index - Error index (0-based)
 * @param {string} errorType - Error type filter
 * @returns {string|null} Error message or null if not found
 * 
 * @example
 * const ast = setupDragonCode('fixtures/type-err01.drg');
 * const msg = getErrorMessage(ast, 0, 'Type');
 * expect(msg).toContain('Type mismatch');
 */
function getErrorMessage(ast, index, errorType) {
    let errors = [];
    
    if (errorType === 'Scope') {
        errors = ast._scopeErrors || [];
    } else if (errorType === 'Type') {
        errors = ast._typeErrors || [];
    } else {
        errors = (ast._scopeErrors || []).concat(ast._typeErrors || []);
    }
    
    return errors[index]?.message || null;
}

/**
 * Assert error message contains specific text
 * 
 * @param {Object} ast - AST with errors
 * @param {number} index - Error index
 * @param {string} text - Text that should be in the message
 * @param {string} errorType - Error type filter
 * 
 * @example
 * expectErrorMessage(ast, 0, 'mismatch', 'Type');
 */
function expectErrorMessage(ast, index, text, errorType) {
    const msg = getErrorMessage(ast, index, errorType);
    expect(msg).toContain(text);
}

module.exports = {
    setupDragonCode,
    setupDragonCodeInline,
    expectErrors,
    expectNoErrors,
    getErrorMessage,
    expectErrorMessage,
};
