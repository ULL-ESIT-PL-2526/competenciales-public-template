// V8 is the JavaScript engine used by Node.js. It provides the 'vm' module to create and manage V8 contexts, 
// allowing us to execute code in a sandboxed environment. This is useful for running untrusted code or code 
// that we want to isolate from the main execution context.
// vm is a library providing APIs to compile and run code within V8 contexts.
// V8 contexts are created. Each context has: its own global object, its own scope chain. 
// Code is compiled to V8 bytecode. Execution happens inside that context. 
// Important: contexts share the same V8 isolate, meaning: same heap, same event loop, same native bindings
const vm = require('vm'); 
const { SourceMapConsumer } = require('source-map');
const BIAS_GREATEST_LOWER_BOUND = 1;

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
    /* When an error occurs at execution time, the sandbox plays the role of 
       a "Source Map Consumer".  It has to find out the line/column 
       of the crash. It performs a GLB search to find the nearest original mapping, 
       ensuring that even if the code is heavily compressed, you are directed 
       to the correct line in your pre-compiled Dragon source code. */

    if (!stackText) return null;
    const escaped = escapeRegExp(filename);
    /* Stack frames typically look like:
    at Object.<anonymous> (/path/to/file.js:10:15)
    at Module._compile (internal/modules/cjs/loader.js:999:30)
    ...
    We want to find the first frame that references our generated file and extract line/column from it.
    */
    const match = stackText.match(new RegExp(`${escaped}:(\\d+)(?::(\\d+))?`));
    if (!match) return null;
    return {
        line: parseInt(match[1], 10),
        column: match[2] ? parseInt(match[2], 10) : 1,
    };
}

/**
 * Finds the first node of a given type that has a location.
 * @param {Object|null} node - The node to search.
 * @param {string} type - The type of node to find.
 * @returns {Object|null} - The found node or null if not found.
 */
function mapToDragonSource(where, map) {
    /* A SourceMapConsumer is a library esponsible for reading and processing the 
       source-map JSON file. Its main function is to perform reverse translation: given a position 
       (line and column) in the generated code, the consumer returns the corresponding position 
       in the original source code. This function acts as a source-map consumer while the code 
       generator creates the source-map (producer). This is the dual role of source maps in 
       the Dragon compiler: generation during compilation and consumption during error reporting. */
    if (!where || !map) return null;

    try {
        const consumer = new SourceMapConsumer(map);
        // Source map columns are 0-based while stack columns are 1-based.
        const generatedColumn = Math.max(0, where.column - 1);
        /* GLB (Greatest Lower Bound) In source map searching, GLB is the algorithm or technique 
          used to find the "greatest lower bound". Because minification can group multiple original 
          lines into one or remove spaces, there is not always an exact column match.
          Function: Searches for the mapping closest to and less than or equal to the requested position. 
          This ensures that if you request a column that has no own entry, the consumer brings you 
          to the start of the nearest logical code block that is mapped.
        */ 
        let original = consumer.originalPositionFor({
            line: where.line,
            column: generatedColumn,
            bias: BIAS_GREATEST_LOWER_BOUND,
        });
        // Some runtime stacks report the first column in a line, but mappings may start later.
        // If  consumer.originalPositionFor() misses, try manual GLB search (lowerBoundCandidate). 
        // If that finds nothing fallback to the earliest mapping on the line (firstCandidate).
        if (!original || original.line == null || original.column == null || !original.source) {
            let lowerBoundCandidate = null;
            let firstCandidate = null; // The first mapping on the line. If exact column mapping can't be found, at least point to the beginning of the line where code for this line starts.

            consumer.eachMapping((mapping) => {
                // We are only interested in mappings for the same generated line as the error.
                if (mapping.generatedLine !== where.line || 
                    mapping.source == null || 
                    mapping.originalLine == null) {
                    return;
                }

                // The first time we encounter a mapping for the line, we set it as the firstCandidate. 
                // This is our fallback if GLB search fails.
                if (!firstCandidate || 
                    mapping.generatedColumn < firstCandidate.generatedColumn) {
                    firstCandidate = mapping;
                }

                // We want the mapping with the greatest generated column that is still <= error's column.
                if (mapping.generatedColumn <= generatedColumn) {
                    if (!lowerBoundCandidate || 
                        mapping.generatedColumn > lowerBoundCandidate.generatedColumn) {
                        lowerBoundCandidate = mapping;
                    }
                }
            });

            const selected = lowerBoundCandidate || firstCandidate;
            if (selected) {
                original = {
                    source: selected.source,
                    line: selected.originalLine,
                    column: selected.originalColumn,
                    name: selected.name || null,
                };
            }
        }

        if (!original || original.line == null || original.column == null || !original.source) {
            return null;
        }

        return {
            source: original.source,
            line: original.line,
            column: original.column + 1,
        };
    } catch (_err) {
        return null;
    }
}

function formatSandboxRuntimeError(err, inputFile, /* fill here */, outputFile) {
    const lines = [`Error: ${err.message}`];
    let jsFile = outputFile || `${inputFile}.js`;
    const where = /* fill here */(err?.stack, jsFile); // JS line of error

    if (where) {
        const originalWhere = mapToDragonSource(where, map); // Dragon source line mapped from the JS line
        if (originalWhere) {
            lines.push(`At source ${originalWhere.source}:${originalWhere.line}:${originalWhere.column}`);
            lines.push(`At generated code ${jsFile}:${where.line}:${where.column}`);
        } else {
            lines.push(`At generated code ${jsFile}:${where.line}:${where.column}`);
        }
    }

    return lines.join('\n');
}

/**
 * Executes generated JavaScript code in a sandboxed context.
 * @param {*} jsCode 
 * @param {*} inputFile 
 * @param {*} param2 
 */
function executeInSandbox(jsCode, inputFile, { verbose = false, outputFile = null } = {}) {
    const sandbox = {
        console: {
            log: (...args) => console.log(...args),
        },
    };

    if (typeof process.setSourceMapsEnabled === 'function') {
        process.setSourceMapsEnabled(true);
    }

    if (verbose) {
        console.error(`Executing generated JavaScript for ${inputFile}.js`);
    }

    const vmFilename = outputFile || `${inputFile}.js`;
    vm.runInNewContext(jsCode, sandbox, {
        filename: vmFilename,
        displayErrors: true,
    });
}

/** 
 * Runs the given JavaScript code in a sandboxed environment and returns an object indicating success or failure.
 */
function runSandboxWithDiagnostics(jsCode, inputFile, { verbose = false, map = null, outputFile = null } = {}) {
    try {
        executeInSandbox(jsCode, inputFile, { verbose, outputFile });
        return { ok: true };
    } catch (err) {
        return {
            ok: false,
            message: formatSandboxRuntimeError(err, inputFile, /* fill here */, outputFile),
            stack: verbose ? err.stack : null,
        };
    }
}

module.exports = {
    executeInSandbox,
    formatSandboxRuntimeError,
    runSandboxWithDiagnostics,
};
