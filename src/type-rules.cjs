// type-rules.cjs
const binaryRules = {

    '+': { kind: 'additive' },
    
    '-': { kind: 'numeric' },
    '*': { kind: 'numeric' },
    '/': { kind: 'numeric' },

    '<': { kind: 'comparable', result: 'bool' },
    '>': { kind: 'comparable', result: 'bool' },
    '<=': { kind: 'comparable', result: 'bool' },
    '>=': { kind: 'comparable', result: 'bool' },

    // Equality category: allows scalar equality and array equality with extra guards in type-check.cjs
    '==': { kind: 'equality', result: 'bool' },
    '!=': { kind: 'equality', result: 'bool' },

    '&&': { kind: 'boolean', result: 'bool' },
    '||': { kind: 'boolean', result: 'bool' }
};

module.exports = {
    binaryRules
};