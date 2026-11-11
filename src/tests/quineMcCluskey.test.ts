import { describe, it, expect } from 'vitest';
import { QuineMcCluskeyEngine } from '../engines/boolean/quineMcCluskey';

describe('Quine-McCluskey Minimization Engine & Truth Table Verification', () => {
  it('simplifies 2-variable OR function: Σm(1, 2, 3) -> A + B or B + A and verifies equivalence', () => {
    const qm = new QuineMcCluskeyEngine(['A', 'B'], [1, 2, 3]);
    const res = qm.solve();

    expect(res.primeImplicants.length).toBe(2);
    expect(res.literalsAfter).toBe(2);
    expect(res.isVerifiedEquivalent).toBe(true);

    const isVerified = QuineMcCluskeyEngine.verifyEquivalence(
      ['A', 'B'],
      [1, 2, 3],
      [],
      res.sopSimplified,
      true
    );
    expect(isVerified).toBe(true);
  });

  it('simplifies tautology (all 1s) to 1 and contradiction (all 0s) to 0', () => {
    const qm1 = new QuineMcCluskeyEngine(['A', 'B'], [0, 1, 2, 3]);
    const res1 = qm1.solve();
    expect(res1.sopSimplified).toBe('1');
    expect(res1.posSimplified).toBe('1');
    expect(res1.isVerifiedEquivalent).toBe(true);

    const qm0 = new QuineMcCluskeyEngine(['A', 'B'], []);
    const res0 = qm0.solve();
    expect(res0.sopSimplified).toBe('0');
    expect(res0.posSimplified).toBe('0');
    expect(res0.isVerifiedEquivalent).toBe(true);
  });

  it('solves classic 4-variable 4-corners problem: Σm(0, 2, 8, 10) -> B\'D\'', () => {
    // 0: 0000, 2: 0010, 8: 1000, 10: 1010
    // Differ in A and C, keeping B=0 and D=0 -> B'D'
    const qm = new QuineMcCluskeyEngine(['A', 'B', 'C', 'D'], [0, 2, 8, 10]);
    const res = qm.solve();

    expect(res.sopSimplified).toBe("B'D'");
    expect(res.literalsAfter).toBe(2);
    expect(res.isVerifiedEquivalent).toBe(true);

    // Verify POS dual also matches truth table
    expect(
      QuineMcCluskeyEngine.verifyEquivalence(
        ['A', 'B', 'C', 'D'],
        [0, 2, 8, 10],
        [],
        res.posSimplified,
        false
      )
    ).toBe(true);
  });

  it('handles don\'t-care conditions to reduce literals and form maximal covers', () => {
    // Without don't care: Σm(0, 1) -> A'
    // With don't care d(2, 3): full 4-cell group -> 1
    const qm = new QuineMcCluskeyEngine(['A', 'B'], [0, 1], [2, 3]);
    const res = qm.solve();
    expect(res.sopSimplified).toBe('1');
    expect(res.isVerifiedEquivalent).toBe(true);
  });

  it('correctly solves single minterm edge case: Σm(0) in 3 variables -> A\'B\'C\'', () => {
    const qm = new QuineMcCluskeyEngine(['A', 'B', 'C'], [0]);
    const res = qm.solve();
    expect(res.sopSimplified).toBe("A'B'C'");
    expect(res.essentialPrimeImplicants.length).toBe(1);
    expect(res.isVerifiedEquivalent).toBe(true);
  });

  it('correctly solves single maxterm edge case: ΠM(0) (all 1s except 0) -> A + B + C', () => {
    // Minterms are 1, 2, 3, 4, 5, 6, 7. Maxterm is 0.
    const qm = new QuineMcCluskeyEngine(['A', 'B', 'C'], [1, 2, 3, 4, 5, 6, 7]);
    const res = qm.solve();
    expect(res.posSimplified).toBe('(A + B + C)');
    expect(res.isVerifiedEquivalent).toBe(true);
  });

  it('solves exclusive-OR pattern: Σm(1, 2) in 2 variables', () => {
    const qm = new QuineMcCluskeyEngine(['A', 'B'], [1, 2]);
    const res = qm.solve();
    // Cannot be minimized further in SOP: A'B + AB' (or AB' + A'B)
    expect(res.primeImplicants.length).toBe(2);
    expect(res.essentialPrimeImplicants.length).toBe(2);
    expect(res.isVerifiedEquivalent).toBe(true);
  });

  it('solves classic cyclic core with no essential prime implicants on first pass: Σm(1, 2, 5, 6)', () => {
    // 3 variables A, B, C:
    // 1: 001, 2: 010, 5: 101, 6: 110
    // PIs: 1&5 -> -01 (B'C), 2&6 -> -10 (BC'), 1&2 cannot combine, 5&6 cannot combine
    const qm = new QuineMcCluskeyEngine(['A', 'B', 'C'], [1, 2, 5, 6]);
    const res = qm.solve();
    expect(res.isVerifiedEquivalent).toBe(true);

    const isTruthTableCorrect = QuineMcCluskeyEngine.verifyEquivalence(
      ['A', 'B', 'C'],
      [1, 2, 5, 6],
      [],
      res.sopSimplified,
      true
    );
    expect(isTruthTableCorrect).toBe(true);
  });

  it('solves 5-variable problem across both layers: Σm(0, 1, 2, 3, 16, 17, 18, 19)', () => {
    // Layer A=0 (0..3) has B=0, C=0, D and E vary
    // Layer A=1 (16..19) has B=0, C=0, D and E vary
    // Across layers, A also varies (0 and 1).
    // Result must cancel A, D, E leaving B'C'
    const qm = new QuineMcCluskeyEngine(
      ['A', 'B', 'C', 'D', 'E'],
      [0, 1, 2, 3, 16, 17, 18, 19]
    );
    const res = qm.solve();
    expect(res.sopSimplified).toBe("B'C'");
    expect(res.isVerifiedEquivalent).toBe(true);

    const isTruthTableCorrect = QuineMcCluskeyEngine.verifyEquivalence(
      ['A', 'B', 'C', 'D', 'E'],
      [0, 1, 2, 3, 16, 17, 18, 19],
      [],
      res.sopSimplified,
      true
    );
    expect(isTruthTableCorrect).toBe(true);
  });

  it('rejects declaring minimal solution if simulated truth table check fails', () => {
    // Verify that QuineMcCluskeyEngine.verifyEquivalence correctly catches flawed expressions
    const flawedExpr = "A'B"; // only covers m1, not m2 or m3
    const isValid = QuineMcCluskeyEngine.verifyEquivalence(['A', 'B'], [1, 2, 3], [], flawedExpr, true);
    expect(isValid).toBe(false);
  });
});
