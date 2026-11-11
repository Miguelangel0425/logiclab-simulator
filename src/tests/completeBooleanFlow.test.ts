/**
 * LogicLab - Complete Boolean Integration Flow Test
 * 
 * Validates the full chain:
 * Crear función → Generar tabla de verdad → Generar mapa de Karnaugh → Simplificar → Generar circuito.
 * Verifies that all steps are logically equivalent across all 2^N combinations.
 */

import { describe, it, expect } from 'vitest';
import { BooleanLogicService } from '../engines/boolean/booleanLogicService';
import { CircuitSimulator } from '../engines/circuit/simulator';

describe('Flujo Completo de Integración Booleana en LogicLab', () => {
  it('ejecuta el ciclo de vida completo: Función → Tabla → Karnaugh → Simplificación → Síntesis con equivalencia formal', () => {
    // 1. Crear función booleana con redundancia
    // F(A, B, C) = A·B + A·B'·C + B·C'
    const originalExpr = "A · B + A · B' · C + B · C'";
    const fn = BooleanLogicService.createFunction(originalExpr, 3, ['A', 'B', 'C'], 'F_Prueba', 'constructor');

    expect(fn).toBeDefined();
    expect(fn.variableCount).toBe(3);
    expect(fn.variables).toEqual(['A', 'B', 'C']);
    expect(fn.minterms.length).toBeGreaterThan(0);

    // 2. Generar tabla de verdad
    const truthTable = BooleanLogicService.generateTruthTable(fn);
    expect(truthTable.totalRows).toBe(8);
    expect(truthTable.rows.length).toBe(8);

    // Verify truth table outputs match the original function evaluation for every row
    truthTable.rows.forEach((row) => {
      const evalOutput = BooleanLogicService.evaluate(fn, row.inputs);
      expect(row.output).toBe(evalOutput);
    });

    // 3. Generar mapa de Karnaugh desde la función
    const kmap = BooleanLogicService.generateKarnaughMap(fn, 'SOP');
    expect(kmap).toBeDefined();
    expect(kmap.grid).toBeDefined();
    expect(kmap.groups.length).toBeGreaterThan(0);
    expect(kmap.sopExpression).toBeDefined();
    expect(kmap.isEquivalent).toBe(true);

    // 4. Simplificar mediante Quine-McCluskey / Petrick
    const simplified = BooleanLogicService.simplify(fn);
    expect(simplified.sopSimplified).toBeDefined();
    expect(simplified.primeImplicants.length).toBeGreaterThan(0);

    // 5. Verificar equivalencia formal entre la función original y la expresión minimizada
    const eqCheck = BooleanLogicService.checkEquivalence(fn.expression, simplified.sopSimplified);
    expect(eqCheck.equivalent).toBe(true);
    expect(eqCheck.mismatches.length).toBe(0);
    expect(eqCheck.matchingCount).toBe(8);

    // 6. Generar / sintetizar circuito equivalente
    const circuit = BooleanLogicService.synthesizeCircuit(simplified.sopSimplified, 'STANDARD');
    expect(circuit.components.length).toBeGreaterThan(0);
    expect(circuit.connections.length).toBeGreaterThan(0);

    // 7. Simular el circuito sintetizado y comparar contra la tabla de verdad original
    const simResult = CircuitSimulator.generateTruthTable(circuit.components, circuit.connections);
    expect(simResult.success).toBe(true);

    // For each simulated row, the output of the synthesized circuit must match the function
    simResult.rows.forEach((simRow) => {
      const expectedOutput = BooleanLogicService.evaluate(fn, simRow.inputs);
      const circuitOutput = simRow.outputs[simResult.outputVariables[0]];
      expect(circuitOutput).toBe(expectedOutput);
    });
  });

  it('verifica sincronización entre representaciones canónicas (Minterms, Maxterms y Tabla)', () => {
    // Paridad impar / XOR de 3 variables: A ^ B ^ C (Minterms: 1, 2, 4, 7)
    const minterms = [1, 2, 4, 7];
    const fnFromMinterms = BooleanLogicService.createFunctionFromMinterms(minterms, 3, [], ['A', 'B', 'C']);

    expect(fnFromMinterms.minterms).toEqual(minterms);
    expect(fnFromMinterms.maxterms).toEqual([0, 3, 5, 6]);

    // Comprobar mapa de Karnaugh generado desde minterms
    const kmap = BooleanLogicService.generateKarnaughMap(fnFromMinterms, 'SOP');
    expect(kmap.isEquivalent).toBe(true);
  });
});
