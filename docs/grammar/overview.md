# Overview

The Dragon language parser is implemented using **Jison**, a JavaScript port of Yacc/Bison. It takes the token stream from the lexer and builds a **Babel-compatible JavaScript Abstract Syntax Tree (AST)**.

The grammar definition is in [`src/grammar.jison`](../../src/grammar.jison) and is compiled to JavaScript by the `npm run build` command.

---

## Navigation: [↑ Top](README.md) | [Next →](historical-foundation.md)
