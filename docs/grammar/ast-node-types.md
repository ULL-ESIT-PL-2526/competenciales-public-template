# AST Node Types (Babel)

The grammar produces these Babel AST node types:

## Statements

| Type | Usage |
|------|-------|
| `Program` | Root node, contains body |
| `BlockStatement` | `{ ... }` block |
| `VariableDeclaration` | Variable declarations |
| `ExpressionStatement` | Expression as statement |
| `IfStatement` | `if (...)`, `if (...) ... else ...` |
| `WhileStatement` | `while (...)` loop |
| `DoWhileStatement` | `do ... while (...)` loop |
| `BreakStatement` | `break` |

## Expressions

| Type | Usage |
|------|-------|
| `AssignmentExpression` | `a = b` |
| `BinaryExpression` | `a + b`, `a || b` |
| `UnaryExpression` | `!a`, `-a` |
| `MemberExpression` | `a[i]` (array subscript) |
| `CallExpression` | `console.log(...)` |
| `Identifier` | Variable or function name |

## Literals

| Type | Usage |
|------|-------|
| `NumericLiteral` | Integer or float numbers |
| `BooleanLiteral` | `true`, `false` |
| `StringLiteral` | String literals |

---

## Navigation: [← Previous](precedence-summary.md) | [↑ Top](README.md) | [Next →](key-design-decisions.md)
