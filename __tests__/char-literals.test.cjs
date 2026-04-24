const { 
  setupDragonCode, 
  setupDragonCodeInline, 
  expectErrors, 
  expectNoErrors 
} = require('./test-helpers.js');
const path = require('path');

describe('Char Literal Tests', () => {

  describe('Char Literal Parsing & Type Decoration', () => {

    test('parses and types single-quoted string literal', () => {
      const ast = setupDragonCodeInline(`{ char msg; msg = 'hello world'; }`);
      expectNoErrors(ast, 'Type');
      const assignStmt = ast.body[0].body[1];
      expect(assignStmt.expression.right.type).toBe('StringLiteral');
      expect(assignStmt.expression.right._type.baseType).toBe('char');
    });

    test('parses and types double-quoted string literal', () => {
      const ast = setupDragonCodeInline(`{ char msg; msg = "hello world"; }`);
      expectNoErrors(ast, 'Type');
      const assignStmt = ast.body[0].body[1];
      expect(assignStmt.expression.right.type).toBe('StringLiteral');
      expect(assignStmt.expression.right._type.baseType).toBe('char');
    });

    test('handles escape sequences in single quotes', () => {
      const ast = setupDragonCodeInline(`{
        char msg;
        msg = 'Hello\\nWorld';
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('handles escape sequences in double quotes', () => {
      const ast = setupDragonCodeInline(`{
        char msg;
        msg = "Hello\\tWorld";
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('handles escaped quotes in strings', () => {
      const ast = setupDragonCodeInline(`{
        char msg;
        msg = 'It\\'s working';
      }`);
      expectNoErrors(ast, 'Type');
    });
  });

  describe('Char in Expressions', () => {

    test('allows char comparison with == operator', () => {
      const ast = setupDragonCodeInline(`{
        char a;
        char b;
        bool result;
        result = (a == b);
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('allows char comparison with relational operators', () => {
      const ast = setupDragonCodeInline(`{
        char x;
        char y;
        bool z;
        z = x < y;
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('allows concatenation of char literals', () => {
      const ast = setupDragonCodeInline(`{
        char msg;
        msg = 'hello' + 'world';  // String concatenation is now allowed
      }`);
      expectNoErrors(ast, 'Type');
      expect(ast._typeErrors.length).toBe(0);
    });
  });

  describe('Char Arrays', () => {

    test('initializes char array to empty strings', () => {
      const ast = setupDragonCodeInline(`{
        char[5] buffer;
      }`);
      expectNoErrors(ast, 'Type');
      const decl = ast.body[0].body[0];
      expect(decl.declarations[0].init).toBeDefined();
    });

    test('allows char array element assignment', () => {
      const ast = setupDragonCodeInline(`{
        char[3] words;
        words[0] = 'hello';
        words[1] = 'world';
      }`);
      expectNoErrors(ast, 'Type');
    });
  });

  describe('Char Initialization', () => {

    test('initializes scalar char to empty string', () => {
      const ast = setupDragonCodeInline(`{
        char c;
      }`);
      expectNoErrors(ast, 'Type');
      const decl = ast.body[0].body[0];
      expect(decl.declarations[0].init).toBeDefined();
      expect(decl.declarations[0].init.type).toBe('StringLiteral');
      expect(decl.declarations[0].init.value).toBe('');
    });

    test('char variables compare equal when both uninitialized (empty)', () => {
      const ast = setupDragonCodeInline(`{
        char a;
        char b;
        bool result;
        result = (a == b);
      }`);
      expectNoErrors(ast, 'Type');
    });
  });

  describe('Syntax Errors with Quotes', () => {

    test('reports error for mismatched quotes', () => {
      const cliPath = path.resolve(__dirname, '..', 'bin', 'drg2js.cjs');
      const fixturePath = path.resolve(__dirname, 'fixtures', 'characters-err01.drg');
      const { spawnSync } = require('child_process');
      
      const run = spawnSync(process.execPath, [cliPath, fixturePath], {
        encoding: 'utf8',
      });
      
      expect(run.status).toBe(1);
      expect(run.stderr).toMatch(/Error|Illegal|Unterminated/);
    });

    test('reports error for unterminated string', () => {
      const parser = require('../src/parser.cjs');
      const source = `{
        char msg;
        msg = 'unterminated
      }`;
      
      expect(() => {
        parser.parse(source);
      }).toThrow();
    });
  });

});
