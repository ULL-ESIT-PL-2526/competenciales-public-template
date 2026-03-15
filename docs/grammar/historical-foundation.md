# Historical Foundation and the Dragon's Book Grammar

The Dragon language grammar is based on the **Dragon Book** (_Compilers: Principles, Techniques, and Tools_), specifically a simplified C-like language from Appendix A:

```
program → block
block → { decls stmts }
decls → ε | decls decl
decl → type id ;
type → basic | type [ num ]
stmts → ε | stmts stmt
stmt → loc = bool ; | if ( bool ) stmt | if ( bool ) stmt else stmt
     | while ( bool ) stmt | do stmt while ( bool ) ;
     | break ; | block | print ( bool ) ; | ;
loc → id | loc [ bool ]
bool → bool || join | join
join → join && equality | equality
equality → equality == rel | equality != rel | rel
rel → expr < expr | expr <= expr | expr >= expr | expr > expr | expr
expr → expr + term | expr - term | term
term → term * unary | term / unary | unary
unary → ! unary | - unary | factor
factor → ( bool ) | loc | num | real | true | false | char
```

In the former description `basic` is a token representing the basic types (`int`, `float`, `char`, `bool`), also  `id`, `num`, `real`, `true`, `false`, `char` and the reserved words like `if`, `else`, `while`, `do`, `break`, etc. are tokens.

There are only two rules that differ from the book: the `print` statement,
to allow the Dragon programs to write to `stdout` and the 
`factor → char`  expression, which we added to give support to string literals.
Notice that `char` as a type was already in the Dragon's book version.
The implementation in Jison converts this formal grammar into JavaScript AST nodes (Babel format).

---

## Navigation: [← Previous](overview.md) | [↑ Top](README.md) | [Next →](jison-grammar-structure.md)
