const { dragonArrayTypeToLLVM } = require('./type-helpers.cjs');
const { isCharScalar } = require('./emit-helpers.cjs');
const {
    setNodeValue,
    getNodeValue,
    assertNodeValueHasValue,
    assertNodeValueHasAddress,
} = require('./node-value.cjs');

// True if the last emited is a branch or return instruction, false otherwise
function lastEmittedIsBranchOrReturn(emitedCode) {
    if (emitedCode.length === 0) return false;
    const lastLine = emitedCode[emitedCode.length - 1];
    return /\bbr\b|\bret\b/.test(lastLine); // We only emit br and ret as control flow terminators, so this is sufficient for our purposes
}

function buildCode(...codeSegments) {
    return codeSegments.flat();
}

const ARITH_OPS = {
    '+': { int: 'add', float: 'fadd' },
    '-': { int: 'sub', float: 'fsub' },
    '*': { int: 'mul', float: 'fmul' },
    '/': { int: 'sdiv', float: 'fdiv' }
};

function arithHandler(op) {
    return (left, right, leftType, rightType, ctx, node, nodeValues) => {
        /* fill here */
        const llvmOp = ARITH_OPS[op][resultIsFloat ? 'float' : 'int'];
        const resultTmp = ctx.nextTemp();
        ctx.emit(/* fill here */);
        setNodeValue(nodeValues, node, {
            value: /* fill here */,
            type: /* fill here */,
            endIdx: ctx.emitedCode.length
        });
    };
}

// Logical handler factorization (&&, ||)
function logicHandler(op) {
    return (left, right, leftType, rightType, ctx, node, nodeValues) => {
        /* fill here */
    };
}

// Comparison handler factorization (<, >, <=, >=, ==, !=)
function comparablesHandler(floatOp, intOp) {
    return (left, right, leftType, rightType, ctx, node, nodeValues) => {
        const leftIsFloat = leftType.baseType === 'float';
        const rightIsFloat = rightType.baseType === 'float';
        const compareAsFloat = leftIsFloat || rightIsFloat;
        let leftValue = left.value;
        let rightValue = right.value;
        if (compareAsFloat && leftType.baseType === 'int') {
            const castTmp = ctx.nextTemp();
            ctx.emit(`  ${castTmp} = sitofp i32 ${leftValue} to double`);
            leftValue = castTmp;
        }
        if (compareAsFloat && rightType.baseType === 'int') {
            const castTmp = ctx.nextTemp();
            ctx.emit(`  ${castTmp} = sitofp i32 ${rightValue} to double`);
            rightValue = castTmp;
        }
        const op = compareAsFloat
            ? `fcmp ${floatOp} double`
            : `icmp ${intOp} i32`;
        const resultTmp = ctx.nextTemp();
        ctx.emit(`  ${resultTmp} = ${op} ${leftValue}, ${rightValue}`);
        const resultType = node._type || { baseType: 'bool', dimensions: [] };
        setNodeValue(nodeValues, node, {
            value: resultTmp,
            type: resultType,
            endIdx: ctx.emitedCode.length
        });
    };
}

function toStringLLVM(val, type, helpers, ctx) {
    if (helpers.isCharScalar(type)) return val;
    if (type.baseType === 'bool') {
        return boolToGlobalString(ctx, val);
    }
    const buf = helpers.emit.emitMalloc(ctx, 32);
    let fmt;
    if (type.baseType === 'int') fmt = '@.str.i32.noline';
    else if (type.baseType === 'float') fmt = '@.str.double.noline';
    else fmt = '@.str.i32.noline';
    const fmtPtr = helpers.emit.emitGEPString(ctx, fmt, 3);
    ctx.emit(`  call i32 (i8*, i8*,...) @sprintf(i8* ${buf}, i8* ${fmtPtr}, ${helpers.dragonTypeToLLVM(type)} ${val})`);
    return buf;
}

