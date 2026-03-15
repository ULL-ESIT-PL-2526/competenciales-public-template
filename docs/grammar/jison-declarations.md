# Jison Declarations: Precedences and Dangling Else

Handle the **dangling else problem**:

```dragon
if (x > 0) 
  if (y > 0) print x;
  else print y;  // Which if does this else belong to?
```

One parse tree can be like:

```
stmt (IF...ELSE)
├─ IF
├─ ( x > 0 )
`─ stmt
    ├─ IF
    ├─ ( y > 0 )
    ├─ stmt
    │  └─ print x;
    ├─ ELSE
    └─ stmt
       └─ print y;
```

and the other:

```
stmt (IF...ELSE)
├─ IF
├─ ( x > 0 )
├─ stmt (IF only)
│   ├─ IF
│   ├─ ( y > 0 )
│   └─ stmt
│        └─ print x;
├─ ELSE
└─ stmt
   └─ print y;
```

**Solution**: When the parser encounters an `else` it must reduce immediately, attaching the `else` to the nearest `if`:

```
if (x > 0) {
  if (y > 0) 
    print x;
  else 
    print y;  // Binds to inner if
}
```


## Navigation: [← Previous](jison-grammar-structure.md) | [↑ Top](README.md) | [Next →](grammar-rules.md)
