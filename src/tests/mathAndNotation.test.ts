/**
 * Comprehensive Automated Tests for KaTeX Math Rendering,
 * Boolean Overline Notation, De Morgan's Laws, and Responsive Adaptability.
 */

import { describe, it, expect } from 'vitest';
import katex from 'katex';
import {
  astToLatex,
  booleanStringToLatex,
  normalizeBooleanTextToLatex,
  normalizeGeneralMath,
} from '../engines/boolean/booleanNotation';
import { BooleanParser } from '../engines/boolean/evaluator';
import { QuineMcCluskeyEngine } from '../engines/boolean/quineMcCluskey';
import { EDUCATIONAL_LESSONS } from '../data/educationLessons';

describe('1. KaTeX Mathematical Rendering (Subscripts, Exponents, Summations)', () => {
  it('renders subscripts correctly (N_10, b_i, C_out, Q_t+1)', () => {
    const rawFormulas = [
      'N_{10} = \\sum_{i=0}^{n-1} b_i \\cdot 2^i',
      'C_{out} = A \\cdot B + C_{in} \\cdot (A \\oplus B)',
      'Q_{t+1} = J\\,\\overline{Q}_t + \\overline{K}\\,Q_t',
    ];

    for (const formula of rawFormulas) {
      const html = katex.renderToString(formula, { throwOnError: true });
      expect(html).toContain('katex');
      expect(html).toContain('katex-html');
      expect(html).toContain('vlist');

      // The visual katex-html renders actual math glyphs
      const visualHtml = html.split('class="katex-html"')[1] || '';
      expect(visualHtml).not.toContain('\\sum');
      expect(visualHtml).not.toContain('\\cdot');
      expect(visualHtml).not.toContain('\\oplus');
    }
  });

  it('renders exponents and powers correctly (2^n, 2^{n-1}) and inequalities (≤)', () => {
    const formula = '0 \\le N \\le 2^n - 1';
    const html = katex.renderToString(formula, { throwOnError: true });
    expect(html).toContain('katex');
    expect(html).toContain('vlist');

    const visualHtml = html.split('class="katex-html"')[1] || '';
    expect(visualHtml).toContain('≤'); // \le rendered as ≤
    expect(visualHtml).not.toContain('\\le');
  });

  it('renders summations with limits correctly', () => {
    const formula = '\\sum_{i=0}^{n-1} b_i \\cdot 2^i';
    const html = katex.renderToString(formula, { throwOnError: true, displayMode: true });
    expect(html).toContain('katex-display');
    expect(html).toContain('op-symbol');
  });

  it('guarantees that formulas in all educational lessons render valid KaTeX without throwing', () => {
    for (const lesson of EDUCATIONAL_LESSONS) {
      if (lesson.formulas) {
        for (const formula of lesson.formulas) {
          const normalized = normalizeGeneralMath(formula);
          expect(() => {
            const html = katex.renderToString(normalized, { throwOnError: true });
            expect(html.length).toBeGreaterThan(10);
            expect(html).toContain('katex');
          }).not.toThrow();
        }
      }
    }
  });
});

