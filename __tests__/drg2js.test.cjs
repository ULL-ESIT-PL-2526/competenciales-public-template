const path = require('path');
const fs = require('fs');
const os = require('os');
const vm = require('vm'); /* V8 contexts are created. Each context has: its own global object, its own scope chain. Code is compiled to V8 bytecode. Execution happens inside that context. Important: contexts share the same V8 isolate, meaning: same heap, same event loop, same native bindings */

const parserPath = path.resolve(__dirname, '..', 'src', 'parser.cjs');
const parser = require(parserPath);

describe('Dragon parser and ASTs', () => {
  test('parses a simple assignment inside a block', () => {
    const source = '{ int a; a = 1; }';
    const ast = parser.parse(source);

    expect(ast.type).toBe('Program');
    expect(ast.body).toHaveLength(1);
    expect(ast.body[0].type).toBe('BlockStatement');
    expect(ast.body[0].body).toHaveLength(2);
    expect(ast.body[0].body[0].type).toBe('VariableDeclaration');
    expect(ast.body[0].body[1].type).toBe('ExpressionStatement');
  });

  test('parses examples/prac-comp.drg with expected control flow and array usage', () => {
    const sourcePath = path.resolve(__dirname, 'fixtures', 'prac-comp.drg');
    const source = fs.readFileSync(sourcePath, 'utf8');
    const ast = parser.parse(source);

    expect(ast.type).toBe('Program');
    expect(ast.body).toHaveLength(1);
    expect(ast.body[0].type).toBe('BlockStatement');

    const topLevel = ast.body[0].body;
    expect(topLevel.length).toBeGreaterThan(5);

    // The example starts with 3 declarations: i, j, and a two-dimensional array.
    expect(topLevel[0].type).toBe('VariableDeclaration');
    expect(topLevel[1].type).toBe('VariableDeclaration');
    expect(topLevel[2].type).toBe('VariableDeclaration');

    const arrayDecl = topLevel[2].declarations[0];
    expect(arrayDecl.id.name).toBe('$a');
    expect(arrayDecl.init.type).toBe('CallExpression');
    expect(arrayDecl.init.callee.object.name).toBe('Array');
    expect(arrayDecl.init.callee.property.name).toBe('from');

    const hasWhile = topLevel.some((stmt) => stmt.type === 'WhileStatement');
    const hasDoWhile = topLevel.some((stmt) => stmt.type === 'DoWhileStatement');
    expect(hasWhile).toBe(true);
    expect(hasDoWhile).toBe(true);

    const outerWhile = topLevel.find((stmt) => stmt.type === 'WhileStatement');
    const hasNestedWhile = outerWhile.body.body.some((stmt) => stmt.type === 'WhileStatement');
    expect(hasNestedWhile).toBe(true);

    const innerWhile = outerWhile.body.body.find((stmt) => stmt.type === 'WhileStatement');
    const hasIfElse = innerWhile.body.body.some(
      (stmt) => stmt.type === 'IfStatement' && stmt.alternate !== null,
    );
    expect(hasIfElse).toBe(true);
  });

  test('parses examples/print04.drg with nested loops and print statement', () => {
    const sourcePath = path.resolve(__dirname, 'fixtures', 'print04.drg');
    const source = fs.readFileSync(sourcePath, 'utf8');
    const ast = parser.parse(source);

    expect(ast.type).toBe('Program');
    expect(ast.body).toHaveLength(1);
    expect(ast.body[0].type).toBe('BlockStatement');

    const topLevel = ast.body[0].body;
    expect(topLevel.length).toBeGreaterThanOrEqual(5);

    // First declaration is float[2][2] x, initialized as nested arrays.
    const xDecl = topLevel[0].declarations[0];
    expect(xDecl.id.name).toBe('$x');
    expect(xDecl.init.type).toBe('CallExpression');
    expect(xDecl.init.callee.object.name).toBe('Array');
    expect(xDecl.init.callee.property.name).toBe('from');

    const outerWhile = topLevel.find((stmt) => stmt.type === 'WhileStatement');
    expect(outerWhile).toBeDefined();
    const innerWhile = outerWhile.body.body.find((stmt) => stmt.type === 'WhileStatement');
    expect(innerWhile).toBeDefined();

    const printStmt = topLevel[topLevel.length - 1];
    expect(printStmt.type).toBe('ExpressionStatement');
    expect(printStmt.expression.type).toBe('CallExpression');
    expect(printStmt.expression.callee.object.name).toBe('console');
    expect(printStmt.expression.callee.property.name).toBe('log');
    expect(printStmt.expression.arguments[0].type).toBe('Identifier');
    expect(printStmt.expression.arguments[0].name).toBe('$x');
  });

  test('main translates and runs bool01 fixture end-to-end', () => {
    const cliPath = path.resolve(__dirname, '..', 'bin', 'drg2js.cjs');
    const fixturePath = path.resolve(__dirname, 'fixtures', 'bool01.drg');
    const outFile = path.join(os.tmpdir(), `bool01.generated.${Date.now()}.js`);
    const originalArgv = process.argv;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      jest.isolateModules(() => {
        process.argv = ['node', cliPath, '-o', outFile, fixturePath];
        const main = require('../bin/drg2js.cjs');
        main();
      });
    } finally {
      process.argv = originalArgv;
      logSpy.mockRestore();
      errSpy.mockRestore();
    }

    expect(fs.existsSync(outFile)).toBe(true);

    const generatedJs = fs.readFileSync(outFile, 'utf8').trim();
    expect(generatedJs.startsWith('{')).toBe(true);
    expect(generatedJs).toContain('\n}');
    expect(generatedJs).toContain(`//# sourceMappingURL=${path.basename(outFile)}.map`);
    expect(generatedJs).toContain('let $x = false;');
    expect(generatedJs).toContain('let $i = false;');
    expect(generatedJs).toContain('$i = true;');
    expect(generatedJs).toContain('$x = $i && 1 < 3;');
    expect(generatedJs).toContain('console.log($x);');

    const logs = [];
    vm.runInNewContext(generatedJs, {
      console: {
        log: (value) => logs.push(String(value)),
      },
    });

    expect(logs).toEqual(['true']);

    fs.unlinkSync(outFile);
  });

  test('compiles and runs int < float comparison', () => {
    const cliPath = path.resolve(__dirname, '..', 'bin', 'drg2js.cjs');
    const outFile = path.join(os.tmpdir(), `int-float-compare.generated.${Date.now()}.js`);
    const originalArgv = process.argv;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const dragSource = `{
      int x;
      float y;
      x = 5;
      y = 5.5;
      print(x < y);
    }`;

    const dragFile = path.join(os.tmpdir(), `int-float-compare.${Date.now()}.drg`);
    fs.writeFileSync(dragFile, dragSource);

    try {
      jest.isolateModules(() => {
        process.argv = ['node', cliPath, '-o', outFile, dragFile];
        const main = require('../bin/drg2js.cjs');
        main();
      });
    } finally {
      process.argv = originalArgv;
      logSpy.mockRestore();
      errSpy.mockRestore();
    }

    expect(fs.existsSync(outFile)).toBe(true);

    const generatedJs = fs.readFileSync(outFile, 'utf8').trim();
    expect(generatedJs).toContain('let $x = 0;');
    expect(generatedJs).toContain('let $y = 0;');
    expect(generatedJs).toContain('$x = 5;');
    expect(generatedJs).toContain('$y = 5.5;');
    expect(generatedJs).toContain('console.log($x < $y);');

    const logs = [];
    vm.runInNewContext(generatedJs, {
      console: {
        log: (value) => logs.push(String(value)),
      },
    });

    // 5 < 5.5 should be true
    expect(logs).toEqual(['true']);

    fs.unlinkSync(outFile);
    fs.unlinkSync(dragFile);
  });

  test('compiles and runs array equality comparison with util.isDeepStrictEqual', () => {
    const cliPath = path.resolve(__dirname, '..', 'bin', 'drg2js.cjs');
    const outFile = path.join(os.tmpdir(), `array-equality-compare.generated.${Date.now()}.js`);
    const dragFile = path.join(os.tmpdir(), `array-equality-compare.${Date.now()}.drg`);

    const dragSource = `{
      int[3] arr1;
      int[3] arr2;
      arr1[0] = 1;
      arr1[1] = 2;
      arr1[2] = 3;
      arr2[0] = 1;
      arr2[1] = 2;
      arr2[2] = 3;
      print(arr1 == arr2);
      print(arr1 != arr2);
      arr2[2] = 4;
      print(arr1 == arr2);
      print(arr1 != arr2);
    }`;

    fs.writeFileSync(dragFile, dragSource);

    // Import modules directly instead of using jest.isolateModules
    const parser = require('../src/parser.cjs');
    const { scopeAnalyze } = require('../src/scope-analysis.cjs');
    const { typeCheck } = require('../src/type-check.cjs');
    const generateJavaScript = require('../src/codegen.cjs');

    try {
      let ast = parser.parse(dragSource);
      ast = scopeAnalyze(ast);
      ast = typeCheck(ast);
      
      const { code } = generateJavaScript(ast, { codegen: 'main' }, dragSource, dragFile);
      fs.writeFileSync(outFile, code);
    } catch (err) {
      console.error('Compilation error:', err.message);
      fs.unlinkSync(dragFile);
      throw err;
    }

    expect(fs.existsSync(outFile)).toBe(true);

    const generatedJs = fs.readFileSync(outFile, 'utf8').trim();
    // Should use isDeepStrictEqual from support-lib for array equality
    expect(generatedJs).toContain('isDeepStrictEqual');
    expect(generatedJs).toContain("require('dragon2js/lib/support-lib')");

    const supportLib = require('../src/support-lib.cjs');
    const logs = [];
    const mockRequire = (modulePath) => {
      if (modulePath === 'dragon2js/lib/support-lib') {
        return supportLib;
      }
      return require(modulePath);
    };
    
    vm.runInNewContext(generatedJs, {
      console: {
        log: (value) => logs.push(String(value)),
      },
      require: mockRequire,  // Make require available with support-lib support
    });

    // Results: arr1==arr2 (true), arr1!=arr2 (false), arr1==arr2 (false), arr1!=arr2 (true)
    expect(logs).toEqual(['true', 'false', 'false', 'true']);

    fs.unlinkSync(outFile);
    fs.unlinkSync(dragFile);
  });

  test('compiles and runs string concatenation with numeric and bool types', () => {
    const dragSource = `{
      int a;
      float b;
      bool c;
      a = 42;
      b = 3.14;
      c = true;
      print("a = " + a + ", b = " + b + ", c = " + c);
      print("answer: " + 100);
      print("pi ~ " + 3.14159);
      print("active: " + false);
    }`;

    const dragFile = path.join(os.tmpdir(), `char-concat.${Date.now()}.drg`);
    const outFile = path.join(os.tmpdir(), `char-concat.generated.${Date.now()}.js`);

    fs.writeFileSync(dragFile, dragSource);

    const parser = require('../src/parser.cjs');
    const { scopeAnalyze } = require('../src/scope-analysis.cjs');
    const { typeCheck } = require('../src/type-check.cjs');
    const generateJavaScript = require('../src/codegen.cjs');

    try {
      let ast = parser.parse(dragSource);
      ast = scopeAnalyze(ast);
      ast = typeCheck(ast);
      
      expect(!ast._typeErrors || ast._typeErrors.length === 0).toBe(true);  // No type errors
      
      const { code } = generateJavaScript(ast, { codegen: 'main' }, dragSource, dragFile);
      fs.writeFileSync(outFile, code);
    } catch (err) {
      console.error('Compilation error:', err.message);
      fs.unlinkSync(dragFile);
      throw err;
    }

    expect(fs.existsSync(outFile)).toBe(true);

    const generatedJs = fs.readFileSync(outFile, 'utf8').trim();
    expect(generatedJs).toContain('let $a = 0;');
    expect(generatedJs).toContain('let $b = 0;');
    expect(generatedJs).toContain('let $c = false;');
    expect(generatedJs).toContain('$a = 42;');
    expect(generatedJs).toContain('$b = 3.14;');
    expect(generatedJs).toContain('$c = true;');
    
    const logs = [];
    vm.runInNewContext(generatedJs, {
      console: {
        log: (value) => logs.push(String(value)),
      },
    });

    // Verify string concatenation results
    expect(logs).toEqual([
      'a = 42, b = 3.14, c = true',
      'answer: 100',
      'pi ~ 3.14159',
      'active: false'
    ]);

    fs.unlinkSync(outFile);
    fs.unlinkSync(dragFile);
  });
});
