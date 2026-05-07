# path.getData and path.setData

`path.getData()` and `path.setData()` are used to store **temporary metadata associated with the `NodePath`**.
It's like a small storage area (`Map`) attached to the path.
They are used in complex plugins when you need to remember things like:

* I already processed this node
* this node belongs to X transformation
* this path comes from a macro
* this path needs further processing

and you don't want to contaminate the node:

```js 
path.node.emitedCode
```

or use fragile global variables.



---


 `getData()` / `setData()` work on **internal auxiliary data**

```js 
path.setData("visited", true)
```

↓

Does not change the AST

↓

Only saves information for your Babel plugin or your traverse

## Simple example

```js 
CallExpression(path) { 
  if (path.getData("optimized")) return; 
  optimize(path); 
  path.setData("optimized", true);
}
```

* doesn't change the code
* doesn't change the AST
* just avoids processing the same path twice

## A more complex example: Translating a WhileStatement from Dragon to LLVM IR

And [here](/docs/llvm/while-statement.md) is a complex example of using `setData` to store emitted code for different parts of a `WhileStatement` during LLVM IR code generation, and then retrieving that data later to build the final code for the while loop:


## Different paths pointing to the same node have different data

> [!IMPORTANT]
> This is associated with: `NodePath` NOT with the node: `path.node`

This means that if you have two different paths pointing to the same node, they will have different data.
See the example at [ULL-ESIT-PL/babel-learning/src/traverse/path.pointing.same-node.mjs](https://github.com/ULL-ESIT-PL/babel-learning/blob/main/src/traverse/path.pointing.same-node.mjs)

```js
const path1 = ...; // points to node A
const path2 = ...; // also points to node A
path1.setData("visited", true);
console.log(path2.getData("visited")); // undefined, because path2 is a different NodePath
``` 

> [!NOTE]
> During a normal single traversal, Babel usually gives you a stable `path` object for that location, so you feel like data is **on the node**. But semantically it is `path`-local metadata.


## [Back to the tutorial](/docs/llvm/README.md#pathsetData-and-getData)