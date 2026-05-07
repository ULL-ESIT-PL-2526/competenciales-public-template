const traverse = require('@babel/traverse').default;
const CodegenContext = require('./context.cjs');
const { generateModuleStub, coerceValueForStore, dragonTypeToLLVM, dragonArrayTypeToLLVM, getFormatStringConst } = require('./type-helpers.cjs');
const { 
    visitIfStatement,
    visitBinaryExpression, 
    visitWhileStatement, 
    visitDoWhileStatement,
    visitMemberExpression, 
    visitAssignmentExpression, 
    visitCallExpression } = require('./visitor-helpers.cjs');

const { escapeLLVMString } = require('./string-helpers.cjs');
const emit = require('./emit-helpers.cjs');
const { isCharScalar } = require('./emit-helpers.cjs');
const { setNodeValue, getNodeValue } = require('./node-value.cjs');
const { isDeclarationId, isAssignmentTarget, isMemberProperty, isMemberObject } = require('./visitor-helpers.cjs');
const { UNARY_OPS } = require(/* fill here */);

function generateIR(ast, options = {}, source, sourceFile) {
    const ctx = new CodegenContext();
    const nodeValues = new Map();
    const visitors = {
        StringLiteral: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                /* fill here */
                path.setData('emitedCode', ctx.emitedCode.slice(startIdx));
            }
        },
        // Refactor: Estrategias para VariableDeclarator
        VariableDeclarator: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                const node = path.node;
                if (!node.id || node.id.type !== 'Identifier') return;
                const dragonName = node.id.name;
                let varType = node.id._type;  // Assuming in type analysis time we set the variable declarator node's _type to the variable's type, this would be the most direct way to get it during codegen
                if (!varType) return;
                const address = ctx.nextAllocaName(dragonName);

                // Estrategias de inicialización
                const DECLARATOR_STRATEGIES = {
                    array: (ctx, address, varType) => {
                        const llvmArrayType = dragonArrayTypeToLLVM(varType);
                        ctx.emit(`  ${address} = alloca ${llvmArrayType}`);
                        ctx.setAddress(address, node.id);
                        const ptrTmp = ctx.nextTemp();
                        // Compute the total byte size of the array for memset
                        const byteSize = varType.dimensions.reduce((acc, d) => acc * d, 1) * (varType.baseType === 'float' ? 8 : varType.baseType === 'int' ? 4 : varType.baseType === 'bool' ? 1 : 1);
                        ctx.emit(`  ${ptrTmp} = bitcast ${llvmArrayType}* ${address} to i8*`); 
                        // bitcast converts the array pointer to a byte pointer, which is necessary because memset works with bytes, not integers
                        ctx.emit(`  call void @llvm.memset.p0i8.i64(i8* ${ptrTmp}, i8 0, i64 ${byteSize}, i1 false)`); // zero-initialize the entire array
                    },
                    char: (ctx, address) => {
                        const llvmType = 'i8*';
                        ctx.emit(`  ${address} = alloca ${llvmType}`);
                        ctx.setAddress(address, node.id);
                        const emptyStrPtr = ctx.nextTemp();
                        ctx.emit(`  ${emptyStrPtr} = getelementptr inbounds [1 x i8], [1 x i8]* @.str.empty, i64 0, i64 0`);
                        ctx.emit(`  store i8* ${emptyStrPtr}, i8** ${address}`);
                    },
                    scalar: (ctx, address, varType, initValue) => {
                        /* fill here */
                    }
                };

                function resolveStrategy(varType) {
                    if (varType.dimensions?.length > 0) return 'array';
                    if (isCharScalar(varType)) return 'char';
                    return 'scalar';
                }

                const strategy = resolveStrategy(varType);
                const initValue = node.init ? getNodeValue(nodeValues, node.init) : null;
                DECLARATOR_STRATEGIES[strategy](ctx, address, varType, initValue);
                path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx')));
            }
        },
        NumericLiteral: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                const node = path.node;
                const value = node.value;
                let type = node._type;
                if (!type) { return; }  

                /* fill here */
            }
        },
        Identifier: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                const node = path.node;
                const parent = path.parent;

                // Avoid loading the value for identifiers that are being declared, assigned to, or accessed as member properties/objects
                if (
                    isDeclarationId(node, parent) ||
                    isAssignmentTarget(node, parent) ||
                    isMemberProperty(node, parent) ||
                    isMemberObject(node, parent)
                ) return;

                /* fill here */
            }
        },
        MemberExpression: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                visitMemberExpression(path, ctx, nodeValues);
            }
        },
        BooleanLiteral: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                /* fill here */
            }
        },
        UnaryExpression: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                const node = path.node;
                const arg = getNodeValue(nodeValues, node.argument);
                if (!arg) return;
                const handler = UNARY_OPS[node.operator];
                const handlerResult = handler(arg, ctx);
                setNodeValue(nodeValues, node, {
                    value: '/* fill here */',
                    type: node._type,  
                    startIdx: path.getData('startIdx'), 
                    endIdx: ctx.emitedCode.length 
                });
                path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx')));
            }
        },
        BinaryExpression: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                visitBinaryExpression(path, ctx, nodeValues, { isCharScalar, emit, dragonTypeToLLVM });
                path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx')));
            }
        },
        AssignmentExpression: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                visitAssignmentExpression(path, ctx, nodeValues, { coerceValueForStore, dragonTypeToLLVM });
                path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx')));
            }
        },
        CallExpression: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                if (path.node.callee?.object?.name !== 'console') return;
                visitCallExpression(path, ctx, nodeValues, { dragonTypeToLLVM, getFormatStringConst, emit });
                path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx')));
            }
        },
        ExpressionStatement: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx')));
            }
        },
        WhileStatement: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);

                const condLabel = ctx.nextLabel('while.cond');
                const bodyLabel = ctx.nextLabel('while.body');
                const endLabel = ctx.nextLabel('while.end');

                path.setData('condLabel', condLabel);
                path.setData('bodyLabel', bodyLabel);
                path.setData('endLabel', endLabel);
            },
            exit(path) {
                visitWhileStatement(path, ctx, nodeValues, { dragonTypeToLLVM });
            }
        },
        DoWhileStatement: {
            enter(path) {
                /* fill here */
            },
            exit(path) {
                visitDoWhileStatement(path, ctx, nodeValues, { dragonTypeToLLVM, isDoWhile: true });
            }
        },
        IfStatement: {
            enter(path) {
                /* fill here */
            },
            exit(path) {
                visitIfStatement(path, ctx, nodeValues, { dragonTypeToLLVM });
                path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx')));
            }
        },
        BlockStatement: {
            enter(path) {
                const startIdx = ctx.emitedCode.length;
                path.setData('startIdx', startIdx);
            },
            exit(path) {
                path.setData('emitedCode', ctx.emitedCode.slice(path.getData('startIdx')));
            }
        }
    };
    traverse(ast, { noScope: true, ...visitors });
    const preamble = generateModuleStub(sourceFile);
    const globals = ctx.globals.length ? ctx.globals.join('\n') + '\n' : '';
    const mainFunc = `\ndefine i32 @main() {\n${ctx.getCode()}\n  ret i32 0\n}\n`;
    return {
        code: preamble + globals + mainFunc,
        map: null
    };
}

module.exports = {
    generateIR
};
