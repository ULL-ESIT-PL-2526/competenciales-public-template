const { INT, FLOAT, BOOL, CHAR, sameType } = require('../src/types.cjs');
const { canAssign } = require('../src/type-promotions.cjs');

describe('Type System Design: Asymmetry between sameType and canAssign', () => {
    
    describe('Design Principle Documentation', () => {
        test('documents: sameType is STRICT, canAssign is LOOSE', () => {
            // This test documents the intentional asymmetry in our type system
            
            // RULE 1: int and float have different TYPE EQUALITY
            expect(sameType(INT, FLOAT)).toBe(false);
            
            // RULE 2: But int CAN BE ASSIGNED to float (implicit promotion)
            expect(canAssign(FLOAT, INT)).toBe(true);
            
            // This asymmetry is intentional:
            // - sameType: for type annotations (strict)
            // - canAssign: for runtime assignments (flexible)
        });
    });

    describe('sameType(): Strict Equality for Type Annotations', () => {
        
        test('same base type → true', () => {
            expect(sameType(INT, INT)).toBe(true);
            expect(sameType(FLOAT, FLOAT)).toBe(true);
            expect(sameType(BOOL, BOOL)).toBe(true);
            expect(sameType(CHAR, CHAR)).toBe(true);
        });

        test('different base types → false (by design)', () => {
            expect(sameType(INT, FLOAT)).toBe(false);
            expect(sameType(INT, BOOL)).toBe(false);
            expect(sameType(INT, CHAR)).toBe(false);
            expect(sameType(FLOAT, CHAR)).toBe(false);
        });

        test('array types with same dimensions → true', () => {
            const intArr10 = { baseType: 'int', dimensions: [10] };
            const intArr10b = { baseType: 'int', dimensions: [10] };
            expect(sameType(intArr10, intArr10b)).toBe(true);
        });

        test('array types with different dimensions → false', () => {
            const intArr10 = { baseType: 'int', dimensions: [10] };
            const intArr20 = { baseType: 'int', dimensions: [20] };
            expect(sameType(intArr10, intArr20)).toBe(false);
        });

        test('scalar vs array of same base type → false', () => {
            const scalar = { baseType: 'int', dimensions: [] };
            const array = { baseType: 'int', dimensions: [10] };
            expect(sameType(scalar, array)).toBe(false);
        });
    });

    describe('canAssign(): Loose Compatibility for Assignments', () => {
        
        test('same types always assignable', () => {
            expect(canAssign(INT, INT)).toBe(true);
            expect(canAssign(FLOAT, FLOAT)).toBe(true);
            expect(canAssign(CHAR, CHAR)).toBe(true);
        });

        test('int can be implicitly promoted to float', () => {
            // This is the key difference from sameType
            expect(canAssign(FLOAT, INT)).toBe(true);  // int → float ✓
            expect(canAssign(INT, FLOAT)).toBe(false); // float → int ✗
        });

        test('char cannot be mixed with numeric types', () => {
            expect(canAssign(CHAR, INT)).toBe(false);
            expect(canAssign(CHAR, FLOAT)).toBe(false);
            expect(canAssign(INT, CHAR)).toBe(false);
            expect(canAssign(FLOAT, CHAR)).toBe(false);
        });

        test('array dimensions must match exactly', () => {
            const intArr10 = { baseType: 'int', dimensions: [10] };
            const intArr10b = { baseType: 'int', dimensions: [10] };
            const intArr20 = { baseType: 'int', dimensions: [20] };
            
            expect(canAssign(intArr10, intArr10b)).toBe(true);   // Same
            expect(canAssign(intArr10, intArr20)).toBe(false);   // Different size
        });

        test('scalar cannot be assigned to array or vice versa', () => {
            const scalar = { baseType: 'int', dimensions: [] };
            const array = { baseType: 'int', dimensions: [10] };
            
            expect(canAssign(array, scalar)).toBe(false);  // scalar → array ✗
            expect(canAssign(scalar, array)).toBe(false);  // array → scalar ✗
        });
    });

    describe('Asymmetry Use Cases', () => {
        
        test('variable assignment: implicit promotion allowed', () => {
            // float x = 5;  // where 5 is int
            // This is VALID in Dragon
            expect(canAssign(FLOAT, INT)).toBe(true);
        });

        test('variable declaration type check: strict types required', () => {
            // When storing "x has type float", x's actual type must match
            const floatType = FLOAT;
            // We use sameType() to verify annotations match
            expect(sameType(floatType, FLOAT)).toBe(true);  // OK: float = float
            expect(sameType(floatType, INT)).toBe(false);   // NOT OK: float ≠ int
        });

        test('expression: int < float allowed (with promotion)', () => {
            // In comparisons, int can be promoted to float for compatibility
            // promoteComparable() allows this, facilitated by allowing int/float mixing
            expect(canAssign(FLOAT, INT)).toBe(true);  // Enables promotion
        });

        test('no downcasting: float cannot become int', () => {
            // Dragon has no implicit downcasting (float → int)
            expect(canAssign(INT, FLOAT)).toBe(false);
        });
    });

    describe('Real-world Example: Mixed Assignment', () => {
        
        test('int x; float y; y = x + 1.5;', () => {
            // Step 1: x + 1.5
            //   x is int, 1.5 is float
            //   This requires promotion: int → float
            expect(canAssign(FLOAT, INT)).toBe(true);  // ✓ Can promote for arithmetic
            
            // Step 2: y = (x + 1.5)
            //   Result is float, y expects float
            expect(canAssign(FLOAT, FLOAT)).toBe(true);  // ✓ Can assign
            
            // But y's declared type is strictly float
            expect(sameType(FLOAT, FLOAT)).toBe(true);  // ✓ Type annotation matches
            expect(sameType(FLOAT, INT)).toBe(false);   // ✓ Prevents x from being y's type
        });
    });
});
