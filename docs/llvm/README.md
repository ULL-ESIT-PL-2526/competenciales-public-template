
# A simple example of translation from Dragon to LLVM IR


## Source Dragon code

Let us consider the following simple Dragon program:


`➜  dragon2js git:(LLVM-simple-assign) cat examples/llvm/llvm-0-int.drg`
```C
{
    print(0);
}
```     

Our  AST [looks like this](https://astexplorer.net/#/gist/0ca01cd87afca607de3a0a4f77c8e411/05ac287d25a25c735e0b099e9cf218073a04897c): notice the mistmatch between the CallExpression we have in the AST and the LLVM IR code we will generate later, which uses `printf` from the C standard library. 

```console
npm i -g compact-js-ast@4.2.8
```
```console
compast -bp '{ console.log(0) }' 
```
```yml
type: "Program"
body:
  - type: "BlockStatement"
    body:
      - type: "ExpressionStatement"
        expression:
          type: "CallExpression"
          callee:
            type: "MemberExpression"
            object:
              type: "Identifier"
              name: "console"
            property:
              type: "Identifier"
              name: "log"
          arguments:
            - type: "NumericLiteral"
              value: 0

```
These kind of mismatches between the source AST and the target IR occurs in many places. For instance
in the declarations we produce an init field containing calls to `Array.from` to initialize arrays, but in LLVM IR we will generate a completely different code sequence.

## Compiling and Running

When we compile this program to LLVM IR, with the dragon transpiler using the option `-g llvm`:

```
➜  dragon2js git:(LLVM-simple-assign) bin/drg2js.cjs -g llvm examples/llvm/llvm-0-int.drg -o tmp/llvm-0.ll
```
```console                             
Output saved to tmp/llvm-0.ll
```

## Generated LLVM IR

we get the following LLVM IR code:

```console
➜  dragon2js git:(LLVM-simple) cat tmp/llvm-0.ll
```
```ll
; ModuleID = 'examples/llvm/llvm-0-int.drg'
source_filename = "examples/llvm/llvm-0-int.drg"

; Standard declarations
declare i32 @printf(i8*, ...)
declare i32 @sprintf(i8*, i8*, ...)
declare i8* @strcpy(i8*, i8*)
declare i8* @strcat(i8*, i8*)
declare i64 @strlen(i8*)
declare i8* @malloc(i64)
declare void @free(i8*)
declare i32 @memcmp(i8*, i8*, i64)

; LLVM polymorphic intrinsics for memory operations: LLVM encodes the chosen type variant directly in the intrinsic name.
; Address space: p0i8 : Pointer to address space 0, pointing to i8 (8-bit integer/byte)
; p = pointer0 = address space 0 (default address space) i8 = pointee type (8-bit integer) i64 : The size/length argument is 64-bit integer
declare void @llvm.memset.p0i8.i64(i8*, i8, i64, i1) ; Used to fill memory with a specific byte value, often for array initialization

; String constants for print (will be populated when needed)
@.str.i32 = private unnamed_addr constant [4 x i8] c"%d\0A\00", align 1
@.str.double = private unnamed_addr constant [4 x i8] c"%f\0A\00", align 1
@.str.char = private unnamed_addr constant [4 x i8] c"%s\0A\00", align 1
; String constants for sprintf (no newline)
@.str.i32.noline = private unnamed_addr constant [3 x i8] c"%d\00", align 1
@.str.double.noline = private unnamed_addr constant [3 x i8] c"%f\00", align 1
@.str.empty = private unnamed_addr constant [1 x i8] c"", align 1

; Support for boolean string representation
@.str.false = private unnamed_addr constant [6 x i8] c"false", align 1
@.str.true  = private unnamed_addr constant [5 x i8] c"true", align 1

; pointer array: const char* names[] = {"false", "true"}
@.bool.names = private unnamed_addr constant [2 x i8*] [
    i8* getelementptr inbounds ([6 x i8], [6 x i8]* @.str.false, i64 0, i64 0),
    i8* getelementptr inbounds ([5 x i8], [5 x i8]* @.str.true,  i64 0, i64 0)
], align 8

define i32 @main() {
  %tmp_a = getelementptr inbounds [4 x i8], [4 x i8]* @.str.i32, i64 0, i64 0
  %tmp_b = call i32 (i8*, ...) @printf(i8* %tmp_a, i32 0)
  ret i32 0
}
```

- `;` denotes comments in LLVM IR.
- `ModuleID` and `source_filename` are metadata that identify the source file of this IR.
- `declare` statements are like function prototypes in C — they tell the compiler that these functions exist in an external library (like libc), but don't define them here.
- `@.str.i32` and similar lines define global string constants in memory, which are used as format strings for `printf` and `sprintf`.
- The dragon compiler generates names starting with a dot /like in `@.str.i32` to avoid naming conflicts.
- `@.bool.names` is an array of pointers to the strings "false" and "true", which is used by the Dragon compiler for printing boolean values.
- `private` means these global variables are only visible within this module (they cannot be accessed from other modules).
- `unnamed_addr` means the address of this global variable is not significant (it can be merged with other identical constants by the linker).
- `constant` means this variable is read-only and cannot be modified at runtime.
- `align 1` means the variable is aligned to 1 byte boundaries in memory (which is sufficient for strings).
- `[4 x i8]` means this is an array of 4 bytes (characters), which corresponds to the string `"%d\n\0"` (the format string for printing an integer followed by a newline).
- `getelementptr inbounds` is an instruction that computes the address of a sub-element of an aggregate data structure (like an array). In this case, it computes the address of the first character of the string `"%d\n\0"`.
- `declare void @llvm.memset.p0i8.i64(i8*, i8, i64, i1)`: In LLVM, polymorphic intrinsics means overloaded intrinsics: same operation, different concrete types. LLVM encodes the chosen type variant directly in the intrinsic name.

    The line:
    `declare void @llvm.memset.p0i8.i64(i8*, i8, i64, i1)`
    1. `llvm.memset`: Memory fill operation (like C `memset`).
    2. `p0i8`: First overloaded type: pointer in address space 0 to `i8` (normal byte pointer in default address space).
    3. `i64`: Second overloaded type: length/index type is 64-bit integer.
    So this is the 64-bit length variant of `memset` operating on a byte pointer.
    
    **Argument meaning**:

       1. `i8*` dest pointer
       2. `i8` fill byte value
       3. i64 number of bytes to write
       4. `i1` isVolatile flag
       5. Returns: `void`

    **Practical meaning**: Fill a memory region with one byte value, for i64-sized lengths on this target (typical on 64-bit machines).

    **Why polymorphic**:
    LLVM needs one semantic operation (`memset`), but it must adapt to pointer/address-space and size type combinations. Instead of many unrelated names, it uses one intrinsic family plus typed suffixes.
- The code:
  
    ```ll
    ; pointer array: const char* names[] = {"false", "true"}
    @.bool.names = private unnamed_addr constant [2 x i8*] [ ; Brackets are used to define an array
        i8* getelementptr inbounds ([6 x i8], [6 x i8]* @.str.false, i64 0, i64 0),
        i8* getelementptr inbounds ([5 x i8], [5 x i8]* @.str.true,  i64 0, i64 0)
    ], align 8
    ```
    defines a global array of 2 pointers to i8 (i.e., `i8*`), which are the addresses of the strings `"false"` and `"true"`. This is used by the Dragon compiler to print boolean values as strings. The `getelementptr` instructions compute the addresses of the first characters of the strings `@.str.false` and `@.str.true`.

    In LLVM IR, **global initializers only accept constant expressions** — a restricted subset of expressions that can be fully evaluated at **compile/link time**, without any runtime execution. `getelementptr` computes an address using only type sizes (known at compile time) and a static base address. No memory is read — it's pure pointer arithmetic on constants, so LLVM allows it in initializers.

    On a 64-bit system, a pointer (`i8*`) is 8 bytes wide. So an array of 2 pointers `[2 x i8*]` has elements of size 8, and align 8 tells the linker/loader to place `@.bool.names` at an address that is a multiple of 8 — which matches the natural alignment of 64-bit pointers. 
    
    See [Arrays and getelementptr](https://github.com/ULL-ESIT-PL/hello-llvm/blob/main/docs/arrays-and-getelementptr/README.md#arrays-and-getelementptr) section.

## The Dragon IR Generator

Here is an excerpt of the code in file [src/llvm/main.cjs](/src/llvm/main.cjs#L19-L343) that generates the IR:

```js
const traverse = require('@babel/traverse').default; 
const CodegenContext = require('./context.cjs'); // See section "The CodeGen object" below for details
const { 
    generateModuleStub,    // Generates the standard declarations and string constants needed for the module.
    coerceValueForStore,   // Emits code to coerce (i32 -> double)
    dragonTypeToLLVM,      // Maps a Dragon type to its LLVM equivalent, e.g. 'int' -> 'i32', 'float' -> 'double', etc.
    dragonArrayTypeToLLVM, // Maps a Dragon array type to its LLVM equivalent, e.g. { baseType: 'int', dimensions: [3, 4] } -> '[3 x [4 x i32]]'
    getFormatStringConst   // Generates a format string constant for use in LLVM IR based on a Dragon type, e.g. 'int' -> '@.str.i32', 'float' -> '@.str.double', etc.
    } = require('./type-helpers.cjs'); // See section "Type Helpers" below for details
const { 
    visitIfStatement,
    visitBinaryExpression, 
    visitWhileStatement, 
    visitDoWhileStatement,
    visitMemberExpression, 
    visitAssignmentExpression, 
    visitCallExpression } = require('./visitor-helpers.cjs');

const { escapeLLVMString } = require('./string-helpers.cjs');
const emit = require('./emit-helpers.cjs'); // See section "Emit Helpers" below
const { isCharScalar } = require('./emit-helpers.cjs');
const { setNodeValue, getNodeValue } = require('./node-value.cjs'); // See section "The file `node-value.cjs`  and the NodeValue class" below
const { isDeclarationId, isAssignmentTarget, isMemberProperty, isMemberObject } = require('./visitor-helpers.cjs'); // isXXX(node, parent) checks if the parent is a XXX

function generateIR(ast, options = {}, source, sourceFile) {
    const ctx = new CodegenContext();  // Create a new code generation context to manage state during IR generation
    const nodeValues = new Map();      // A map to store the computed NodeValues objects (value, type, address, isLiteral, startIdx, endIdx) 
    const visitors = {                 // Define visitor methods for different AST node types to generate corresponding LLVM IR code
        StringLiteral: { 
            //...
        },
        // Refactor: Estrategias para VariableDeclarator
        VariableDeclarator: {
            // ...            
        },
        NumericLiteral: {
            // ...
        },
        Identifier: {
            // ...
        },
        MemberExpression: {
            // ...
        },
        BooleanLiteral: {
            // ...
        },
        UnaryExpression: {
            // ...
        },
        BinaryExpression: {
            // ...
        },
        AssignmentExpression: {
            // ...
        },
        CallExpression: {
            // ...
        },
        ExpressionStatement: {
            // ...
        },
        WhileStatement: {
            // ...
        },
        DoWhileStatement: {
            // ...
        },
        IfStatement: {
            // ...
        },
        BlockStatement: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx')));
            }
        }
    };
    traverse(ast, { noScope: true, ...visitors });
    const preamble = generateModuleStub(sourceFile);
    const globals = ctx.globals.length ? ctx.globals.join('\n') + '\n' : '';
    const mainFunc = `\ndefine i32 @main() {\n${ctx.getCode()}\n  ret i32 0\n}\n`;
    return {
        code: preamble + globals + mainFunc,
        map: null
    };
}

module.exports = {
    generateIR
};
```
We traverse the AST of the Dragon program using Babel's traverse function, and we define visitor methods for different node types (like `StringLiteral`, `VariableDeclarator`, `NumericLiteral`, etc.) to generate the corresponding LLVM IR code. 

The generated code is collected in the `CodegenContext` instance `ctx`, and at the end, 
we combine it with a `preamble` (which includes standard declarations and string constants) and a
main function wrapper to produce the final LLVM IR output.

### AST navigation and path.setData and getData

- See section [path.getData and path.setData](/docs/babel-traverse/path-setData-getData.md)
- See section [docs/babel-traverse/path-navigation.md](/docs/babel-traverse/path-navigation.md) for more details on navigating the AST with `path` methods like `path.get()`, `path.parentPath`, etc.


### The CodeGenContext class

The `CodegenContext` context class in file [src/llvm/context.cjs](/src/llvm/context.cjs) helps us manage the state of code generation, such as generating unique temporary variable names, keeping track of emitted code, and storing global declarations.

Here is an excerpt showing the constructor:

```js
class CodegenContext {
    constructor() {
        this.tempCounter = 0;   // For registers: It is a sequential name generator that works like a base-26 numbering system  similar to Excel columns.
        this.emitedCode = [];   // It is an array that stores the lines of LLVM IR code generated 
        this.allocaCounter = 0; // For addresses: It is a sequential name generator for alloca instructions, which are used to allocate memory on the stack for variables. 
        this.globals = [];      // It is an array that stores the lines of LLVM IR code for global declarations. 
                                // Strings like "hello" are stored as global constants
                                // See examples/llvm/llvm-19-char-init.drg
        this.labelCounter = 0;  // It is a sequential name generator for labels, which are used to mark positions in the code for control flow
    }
    ...
}
```
It has methods like 

- [nextTemp()](/src/llvm/context.cjs#L14-L23): generates a new temporary variable name (e.g., `%tmp_a`, `%tmp_b`, etc.)
- [emit(line, { global = false } = {})](/src/llvm/context.cjs#L24-L30): adds a line of LLVM IR code to the emitted code array
- [getCode()](/src/llvm/context.cjs#L33-L35): returns the full emitted code as a single **string**
- [nextAllocaName(dragonName)](/src/llvm/context.cjs#L36-L40): removes the `$` prefix and generates a new name. A dragon variable `i` is converted from  `$i` -> ` %.i.0.addr`
- [setAddress(address, astNode)](/src/llvm/context.cjs#L41-L45): store the address in the symbol table entry associated with the given AST node
- [nextLabel(prefix = 'label')](/src/llvm/context.cjs#L1-L13): generates a new label name (e.g., `label_0`, `label_1`, etc.) with an optional prefix. For instance, `ctx.nextLabel('while.cond')` will generate labels like `while.cond_0`, `while.cond_1`, etc.


### Type Helpers

The `type-helpers.cjs` module provides utility functions for mapping Dragon types to LLVM types, generating format string constants, and coercing values for storage. These helpers are essential for ensuring that the generated IR correctly represents the semantics of the original Dragon code.

- [generateModuleStub](/src/llvm/type-helpers.cjs#L41-L78): generates the standard declarations and string constants needed for the module.
- [coerceValueForStore](/src/llvm/type-helpers.cjs#L80-L90): emits code to coerce (i32 -> double): `${castTmp} = sitofp i32 ${sourceValue} to double`
- [dragonTypeToLLVM](/src/llvm/type-helpers.cjs#L3-L13): maps a Dragon type to its LLVM equivalent: `int` -> `i32`, `float` -> `double`, `bool` -> `i1`, `string` -> `i8*`
- [dragonArrayTypeToLLVM](/src/llvm/type-helpers.cjs#L15-L26): maps a Dragon array type to its LLVM: `bool[2][3]` -> `[2 x [3 x i1]]` equivalent.
- [getFormatStringConst](/src/llvm/type-helpers.cjs#L28-L38): generates a format string constant for use in LLVM IR.

### emit-helpers.cjs

- [emitStrcpy](/src/llvm/emit-helpers.cjs#L15-L19): Emits code to copy a string value `call i8* @strcpy(i8* ${dest}, i8* ${src}`
- [emitStrcat](/src/llvm/emit-helpers.cjs#L21-L25): emits code to concatenate two string values `call i8* @strcat(i8* ${dest}, i8* ${src})`
- [emitMalloc](/src/llvm/emit-helpers.cjs#L27-L31): emits code to allocate memory on the heap for a given size: `call i8* @malloc(i64 ${size})`
- [emitStrlen](/src/llvm/emit-helpers.cjs#L33-L37): emits code to calculate the length of a string: `call i64 @strlen(i8* ${ptr})`
- [emitGEPString](/src/llvm/emit-helpers.cjs#L39-L43): emits code to get the address of a string constant: `getelementptr inbounds [${len} x i8], [${len} x i8]* ${globalName}, i64 0, i64 0`
- [emitPrintf](/src/llvm/emit-helpers.cjs#L34-L38): emits code to print a formatted string: `call i32 (i8*, ...) @printf(i8* ${fmtPtr}, ${valueType} ${value})`

### The file `node-value.cjs`  and the NodeValue class

The file [node-value.cjs](/src/llvm//node-value.cjs) provides the `NodeValue` class, a structured way to store the 
- `value`: The immediate constant `"0"`or LLVM temporary register (i.e. `%tmp_a`) containing the register name associated with the AST node,    
- `type`: the Dragon type for the value (which is the Dragon type of the AST node) 
- `address`: the L-value address (e.g., `%temp_c` pointer from `getelementptr` for array element assignment. See [examples/llvm/llvm-27-array-float-init.drg](/examples/llvm/llvm-27-array-float-init.drg)) and section [Member Expressions: multidimensional array access](#member-expressions-multidimensional-array-access)
- `isLiteral`: a boolean indicating whether the value is a literal constant 
- `startIdx`: index in the emitted code array where the code for this node starts (used for slicing the emitted code for this node)
- `endIdx`: index in the emitted code array where the code for this node ends

> [!IMPORTANT]
>This class `NodeValue` allows us to keep track of the necessary information for generating correct LLVM IR code as we traverse the AST. When generating code for an AST node (e.g., in a binary expression or function call), we can retrieve the `NodeValue` of its children and access its properties to emit the correct LLVM IR instructions.

## Numeric Literals

When using Babel.js to traverse the AST, we can use `path.setData` and `path.getData` to store and retrieve custom metadata on the traversal path. This is useful for tracking the emitted code for each node, especially when we need to slice the emitted code for a specific node after visiting its children.

When entering any node we record using `path.setData('startIdx', ctx.emitedCode.length)` the current length of the emitted code array, which will be used as the starting index for the code generated for this node. This allows us to slice the emitted code later to get only the code relevant to this node.

At the exit of any node, we can slice the emitted code from the starting index to get only the code generated for this node and save it in the `emitedCode` data property of the `path` with `path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx')))`.

```js
const visitors = {
        // ...
        NumericLiteral: {
            enter(path) { // Just for convention. Not needed for literals since we do not emit code for them
                const startIdx = ctx.emitedCode.length; 
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                const node = path.node;
                const value = node.value; // For literals, we save the immediate value as a string in the NodeValue, e.g., "0", "3.14", etc.
                let type = node._type;
                setNodeValue(nodeValues, node, {
                    value: String(value), // The immediate constant value as a string, e.g., "0", "3.14", etc.
                    type, // The Dragon type of the literal, e.g., { baseType: 'int', dimensions: [] } for an integer literal
                    isLiteral: true,
                    startIdx: path.getData('startIdx'),
                    endIdx: ctx.emitedCode.length // No code emitted: endIdx - startIdx = 0
                });
                path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx'))); // Empty
            }
        },
        ...
}
```

For numbers we do not emit any code, we just store the immediate value as a string in the `NodeValue` associated with the `NumericLiteral` node. The actual code generation for using this literal value will happen in the parent nodes that consume this literal (e.g., in a `BinaryExpression` or `CallExpression`).


## Identifiers

See [examples/llvm/llvm-34-simple-id.drg](/examples/llvm/llvm-34-simple-id.drg) for an example of a simple identifier usage.

```js
    const visitors = {
         // ...
        Identifier: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                const node = path.node;
                const parent = path.parent;

                if (
                    isDeclarationId(node, parent) ||    // int i left side. Leave it to the VariableDeclarator visitor
                    isAssignmentTarget(node, parent) || // a = 4 left side. Leave it to the AssignmentExpression visitor
                    isMemberProperty(node, parent) ||   // a[i]  Leave it to the MemberExpression visitor (also covers Array.from and console.log)
                    isMemberObject(node, parent)        // a[2]  Leave it to the MemberExpression visitor
                ) return;
                const entry = node._symbolEntry;
                let type = node._type;
                if (!entry || !type) return; // Skip identifiers without symbol entry: JS built-ins, parser artifacts
                let llvmType = dragonTypeToLLVM(type);  // e.g., 'int' -> 'i32'
                let ptrType = `${llvmType}*`;           // e.g., 'i32*'
                const resultTmp = ctx.nextTemp();       // e.g., `%tmp_a`
                ctx.emit(`  ${resultTmp} = load ${llvmType}, ${ptrType} ${entry.address}`); // e.g., `  %tmp_a = load i32, i32* %.i.0.addr`
                setNodeValue(nodeValues, node, {
                    value: resultTmp, // The LLVM register holding the loaded value, e.g., `%tmp_a`
                    type, // The Dragon type of the identifier, e.g., `{ baseType: 'int', dimensions: [] }`
                    startIdx: path.getData('startIdx'), // The index in the emitted code array where the code for this identifier starts. Get this from the `enter` visitor.
                    endIdx: ctx.emitedCode.length // The index in the emitted code array where the code for this identifier ends (after loading the value)
                });
                path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx')));
            }
        },
        //...
    }
```

### Translate only if R-value context

The reason to skip generating a NodeValue for  `Identifier` nodes in some contexts:

```js 
                if (
                    isDeclarationId(node, parent) ||
                    isAssignmentTarget(node, parent) ||
                    isMemberProperty(node, parent) ||
                    isMemberObject(node, parent)
                ) return;
```

is that contexts, `Identifier` should not be treated as an expression that produces a value (r-value), but rather as a reference to a variable or property whose address or name is needed for code generation.


1. **`isDeclarationId`** — It is part of  `int x;`, the  declaration itself handles the allocation; the identifier does not need a NodeValue.

2. **`isAssignmentTarget`** — It is the left side of an assignment like `x = 5;`, the `Identifier` represents a variable that is being assigned to, so we need its **address** (l-value) to generate the correct `store` instruction in LLVM IR. The `AssignmentExpression` visitor will handle retrieving the address of the symbol.

3. **`isMemberProperty`** — It is the name of a property in `obj[prop]`, not an expression that needs to be evaluated in certain contexts; the parent handles the semantics.

4. **`isMemberObject`** — It is the object being indexed in `arr[i]`, the `MemberExpression` visitor will handle loading the correct value from the array.

**Summarizing**: The `Identifier` `exit` visitor only generates a `NodeValue` with an r-value when the identifier is being **used as an operand** (right-hand side of an expression, argument in a function call, etc.). In other cases, the parent context has enough information to do the correct translation, and it is the responsibility of that parent to generate the appropriate `NodeValue`.

### Skipping Contaminated Identifier Nodes

The line
```js
if (!entry || !type) return;
```

Skips identifier nodes due to **AST contamination by identifiers coming from the parser or JS globals**, not part of the Dragon code being compiled.

- **`!entry`** rejects global JS identifiers and other parser artifacts that have no entry in the Dragon symbol table
- **`!type`** rejects identifiers that were not annotated with a type during the type analysis phase

## Call Expressions

### main.cjs: The visit to `CallExpression` nodes

See file [src/llvm/main.cjs](/src/llvm/main.cjs#L253-L262)
```js
    const visitors = {
        // ...
        CallExpression: {
                    enter(path) {
                        const startIdx = ctx.emitedCode.length;
                        path.setData('startIdx', startIdx);
                    },
                    exit(path) {
                        visitCallExpression(path, ctx, nodeValues, { dragonTypeToLLVM, getFormatStringConst, emit });
                        path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx')));
                    }
        },
    };
```

### visitor-helpers.cjs: The `visitCallExpression` function

The Dragon language has  no built-in functions. The only way a visit to a `CallExpression` node can correspond to a Dragon source call is if the callee is `print`, which is translated to a call to `printf` in LLVM IR.

See file [src/llvm/visitor-helpers.cjs](/src/llvm/visitor-helpers.cjs#L345-L359)

```js 
function visitCallExpression(path, ctx, nodeValues, helpers) {
    const node = path.node;         // The `console.log` call 
    const arg  = node.arguments[0]; // We know there is only one argument: {type: 'NumericLiteral', value: 0, loc: {…}, _type: {…}}
    const argNodeVal = getNodeValue(nodeValues, arg); // Get the NodeValue for the argument 
    if (!argNodeVal) return; // This is another call expression that is not a Dragon source call (e.g., a JS built-in or parser artifact), skip it.

    const { value, llvmType, formatStr } = resolveCallArg(ctx, argNodeVal, helpers); //  value:"0" for a Literal, usually "%tmp_c", llvmtype: "i32", formatStr: "@.str.i32"  or, for a boolean, { "%tmp_c", "i8*", "@.str.char" }
    const fmtPtr   = helpers.emit.emitGEPString(ctx, formatStr, 4); // All format strings have length 4 (e.g., "%d\n\0", "%f\n\0", "%s\n\0"), so we can hardcode the length here. This emits code to get the pointer to the format string constant in memory, e.g., `getelementptr inbounds [4 x i8], [4 x i8]* @.str.i32, i64 0, i64 0` and returns the register name (e.g., `%tmp_d`) that holds this pointer.
        // fmtPtr is a register name like  %tmp_d. 
        // Code was emitted %tmp_d = getelementptr inbounds [4 x i8], [4 x i8]* @.str.char, i64 0, i64 0' so that now contains the pointer to the format string constant in memory.
    const resultReg = helpers.emit.emitPrintf(ctx, fmtPtr, value, llvmType); // Emits '  %tmp_e = call i32 (i8*, ...) @printf(i8* %tmp_d, i8* %tmp_c). ResultReg is the register name %tmp_e that holds the return value of printf (the number of characters printed
    setNodeValue(nodeValues, node, { // Since printf returns int and we are patching the console.log AST
        value: resultReg, 
        type: { baseType: 'int', dimensions: [] }, 
        endIdx: ctx.emitedCode.length 
    });
}
```

### Preparing the arguments for the printf call

See file [src/llvm/visitor-helpers.cjs](/src/llvm/visitor-helpers.cjs#L330-L343)

```js 
function resolveCallArg(ctx, argNodeVal, helpers) {
    let { value, type } = argNodeVal; // for the int 0: 0, { baseType: 'int', dimensions: [] } for the bool true: 1, { baseType: 'bool', dimensions: [] }
    let llvmType = helpers.dragonTypeToLLVM(type); // 'i32'
    let formatStr = helpers.getFormatStringConst(type); // '@.str.i32' for int, '@.str.double' for float, '@.str.char' for string

    if (type?.baseType === 'bool') { // For booleans, we need to convert the i1 value to a pointer to the string "true" or "false"
        value     = boolToGlobalString(ctx, value); // '%tmp_c' Emit code to convert the i1 value (0 or 1) to an i8* pointer to the string "false" or "true" in the @.bool.names array
        llvmType  = 'i8*';
        formatStr = '@.str.char';
    } else if (type?.baseType === 'char' && !type.dimensions?.length) {
        llvmType = 'i8*';
    }
    return { value, llvmType, formatStr };
}
```

### Converting an `i1` value to an `i8*` to the string "true" or "false"

See files 

- The function `boolToGlobalString` at [src/llvm/visitor-helpers.cjs](/src/llvm/visitor-helpers.cjs#L178-L186)
- The declarations of `@.bool.names ` at [src/llvm/type-helpers.cjs](/src/llvm/type-helpers.cjs#L67-L75)
- [examples/llvm/llvm-33-simple-bool.drg ](/examples/llvm/llvm-33-simple-bool.drg)
- [Our tutorial on arrays and getelementptr](https://github.com/ULL-ESIT-PL/hello-llvm/blob/main/docs/arrays-and-getelementptr/README.md)
```js 
function boolToGlobalString(ctx, boolValue) { // boolValue is an i1 (0 for false, 1 for true)
    const promotedBool = ctx.nextTemp(); // e.g., `%tmp_a`
    ctx.emit(`  ${promotedBool} = zext i1 ${boolValue} to i64`); // '  %tmp_a = zext i1 1 to i64' ; We convert the i1 to i64 to use it as an index for the getelementptr instruction, 
    const boolPtr = ctx.nextTemp(); // e.g., `%tmp_b`
    ctx.emit(`  ${boolPtr} = getelementptr inbounds [2 x i8*], [2 x i8*]* @.bool.names, i64 0, i64 ${promotedBool}`);  // Emits: %tmp_b = getelementptr inbounds [2 x i8*], [2 x i8*]* @.bool.names, i64 0, i64 %tmp_a
                      // The resulting register %tmp_b has type i8**  and points to @.bool.names[0] or @.bool.names[1] depending on the value of promotedBool (0 or 1)
    const boolStr = ctx.nextTemp(); // e.g., `%tmp_c`
    ctx.emit(`  ${boolStr} = load i8*, i8** ${boolPtr}`); // '  %tmp_c = load i8*, i8** %tmp_b': '%tmp_b' has type 'i8**' %tmp_c has type 'i8*'
    return boolStr; // %tmp_c is an i8* that points to the string "false" or "true" 
}
```

Here is the code emitted for [examples/llvm/llvm-33-simple-bool.drg ](/examples/llvm/llvm-33-simple-bool.drg):

```ll
; ...
define i32 @main() {
  %tmp_a = zext i1 1 to i64 ; Convert the i1 value (0 or 1) to i64 to use it as an index for the getelementptr instruction
  %tmp_b = getelementptr inbounds [2 x i8*], [2 x i8*]* @.bool.names, i64 0, i64 %tmp_a ; Get the pointer to the string "false" or "true" in the @.bool.names array based on the value of %tmp_a
  %tmp_c = load i8*, i8** %tmp_b ; '%tmp_b' has type 'i8**' %tmp_c has type 'i8*'
  %tmp_d = getelementptr inbounds [4 x i8], [4 x i8]* @.str.char, i64 0, i64 0 ; Get the pointer to the format string "%s\n" for printing a string
  %tmp_e = call i32 (i8*, ...) @printf(i8* %tmp_d, i8* %tmp_c) ; Call printf to print the string pointed to by %tmp_c using the format string pointed to by %tmp_d
  ret i32 0
}
```

### `emitGEPString`: Emitting code to have the format string for characters

```js
function emitGEPString(ctx, globalName, len) {
    const tmp = ctx.nextTemp(); // e.g., `%tmp_d`
    ctx.emit(`  ${tmp} = getelementptr inbounds [${len} x i8], [${len} x i8]* ${globalName}, i64 0, i64 0`);
    // '  %tmp_d = getelementptr inbounds [4 x i8], [4 x i8]* @.str.char, i64 0, i64 0'
    return tmp; // `%tmp_d` is an i8* that points to the first character of the format string constant "@.str.char" 
}
```
- See `emitGEPString` at file [src/llvm/emit-helpers.cjs](/src/llvm/emit-helpers.cjs#L28-L32)
- [Our tutorial on arrays and getelementptr](https://github.com/ULL-ESIT-PL/hello-llvm/blob/main/docs/arrays-and-getelementptr/README.md)
- Remember that in the global section of the generated LLVM IR, we have declarations like:

    ```ll
    @.str.char = private unnamed_addr constant [4 x i8] c"%s\0A\00", align 1
    ```
   which defines a global constant string with the content `"%s\n"` (4 characters). The `getelementptr` instruction computes the address of the first character of this string, which is what we need to pass to `printf` as the format string.

### emitPrintf

The `emitPrintf` function emits the LLVM IR code to call the `printf` function with the appropriate format string and value. It takes the arguments:
- context `ctx`, 
- the register name containing a pointer to the format string (something like `%tmp_d`),
- the register name  containing the `value` to print, and 
- its LLVM type (`i8*`).

- See [src/llvm/emit-helpers.cjs](/src/llvm/emit-helpers.cjs#L34-L38)

```js
function emitPrintf(ctx, fmtPtr, value, valueType) {
    const tmp = ctx.nextTemp(); // e.g., `%tmp_e`
    ctx.emit(`  ${tmp} = call i32 (i8*, ...) @printf(i8* ${fmtPtr}, ${valueType} ${value})`); // '  %tmp_e = call i32 (i8*, ...) @printf(i8* %tmp_d, i8* %tmp_c)'
    return tmp; // `%tmp_e` is the register that holds the return value of printf (the number of characters printed)
}
```

## Constant Strings

See file [examples/llvm/llvm-35-simple-char.drg](/examples/llvm/llvm-35-simple-char.drg)

```C
{
    print('Hello, World!');
}
```

Here is the generated code:

```ll
; ... Global section with string constants
@.strlit.0 = private unnamed_addr constant [14 x i8] c"Hello, World!\00", align 1

define i32 @main() {
  %tmp_b = call i8* @malloc(i64 14) ; Allocate memory on the heap for the string "Hello, World!" (14 bytes including the null terminator)
  %tmp_c = getelementptr inbounds [14 x i8], [14 x i8]* @.strlit.0, i64 0, i64 0 ; Get the pointer to the string constant "Hello, World!" in memory
  call i8* @strcpy(i8* %tmp_b, i8* %tmp_c) ; Copy the string "Hello, World!" from the global constant to the heap memory allocated at %tmp_b
  %tmp_d = getelementptr inbounds [4 x i8], [4 x i8]* @.str.char, i64 0, i64 0 ; Get the pointer to the format string "%s\n" for printing a string
  %tmp_e = call i32 (i8*, ...) @printf(i8* %tmp_d, i8* %tmp_b) ; Call printf to print the string pointed to by %tmp_b using the format string pointed to by %tmp_d
  ret i32 0
}
```

## Block Statements

```js
function generateIR(ast, options = {}, source, sourceFile) {
    const ctx = new CodegenContext();
    const nodeValues = new Map();
    const visitors = {
        // ...
        BlockStatement: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx')));
            }
        }
    };
}
```

### The /scope/scope04.drg example
- See file [examples/scope/scope04.drg](/examples/scope/scope04.drg):

   ```c
   {
    int i; // line 2
    i = 1;
    {
        int i; // line 5, this declaration of i shadows the outer i
        i = -1;
        print(i);
    }
    print(i); 
  }
   ```
- See file [tmp/scope04.ll](/tmp/scope04.ll) for the generated LLVM IR.

    ```ll
    define i32 @main() {
    %.i.0.addr = alloca i32          ; The `{ int i; ... }` declaration at line 2 causes the allocation of an `i32` on the stack for the variable `i`.
                                     ; Notice the name `%.i.0.addr` generated by `ctx.nextAllocaName('i')` in the `VariableDeclarator` visitor. 
    store i32 0, i32* %.i.0.addr
    store i32 1, i32* %.i.0.addr
    %.i.1.addr = alloca i32 ; The `{ int i; i = -1; ... }` declaration at line 5 causes another allocation of an `i32`
                            ; on the stack for the inner variable `i`, which must shadow the outer `i`.
                            ; Notice the name `%.i.1.addr` generated by `ctx.nextAllocaName('i')` in the `VariableDeclarator` visitor. 
                            ; The context generates a new name for the inner variable to avoid naming conflicts with the outer variable.
    store i32 0, i32* %.i.1.addr
    %tmp_a = sub i32 0, 1 ; i = -1 is translated to `store i32 0, i32* %.i.1.addr` followed by `%tmp_a = sub i32 0, 1` to compute the value -1
    store i32 %tmp_a, i32* %.i.1.addr ; end  local i = -1
    %tmp_b = load i32, i32* %.i.1.addr       ; printing inner i
    %tmp_c = getelementptr inbounds [4 x i8], [4 x i8]* @.str.i32, i64 0, i64 0
    %tmp_d = call i32 (i8*, ...) @printf(i8* %tmp_c, i32 %tmp_b)
    %tmp_e = load i32, i32* %.i.0.addr       ; printing global i
    %tmp_f = getelementptr inbounds [4 x i8], [4 x i8]* @.str.i32, i64 0, i64 0
    %tmp_g = call i32 (i8*, ...) @printf(i8* %tmp_f, i32 %tmp_e)
    ret i32 0
    }
    ```

### VariableDeclarator 

See the teacher notes at [The Open Closed Principle and the Strategy Pattern](https://ull-esit-pl-2021.github.io/assets/temas/introduccion-a-javascript/design) for an introduction to the Strategy Pattern. 
  
The handler for `VariableDeclarator` nodes in the visitor uses a strategy pattern to handle three different cases of variable declarations: 
  - array declarations, 
  - char scalar declarations, and 
  - other scalar declarations. 
  
Each case has a different strategy for generating the appropriate LLVM IR code to allocate and initialize the variable.

```js
function generateIR(ast, options = {}, source, sourceFile) {
    const ctx = new CodegenContext();
    const nodeValues = new Map();
    const visitors = {
        StringLiteral: { /* ... */ },
        VariableDeclarator: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                const node = path.node;
                if (!node.id || node.id.type !== 'Identifier') return;
                const dragonName = node.id.name;
                let varType = node._type || node.id._type;
                if (!varType) return;
                const address = ctx.nextAllocaName(dragonName);  // '%.i.0.addr',  '%.i.1.addr', etc.

                // Inizialization strategies for different variable types
                const DECLARATOR_STRATEGIES = {
                    array: (ctx, address, varType) => {
                        // ... For arrays, we need to allocate memory for the entire array and initialize it to zero (or empty string for char arrays)
                    },
                    char: (ctx, address) => {
                        // ... For char scalars, we can allocate an i8 and initialize it to 0 (the null character)  
                    },
                    scalar: (ctx, address, varType, initValue) => {
                        const llvmType = dragonTypeToLLVM(varType);    // e.g., 'i32' for int, 'double' for float, etc.
                        ctx.emit(`  ${address} = alloca ${llvmType}`); // %.i.1.addr = alloca i32'
                        ctx.setAddress(address, node.id); // Store the address in the symbol table entry node.id._symbolEntry.address === '%.i.1.addr'
                        if (initValue) {
                            if (llvmType === 'double' && Number(initValue.value) === 0) { 
                                // Fixing the bug with the Dragon AST problem with zero initialization of floats
                                initValue.value = '0.000000e+00'; 
                                ctx.emit(`  store ${llvmType} ${initValue.value}, ${llvmType}* ${address}`);
                            } else {
                                const coerced = coerceValueForStore(ctx, varType, initValue.value, initValue.type); // Emit code to coerce the initial value to the variable type if necessary (e.g., int 0 to double 0.0)
                                ctx.emit(`  store ${llvmType} ${coerced.value}, ${llvmType}* ${address}`); // '  store i32 0, i32* %.i.1.addr'
                            }
                        }
                    }
                };

                function resolveStrategy(varType) {
                    if (varType.dimensions?.length > 0) return 'array';
                    if (isCharScalar(varType)) return 'char';
                    return 'scalar';
                }

                const strategy = resolveStrategy(varType);
                const initValue = node.init ? getNodeValue(nodeValues, node.init) : null;
                DECLARATOR_STRATEGIES[strategy](ctx, address, varType, initValue);
                path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx')));
            }
        },
        // ...
    }
    // ...
}
```

See file [examples/llvm/llvm-16-float-init.drg](/examples/llvm/llvm-16-float-init.drg) for an example of how the code to fix '*the bug with zero initialization of floats*' works. 

### nextAllocaName

See [nextAllocaName(dragonName)](/src/llvm/context.cjs#L36-L40) 

```js 
class CodegenContext {
    constructor() {
        this.tempCounter = 0;   // It is a sequential name generator that works like a base-26 numbering system  similar to Excel columns.
        this.emitedCode = [];   // It is an array that stores the lines of LLVM IR code generated 
        this.allocaCounter = 0; // It is a sequential name generator for alloca instructions, which are used to allocate memory on the stack for variables. 
        this.globals = [];      // It is an array that stores the lines of LLVM IR code for global declarations
        this.labelCounter = 0;  // It is a sequential name generator for labels, which are used to mark positions in the code for control flow
    }
    // ...
    nextAllocaName(dragonName) {
        const clean = String(dragonName || '').replace(/^\$/, '') || 'var';
        const id = this.allocaCounter++; // We use a separate counter per BlockStatement!
        return `%.${clean}.${id}.addr`;
    }
    // ...
}
```

Each time we visit a `BlockStatement`, we create a new `CodegenContext` instance for that block, which has a new  `allocaCounter` 
starting at 0. This way, variable declarations in different blocks will generate alloca names that do not conflict with each other, even if they have the same variable name in the source code (e.g., `i` in the outer block and `i` in the inner block of the `scope04.drg` example).

## Member Expressions: multidimensional array access

- Read first the tutorial [Arrays and getelementptr](https://github.com/ULL-ESIT-PL/hello-llvm/blob/main/docs/arrays-and-getelementptr/README.md#arrays-and-getelementptr)
- See file [src/llvm/main.js](/src/llvm/main.cjs#L179-L187)

```js 
    const visitors = {
        // ...
        MemberExpression: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                visitMemberExpression(path, ctx, nodeValues);
            }
        },
        // ...
    }
```

See file [src/llvm/visitor-helpers.cjs](/src/llvm/visitor-helpers.cjs#L362-L433) 
```js
function visitMemberExpression(path, ctx, nodeValues) {
    const node = path.node;
    // 1. Only process indexed expressions (a[i], matrix[x][y])
    if (!node.computed) return;

    // 2. Get the value of the index
    const index = getNodeValue(nodeValues, node.property);
    if (!index) return;

    // 3. Locate the address and type of the container array
    let containerAddress;
    let containerType;
    if (node.object.type === 'Identifier') {
        // 3a. Direct access to variable
        const entry = node.object._symbolEntry;
        if (!entry || !entry.address || !entry.type) return;
        containerAddress = entry.address;
        containerType = entry.type;
    } else {
        // 3b. Nested access (matrix[x][y])
        const objectVal = getNodeValue(nodeValues, node.object);
        if (!objectVal || !objectVal.address || !objectVal.type) return;
        assertNodeValueHasAddress(objectVal, 'nested MemberExpression object');
        containerAddress = objectVal.address;
        containerType = objectVal.type;
    }

    // 4. If the container is not an array, exit
    if (!containerType.dimensions || containerType.dimensions.length === 0) return;

    // 5. Compute the result type (accessed element)
    const resultType = node._type /* || { baseType: containerType.baseType, dimensions: containerType.dimensions.slice(1) } */;

    // 6. LLVM types
    const containerLLVMType = dragonArrayTypeToLLVM(containerType);
    const resultLLVMType = dragonArrayTypeToLLVM(resultType);

    // 7. Extend the index to i64
    const indexI64 = ctx.nextTemp();
    ctx.emit(`  ${indexI64} = sext i32 ${index.value} to i64`);

    // 8. Compute the pointer to the element
    const elementPtr = ctx.nextTemp();
    ctx.emit(`  ${elementPtr} = getelementptr inbounds ${containerLLVMType}, ${containerLLVMType}* ${containerAddress}, i64 0, i64 ${indexI64}`);

    // 9. If not part of an assignment or nested access, load the value
    const parent = path.parent;
    if (!isAssignmentTarget(node, parent) &&
        !isContainerForNestedIndex(node, parent) &&
        (!resultType.dimensions || resultType.dimensions.length === 0)) {
        const loaded = ctx.nextTemp();
        ctx.emit(`  ${loaded} = load ${resultLLVMType}, ${resultLLVMType}* ${elementPtr}`);
        setNodeValue(nodeValues, node, {
            value: loaded,
            address: elementPtr,
            type: resultType|| node._type,
            endIdx: ctx.emitedCode.length
        });
        return;
    }

    // 10. If part of an assignment or nested access, only store the address
    setNodeValue(nodeValues, node, {
        address: elementPtr,
        type: resultType || node._type,
        endIdx: ctx.emitedCode.length
    });
}
```

## Control flow statements

See section [docs/llvm/while-statment.md](/docs/llvm/while-statement.md)

## Back to [/README.md](/README.md)
