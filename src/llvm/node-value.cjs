class NodeValue {
    constructor({ value, type, address, isLiteral = false, startIdx, endIdx } = {}) {
        // A node may carry an r-value (`value`), an l-value address (`address`), or both.
        if (value === undefined && address === undefined) {
            throw new TypeError('NodeValue requires at least one of: value or address');
        }
        if (type !== undefined && type !== null && typeof type !== 'object') {
            throw new TypeError('NodeValue.type must be an object when provided');
        }
        if (startIdx !== undefined && startIdx !== null && !Number.isInteger(startIdx)) {
            throw new TypeError('NodeValue.startIdx must be an integer when provided');
        }
        if (endIdx !== undefined && endIdx !== null && !Number.isInteger(endIdx)) {
            throw new TypeError('NodeValue.endIdx must be an integer when provided');
        }

        // Control-flow labels are tracked via path.setData/path.getData, not in NodeValue.
        this.value = value; // r-value: immediate constant or LLVM temporary register
        this.type = type;
          this.address = address; // l-value address, e.g. pointer from getelementptr for array element assignment
          this.isLiteral = Boolean(isLiteral);
          this.startIdx = startIdx; // start index in emitted code buffer for this node
          this.endIdx = endIdx; // end index in emitted code buffer for this node
    }

    get hasValue() {
        return this.value !== undefined;
    }

    get hasAddress() {
        return this.address !== undefined;
    }

    static create(payload = {}) {
        return payload instanceof NodeValue ? payload : new NodeValue(payload);
    }
}

function assertNodeValueHasValue(nodeValue, context = 'node') {
    if (!nodeValue || !nodeValue.hasValue) {
        throw new TypeError(`Expected value in NodeValue for ${context}`);
    }
    return nodeValue;
}

function assertNodeValueHasAddress(nodeValue, context = 'node') {
    if (!nodeValue || !nodeValue.hasAddress) {
        throw new TypeError(`Expected address in NodeValue for ${context}`);
    }
    return nodeValue;
}

function setNodeValue(nodeValues, node, payload) {
    const nodeValue = NodeValue.create(payload);
    nodeValues.set(node, nodeValue);
    return nodeValue;
}

function getNodeValue(nodeValues, node) {
    const stored = nodeValues.get(node);
    if (!stored) return null;
    if (stored instanceof NodeValue) return stored;

    const normalized = NodeValue.create(stored);
    nodeValues.set(node, normalized);
    return normalized;
}

module.exports = {
    NodeValue,
    setNodeValue,
    getNodeValue,
    assertNodeValueHasValue,
    assertNodeValueHasAddress,
};