/**
 * Unit tests for TruthTableToolbar: compact and minimizable toolbar for LogicLab
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TruthTableToolbar } from '../components/circuit-editor/TruthTableToolbar';

describe('TruthTableToolbar', () => {
  const mockGenerate = vi.fn();
  const mockView = vi.fn();
  const mockUpdate = vi.fn();
  const mockSynthesize = vi.fn();
  const mockCompare = vi.fn();
  const mockKarnaugh = vi.fn();
  const mockViewKarnaugh = vi.fn();
  const mockSimplify = vi.fn();
  const mockPractice = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders in expanded mode with all 5 main truth table actions and practice button', () => {
    const html = renderToStaticMarkup(
      <TruthTableToolbar
        onGenerateTruthTable={mockGenerate}
        onViewAssociatedTable={mockView}
        onUpdateTable={mockUpdate}
        onGenerateCircuitFromTable={mockSynthesize}
        onCompareCircuitAndTable={mockCompare}
        onGenerateKarnaugh={mockKarnaugh}
        onViewKarnaugh={mockViewKarnaugh}
        onSimplifyFunction={mockSimplify}
        onOpenPractice={mockPractice}
        isTableOutdated={false}
        isMobile={false}
        defaultMinimized={false}
      />
    );

    // 1. Generar tabla de verdad
    expect(html).toContain('Generar tabla');
    expect(html).toContain('Generar tabla de verdad exhaustiva (2ⁿ)');
    // 2. Ver tabla asociada
    expect(html).toContain('Ver tabla');
    expect(html).toContain('Ver tabla de verdad asociada al circuito');
    // 3. Actualizar tabla
    expect(html).toContain('Actualizar');
    expect(html).toContain('Actualizar tabla de verdad con el estado actual del circuito');
    // 4. Generar circuito desde tabla
    expect(html).toContain('Generar circuito desde tabla');
    expect(html).toContain('Introducir o editar una tabla de verdad para sintetizar el circuito en el lienzo');
    // 5. Comparar circuito y tabla
    expect(html).toContain('Comparar');
    expect(html).toContain('Comparar y verificar matemáticamente si el circuito y la tabla son equivalentes');
    // 6. Práctica de sumadores
    expect(html).toContain('Práctica de Sumadores');
    // Minimize button
    expect(html).toContain('Minimizar barra de herramientas (recuperar espacio en el lienzo)');
  });

  it('displays outdated warning indicator on Actualizar tabla when isTableOutdated is true in expanded mode', () => {
    const html = renderToStaticMarkup(
      <TruthTableToolbar
        onGenerateTruthTable={mockGenerate}
        onViewAssociatedTable={mockView}
        onUpdateTable={mockUpdate}
        onGenerateCircuitFromTable={mockSynthesize}
        onCompareCircuitAndTable={mockCompare}
        onGenerateKarnaugh={mockKarnaugh}
        onViewKarnaugh={mockViewKarnaugh}
        onSimplifyFunction={mockSimplify}
        isTableOutdated={true}
        isMobile={false}
        defaultMinimized={false}
      />
    );

    expect(html).toContain('La tabla está desactualizada respecto a los cambios en el circuito');
    expect(html).toContain('animate-spin-slow');
    expect(html).toContain('bg-amber-500');
  });

  it('renders in minimized mode with compact pill, tooltip, and quick menu trigger', () => {
    const html = renderToStaticMarkup(
      <TruthTableToolbar
        onGenerateTruthTable={mockGenerate}
        onViewAssociatedTable={mockView}
        onUpdateTable={mockUpdate}
        onGenerateCircuitFromTable={mockSynthesize}
        onCompareCircuitAndTable={mockCompare}
        onGenerateKarnaugh={mockKarnaugh}
        onViewKarnaugh={mockViewKarnaugh}
        onSimplifyFunction={mockSimplify}
        onOpenPractice={mockPractice}
        isTableOutdated={true}
        isMobile={false}
        defaultMinimized={true}
      />
    );

    // Should contain minimized tooltip
    expect(html).toContain('Herramientas de tabla de verdad (Clic para expandir)');
    // Quick menu trigger
    expect(html).toContain('Menú rápido de acciones de tabla de verdad');
    expect(html).toContain('Tablas');
    // Outdated pulse dot in minimized mode
    expect(html).toContain('La tabla está desactualizada respecto al circuito');
    expect(html).toContain('bg-amber-500 animate-pulse');
  });

  it('automatically defaults to minimized mode on mobile screens', () => {
    const html = renderToStaticMarkup(
      <TruthTableToolbar
        onGenerateTruthTable={mockGenerate}
        onViewAssociatedTable={mockView}
        onUpdateTable={mockUpdate}
        onGenerateCircuitFromTable={mockSynthesize}
        onCompareCircuitAndTable={mockCompare}
        onGenerateKarnaugh={mockKarnaugh}
        onViewKarnaugh={mockViewKarnaugh}
        onSimplifyFunction={mockSimplify}
        isTableOutdated={false}
        isMobile={true}
      />
    );

    // Compact pill on mobile
    expect(html).toContain('Herramientas de tabla de verdad (Clic para expandir)');
    expect(html).not.toContain('Minimizar barra de herramientas');
  });

  it('renders properly without onOpenPractice prop', () => {
    const html = renderToStaticMarkup(
      <TruthTableToolbar
        onGenerateTruthTable={mockGenerate}
        onViewAssociatedTable={mockView}
        onUpdateTable={mockUpdate}
        onGenerateCircuitFromTable={mockSynthesize}
        onCompareCircuitAndTable={mockCompare}
        onGenerateKarnaugh={mockKarnaugh}
        onViewKarnaugh={mockViewKarnaugh}
        onSimplifyFunction={mockSimplify}
        isTableOutdated={false}
        isMobile={false}
        defaultMinimized={false}
      />
    );

    expect(html).toContain('Generar tabla');
    expect(html).not.toContain('Práctica de Sumadores');
  });
});
