// types.cjs

/**
 * TYPE SYSTEM DESIGN
 * 
 * This module defines the Dragon type system with a key design principle:
 * Type EQUALITY vs. ASSIGNABILITY (see type-promotions.cjs for the complement)
 * 
 * - sameType(a, b): Strict equality - base types must match EXACTLY
 *   Used for type annotations, symbol table lookups, etc.
 * 
 * - canAssign() [in type-promotions.cjs]: Loose compatibility - allows int→float
 *   Used for assignments, comparisons, etc.
 * 
 */

// Type constants: immutable by design to prevent accidental corruption.
// These are sentinels used throughout the type checking system.
const INT = Object.freeze({ baseType: 'int', dimensions: Object.freeze([]) });
const FLOAT = Object.freeze({ baseType: 'float', dimensions: Object.freeze([]) });
const BOOL = Object.freeze({ baseType: 'bool', dimensions: Object.freeze([]) });
const CHAR = Object.freeze({ baseType: 'char', dimensions: Object.freeze([]) });
const ERROR_TYPE = Object.freeze({ baseType: 'ERROR_TYPE', dimensions: Object.freeze([]) });

/* fill here */

module.exports = {
    INT,
    FLOAT,
    BOOL,
    CHAR,
    ERROR_TYPE,
    sameType,
    makeArrayType,
    isNumeric,
    isScalarNumeric,
    isScalar,
    isComparable,
    isErrorType,
    typeToString
};