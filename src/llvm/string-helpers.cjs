// Funciones auxiliares para manejo de strings y literales LLVM

function escapeLLVMString(str) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\0A')
        .replace(/\r/g, '\\0D')
        .replace(/\t/g, '\\09')
        .replace(/\0/g, '\\00')
        .replace(/\"/g, '\\22')
        .replace(/\'/g, '\\27');
}

module.exports = {
    escapeLLVMString
};