import { describe, it, expect } from 'vitest';
import { BooleanLogicService } from '../engines/boolean/booleanLogicService';

describe('BooleanLogicService - Centralized Logic Engine', () => {
  it('creates a complete FuncionBooleana from an algebraic expression', () => {
    const fn = BooleanLogicService.createFunction("A·B + A'·C", 3, ['A', 'B', 'C']);

    expect(fn).toBeDefined();
    expect(fn.variableCount).toBe(3);
    expect(fn.variables).toEqual(['A', 'B', 'C']);
    expect(fn.truthTable).toBeDefined();
    expect(fn.truthTable?.rows.length).toBe(8);
    // Rows where (A & B) | (!A & C) is 1:
    // A=0, B=0, C=1 -> 1 (index 1)
    // A=0, B=1, C=1 -> 1 (index 3)
    // A=1, B=1, C=0 -> 1 (index 6)
    // A=1, B=1, C=1 -> 1 (index 7)
    expect(fn.minterms).toEqual([1, 3, 6, 7]);
    expect(fn.maxterms).toEqual([0, 2, 4, 5]);
    expect(fn.simplifiedSop).toBeDefined();
  });

  it('evaluates expression correctly with given input map', () => {
    const fn = BooleanLogicService.createFunction("A·B + C");

    expect(BooleanLogicService.evaluate(fn, { A: 1, B: 1, C: 0 })).toBe(1);
    expect(BooleanLogicService.evaluate(fn, { A: 1, B: 0, C: 0 })).toBe(0);
    expect(BooleanLogicService.evaluate(fn, { A: 0, B: 0, C: 1 })).toBe(1);
    expect(BooleanLogicService.evaluate("A ^ B", { A: 1, B: 1 })).toBe(0);
    expect(BooleanLogicService.evaluate("A ^ B", { A: 1, B: 0 })).toBe(1);
  });

  it('generates a full truth table matrix', () => {
    const table = BooleanLogicService.generateTruthTable("A·B", ['A', 'B']);

    expect(table.totalRows).toBe(4);
    expect(table.rows[0].output).toBe(0); // 00
    expect(table.rows[1].output).toBe(0); // 01
    expect(table.rows[2].output).toBe(0); // 10
    expect(table.rows[3].output).toBe(1); // 11
  });

  it('generates Karnaugh map with Gray code and groupings', () => {
    const fn = BooleanLogicService.createFunction("A·B + B·C", 3, ['A', 'B', 'C']);
    const kmap = BooleanLogicService.generateKarnaughMap(fn, 'SOP');

    expect(kmap).toBeDefined();
    expect(kmap.grid).toBeDefined();
    expect(kmap.groups.length).toBeGreaterThan(0);
    expect(kmap.steps.length).toBeGreaterThan(0);
  });

  it('simplifies expressions via Quine-McCluskey minimization', () => {
    // Redundant function: A·B + A·B' = A
    const fn = BooleanLogicService.createFunction("A·B + A·B'", 2, ['A', 'B']);
    const simplified = BooleanLogicService.simplify(fn);

    expect(simplified.sopSimplified).toBe('A');
  });

  it('checks logical equivalence between two functions or expressions', () => {
    // De Morgan: (A + B)' <=> A' · B'
    const eq1 = BooleanLogicService.checkEquivalence("(A + B)'", "A' · B'");
    expect(eq1.equivalent).toBe(true);
    expect(eq1.mismatches.length).toBe(0);

    // Non-equivalent: A + B vs A · B
    const eq2 = BooleanLogicService.checkEquivalence("A + B", "A · B");
    expect(eq2.equivalent).toBe(false);
    expect(eq2.mismatches.length).toBeGreaterThan(0);
  });

  it('synthesizes equivalent circuit components and connections', () => {
    const fn = BooleanLogicService.createFunction("A·B + C", 3, ['A', 'B', 'C']);
    const circuit = BooleanLogicService.synthesizeCircuit(fn, 'STANDARD');

    expect(circuit.components.length).toBeGreaterThan(0);
    expect(circuit.connections.length).toBeGreaterThan(0);
  });
});
