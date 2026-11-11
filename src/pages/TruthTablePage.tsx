/**
 * LogicLab - Truth Tables Module (Generador, Analizador, Comparador y Exportador)
 * Zero eval(), full CSV/JSON export, 2^n generator, expression comparator, direct circuit synthesis
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useCircuitStore } from '../store/useCircuitStore';
import { BooleanParser, evaluateAST, extractVariables } from '../engines/boolean/evaluator';
import { CircuitGenerator, SynthesisMode } from '../engines/circuit/generator';
import { QuineMcCluskeyEngine } from '../engines/boolean/quineMcCluskey';
import {
  Table,
  Plus,
  Trash2,
  Download,
  Cpu,
  Grid,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Filter,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import { BooleanExpression, MathInline } from '../components/math';
import { VisualBooleanBuilder } from '../components/common/VisualBooleanBuilder';

interface OutputFunction {
  id: string;
  name: string;
  expression: string;
  isManual: boolean;
  manualOutputs: Record<number, 0 | 1 | 'X'>;
}

export const TruthTablePage: React.FC = () => {
  const { setActiveTab, showToast, sharedBooleanFunction } = useAppStore();
  const { loadCircuit, synthesizeCircuitFromTable, generateAssociatedTruthTable } = useCircuitStore();

  // Mode: 'generator' | 'comparator'
  const [activeMode, setActiveMode] = useState<'generator' | 'comparator'>('generator');
  const [synthesisMode, setSynthesisMode] = useState<SynthesisMode>('STANDARD');
  const [editingFnId, setEditingFnId] = useState<string | null>(null);

  // Generator Mode State
  const [variablesInput, setVariablesInput] = useState('A, B, C');
  const [functions, setFunctions] = useState<OutputFunction[]>([
    {
      id: 'f1',
      name: 'F1',
      expression: "A · B + C",
      isManual: false,
      manualOutputs: {},
    },
    {
      id: 'f2',
      name: 'Suma_XOR',
      expression: 'A ^ B ^ C',
      isManual: false,
      manualOutputs: {},
    },
  ]);

  // Synchronize when coming from another section
  useEffect(() => {
    if (sharedBooleanFunction) {
      if (sharedBooleanFunction.variables && sharedBooleanFunction.variables.length > 0) {
        setVariablesInput(sharedBooleanFunction.variables.join(', '));
      }
      if (sharedBooleanFunction.expression) {
        setFunctions((prev) => [
          {
            id: `fn_shared_${Date.now()}`,
            name: 'F_sincronizada',
            expression: sharedBooleanFunction.expression,
            isManual: false,
            manualOutputs: {},
          },
          ...prev.filter((f) => f.id !== 'f1'),
        ]);
        showToast('info', `Cargada función transferida desde ${sharedBooleanFunction.source || 'otro módulo'}`);
      }
    }
  }, [sharedBooleanFunction]);

  // Comparator State
  const [compExpr1, setCompExpr1] = useState("(A + B)'");
  const [compExpr2, setCompExpr2] = useState("A' · B'");

  // Filter state
  const [filterVal, setFilterVal] = useState<'all' | '1' | '0'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Process variable list
  const variables = useMemo(() => {
    return variablesInput
      .split(',')
      .map((v) => v.trim().toUpperCase())
      .filter((v) => v.length > 0 && /^[A-Z][0-9]*$/.test(v));
  }, [variablesInput]);

  const numVars = Math.min(8, variables.length); // guard up to 8 variables (256 rows)
  const totalRows = Math.pow(2, numVars);

  // Evaluate table
  const tableData = useMemo(() => {
    if (numVars === 0) return { rows: [], minterms: {}, maxterms: {} };

    // Parse each function's AST
    const parsedFunctions = functions.map((fn) => {
      try {
        const parser = new BooleanParser(fn.expression);
        const ast = parser.parse();
        return { ...fn, ast, error: null };
      } catch (err: any) {
        return { ...fn, ast: null, error: err.message };
      }
    });

    const rows = [];
    const minterms: Record<string, number[]> = {};
    const maxterms: Record<string, number[]> = {};

    functions.forEach((f) => {
      minterms[f.id] = [];
      maxterms[f.id] = [];
    });

    for (let i = 0; i < totalRows; i++) {
      const binary = i.toString(2).padStart(numVars, '0');
      const inputVals: Record<string, 0 | 1> = {};
      variables.slice(0, numVars).forEach((v, idx) => {
        inputVals[v] = parseInt(binary[idx], 10) as 0 | 1;
      });

      const outputVals: Record<string, 0 | 1 | 'X'> = {};

      parsedFunctions.forEach((fn) => {
        if (fn.isManual) {
          const val = fn.manualOutputs[i] ?? 0;
          outputVals[fn.id] = val;
          if (val === 1) minterms[fn.id].push(i);
          else if (val === 0) maxterms[fn.id].push(i);
        } else if (fn.ast) {
          try {
            const res = evaluateAST(fn.ast, inputVals);
            outputVals[fn.id] = res;
            if (res === 1) minterms[fn.id].push(i);
            else maxterms[fn.id].push(i);
          } catch {
            outputVals[fn.id] = 'X';
          }
        } else {
          outputVals[fn.id] = 'X';
        }
      });

      rows.push({
        index: i,
        binary,
        inputs: inputVals,
        outputs: outputVals,
      });
    }

    return { rows, minterms, maxterms };
  }, [variables, numVars, totalRows, functions]);

  // Comparator Analysis
  const comparisonResult = useMemo(() => {
    try {
      const p1 = new BooleanParser(compExpr1);
      const ast1 = p1.parse();
      const p2 = new BooleanParser(compExpr2);
      const ast2 = p2.parse();

      const vars = Array.from(new Set([...extractVariables(ast1), ...extractVariables(ast2)])).sort();
      if (vars.length === 0) return { equivalent: true, vars: [], mismatches: [] };

      const total = Math.pow(2, vars.length);
      const mismatches = [];

      for (let i = 0; i < total; i++) {
        const bin = i.toString(2).padStart(vars.length, '0');
        const env: Record<string, 0 | 1> = {};
        vars.forEach((v, idx) => {
          env[v] = parseInt(bin[idx], 10) as 0 | 1;
        });

        const v1 = evaluateAST(ast1, env);
        const v2 = evaluateAST(ast2, env);

        if (v1 !== v2) {
          mismatches.push({ index: i, bin, env, v1, v2 });
        }
      }

      return {
        equivalent: mismatches.length === 0,
        vars,
        mismatches,
      };
    } catch {
      return { equivalent: false, vars: [], mismatches: [] };
    }
  }, [compExpr1, compExpr2]);

  // Add function column
  const handleAddFunction = () => {
    const nextId = `f_${Date.now()}`;
    setFunctions([
      ...functions,
      {
        id: nextId,
        name: `F${functions.length + 1}`,
        expression: 'A + B',
        isManual: false,
        manualOutputs: {},
      },
    ]);
  };

  const handleRemoveFunction = (id: string) => {
    if (functions.length <= 1) return;
    setFunctions(functions.filter((f) => f.id !== id));
  };

  // Toggle manual cell
  const handleToggleCell = (fnId: string, rowIndex: number) => {
    setFunctions((prev) =>
      prev.map((fn) => {
        if (fn.id === fnId) {
          const current = fn.manualOutputs[rowIndex] ?? 0;
          const next = current === 0 ? 1 : current === 1 ? 'X' : 0;
          return {
            ...fn,
            isManual: true,
            manualOutputs: { ...fn.manualOutputs, [rowIndex]: next },
          };
        }
        return fn;
      })
    );
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [...variables.slice(0, numVars), ...functions.map((f) => f.name)];
    const csvLines = [headers.join(',')];

    for (const row of tableData.rows) {
      const lineVals = [
        ...variables.slice(0, numVars).map((v) => row.inputs[v]),
        ...functions.map((f) => row.outputs[f.id]),
      ];
      csvLines.push(lineVals.join(','));
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabla_de_verdad_${variables.join('')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Tabla de verdad exportada a formato CSV.');
  };

  // Send to Circuit Canvas (Synthesize minimal circuit using selected technology)
  const handleSynthesizeCircuit = (fn: OutputFunction) => {
    try {
      const minterms = tableData.minterms[fn.id] || [];
      const varList = variables.slice(0, numVars);
      // Collect manual don't cares if any
      const dontCares: number[] = [];
      if (fn.isManual) {
        Object.entries(fn.manualOutputs).forEach(([k, v]) => {
          if (v === 'X') dontCares.push(Number(k));
        });
      }

      synthesizeCircuitFromTable(varList, minterms, dontCares, synthesisMode);
      setActiveTab('circuit');
      showToast('success', `Circuito para "${fn.name}" sintetizado con tecnología ${synthesisMode} e importado en el editor.`);
    } catch {
      showToast('error', 'Error al sintetizar circuito a partir de la expresión.');
    }
  };

  // Synchronize inputs & outputs from live Canvas Circuit
  const handleSyncFromCanvas = () => {
    try {
      const liveTable = generateAssociatedTruthTable();
      if (!liveTable.success || liveTable.inputVariables.length === 0) {
        showToast('warning', liveTable.message || 'El circuito del lienzo no tiene entradas o salidas suficientes.');
        return;
      }
      setVariablesInput(liveTable.inputVariables.join(', '));
      const newFunctions: OutputFunction[] = liveTable.outputVariables.map((outName, idx) => {
        const manualOutputs: Record<number, 0 | 1 | 'X'> = {};
        liveTable.rows.forEach((r) => {
          const val = r.outputs[outName];
          manualOutputs[r.index] = val === 1 ? 1 : val === 0 ? 0 : 'X';
        });
        return {
          id: `fn_canvas_${idx}`,
          name: outName,
          expression: liveTable.sopExpression || '0',
          isManual: true,
          manualOutputs,
        };
      });
      setFunctions(newFunctions);
      showToast('success', `Sincronizadas ${liveTable.inputVariables.length} entradas y ${liveTable.outputVariables.length} salidas desde el circuito.`);
    } catch {
      showToast('error', 'No se pudo sincronizar la tabla desde el circuito.');
    }
  };

  // Filter rows
  const displayRows = tableData.rows.filter((r) => {
    if (searchTerm.trim() && !r.binary.includes(searchTerm.trim())) return false;
    if (filterVal === 'all') return true;
    const target = filterVal === '1' ? 1 : 0;
    return Object.values(r.outputs).some((val) => val === target);
  });

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[var(--bg-base)] p-4 md:p-6 text-[var(--text-primary)]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Title & Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Table className="w-5 h-5 text-blue-500" />
              <span>Módulo de Tablas de Verdad</span>
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Generación de 2ⁿ combinaciones, edición de minterms, equivalencias lógicas y síntesis directa a compuertas.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--border-color)]">
            <button
              onClick={() => setActiveMode('generator')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeMode === 'generator'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Generador & Editor
            </button>
            <button
              onClick={() => setActiveMode('comparator')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeMode === 'comparator'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Comparador de Equivalencia
            </button>
          </div>
        </div>

        {activeMode === 'generator' ? (
          <>
            {/* Sincronización con Circuito & Selector de Tecnología de Síntesis */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncFromCanvas}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-xs"
                  title="Importar entradas y salidas simuladas desde el circuito activo en el lienzo"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sincronizar desde Circuito del Lienzo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('circuit')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface-sub)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium transition-all"
                >
                  <Cpu className="w-3.5 h-3.5 text-blue-500" />
                  <span>Ir al Editor de Circuitos</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[var(--text-secondary)] font-medium">Tecnología de síntesis:</span>
                <div className="flex items-center gap-1 bg-[var(--bg-surface-sub)] p-0.5 rounded-lg border border-[var(--border-color)]">
                  {(['STANDARD', 'NAND_ONLY', 'NOR_ONLY'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSynthesisMode(mode)}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                        synthesisMode === mode
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {mode === 'STANDARD' ? 'Estándar (AND/OR/NOT)' : mode === 'NAND_ONLY' ? 'Solo NAND' : 'Solo NOR'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Configuration Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Variables Setup */}
              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Variables de Entrada (Separadas por comas)
                </label>
                <input
                  type="text"
                  value={variablesInput}
                  onChange={(e) => setVariablesInput(e.target.value)}
                  placeholder="A, B, C, D"
                  className="w-full bg-[var(--bg-surface-sub)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                />
                <div className="text-[11px] text-[var(--text-secondary)] mt-1.5">
                  {numVars} variables identificadas → <span className="font-bold text-blue-500">{totalRows} combinaciones</span>
                </div>
              </div>

              {/* Function Expressions Setup */}
              <div className="md:col-span-2 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Funciones Booleanas de Salida
                  </span>
                  <button
                    onClick={handleAddFunction}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Función</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {functions.map((fn) => (
                    <div key={fn.id} className="space-y-2 p-2 rounded-lg bg-[var(--bg-surface-sub)]/50 border border-[var(--border-color)]">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={fn.name}
                          onChange={(e) =>
                            setFunctions(functions.map((f) => (f.id === fn.id ? { ...f, name: e.target.value } : f)))
                          }
                          className="w-24 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1.5 text-xs font-bold text-[var(--text-primary)]"
                          placeholder="Nombre"
                        />
                        <input
                          type="text"
                          value={fn.expression}
                          onChange={(e) =>
                            setFunctions(
                              functions.map((f) =>
                                f.id === fn.id ? { ...f, expression: e.target.value, isManual: false } : f
                              )
                            )
                          }
                          className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-3 py-1.5 text-xs font-mono-code text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                          placeholder="ej: A · B + C"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingFnId(editingFnId === fn.id ? null : fn.id)}
                          title="Abrir constructor visual de función"
                          className={`p-1.5 rounded transition-colors cursor-pointer ${
                            editingFnId === fn.id
                              ? 'bg-emerald-600 text-white'
                              : 'hover:bg-emerald-500/10 text-emerald-500'
                          }`}
                        >
                          <Wand2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSynthesizeCircuit(fn)}
                          title="Construir circuito visual en el editor"
                          className="p-1.5 rounded hover:bg-blue-500/10 text-blue-500 transition-colors cursor-pointer"
                        >
                          <Cpu className="w-4 h-4" />
                        </button>
                        {functions.length > 1 && (
                          <button
                            onClick={() => handleRemoveFunction(fn.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {editingFnId === fn.id && (
                        <div className="p-3 bg-[var(--bg-surface)] rounded-lg border border-emerald-500/40 shadow-xs">
                          <div className="text-[11px] font-bold text-emerald-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                            <Wand2 className="w-3.5 h-3.5" />
                            <span>Constructor Visual para {fn.name}</span>
                          </div>
                          <VisualBooleanBuilder
                            initialVariables={variables.slice(0, numVars)}
                            initialExpression={fn.expression}
                            onExpressionChange={(newExpr) => {
                              setFunctions(
                                functions.map((f) => (f.id === fn.id ? { ...f, expression: newExpr, isManual: false } : f))
                              );
                            }}
                            onSubmit={(newExpr) => {
                              setFunctions(
                                functions.map((f) => (f.id === fn.id ? { ...f, expression: newExpr, isManual: false } : f))
                              );
                              setEditingFnId(null);
                              showToast('success', `Función ${fn.name} actualizada`);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Minterms & Maxterms Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {functions.map((fn) => (
                <div key={fn.id} className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold flex-wrap gap-1">
                    <div className="flex items-center gap-1.5 text-blue-500 flex-wrap">
                      <span>{fn.name}:</span>
                      <BooleanExpression expression={fn.expression} className="text-xs font-bold" />
                    </div>
                    <button
                      onClick={() => handleSynthesizeCircuit(fn)}
                      className="text-[11px] font-semibold text-emerald-500 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Sintetizar Circuito</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 flex-wrap">
                    <strong className="text-[var(--text-primary)]">Minterms:</strong>
                    <MathInline math={`\\sum m(${tableData.minterms[fn.id]?.join(', ') || '\\emptyset'})`} />
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 flex-wrap">
                    <strong className="text-[var(--text-primary)]">Maxterms:</strong>
                    <MathInline math={`\\prod M(${tableData.maxterms[fn.id]?.join(', ') || '\\emptyset'})`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Toolbar for Search, Filter & CSV Export */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <span className="font-semibold text-[var(--text-secondary)]">Filtrar:</span>
                  <select
                    value={filterVal}
                    onChange={(e) => setFilterVal(e.target.value as any)}
                    className="bg-[var(--bg-surface-sub)] border border-[var(--border-color)] rounded px-2 py-1 text-xs text-[var(--text-primary)]"
                  >
                    <option value="all">Todas las filas</option>
                    <option value="1">Solo salidas en 1 (HIGH)</option>
                    <option value="0">Solo salidas en 0 (LOW)</option>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Buscar binario (ej: 011)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[var(--bg-surface-sub)] border border-[var(--border-color)] rounded px-2.5 py-1 text-xs text-[var(--text-primary)] w-44"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-surface-sub)] hover:bg-[var(--bg-surface)] font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  <span>Descargar CSV</span>
                </button>
              </div>
            </div>

            {/* Full Truth Table */}
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--bg-surface-sub)] sticky top-0 z-10 border-b border-[var(--border-color)] text-[var(--text-secondary)] uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-4 font-mono-code w-16"># (m)</th>
                      {variables.slice(0, numVars).map((v) => (
                        <th key={v} className="py-2.5 px-4 font-mono-code text-center w-14">
                          {v}
                        </th>
                      ))}
                      {functions.map((fn) => (
                        <th key={fn.id} className="py-2.5 px-4 font-mono-code text-center text-blue-500">
                          {fn.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] font-mono-code">
                    {displayRows.map((row) => (
                      <tr
                        key={row.index}
                        className="hover:bg-blue-500/5 transition-colors cursor-default"
                      >
                        <td className="py-2 px-4 text-slate-400 font-medium">m{row.index}</td>
                        {variables.slice(0, numVars).map((v) => (
                          <td key={v} className="py-2 px-4 text-center font-bold">
                            <span className={row.inputs[v] === 1 ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-400'}>
                              {row.inputs[v]}
                            </span>
                          </td>
                        ))}
                        {functions.map((fn) => {
                          const val = row.outputs[fn.id];
                          const isHigh = val === 1;
                          const isX = val === 'X';

                          return (
                            <td
                              key={fn.id}
                              onClick={() => handleToggleCell(fn.id, row.index)}
                              title="Haga clic para alternar manualmente 0 → 1 → X"
                              className="py-2 px-4 text-center cursor-pointer select-none"
                            >
                              <span
                                className={`inline-block w-7 py-0.5 rounded text-center font-bold transition-all ${
                                  isHigh
                                    ? 'bg-emerald-500/20 text-emerald-500 ring-1 ring-emerald-500/30'
                                    : isX
                                    ? 'bg-amber-500/20 text-amber-500 ring-1 ring-amber-500/30'
                                    : 'bg-slate-500/10 text-slate-400'
                                }`}
                              >
                                {val}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Comparator Mode */
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-4">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Comprobador de Equivalencia de Funciones
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Verifique exhaustivamente mediante álgebra y tablas de verdad si dos expresiones booleanas son idénticas en todas sus combinaciones.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Expresión 1 (Función F1)
                  </label>
                  <input
                    type="text"
                    value={compExpr1}
                    onChange={(e) => setCompExpr1(e.target.value)}
                    className="w-full bg-[var(--bg-surface-sub)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                  <div className="mt-1.5 px-2 py-1 rounded bg-[var(--bg-surface-sub)] border border-[var(--border-color)] min-h-[28px] flex items-center">
                    <BooleanExpression prefix="F_1" expression={compExpr1} className="text-xs font-semibold" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Expresión 2 (Función F2)
                  </label>
                  <input
                    type="text"
                    value={compExpr2}
                    onChange={(e) => setCompExpr2(e.target.value)}
                    className="w-full bg-[var(--bg-surface-sub)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                  <div className="mt-1.5 px-2 py-1 rounded bg-[var(--bg-surface-sub)] border border-[var(--border-color)] min-h-[28px] flex items-center">
                    <BooleanExpression prefix="F_2" expression={compExpr2} className="text-xs font-semibold" />
                  </div>
                </div>
              </div>

              {/* Equivalence Result Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center gap-3 ${
                  comparisonResult.equivalent
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                }`}
              >
                {comparisonResult.equivalent ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 shrink-0" />
                    <div>
                      <div className="font-bold text-sm">¡Las funciones son lógicamente EQUIVALENTES! (F1 ≡ F2)</div>
                      <div className="text-xs opacity-90 mt-0.5">
                        Ambas expresiones producen el mismo valor de verdad en las 2^{comparisonResult.vars.length} combinaciones posibles.
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 shrink-0" />
                    <div>
                      <div className="font-bold text-sm">Las funciones NO son equivalentes.</div>
                      <div className="text-xs opacity-90 mt-0.5">
                        Se encontraron {comparisonResult.mismatches.length} discrepancia(s) entre las salidas.
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
