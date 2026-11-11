import { describe, it, expect, beforeEach } from 'vitest';
import { circuitStore } from '../store/useCircuitStore';
import { CircuitSimulator } from '../engines/circuit/simulator';
import { createComponent, CircuitGenerator } from '../engines/circuit/generator';

describe('Sincronización Bidireccional Circuito ⇄ Tabla de Verdad', () => {
  beforeEach(() => {
    circuitStore.clearCircuit();
  });

  describe('1. Circuito → Tabla de Verdad (Generación Automática)', () => {
    it('debe generar automáticamente la tabla de verdad para una compuerta AND con 2 entradas (A, B)', () => {
      // Create Inputs A and B
      circuitStore.addComponent('SWITCH', 50, 100, 'A');
      circuitStore.addComponent('SWITCH', 50, 200, 'B');
      // Create AND Gate
      circuitStore.addComponent('AND', 250, 150, 'AND_1');
      // Create LED Output
      circuitStore.addComponent('OUTPUT_LED', 450, 150, 'F');

      const comps = circuitStore.components;
      const swA = comps.find((c) => c.label === 'A')!;
      const swB = comps.find((c) => c.label === 'B')!;
      const andGate = comps.find((c) => c.type === 'AND')!;
      const led = comps.find((c) => c.label === 'F')!;

      // Connect A -> AND.in1, B -> AND.in2, AND.out -> LED
      circuitStore.finishDraggingWire({
        fromComponentId: swA.id,
        fromPinId: swA.outputs[0].id,
        isFromOutput: true,
        fromX: 100,
        fromY: 100,
        currentX: 250,
        currentY: 150,
      }, {
        componentId: andGate.id,
        pinId: andGate.inputs[0].id,
        isOutput: false,
      });

      circuitStore.finishDraggingWire({
        fromComponentId: swB.id,
        fromPinId: swB.outputs[0].id,
        isFromOutput: true,
        fromX: 100,
        fromY: 200,
        currentX: 250,
        currentY: 180,
      }, {
        componentId: andGate.id,
        pinId: andGate.inputs[1].id,
        isOutput: false,
      });

      circuitStore.finishDraggingWire({
        fromComponentId: andGate.id,
        fromPinId: andGate.outputs[0].id,
        isFromOutput: true,
        fromX: 350,
        fromY: 165,
        currentX: 450,
        currentY: 165,
      }, {
        componentId: led.id,
        pinId: led.inputs[0].id,
        isOutput: false,
      });

      // Generate associated truth table
      const table = circuitStore.generateAssociatedTruthTable();

      expect(table.success).toBe(true);
      expect(table.inputVariables).toEqual(['A', 'B']);
      expect(table.rows.length).toBe(4);

      // Verify row values: 00->0, 01->0, 10->0, 11->1
      expect(table.rows[0].outputs[table.outputVariables[0]]).toBe(0);
      expect(table.rows[1].outputs[table.outputVariables[0]]).toBe(0);
      expect(table.rows[2].outputs[table.outputVariables[0]]).toBe(0);
      expect(table.rows[3].outputs[table.outputVariables[0]]).toBe(1);
      expect(table.minterms).toEqual([3]);
    });

    it('debe recalcular la tabla al cambiar compuerta AND por XOR produciendo [0, 1, 1, 0]', () => {
      // Build XOR circuit directly
      const swA = createComponent('SWITCH', 50, 100, 'A');
      const swB = createComponent('SWITCH', 50, 200, 'B');
      const xorGate = createComponent('XOR', 250, 150, 'XOR_1', 2);
      const led = createComponent('OUTPUT_LED', 450, 150, 'F_XOR');

      const connections = [
        {
          id: 'w1',
          fromComponentId: swA.id,
          fromPinId: swA.outputs[0].id,
          toComponentId: xorGate.id,
          toPinId: xorGate.inputs[0].id,
          value: 0 as const,
        },
        {
          id: 'w2',
          fromComponentId: swB.id,
          fromPinId: swB.outputs[0].id,
          toComponentId: xorGate.id,
          toPinId: xorGate.inputs[1].id,
          value: 0 as const,
        },
        {
          id: 'w3',
          fromComponentId: xorGate.id,
          fromPinId: xorGate.outputs[0].id,
          toComponentId: led.id,
          toPinId: led.inputs[0].id,
          value: 0 as const,
        },
      ];

      circuitStore.loadCircuit([swA, swB, xorGate, led], connections);
      const table = circuitStore.generateAssociatedTruthTable();

      expect(table.success).toBe(true);
      expect(table.rows.length).toBe(4);
      const outName = table.outputVariables[0];
      expect(table.rows[0].outputs[outName]).toBe(0);
      expect(table.rows[1].outputs[outName]).toBe(1);
      expect(table.rows[2].outputs[outName]).toBe(1);
      expect(table.rows[3].outputs[outName]).toBe(0);
      expect(table.minterms).toEqual([1, 2]);
    });
  });

  describe('2. Detección de Versión Desactualizada (Out-of-Sync Tracking)', () => {
    it('debe marcar la tabla como desactualizada al modificar la estructura del circuito', () => {
      const swA = createComponent('SWITCH', 50, 100, 'A');
      const led = createComponent('OUTPUT_LED', 250, 100, 'LED_1');
      const conns = [{
        id: 'w1',
        fromComponentId: swA.id,
        fromPinId: swA.outputs[0].id,
        toComponentId: led.id,
        toPinId: led.inputs[0].id,
        value: 0 as const,
      }];

      circuitStore.loadCircuit([swA, led], conns);
      circuitStore.generateAssociatedTruthTable();

      // Immediately after generation, table is NOT outdated
      expect(circuitStore.isTableOutdated).toBe(false);

      // Now add a new component, which modifies the structure
      circuitStore.addComponent('NOT', 150, 200, 'NOT_1');

      // Now table should be marked outdated
      expect(circuitStore.isTableOutdated).toBe(true);

      // Updating table resets outdated status
      circuitStore.generateAssociatedTruthTable();
      expect(circuitStore.isTableOutdated).toBe(false);
    });
  });

  describe('3. Tabla de verdad → Circuito (Síntesis y Verificación)', () => {
    it('debe sintetizar un circuito equivalente en modo STANDARD desde mintérminos y verificar equivalencia', () => {
      // Function XOR: minterms [1, 2] for inputs A, B
      circuitStore.synthesizeCircuitFromTable(['A', 'B'], [1, 2], [], 'STANDARD');

      expect(circuitStore.components.length).toBeGreaterThan(0);
      expect(circuitStore.connections.length).toBeGreaterThan(0);

      // Perform formal comparison between synthesized circuit and target XOR table
      const comparison = circuitStore.compareWithTable({
        inputs: ['A', 'B'],
        outputs: [{ name: 'F', values: [0, 1, 1, 0] }],
        rows: [
          { inputs: { A: 0, B: 0 }, outputs: { F: 0 } },
          { inputs: { A: 0, B: 1 }, outputs: { F: 1 } },
          { inputs: { A: 1, B: 0 }, outputs: { F: 1 } },
          { inputs: { A: 1, B: 1 }, outputs: { F: 0 } },
        ],
      });

      expect(comparison.equivalent).toBe(true);
      expect(comparison.mismatches.length).toBe(0);
      expect(comparison.matchingCombinations).toBe(4);
    });

    it('debe sintetizar e igualar la tabla en modo NAND_ONLY', () => {
      // Majority-of-3 function: minterms [3, 5, 6, 7]
      circuitStore.synthesizeCircuitFromTable(['A', 'B', 'C'], [3, 5, 6, 7], [], 'NAND_ONLY');

      // Check all non-input/non-led gates are NAND
      const logicGates = circuitStore.components.filter(
        (c) => c.type !== 'SWITCH' && c.type !== 'OUTPUT_LED'
      );
      expect(logicGates.every((c) => c.type === 'NAND')).toBe(true);

      // Verify outputs match [0, 0, 0, 1, 0, 1, 1, 1]
      const expectedOutputs: (0 | 1)[] = [0, 0, 0, 1, 0, 1, 1, 1];
      const table = circuitStore.generateAssociatedTruthTable();
      expect(table.success).toBe(true);
      expect(table.rows.length).toBe(8);

      const outName = table.outputVariables[0];
      const actualOutputs = table.rows.map((r) => r.outputs[outName]);
      expect(actualOutputs).toEqual(expectedOutputs);
    });

    it('debe sintetizar e igualar la tabla en modo NOR_ONLY', () => {
      // Function: minterms [1, 2] for 2 variables
      circuitStore.synthesizeCircuitFromTable(['A', 'B'], [1, 2], [], 'NOR_ONLY');

      const logicGates = circuitStore.components.filter(
        (c) => c.type !== 'SWITCH' && c.type !== 'OUTPUT_LED'
      );
      expect(logicGates.every((c) => c.type === 'NOR')).toBe(true);

      const table = circuitStore.generateAssociatedTruthTable();
      expect(table.success).toBe(true);
      const outName = table.outputVariables[0];
      const actualOutputs = table.rows.map((r) => r.outputs[outName]);
      expect(actualOutputs).toEqual([0, 1, 1, 0]);
    });
  });

  describe('4. Verificación Matemática (Comparar Circuito y Tabla)', () => {
    it('debe reportar la combinación exacta cuando el circuito y la tabla no coinciden', () => {
      // Circuit is AND gate: [0, 0, 0, 1]
      const swA = createComponent('SWITCH', 50, 100, 'A');
      const swB = createComponent('SWITCH', 50, 200, 'B');
      const andGate = createComponent('AND', 250, 150, 'AND_1', 2);
      const led = createComponent('OUTPUT_LED', 450, 150, 'F');
      const conns = [
        { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: andGate.id, toPinId: andGate.inputs[0].id, value: 0 as const },
        { id: 'w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: andGate.id, toPinId: andGate.inputs[1].id, value: 0 as const },
        { id: 'w3', fromComponentId: andGate.id, fromPinId: andGate.outputs[0].id, toComponentId: led.id, toPinId: led.inputs[0].id, value: 0 as const },
      ];
      circuitStore.loadCircuit([swA, swB, andGate, led], conns);

      // Target table is OR gate: [0, 1, 1, 1]
      const targetOrTable = {
        inputs: ['A', 'B'],
        outputs: [{ name: 'F', values: [0, 1, 1, 1] as (0 | 1)[] }],
        rows: [
          { inputs: { A: 0, B: 0 } as Record<string, 0 | 1>, outputs: { F: 0 } as Record<string, 0 | 1> },
          { inputs: { A: 0, B: 1 } as Record<string, 0 | 1>, outputs: { F: 1 } as Record<string, 0 | 1> },
          { inputs: { A: 1, B: 0 } as Record<string, 0 | 1>, outputs: { F: 1 } as Record<string, 0 | 1> },
          { inputs: { A: 1, B: 1 } as Record<string, 0 | 1>, outputs: { F: 1 } as Record<string, 0 | 1> },
        ],
      };

      const result = circuitStore.compareWithTable(targetOrTable);

      expect(result.equivalent).toBe(false);
      // Mismatches at rows 1 (01) and 2 (10)
      expect(result.mismatches.length).toBe(2);
      expect(result.mismatches[0].rowIndex).toBe(1);
      expect(result.mismatches[0].expected).toBe(1);
      expect(result.mismatches[0].actual).toBe(0);
      expect(result.mismatches[1].rowIndex).toBe(2);
    });
  });

  describe('5. Validaciones y Diagnósticos', () => {
    it('debe detectar pines sin conectar', () => {
      // AND gate with only 1 input connected
      const swA = createComponent('SWITCH', 50, 100, 'A');
      const andGate = createComponent('AND', 250, 150, 'AND_1', 2);
      const led = createComponent('OUTPUT_LED', 450, 150, 'F');
      const conns = [
        { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: andGate.id, toPinId: andGate.inputs[0].id, value: 0 as const },
        { id: 'w2', fromComponentId: andGate.id, fromPinId: andGate.outputs[0].id, toComponentId: led.id, toPinId: led.inputs[0].id, value: 0 as const },
      ];
      circuitStore.loadCircuit([swA, andGate, led], conns);

      const table = circuitStore.generateAssociatedTruthTable();
      expect(table.unconnectedPins).toBeDefined();
      expect(table.unconnectedPins!.length).toBeGreaterThan(0);
      expect(table.unconnectedPins!.some((p) => p.componentId === andGate.id && p.pinLabel === 'B')).toBe(true);
    });

    it('debe advertir si el circuito contiene componentes secuenciales', () => {
      const dff = createComponent('FLIPFLOP_D', 200, 200, 'DFF_1');
      const sw = createComponent('SWITCH', 50, 200, 'CLK');
      const led = createComponent('OUTPUT_LED', 400, 200, 'Q');

      circuitStore.loadCircuit([dff, sw, led], []);
      const table = circuitStore.generateAssociatedTruthTable();

      expect(table.hasSequentialComponents).toBe(true);
    });
  });
});
