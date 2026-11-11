import { describe, it, expect } from 'vitest';
import { CircuitSimulator } from '../engines/circuit/simulator';
import { createComponent } from '../engines/circuit/generator';
import { WireConnection } from '../types';

describe('Circuit Simulator - Basic Logic Gates Truth Tables', () => {
  it('verifies AND gate truth table (00->0, 01->0, 10->0, 11->1)', () => {
    const swA = createComponent('SWITCH', 0, 0, 'A');
    const swB = createComponent('SWITCH', 0, 50, 'B');
    const andGate = createComponent('AND', 100, 0, 'AND');

    const wires: WireConnection[] = [
      { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: andGate.id, toPinId: andGate.inputs[0].id, value: 0 },
      { id: 'w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: andGate.id, toPinId: andGate.inputs[1].id, value: 0 },
    ];

    const cases = [
      { a: 0, b: 0, expected: 0 },
      { a: 0, b: 1, expected: 0 },
      { a: 1, b: 0, expected: 0 },
      { a: 1, b: 1, expected: 1 },
    ];

    for (const c of cases) {
      swA.state = { switchActive: c.a === 1 };
      swB.state = { switchActive: c.b === 1 };
      const res = CircuitSimulator.step([swA, swB, andGate], wires, false);
      const evaluatedGate = res.components.find((comp) => comp.id === andGate.id);
      expect(evaluatedGate?.outputs[0].value).toBe(c.expected);
    }
  });

  it('verifies OR gate truth table (00->0, 01->1, 10->1, 11->1)', () => {
    const swA = createComponent('SWITCH', 0, 0, 'A');
    const swB = createComponent('SWITCH', 0, 50, 'B');
    const orGate = createComponent('OR', 100, 0, 'OR');

    const wires: WireConnection[] = [
      { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: orGate.id, toPinId: orGate.inputs[0].id, value: 0 },
      { id: 'w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: orGate.id, toPinId: orGate.inputs[1].id, value: 0 },
    ];

    const cases = [
      { a: 0, b: 0, expected: 0 },
      { a: 0, b: 1, expected: 1 },
      { a: 1, b: 0, expected: 1 },
      { a: 1, b: 1, expected: 1 },
    ];

    for (const c of cases) {
      swA.state = { switchActive: c.a === 1 };
      swB.state = { switchActive: c.b === 1 };
      const res = CircuitSimulator.step([swA, swB, orGate], wires, false);
      const evaluatedGate = res.components.find((comp) => comp.id === orGate.id);
      expect(evaluatedGate?.outputs[0].value).toBe(c.expected);
    }
  });

  it('verifies NOT gate inversion (0->1, 1->0)', () => {
    const swA = createComponent('SWITCH', 0, 0, 'A');
    const notGate = createComponent('NOT', 100, 0, 'NOT');
    const wires: WireConnection[] = [
      { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: notGate.id, toPinId: notGate.inputs[0].id, value: 0 },
    ];

    swA.state = { switchActive: false };
    let res = CircuitSimulator.step([swA, notGate], wires, false);
    expect(res.components.find((c) => c.id === notGate.id)?.outputs[0].value).toBe(1);

    swA.state = { switchActive: true };
    res = CircuitSimulator.step([swA, notGate], wires, false);
    expect(res.components.find((c) => c.id === notGate.id)?.outputs[0].value).toBe(0);
  });

  it('verifies XOR gate (00->0, 01->1, 10->1, 11->0)', () => {
    const swA = createComponent('SWITCH', 0, 0, 'A');
    const swB = createComponent('SWITCH', 0, 50, 'B');
    const xorGate = createComponent('XOR', 100, 0, 'XOR');

    const wires: WireConnection[] = [
      { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: xorGate.id, toPinId: xorGate.inputs[0].id, value: 0 },
      { id: 'w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: xorGate.id, toPinId: xorGate.inputs[1].id, value: 0 },
    ];

    const cases = [
      { a: 0, b: 0, expected: 0 },
      { a: 0, b: 1, expected: 1 },
      { a: 1, b: 0, expected: 1 },
      { a: 1, b: 1, expected: 0 },
    ];

    for (const c of cases) {
      swA.state = { switchActive: c.a === 1 };
      swB.state = { switchActive: c.b === 1 };
      const res = CircuitSimulator.step([swA, swB, xorGate], wires, false);
      const evaluatedGate = res.components.find((comp) => comp.id === xorGate.id);
      expect(evaluatedGate?.outputs[0].value).toBe(c.expected);
    }
  });
});

describe('Circuit Simulator - Arithmetic Circuits', () => {
  it('verifies Half Adder 4 combinations: S = A ⊕ B, C = A · B', () => {
    const swA = createComponent('SWITCH', 0, 0, 'A');
    const swB = createComponent('SWITCH', 0, 50, 'B');
    const ha = createComponent('HALF_ADDER', 100, 0, 'HA');

    const wires: WireConnection[] = [
      { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: ha.id, toPinId: ha.inputs[0].id, value: 0 },
      { id: 'w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: ha.id, toPinId: ha.inputs[1].id, value: 0 },
    ];

    const cases = [
      { a: 0, b: 0, s: 0, c: 0 },
      { a: 0, b: 1, s: 1, c: 0 },
      { a: 1, b: 0, s: 1, c: 0 },
      { a: 1, b: 1, s: 0, c: 1 },
    ];

    for (const test of cases) {
      swA.state = { switchActive: test.a === 1 };
      swB.state = { switchActive: test.b === 1 };
      const res = CircuitSimulator.step([swA, swB, ha], wires, false);
      const evalHA = res.components.find((comp) => comp.id === ha.id);
      expect(evalHA?.outputs[0].value).toBe(test.s);
      expect(evalHA?.outputs[1].value).toBe(test.c);
    }
  });

  it('verifies Full Adder all 8 combinations: S = A ⊕ B ⊕ Cin, Cout', () => {
    const swA = createComponent('SWITCH', 0, 0, 'A');
    const swB = createComponent('SWITCH', 0, 50, 'B');
    const swCin = createComponent('SWITCH', 0, 100, 'Cin');
    const fa = createComponent('FULL_ADDER', 100, 0, 'FA');

    const wires: WireConnection[] = [
      { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: fa.id, toPinId: fa.inputs[0].id, value: 0 },
      { id: 'w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: fa.id, toPinId: fa.inputs[1].id, value: 0 },
      { id: 'w3', fromComponentId: swCin.id, fromPinId: swCin.outputs[0].id, toComponentId: fa.id, toPinId: fa.inputs[2].id, value: 0 },
    ];

    const cases = [
      { a: 0, b: 0, cin: 0, s: 0, cout: 0 },
      { a: 0, b: 0, cin: 1, s: 1, cout: 0 },
      { a: 0, b: 1, cin: 0, s: 1, cout: 0 },
      { a: 0, b: 1, cin: 1, s: 0, cout: 1 },
      { a: 1, b: 0, cin: 0, s: 1, cout: 0 },
      { a: 1, b: 0, cin: 1, s: 0, cout: 1 },
      { a: 1, b: 1, cin: 0, s: 0, cout: 1 },
      { a: 1, b: 1, cin: 1, s: 1, cout: 1 },
    ];

    for (const test of cases) {
      swA.state = { switchActive: test.a === 1 };
      swB.state = { switchActive: test.b === 1 };
      swCin.state = { switchActive: test.cin === 1 };

      const res = CircuitSimulator.step([swA, swB, swCin, fa], wires, false);
      const evalFA = res.components.find((comp) => comp.id === fa.id);
      expect(evalFA?.outputs[0].value).toBe(test.s);
      expect(evalFA?.outputs[1].value).toBe(test.cout);
    }
  });

  it('verifies interconnected circuit with AND, OR, NOT, and XOR simultaneously across all 4 combinations', () => {
    // Build the testbench
    const swA = createComponent('SWITCH', 0, 0, 'A');
    const swB = createComponent('SWITCH', 0, 100, 'B');

    const andGate = createComponent('AND', 100, 0, 'AND');
    const orGate = createComponent('OR', 100, 100, 'OR');
    const notGate = createComponent('NOT', 100, 200, 'NOT');
    const xorGate = createComponent('XOR', 100, 300, 'XOR');

    const ledAnd = createComponent('LED', 250, 0, 'LED_AND');
    const ledOr = createComponent('LED', 250, 100, 'LED_OR');
    const ledNot = createComponent('LED', 250, 200, 'LED_NOT');
    const ledXor = createComponent('LED', 250, 300, 'LED_XOR');

    const wires: WireConnection[] = [
      // A & B to AND
      { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: andGate.id, toPinId: andGate.inputs[0].id, value: 0 },
      { id: 'w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: andGate.id, toPinId: andGate.inputs[1].id, value: 0 },
      { id: 'w3', fromComponentId: andGate.id, fromPinId: andGate.outputs[0].id, toComponentId: ledAnd.id, toPinId: ledAnd.inputs[0].id, value: 0 },

      // A & B to OR
      { id: 'w4', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: orGate.id, toPinId: orGate.inputs[0].id, value: 0 },
      { id: 'w5', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: orGate.id, toPinId: orGate.inputs[1].id, value: 0 },
      { id: 'w6', fromComponentId: orGate.id, fromPinId: orGate.outputs[0].id, toComponentId: ledOr.id, toPinId: ledOr.inputs[0].id, value: 0 },

      // A to NOT
      { id: 'w7', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: notGate.id, toPinId: notGate.inputs[0].id, value: 0 },
      { id: 'w8', fromComponentId: notGate.id, fromPinId: notGate.outputs[0].id, toComponentId: ledNot.id, toPinId: ledNot.inputs[0].id, value: 0 },

      // A & B to XOR
      { id: 'w9', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: xorGate.id, toPinId: xorGate.inputs[0].id, value: 0 },
      { id: 'w10', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: xorGate.id, toPinId: xorGate.inputs[1].id, value: 0 },
      { id: 'w11', fromComponentId: xorGate.id, fromPinId: xorGate.outputs[0].id, toComponentId: ledXor.id, toPinId: ledXor.inputs[0].id, value: 0 },
    ];

    const allComponents = [swA, swB, andGate, orGate, notGate, xorGate, ledAnd, ledOr, ledNot, ledXor];

    // Verification matrix for all 4 combinations:
    // (A, B) -> (AND, OR, NOT_A, XOR)
    const truthCombinations = [
      { a: 0, b: 0, and: 0, or: 0, not: 1, xor: 0 },
      { a: 0, b: 1, and: 0, or: 1, not: 1, xor: 1 },
      { a: 1, b: 0, and: 0, or: 1, not: 0, xor: 1 },
      { a: 1, b: 1, and: 1, or: 1, not: 0, xor: 0 },
    ];

    for (const comb of truthCombinations) {
      swA.state = { switchActive: comb.a === 1 };
      swB.state = { switchActive: comb.b === 1 };

      const res = CircuitSimulator.step(allComponents, wires, false);

      const evaluatedLedAnd = res.components.find((c) => c.id === ledAnd.id);
      const evaluatedLedOr = res.components.find((c) => c.id === ledOr.id);
      const evaluatedLedNot = res.components.find((c) => c.id === ledNot.id);
      const evaluatedLedXor = res.components.find((c) => c.id === ledXor.id);

      expect(evaluatedLedAnd?.inputs[0].value).toBe(comb.and);
      expect(evaluatedLedOr?.inputs[0].value).toBe(comb.or);
      expect(evaluatedLedNot?.inputs[0].value).toBe(comb.not);
      expect(evaluatedLedXor?.inputs[0].value).toBe(comb.xor);
    }
  });

  it('verifies cascading signal propagation through multiple stages: (A · B) + (A ⊕ B)', () => {
    const swA = createComponent('SWITCH', 0, 0, 'A');
    const swB = createComponent('SWITCH', 0, 100, 'B');
    const andGate = createComponent('AND', 100, 0, 'AND');
    const xorGate = createComponent('XOR', 100, 100, 'XOR');
    const orGate = createComponent('OR', 250, 50, 'OR');

    const wires: WireConnection[] = [
      { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: andGate.id, toPinId: andGate.inputs[0].id, value: 0 },
      { id: 'w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: andGate.id, toPinId: andGate.inputs[1].id, value: 0 },
      { id: 'w3', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: xorGate.id, toPinId: xorGate.inputs[0].id, value: 0 },
      { id: 'w4', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: xorGate.id, toPinId: xorGate.inputs[1].id, value: 0 },
      { id: 'w5', fromComponentId: andGate.id, fromPinId: andGate.outputs[0].id, toComponentId: orGate.id, toPinId: orGate.inputs[0].id, value: 0 },
      { id: 'w6', fromComponentId: xorGate.id, fromPinId: xorGate.outputs[0].id, toComponentId: orGate.id, toPinId: orGate.inputs[1].id, value: 0 },
    ];

    // (A · B) + (A ⊕ B) is equivalent to (A + B)
    // 0,0 -> 0
    // 0,1 -> 0 + 1 = 1
    // 1,0 -> 0 + 1 = 1
    // 1,1 -> 1 + 0 = 1
    const testCases = [
      { a: 0, b: 0, expected: 0 },
      { a: 0, b: 1, expected: 1 },
      { a: 1, b: 0, expected: 1 },
      { a: 1, b: 1, expected: 1 },
    ];

    for (const tc of testCases) {
      swA.state = { switchActive: tc.a === 1 };
      swB.state = { switchActive: tc.b === 1 };
      const res = CircuitSimulator.step([swA, swB, andGate, xorGate, orGate], wires, false);
      const evalOr = res.components.find((c) => c.id === orGate.id);
      expect(evalOr?.outputs[0].value).toBe(tc.expected);
    }
  });

  it('detects unconnected inputs and propagates floating X without crash', () => {
    const andGate = createComponent('AND', 100, 0, 'AND');
    // no wires connected
    const res = CircuitSimulator.step([andGate], [], false);
    const evalAnd = res.components.find((c) => c.id === andGate.id);
    expect(evalAnd?.inputs[0].value).toBe('X');
    expect(evalAnd?.inputs[1].value).toBe('X');
    expect(evalAnd?.outputs[0].value).toBe('X');
  });
});
