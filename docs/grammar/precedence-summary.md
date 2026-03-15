# Precedence Summary

From **lowest to highest**:

```
0. =         (assignment)
1. ||        (logical OR)
2. &&        (logical AND)
3. ==, !=    (equality)
4. <, <=, >, >= (relational)
5. +, -      (additive)
6. *, /      (multiplicative)
7. !, -      (unary, right-associative)
8. (...)     (parentheses, highest)
```

**Example parsing** of `x = a + b * c || !d`:
```
stmt:  x = a + b * c || !d
  └─ loc = bool
       ├─ x
       └─ bool || join
            ├─ expr + term * unary
            │    ├─ a
            │    ├─ b
            │    └─ c
            └─ ! unary
                 └─ d

AST:
{
  type: 'AssignmentExpression',
  operator: '=',
  left: ID(x),
  right: {
    type: 'BinaryExpression',
    operator: '||',
    left: {
      type: 'BinaryExpression',
      operator: '+',
      left: ID(a),
      right: {
        type: 'BinaryExpression',
        operator: '*',
        left: ID(b),
        right: ID(c)
      }
    },
    right: {
      type: 'UnaryExpression',
      operator: '!',
      argument: ID(d)
    }
  }
}
```

---

## Navigation: [← Previous](grammar-rules.md) | [↑ Top](README.md) | [Next →](ast-node-types.md)
