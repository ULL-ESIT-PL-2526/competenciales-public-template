// V8 is the JavaScript engine used by Node.js. It provides the 'vm' module to create and manage V8 contexts, 
// allowing us to execute code in a sandboxed environment. This is useful for running untrusted code or code 
// that we want to isolate from the main execution context.
// vm is a library providing APIs to compile and run code within V8 contexts.
// V8 contexts are created. Each context has: its own global object, its own scope chain. 
// Code is compiled to V8 bytecode. Execution happens inside that context. 
// Important: contexts share the same V8 isolate, meaning: same heap, same event loop, same native bindings
const vm = require('vm');

/**
 * Escapes special characters in a string so that it can be safely used in a regular expression. 
 * This is used to escape the generated filename when searching for it in stack traces.
 * @param {*} text 
 * @returns 
 */
function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts line/column from a runtime stack trace for a specific generated filename.
 * In this CLI flow, the VM filename is `${inputFile}.js`, so matching is done against that.
 * @param {string} stackText - The runtime stack trace text.
 * @param {string} filename - The generated filename to search for in stack frames.
 * @returns {Object|null} - The location object or null if not found.
 */
function extractLocationFromStack(stackText, filename) {
    if (!stackText) return null;
    const escaped = escapeRegExp(filename);
    const match = stackText.match(new RegExp(`${escaped}:(\\d+)(?::(\\d+))?`));
    if (!match) return null;
    return {
        line: parseInt(match[1], 10),
        column: match[2] ? parseInt(match[2], 10) : 1,
    };
}

/**
 * 
 * @param {*} err - The error thrown during sandbox execution.
 * @param {*} inputFile 
 * @returns {string} - The formatted error message including the location in the generated code if available.
 */
function formatSandboxRuntimeError(err, inputFile) {
    const lines = [`Error: ${err.message}`];
    const jsFile = `${inputFile}.js`;
    const where = extractLocationFromStack(err && err.stack, jsFile);

    if (where) {
        lines.push(`At generated code ${jsFile}:${where.line}:${where.column}`);
    }

    return lines.join('\n');
}

/**
 * Executes generated JavaScript code in a sandboxed context.
 * @param {*} jsCode 
 * @param {*} inputFile 
 * @param {*} param2 
 */
function executeInSandbox(jsCode, inputFile, { verbose = false } = {}) {
    const sandbox = {
        console: {
            log: (...args) => console.log(...args),
        },
    };

    // Check whether the Node.js runtime supports native source map functionality and, 
    // if available, enable it for the current process.
    if (typeof process.setSourceMapsEnabled === 'function') {
        process.setSourceMapsEnabled(true);
    }

    if (verbose) {
        console.error(`Executing generated JavaScript for ${inputFile}.js`);
    }

    vm.runInNewContext(jsCode, sandbox, {
        filename: `${inputFile}.js`,
        displayErrors: true,
    });
}

/** 
 * Runs the given JavaScript code in a sandboxed environment and returns an object indicating success or failure.
 */
function runSandboxWithDiagnostics(jsCode, inputFile, { verbose = false } = {}) {
    try {
        executeInSandbox(jsCode, inputFile, { verbose });
        return { ok: true };
    } catch (err) {
        return {
            ok: false,
            message: formatSandboxRuntimeError(err, inputFile),
            stack: verbose ? err.stack : null,
        };
    }
}

module.exports = {
    executeInSandbox,
    formatSandboxRuntimeError,
    runSandboxWithDiagnostics,
};
