import { describe, it, expect } from 'vitest';
import { KarnaughEngine } from '../engines/karnaugh/karnaughEngine';

describe('Karnaugh Map Engine', () => {
  it('verifies Gray code ordering on 2, 3, 4 and 5 variable maps', () => {
    const k2 = new KarnaughEngine(2);
    const grid2 = k2.buildGrid();
    expect(grid2.map((r) => r[0].grayRow)).toEqual(['0', '1']);
    expect(grid2[0].map((c) => c.grayCol)).toEqual(['0', '1']);

    const k3 = new KarnaughEngine(3);
    const grid3 = k3.buildGrid();
    expect(grid3.map((r) => r[0].grayRow)).toEqual(['0', '1']);
    expect(grid3[0].map((c) => c.grayCol)).toEqual(['00', '01', '11', '10']);

    const k4 = new KarnaughEngine(4);
    const grid4 = k4.buildGrid();
    expect(grid4.map((r) => r[0].grayRow)).toEqual(['00', '01', '11', '10']);
    expect(grid4[0].map((c) => c.grayCol)).toEqual(['00', '01', '11', '10']);

    const k5 = new KarnaughEngine(5);
    const grid5Layer0 = k5.buildGrid(0);
    const grid5Layer1 = k5.buildGrid(1);
    expect(grid5Layer0[0][0].mintermIndex).toBe(0);
    expect(grid5Layer1[0][0].mintermIndex).toBe(16);
  });

  it('correctly groups toroidal 4-corners on a 4-variable map: Σm(0, 2, 8, 10)', () => {
    const k = new KarnaughEngine(4);
    k.setFromMinterms([0, 2, 8, 10]);
    const res = k.solve('SOP');

    expect(res.sopExpression).toBe("B'D'");
    expect(res.groups.length).toBe(1);
    expect(res.groups[0].cells.length).toBe(4);
    expect(res.isEquivalent).toBe(true);
  });

  it('handles 3-variable adjacent grouping: Σm(0, 1, 2, 3) -> A\'', () => {
    const k = new KarnaughEngine(3);
    k.setFromMinterms([0, 1, 2, 3]);
    const res = k.solve('SOP');

    expect(res.sopExpression).toBe("A'");
    expect(res.isEquivalent).toBe(true);
  });

  it('correctly groups maxterms (0s) when solving in POS mode', () => {
    // 2-variable function with minterms {1, 2, 3}. Maxterm is {0}.
    // In POS mode, it must group cell 0 and produce (A + B).
    const k = new KarnaughEngine(2);
    k.setFromMinterms([1, 2, 3]);
    const res = k.solve('POS');

    expect(res.posExpression).toBe('(A + B)');
    expect(res.groups.length).toBe(1);
    expect(res.groups[0].minterms).toEqual([0]);
    expect(res.groups[0].expression).toBe('(A + B)');
    expect(res.isEquivalent).toBe(true);
  });

  it('correctly handles horizontal edge adjacency (left column 00 wraps to right column 10)', () => {
    // 3 variables: m0 (000), m2 (010), m4 (100), m6 (110)
    // Left col is 00 (m0, m4), right col is 10 (m2, m6).
    // They are adjacent across toroidal boundary!
    // Group of 4 covers {0, 2, 4, 6} -> C'
    const k = new KarnaughEngine(3);
    k.setFromMinterms([0, 2, 4, 6]);
    const res = k.solve('SOP');

    expect(res.sopExpression).toBe("C'");
    expect(res.groups.length).toBe(1);
    expect(res.groups[0].cells.length).toBe(4);
    expect(res.isEquivalent).toBe(true);
  });

  it('correctly handles 5-variable dual-layer sub-maps', () => {
    const k = new KarnaughEngine(5);
    k.setFromMinterms([0, 1, 2, 3, 16, 17, 18, 19]);
    const res = k.solve('SOP', 0);

    expect(res.sopExpression).toBe("B'C'");
    expect(res.isEquivalent).toBe(true);
    expect(res.subGrids).toBeDefined();
    expect(res.subGrids?.length).toBe(2);
  });
});
