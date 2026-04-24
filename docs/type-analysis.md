
# Type Analysis: A rule-based type system with table-driven promotions

The type analysis phase validates that operations are performed on compatible types. This phase runs **after** scope analysis and **before** code generation.

> [!IMPORTANT]
> The analyzer follows a [**post-order AST traversal** strategy](/src/type-check.cjs#L375-L440) (children first, parent later). This order is important because each parent expression reads the inferred types of its children from their [_type](/src/type-check.cjs#L21-L37) attribute. By the time a parent node is checked, operand types are already available and no recursive type-check calls are needed inside each rule.
>
>Type checking itself is **rule-based and operator-directed**. The checker first classifies each **binary operator** using [binaryRules](/src/type-rules.cjs#L2-L20) (`additive`, `numeric`, `comparable`, `boolean`, `equality`) and then applies the corresponding [validation logic and promotion policy](/src/type-check.cjs#L136-L312) in the function used to check `BinaryExpression` nodes. Promotion decisions are table-driven (for example, [additive](/src/type-promotions.cjs#L89-L112) and [comparable](/src/type-promotions.cjs#L50-L65) promotions), while **assignment compatibility** is handled by a [dedicated compatibility rule](/src/type-promotions.cjs#L127-L147).
>
>[Errors are accumulated](/src/type-check.cjs#L16-L19) instead of stopping at the first failure. When an operation is invalid, the node is marked with [ERROR_TYPE](/src/types.cjs#L28-L32) so analysis can continue and report additional issues in one pass. At the end, the AST is returned decorated with [type](/src/type-check.cjs#L21-L37) information and a global [_typeErrors](/src/type-check.cjs#L448) list, which later phases can consume.

## Internal Type Representation

Types are represented as JavaScript objects with a `baseType` property and a `dimensions` array:

```js
{ baseType: 'int',   dimensions: [] }       // scalar int
{ baseType: 'float', dimensions: [] }       // scalar float
{ baseType: 'bool',  dimensions: [] }       // scalar bool
{ baseType: 'char',  dimensions: [] }       // scalar char (string)
{ baseType: 'int',   dimensions: [10] }     // int[10]
{ baseType: 'float', dimensions: [2, 3] }   // float[2][3]
```

All type constants (`INT`, `FLOAT`, `BOOL`, `CHAR`, `ERROR_TYPE`) are frozen with `Object.freeze()` to prevent accidental mutation. 

```js
const INT = Object.freeze({ baseType: 'int', dimensions: Object.freeze([]) });
```

Compound types are created with [`makeArrayType(baseType, dimensions)`](/src/types.cjs#L95-L104).

### Why a flat representation?

Dragon currently supports only scalar types and arrays, so a **flat object** `{ baseType, dimensions }` is sufficient. The entire type of any expression fits in a single record with no nesting needed.

This simplicity has real benefits:

- **`sameType(a, b)`** is O(1) for scalars and O(n) in the number of dimensions for arrays — a linear scan over a flat array.
- No heap allocation beyond the object itself.
- Easy to serialize/display with `typeToString()`.

### What would change if Dragon had function types or maps?

Once a language introduces **function types** or **map/record types**, the flat representation breaks down. A type like `(int, float[10]) → bool` cannot be encoded in a single `{ baseType, dimensions }` pair. The natural solution is a **recursive (tree) representation**:

```js
// Function type: (int, float[10]) → bool
{ kind: 'function', params: [INT, makeArrayType('float', [10])], returns: BOOL }

// Map type: int → char
{ kind: 'map', key: INT, value: CHAR }

// Record type: { x: int, y: float }
{ kind: 'record', fields: { x: INT, y: FLOAT } }
```

`sameType` would then become a **mutually recursive structural comparison**, and `typeToString` would become a **tree traversal**. This is the standard approach in production compilers — see for example TypeScript's internal [`checker.ts`](https://github.com/microsoft/TypeScript/blob/main/src/compiler/checker.ts) or LLVM's type hierarchy.

### Tree vs. DAG

When types are trees, identical sub-types are duplicated in memory. For example, if 100 functions all return `int`, there are 100 separate `INT`-like nodes. An alternative is to **intern** (canonicalize) types, turning the tree into a **DAG** ([Directed Acyclic Graph](/docs/dags.md)):

- Each unique type is created once and stored in a global registry.
- `sameType(a, b)` becomes a pointer comparison (`a === b`), reducing it to **O(1)** regardless of type complexity.
- This is how TypeScript and many production compilers work internally.

The trade-off is that a *type factory* or *interner* is needed to manage the registry, which adds complexity to type construction. For an educational compiler like Dragon, this optimization is premature until the language actually gains recursive or higher-order types.

### Recursive types and nominal vs. structural typing

If Dragon were extended with user-defined recursive types (e.g., a linked list node: `Node { value: int, next: Node }`), structural equality would require cycle detection or a co-inductive (greatest fixed-point) equality relation — significantly more complex. Most languages solve this by switching to **nominal typing** for such types: two types are equal if and only if they share the same name/symbol, not just the same structure. This sidesteps the infinite-expansion problem at the cost of some flexibility.

### Summary

| Language feature | Type structure needed | `sameType` cost |
|---|---|---|
| Scalars only | Flat record | O(1) |
| + Arrays | Flat record + dimensions array | O(dims) |
| + Functions / Maps | Recursive tree | O(depth) structural |
| + Interning (DAG) | Shared nodes + registry | O(1) pointer |
| + Recursive types | DAG + nominal or co-inductive eq. | O(1) nominal |

Dragon is currently at row 2. Adding function or map types would move it to row 3, at which point introducing a type interner (row 4) becomes attractive.

## Supported Types

Dragon supports the following base types:

- **`int`** - Integer numbers (32-bit)
- **`float`** - Floating-point numbers (64-bit)
- **`bool`** - Boolean values (`true`, `false`)
- **`char`** - Character type

All types can be used as arrays with any number of dimensions:
- `int x` - scalar int
- `int[10] arr` - 1D array of 10 ints
- `float[2][3] matrix` - 2D array of floats
- `char[256] str` - array of characters

## Char Literals (String Constants)

The `char` type in our Dragon language represents string values of any length. String literals are written using **single or double quotes** and support **escape sequences**.

### Syntax

Both single and double quotes are accepted:
```dragon
{ 
  char greeting;
  greeting = 'Hello World';    // Single quotes
  print("Hello, Dragon!");      // Double quotes
}
```

### Escape Sequences

The following escape sequences are supported:
- `\n` - newline
- `\t` - tab
- `\r` - carriage return
- `\f` - form feed
- `\v` - vertical tab
- `\b` - backspace
- `\0` - null character
- `\\` - backslash
- `\'` - single quote
- `\"` - double quote (implicit, no escaping needed)

### Examples

```dragon
{
  char name;
  char newline;
  char tab;
  char greeting;
  
  name = 'Alice';
  newline = '\n';
  tab = '\t';
  
  greeting = 'Hello' + ' ' + 'World';  // ✓ Valid: string concatenation
  print('First' + tab + 'Second');     // ✓ Valid: char + char concatenation
  if (name < 'Bob') print('A < B');    // ✓ Valid: char comparison
}
```

### Type Rules for Char

- **Comparison operators** (`<`, `>`, `<=`, `>=`, `==`, `!=`) work on char values
- **String concatenation with `+`**: `char + char` → `char` (supported)
- **Other arithmetic operators** (`-`, `*`, `/`) are **NOT** allowed on char types
- **Mixed numeric and char**: `char * int`, `char - float`, etc. are **NOT** allowed with the exception of `+` :
- **Char can be indexed** `{ char c; c = "hello"; print(c[0]); }`
- **Char + `scalar type` promotes `scalar type` to char**: 

    ```
    ➜  dragon2js git:(C4types) ✗ cat examples/char/charplusint.drg
    ```

    ```C
    {
        int a;
        float b;
        bool c;
        a = 42;       // int literal
        b = 3.14;     // float literal
        c = true;     // bool literal
        print("a = " + a + ", b = " + b + ", c = " + c); // string concatenation with int
    }
    ```

    But for `-` we have a Type Error:    

    ```diff
    ➜  dragon2js git:(C4types) ✗ diff -d --color  examples/char/char{minus,plus}int.drg 
    8c8
    <     print("a = " - a - ", b = " - b - ", c = " - c); // string concatenation with int
    ---
    >     print("a = " + a + ", b = " + b + ", c = " + c); // string concatenation with int
    ```

    ```
    ➜  dragon2js git:(C4types) ✗ bin/drg2js.cjs examples/char/charminusint.drg -o tmp/tets.js -s
    Type Error: Arithmetic operator - requires scalar numeric operands, got char - int
    at examples/char/charminusint.drg:8:10
    ```


### 1. Assignment Compatibility

Left-hand side and right-hand side must have:
- **Same base type** OR
- **Numeric promotion**: `int` can be assigned to `float`
- **Exact same array dimensions**: `float[10] x; int[10] y; x = y;` is valid, but `float[10] x; float[5] y; x = y;` is **NOT** valid

Examples of assignment errors:

```dragon
{ float x; bool y; x = y; }           // Error: bool cannot assign to float
{ float[10] x; float y; x = y; }      // Error: scalar cannot assign to array
{ int[10] x; int[5] y; x = y; }       // Error: dimension mismatch
```

### 2. Additive Operator (`+`)

The `+` operator supports both **arithmetic addition** and **string concatenation**:

**Arithmetic mode** - requires scalar numeric operands (int or float, not arrays):
```dragon
{ int x; int y; int z; z = x + y; }        // ✓ Valid
{ float x; int y; float z; z = x + y; }    // ✓ Valid (int promotes to float)
{ int[10] x; int[10] y; x = x + y; }       // ✗ Error: arrays not allowed
```

**String concatenation mode** - requires at least one scalar char operand:
```dragon
bin/drg2js.cjs -e '{ char a; char b; a ="a"; b = "b"; print(a + b); }' -s // ✓ "ab" string concatenation
bin/drg2js.cjs -e '{ char x; int i; x = "hello"; print(x + i); }' -s      // hello0
```

### 3. Other Arithmetic Operators (`-`, `*`, `/`)

Require **scalar numeric operands** (int or float, not arrays):

```dragon
{ int x; int y; int z; z = x - y; }    // ✓ Valid
{ char c; int i; int result; result = c - i; }  // ✗ Error: char not numeric
```

### 4. Relational Operators (`<`, `>`, `<=`, `>=`)

Require **scalar comparable operands** (int, float, or char - cannot be arrays):

```dragon
{ int x; int y; bool z; z = x < y; }           // ✓ Valid
{ char a; char b; bool z; z = a <= b; }        // ✓ Valid (char comparison)
{ char c; int x; bool z; z = c < x; }          // ✗ Error: char and numeric types cannot be mixed
{ int[10] x; int[10] y; bool z; z = x < y; }   // ✗ Error: arrays not comparable
{ bool x; bool y; bool z; z = x < y; }         // ✗ Error: bool not comparable
```

Result type is always `bool`.

### 5. Equality Operators (`==`, `!=`)

See branch [C4types-equality](https://github.com/ULL-ESIT-PL/dragon2js/blob/C4types-equality/docs/type-analysis.md#5-equality-operators--) for "Equality permissive mode".

**Scalar types:**

```dragon
{ int x; int y; bool z; z = x == y; }           // ✓ Valid
bin/drg2js.cjs -e '{ float x; bool y; print(x == y); }' -s // true?    
```

**Array types:**
```dragon
{ float[10] x; float[10] y; bool z; z = x == y; }   // ✓ Valid: identical array types

bin/drg2js.cjs -e '{ float[10] x; float[20] y; print(x == y); }  ' -s
Type Error: Array types must match for comparison: float[10] == float[20]
  at command line expression:1:34dimensions

bin/drg2js.cjs -e '{ float[10] x; int[10] y; print(x == y); }  ' -s 
Type Error: Array types must match for comparison: float[10] == int[10]
  at command line expression:1:32types
```

Result type is always `bool`.

**Array Comparison Semantics**: When comparing arrays, the compiler generates value-based deep equality checks using `isDeepStrictEqual()` (not JavaScript's reference-based `==`). This ensures arrays with identical contents compare as equal:

```C
$ cat  examples/types/array-equality.drg
{
    int[10] a;
    int[10] b;
    print(a == b);
}%                                                                               
$ bin/drg2js.cjs examples/types/array-equality.drg -s
true
```
```js
$ cat examples/types/array-equality.js    
const { isDeepStrictEqual } = require('dragon2js/lib/support-lib');
{
let $a = Array.from({ length: 10 }, () => 0);
let $b = Array.from({ length: 10 }, () => 0);
console.log(isDeepStrictEqual($a, $b));
}
//# sourceMappingURL=array-equality.js.map
```
```
$ jq '.exports' package.json 
{
  "./lib/support-lib": "./src/support-lib.cjs"
}
```
Generated JavaScript preserves this semantics by transforming array equality checks:
```javascript
// Dragon: a == b (where a and b are arrays)
// Generated:
const { isDeepStrictEqual } = require('dragon2js/lib/support-lib');
const result = isDeepStrictEqual(a, b);  // true for value-based equality
```

Without this transformation, raw JavaScript would use reference equality: `a == b` would be `false` even if arrays have identical contents, which would be confusing. See [examples/types/test_array_neq.drg](/examples/types/test_array_neq.drg) for a working example.

### 6. Boolean Operators (`&&`, `||`, `!`)

Require **scalar boolean operands**:

```dragon
{ bool x; bool y; bool z; z = x && y; }     // ✓ Valid
{ int x; int y; bool z; z = x && y; }       // ✗ Error: boolean operands required
```

### 7. Array Indexing

Array index must be **int**. Result type depends on array dimensions:

```dragon
{
  float[10] x;
  int i;
  float y;
  y = x[i];                    // ✓ Valid: x[i] is float
}

{
  float[2][3] matrix;
  int i; int j;
  float val;
  val = matrix[i][j];          // ✓ Valid: matrix[i][j] is float
}

bin/drg2js.cjs -e '{ float[10] x; float idx; print(x[idx]); }'
Type Error: Array index must be integer, not float
  at command line expression:1:32
```

`char` values are also indexable (string-like indexing):

```dragon
bin/drg2js.cjs -e '{ char s; s = "hello"; print(s[0]); }' -s   // ✓ prints "h"
```

### 8. Control Flow Conditions (if, while, do-while)

Condition must be **boolean type**:

```dragon
{
  bool flag;
  int counter;
  if (flag) { }                // ✓ Valid
  while (flag) { }             // ✓ Valid
  do { } while (flag);         // ✓ Valid
  
  if (counter) { }             // ✗ Error: condition must be boolean
}
```

## Type Checking Examples

### Example 1: Boolean assigned to float

File: [examples/type-err01.drg](/examples/type-err01.drg)
```dragon
{
    float x;
    bool i;
    x = i && 1.0 < 3;  // Type error: bool expression assigned to float
}
```

Command: `bin/drg2js.cjs examples/type-err01.drg`

Output:
```
Type Error: Type mismatch in assignment
  at examples/type-err01.drg:4:6
```

### Example 2: Different array types

File: [examples/type-err02.drg](/examples/type-err02.drg)
```dragon
{
    float[2] x;
    int[2] i;
    i[0] = x[0];  // Type error: float assigned to int
}
```

Output:
```
Type Error: Type mismatch in assignment
  at examples/type-err02.drg:4:9
```

### Example 3: Arithmetic on arrays

File: [examples/type-err07.drg](/examples/type-err07.drg)
```dragon
{
    float[10] x;
    float[10] i;
    i = x + i;  // Type error: arithmetic + requires scalar operands
}
```

Output:
```
Type Error: Arithmetic operator + requires scalar numeric operands, got float[10] + float[10]
  at examples/type-err07.drg:4:8
Type Error: Type mismatch in assignment
  at examples/type-err07.drg:4:6
```

### Example 4: Scalar to array assignment

File: [examples/type-err04.drg](/examples/type-err04.drg)
```dragon
{
    char[2] x;
    char i;
    x = i;  // Type error: scalar char cannot assign to array char[2]
}
```

Output:
```
Type Error: Type mismatch in assignment
  at examples/type-err04.drg:4:6
```

### Example 5: Non-boolean condition

```dragon
$ bin/drg2js.cjs -e '{int counter; while (counter) { ; } }'
Type Error: Condition must be boolean at command line expression:1:21
```

## Type Promotion

Type promotion is supported for **int → float**:

```dragon
{
    float result;
    int x;
    int y;
    result = x + y;      // ✓ Result is int, promotes to float
    result = x + 3.14;   // ✓ Mixed arithmetic works (int+float → float)
    result = 3.14 + y;   // ✓ float + int → float
}
```

## Char Type Specification

The character type (`char`) is a distinct, non-numeric type in Dragon:

- **✓ Comparable with char**: Can use relational operators (`<`, `>`, `<=`, `>=`) with other `char` values
- **✗ Not numeric**: Cannot be used in arithmetic operations other than `+` 
- **✗ Promotion**: Cannot be automatically promoted to or from int/float but other scalar types can be promoted to char in string concatenation with `+`

```dragon
{
    char c;
    int x;
    print(c < x);    // ✗ Error: char and numeric types cannot be mixed in comparison
    c = c + 1;       // ✓ Valid: char + int is string concatenation, result type is char
    x = c;           // ✗ Error: Type mismatch in assignment (char cannot promote to int)
}
```

## Type Information in AST

After type analysis, each **expression** node in the AST is decorated with a `_type` property containing:

```javascript
{
  baseType: 'int' | 'float' | 'bool' | 'char',
  dimensions: [number]  // empty array for scalars, e.g., [10] for [10], [2, 3] for [2][3]
}
```

This type information is available for use by:
- Code generators
- Optimization passes
- Further semantic analysis phases

## Skipping Type Analysis

For testing purposes, you can skip both scope and type analysis with the `--skip-scope-analysis` flag 

```bash
bin/drg2js.cjs examples/type-err01.drg --skip-scope-analysis -o tmp/test.js
```

This allows compilation even with type errors, useful when testing code generation behavior regardless of type safety.
