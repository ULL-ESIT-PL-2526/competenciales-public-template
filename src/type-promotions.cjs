// type-promotions.js

const { INT, FLOAT, makeArrayType } = require('./types.cjs');

/*
    promotionTable is the shared “base promotion matrix” for assignment 
    compatibility, and generic numeric result typing.
*/
const promotionTable = {
  // fill here
};

const comparablePromotionTable = {
  // fill here
};

const additivePromotionTable = {
    // fill here
};

function resultType(a, b) {
  // fill here
}

function canAssign(target, source) {
  // fill here
}

function promoteComparable(left, right) {
    // fill here
}

function promoteAdditive(left, right) {
    // fill here
}

module.exports = {
    resultType,
    canAssign,
    promoteComparable,
    promoteAdditive,

    // Tables are exported for testing purposes
    promotionTable,
    comparablePromotionTable,
    additivePromotionTable
};