/**
 * LogicLab - Professional CAD Bottom Dock & Multi-Tab Diagnostic Console
 * 4 Dockable Tabs:
 * 1. Diagnóstico Lógico: Pin-level unconnected checks, bus contention, feedback loop cycles, sequential status
 * 2. Tabla de Verdad: Exhaustive 2^n table with instant CSV export and sync indicator
 * 3. Expresiones Booleana: Quine-McCluskey SOP / POS simplification with KaTeX overline math
 * 4. Señales & Reloj: Dynamic logic monitors, oscillator clock slider, step-by-step trace
 */

import React, { useState, useMemo } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { useAppStore } from '../../store/useAppStore';
import { CircuitSimulator } from '../../engines/circuit/simulator';
import { QuineMcCluskeyEngine } from '../../engines/boolean/quineMcCluskey';
import { BooleanExpression } from '../math/BooleanExpression';
import {
  Terminal,
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  XCircle,
  Play,
  Pause,
  SkipForward,
  Table,
  Calculator,
  Activity,
  Download,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  Crosshair,
  Sliders,
  Clock,
  Sparkles,
} from 'lucide-react';

export type BottomConsoleTab = 'diagnostics' | 'truthtable' | 'boolean' | 'signals';

interface BottomConsoleProps {
  onOpenTruthTableModal?: (tab?: 'table' | 'synthesize' | 'compare') => void;
}

