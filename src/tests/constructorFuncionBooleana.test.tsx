import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConstructorFuncionBooleana } from '../components/common/ConstructorFuncionBooleana';
import { FuncionBooleana } from '../types/booleanFunction';

describe('ConstructorFuncionBooleana - Reusable Visual Builder', () => {
  it('renders initial visual structure with green border and checkmark button', () => {
    const html = renderToStaticMarkup(
      <ConstructorFuncionBooleana
        initialExpression="A · B + C"
        initialVariables={['A', 'B', 'C']}
      />
    );

    expect(html).toContain('Constructor de Función Booleana');
    // Main input box with green border
    expect(html).toContain('border-emerald-500');
    // Checkmark button
    expect(html).toContain('Confirmar y aplicar expresión');
    // Direct and overline variable labels
    expect(html).toContain('>A<');
    expect(html).toContain('>B<');
    expect(html).toContain('>C<');
    // Logical operators
    expect(html).toContain('AND');
    expect(html).toContain('OR');
    expect(html).toContain('XOR');
    // Values 1 and 0
    expect(html).toContain('>1<');
    expect(html).toContain('>0<');
    // Actions
    expect(html).toContain('Borrar');
    expect(html).toContain('Deshacer');
    expect(html).toContain('Reiniciar');
  });

  it('renders dynamic variable selectors (2, 3, 4, 5, 6)', () => {
    const html = renderToStaticMarkup(
      <ConstructorFuncionBooleana
        initialVarCount={4}
        allowedVarCounts={[2, 3, 4, 5, 6]}
      />
    );

    expect(html).toContain('Variables:');
    expect(html).toContain('>2<');
    expect(html).toContain('>3<');
    expect(html).toContain('>4<');
    expect(html).toContain('>5<');
    expect(html).toContain('>6<');
  });

  it('correctly accepts an existing FuncionBooleana object as initialFunction', () => {
    const mockFn: FuncionBooleana = {
      id: 'test_fn_1',
      name: 'F_Test',
      variableCount: 3,
      variables: ['A', 'B', 'C'],
      expression: "A · B' + C",
      tokens: ['A', ' · ', "B\u0305", ' + ', 'C'],
      minterms: [1, 3, 5, 7, 4],
      maxterms: [0, 2, 6],
      dontCares: [],
      updatedAt: Date.now(),
    };

    const html = renderToStaticMarkup(
      <ConstructorFuncionBooleana
        initialFunction={mockFn}
      />
    );

    expect(html).toContain('border-emerald-500');
    expect(html).toContain('Expresión booleana válida');
  });
});
