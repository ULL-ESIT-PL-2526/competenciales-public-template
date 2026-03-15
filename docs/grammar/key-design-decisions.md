# Key Design Decisions

## 1. Left Recursion for Statements and Declarations

```jison
decls : /* empty */
      | decls decl      // Left-recursive
      ;

stmts : /* empty */
      | stmts stmt      // Left-recursive
      ;
```

## 2. Left Recursion for Binary Operators (Except Relational)

```jison
expr : expr '+' term    // Left-recursive → left-associative
     | expr '-' term
     | term
     ;

rel : expr '<' expr     // NOT recursive → non-associative
    | expr LE expr      // Prevents a < b < c
    | ...
    ;
```

**Why**:
- Arithmetic is left-associative: `10 - 5 - 2` = `(10 - 5) - 2` = `3` ✓
- Comparisons are non-associative: `a < b < c` is forbidden (semantic error)

## 3. Right Recursion for Unary Operators

```jison
unary : '!' unary       // Right-recursive → right-associative
      | '-' unary
      | factor
      ;
```

**Why**: 
- Unaries chain from right to left: `!!x` = `!(!(x))` ✓
- This is natural: multiple negations stack

## 4. Print 

```jison
stmt : PRINT '(' bool ')' ';'
         { $$ = buildPrintStmt($3, @$); }
     ;
```

In `buildPrintStmt()`:
```javascript
{
  type: 'ExpressionStatement',
  expression: {
    type: 'CallExpression',
    callee: {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'console' },
      property: { type: 'Identifier', name: 'log' },
      computed: false
    },
    arguments: [$3]
  }
}
```

**Why**: 
- Dragon `print(x);` becomes JavaScript `console.log(x);`
- No need for runtime library
- Direct JavaScript interop

## 5. Variable Names Prefixed with `$`

```javascript
function buildIdentifier(name, loc) {
  return withLoc({ type: 'Identifier', name: '$' + name }, loc);
}
```

**Why**:
- Avoids conflicts with JavaScript keywords (`if`, `delete`, `this`)
- $-prefixed names are valid JavaScript identifiers
- Example: Dragon `if` → JavaScript `$if`

## 6. Position Tracking (`@$`, `@1`, `@2`)

```jison
decl : type ID ';'
         { $$ = buildDecl($1, $2, @$); }
     ;
```

- `@$` = location of entire rule
- `@1` = location of first symbol (`type`)
- `@2` = location of second symbol (`ID`)

Each production tracks source positions for:
- Error reporting (line/column)
- Source maps (mapping output back to input)
- Debugger integration

---

## Navigation: [← Previous](ast-node-types.md) | [↑ Top](README.md) | [Next →](comparison.md)
