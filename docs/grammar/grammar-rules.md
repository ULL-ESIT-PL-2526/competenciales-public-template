# Grammar Rules

### 1. Program (Entry Point)

```jison
program : block EOF
            { return buildProgram([ $1 ], @$); }
        ;
```

- **Syntax**: A program is a single block followed by EOF
- **Action**: Creates a Babel `Program` node with the block's statements
- **Position tracking**: `@$` is the location of this rule (all matched symbols)
- **Return value**: Program AST node (top-level return value)

### 2. Block (Code Blocks)

```jison
block : '{' decls stmts '}'
          { $$ = buildBlock($2.concat($3), @$); }
      ;
```

- **Syntax**: `{ declarations statements }`
- **Action**: Merges declarations and statements into a single body array
- **Result**: Babel `BlockStatement` node
- **Note**: Declarations become `VariableDeclaration` statements in the body

### 3. Declarations (Variable Definitions)

```jison
decls : /* empty */
          { $$ = []; }
      | decls decl
          { $$ = $1; $$.push($2); }
      ;

decl : type ID ';'
         { $$ = buildDecl($1, $2, @$); }
     ;
```

- **`decls`**: Left-recursive rule that accumulates declarations into an array
  - Empty → returns `[]`
  - `decls decl` → appends new declaration
  
- **`decl`**: Single variable declaration
  - Matches: `type identifier ;`
  - Creates: `VariableDeclaration` node **with auto-initialized value**
  
**Example**: 
```dragon
int x;
int y;
```
Parses to array of 2 VariableDeclaration nodes.

### 4. Types (Basic and Array)

See [Types and Initialization](types/types-and-initialization.md) for details on type rules and the variable initialization strategy.

### 5. Statements (All Statement Types)

```jison
stmts : /* empty */
          { $$ = []; }
      | stmts stmt
          { $$ = $1; if ($2 !== null) $$.push($2); }
      ;

stmt : loc '=' bool ';'
         { $$ = buildAssignmentStatement($1, $3, @$, @2); }
     | IF '(' bool ')' stmt 
         { $$ = buildIfStatement($3, $5, null, @$); }
     | IF '(' bool ')' stmt ELSE stmt
         { $$ = buildIfStatement($3, $5, $7, @$); }
     | WHILE '(' bool ')' stmt
         { $$ = buildWhileStatement($3, $5, @$); }
     | DO stmt WHILE '(' bool ')' ';'
         { $$ = buildDoWhileStatement($2, $5, @$); }
     | BREAK ';'
         { $$ = buildBreakStatement(@$); }
     | block
         { $$ = $1; }
     | PRINT '(' bool ')' ';'
         { $$ = buildPrintStmt($3, @$); }
     | ';'
         { $$ = null; }
     ;
```

#### Statement Types

| Statement | Rule | Creates |
|-----------|------|---------|
| Assignment | `loc = bool ;` | `ExpressionStatement` with `AssignmentExpression` |
| If (no else) | `IF ( bool ) stmt` | `IfStatement` with `null` alternate |
| If-else | `IF ( bool ) stmt ELSE stmt` | `IfStatement` with both branches |
| While loop | `WHILE ( bool ) stmt` | `WhileStatement` |
| Do-while | `DO stmt WHILE ( bool ) ;` | `DoWhileStatement` |
| Break | `BREAK ;` | `BreakStatement` |
| Block | `block` | `BlockStatement` (nested scope) |
| Print | `PRINT ( bool ) ;` | `ExpressionStatement` with `console.log()` call |
| Empty | `;` | `null` (filtered out by stmts) |

**Key points**:
- `stmts` accumulates non-null statements
- Empty statements (`;`) are parsed but discarded
- Print is converted to `console.log()` during AST construction

### 6. Location (Left-hand Side of Assignment)

```jison
loc : ID
        { $$ = buildIdentifier($1, @$); }
    | loc '[' bool ']'
        { $$ = buildMemberExpression($1, $3, @$); }
    ;
```

- **Simple variable**: `x` → `Identifier` node
- **Array access**: `x[i]` → `MemberExpression` with `computed: true`
- **Multiple subscripts**: `a[i][j]` → nested MemberExpressions

Left-recursive structure allows chaining: `a[i+1][j*2]` parses correctly.

