/**
 * LogicLab - Interactive Karnaugh Map Module (2, 3, 4, 5 variables)
 * Gray code ordering, toroidal wrapping, 4-corner group detection, SOP/POS, step-by-step pedagógica
 */

import React, { useState, useMemo, useEffect } from 'react';
import { KarnaughEngine } from '../engines/karnaugh/karnaughEngine';
import { useAppStore } from '../store/useAppStore';
import { useCircuitStore } from '../store/useCircuitStore';
import { CircuitGenerator } from '../engines/circuit/generator';
import { BooleanParser, evaluateAST } from '../engines/boolean/evaluator';
import { VisualBooleanBuilder } from '../components/common/VisualBooleanBuilder';
import { LogicValue } from '../types';
import {
  Grid,
  Sparkles,
  Cpu,
  Layers,
  HelpCircle,
  RefreshCw,
  Info,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { BooleanExpression, MathInline } from '../components/math';

export const KarnaughPage: React.FC = () => {
  const { setActiveTab, showToast, sharedBooleanFunction } = useAppStore();
  const { loadCircuit } = useCircuitStore();

  const [varCount, setVarCount] = useState<number>(4);
  const [inputMethod, setInputMethod] = useState<'visual' | 'manual'>('visual');
  const [visualExpr, setVisualExpr] = useState<string>('A · B + C');
  const [mintermsInput, setMintermsInput] = useState<string>('0, 2, 5, 7, 8, 10, 13, 15');
  const [dontCaresInput, setDontCaresInput] = useState<string>('');
  const [mode, setMode] = useState<'SOP' | 'POS'>('SOP');
  const [selectedSubMap, setSelectedSubMap] = useState<number>(0);

  // Manual cell override map: mintermIndex -> 0 | 1 | 'X'
  const [cellOverrides, setCellOverrides] = useState<Record<number, LogicValue>>({});

  // Synchronize when coming from another section
  useEffect(() => {
    if (sharedBooleanFunction) {
      if (sharedBooleanFunction.variableCount) {
        setVarCount(Math.min(5, Math.max(2, sharedBooleanFunction.variableCount)));
      }
      if (sharedBooleanFunction.expression) {
        setVisualExpr(sharedBooleanFunction.expression);
      }
      if (sharedBooleanFunction.minterms && sharedBooleanFunction.minterms.length > 0) {
        setMintermsInput(sharedBooleanFunction.minterms.join(', '));
      }
      if (sharedBooleanFunction.dontCares && sharedBooleanFunction.dontCares.length > 0) {
        setDontCaresInput(sharedBooleanFunction.dontCares.join(', '));
      }
      setCellOverrides({});
      showToast('info', `Cargado mapa desde ${sharedBooleanFunction.source || 'otro módulo'}`);
    }
  }, [sharedBooleanFunction]);

  // Parse minterms & don't cares
  const parsedMinterms = useMemo(() => {
    if (inputMethod === 'visual') {
      try {
        const parser = new BooleanParser(visualExpr);
        const ast = parser.parse();
        const vars = ['A', 'B', 'C', 'D', 'E'].slice(0, varCount);
        const total = Math.pow(2, varCount);
        const list: number[] = [];
        for (let i = 0; i < total; i++) {
          const bin = i.toString(2).padStart(varCount, '0');
          const testVals: Record<string, 0 | 1> = {};
          vars.forEach((v, idx) => {
            testVals[v] = parseInt(bin[idx], 10) as 0 | 1;
          });
          if (evaluateAST(ast, testVals) === 1) {
            list.push(i);
          }
        }
        return list;
      } catch {
        // fallback
      }
    }
    return mintermsInput
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0 && n < Math.pow(2, varCount));
  }, [inputMethod, visualExpr, mintermsInput, varCount]);

  const parsedDontCares = useMemo(() => {
    return dontCaresInput
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0 && n < Math.pow(2, varCount));
  }, [dontCaresInput, varCount]);

  // Build and solve Karnaugh engine
  const kResult = useMemo(() => {
    const engine = new KarnaughEngine(varCount);
    engine.setFromMinterms(parsedMinterms, parsedDontCares);

    // Apply manual cell overrides
    Object.entries(cellOverrides).forEach(([k, val]) => {
      engine.setCell(parseInt(k, 10), val);
    });

    return engine.solve(mode, selectedSubMap);
  }, [varCount, parsedMinterms, parsedDontCares, cellOverrides, mode, selectedSubMap]);

  // Toggle cell on click
  const handleCellClick = (mintermIndex: number, currentVal: LogicValue) => {
    const nextVal: LogicValue = currentVal === 0 ? 1 : currentVal === 1 ? 'X' : 0;
    setCellOverrides((prev) => ({
      ...prev,
      [mintermIndex]: nextVal,
    }));
  };

  const handleReset = () => {
    setCellOverrides({});
    setMintermsInput('');
    setDontCaresInput('');
  };

  // Synthesize circuit straight from minimal expression
  const handleSynthesizeCircuit = () => {
    try {
      const expr = mode === 'SOP' ? kResult.sopExpression : kResult.posExpression;
      const { components, connections } = CircuitGenerator.fromExpression(expr, 'STANDARD');
      loadCircuit(components, connections);
      setActiveTab('circuit');
      showToast('success', `Circuito mínimo de Karnaugh (${expr}) sintetizado en el lienzo.`);
    } catch {
      showToast('error', 'Error al sintetizar circuito a partir del mapa de Karnaugh.');
    }
  };

  // Color mapper for groups
  const getCellGroupBorder = (mintermIndex: number) => {
    const matchingGroups = kResult.groups.filter((g) => g.minterms.includes(mintermIndex));
    if (matchingGroups.length === 0) return null;
    return matchingGroups[0].color;
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[var(--bg-base)] p-4 md:p-6 text-[var(--text-primary)] select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Grid className="w-5 h-5 text-blue-500" />
              <span>Mapas de Karnaugh (K-Maps)</span>
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Optimización visual en Código Gray, agrupaciones potencia de 2, continuidad toroidal y esquinas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSynthesizeCircuit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Cpu className="w-4 h-4" />
              <span>Sintetizar Circuito</span>
            </button>
          </div>
        </div>

        {/* Configuration Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Variable Count & Mode */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Número de Variables
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[2, 3, 4, 5].map((count) => (
                  <button
                    key={count}
                    onClick={() => {
                      setVarCount(count);
                      setCellOverrides({});
                    }}
                    className={`py-1.5 rounded-md text-xs font-bold transition-all ${
                      varCount === count
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {count} Vars
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Forma Canónica a Optimizar
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setMode('SOP')}
                  className={`py-1.5 rounded-md text-xs font-bold transition-all ${
                    mode === 'SOP'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  SOP (Agrupa 1s)
                </button>
                <button
                  onClick={() => setMode('POS')}
                  className={`py-1.5 rounded-md text-xs font-bold transition-all ${
                    mode === 'POS'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  POS (Agrupa 0s)
                </button>
              </div>
            </div>
          </div>

          {/* Input Card: Visual Builder or Minterms */}
          <div className="md:col-span-2 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setInputMethod('visual')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    inputMethod === 'visual'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Constructor Visual
                </button>
                <button
                  type="button"
                  onClick={() => setInputMethod('manual')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    inputMethod === 'manual'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Mintérminos Σm
                </button>
              </div>

              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            </div>

            {inputMethod === 'visual' ? (
              <div className="space-y-2">
                <VisualBooleanBuilder
                  initialVariables={['A', 'B', 'C', 'D', 'E'].slice(0, varCount)}
                  initialExpression={visualExpr}
                  onExpressionChange={(expr) => setVisualExpr(expr)}
                  onSubmit={(expr) => {
                    setVisualExpr(expr);
                    setCellOverrides({});
                    showToast('success', 'Función booleana validada y mapeada en código Gray');
                  }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Minterms Σm (Separados por comas)
                  </label>
                  <input
                    type="text"
                    value={mintermsInput}
                    onChange={(e) => {
                      setMintermsInput(e.target.value);
                      setCellOverrides({});
                    }}
                    placeholder="ej: 0, 1, 4, 8, 12"
                    className="w-full bg-[var(--bg-surface-sub)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    Condiciones Don't-Care d(...)
                  </label>
                  <input
                    type="text"
                    value={dontCaresInput}
                    onChange={(e) => {
                      setDontCaresInput(e.target.value);
                      setCellOverrides({});
                    }}
                    placeholder="ej: 2, 6, 14"
                    className="w-full bg-[var(--bg-surface-sub)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1">
              <span>Haga clic en cualquier celda del mapa para alternar: <strong>0 → 1 → X</strong></span>
            </div>
          </div>
        </div>

        {/* Minimal Result Banner */}
        <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                Resultado Mínimo {mode} Simplificado
              </span>
              <div className="py-1 overflow-x-auto">
                <BooleanExpression
                  prefix="F"
                  expression={mode === 'SOP' ? kResult.sopExpression : kResult.posExpression}
                  className="text-xl font-bold"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{kResult.isEquivalent ? 'Tabla de verdad 100% verificada' : 'No verificada'}</span>
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                {kResult.groups.length} Grupos Mínimos
              </span>
            </div>
          </div>
        </div>

        {/* 5-Variables Sub-map Switcher if 5 vars */}
        {varCount === 5 && (
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs font-bold text-[var(--text-secondary)]">Capa de 5 Variables:</span>
            <button
              onClick={() => setSelectedSubMap(0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                selectedSubMap === 0 ? 'bg-blue-600 text-white' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
              }`}
            >
              Capa A = 0 (minterms 0..15)
            </button>
            <button
              onClick={() => setSelectedSubMap(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                selectedSubMap === 1 ? 'bg-blue-600 text-white' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
              }`}
            >
              Capa A = 1 (minterms 16..31)
            </button>
          </div>
        )}

        {/* The Visual Karnaugh Grid */}
        <div className="p-6 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col items-center justify-center overflow-x-auto shadow-xs">
          <div className="min-w-fit">
            {/* Headers row (Column Variables in Gray Code) */}
            <div className="flex items-end mb-2">
              {/* Corner label */}
              <div className="w-20 h-10 flex flex-col items-center justify-center font-mono-code font-bold text-[11px] text-[var(--text-secondary)] border-b-2 border-r-2 border-[var(--border-color)] mr-2">
                <span>{kResult.colVariables.join('')} →</span>
                <span>↓ {kResult.rowVariables.join('')}</span>
              </div>

              {/* Column Gray code numbers */}
              {kResult.grid[0].map((cell, colIdx) => (
                <div
                  key={colIdx}
                  className="w-16 h-8 flex items-center justify-center font-mono-code font-bold text-xs text-blue-500 bg-[var(--bg-surface-sub)] rounded-t-md mx-1 border border-b-0 border-[var(--border-color)]"
                >
                  {cell.grayCol}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {kResult.grid.map((rowCells, rIdx) => (
              <div key={rIdx} className="flex items-center mb-2">
                {/* Row Gray code */}
                <div className="w-20 h-16 flex items-center justify-center font-mono-code font-bold text-xs text-blue-500 bg-[var(--bg-surface-sub)] rounded-l-md mr-2 border border-r-0 border-[var(--border-color)]">
                  {rowCells[0].grayRow}
                </div>

                {/* Cells */}
                {rowCells.map((cell) => {
                  const m = cell.mintermIndex;
                  const val = cellOverrides[m] ?? cell.value;
                  const groupBorder = getCellGroupBorder(m);

                  const isHigh = val === 1;
                  const isX = val === 'X';

                  return (
                    <div
                      key={cell.col}
                      onClick={() => handleCellClick(m, val)}
                      style={{
                        borderColor: groupBorder || 'var(--border-color)',
                        boxShadow: groupBorder ? `0 0 10px ${groupBorder}40` : undefined,
                      }}
                      className={`relative w-16 h-16 mx-1 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 ${
                        isHigh
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : isX
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-[var(--bg-surface-sub)] text-slate-400'
                      }`}
                    >
                      {/* Cell Value */}
                      <span className="text-xl font-mono-code font-extrabold select-none">
                        {val}
                      </span>

                      {/* Minterm Index Badge */}
                      <span className="absolute bottom-1 right-1.5 text-[9px] font-mono-code opacity-50 select-none">
                        m{m}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Groups Breakdown Legend */}
        <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-500" />
            <span>Desglose de Agrupaciones y Términos Obtenidos</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {kResult.groups.map((group, idx) => (
              <div
                key={group.id}
                style={{ borderColor: group.color }}
                className="p-3 rounded-lg border-2 bg-[var(--bg-surface-sub)] text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-bold">
                  <span style={{ color: group.color }}>Grupo #{idx + 1} ({group.cells.length} celdas)</span>
                  <span className="font-mono-code text-[11px]">{group.isEssential ? 'Esencial' : 'Opcional'}</span>
                </div>
                <div className="text-[11px] font-mono-code font-bold text-[var(--text-primary)] flex items-center gap-1.5 flex-wrap">
                  <span>Término:</span>
                  <BooleanExpression expression={group.expression} className="text-sm font-bold text-blue-500" />
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] font-mono-code">
                  Cubre minterms: {group.minterms.join(', ')}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)]">
                  Variables fijas: {group.variablesKept.join(', ') || 'Todas canceladas'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step-by-Step Pedagogical Explanation Accordion */}
        <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>Resolución Pedagógica Paso a Paso</span>
          </h3>

          <div className="space-y-2">
            {kResult.steps.map((step, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] text-xs leading-relaxed text-[var(--text-primary)]"
              >
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