// Dispatch table for binary operators
const BINARY_OPS = {
    '+': (left, right, leftType, rightType, ctx, node, nodeValues, helpers) => {
        // Special sum for strings/chars
        if (helpers.isCharScalar(leftType) || helpers.isCharScalar(rightType)) {
            const leftStr = toStringLLVM(left.value, leftType, helpers, ctx);
            const rightStr = toStringLLVM(right.value, rightType, helpers, ctx);
            const lenLeft = helpers.emit.emitStrlen(ctx, leftStr);
            const lenRight = helpers.emit.emitStrlen(ctx, rightStr);
            const totalLen = ctx.nextTemp();
            ctx.emit(`  ${totalLen} = add i64 ${lenLeft}, ${lenRight}`);
            const totalLen1 = ctx.nextTemp();
            ctx.emit(`  ${totalLen1} = add i64 ${totalLen}, 1`);
            const buf = helpers.emit.emitMalloc(ctx, totalLen1);
            helpers.emit.emitStrcpy(ctx, buf, leftStr);
            helpers.emit.emitStrcat(ctx, buf, rightStr);
            setNodeValue(nodeValues, node, {
                value: buf,
                type: node._type || { baseType: 'char', dimensions: [] },
                endIdx: ctx.emitedCode.length
            });
            return;
        }
        // Regular sum
        arithHandler('+')(left, right, leftType, rightType, ctx, node, nodeValues);
    },
    '-': arithHandler('-'),
    '*': arithHandler('*'),
    '/': arithHandler('/'),

    '&&': logicHandler('and'),
    '||': logicHandler('or'),

    '<': comparablesHandler('olt', 'slt'),
    '>': comparablesHandler('ogt', 'sgt'),
    '<=': comparablesHandler('ole', 'sle'),
    '>=': comparablesHandler('oge', 'sge'),
    '==': comparablesHandler('oeq', 'eq'),
    '!=': comparablesHandler('one', 'ne'),

};

// Dispatch table for unary operators
const UNARY_OPS = {
    '!': (arg, ctx) => {
        /* fill here */
    },
    '-': (arg, ctx) => {
        /* fill here */
    }
};

/**
 * Converts an LLVM boolean value (i1) to a pointer to the global "true"/"false" string (i8*)
 * Returns the temporary name holding the string pointer.
 */
function boolToGlobalString(ctx, boolValue) {
    const promotedBool = ctx.nextTemp();
    ctx.emit(/* fill here */);
    const boolPtr = ctx.nextTemp();
    ctx.emit(/* fill here */);
    const boolStr = ctx.nextTemp();
    ctx.emit(/* fill here */);
    return boolStr;
}

/**
 * Handles BinaryExpression nodes for LLVM IR codegen.
 * Supports char/int/float addition, logical operations, and comparisons.
 * Extracted from main.cjs for modularity and reuse.
 */
function visitBinaryExpression(path, ctx, nodeValues, { isCharScalar, emit, dragonTypeToLLVM }) {
    const node = path.node;
    const left = getNodeValue(nodeValues, node.left);
    const right = getNodeValue(nodeValues, node.right);
    if (!left || !right) return; //throw
    // Refactor: prioritize node.left._type and node.right._type as the type source
    const leftType = node.left._type || left.type;
    const rightType = node.right._type || right.type;
    if (!leftType || !rightType) return; // throw
    const handler = BINARY_OPS[node.operator];
    if (!handler) return;
    handler(left, right, leftType, rightType, ctx, node, nodeValues, { isCharScalar, emit, dragonTypeToLLVM });
    path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx')));
}

/**
 * Handles WhileStatement nodes for LLVM IR codegen.
 * Emits control flow with conditional and unconditional branches.
 * Step-by-step, pedagogical comments included.
 */
