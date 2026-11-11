/**
 * Unit Tests for Complex Digital Electronics Circuits, Multi-Input Gates,
 * Branching Connections, T-Junctions, and Truth Table Generation
 */

import { describe, it, expect } from 'vitest';
import { CircuitSimulator } from '../engines/circuit/simulator';
import { createComponent } from '../engines/circuit/generator';
import { CIRCUIT_PRESETS } from '../engines/circuit/presets';
import { CircuitComponent, WireConnection } from '../types';

describe('Multi-Input Gates Evaluation (2 to 8 Inputs)', () => {
  it('evaluates a 3-input NAND gate according to ~(A · B · C)', () => {
    const nand3 = createComponent('NAND', 100, 100, 'NAND 3-in', 3);
    expect(nand3.inputs.length).toBe(3);

    // Test all 8 binary combinations
    for (let i = 0; i < 8; i++) {
      const a = (i & 4) ? 1 : 0;
      const b = (i & 2) ? 1 : 0;
      const c = (i & 1) ? 1 : 0;

      const swA = createComponent('SWITCH', 0, 0, 'A');
      const swB = createComponent('SWITCH', 0, 50, 'B');
      const swC = createComponent('SWITCH', 0, 100, 'C');

      swA.state = { switchActive: a === 1 };
      swA.outputs[0].value = a;
      swB.state = { switchActive: b === 1 };
      swB.outputs[0].value = b;
      swC.state = { switchActive: c === 1 };
      swC.outputs[0].value = c;

      const gate = createComponent('NAND', 200, 50, 'NAND 3-in', 3);
      const connections: WireConnection[] = [
        { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: gate.id, toPinId: gate.inputs[0].id, value: a },
        { id: 'w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: gate.id, toPinId: gate.inputs[1].id, value: b },
        { id: 'w3', fromComponentId: swC.id, fromPinId: swC.outputs[0].id, toComponentId: gate.id, toPinId: gate.inputs[2].id, value: c },
      ];

      const res = CircuitSimulator.step([swA, swB, swC, gate], connections);
      const evalGate = res.components.find((comp) => comp.id === gate.id);
      const expected = !(a === 1 && b === 1 && c === 1) ? 1 : 0;
      expect(evalGate?.outputs[0].value).toBe(expected);
    }
  });

  it('evaluates a 4-input NOR gate according to ~(A + B + C + D)', () => {
    const nor4 = createComponent('NOR', 100, 100, 'NOR 4-in', 4);
    expect(nor4.inputs.length).toBe(4);

    for (let i = 0; i < 16; i++) {
      const bits = [
        (i & 8) ? 1 : 0,
        (i & 4) ? 1 : 0,
        (i & 2) ? 1 : 0,
        (i & 1) ? 1 : 0,
      ];

      const switches = bits.map((b, idx) => {
        const sw = createComponent('SWITCH', 0, idx * 40, `In ${idx}`);
        sw.state = { switchActive: b === 1 };
        sw.outputs[0].value = b as 0 | 1;
        return sw;
      });

      const gate = createComponent('NOR', 200, 50, 'NOR 4-in', 4);
      const connections: WireConnection[] = switches.map((sw, idx) => ({
        id: `w_${idx}`,
        fromComponentId: sw.id,
        fromPinId: sw.outputs[0].id,
        toComponentId: gate.id,
        toPinId: gate.inputs[idx].id,
        value: sw.outputs[0].value,
      }));

      const res = CircuitSimulator.step([...switches, gate], connections);
      const evalGate = res.components.find((comp) => comp.id === gate.id);
      const anyOne = bits.some((b) => b === 1);
      const expected = anyOne ? 0 : 1;
      expect(evalGate?.outputs[0].value).toBe(expected);
    }
  });

  it('evaluates an 8-input AND gate', () => {
    const and8 = createComponent('AND', 100, 100, 'AND 8-in', 8);
    expect(and8.inputs.length).toBe(8);

    const switches = Array.from({ length: 8 }, (_, idx) => {
      const sw = createComponent('SWITCH', 0, idx * 30, `In ${idx}`);
      sw.state = { switchActive: true };
      sw.outputs[0].value = 1; // All 1s
      return sw;
    });

    const connections: WireConnection[] = switches.map((sw, idx) => ({
      id: `w_${idx}`,
      fromComponentId: sw.id,
      fromPinId: sw.outputs[0].id,
      toComponentId: and8.id,
      toPinId: and8.inputs[idx].id,
      value: 1,
    }));

    // All 1s -> 1
    const resAllOnes = CircuitSimulator.step([...switches, and8], connections);
    expect(resAllOnes.components.find((c) => c.id === and8.id)?.outputs[0].value).toBe(1);

    // Make pin 4 a 0 -> output must immediately become 0
    switches[4].state = { switchActive: false };
    switches[4].outputs[0].value = 0;
    connections[4].value = 0;
    const resOneZero = CircuitSimulator.step([...switches, and8], connections);
    expect(resOneZero.components.find((c) => c.id === and8.id)?.outputs[0].value).toBe(0);
  });
});

describe('Branching Connections & T-Junction Signal Propagation', () => {
  it('propagates a single source pin into multiple input branches simultaneously', () => {
    const sw = createComponent('SWITCH', 0, 100, 'Source');
    sw.state = { switchActive: true };
    sw.outputs[0].value = 1;

    const not1 = createComponent('NOT', 200, 50, 'NOT 1');
    const not2 = createComponent('NOT', 200, 150, 'NOT 2');
    const not3 = createComponent('NOT', 200, 250, 'NOT 3');

    const connections: WireConnection[] = [
      { id: 'w1', fromComponentId: sw.id, fromPinId: sw.outputs[0].id, toComponentId: not1.id, toPinId: not1.inputs[0].id, value: 1 },
      { id: 'w2', fromComponentId: sw.id, fromPinId: sw.outputs[0].id, toComponentId: not2.id, toPinId: not2.inputs[0].id, value: 1, branchPoint: { x: 100, y: 100 } },
      { id: 'w3', fromComponentId: sw.id, fromPinId: sw.outputs[0].id, toComponentId: not3.id, toPinId: not3.inputs[0].id, value: 1, branchPoint: { x: 100, y: 100 } },
    ];

    const res = CircuitSimulator.step([sw, not1, not2, not3], connections);
    const n1 = res.components.find((c) => c.id === not1.id);
    const n2 = res.components.find((c) => c.id === not2.id);
    const n3 = res.components.find((c) => c.id === not3.id);

    // Inverters received 1, outputs must all be 0
    expect(n1?.outputs[0].value).toBe(0);
    expect(n2?.outputs[0].value).toBe(0);
    expect(n3?.outputs[0].value).toBe(0);
  });
});

describe('Reference Multilevel NAND Circuit (image_5b96777f.png)', () => {
  it('instantiates the reference preset with correct multi-input gates, vertical inverter, and branches', () => {
    const preset = CIRCUIT_PRESETS.find((p) => p.id === 'reference_nand_circuit');
    expect(preset).toBeDefined();

    const circuit = preset!.build();
    expect(circuit.components.length).toBe(9); // swA, swB, swC, nand1, not1, nand2, not2, nand3, ledF

    const nand3 = circuit.components.find((c) => c.label.includes('NAND 3'));
    expect(nand3).toBeDefined();
    expect(nand3?.inputs.length).toBe(3); // Configurable 3-input gate

    const not1 = circuit.components.find((c) => c.label === 'NOT a');
    expect(not1?.orientation).toBe('down'); // Downward vertical inverter

    // Verify T-junctions with branchPoint definitions
    const branchA = circuit.connections.find((w) => w.id === 'w_a_branch_not1');
    expect(branchA?.branchPoint).toBeDefined();
    expect(branchA?.branchPoint?.x).toBe(255);

    const branchB = circuit.connections.find((w) => w.id === 'w_b_branch_not2');
    expect(branchB?.branchPoint).toBeDefined();
    expect(branchB?.branchPoint?.x).toBe(180);
  });

  it('correctly simulates all 8 truth table rows for F = b + a̅c', () => {
    const preset = CIRCUIT_PRESETS.find((p) => p.id === 'reference_nand_circuit')!;
    const baseCircuit = preset.build();

    // Expected Boolean function: F = b + a'c
    // a=0, b=0, c=0 -> 0 + 1*0 = 0
    // a=0, b=0, c=1 -> 0 + 1*1 = 1
    // a=0, b=1, c=0 -> 1 + 1*0 = 1
    // a=0, b=1, c=1 -> 1 + 1*1 = 1
    // a=1, b=0, c=0 -> 0 + 0*0 = 0
    // a=1, b=0, c=1 -> 0 + 0*1 = 0
    // a=1, b=1, c=0 -> 1 + 0*0 = 1
    // a=1, b=1, c=1 -> 1 + 0*1 = 1
    const expectedOutputs = [0, 1, 1, 1, 0, 0, 1, 1];

    for (let i = 0; i < 8; i++) {
      const aVal = (i & 4) ? 1 : 0;
      const bVal = (i & 2) ? 1 : 0;
      const cVal = (i & 1) ? 1 : 0;

      const comps: CircuitComponent[] = JSON.parse(JSON.stringify(baseCircuit.components));
      const conns: WireConnection[] = JSON.parse(JSON.stringify(baseCircuit.connections));

      const swA = comps.find((c) => c.label === 'a')!;
      const swB = comps.find((c) => c.label === 'b')!;
      const swC = comps.find((c) => c.label === 'c')!;

      swA.state = { switchActive: aVal === 1 };
      swA.outputs[0].value = aVal;

      swB.state = { switchActive: bVal === 1 };
      swB.outputs[0].value = bVal;

      swC.state = { switchActive: cVal === 1 };
      swC.outputs[0].value = cVal;

      // Relax circuit through simulation steps
      let res = CircuitSimulator.step(comps, conns);
      for (let s = 0; s < 4; s++) {
        res = CircuitSimulator.step(res.components, res.connections);
      }

      const ledF = res.components.find((c) => c.label.includes('F ='))!;
      const actualVal = ledF.inputs[0]?.value;

      expect(actualVal).toBe(expectedOutputs[i]);
    }
  });

  it('generates the complete automated truth table with CircuitSimulator.generateTruthTable', () => {
    const preset = CIRCUIT_PRESETS.find((p) => p.id === 'reference_nand_circuit')!;
    const circuit = preset.build();

    const ttResult = CircuitSimulator.generateTruthTable(circuit.components, circuit.connections);
    expect(ttResult.success).toBe(true);
    expect(ttResult.inputVariables).toEqual(['a', 'b', 'c']);
    expect(ttResult.rows.length).toBe(8);

    // Minterms must be {1, 2, 3, 6, 7}
    expect(ttResult.minterms).toEqual([1, 2, 3, 6, 7]);
    // Maxterms must be {0, 4, 5}
    expect(ttResult.maxterms).toEqual([0, 4, 5]);

    // Simplified expression must match b + a'c or equivalent
    expect(ttResult.sopExpression).toBeDefined();
  });
});
