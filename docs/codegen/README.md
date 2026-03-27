# Tutorial: Generación de Código con Emitter y Source Maps

## Introducción

### ¿Qué es la Generación de Código?

La **generación de código** ([codegen](/src/codegen.cjs)) es el proceso de transformar un **Abstract Syntax Tree (AST)** en **código fuente legible** (en nuestro caso, JavaScript).

```
Código Dragon    →  Lexer  →  Parser  →  AST  →  Codegen  →  JavaScript
   (.drg)                                                         (.js)
```

### ¿Qué es el Emitter?

El **Emitter** es una clase que gestiona la emisión de código sin contaminar los nodos del AST. En lugar de modificar los nodos directamente (como `node._code = "..."`), usa **WeakMaps** para mantener una asociación limpia entre nodos y código.

### Comparación: codegen_inplace vs emitter

Véase solución en [src/codegen_inplace.cjs](/src/codegen_inplace.cjs) vs [src/codegen.cjs](/src/codegen.cjs):

```javascript
// ❌ src/codegen_inplace.cjs: Contaminación del AST
path.node._code = "let x = 5;";      // Modifica el nodo
path.node._lineCount = 1;             // Más contaminación

// ✅ src/codegen.cjs: Emitter (Limpio)
emitter.setCode(path.node, "let x = 5;");  // Almacena en WeakMap
// El nodo NO se modifica
```

---

## La Clase Emitter

### Estructura Interna

