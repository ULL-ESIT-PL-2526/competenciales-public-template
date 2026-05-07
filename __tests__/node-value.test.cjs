const {
    NodeValue,
    setNodeValue,
    getNodeValue,
    assertNodeValueHasValue,
    assertNodeValueHasAddress,
} = require('../src/llvm/node-value.cjs');
const { visitAssignmentExpression } = require('../src/llvm/visitor-helpers.cjs');

describe('NodeValue invariants', () => {
    test('rejects payload without value or address', () => {
        expect(() => new NodeValue({ type: { baseType: 'int', dimensions: [] } })).toThrow(
            'NodeValue requires at least one of: value or address'
        );
    });

    test('accepts r-value only entries', () => {
        const nv = new NodeValue({ value: '%tmp1', type: { baseType: 'int', dimensions: [] } });
        expect(nv.hasValue).toBe(true);
        expect(nv.hasAddress).toBe(false);
    });

    test('accepts l-value address only entries', () => {
        const nv = new NodeValue({ address: '%elt.ptr', type: { baseType: 'int', dimensions: [] } });
        expect(nv.hasValue).toBe(false);
        expect(nv.hasAddress).toBe(true);
    });

    test('assertNodeValueHasValue fails when value is missing', () => {
        const nv = new NodeValue({ address: '%elt.ptr', type: { baseType: 'int', dimensions: [] } });
        expect(() => assertNodeValueHasValue(nv, 'test-right')).toThrow(
            'Expected value in NodeValue for test-right'
        );
    });

    test('assertNodeValueHasAddress fails when address is missing', () => {
        const nv = new NodeValue({ value: '%tmp1', type: { baseType: 'int', dimensions: [] } });
        expect(() => assertNodeValueHasAddress(nv, 'test-left')).toThrow(
            'Expected address in NodeValue for test-left'
        );
    });

    test('getNodeValue normalizes legacy plain-object map entries', () => {
        const nodeValues = new Map();
        const fakeNode = { type: 'Identifier', name: 'x' };

        nodeValues.set(fakeNode, { value: '%tmp2', type: { baseType: 'int', dimensions: [] } });
        const normalized = getNodeValue(nodeValues, fakeNode);

        expect(normalized).toBeInstanceOf(NodeValue);
        expect(nodeValues.get(fakeNode)).toBe(normalized);
        expect(normalized.value).toBe('%tmp2');
    });

    test('setNodeValue stores NodeValue instances', () => {
        const nodeValues = new Map();
        const fakeNode = { type: 'NumericLiteral', value: 1 };

        const stored = setNodeValue(nodeValues, fakeNode, {
            value: '1',
            type: { baseType: 'int', dimensions: [] },
            isLiteral: true,
        });

        expect(stored).toBeInstanceOf(NodeValue);
        expect(nodeValues.get(fakeNode)).toBe(stored);
        expect(stored.isLiteral).toBe(true);
    });

    test('AssignmentExpression to MemberExpression fails early if left NodeValue has no address', () => {
        const memberNode = { type: 'MemberExpression', computed: true };
        const rightNode = { type: 'NumericLiteral', value: 7, _type: { baseType: 'int', dimensions: [] } };
        const assignNode = {
            type: 'AssignmentExpression',
            operator: '=',
            left: memberNode,
            right: rightNode,
        };

        const path = { node: assignNode };
        const ctx = {
            emitedCode: [],
            emit(line) {
                this.emitedCode.push(line);
            },
        };
        const nodeValues = new Map();

        setNodeValue(nodeValues, rightNode, {
            value: '7',
            type: { baseType: 'int', dimensions: [] },
        });
        setNodeValue(nodeValues, memberNode, {
            value: '%tmp.member.loaded',
            type: { baseType: 'int', dimensions: [] },
            // Intentionally missing address.
        });

        const helpers = {
            coerceValueForStore: (_ctx, _targetType, value) => ({ value }),
            dragonTypeToLLVM: () => 'i32',
        };

        expect(() => visitAssignmentExpression(path, ctx, nodeValues, helpers)).toThrow(
            'Expected address in NodeValue for AssignmentExpression left MemberExpression'
        );
    });
});
