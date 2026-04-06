# Scope Analysis Documentation

Welcome to the Scope Analysis module documentation!

## What is Scope Analysis?

**Scope Analysis** is the semantic analysis phase that validates variable declarations and usage in Dragon programs. It ensures variables are declared before use, prevents redeclaration, and validates control flow (break statements).

## Key Files

- [src/scope-analysis.cjs](/src/scope-analysis.cjs) - Main implementation
- [\__tests\__/scope-analysis.test.cjs](/__tests__/scope-analysis.test.cjs) - Test suite with examples

## Quick API Reference

```javascript
const { scopeAnalyze, ScopeAnalysis } = require('./src/scope-analysis.cjs');

// Simple usage
const analyzedAST = scopeAnalyze(ast);
if (analyzedAST._scopeErrors?.length > 0) {
  // Handle errors
}

// Advanced usage
const analyzer = new ScopeAnalysis(ast);
analyzer.analyze(ast);
const symbols = analyzer.globalScope.getLocalSymbols();
```

The returned AST has an additional `_scopeErrors` property which is an array with any scope-related errors found during analysis. Each error includes 

- A `type` (e.g. `RedeclarationError`)
- A `message` describing the error: e.g. "Variable 'i' is already declared in this scope"
- A `location`  `{line: 3, column: 2}` indicating the source position of the error
- A `name` of the variable involved (if applicable) `'i'`

Each Identifier node in the AST is annotated with a `_dragonScope` property that references the `Scope` where it is declared. 

Each BlockStatement node is annotated with a `_dragonScope` property that references the `Scope` it creates. 

The scope has attributes like `parent` (the parent scope) and `symbols`. 
`symbols` is a map where keys are the names of declared variables in that scope:
`"$x"`, `"$y"`, etc. and values are the corresponding `SymbolEntry` objects with details about the variable like:

```
{
    name: '$x', 
    type: {baseType: 'bool', dimensions: Array(0)}, 
    declaredAt: {line: 2, column: 4}, 
    block: {…} // reference to the BlockStatement node where it is declared
}
```


## Architecture Overview

```
┌─────────────────────────────────────────┐
│         AST from Parser                 │
└──────────────────┬──────────────────────┘
                   │
                   ▼
         ┌───────────────────────┐
         │  ScopeAnalysis Class  │
         │  (Visitor Pattern)    │
         └──────────┬────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    BlockStatement Variable  Identifier
    (scope enter)  Declaration (lookup)
                   (define)
        │           │           │
        └───────────┼───────────┘
                    ▼
         ┌────────────────────┐
         │  Build Symbol      │
         │  Tables + Errors   │
         └─────────┬──────────┘
                   ▼
         ┌────────────────────┐
         │ Annotated AST +    │
         │ Error List         │
         └────────────────────┘
```

## Navigation 

Go to the main [README.md](/README.md) for an overview of the entire project.
