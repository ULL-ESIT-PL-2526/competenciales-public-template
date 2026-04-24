const { 
  setupDragonCode, 
  setupDragonCodeInline, 
  expectErrors, 
  expectNoErrors, 
  expectErrorMessage 
} = require('./test-helpers.js');

describe('Type Checking', () => {

  describe('Type Assignment Errors', () => {
    
    test('detects bool assigned to float', () => {
      const ast = setupDragonCode('fixtures/type-err01.drg');
      expectErrors(ast, undefined, 'Type');
      expectErrorMessage(ast, 0, 'Type mismatch in assignment', 'Type');
    });

    test('detects int[2] assigned to float[2]', () => {
      const ast = setupDragonCode('fixtures/type-err02.drg');
      expectErrors(ast, undefined, 'Type');
      expectErrorMessage(ast, 0, 'Type mismatch in assignment', 'Type');
    });

    test('detects char assigned to char[2] (scalar to array)', () => {
      const ast = setupDragonCode('fixtures/type-err04.drg');
      expectErrors(ast, undefined, 'Type');
      expectErrorMessage(ast, 0, 'Type mismatch in assignment', 'Type');
    });

    test('detects char[3][1] assigned to char[2]', () => {
      const ast = setupDragonCode('fixtures/type-err05.drg');
      expectErrors(ast, undefined, 'Type');
      expectErrorMessage(ast, 0, 'Type mismatch in assignment', 'Type');
    });
  });

  describe('Boolean Operator Errors', () => {
    
    test('detects int used with && operator', () => {
      const ast = setupDragonCode('fixtures/type-err03.drg');
      expectErrors(ast, undefined, 'Type');
      const boolError = ast._typeErrors.find(e => e.message.includes('Boolean'));
      expect(boolError).toBeDefined();
    });

    test('forbids bool arrays with && operator (requires scalar bool)', () => {
      const ast = setupDragonCodeInline(`{
        bool[2] a;
        bool[2] b;
        bool x;
        x = a && b;
      }`);
      expectErrors(ast, undefined, 'Type');
      expect(ast._typeErrors.some(e => e.message.includes('scalar boolean operands'))).toBe(true);
    });

    test('forbids unary logical NOT on bool arrays (requires scalar bool)', () => {
      const ast = setupDragonCodeInline(`{
        bool[2] a;
        bool x;
        x = !a;
      }`);
      expectErrors(ast, undefined, 'Type');
      expect(ast._typeErrors.some(e => e.message.includes('Logical NOT requires a scalar boolean operand'))).toBe(true);
    });
  });

  describe('Arithmetic Operator Errors', () => {
    
    test('detects array operands with + operator', () => {
      const ast = setupDragonCode('fixtures/type-err07.drg');
      expectErrors(ast, undefined, 'Type');
      const arithmeticError = ast._typeErrors.find(e => 
        e.message.includes('Arithmetic operator') && 
        e.message.includes('float[10]')
      );
      expect(arithmeticError).toBeDefined();
    });
  });

  describe('Valid Type Programs', () => {
    
    test('accepts simple int assignment', () => {
      const ast = setupDragonCodeInline(`{
        int x;
        int y;
        x = y;
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts int to float promotion', () => {
      const ast = setupDragonCodeInline(`{
        float x;
        int y;
        x = y;  // int promotes to float
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts bool variable assignment', () => {
      const ast = setupDragonCodeInline(`{
        bool x;
        x = true;
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts char variable assignment', () => {
      const ast = setupDragonCodeInline(`{
        char x;
        char y;
        x = y;
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts same dimension array assignment', () => {
      const ast = setupDragonCodeInline(`{
        float[10] x;
        float[10] y;
        x = y;
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts arithmetic on scalar numbers', () => {
      const ast = setupDragonCodeInline(`{
        float x;
        float y;
        float z;
        z = x + y;
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts arithmetic with mixed int and float', () => {
      const ast = setupDragonCodeInline(`{
        float x;
        int y;
        float z;
        z = x + y;  // int promotes to float
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts boolean operations with bool operands', () => {
      const ast = setupDragonCodeInline(`{
        bool x;
        bool y;
        bool z;
        z = x && y;
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts relational operations on numeric types', () => {
      const ast = setupDragonCodeInline(`{
        int x;
        int y;
        bool z;
        z = x < y;
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts equality operations on same types', () => {
      const ast = setupDragonCodeInline(`{
        float x;
        float y;
        bool z;
        z = x == y;
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts array indexing to get scalar', () => {
      const ast = setupDragonCodeInline(`{
        float[10] arr;
        float x;
        int i;
        x = arr[i];  // arr[i] is float (scalar)
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts multi-dimensional array indexing', () => {
      const ast = setupDragonCodeInline(`{
        float[2][3] arr;
        float x;
        int i;
        int j;
        x = arr[i][j];
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('forbids float index in array access (indices must be int)', () => {
      const ast = setupDragonCodeInline(`{
        float[10] arr;
        float f;
        float x;
        f = 4.5;
        x = arr[f];  // ERROR: float index not allowed
      }`);
      expectErrors(ast, undefined, 'Type');
      expect(ast._typeErrors.some(e => e.message.includes('Array index must be integer'))).toBe(true);
    });

    test('forbids bool index in array access (indices must be int)', () => {
      const ast = setupDragonCodeInline(`{
        int[5] arr;
        bool b;
        int x;
        b = true;
        x = arr[b];  // ERROR: bool index not allowed
      }`);
      expectErrors(ast, undefined, 'Type');
      expect(ast._typeErrors.some(e => e.message.includes('Array index must be integer'))).toBe(true);
    });

    test('accepts print with various scalar types', () => {
      const ast = setupDragonCodeInline(`{
        int x;
        float y;
        bool z;
        print(x);
        print(y);
        print(z);
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts if condition with bool', () => {
      const ast = setupDragonCodeInline(`{
        bool x;
        if (x) { x = false; }
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts while condition with bool', () => {
      const ast = setupDragonCodeInline(`{
        bool x;
        while (x) { x = false; }
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts do-while condition with bool', () => {
      const ast = setupDragonCodeInline(`{
        bool x;
        do { x = false; } while (x);
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts char comparison (char is comparable type)', () => {
      const ast = setupDragonCodeInline(`{
        char x;
        char y;
        bool result;
        result = x < y;
      }`);
      expectNoErrors(ast, 'Type');
    });

    test('forbids mixed char and int comparison (char is string, not numeric)', () => {
      const ast = setupDragonCodeInline(`{
        char c;
        int x;
        bool result;
        result = c < x;
      }`);
      expectErrors(ast, undefined, 'Type');
      expectErrorMessage(ast, 0, 'Cannot mix incompatible types', 'Type');
    });
  });

  describe('Char Type Restrictions', () => {

    test('allows char concatenation with any type (string concatenation)', () => {
      // char + char is string concatenation
      const ast1 = setupDragonCodeInline(`{
        char x;
        char y;
        x = x + y;  // string concatenation → char
      }`);
      expectNoErrors(ast1, 'Type');

      // char + int is allowed: int gets converted to string, result is char
      const ast2 = setupDragonCodeInline(`{
        char x;
        int y;
        x = x + y;  // char + int → char (concatenation)
      }`);
      expectNoErrors(ast2, 'Type');

      // int + char is also allowed (commutative)
      const ast3 = setupDragonCodeInline(`{
        char msg;
        int n;
        msg = n + msg;  // int + char → char
      }`);
      expectNoErrors(ast3, 'Type');

      // float + char is allowed too
      const ast4 = setupDragonCodeInline(`{
        char result;
        float pi;
        result = 'pi = ' + pi;  // char + float → char
      }`);
      expectNoErrors(ast4, 'Type');
    });

    test('forbids char to int assignment (char cannot be promoted)', () => {
      const ast = setupDragonCodeInline(`{
        char c;
        int x;
        x = c;
      }`);
      expectErrors(ast, undefined, 'Type');
    });

    test('forbids int to char assignment', () => {
      const ast = setupDragonCodeInline(`{
        char c;
        int x;
        c = x;
      }`);
      expectErrors(ast, undefined, 'Type');
    });

    test('forbids char numeric comparison (char is string, not numeric type)', () => {
      const ast = setupDragonCodeInline(`{
        char c;
        float f;
        bool result;
        result = c < f;
      }`);
      expectErrors(ast, undefined, 'Type');
      expectErrorMessage(ast, 0, 'Cannot mix incompatible types', 'Type');
    });
  });

  describe('Condition Type Errors', () => {
    
    test('detects non-bool if condition', () => {
      const ast = setupDragonCodeInline(`{
        int x;
        if (x) { x = 1; }
      }`);
      expectErrors(ast, undefined, 'Type');
      expectErrorMessage(ast, 0, 'Condition must be boolean', 'Type');
    });

    test('detects non-bool while condition', () => {
      const ast = setupDragonCodeInline(`{
        float x;
        while (x) { x = 1.0; }
      }`);
      expectErrors(ast, undefined, 'Type');
      expectErrorMessage(ast, 0, 'Condition must be boolean', 'Type');
    });
  });

  describe('Type Decoration (AST _type property)', () => {
    
    test('decorates numeric literal with INT type', () => {
      const ast = setupDragonCodeInline(`{ int x; x = 42; }`);
      const assignStmt = ast.body[0].body[1];
      const numLiteral = assignStmt.expression.right;
      expect(numLiteral._type).toBeDefined();
      expect(numLiteral._type.baseType).toBe('int');
      expect(numLiteral._type.dimensions).toEqual([]);
    });

    test('decorates float literal with FLOAT type', () => {
      const ast = setupDragonCodeInline(`{ float x; x = 3.14; }`);
      const assignStmt = ast.body[0].body[1];
      const numLiteral = assignStmt.expression.right;
      expect(numLiteral._type).toBeDefined();
      expect(numLiteral._type.baseType).toBe('float');
    });

    test('decorates bool literal with BOOL type', () => {
      const ast = setupDragonCodeInline(`{ bool x; x = true; }`);
      const assignStmt = ast.body[0].body[1];
      const boolLiteral = assignStmt.expression.right;
      expect(boolLiteral._type).toBeDefined();
      expect(boolLiteral._type.baseType).toBe('bool');
    });

    test('decorates identifier with variable type', () => {
      const ast = setupDragonCodeInline(`{ float x; float y; y = x; }`);
      const assignStmt = ast.body[0].body[2];
      const identifier = assignStmt.expression.right;
      expect(identifier._type).toBeDefined();
      expect(identifier._type.baseType).toBe('float');
      expect(identifier._type.dimensions).toEqual([]);
    });

    test('decorates binary expression with result type', () => {
      const ast = setupDragonCodeInline(`{ int x; int y; int z; z = x + y; }`);
      const assignStmt = ast.body[0].body[3];
      const binExpr = assignStmt.expression.right;
      expect(binExpr._type).toBeDefined();
      expect(binExpr._type.baseType).toBe('int');
    });

    test('decorates comparison expression with BOOL type', () => {
      const ast = setupDragonCodeInline(`{ int x; int y; bool z; z = x < y; }`);
      const assignStmt = ast.body[0].body[3];
      const compExpr = assignStmt.expression.right;
      expect(compExpr._type).toBeDefined();
      expect(compExpr._type.baseType).toBe('bool');
    });

    test('accepts equality comparison on arrays of same type', () => {
      const ast = setupDragonCodeInline(`{ int[10] a; int[10] b; bool result; result = a == b; }`);
      expectNoErrors(ast, 'Type');
    });

    test('accepts inequality comparison on arrays of same type', () => {
      const ast = setupDragonCodeInline(`{ float[5] x; float[5] y; bool result; result = x != y; }`);
      expectNoErrors(ast, 'Type');
    });

    test('forbids comparison of arrays with different dimensions', () => {
      const ast = setupDragonCodeInline(`{ int[10] a; int[5] b; bool result; result = a == b; }`);
      expectErrors(ast, undefined, 'Type');
      expect(ast._typeErrors[0].message).toMatch(/Array types must match/);
    });

    test('forbids comparison of arrays with different base types', () => {
      const ast = setupDragonCodeInline(`{ int[10] a; float[10] b; bool result; result = a == b; }`);
      expectErrors(ast, undefined, 'Type');
      expect(ast._typeErrors[0].message).toMatch(/Array types must match/);
    });

    test('forbids comparison of array and non-array', () => {
      const ast = setupDragonCodeInline(`{ int[10] a; int b; bool result; result = a == b; }`);
      expectErrors(ast, undefined, 'Type');
      expect(ast._typeErrors[0].message).toMatch(/Cannot compare array with non-array/);
    });

  });
});