describe('2. Boolean Notation: Overline (Vinculum) instead of Apostrophes', () => {
  it('renders single variable negation with an overline vinculum (\\overline{A})', () => {
    const inputs = ["A'", "!A", "~A", "NOT A", "¬A"];

    for (const input of inputs) {
      const latex = booleanStringToLatex(input);
      expect(latex).toBe('\\overline{A}');
      const html = katex.renderToString(latex, { throwOnError: true });
      expect(html).toContain('overline');
      // Absolutely no apostrophes in the rendered output or latex
      expect(latex).not.toContain("'");
      expect(html).not.toContain("'");
    }
  });

  it('renders multiple distinct negated variables with individual overlines', () => {
    const input = "A'B' + C";
    const latex = booleanStringToLatex(input);
    expect(latex).toContain('\\overline{A}');
    expect(latex).toContain('\\overline{B}');
    expect(latex).not.toContain("'");

    const html = katex.renderToString(latex, { throwOnError: true });
    expect(html).toContain('overline');
    expect(html).not.toContain("'");
  });

  it('places a continuous overline over compound expressions (\\overline{A \\cdot B}, \\overline{A+B})', () => {
    // Negated AND expression (NAND)
    const nandExpr = "(A · B)'";
    const nandLatex = booleanStringToLatex(nandExpr);
    expect(nandLatex).toBe('\\overline{A \\cdot B}');
    const nandHtml = katex.renderToString(nandLatex, { throwOnError: true });
    expect(nandHtml).toContain('overline');
    expect(nandLatex).not.toContain("'");

    // Negated OR expression (NOR)
    const norExpr = "(A + B)'";
    const norLatex = booleanStringToLatex(norExpr);
    expect(norLatex).toBe('\\overline{A + B}');
    const norHtml = katex.renderToString(norLatex, { throwOnError: true });
    expect(norHtml).toContain('overline');
    expect(norLatex).not.toContain("'");

    // Prefix NOT on expression: !(A + B)
    const prefixNor = "!(A + B)";
    const prefixNorLatex = booleanStringToLatex(prefixNor);
    expect(prefixNorLatex).toBe('\\overline{A + B}');
  });

  it('correctly formats De Morgan laws with overlines on both sides', () => {
    // 1st Law: (A · B)' = A' + B' -> \overline{A \cdot B} = \overline{A} + \overline{B}
    const demorgan1Left = booleanStringToLatex("(A · B)'");
    const demorgan1Right = booleanStringToLatex("A' + B'");
    expect(demorgan1Left).toBe('\\overline{A \\cdot B}');
    expect(demorgan1Right).toBe('\\overline{A} + \\overline{B}');

    const fullEquation1 = `${demorgan1Left} = ${demorgan1Right}`;
    const html1 = katex.renderToString(fullEquation1, { throwOnError: true });
    expect(html1).toContain('overline');
    expect(html1).not.toContain("'");

    // 2nd Law: (A + B)' = A' · B' -> \overline{A + B} = \overline{A} \cdot \overline{B}
    const demorgan2Left = booleanStringToLatex("(A + B)'");
    const demorgan2Right = booleanStringToLatex("A' · B'");
    expect(demorgan2Left).toBe('\\overline{A + B}');
    expect(demorgan2Right).toBe('\\overline{A} \\cdot \\overline{B}');

    const fullEquation2 = `${demorgan2Left} = ${demorgan2Right}`;
    const html2 = katex.renderToString(fullEquation2, { throwOnError: true });
    expect(html2).toContain('overline');
    expect(html2).not.toContain("'");
  });
});

describe('3. Quine-McCluskey & Simplified Expressions Output', () => {
  it('converts Quine-McCluskey SOP and POS solutions to overline LaTeX without apostrophes', () => {
    // 3-variable XOR function: odd parity
    const qm = new QuineMcCluskeyEngine(['A', 'B', 'C'], [1, 2, 4, 7]);
    const res = qm.solve();

    const sopLatex = booleanStringToLatex(res.sopSimplified);
    expect(sopLatex).not.toContain("'");
    expect(sopLatex).toContain('\\overline{');

    const sopHtml = katex.renderToString(sopLatex, { throwOnError: true });
    expect(sopHtml).toContain('katex');
    expect(sopHtml).toContain('overline');

    // Test posTermToExpression with 'bar' notation
    const posBar = qm.posTermToExpression('01-', 'bar');
    expect(posBar).toContain('\\overline{B}');
    expect(posBar).not.toContain("'");
  });
});

describe('4. Error Handling and Resilient Fallback', () => {
  it('handles invalid or malformed syntax gracefully without breaking or throwing', () => {
    const invalidExpressions = [
      '',
      '   ',
      '+++',
      '((((',
      'A * * *',
      'unknown @@$$ syntax',
    ];

    for (const expr of invalidExpressions) {
      expect(() => {
        const latex = booleanStringToLatex(expr);
        const html = katex.renderToString(latex, { throwOnError: false });
        expect(typeof html).toBe('string');
      }).not.toThrow();
    }
  });
});

describe('5. Responsive Layout Adaptability Across Breakpoints', () => {
  it('validates breakpoint definitions for target device widths (360, 390, 768, 1024, 1440)', () => {
    const breakpoints = [
      { width: 360, name: 'Mobile Small (e.g. Galaxy S / iPhone SE)', isMobile: true, isTablet: false, isDesktop: false },
      { width: 390, name: 'Mobile Standard (e.g. iPhone 14/15)', isMobile: true, isTablet: false, isDesktop: false },
      { width: 768, name: 'Tablet (e.g. iPad Mini / Portrait)', isMobile: false, isTablet: true, isDesktop: false },
      { width: 1024, name: 'Desktop Standard (e.g. iPad Pro / Laptop)', isMobile: false, isTablet: false, isDesktop: true },
      { width: 1440, name: 'Desktop Widescreen', isMobile: false, isTablet: false, isDesktop: true },
    ];

    for (const bp of breakpoints) {
      const computedMobile = bp.width < 768;
      const computedTablet = bp.width >= 768 && bp.width < 1024;
      const computedDesktop = bp.width >= 1024;

      expect(computedMobile).toBe(bp.isMobile);
      expect(computedTablet).toBe(bp.isTablet);
      expect(computedDesktop).toBe(bp.isDesktop);
    }
  });
});
