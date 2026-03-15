# Jison Grammar Structure

A Jison grammar file has three sections (separated by `%%`):

```jison
/* Declarations section (precedence, associativity) */

%%

/* Grammar rules section */
program : block EOF { return buildProgram(...); }
        ;

stmt : IF '(' bool ')' stmt 
       { $$ = buildIfStatement(...); }
     ;

%%
```

**Note**: In the current architecture, helper functions are **imported** from a separate module rather than defined in the preamble:

```jison
%{
const { buildProgram, buildDecl, buildBlock, ... } = require('./ast-builders.cjs');
%}
```

This separation provides several benefits:
- **IDE support**: F12 "Go to Definition" works in the `.cjs` file
- **Better organization**: Grammar rules are separate from AST construction logic
- **Code reusability**: Helper functions can be used by other modules
- **Easier testing**: Functions can be tested independently

All AST builder functions are now in [src/ast-builders.cjs](../../src/ast-builders.cjs), which is a dedicated CommonJS module with comprehensive JSDoc documentation.

---

## Navigation: [← Previous](historical-foundation.md) | [↑ Top](README.md) | [Next →](jison-declarations.md)
