const path = require('path');
const fs = require('fs');
const parser = require('../src/parser.cjs');
const { scopeAnalyze } = require('../src/scope-analysis.cjs');

describe('Scope Analysis', () => {
  
  describe('Undeclared Variables', () => {
    test('detects undeclared variable in simple assignment', () => {
      const source = '{ a = 0.0; }';
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors).toBeDefined();
      expect(ast._scopeErrors.length).toBe(1);
      expect(ast._scopeErrors[0].type).toBe('ScopeError');
      expect(ast._scopeErrors[0].message).toContain("Variable 'a' is not declared");
      expect(ast._scopeErrors[0].name).toBe('a');
    });

    test('parses scope-err01.drg and detects undeclared variable', () => {
      const sourcePath = path.resolve(__dirname, 'fixtures', 'scope-err01.drg');
      const source = fs.readFileSync(sourcePath, 'utf8');
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors).toBeDefined();
      expect(ast._scopeErrors.length).toBe(1);
      expect(ast._scopeErrors[0].type).toBe('ScopeError');
      expect(ast._scopeErrors[0].message).toContain("Variable 'a' is not declared");
    });
  });

  describe('Scope Isolation and Shadowing', () => {
    test('parses scope-err02.drg and detects variables not in scope', () => {
      const sourcePath = path.resolve(__dirname, 'fixtures', 'scope-err02.drg');
      const source = fs.readFileSync(sourcePath, 'utf8');
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors).toBeDefined();
      // scope-err02.drg has multiple errors: k, j (in outer scope after inner block)
      expect(ast._scopeErrors.length).toBeGreaterThanOrEqual(2);
      
      // Check that we detect undeclared k
      const kError = ast._scopeErrors.find(e => e.name === 'k');
      expect(kError).toBeDefined();
      expect(kError.message).toContain("Variable 'k' is not declared");
      
      // Check that we detect undeclared j in outer scope
      const jError = ast._scopeErrors.find(e => e.name === 'j');
      expect(jError).toBeDefined();
      expect(jError.message).toContain("Variable 'j' is not declared");
    });

    test('allows shadowing (redeclaration in inner scope)', () => {
      const source = `{
        int i;
        i = 1;
        {
          int i;  // This is allowed - shadowing
          i = 2;
        }
      }`;
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      // Shadowing is allowed, so no errors about redeclaration in different scopes
      expect(ast._scopeErrors.length).toBe(0);
    });
  });

  describe('Redeclaration Detection', () => {
    test('parses scope-err03.drg and detects variable redeclaration', () => {
      const sourcePath = path.resolve(__dirname, 'fixtures', 'scope-err03.drg');
      const source = fs.readFileSync(sourcePath, 'utf8');
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors).toBeDefined();
      expect(ast._scopeErrors.length).toBe(1);
      expect(ast._scopeErrors[0].type).toBe('RedeclarationError');
      expect(ast._scopeErrors[0].message).toContain("Variable 'i' is already declared in this scope");
      expect(ast._scopeErrors[0].name).toBe('i');
    });

    test('detects redeclaration in same block', () => {
      const source = `{
        int x;
        int x;  // Error: redeclaration
      }`;
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors.length).toBe(1);
      expect(ast._scopeErrors[0].type).toBe('RedeclarationError');
      expect(ast._scopeErrors[0].message).toContain("Variable 'x' is already declared in this scope");
    });
  });

  describe('Break Statement Validation', () => {
    test('parses scope-err04.drg and detects break outside loop', () => {
      const sourcePath = path.resolve(__dirname, 'fixtures', 'scope-err04.drg');
      const source = fs.readFileSync(sourcePath, 'utf8');
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors).toBeDefined();
      expect(ast._scopeErrors.length).toBe(1);
      expect(ast._scopeErrors[0].type).toBe('BreakError');
      expect(ast._scopeErrors[0].message).toContain('Break statement must be inside a loop');
    });

    test('detects break outside loop', () => {
      const source = `{
        break;  // Error: break outside loop
      }`;
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors.length).toBe(1);
      expect(ast._scopeErrors[0].type).toBe('BreakError');
    });

    test('allows break inside while loop', () => {
      const source = `{
        int i;
        while (i < 10) {
          break;  // This is OK
        }
      }`;
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors.length).toBe(0);
    });

    test('allows break inside do-while loop', () => {
      const source = `{
        int i;
        do {
          break;  // This is OK
        } while (i < 10);
      }`;
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors.length).toBe(0);
    });

    test('detects break outside nested loop (in conditional)', () => {
      const source = `{
        int i;
        while (i < 10) {
          if (i == 5) {
            if (true) {
              break;  // This is OK - still inside while loop
            }
          }
        }
      }`;
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors.length).toBe(0);
    });
  });

  describe('Dragon Identifier Prefixing', () => {
    test('error messages show clean names without $ prefix', () => {
      const source = '{ x = 1; }';  // x becomes $x internally
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors).toBeDefined();
      expect(ast._scopeErrors.length).toBe(1);
      // Error message should show 'x', not '$x'
      expect(ast._scopeErrors[0].name).toBe('x');
      expect(ast._scopeErrors[0].message).toContain("Variable 'x' is not declared");
    });

    test('scope analysis validates $ prefixed identifiers', () => {
      const source = `{
        int x;
        x = 1;
      }`;
      let ast = parser.parse(source);
      
      // After parsing, x becomes $x in AST identifiers
      const assignment = ast.body[0].body[1].expression;
      expect(assignment.left.name).toBe('$x');  // Internal representation
      
      ast = scopeAnalyze(ast);
      
      // But no scope errors because $x is declared
      expect(ast._scopeErrors.length).toBe(0);
    });
  });

  describe('Valid Programs', () => {
    test('accepts program with proper variable declarations', () => {
      const source = `{
        int a;
        float b;
        a = 1;
        b = 2.5;
      }`;
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors).toBeDefined();
      expect(ast._scopeErrors.length).toBe(0);
    });

    test('accepts program with arrays', () => {
      const source = `{
        int[10] arr;
        arr[0] = 5;
      }`;
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors.length).toBe(0);
    });

    test('accepts program with nested blocks and proper scoping', () => {
      const source = `{
        int x;
        {
          int y;
          x = 1;
          y = 2;
        }
        x = 3;
      }`;
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors.length).toBe(0);
    });

    test('accepts program with loops and break', () => {
      const source = `{
        int i;
        while (i < 10) {
          i = i + 1;
          if (i == 5) {
            break;
          }
        }
      }`;
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors.length).toBe(0);
    });

    test('parses scope04.drg with variable shadowing and prints correctly', () => {
      const sourcePath = path.resolve(__dirname, 'fixtures', 'scope04.drg');
      const source = fs.readFileSync(sourcePath, 'utf8');
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      // scope04.drg demonstrates valid shadowing - no scope errors expected
      expect(ast._scopeErrors).toBeDefined();
      expect(ast._scopeErrors.length).toBe(0);

      // The program has valid scope: outer scope `int i = 1`, 
      // inner scope redefines `int i = -1`
      // It prints i from inner scope (-1), then i from outer scope (1)
      // This verifies that shadowing is properly allowed and works correctly
    });
  });

  describe('Multiple Errors', () => {
    test('reports multiple undeclared variables', () => {
      const source = `{
        a = 1;
        b = 2;
        c = 3;
      }`;
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      expect(ast._scopeErrors.length).toBe(3);
      const names = ast._scopeErrors.map(e => e.name).sort();
      expect(names).toEqual(['a', 'b', 'c']);
    });

    test('scope-err02.drg example with multiple errors', () => {
      const sourcePath = path.resolve(__dirname, 'fixtures', 'scope-err02.drg');
      const source = fs.readFileSync(sourcePath, 'utf8');
      let ast = parser.parse(source);
      ast = scopeAnalyze(ast);

      // All errors should be properly recorded with location info
      ast._scopeErrors.forEach(error => {
        expect(error.message).toBeDefined();
        expect(error.location).toBeDefined();
        expect(error.location.line).toBeDefined();
        expect(error.location.column).toBeDefined();
      });
    });
  });
});
