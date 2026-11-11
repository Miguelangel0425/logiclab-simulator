import { describe, it, expect } from 'vitest';
import { BooleanParser, evaluateAST, extractVariables } from '../engines/boolean/evaluator';

describe('Boolean Evaluator & Parser', () => {
  it('correctly parses and evaluates simple AND, OR, NOT operations', () => {
    const p1 = new BooleanParser("A' · B + C");
    const ast = p1.parse();
    expect(extractVariables(ast)).toEqual(['A', 'B', 'C']);

    // A=0, B=1, C=0 -> A'=1, 1·1 + 0 = 1
    expect(evaluateAST(ast, { A: 0, B: 1, C: 0 })).toBe(1);

    // A=1, B=1, C=0 -> A'=0, 0·1 + 0 = 0
    expect(evaluateAST(ast, { A: 1, B: 1, C: 0 })).toBe(0);

    // A=1, B=1, C=1 -> 0·1 + 1 = 1
    expect(evaluateAST(ast, { A: 1, B: 1, C: 1 })).toBe(1);
  });

  it('correctly handles parentheses and precedence', () => {
    const parser = new BooleanParser("(A + B) · C'");
    const ast = parser.parse();

    expect(evaluateAST(ast, { A: 1, B: 0, C: 0 })).toBe(1);
    expect(evaluateAST(ast, { A: 1, B: 0, C: 1 })).toBe(0);
    expect(evaluateAST(ast, { A: 0, B: 0, C: 0 })).toBe(0);
  });

  it('evaluates De Morgan equivalence: (A + B)\' == A\'B\'', () => {
    const p1 = new BooleanParser("(A + B)'");
    const ast1 = p1.parse();

    const p2 = new BooleanParser("A'B'");
    const ast2 = p2.parse();

    const combinations = [
      { A: 0, B: 0 },
      { A: 0, B: 1 },
      { A: 1, B: 0 },
      { A: 1, B: 1 },
    ];

    for (const c of combinations) {
      expect(evaluateAST(ast1, c as any)).toBe(evaluateAST(ast2, c as any));
    }
  });
});
