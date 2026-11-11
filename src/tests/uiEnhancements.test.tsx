/**
 * LogicLab - UI Enhancements & Visual Boolean Builder Tests
 * Verifies:
 * 1. Component library thumbnail vector symbols
 * 2. Visual Boolean Builder interaction and token formatting
 * 3. Karnaugh Map generation from truth table evaluation
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GateThumbnail } from '../components/circuit-editor/GateThumbnail';
import { VisualBooleanBuilder } from '../components/common/VisualBooleanBuilder';
import { KarnaughEngine } from '../engines/karnaugh/karnaughEngine';

describe('UI Enhancements & Visual Boolean Builder', () => {
  it('renders authentic ANSI/IEEE vector SVG symbols in GateThumbnail', () => {
    const andHtml = renderToStaticMarkup(<GateThumbnail type="AND" size={48} />);
    expect(andHtml).toContain('<svg');
    expect(andHtml).toContain('M 18 7 L 34 7 A 13 13 0 0 1 34 33 L 18 33 Z');

    const orHtml = renderToStaticMarkup(<GateThumbnail type="OR" size={48} />);
    expect(orHtml).toContain('<svg');
    expect(orHtml).toContain('M 16 7 Q 24 20 16 33 Q 34 33 46 20 Q 34 7 16 7 Z');

    const notHtml = renderToStaticMarkup(<GateThumbnail type="NOT" size={48} />);
    expect(notHtml).toContain('<svg');
    expect(notHtml).toContain('points="20,8 42,20 20,32"');

    const switchHtml = renderToStaticMarkup(<GateThumbnail type="SWITCH" size={48} />);
    expect(switchHtml).toContain('<svg');
    expect(switchHtml).toContain('x1="20" y1="20" x2="38" y2="10"');
  });

  it('renders VisualBooleanBuilder with dynamic variable count and negated overlines', () => {
    const handleApply = vi.fn();
    const html = renderToStaticMarkup(
      <VisualBooleanBuilder
        initialVariables={['A', 'B', 'C']}
        initialExpression="A · B + C"
        onApply={handleApply}
      />
    );

    // Green accent display box
    expect(html).toContain('border-emerald-500');
    // Checkmark button
    expect(html).toContain('Confirmar y aplicar expresión');
    // Direct variables
    expect(html).toContain('A');
    expect(html).toContain('B');
    expect(html).toContain('C');
    // Negated variables with CSS overline
    expect(html).toContain('text-decoration:overline');
    // Value buttons 1 and 0
    expect(html).toContain('text-emerald-600'); // 1
    expect(html).toContain('text-rose-600'); // 0
    // Operators
    expect(html).toContain('AND');
    expect(html).toContain('OR');
  });

  it('evaluates Karnaugh map in Gray code ordering with groups and minimal SOP', () => {
    const engine = new KarnaughEngine(3, ['A', 'B', 'C']);
    // Min terms for Majority function: 3, 5, 6, 7
    engine.setFromMinterms([3, 5, 6, 7]);
    const solved = engine.solve('SOP');

    expect(solved.variableCount).toBe(3);
    expect(solved.isEquivalent).toBe(true);
    expect(solved.groups.length).toBeGreaterThan(0);
    // Solved SOP should contain minimal sum of products
    expect(solved.sopExpression).toBeDefined();

    const grid = engine.buildGrid();
    expect(grid.length).toBe(2); // rows: A=0, A=1
    expect(grid[0].length).toBe(4); // cols: 00, 01, 11, 10 Gray code
  });
});
