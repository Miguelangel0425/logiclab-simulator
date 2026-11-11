/**
 * LogicLab - Exact Boolean Simplifier Module (Quine-McCluskey & Petrick's Method)
 * Canonical SOP/POS, prime implicant tables, literal reduction stats, and NAND/NOR synthesis
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useCircuitStore } from '../store/useCircuitStore';
import { QuineMcCluskeyEngine } from '../engines/boolean/quineMcCluskey';
import { BooleanParser, extractVariables, evaluateAST } from '../engines/boolean/evaluator';
import { CircuitGenerator, SynthesisMode } from '../engines/circuit/generator';
import { ConstructorFuncionBooleana } from '../components/common/ConstructorFuncionBooleana';
import { BooleanLogicService } from '../engines/boolean/booleanLogicService';
import {
  Sparkles,
  Cpu,
  Calculator,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  Table,
  BookOpen,
  Edit3,
  Share2,
  Grid,
} from 'lucide-react';
import { BooleanExpression, MathInline } from '../components/math';

export const BooleanSolverPage: React.FC = () => {
  const { setActiveTab, showToast, sharedBooleanFunction, setSharedBooleanFunction } = useAppStore();
  const { loadCircuit } = useCircuitStore();

  const [inputMode, setInputMode] = useState<'visual' | 'expression' | 'minterms'>('visual');
  const [exprInput, setExprInput] = useState("A · B + C");
  const [mintermsInput, setMintermsInput] = useState('0, 2, 4, 6, 7');
  const [dontCaresInput, setDontCaresInput] = useState('');
  const [variablesInput, setVariablesInput] = useState('A, B, C');
  const [notation, setNotation] = useState<'prime' | 'bar' | 'symbol'>('prime');
  const [synthesisMode, setSynthesisMode] = useState<SynthesisMode>('STANDARD');

  // Synchronize when coming from another module via sharedBooleanFunction
  useEffect(() => {
    if (sharedBooleanFunction && sharedBooleanFunction.expression) {
      setExprInput(sharedBooleanFunction.expression);
      if (sharedBooleanFunction.variables && sharedBooleanFunction.variables.length > 0) {
        setVariablesInput(sharedBooleanFunction.variables.join(', '));
      }
      if (sharedBooleanFunction.minterms && sharedBooleanFunction.minterms.length > 0) {
        setMintermsInput(sharedBooleanFunction.minterms.join(', '));
      }
      if (sharedBooleanFunction.dontCares && sharedBooleanFunction.dontCares.length > 0) {
        setDontCaresInput(sharedBooleanFunction.dontCares.join(', '));
      }
      showToast('info', `Cargada función transferida desde ${sharedBooleanFunction.source || 'otro módulo'}`);
    }
  }, [sharedBooleanFunction]);

  // Process variables and minterms
  const solverResult = useMemo(() => {
    try {
      if (inputMode === 'visual' || inputMode === 'expression') {
        const cleanExpr = exprInput.trim();
        if (!cleanExpr) return null;

        const fn = BooleanLogicService.createFunction(
          cleanExpr,
          undefined,
          variablesInput.split(',').map((v) => v.trim()).filter(Boolean)
        );
        return BooleanLogicService.simplify(fn);
      } else {
        const vars = variablesInput
          .split(',')
          .map((v) => v.trim().toUpperCase())
          .filter((v) => v.length > 0);

        const mList = mintermsInput
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n));

        const dList = dontCaresInput
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n));

        const qm = new QuineMcCluskeyEngine(vars, mList, dList);
        return qm.solve();
      }
    } catch {
      return null;
    }
  }, [inputMode, exprInput, mintermsInput, dontCaresInput, variablesInput]);

  // Synthesis to Circuit Canvas
  const handleSynthesize = () => {
    if (!solverResult) return;
    try {
      const { components, connections } = CircuitGenerator.fromExpression(
        solverResult.sopSimplified,
        synthesisMode
      );
      loadCircuit(components, connections);
      setActiveTab('circuit');
      showToast('success', `Circuito ${synthesisMode} sintetizado exitosamente en el editor.`);
    } catch {
      showToast('error', 'Error al generar el esquema del circuito.');
    }
  };

  const literalReduction = solverResult
    ? Math.max(
        0,
        Math.round(
          ((solverResult.literalsBefore - solverResult.literalsAfter) /
            Math.max(1, solverResult.literalsBefore)) *
            100
        )
      )
    : 0;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[var(--bg-base)] p-4 md:p-6 text-[var(--text-primary)]">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <span>Simplificador Booleano Automático</span>
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Minimización matemática exacta mediante el Algoritmo de Quine-McCluskey y Método de Petrick.
            </p>
          </div>

          {/* Mode switch */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--border-color)]">
            <button
              onClick={() => setInputMode('visual')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                inputMode === 'visual'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Constructor Visual
            </button>
            <button
              onClick={() => setInputMode('expression')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                inputMode === 'expression'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Texto / Teclado
            </button>
            <button
              onClick={() => setInputMode('minterms')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                inputMode === 'minterms'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Por Minterms Σm
            </button>
          </div>
        </div>

        {/* Input Configuration Card */}
        <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4">
          {inputMode === 'visual' ? (
            <div className="space-y-3">
              <ConstructorFuncionBooleana
                initialVariables={variablesInput.split(',').map((v) => v.trim()).filter(Boolean)}
                initialExpression={exprInput}
                onChange={(fn) => {
                  setExprInput(fn.expression);
                  if (fn.variables.length > 0) {
                    setVariablesInput(fn.variables.join(', '));
                  }
                }}
                onApply={(fn) => {
                  setExprInput(fn.expression);
                  setVariablesInput(fn.variables.join(', '));
                  showToast('success', 'Función booleana simplificada exitosamente con Quine-McCluskey');
                }}
              />
            </div>
          ) : inputMode === 'expression' ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Expresión Booleana de Entrada
              </label>
              <input
                type="text"
                value={exprInput}
                onChange={(e) => setExprInput(e.target.value)}
                placeholder="ej: A · B + C' · D"
                className="w-full bg-[var(--bg-surface-sub)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm font-mono-code font-bold text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
              />
              <div className="flex items-center gap-4 text-[11px] text-[var(--text-secondary)] mt-1.5 font-mono-code">
                <span>AND: · o AB</span>
                <span>•</span>
                <span>OR: +</span>
                <span>•</span>
                <span>NOT: ' o ¬A</span>
                <span>•</span>
                <span>XOR: ⊕ o ^</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Variables
                </label>
                <input
                  type="text"
                  value={variablesInput}
                  onChange={(e) => setVariablesInput(e.target.value)}
                  placeholder="A, B, C, D"
                  className="w-full bg-[var(--bg-surface-sub)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Minterms Σm(...)
                </label>
                <input
                  type="text"
                  value={mintermsInput}
                  onChange={(e) => setMintermsInput(e.target.value)}
                  placeholder="0, 2, 4, 6"
                  className="w-full bg-[var(--bg-surface-sub)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Don't-Care d(...)
                </label>
                <input
                  type="text"
                  value={dontCaresInput}
                  onChange={(e) => setDontCaresInput(e.target.value)}
                  placeholder="1, 5"
                  className="w-full bg-[var(--bg-surface-sub)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-[var(--text-primary)]"
                />
              </div>
            </div>
          )}

          {/* Quick preset examples */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--border-color)] text-xs">
            <span className="text-[var(--text-secondary)] font-medium">Ejemplos rápidos:</span>
            <button
              onClick={() => {
                setInputMode('expression');
                setExprInput("A'B + AB + B'C");
              }}
              className="px-2.5 py-1 rounded bg-[var(--bg-surface-sub)] hover:bg-blue-500/10 hover:border-blue-500/30 border border-transparent text-[11px] transition-colors"
            >
              <BooleanExpression expression="A'B + AB + B'C" />
            </button>
            <button
              onClick={() => {
                setInputMode('expression');
                setExprInput("(A + B)(A + B')(A' + B)");
              }}
              className="px-2.5 py-1 rounded bg-[var(--bg-surface-sub)] hover:bg-blue-500/10 hover:border-blue-500/30 border border-transparent text-[11px] transition-colors"
            >
              <BooleanExpression expression="(A + B)(A + B')(A' + B)" />
            </button>
            <button
              onClick={() => {
                setInputMode('minterms');
                setVariablesInput('A, B, C, D');
                setMintermsInput('0, 2, 8, 10, 13, 15');
                setDontCaresInput('');
              }}
              className="px-2.5 py-1 rounded bg-[var(--bg-surface-sub)] hover:bg-blue-500/10 hover:border-blue-500/30 border border-transparent font-mono-code text-[11px] transition-colors"
            >
              4 Esquinas: Σm(0,2,8,10)
            </button>
          </div>
        </div>

        {/* Results Overview */}
        {solverResult ? (
          <>
            {/* Optimization Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Literales
                </span>
                <div className="text-xl font-mono-code font-bold text-blue-500 mt-1 flex items-baseline gap-1">
                  <span>{solverResult.literalsBefore}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-emerald-500 font-extrabold">{solverResult.literalsAfter}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Términos Lógicos
                </span>
                <div className="text-xl font-mono-code font-bold text-blue-500 mt-1 flex items-baseline gap-1">
                  <span>{solverResult.termsBefore}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-emerald-500 font-extrabold">{solverResult.termsAfter}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Ahorro en Hardware
                </span>
                <div className="text-xl font-mono-code font-extrabold text-emerald-500 mt-1 flex items-center gap-1">
                  <TrendingDown className="w-5 h-5" />
                  <span>{literalReduction}%</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Implicantes Primos
                </span>
                <div className="text-xl font-mono-code font-bold text-purple-500 mt-1">
                  {solverResult.primeImplicants.length} ({solverResult.essentialPrimeImplicants.length} Esenciales)
                </div>
              </div>
            </div>

            {/* Simplified Expressions Banner */}
            <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">
                    Forma Suma de Productos Mínima (SOP)
                  </span>
                  {solverResult.isVerifiedEquivalent && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Tabla de verdad 100% verificada</span>
                    </span>
                  )}
                </div>
                <div className="py-1 overflow-x-auto">
                  <BooleanExpression prefix="F" expression={solverResult.sopSimplified} className="text-xl font-bold" />
                </div>
              </div>

              <div className="space-y-1 pt-3 border-t border-[var(--border-color)]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-500">
                  Forma Producto de Sumas Mínimo (POS Dual)
                </span>
                <div className="py-1 overflow-x-auto">
                  <BooleanExpression prefix="F" expression={solverResult.posSimplified} className="text-xl font-bold" />
                </div>
              </div>

              {/* Circuit Synthesis Selector & Cross-Tool Sync */}
              <div className="pt-4 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Tecnología de Síntesis:</span>
                  <select
                    value={synthesisMode}
                    onChange={(e) => setSynthesisMode(e.target.value as SynthesisMode)}
                    className="bg-[var(--bg-surface-sub)] border border-[var(--border-color)] rounded px-2.5 py-1 text-xs font-bold text-[var(--text-primary)]"
                  >
                    <option value="STANDARD">Compuertas Básicas (AND / OR / NOT)</option>
                    <option value="NAND_ONLY">Exclusivamente NAND (Universal)</option>
                    <option value="NOR_ONLY">Exclusivamente NOR (Universal)</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!solverResult) return;
                      const vars = variablesInput.split(',').map((v) => v.trim()).filter(Boolean);
                      setSharedBooleanFunction({
                        expression: solverResult.sopSimplified,
                        variableCount: vars.length,
                        variables: vars,
                        source: 'solver',
                        timestamp: Date.now(),
                      });
                      setActiveTab('truth-table');
                      showToast('info', 'Función simplificada transferida a Tablas de Verdad');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface-sub)] hover:bg-emerald-600/10 border border-[var(--border-color)] hover:border-emerald-500/50 text-[var(--text-primary)] hover:text-emerald-500 text-xs font-bold transition-all cursor-pointer"
                    title="Transferir función a Tablas de Verdad"
                  >
                    <Table className="w-3.5 h-3.5 text-emerald-500" />
                    <span>A Tablas de Verdad</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!solverResult) return;
                      const vars = variablesInput.split(',').map((v) => v.trim()).filter(Boolean);
                      setSharedBooleanFunction({
                        expression: solverResult.sopSimplified,
                        variableCount: vars.length,
                        variables: vars,
                        source: 'solver',
                        timestamp: Date.now(),
                      });
                      setActiveTab('karnaugh');
                      showToast('info', 'Función simplificada transferida a Mapas de Karnaugh');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface-sub)] hover:bg-purple-600/10 border border-[var(--border-color)] hover:border-purple-500/50 text-[var(--text-primary)] hover:text-purple-500 text-xs font-bold transition-all cursor-pointer"
                    title="Transferir función a Mapas de Karnaugh"
                  >
                    <Grid className="w-3.5 h-3.5 text-purple-500" />
                    <span>A Mapas de Karnaugh</span>
                  </button>

                  <button
                    onClick={handleSynthesize}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    <Cpu className="w-4 h-4" />
                    <span>Construir Circuito en el Editor</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Prime Implicant Table */}
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Table className="w-4 h-4 text-blue-500" />
                <span>Tabla de Implicantes Primos (Quine-McCluskey)</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--bg-surface-sub)] border-b border-[var(--border-color)] text-[var(--text-secondary)] text-[10px] uppercase font-bold">
                    <tr>
                      <th className="p-2 font-mono-code">Término</th>
                      <th className="p-2 font-mono-code">Binario</th>
                      <th className="p-2">Minterms Cubiertos</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2 text-center">Incluido en F</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] font-mono-code">
                    {solverResult.primeImplicants.map((pi, idx) => (
                      <tr key={idx} className="hover:bg-blue-500/5">
                        <td className="p-2 font-bold text-blue-500">
                          <BooleanExpression expression={pi.term || '1'} className="text-xs font-bold" />
                        </td>
                        <td className="p-2">{pi.binary}</td>
                        <td className="p-2 text-[var(--text-secondary)]">{pi.minterms.join(', ')}</td>
                        <td className="p-2">
                          {pi.isEssential ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-500 font-bold">
                              Esencial (EPI)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-500/10 text-slate-400">
                              Opcional
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {pi.covered ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Algebraic Derivation Steps */}
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span>Procedimiento Algorítmico Realizado</span>
              </h3>

              <div className="space-y-1.5 font-mono-code text-[11px]">
                {solverResult.steps.map((st, i) => (
                  <div key={i} className="p-2 rounded bg-[var(--bg-surface-sub)] border border-[var(--border-color)]">
                    {st}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            <Calculator className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Ingrese una función booleana válida para calcular su reducción exacta.</p>
          </div>
        )}
      </div>
    </div>
  );
};