function visitWhileStatement(path, ctx, nodeValues) {
    const node = path.node;
    // Retrieve labels and startIdx from the path
    const condLabel = path.getData('condLabel');
    const bodyLabel = path.getData('bodyLabel');
    const endLabel = path.getData('endLabel');
    const startIdx = path.getData('startIdx');
    const bodyStartIdx = path.get("body").getData('startIdx');

    const codeBeforeWhile = ctx.emitedCode.slice(0, startIdx);
    
    // After traverse, code for cond+body is now in emitedCode[startIdx:]
    // Find split point: all code for node.test comes first, then node.body
    const condVal = getNodeValue(nodeValues, node.test);

    if (!condVal) return; 

    const condCode = path.get('test').getData('emitedCode');
    const bodyCode = path.get('body').getData('emitedCode');

    /* Rebuild code buffer!  */
    const whileCode = buildCode(
      `${condLabel}:`,
         condCode,
      `  br i1 ${condVal.value}, label %${bodyLabel}, label %${endLabel}`,
      `${bodyLabel}:`,
          bodyCode,
       `  br label %${condLabel}`,
      `${endLabel}:`
    )
    // If the code before the while loop did not emit a branch to the condition, add it now to make it a correct basic block. 
    if (!lastEmittedIsBranchOrReturn(codeBeforeWhile)) {
        whileCode.unshift(`  br label %${condLabel}`);
    }
    
    ctx.emitedCode = buildCode(codeBeforeWhile, whileCode);

    // Save the code for this node in the path
    path.setData('emitedCode', whileCode);
}

function visitDoWhileStatement(path, ctx, nodeValues) {
   /* fill here */
}

function visitIfStatement(path, ctx, nodeValues, { dragonTypeToLLVM }) {
    /* fill here */  
}

/**
 * Handles CallExpression nodes for LLVM IR codegen.
 * Supports print and console.log, including type promotion and format string selection.
 * 
 */
function resolveCallArg(ctx, argNodeVal, helpers) {
    /* fill here */}

function visitCallExpression(path, ctx, nodeValues, helpers) {
    const node = path.node;
    const arg  = node.arguments[0];
    const argNodeVal = getNodeValue(nodeValues, arg);
    if (!argNodeVal) return;

    const { value, llvmType, formatStr } = resolveCallArg(ctx, argNodeVal, helpers);
    const fmtPtr   = helpers.emit.emitGEPString(ctx, formatStr, 4);
    const resultReg = helpers.emit.emitPrintf(ctx, fmtPtr, value, llvmType);
    setNodeValue(nodeValues, node, { // Since printf returns int and we are patching the console.log AST
        value: /* fill here */ 
        type: /* fill here */, 
        endIdx: ctx.emitedCode.length 
    });
}

// Helper to visit MemberExpression (array and multidimensional access)
function visitMemberExpression(path, ctx, nodeValues) {
    const node = path.node;
    // 1. Only process indexed expressions (a[i], matrix[x][y])
    if (!node.computed) return; // Array.from ... intialization

    // 2. Get the value of the index
    const index = getNodeValue(nodeValues, node.property);
    if (!index) return;
    assertNodeValueHasValue(index, 'MemberExpression index');

    // 3. Locate the address and type of the container array
    let containerAddress;
    let containerType;
    if (node.object.type === 'Identifier') {
        // 3a. Direct access to variable
        const entry = node.object._symbolEntry;
        if (!entry || !entry.address || !entry.type) return;
        containerAddress = entry.address; 
        containerType = entry.type;
    } else {
        // 3b. Nested access (matrix[x][y])
        const objectVal = getNodeValue(nodeValues, node.object);
        if (!objectVal || !objectVal.address || !objectVal.type) return;
        assertNodeValueHasAddress(objectVal, 'nested MemberExpression object');
        containerAddress = objectVal.address;
        containerType = objectVal.type;
    }

    // 4. If the container is not an array, exit
    if (!containerType.dimensions || containerType.dimensions.length === 0) return;

    // 5. Compute the result type (accessed element)
    const resultType = node._type /* || { baseType: containerType.baseType, dimensions: containerType.dimensions.slice(1) } */;

    // 6. LLVM types
    const containerLLVMType = dragonArrayTypeToLLVM(containerType);
    const resultLLVMType = dragonArrayTypeToLLVM(resultType);

    // 7. Extend the index to i64
    const indexI64 = ctx.nextTemp();
    ctx.emit(`  ${indexI64} = sext i32 ${index.value} to i64`);

    // 8. Compute the pointer to the element
    const elementPtr = ctx.nextTemp();
    ctx.emit(`  ${elementPtr} = getelementptr inbounds ${containerLLVMType}, ${containerLLVMType}* ${containerAddress}, i64 0, i64 ${indexI64}`);

    // 9. If not part of an assignment or nested access, load the value
    const parent = path.parent;
    if (!isAssignmentTarget(node, parent) &&
        !isContainerForNestedIndex(node, parent) &&
        (!resultType.dimensions || resultType.dimensions.length === 0)) {
        const loaded = ctx.nextTemp();
        ctx.emit(`  ${loaded} = load ${resultLLVMType}, ${resultLLVMType}* ${elementPtr}`);
        setNodeValue(nodeValues, node, {
            value: loaded,
            address: elementPtr,
            type: resultType|| node._type,
            endIdx: ctx.emitedCode.length
        });
        return;
    }

    // 10. If part of an assignment or nested access, only store the address
    setNodeValue(nodeValues, node, {
        address: elementPtr,
        type: resultType || node._type,
        endIdx: ctx.emitedCode.length
    });
}

