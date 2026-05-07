// Funciones auxiliares para tipos y formatos LLVM

function dragonTypeToLLVM(dragonType) {
    /* fill here */
}

function dragonArrayTypeToLLVM(dragonType) {
    /* fill here */
}

function getFormatStringConst(dragonType) {
    /* fill here */
}


function generateModuleStub(sourceFile) {
	return `
    /* fill here */
`;
}

// Emits code to coerce an i32 value to double if the target type is float
function coerceValueForStore(ctx, targetType, sourceValue, sourceType) {
	if (targetType.baseType === 'float' && sourceType.baseType === 'int') {
		const castTmp = ctx.nextTemp();
		/* fill here */
		return { value: castTmp, type: { baseType: 'float', dimensions: [] } };
	}
	return { value: sourceValue, type: sourceType };
}

module.exports = {
    coerceValueForStore,
    dragonTypeToLLVM,
    dragonArrayTypeToLLVM,
    getFormatStringConst,
    generateModuleStub
};