La clase Emitter se define en [src/codegen.cjs](https://github.com/ULL-ESIT-PL/dragon2js/blob/C2visitAndDebug/src/codegen.cjs#L15-L93).

```javascript
class Emitter {
    constructor() {
        this.output = [];                    // Buffer de salida
        this.nodeCode = new WeakMap();       // node → código generado
        this.nodeMappings = new WeakMap();   // node → source mappings
        this.indent = 0;                     // Nivel de indentación (futuro)
    }
}
```

### ¿Por Qué WeakMap?

**[WeakMap](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)** es un tipo especial de mapa en JavaScript

> A WeakMap is a collection of key/value pairs **whose keys must be objects or non-registered symbols**, with values of any arbitrary JavaScript type, and which **[does not create strong references to its keys](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef)**.

```javascript
const weakMap = new WeakMap();
const node = { type: 'Identifier', name: 'x' };

weakMap.set(node, 'código_aquí');  // Asocia node → código

// Ventajas de WeakMap:
// 1. NO impide garbage collection del nodo
// 2. No se puede enumerar (no contamina inspección)
// 3. Seguro contra memory leaks
// 4. Mapeo 1-a-1 perfecto: cada nodo → su código

// Si el nodo se elimina, la entrada se limpia automáticamente
node = null;  // El garbage collector reclaim la memoria
```


### Métodos Principales de la Clase Emitter

#### `setCode(node, code)`
Almacena el código generado para un nodo:

```javascript
emitter.setCode(node, '5');
emitter.setCode(node, 'let $x = 0;');
emitter.setCode(node, 'if (test) { ... } else { ... }');
```

#### `getCode(node)`
Recupera el código previamente almacenado:

```javascript
const code = emitter.getCode(path.node.left);   // '5'
const code = emitter.getCode(path.node.right);  // '$x'
// Si no existe, devuelve ''
```

#### `setMappings(node, mappings)` / `getMappings(node)`
Mapeo de líneas para debugging:

```javascript
// Cada mapping vincula código generado con línea original del Dragon:
const mapping = {
    generatedLine: 2,      // Línea en el archivo .js generado
    originalLine: 5,       // Línea en el archivo .drg original
    originalColumn: 3      // Columna en el archivo .drg
};

emitter.setMappings(ifNode, [mapping]);
```

#### `createMapping(node, generatedLine)`
Helper que crea un mapping desde la información de ubicación del nodo:

```javascript
// El AST tiene node.loc con información de Jison:
// node.loc = {
//     start: { line: 5, column: 3 },
//     end: { line: 5, column: 10 }
// }

const mapping = emitter.createMapping(node, 2);
// Devuelve:
// {
//     generatedLine: 2,
//     originalLine: 5,
//     originalColumn: 3
// }
```

#### `countLines(text)`
Cuenta número de saltos de línea:

```javascript
emitter.countLines("let x = 5;");        // 1
emitter.countLines("let x = 5;\nlet y = 0;");  // 2
emitter.countLines("{\n  x = 5;\n}");    // 3
```

#### `shiftMappings(mappings, offset)`
Desplaza líneas en mappings (importante para bloques anidados):

```javascript
const maps = [
    { generatedLine: 2, originalLine: 5, originalColumn: 3 },
    { generatedLine: 3, originalLine: 6, originalColumn: 1 }
];

const shifted = emitter.shiftMappings(maps, 2);
// Resultado:
// [
//     { generatedLine: 4, originalLine: 5, originalColumn: 3 },  // 2+2
//     { generatedLine: 5, originalLine: 6, originalColumn: 1 }   // 3+2
// ]
```

---

## Flujo de Traversal

### Cómo Funciona Babel Traverse

**Babel traverse** recorre el AST en profundidad, visitando cada nodo. En cada handler recibimos un objeto `path` que es el **contexto de navegación del nodo**:

- **`path.node`**: El nodo del AST en sí (ej: `{ type: 'BinaryExpression', left: {...}, right: {...} }`)
- **`path`**: Más que el nodo, incluye métodos útiles como `path.parent`, `path.replaceWith()`, `path.remove()`, etc. Es una "envoltura" inteligente alrededor del nodo

En nuestro caso usamos principalmente `path.node` para acceder a los datos del nodo (sus propiedades, children, etc.). El siguiente ejemplo muestra cómo se accede a los hijos de un `BinaryExpression` con la forma `ID(n)* ID(n)`y se usa `path.replaceWith()` para reemplazar el nodo por un nodo `Math.Pow(ID(n), 2)`. 

```javascript
export default function ({ types: t }) { // Importamos el módulo de tipos de Babel como "t"
  return {
    visitor: {
      BinaryExpression(path) {
        // 1. Verificar si el operador es una multiplicación (*)
        if (path.node.operator !== "*") return;

        const { left, right } = path.node; // JS "desestructura" el nodo para obtener left y right

        // 2. Comprobar si ambos lados son el mismo identificador (ej. n * n)
        if (t.isIdentifier(left) && t.isIdentifier(right) && left.name === right.name) {
          
          // 3. Crear el nuevo nodo: Math.pow(n, 2)
          const replacement = t.callExpression(
            t.memberExpression(t.identifier("Math"), t.identifier("pow")),
            [t.identifier(left.name), t.numericLiteral(2)]
          );

          // 4. MANIPULACIÓN DEL AST: Reemplazar el nodo actual a través del path
          path.replaceWith(replacement);
        }
      }
    }
  };
}
```
Nótese 

1. El uso de los predicados `t.isIdentifier()` para verificar el tipo de nodo.
2. El uso del DSL de Babel para crear el nodo `replacement` que representa `Math.pow(n, 2)`: 

```js
t.callExpression(t.memberExpression(t.identifier("Math"), t.identifier("pow")),
            [t.identifier(left.name), t.numericLiteral(2)]);
```


Vaya a [astexplorer.net](https://astexplorer.net/), active `transform`, elija `@babel/parser` y pegue el  código anterior en el panel de transformación. En la ventana de entrada ponga `n*n` y en la ventana de salida verá `Math.pow(n, 2);`.

![Ejemplo de transformación con Babel](/docs/images/babel-transform.png)


Para ver mas ejemplos de transformaciones Babel puede leer la sección [Babel Plugin Examples](https://github.com/ULL-ESIT-PL/babel-learning/blob/main/src/awesome/README.md) de nuestro tutorial.
 
Existen dos formas de definir handlers en Babel traverse:

```js
const traverse = require('@babel/traverse').default;
```
```javascript
traverse(ast, {
    // Visitador "enter" (ANTES de procesar children)
    BinaryExpression(path) {
        // ...
    },
    
    // Objeto con "enter" y "exit"
    BinaryExpression: {
        enter(path) {
            // Se llama ANTES de visitar left y right
        },
        exit(path) {
            // Se llama DESPUÉS de visitar left y right
        }
    }
});
```

### Por Qué `exit` es Importante para Generar Código

Para generar código, **necesitamos que los children se traduzcan primero, antes de traducir el nodo padre**.

#### Ejemplo: BinaryExpression (5 + 3)

**Estructura del AST:**
```
BinaryExpression (①)  [operator: +]
├─ left: NumericLiteral (②)  [value: 5]
└─ right: NumericLiteral (③)  [value: 3]
```

**Estado de nodeCode WeakMap durante traversal:**

| Paso | Evento | Nodo | Acción | nodeCode |
|------|--------|------|--------|----------|
| 1 | enter | BinaryExpression ① | — | (vacío) |
| 2 | enter | NumericLiteral ② | — | (vacío) |
| 3 | **exit** | NumericLiteral ② | setCode(②, "5") | ② → "5" |
| 4 | enter | NumericLiteral ③ | — | ② → "5" |
| 5 | **exit** | NumericLiteral ③ | setCode(③, "3") | ② → "5", ③ → "3" |
| 6 | **exit** | BinaryExpression ① | setCode(①, "5 + 3") | ① → "5 + 3", ② → "5", ③ → "3" |

**Paso 6 en detalle:**
```javascript
// Cuando salimos de BinaryExpression:
exit(path) {
    const left = emitter.getCode(path.node.left);    // getCode(②) = "5" ✓
    const right = emitter.getCode(path.node.right);  // getCode(③) = "3" ✓
    const code = `${left} + ${right}`;               // "5 + 3" ✓
    emitter.setCode(path.node, code);
}
```

**¿Por qué NO usar `enter`?**
```javascript
enter(path) {
    const left = emitter.getCode(path.node.left);    // getCode(②) = "" ❌
    // Los children aún no se han visitado
    // El código no está disponible
}
```


---

## Handlers por Tipo de Nodo

### Nodos Hoja (Sin Children)

La traducción de nodos hoja Literal es directa: se convierte su valor a string.
Si es un `Identifier`, se usa su nombre:

```javascript
NumericLiteral(path) {
    // Número: 42
    emitter.setCode(path.node, String(path.node.value));
}

BooleanLiteral(path) {
    // Booleano: true / false
    emitter.setCode(path.node, String(path.node.value));
}

StringLiteral(path) {
    // String: "hello"
    emitter.setCode(path.node, JSON.stringify(path.node.value));
}

Identifier(path) {
    // Identificador: $x, $counter, console
    emitter.setCode(path.node, path.node.name);
}
```

**Ejemplo:**
```
AST: NumericLiteral { value: 42 }
Resultado: "42"
```

## Generación de Source Maps

### El problema a resolver

En la práctica anterior, si ejecutamos el código JS generado con `--sandbox` y se produce una excepción los errores se refieren a las líneas del archivo `.js` generado, no del `.drg` original:

```
dragon2js git:(solutionC1) bin/drg2js.cjs examples/runtime-err01-loop.drg -s
Error: Illegal break statement
At generated code examples/runtime-err01-loop.js:2:1 # <- línea del .js
```

sería preferible que el error indicara la ubicación en el código Dragon:

``` 
➜  dragon2js git:(C2visitAndDebug) bin/drg2js.cjs examples/runtime-err01-loop.drg -s
Error: Illegal break statement
At source examples/runtime-err01-loop.drg:2:5 # <- línea del .drg
At generated code examples/runtime-err01-loop.js:2:1
```

La solución a este problema es generar un **source map** que vincule cada línea del código generado con la línea correspondiente en el código fuente Dragon. Este problema aparece en cualquier proyecto de compilación o transpilation, por ejemplo cuando se transpila TypeScript a JavaScript o cuando se minifica código para producción o cuando se compila desde Rust o C++ a WebAssembly.

### ¿Qué es un Source Map?

Un **source map** es un archivo que vincula código generado con código fuente original. Permite:

1. **Debugging**: Ver líneas correctas del `.drg` en DevTools
2. **Error reporting**: Mostrar ubicación real de errores
3. **Traceability**: Rastrear de dónde vino cada línea

### Estructura de un Source Map

```javascript
// Ejemplo completo guardado en prac-comp.js.map
{
  "version": 3,
  "names": ["i", "j", "a", "console", "log"],  // Identificadores únicos
  "sources": ["examples/prac-comp.drg"],       // Archivos originales
  "sourcesContent": ["{ int i; ... }"],        // Contenido original
  "file": "prac-comp.js",                      // Archivo generado: ruta relativa al .js
  "mappings": "AAAA;EACE,IAAAA..."             // Mappings codificados
}
```

Puedes visualizar un source map con herramientas como Source Map Visualizer (https://evanw.github.io/source-map-visualization/):

[![the examples/prac-comp.drg with source map](/docs/images/source-map-visualizer.png)](https://evanw.github.io/source-map-visualization/)

### Formato VLQ (Mappings Codificados)

Los mappings usan **Variable Length Quantity** (VLQ), un formato comprimido.
Véase la calculadora en [BASE64 VLQ CODEC (COder/DECoder) AND SOURCEMAP V3 / ECMA-426 MAPPINGS PARSER](https://www.murzwin.com/base64vlq.html) para entender cómo funciona.

```
Sin comprimir (legible):
[1,1,0,0], [2,1,0,0], [3,2,1,0], ...

VLQ comprimido:
"AAAA;EACE,IAAAA..."
```

### Cursor Tracking para Bloques Anidados

#### El Problema: ¿Cómo Saber Qué Línea Estamos Generando?

Cuando generamos código con bloques anidados (un `if` dentro de un bloque, etc.), necesitamos saber en qué **línea del archivo generado** estamos para crear mappings correctos.

```
BlockStatement generado:
{                          ← Línea 1
  let $x = 0;              ← Línea 2  ← cursor aquí
  if (...) {               ← Línea 3
    $x = 5;                ← Línea 4
  }                        ← Línea 5
  console.log($x);         ← Línea 6
}                          ← Línea 7
```

El **cursor** es una variable que rastrea **en qué línea estamos** mientras emitimos código.

#### Algoritmo de Cursor Tracking

#### Ejemplo Paso a Paso

Código Dragon:
```dragon
{
  if (x) {
    y = 1;
  }
  x = 2;
}
```

Generado:
```javascript
{                           // Línea 1 (opening brace)
  if ($x) {                 // Línea 2 ← IfStatement comienza aquí
    $y = 1;                 // Línea 3
  }                         // Línea 4
  $x = 2;                   // Línea 6 ← AssignmentExpression comienza aquí
}                           // Línea 7
```

Ejecución del algoritmo:

```
Iteración 1 (IfStatement):
  1. cursor = 2
  2. createMapping(IfStatement, 2)  → { generatedLine: 2, originalLine: x (Dragon) }
  3. Tiene statements anidados (y = 1):
     - stmtMaps = [{ generatedLine: 3, originalLine: y (Dragon) }]
     - shift por (2 - 1) = 1
     - Resultado: [{ generatedLine: 4, originalLine: y (Dragon) }]
  4. countLines("if (x) {\n    y = 1;\n  }") = 3
  5. cursor += 3 → cursor = 5
  6. No es el último → cursor += 1 → cursor = 6

Iteración 2 (AssignmentExpression x = 2):
  1. cursor = 6
  2. createMapping(AssignmentExpr, 6)  → { generatedLine: 6, originalLine: ... }
  3. Sin statements anidados
  4. countLines("x = 2;") = 1
  5. cursor += 1 → cursor = 7
  6. Es el último → no sumar 1
```

### Cómo se Construye (Función `buildSourceMap`)

Para debugging, nosotros [generamos Mappings en formato plano](https://github.com/ULL-ESIT-PL/dragon2js/blob/C2visitAndDebug/src/codegen.cjs#L66-L73) que vamos guardando en arrays como este:

```javascript
const mappings = [
    {
        generatedLine: 1,      // Línea en .js
        originalLine: 2,       // Línea en .drg
        originalColumn: 3      // Columna en .drg
    },
    // ... más mappings
];
```

y luego los convertimos a VLQ con [source-map](https://www.npmjs.com/package/source-map):

```javascript
function buildSourceMap(code, source, sourceFile, mappings) {
    // 1. Crear generador
          /* ... */

    // 2. Agregar cada mapping
          /* ... */

    // 3. Incluir contenido original
          /* ... */
    // 4. Serializar y limpiar
    const sourceMap = map.toJSON();
    return cleanSourceMapNames(sourceMap);
}
```

### Limpieza de Nombres (`cleanSourceMapNames`)

**Problema:** Los identificadores Dragon tienen prefijo `$` internamente:
- En AST: `$x`, `$counter`, `$sum`
- En source map también aparecen con `$`

**Solución:** Remover el prefijo antes de retornar:

```javascript
function cleanSourceMapNames(sourceMap) {
    if (!sourceMap || !sourceMap.names) return sourceMap;

    /* ... Lógica para limpiar nombres ... */

    return sourceMap;
}
```

**Resultado:**
```javascript
// ANTES de limpieza:
{
  "names": ["$i", "$j", "$a", "console", "log"]
}

// DESPUÉS de limpieza:
{
  "names": ["i", "j", "a", "console", "log"]  // ✓ Limpio
}
```

---

## Listado de nodos en los que se generan mappings

| Nodo AST           | Descripción                          |
|--------------------|--------------------------------------|
| Program            |  Mapea cada statement del programa   |
| BlockStatement     |  Mapea cada statement dentro del bloque |
| IfStatement        |  Mapea la línea del `if`             |
| WhileStatement     |  Mapea la línea del `while`          |
| DoWhileStatement   |  Mapea la línea del `do`             |


## Glosario  Resumen

| Concepto | Propósito |
|----------|-----------|
| **Emitter** | Gestionar emisión de código sin contaminar AST |
| **WeakMap** | Mapeos node → código/mappings que permiten GC |
| **Traversal** | Recorrer AST en orden (children primero) |
| **Handlers** | Generar código para cada tipo de nodo |
| **Source Maps** | Vincular código generado con fuente original |
| **Mappings** | Pares (línea_generada, línea_original, columna) |
| **Limpieza** | Remover `$` de identificadores en source maps |

---

## Referencias

### Babel 

- [Babel Parser API](https://babeljs.io/docs/babel-parser)
- [Babel Traverse](https://babeljs.io/docs/babel-traverse) 
- [Babel Plugin Examples](https://github.com/ULL-ESIT-PL/babel-learning/blob/main/src/awesome/README.md).
- [Babel Source Map Options](https://babeljs.io/docs/options#source-map-options)

### Source maps

* Slides in 2024 Web Engines Hackfest: The Future of Source Maps by Jonathan Kuperman (TC39 and Engineer at Bloomberg) 
  * [Slides](https://webengineshackfest.org/2024/slides/the_future_of_source_maps_by_jonathan_kuperman.pdf) 
  * [Video of the talk](https://youtu.be/dre3gPQlYvg?si=GiZynwEtosHqnDgw) 
- Blog [Source maps from top to bottom](https://craigtaub.dev/source-maps-from-top-to-bottom), [Video](https://www.youtube.com/watch?v=nUV4t5V16I4) and [repo craigtaub/our-own-babel-sourcemap)](https://github.com/craigtaub/our-own-babel-sourcemap) by Craig Taub 
- [Source Map Spec](https://tc39.es/ecma426/) ECMA-426 
- Source Map Visualization tool: 
  
  [![the examples/prac-comp.drg with source map](/docs/images/source-map-visualizer.png)](https://evanw.github.io/source-map-visualization/)
- Calculadora [BASE64 VLQ CODEC (COder/DECoder) AND SOURCEMAP V3 / ECMA-426 MAPPINGS PARSER](https://www.murzwin.com/base64vlq.html)
- [How to Implement Source Maps](https://oneuptime.com/blog/post/2026-01-30-source-maps) Learn to implement source maps for debugging transpiled code with generation, hosting, and security considerations for production debugging.
- [Source Map MDN](https://developer.mozilla.org/en-US/docs/Glossary/Source_map)
- [Using source maps in DevTools](https://www.youtube.com/embed/SkUcO4ML5U0) Youtube video by Chrome DevTools team
* [Wikipedia: Source-to-source compiler](https://en.wikipedia.org/wiki/Source-to-source_compiler)

### WeakMap

- [WeakMap MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) 

## [Up](/README.md) 