/**
 * Handles AssignmentExpression nodes for LLVM IR codegen.
 * Supports assignment to identifiers and array elements, including char scalars.
 * Step-by-step, pedagogical comments included.
 */
function visitAssignmentExpression(path, ctx, nodeValues, helpers) {
    const node = path.node;
    if (node.operator !== '=') return;
    const right = getNodeValue(nodeValues, node.right);
    if (!right) return;
    assertNodeValueHasValue(right, 'AssignmentExpression right side');

    // 1. Assignment to variable (Identifier)
    if (node.left && node.left.type === 'Identifier') {
        const entry = node.left._symbolEntry;
        if (!entry || !entry.address || !entry.type) return;
           /* fill here */




        return;
    }

    // 2. Assignment to array element (MemberExpression)
    if (node.left && node.left.type === 'MemberExpression' && node.left.computed) {
        const left = getNodeValue(nodeValues, node.left);
        if (!left || !left.type) return;
        assertNodeValueHasAddress(left, 'AssignmentExpression left MemberExpression');
        const llvmType = helpers.dragonTypeToLLVM(left.type);
        const coerced = helpers.coerceValueForStore(ctx, left.type, right.value, right.type || node.right._type);
        ctx.emit(`  store ${llvmType} ${coerced.value}, ${llvmType}* ${left.address}`);
        setNodeValue(nodeValues, node, {
            value: coerced.value,
            type: left.type || node.left._type,
            endIdx: ctx.emitedCode.length
        });
    }
}

// Helpers for identifier analysis in the AST
function isDeclarationId(node, parent) {
    return parent && parent.type === 'VariableDeclarator' && parent.id === node;
}
function isAssignmentTarget(node, parent) {
    return parent && parent.type === 'AssignmentExpression' && parent.left === node;
}
function isMemberProperty(node, parent) {
    return parent && parent.type === 'MemberExpression' && parent.property === node && !parent.computed;
}
function isMemberObject(node, parent) {
    return parent && parent.type === 'MemberExpression' && parent.object === node;
}

function isContainerForNestedIndex(node, parent) {
    return parent && parent.type === 'MemberExpression' && parent.object === node;
}

module.exports = {
    visitMemberExpression,
    visitBinaryExpression,
    visitCallExpression,

    visitAssignmentExpression,
    visitDoWhileStatement,
    visitWhileStatement,
    visitIfStatement,

    isDeclarationId,
    isAssignmentTarget,
    isMemberProperty,
    isMemberObject,

    // Operator dispatch helpers for the visitor at llvm/main.cjs
    UNARY_OPS,
};
