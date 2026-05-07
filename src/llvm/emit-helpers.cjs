// Helpers para emitir instrucciones LLVM IR comunes y evitar duplicación
// No hay requires locales, solo module.exports

function isCharScalar(type) {
    /* fill here */
}

function emitStrcpy(ctx, dest, src) {
    /* fill here */
}

function emitStrcat(ctx, dest, src) {
    /* fill here */
}

function emitMalloc(ctx, size) {
    /* fill here */
}

function emitStrlen(ctx, ptr) {
    /* fill here */
}

function emitGEPString(ctx, globalName, len) {
    /* fill here */ 
}

function emitPrintf(ctx, fmtPtr, value, valueType) {
    /* fill here */
}

module.exports = {
    isCharScalar,
    emitStrcpy,
    emitStrcat,
    emitMalloc,
    emitStrlen,
    emitGEPString,
    emitPrintf,
};