**Example AST**:
```javascript
// x[i]
{
  type: 'MemberExpression',
  object: { type: 'Identifier', name: '$x' },
  property: { type: 'Identifier', name: '$i' },
  computed: true
}
```

### 7. Boolean Expressions (Operator Precedence Chain)

The grammar encodes **operator precedence** by nesting rules from lowest to highest precedence:

#### 7.1 Logical OR (Lowest Precedence)

```jison
bool : bool OR join
         { $$ = buildBinary('||', $1, $3, @$); }
     | join
         { $$ = $1; }
     ;
```

- `||` has lowest precedence
- Left-associative: `a || b || c` parses as `(a || b) || c`

#### 7.2 Logical AND

```jison
join : join AND equality
         { $$ = buildBinary('&&', $1, $3, @$); }
     | equality
         { $$ = $1; }
     ;
```

- `&&` has higher precedence than `||`
- Also left-associative

#### 7.3 Equality

```jison
equality : equality EQ rel
             { $$ = buildBinary('==', $1, $3, @$); }
         | equality NE rel
             { $$ = buildBinary('!=', $1, $3, @$); }
         | rel
             { $$ = $1; }
         ;
```

- `==`, `!=` higher precedence than `&&`

#### 7.4 Relational Operators

```jison
rel : expr '<' expr
        { $$ = buildBinary('<', $1, $3, @$); }
    | expr LE expr
        { $$ = buildBinary('<=', $1, $3, @$); }
    | expr GE expr
        { $$ = buildBinary('>=', $1, $3, @$); }
    | expr '>' expr
        { $$ = buildBinary('>', $1, $3, @$); }
    | expr
        { $$ = $1; }
    ;
```

- **Important**: Comparison operators are **non-associative** (no explicit rule chaining)
  - `a < b < c` is NOT parsed as `(a < b) < c`
  - Instead: type system rejects it in semantic analysis phase
  - This prevents confusing behavior (in some languages it means logical AND)

#### 7.5 Addition/Subtraction

```jison
expr : expr '+' term
         { $$ = buildBinary('+', $1, $3, @$); }
     | expr '-' term
         { $$ = buildBinary('-', $1, $3, @$); }
     | term
         { $$ = $1; }
     ;
```

- Left-associative: `a - b - c` = `(a - b) - c` ✓

#### 7.6 Multiplication/Division

```jison
term : term '*' unary
         { $$ = buildBinary('*', $1, $3, @$); }
     | term '/' unary
         { $$ = buildBinary('/', $1, $3, @$); }
     | unary
         { $$ = $1; }
     ;
```

- Higher precedence than `+` / `-`
- Left-associative

#### 7.7 Unary Operators (Highest Precedence)

```jison
unary : '!' unary
          { $$ = buildUnary('!', $2, @$); }
      | '-' unary %prec UMINUS
          { $$ = buildUnary('-', $2, @$); }
      | factor
          { $$ = $1; }
      ;
```

- Right-associative: `!!x` = `!(!(x))` ✓
- `%prec UMINUS` resolves precedence for the unary minus vs binary minus
- `!` (logical NOT) and `-` (negation) chain correctly

### 8. Primary Expressions (Atoms)

```jison
factor : '(' bool ')'
           { $$ = $2; }
       | loc
           { $$ = $1; }
       | NUM
           { $$ = buildNumericLiteral(parseInt($1), @$); }
       | REAL
           { $$ = buildNumericLiteral(parseFloat($1), @$); }
       | TRUE
           { $$ = buildBooleanLiteral(true, @$); }
       | FALSE
           { $$ = buildBooleanLiteral(false, @$); }
       | CHAR
           { $$ = buildStringLiteral($1, @$); }
       ;
```

| Token | Produces | Example |
|-------|----------|---------|
| `(bool)` | Parenthesized expression | `(x > 0)` |
| `loc` | Variable or array access | `x`, `a[i]` |
| `NUM` | Integer literal | `42` |
| `REAL` | Float literal | `3.14`, `1e-5` |
| `TRUE` | Boolean true | `true` |
| `FALSE` | Boolean false | `false` |
| `CHAR` | String literal | `"hello"`, `'a'` |

---

## Navigation: [← Previous](jison-declarations.md) | [↑ Top](README.md) | [Next →](precedence-summary.md)
