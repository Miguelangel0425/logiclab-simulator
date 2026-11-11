import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitSimulator } from '../engines/circuit/simulator';
import { SubcircuitRegistry } from '../engines/circuit/subcircuitRegistry';
import { createComponent } from '../engines/circuit/generator';
import { circuitStore } from '../store/useCircuitStore';
import { WireConnection } from '../types';

describe('Custom Subcircuits & Hierarchical Design Engine', () => {
  beforeEach(() => {
    circuitStore.clearCircuit();
    while (circuitStore.isInsideSubcircuit) {
      circuitStore.closeSubcircuit();
    }
  });

  it('initializes default reference subcircuits in registry (FULL ADDER and HALF ADDER)', () => {
    const all = SubcircuitRegistry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(2);

    const fa = SubcircuitRegistry.get('builtin_full_adder');
    expect(fa).toBeDefined();
    expect(fa?.name).toBe('FULL ADDER');
    expect(fa?.ports.length).toBe(5); // 3 in, 2 out

    const inputs = fa?.ports.filter((p) => p.type === 'input') || [];
    const outputs = fa?.ports.filter((p) => p.type === 'output') || [];
    expect(inputs.length).toBe(3);
    expect(outputs.length).toBe(2);
  });

  it('creates an instance of FULL ADDER with proper pin configurations', () => {
    const inst = SubcircuitRegistry.createInstance('builtin_full_adder', 100, 150, 'FA0');
    expect(inst.type).toBe('CUSTOM_SUBCIRCUIT');
    expect(inst.subcircuitId).toBe('sub_full_adder_reference');
    expect(inst.inputs.length).toBe(3);
    expect(inst.outputs.length).toBe(2);
    expect(inst.state?.subcircuitInternalState).toBeDefined();
    expect(inst.state?.subcircuitInternalState?.components.length).toBeGreaterThan(0);
  });

  it('simulates Full Adder subcircuit instance across all 8 truth table combinations', () => {
    // Instantiate Full Adder subcircuit
    const fa = SubcircuitRegistry.createInstance('builtin_full_adder', 300, 100, 'FA_TEST');
    const swA = createComponent('SWITCH', 80, 50, 'A');
    const swB = createComponent('SWITCH', 80, 100, 'B');
    const swCin = createComponent('SWITCH', 80, 150, 'Cin');
    const ledS = createComponent('LED', 550, 80, 'S');
    const ledCout = createComponent('LED', 550, 140, 'Cout');

    const connections: WireConnection[] = [
      { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: fa.id, toPinId: fa.inputs[0].id, value: 0 },
      { id: 'w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: fa.id, toPinId: fa.inputs[1].id, value: 0 },
      { id: 'w3', fromComponentId: swCin.id, fromPinId: swCin.outputs[0].id, toComponentId: fa.id, toPinId: fa.inputs[2].id, value: 0 },
      { id: 'w4', fromComponentId: fa.id, fromPinId: fa.outputs[0].id, toComponentId: ledS.id, toPinId: ledS.inputs[0].id, value: 0 },
      { id: 'w5', fromComponentId: fa.id, fromPinId: fa.outputs[1].id, toComponentId: ledCout.id, toPinId: ledCout.inputs[0].id, value: 0 },
    ];

    // Canonical Full Adder Truth Table:
    // A B Cin | S Cout
    // 0 0  0  | 0  0
    // 0 0  1  | 1  0
    // 0 1  0  | 1  0
    // 0 1  1  | 0  1
    // 1 0  0  | 1  0
    // 1 0  1  | 0  1
    // 1 1  0  | 0  1
    // 1 1  1  | 1  1
    const testCases = [
      { a: 0, b: 0, cin: 0, expectedS: 0, expectedCout: 0 },
      { a: 0, b: 0, cin: 1, expectedS: 1, expectedCout: 0 },
      { a: 0, b: 1, cin: 0, expectedS: 1, expectedCout: 0 },
      { a: 0, b: 1, cin: 1, expectedS: 0, expectedCout: 1 },
      { a: 1, b: 0, cin: 0, expectedS: 1, expectedCout: 0 },
      { a: 1, b: 0, cin: 1, expectedS: 0, expectedCout: 1 },
      { a: 1, b: 1, cin: 0, expectedS: 0, expectedCout: 1 },
      { a: 1, b: 1, cin: 1, expectedS: 1, expectedCout: 1 },
    ];

    for (const tc of testCases) {
      swA.state = { switchActive: tc.a === 1 };
      swB.state = { switchActive: tc.b === 1 };
      swCin.state = { switchActive: tc.cin === 1 };

      const res = CircuitSimulator.step([swA, swB, swCin, fa, ledS, ledCout], connections, false);
      const evalFa = res.components.find((c) => c.id === fa.id);

      expect(evalFa?.outputs[0].value).toBe(tc.expectedS);
      expect(evalFa?.outputs[1].value).toBe(tc.expectedCout);
    }
  });

  it('simulates 4-bit Ripple-Carry Adder composed of 4 chained subcircuits with carry propagation', () => {
    // Bit 0 to 3 Full Adders
    const fa0 = SubcircuitRegistry.createInstance('builtin_full_adder', 300, 50, 'FA0');
    const fa1 = SubcircuitRegistry.createInstance('builtin_full_adder', 300, 150, 'FA1');
    const fa2 = SubcircuitRegistry.createInstance('builtin_full_adder', 300, 250, 'FA2');
    const fa3 = SubcircuitRegistry.createInstance('builtin_full_adder', 300, 350, 'FA3');

    // Inputs: Cin, A0..A3, B0..B3
    const cin = createComponent('SWITCH', 80, 20, 'Cin');
    const a = [0, 1, 2, 3].map((i) => createComponent('SWITCH', 80, 60 + i * 100, `A${i}`));
    const b = [0, 1, 2, 3].map((i) => createComponent('SWITCH', 140, 60 + i * 100, `B${i}`));

    const fa = [fa0, fa1, fa2, fa3];
    const connections: WireConnection[] = [
      // Bit 0: Cin, A0, B0
      { id: 'w_cin', fromComponentId: cin.id, fromPinId: cin.outputs[0].id, toComponentId: fa0.id, toPinId: fa0.inputs[2].id, value: 0 },
      { id: 'w_a0', fromComponentId: a[0].id, fromPinId: a[0].outputs[0].id, toComponentId: fa0.id, toPinId: fa0.inputs[0].id, value: 0 },
      { id: 'w_b0', fromComponentId: b[0].id, fromPinId: b[0].outputs[0].id, toComponentId: fa0.id, toPinId: fa0.inputs[1].id, value: 0 },

      // Ripple carry: fa0.cout -> fa1.cin
      { id: 'w_c0', fromComponentId: fa0.id, fromPinId: fa0.outputs[1].id, toComponentId: fa1.id, toPinId: fa1.inputs[2].id, value: 0 },
      { id: 'w_a1', fromComponentId: a[1].id, fromPinId: a[1].outputs[0].id, toComponentId: fa1.id, toPinId: fa1.inputs[0].id, value: 0 },
      { id: 'w_b1', fromComponentId: b[1].id, fromPinId: b[1].outputs[0].id, toComponentId: fa1.id, toPinId: fa1.inputs[1].id, value: 0 },

      // Ripple carry: fa1.cout -> fa2.cin
      { id: 'w_c1', fromComponentId: fa1.id, fromPinId: fa1.outputs[1].id, toComponentId: fa2.id, toPinId: fa2.inputs[2].id, value: 0 },
      { id: 'w_a2', fromComponentId: a[2].id, fromPinId: a[2].outputs[0].id, toComponentId: fa2.id, toPinId: fa2.inputs[0].id, value: 0 },
      { id: 'w_b2', fromComponentId: b[2].id, fromPinId: b[2].outputs[0].id, toComponentId: fa2.id, toPinId: fa2.inputs[1].id, value: 0 },

      // Ripple carry: fa2.cout -> fa3.cin
      { id: 'w_c2', fromComponentId: fa2.id, fromPinId: fa2.outputs[1].id, toComponentId: fa3.id, toPinId: fa3.inputs[2].id, value: 0 },
      { id: 'w_a3', fromComponentId: a[3].id, fromPinId: a[3].outputs[0].id, toComponentId: fa3.id, toPinId: fa3.inputs[0].id, value: 0 },
      { id: 'w_b3', fromComponentId: b[3].id, fromPinId: b[3].outputs[0].id, toComponentId: fa3.id, toPinId: fa3.inputs[1].id, value: 0 },
    ];

    const allComps = [cin, ...a, ...b, ...fa];

    const verifyAddition = (numA: number, numB: number, numCin = 0) => {
      cin.state = { switchActive: numCin === 1 };
      for (let i = 0; i < 4; i++) {
        a[i].state = { switchActive: ((numA >> i) & 1) === 1 };
        b[i].state = { switchActive: ((numB >> i) & 1) === 1 };
      }

      const res = CircuitSimulator.step(allComps, connections, false);

      const s0 = res.components.find((c) => c.id === fa0.id)?.outputs[0].value ?? 0;
      const s1 = res.components.find((c) => c.id === fa1.id)?.outputs[0].value ?? 0;
      const s2 = res.components.find((c) => c.id === fa2.id)?.outputs[0].value ?? 0;
      const s3 = res.components.find((c) => c.id === fa3.id)?.outputs[0].value ?? 0;
      const cout = res.components.find((c) => c.id === fa3.id)?.outputs[1].value ?? 0;

      const sumTotal = (cout as number) * 16 + (s3 as number) * 8 + (s2 as number) * 4 + (s1 as number) * 2 + (s0 as number);
      const expectedTotal = numA + numB + numCin;

      expect(sumTotal).toBe(expectedTotal);
    };

    // Test cases requested:
    // 0111 + 0010 = 01001 (7 + 2 = 9)
    verifyAddition(7, 2, 0);

    // 1111 + 0001 = 10000 (15 + 1 = 16)
    verifyAddition(15, 1, 0);

    // 1111 + 1111 = 11110 (15 + 15 = 30)
    verifyAddition(15, 15, 0);

    // Extra arbitrary combinations
    verifyAddition(0, 0, 0);
    verifyAddition(5, 3, 0);
    verifyAddition(9, 6, 1);
  });

  it('guarantees instance state isolation between multiple instances', () => {
    const fa1 = SubcircuitRegistry.createInstance('builtin_full_adder', 100, 100, 'FA1');
    const fa2 = SubcircuitRegistry.createInstance('builtin_full_adder', 300, 100, 'FA2');

    expect(fa1.state?.subcircuitInternalState).not.toBe(fa2.state?.subcircuitInternalState);

    // Modify internal state of fa1 without affecting fa2
    const fa1Comps = fa1.state?.subcircuitInternalState?.components;
    if (fa1Comps && fa1Comps[0]) {
      fa1Comps[0].label = 'MODIFIED_FA1';
    }

    const fa2Comps = fa2.state?.subcircuitInternalState?.components;
    expect(fa2Comps?.[0].label).not.toBe('MODIFIED_FA1');
  });

  it('navigates hierarchically into a subcircuit via store and returns cleanly', () => {
    const swA = circuitStore.addComponent('SWITCH', 50, 100, 'A');
    const inst = circuitStore.insertSubcircuit('builtin_full_adder', 250, 100, 'FA0');

    expect(circuitStore.components.length).toBe(2);
    expect(circuitStore.isInsideSubcircuit).toBe(false);
    expect(circuitStore.currentHierarchyDepth).toBe(0);

    // Double-click / Open subcircuit
    const opened = circuitStore.openSubcircuit(inst.id);
    expect(opened).toBe(true);
    expect(circuitStore.isInsideSubcircuit).toBe(true);
    expect(circuitStore.currentHierarchyDepth).toBe(1);

    const breadcrumbs = circuitStore.getHierarchyBreadcrumbs();
    expect(breadcrumbs.length).toBe(2);
    expect(breadcrumbs[0].name).toBe('Circuito Principal');
    expect(breadcrumbs[1].name).toBe('FA0 (FULL ADDER)');

    // While inside, canvas contains internal subcircuit gates
    expect(circuitStore.components.length).toBeGreaterThan(2);

    // Add an internal gate inside subcircuit
    circuitStore.addComponent('BUFFER', 600, 200, 'DEBUG_BUFFER');

    // Return to parent circuit
    const closed = circuitStore.closeSubcircuit();
    expect(closed).toBe(true);
    expect(circuitStore.isInsideSubcircuit).toBe(false);
    expect(circuitStore.currentHierarchyDepth).toBe(0);

    // Parent circuit components are preserved
    expect(circuitStore.components.length).toBe(2);
    const parentInst = circuitStore.components.find((c) => c.id === inst.id);
    expect(parentInst).toBeDefined();

    // Internal state retained the newly added component
    const internal = parentInst?.state?.subcircuitInternalState?.components;
    const foundBuffer = internal?.some((c) => c.label === 'DEBUG_BUFFER');
    expect(foundBuffer).toBe(true);
  });

  it('builds a custom FULL ADDER from gates, packages it, inserts it into another circuit, and double-clicks to inspect internal gates graphically', () => {
    // 1. User builds Full Adder on canvas with 2 XORs, 2 ANDs, 1 OR
    const xor1 = circuitStore.addComponent('XOR', 200, 100, 'XOR 1');
    const xor2 = circuitStore.addComponent('XOR', 400, 120, 'XOR 2');
    const and1 = circuitStore.addComponent('AND', 300, 220, 'AND 1');
    const and2 = circuitStore.addComponent('AND', 400, 300, 'AND 2');
    const or1 = circuitStore.addComponent('OR', 520, 260, 'OR 1');

    // Internal wires between gates
    circuitStore.startDraggingWire(xor1.id, xor1.outputs[0].id, true, 250, 115);
    circuitStore.finishDraggingWire(xor2.id, xor2.inputs[0].id);

    circuitStore.startDraggingWire(xor1.id, xor1.outputs[0].id, true, 250, 115);
    circuitStore.finishDraggingWire(and2.id, and2.inputs[0].id);

    circuitStore.startDraggingWire(and1.id, and1.outputs[0].id, true, 350, 235);
    circuitStore.finishDraggingWire(or1.id, or1.inputs[0].id);

    circuitStore.startDraggingWire(and2.id, and2.outputs[0].id, true, 450, 315);
    circuitStore.finishDraggingWire(or1.id, or1.inputs[1].id);

    // 2. Select the 5 gates
    circuitStore.setSelectedComponents([xor1.id, xor2.id, and1.id, and2.id, or1.id]);

    // 3. Create Subcircuit called 'CUSTOM_FA'
    const result = circuitStore.createSubcircuitFromSelection({
      name: 'CUSTOM_FA',
      description: 'Sumador completo construido con compuertas discretas',
      category: 'Aritmética',
      ports: [
        { id: 'p_a', name: 'A', type: 'input', targetComponentId: xor1.id, targetPinId: xor1.inputs[0].id, order: 0 },
        { id: 'p_b', name: 'B', type: 'input', targetComponentId: xor1.id, targetPinId: xor1.inputs[1].id, order: 1 },
        { id: 'p_cin', name: 'Cin', type: 'input', targetComponentId: xor2.id, targetPinId: xor2.inputs[1].id, order: 2 },
        { id: 'p_s', name: 'S', type: 'output', targetComponentId: xor2.id, targetPinId: xor2.outputs[0].id, order: 0 },
        { id: 'p_cout', name: 'Cout', type: 'output', targetComponentId: or1.id, targetPinId: or1.outputs[0].id, order: 1 },
      ],
      replaceSelection: true,
    });

    expect(result.success).toBe(true);
    expect(result.subcircuit).toBeDefined();

    // Verify subcircuit definition has synthesized boundary inputs and outputs
    const def = SubcircuitRegistry.get(result.subcircuit!.id);
    expect(def).toBeDefined();
    expect(def?.components.some((c) => c.type === 'SWITCH')).toBe(true);
    expect(def?.components.some((c) => c.type === 'LED')).toBe(true);
    expect(def?.components.some((c) => c.type === 'XOR')).toBe(true);
    expect(def?.components.some((c) => c.type === 'AND')).toBe(true);
    expect(def?.components.some((c) => c.type === 'OR')).toBe(true);

    // 4. On canvas, the selection was replaced by the single subcircuit instance
    expect(circuitStore.components.length).toBe(1);
    const faInst = circuitStore.components[0];
    expect(faInst.type).toBe('CUSTOM_SUBCIRCUIT');
    expect(faInst.inputs.length).toBe(3);
    expect(faInst.outputs.length).toBe(2);

    // 5. User double clicks / opens the subcircuit
    const opened = circuitStore.openSubcircuit(faInst.id);
    expect(opened).toBe(true);
    expect(circuitStore.isInsideSubcircuit).toBe(true);

    // 6. Canvas now graphically displays the internal implementation
    // Contains inputs (switches), 2 XORs, 2 ANDs, 1 OR, and outputs (LEDs)
    const currentTypes = circuitStore.components.map((c) => c.type);
    expect(currentTypes.filter((t) => t === 'XOR').length).toBe(2);
    expect(currentTypes.filter((t) => t === 'AND').length).toBe(2);
    expect(currentTypes.filter((t) => t === 'OR').length).toBe(1);
    expect(currentTypes.includes('SWITCH')).toBe(true);
    expect(currentTypes.includes('LED')).toBe(true);

    // 7. Verify breadcrumb trail
    const crumbs = circuitStore.getHierarchyBreadcrumbs();
    expect(crumbs.length).toBe(2);
    expect(crumbs[0].name).toBe('Circuito Principal');
    expect(crumbs[1].subcircuitName).toBe('CUSTOM_FA');

    // 8. User closes subcircuit and returns to parent
    circuitStore.closeSubcircuit();
    expect(circuitStore.isInsideSubcircuit).toBe(false);
    expect(circuitStore.components.length).toBe(1);
    expect(circuitStore.components[0].id).toBe(faInst.id);
  });

  it('allows creating a subcircuit by encapsulating all canvas components when none were explicitly selected', () => {
    circuitStore.clearCircuit();
    const g1 = circuitStore.addComponent('AND', 100, 100, 'AND_1');
    const g2 = circuitStore.addComponent('NOT', 240, 100, 'NOT_1');

    // Deselect everything
    circuitStore.setSelectedComponents([]);
    expect(circuitStore.selectedComponentIds.length).toBe(0);

    // Call createSubcircuitFromSelection: should use canvas fallback
    const result = circuitStore.createSubcircuitFromSelection({
      name: 'NAND_EQUIV',
      description: 'AND followed by NOT',
      ports: [
        { id: 'p_in0', name: 'A', type: 'input', targetComponentId: g1.id, targetPinId: g1.inputs[0].id, order: 0 },
        { id: 'p_in1', name: 'B', type: 'input', targetComponentId: g1.id, targetPinId: g1.inputs[1].id, order: 1 },
        { id: 'p_out', name: 'Y', type: 'output', targetComponentId: g2.id, targetPinId: g2.outputs[0].id, order: 0 },
      ],
      replaceSelection: false,
    });

    expect(result.success).toBe(true);
    expect(result.subcircuit).toBeDefined();
    expect(result.subcircuit?.name).toBe('NAND_EQUIV');

    const registered = SubcircuitRegistry.get(result.subcircuit!.id);
    expect(registered).toBeDefined();
    expect(registered?.name).toBe('NAND_EQUIV');
  });

  it('creates a blank subcircuit and opens its graphical editor directly', () => {
    circuitStore.clearCircuit();
    const blank = circuitStore.createBlankSubcircuit('BLANK_MODULE', 'Modulo vacio para pruebas');
    expect(blank.id).toBeDefined();
    expect(blank.name).toBe('BLANK_MODULE');

    // Open directly using definition ID
    const opened = circuitStore.openSubcircuit(blank.id);
    expect(opened).toBe(true);
    expect(circuitStore.isInsideSubcircuit).toBe(true);

    const crumbs = circuitStore.getHierarchyBreadcrumbs();
    expect(crumbs[crumbs.length - 1].subcircuitName).toBe('BLANK_MODULE');

    // Inside the blank subcircuit, user can add gates
    circuitStore.addComponent('OR', 100, 100, 'OR_BLANK');
    expect(circuitStore.components.some((c) => c.label === 'OR_BLANK')).toBe(true);

    circuitStore.closeSubcircuit();
    expect(circuitStore.isInsideSubcircuit).toBe(false);
  });

  it('notifies subscribers when subcircuits are registered or modified in SubcircuitRegistry', () => {
    let callCount = 0;
    const unsubscribe = SubcircuitRegistry.subscribe(() => {
      callCount++;
    });

    const testDef = circuitStore.createBlankSubcircuit('TEST_NOTIFY');
    expect(callCount).toBeGreaterThanOrEqual(1);

    SubcircuitRegistry.remove(testDef.id);
    expect(callCount).toBeGreaterThanOrEqual(2);

    unsubscribe();
  });
});
