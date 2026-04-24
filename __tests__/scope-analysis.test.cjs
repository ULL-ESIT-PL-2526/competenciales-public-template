const { 
  setupDragonCode, 
  setupDragonCodeInline, 
  expectErrors, 
  expectNoErrors, 
  expectErrorMessage 
} = require('./test-helpers.js');

describe('Scope Analysis', () => {
  
  describe('Undeclared Variables', () => {
    test('detects undeclared variable in simple assignment', () => {
      const ast = setupDragonCodeInline('{ a = 0.0; }');
      expectErrors(ast, 1, 'Scope');
      expect(ast._scopeErrors[0].type).toBe('ScopeError');
      expect(ast._scopeErrors[0].message).toContain("Variable 'a' is not declared");
      expect(ast._scopeErrors[0].name).toBe('a');
    });

    test('parses scope-err01.drg and detects undeclared variable', () => {
      const ast = setupDragonCode('fixtures/scope-err01.drg');
      expectErrors(ast, 1, 'Scope');
      expect(ast._scopeErrors[0].type).toBe('ScopeError');
      expectErrorMessage(ast, 0, "Variable 'a' is not declared", 'Scope');
    });
  });

  describe('Scope Isolation and Shadowing', () => {
    test('parses scope-err02.drg and detects variables not in scope', () => {
      const ast = setupDragonCode('fixtures/scope-err02.drg');
      expect(ast._scopeErrors.length).toBeGreaterThanOrEqual(2);
      
      const kError = ast._scopeErrors.find(e => e.name === 'k');
      expect(kError).toBeDefined();
      expect(kError.message).toContain("Variable 'k' is not declared");
      
      const jError = ast._scopeErrors.find(e => e.name === 'j');
      expect(jError).toBeDefined();
      expect(jError.message).toContain("Variable 'j' is not declared");
    });

    test('allows shadowing (redeclaration in inner scope)', () => {
      const ast = setupDragonCodeInline(`{
        int i;
        i = 1;
        {
          int i;  // This is allowed - shadowing
          i = 2;
        }
      }`);
      expectNoErrors(ast, 'Scope');
    });
  });

  describe('Redeclaration Detection', () => {
    test('parses scope-err03.drg and detects variable redeclaration', () => {
      const ast = setupDragonCode('fixtures/scope-err03.drg');
      expectErrors(ast, 1, 'Scope');
      expect(ast._scopeErrors[0].type).toBe('RedeclarationError');
      expectErrorMessage(ast, 0, "Variable 'i' is already declared in this scope", 'Scope');
      expect(ast._scopeErrors[0].name).toBe('i');
    });

    test('detects redeclaration in same block', () => {
      const ast = setupDragonCodeInline(`{
        int x;
        int x;  // Error: redeclaration
      }`);
      expectErrors(ast, 1, 'Scope');
      expect(ast._scopeErrors[0].type).toBe('RedeclarationError');
      expectErrorMessage(ast, 0, "Variable 'x' is already declared in this scope", 'Scope');
    });
  });

  describe('Break Statement Validation', () => {
    test('parses scope-err04.drg and detects break outside loop', () => {
      const ast = setupDragonCode('fixtures/scope-err04.drg');
      expectErrors(ast, 1, 'Scope');
      expect(ast._scopeErrors[0].type).toBe('BreakError');
      expectErrorMessage(ast, 0, 'Break statement must be inside a loop', 'Scope');
    });

    test('detects break outside loop', () => {
      const ast = setupDragonCodeInline(`{
        break;  // Error: break outside loop
      }`);
      expectErrors(ast, 1, 'Scope');
      expect(ast._scopeErrors[0].type).toBe('BreakError');
    });

    test('allows break inside while loop', () => {
      const ast = setupDragonCodeInline(`{
        int i;
        while (i < 10) {
          break;  // This is OK
        }
      }`);
      expectNoErrors(ast, 'Scope');
    });

    test('allows break inside do-while loop', () => {
      const ast = setupDragonCodeInline(`{
        int i;
        do {
          break;  // This is OK
        } while (i < 10);
      }`);
      expectNoErrors(ast, 'Scope');
    });

    test('detects break outside nested loop (in conditional)', () => {
      const ast = setupDragonCodeInline(`{
        int i;
        while (i < 10) {
          if (i == 5) {
            if (true) {
              break;  // This is OK - still inside while loop
            }
          }
        }
      }`);
      expectNoErrors(ast, 'Scope');
    });
  });

  describe('Dragon Identifier Prefixing', () => {
    test('error messages show clean names without $ prefix', () => {
      const ast = setupDragonCodeInline('{ x = 1; }');
      expectErrors(ast, 1, 'Scope');
      expect(ast._scopeErrors[0].name).toBe('x');
      expectErrorMessage(ast, 0, "Variable 'x' is not declared", 'Scope');
    });

    test('scope analysis validates $ prefixed identifiers', () => {
      const ast = setupDragonCodeInline(`{
        int x;
        x = 1;
      }`);
      
      // After parsing, x becomes $x in AST identifiers
      const assignment = ast.body[0].body[1].expression;
      expect(assignment.left.name).toBe('$x');  // Internal representation
      
      // But no scope errors because $x is declared
      expectNoErrors(ast, 'Scope');
    });
  });

  describe('Valid Programs', () => {
    test('accepts program with proper variable declarations', () => {
      const ast = setupDragonCodeInline(`{
        int a;
        float b;
        a = 1;
        b = 2.5;
      }`);
      expectNoErrors(ast, 'Scope');
    });

    test('accepts program with arrays', () => {
      const ast = setupDragonCodeInline(`{
        int[10] arr;
        arr[0] = 5;
      }`);
      expectNoErrors(ast, 'Scope');
    });

    test('accepts program with nested blocks and proper scoping', () => {
      const ast = setupDragonCodeInline(`{
        int x;
        {
          int y;
          x = 1;
          y = 2;
        }
        x = 3;
      }`);
      expectNoErrors(ast, 'Scope');
    });

    test('accepts program with loops and break', () => {
      const ast = setupDragonCodeInline(`{
        int i;
        while (i < 10) {
          i = i + 1;
          if (i == 5) {
            break;
          }
        }
      }`);
      expectNoErrors(ast, 'Scope');
    });

    test('parses scope04.drg with variable shadowing and prints correctly', () => {
      const ast = setupDragonCode('fixtures/scope04.drg');
      expectNoErrors(ast, 'Scope');
    });
  });

  describe('Multiple Errors', () => {
    test('reports multiple undeclared variables', () => {
      const ast = setupDragonCodeInline(`{
        a = 1;
        b = 2;
        c = 3;
      }`);
      expectErrors(ast, 3, 'Scope');
      const names = ast._scopeErrors.map(e => e.name).sort();
      expect(names).toEqual(['a', 'b', 'c']);
    });

    test('scope-err02.drg example with multiple errors', () => {
      const ast = setupDragonCode('fixtures/scope-err02.drg');
      ast._scopeErrors.forEach(error => {
        expect(error.message).toBeDefined();
        expect(error.location).toBeDefined();
        expect(error.location.line).toBeDefined();
        expect(error.location.column).toBeDefined();
      });
    });
  });
});
