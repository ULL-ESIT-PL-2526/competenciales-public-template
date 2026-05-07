# AST Navigation

## Visiting Descendants: `path.get` 


This is used to **obtain another descendant NodePath** from the current path.

It doesn't return the node directly, but rather another `NodePath`.
This allows you to continue browsing.

* See section [Visiting](https://github.com/ULL-ESIT-PL/babel-learning/blob/main/doc/visiting.md#get-the-path-of-sub-node) of the teachers Babel Learning tutorial
* Section [Traversal](https://github.com/ULL-ESIT-PL/babel-learning/blob/main/doc/traversal.md) of the teachers Babel Learning tutorial

[Here](/docs/llvm/while-statement.md) is an example of visiting a `WhileStatement` in our Dragon to LLVM IR translator and then getting the `test` and `body` paths to store emitted code for them separately:.

You can also use string paths:

```js
path.get("body.0.argument")
```


## Visiting Ascendants

See section [Find a specific parent path](https://github.com/ULL-ESIT-PL/babel-learning/blob/main/doc/visiting.md#find-a-specific-parent-path) of the
teachers Babel tutorial.

### `parentPath`

To move upward:

```js id="xq3slk"
path.parentPath
```

See this [example](https://astexplorer.net/#/gist/0ca01cd87afca607de3a0a4f77c8e411/bcc19141c8f076817723d695bd1bcb02c82513bf) at AST Explorer:

```js
export default function({ types: t }) {
  return {
    visitor: {
      Identifier(path) {
        if (path.node.name === 'log') {
          const parent = path.parentPath; // Get the parent path of the Identifier node
          if (parent.isMemberExpression() && parent.node.object.name === 'console') {
            const expressionPath = parent.parentPath; // Get the  grand parent path, which should be the CallExpression for console.log(...)
            if (expressionPath.isCallExpression()) {
              expressionPath.remove();
            }
          }
        }
      }
    }
  };
}
```

### `path.parent`

Raw parent node (not a path)

```js id="ezt9s4"
path.parent
```


### `path.findParent(...)`

Walk upward until condition matches

```js id="9zvztu"
const fn = path.findParent(p => p.isFunction());
```

Very useful.

---

### `path.find(...)`

Like `findParent`, but **includes current path too**

```js id="6bzx6h"
const scopeOwner = path.find(p => p.isProgram());
```

---


### `path.getStatementParent()`

Find enclosing statement

```js id="0l4zsq"
const stmt = path.getStatementParent();
```

---

### path.getFunctionParent: nearest function

```js id="ltjlwm"
Identifier(path) {
  const fn = path.getFunctionParent();

  if (fn) {
    console.log("inside function");
  }
}
```


## Changing properties: `path.set(...)`

This is used to **directly assign a value to a property of the current node**.
It is a more "manual" and less frequently used operation than `replaceWith()`.

```js
path.set("operator", "*")
```


```js
BinaryExpression(path) {
  if (path.node.operator === "+") {
    path.set("operator", "*");
  }
}
```

`get` → navigate the AST

`set` → modify a property of the current node


> [!IMPORTANT]
> `set()` does NOT replace entire nodes
>This:
>
>```js
>path.set("left", t.identifier("y"))
>```
>might work,
>but Babel usually recommends:
>
>```js
>path.get("left").replaceWith(
>t.identifier("y")
>```
>because it maintains better internal consistency.

## [Back to the Dragon to LLVM IR tutorial](/docs/llvm/README.md#pathsetData-and-getData) 