export const BottomConsole: React.FC<BottomConsoleProps> = ({ onOpenTruthTableModal }) => {
  const { showToast } = useAppStore();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<BottomConsoleTab>('diagnostics');
  const [isTall, setIsTall] = useState<boolean>(false);

  const {
    components,
    connections,
    simulation,
    viewTransform,
    isTableOutdated,
    associatedTruthTable,
    togglePause,
    stepOnce,
    setClockHz,
    generateAssociatedTruthTable,
    setSelectedComponents,
    setViewTransform,
  } = useCircuitStore();

  // Run or use truth table for real-time analysis
  const truthTable = useMemo(() => {
    if (associatedTruthTable && associatedTruthTable.success) {
      return associatedTruthTable;
    }
    try {
      return CircuitSimulator.generateTruthTable(components, connections);
    } catch {
      return null;
    }
  }, [associatedTruthTable, components, connections]);

  // Compute Quine-McCluskey simplifications for circuit outputs
  const booleanSolutions = useMemo(() => {
    if (!truthTable || !truthTable.success || truthTable.inputVariables.length === 0 || truthTable.outputVariables.length === 0) {
      return [];
    }
    // Limit automatic algebraic solving to circuits with <= 8 inputs for instantaneous response
    if (truthTable.inputVariables.length > 8) {
      return [];
    }

    const solutions: {
      outputName: string;
      sop: string;
      pos: string;
      minterms: number[];
      maxterms: number[];
      literals: number;
      originalLiterals: number;
    }[] = [];

    const vars = truthTable.inputVariables;
    const total = Math.pow(2, vars.length);

    for (const outVar of truthTable.outputVariables) {
      const minterms: number[] = [];
      const maxterms: number[] = [];

      truthTable.rows.forEach((row, idx) => {
        const val = row.outputs[outVar];
        if (val === 1) minterms.push(idx);
        else maxterms.push(idx);
      });

      try {
        const qm = new QuineMcCluskeyEngine(vars, minterms);
        const res = qm.solve();
        solutions.push({
          outputName: outVar,
          sop: res.sopSimplified,
          pos: res.posSimplified,
          minterms,
          maxterms,
          literals: res.literalsAfter,
          originalLiterals: res.literalsBefore,
        });
      } catch {
        // Fallback for empty or uniform results
      }
    }

    return solutions;
  }, [truthTable]);

  // Find unconnected pins & diagnostic warnings
  const unconnectedPins = useMemo(() => {
    return truthTable?.validation?.unconnectedPins || [];
  }, [truthTable]);

  // Find all inputs & outputs for live signal monitors
  const inputs = components.filter((c) => c.type === 'SWITCH' || c.type === 'PUSH_BUTTON' || c.type === 'CLOCK' || c.type === 'CONSTANT_0' || c.type === 'CONSTANT_1');
  const outputs = components.filter((c) => c.type === 'LED' || c.type === 'OUTPUT_LED' || c.type === 'OUTPUT_PIN' || c.type === 'SEVEN_SEGMENT');
  const intermediateGates = components.filter((c) => c.type.match(/^(AND|OR|NOT|NAND|NOR|XOR|XNOR|BUFFER)$/));

  const hasIssues = simulation.cycleDetected || simulation.warnings.length > 0 || simulation.errors.length > 0 || unconnectedPins.length > 0;

  // Center canvas on a specific component from diagnostics
  const handleFocusComponent = (compId: string) => {
    const comp = components.find((c) => c.id === compId);
    if (!comp) return;
    setSelectedComponents([compId]);
    setViewTransform({
      x: Math.round(-comp.x * viewTransform.zoom + (window.innerWidth / 3)),
      y: Math.round(-comp.y * viewTransform.zoom + 200),
    });
    showToast('info', `Centrado en ${comp.label}`);
  };

  // Export truth table to CSV
  const handleExportCSV = () => {
    if (!truthTable || !truthTable.success) {
      showToast('warning', 'No hay tabla de verdad para exportar.');
      return;
    }
    const headers = [...truthTable.inputVariables, ...truthTable.outputVariables].join(',');
    const rowLines = truthTable.rows.map((r) => {
      const inVals = truthTable.inputVariables.map((v) => r.inputs[v]);
      const outVals = truthTable.outputVariables.map((v) => r.outputs[v]);
      return [...inVals, ...outVals].join(',');
    });
    const csvContent = [headers, ...rowLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `logiclab_tabla_verdad_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Archivo CSV descargado correctamente');
  };

  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--bg-surface)] select-none text-xs flex flex-col z-10 transition-all duration-200">
      {/* CAD Dock Bar (Header) */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-[var(--border-color)]/60 bg-[var(--bg-surface-sub)]/50">
        
        {/* Left: Tab Switcher & Expander */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold transition-colors"
            title={isExpanded ? 'Contraer panel inferior' : 'Expandir panel inferior'}
          >
            <Terminal className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Consola CAD</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" /> : <ChevronUp className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
          </button>

          <div className="h-4 w-[1px] bg-[var(--border-color)] mx-0.5" />

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setActiveTab('diagnostics'); setIsExpanded(true); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                isExpanded && activeTab === 'diagnostics'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Diagnóstico</span>
              {hasIssues && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => { setActiveTab('truthtable'); setIsExpanded(true); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                isExpanded && activeTab === 'truthtable'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-emerald-500" />
              <span>Tabla de Verdad</span>
              {isTableOutdated && (
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Desactualizada" />
              )}
            </button>

            <button
              onClick={() => { setActiveTab('boolean'); setIsExpanded(true); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                isExpanded && activeTab === 'boolean'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden md:inline">Expresiones Booleana</span>
              <span className="md:hidden">Álgebra</span>
            </button>

            <button
              onClick={() => { setActiveTab('signals'); setIsExpanded(true); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                isExpanded && activeTab === 'signals'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-500" />
              <span className="hidden sm:inline">Monitor de Señales</span>
              <span className="sm:hidden">Señales</span>
            </button>
          </div>
        </div>

        {/* Right: Simulation Controls & Height Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Pause / Resume */}
          <button
            onClick={togglePause}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-semibold transition-colors ${
              simulation.isPaused
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-sub)]'
            }`}
            title={simulation.isPaused ? 'Reanudar oscilador' : 'Pausar simulación'}
          >
            {simulation.isPaused ? (
              <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" />
            ) : (
              <Pause className="w-3 h-3 text-amber-500" />
            )}
            <span className="hidden md:inline">{simulation.isPaused ? 'Reanudar' : 'Pausa'}</span>
          </button>

          {/* Step Once */}
          <button
            onClick={stepOnce}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-sub)] border border-[var(--border-color)] font-semibold text-[11px] text-[var(--text-primary)] transition-colors"
            title="Avanzar 1 ciclo de reloj"
          >
            <SkipForward className="w-3 h-3 text-blue-500" />
            <span className="hidden md:inline">Paso</span>
          </button>

          {/* Panel Height Maximize / Minimize */}
          {isExpanded && (
            <button
              onClick={() => setIsTall(!isTall)}
              className="p-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-sub)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title={isTall ? 'Altura estándar' : 'Maximizar altura del panel'}
            >
              {isTall ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Tab Content */}
      {isExpanded && (
        <div className={`${isTall ? 'h-80' : 'h-52'} overflow-y-auto p-3 bg-[var(--bg-surface-sub)] transition-all duration-150`}>
          
          {/* TAB 1: DIAGNÓSTICO LÓGICO & TERMINALES */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-3 font-mono-code text-[11px]">
              <div className="flex items-center justify-between font-sans">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase text-[var(--text-primary)]">
                    Diagnóstico de Red y Terminales
                  </span>
                  {hasIssues ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-[10px]">
                      {unconnectedPins.length} terminal(es) desconectada(s)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                      Circuito Conectado y Estable
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)]">
                  Paso #{simulation.stepCount} • {new Date(simulation.lastEvaluated).toLocaleTimeString()}
                </div>
              </div>

              {/* Warnings List */}
              <div className="space-y-2">
                {simulation.cycleDetected && (
                  <div className="flex items-start gap-2.5 p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-sans">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Bucle Combinacional Cerrado Detectado</strong>
                      <span>
                        Existe retroalimentación directa entre compuertas sin retardo secuencial. Para biestables estables, use biestables RS, flip-flops D/JK o compuertas con reloj.
                      </span>
                    </div>
                  </div>
                )}

                {/* Unconnected Pin Navigator */}
                {unconnectedPins.length > 0 ? (
                  <div className="p-2.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center justify-between">
                      <span>Terminales Flotantes / Desconectadas ({unconnectedPins.length})</span>
                      <span className="text-[10px] text-amber-500">Requieren conexión para asegurar nivel 0 o 1</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                      {unconnectedPins.map((pin, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-1.5 rounded bg-[var(--bg-surface-sub)] border border-[var(--border-color)] hover:border-blue-500 transition-colors"
                        >
                          <div className="truncate pr-1">
                            <span className="font-bold text-[var(--text-primary)]">{pin.compLabel}</span>
                            <span className="text-[var(--text-secondary)]"> • Pin: </span>
                            <span className="text-amber-500 font-bold">{pin.pinName}</span>
                          </div>
                          <button
                            onClick={() => handleFocusComponent(pin.compId)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 text-[10px] font-semibold shrink-0"
                            title="Centrar en el lienzo"
                          >
                            <Crosshair className="w-3 h-3" />
                            <span>Centrar</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Todas las terminales activas cuentan con señales conductoras válidas.</span>
                  </div>
                )}

                {/* Clock & Sequential Element Diagnostic */}
                {truthTable?.validation?.hasSequentialComponents && (
                  <div className="flex items-center gap-2 p-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 font-sans">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      El circuito contiene elementos secuenciales sincronizados por flanco de reloj (Flip-Flops / Contadores). La tabla de verdad representa el estado combinacional presente.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TABLA DE VERDAD INTEGRADA */}
          {activeTab === 'truthtable' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase text-[var(--text-primary)]">
                    Tabla de Verdad Exhaustiva ({truthTable?.rows?.length || 0} combinaciones)
                  </span>
                  {isTableOutdated && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-semibold text-[10px] flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Desactualizada</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={generateAssociatedTruthTable}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--text-primary)] transition-colors"
                    title="Recalcular tabla mediante el motor de simulación"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTableOutdated ? 'animate-spin-slow text-amber-500' : 'text-blue-500'}`} />
                    <span>Actualizar</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--text-primary)] transition-colors"
                    title="Exportar a CSV"
                  >
                    <Download className="w-3 h-3 text-emerald-500" />
                    <span>Descargar CSV</span>
                  </button>

                  {onOpenTruthTableModal && (
                    <button
                      onClick={() => onOpenTruthTableModal('table')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors shadow-xs"
                      title="Abrir editor modal completo"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Ver Completa</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Render Table */}
              {truthTable && truthTable.success && truthTable.rows.length > 0 ? (
                <div className="overflow-x-auto rounded border border-[var(--border-color)] bg-[var(--bg-surface)]">
                  <table className="w-full text-center font-mono-code text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-color)] bg-[var(--bg-surface-sub)]">
                        <th className="px-2 py-1.5 text-[10px] text-[var(--text-secondary)] font-bold">#</th>
                        {truthTable.inputVariables.map((v) => (
                          <th key={v} className="px-3 py-1.5 text-blue-500 font-bold border-r border-[var(--border-color)]">
                            {v}
                          </th>
                        ))}
                        {truthTable.outputVariables.map((o) => (
                          <th key={o} className="px-3 py-1.5 text-emerald-500 font-bold">
                            {o}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {truthTable.rows.slice(0, 32).map((row, idx) => (
                        <tr key={idx} className="border-b border-[var(--border-color)]/40 hover:bg-blue-500/5">
                          <td className="px-2 py-1 text-[10px] text-[var(--text-secondary)]">{idx}</td>
                          {truthTable.inputVariables.map((v) => (
                            <td key={v} className="px-3 py-1 font-semibold border-r border-[var(--border-color)]/40">
                              {row.inputs[v]}
                            </td>
                          ))}
                          {truthTable.outputVariables.map((o) => (
                            <td
                              key={o}
                              className={`px-3 py-1 font-bold ${
                                row.outputs[o] === 1 ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-400'
                              }`}
                            >
                              {row.outputs[o]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {truthTable.rows.length > 32 && (
                    <div className="p-2 text-center text-[10px] text-[var(--text-secondary)] border-t border-[var(--border-color)]">
                      Mostrando las primeras 32 combinaciones de {truthTable.rows.length}. Pulse «Ver Completa» para explorar todas.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-[var(--text-secondary)] rounded border border-[var(--border-color)] bg-[var(--bg-surface)]">
                  No se detectaron entradas o salidas activas en el circuito. Conecte interruptores (SWITCH) y receptores (LED) para generar la tabla.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXPRESIONES BOOLEANAS (SOP / POS CON KATEX) */}
          {activeTab === 'boolean' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-[var(--text-primary)]">
                  Álgebra Booleana y Simplificación Quine-McCluskey
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  Notación matemática formal con barras de negación sobrelineadas
                </span>
              </div>

              {booleanSolutions.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {booleanSolutions.map((sol) => (
                    <div
                      key={sol.outputName}
                      className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-[var(--border-color)]/60 pb-1.5">
                        <span className="font-bold text-xs text-blue-500">Salida: {sol.outputName}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] font-mono-code">
                          {sol.literals} literales (Ahorro: {Math.max(0, Math.round(((sol.originalLiterals - sol.literals) / (sol.originalLiterals || 1)) * 100))}%)
                        </span>
                      </div>

                      {/* Minterms & Maxterms */}
                      <div className="text-[11px] font-mono-code text-[var(--text-secondary)] flex flex-wrap gap-x-4">
                        <span>∑ m({sol.minterms.join(', ')})</span>
                        <span>∏ M({sol.maxterms.join(', ')})</span>
                      </div>

                      {/* Simplified SOP */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">
                          Suma de Productos Mínima (SOP):
                        </div>
                        <div className="p-2 rounded bg-[var(--bg-surface-sub)] border border-[var(--border-color)] overflow-x-auto text-sm">
                          <BooleanExpression expression={sol.sop} prefix={sol.outputName} />
                        </div>
                      </div>

                      {/* Simplified POS */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">
                          Producto de Sumas Mínimo (POS):
                        </div>
                        <div className="p-2 rounded bg-[var(--bg-surface-sub)] border border-[var(--border-color)] overflow-x-auto text-sm">
                          <BooleanExpression expression={sol.pos} prefix={sol.outputName} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-[var(--text-secondary)] rounded border border-[var(--border-color)] bg-[var(--bg-surface)]">
                  Construya un circuito combinacional con entradas identificadas (A, B...) y salidas (S, Cout...) para calcular automáticamente las funciones algebraicas mínimas.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MONITOR DE SEÑALES EN VIVO & RELOJ */}
          {activeTab === 'signals' && (
            <div className="space-y-3 font-mono-code text-[11px]">
              <div className="flex items-center justify-between font-sans">
                <span className="font-bold text-xs uppercase text-[var(--text-primary)]">
                  Monitor de Señales y Control de Oscilador
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--text-secondary)]">Frecuencia CLK:</span>
                  <input
                    type="range"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={simulation.clockHz}
                    onChange={(e) => setClockHz(parseFloat(e.target.value))}
                    className="w-24 accent-blue-600"
                  />
                  <span className="font-bold text-blue-500 w-12 text-right">{simulation.clockHz} Hz</span>
                </div>
              </div>

              {/* Signals Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {/* Inputs */}
                <div className="p-2.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <div className="text-[10px] font-sans font-bold uppercase text-[var(--text-secondary)] mb-1.5">
                    Entradas Conmutables ({inputs.length})
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {inputs.map((inp) => (
                      <div key={inp.id} className="flex items-center justify-between p-1 rounded bg-[var(--bg-surface-sub)]">
                        <span className="font-bold">{inp.label}</span>
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          inp.outputs[0]?.value === 1 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {inp.outputs[0]?.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gates */}
                <div className="p-2.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <div className="text-[10px] font-sans font-bold uppercase text-[var(--text-secondary)] mb-1.5">
                    Compuertas Lógicas ({intermediateGates.length})
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {intermediateGates.map((gate) => (
                      <div key={gate.id} className="flex items-center justify-between p-1 rounded bg-[var(--bg-surface-sub)]">
                        <span className="truncate pr-1">{gate.label} ({gate.type})</span>
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          gate.outputs[0]?.value === 1 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {gate.outputs[0]?.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outputs */}
                <div className="p-2.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <div className="text-[10px] font-sans font-bold uppercase text-[var(--text-secondary)] mb-1.5">
                    Salidas y Receptores ({outputs.length})
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {outputs.map((out) => (
                      <div key={out.id} className="flex items-center justify-between p-1 rounded bg-[var(--bg-surface-sub)]">
                        <span className="font-bold">{out.label}</span>
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          out.inputs[0]?.value === 1 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {out.inputs[0]?.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </footer>
  );
};
