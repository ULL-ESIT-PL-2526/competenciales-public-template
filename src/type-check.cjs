// type-check.cjs

const traverse = require('@babel/traverse').default;
const { INT, FLOAT, BOOL, CHAR, ERROR_TYPE, isNumeric, isScalarNumeric, isScalar, isComparable, isErrorType, sameType, typeToString } = require('./types.cjs');
const { resultType, canAssign, promoteComparable, promoteAdditive } = require('./type-promotions.cjs');
const { binaryRules } = require('./type-rules.cjs');
const { createError } = require('./error-builder.cjs');

class TypeChecker {

    constructor(ast) {
        this.ast = ast;
        this.errors = [];
    }

    error(node, msg) {
        const error = createError(msg, node.loc, 'Type');
        this.errors.push(error);
    }

    literalType(path) {
       /* fill here */
    }

    stringLiteralType(path) {
       /* fill here */
    }

    identifierType(path) {
        /* fill here */
    }

    variableDecl(path) {

        let node = path.node;
        const t = node.typeNode;
        node._type = t;
    }

    assignmentType(path) {
      /* fill here */
    }

    unaryType(path) {
       /* fill here */
    }

    binaryType(path) {
        /* fill here */
    }

    memberType(path) {

    /* fill here */
    }

    // Shared type checking logic for if/while/do-while conditions
    statementType(path) {
        /* fill here */
    }

}

/**
 * 
 * @param {*}   - The ast as decorated by scope analysis. It should have symbol entries for all identifiers.
 * @returns any - The AST decorated with type information and any type errors found during checking.
 */
function typeCheck(ast) {

    const checker = new TypeChecker(ast);

    // Use Babel traversal with noScope because Dragon has its own scope model.
    // Use exit (post-order) so children are typed before parents consume node._type.
    traverse(ast, {
        noScope: true,
        NumericLiteral: {
            exit(path) {
                checker.literalType(path);
            }
        },
        /* fill here */
    });

    ast._typeErrors = checker.errors;

    return ast;
}

module.exports = {
    typeCheck,
    TypeChecker
};