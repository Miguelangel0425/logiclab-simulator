/**
 * LogicLab - Circuit Truth Table Generator & Bidirectional Synchronizer Modal
 * 
 * Supports:
 * 1. Circuit → Truth Table (automatic simulation of 2^n combinations, out-of-date detection)
 * 2. Truth Table → Circuit (Quine-McCluskey minimal synthesis in Standard, NAND-only, and NOR-only modes)
 * 3. Formal Equivalence Verification (Circuit vs Table comparison with mismatch reporting)
 * 4. Circuit Validation & Diagnostics (unconnected terminals, cycles, sequential components)
 * 5. CSV export, clipboard copy, live row testing
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  CircuitSimulator,
  CircuitTruthTableResult,
  CircuitTableComparisonResult,
} from '../../engines/circuit/simulator';
import { useCircuitStore } from '../../store/useCircuitStore';
import { useAppStore } from '../../store/useAppStore';
import { BooleanExpression } from '../math/BooleanExpression';
import { MathInline } from '../math/MathInline';
import { CircuitGenerator, SynthesisMode } from '../../engines/circuit/generator';
import { QuineMcCluskeyEngine } from '../../engines/boolean/quineMcCluskey';
import { KarnaughEngine } from '../../engines/karnaugh/karnaughEngine';
import { ConstructorFuncionBooleana } from '../common/ConstructorFuncionBooleana';
import { BooleanLogicService } from '../../engines/boolean/booleanLogicService';
import {
  Table,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  X,
  RefreshCw,
  Cpu,
  Layers,
  Sparkles,
  Download,
  AlertTriangle,
  GitCompare,
  Sliders,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Grid,
  Zap,
  ExternalLink,
} from 'lucide-react';

export type TruthTableModalTab = 'table' | 'karnaugh' | 'compare' | 'synthesize' | 'diagnostics';

interface CircuitTruthTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: TruthTableModalTab;
}

export const CircuitTruthTableModal: React.FC<CircuitTruthTableModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'table',
}) => {
  const {
    components,
    connections,
    toggleSwitch,
    associatedTruthTable,
    isTableOutdated,
    generateAssociatedTruthTable,
    compareWithTable,
    synthesizeCircuitFromTable,
    loadCircuit,
  } = useCircuitStore();

  const { setActiveTab: setAppActiveTab, setSharedBooleanFunction, showToast } = useAppStore();

  const [activeTab, setActiveTab] = useState<TruthTableModalTab>(defaultTab);
  const [copied, setCopied] = useState(false);
  const [synthesisMode, setSynthesisMode] = useState<SynthesisMode>('STANDARD');
  const [synthVarCount, setSynthVarCount] = useState<number>(3);
  const [synthInputType, setSynthInputType] = useState<'visual' | 'table'>('visual');
  const [synthVisualExpr, setSynthVisualExpr] = useState<string>('A · B + C');
  const [selectedOutputVar, setSelectedOutputVar] = useState<string>('');
  const [karnaughMode, setKarnaughMode] = useState<'SOP' | 'POS'>('SOP');
  const [karnaughSubMap, setKarnaughSubMap] = useState<number>(0);
  const [synthMinterms, setSynthMinterms] = useState<Record<number, 0 | 1 | 'X'>>({
    0: 0,
    1: 1,
    2: 1,
    3: 0,
    4: 1,
    5: 0,
    6: 1,
    7: 1,
  });
  const [synthesisSuccessMsg, setSynthesisSuccessMsg] = useState<string | null>(null);

  // Sync tab with defaultTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setSynthesisSuccessMsg(null);
    }
  }, [isOpen, defaultTab]);

  // Current or freshly evaluated truth table
  const tableResult: CircuitTruthTableResult = useMemo(() => {
    if (!isOpen) {
      return {
        success: false,
        inputVariables: [],
        outputVariables: [],
        rows: [],
        minterms: [],
        maxterms: [],
        circuitTimestamp: 0,
        validation: {
          unconnectedPins: [],
          hasSequentialComponents: false,
          sequentialComponentNames: [],
          hasCycle: false,
          warnings: [],
        },
      };
    }
    // If we have an associated truth table and it's up to date, use it; otherwise compute live
    if (associatedTruthTable && !isTableOutdated) {
      return associatedTruthTable;
    }
    return CircuitSimulator.generateTruthTable(components, connections);
  }, [isOpen, associatedTruthTable, isTableOutdated, components, connections]);

  // Comparison result
  const comparisonResult: CircuitTableComparisonResult = useMemo(() => {
    if (!isOpen || activeTab !== 'compare') {
      return {
        equivalent: false,
        inputs: [],
        outputs: [],
        totalCombinations: 0,
        matches: 0,
        matchingCombinations: 0,
        mismatches: [],
        message: '',
      };
    }
    return compareWithTable();
  }, [isOpen, activeTab, components, connections, tableResult]);

  // Determine current active input combination from switches
  const currentActiveBinary = useMemo(() => {
    if (!tableResult.success || tableResult.inputVariables.length === 0) return '';
    const switchComps = components.filter(
      (c) => c.type === 'SWITCH' || c.type === 'CONSTANT_0' || c.type === 'CONSTANT_1'
    );
    return tableResult.inputVariables
      .map((varName) => {
        const found = switchComps.find(
          (c) =>
            c.label.trim().toLowerCase() === varName.toLowerCase() ||
            c.label.replace(/^Entrada\s+/i, '').trim().toLowerCase() === varName.toLowerCase()
        );
        if (!found) return '0';
        if (found.type === 'SWITCH') return found.state?.switchActive ? '1' : '0';
        if (found.type === 'CONSTANT_1') return '1';
        return '0';
      })
      .join('');
  }, [tableResult, components]);

  const handleApplyCombination = (inputs: Record<string, 0 | 1>) => {
    const switches = components.filter((c) => c.type === 'SWITCH');
    for (const [varName, targetVal] of Object.entries(inputs)) {
      const sw = switches.find(
        (c) =>
          c.label.trim().toLowerCase() === varName.toLowerCase() ||
          c.label.replace(/^Entrada\s+/i, '').trim().toLowerCase() === varName.toLowerCase()
      );
      if (sw) {
        const currentVal = sw.state?.switchActive ? 1 : 0;
        if (currentVal !== targetVal) {
          toggleSwitch(sw.id);
        }
      }
    }
  };

  const handleRefreshTable = () => {
    generateAssociatedTruthTable();
  };

  const handleCopyTable = () => {
    if (!tableResult.success) return;
    const headerLine = `| Index | ${tableResult.inputVariables.join(' | ')} | ${tableResult.outputVariables.join(' | ')} |`;
    const sepLine = `| ${tableResult.inputVariables.map(() => '---').join(' | ')} | ${tableResult.outputVariables.map(() => '---').join(' | ')} |`;
    const rowsLines = tableResult.rows.map(
      (r) =>
        `| m_${r.index} | ${tableResult.inputVariables.map((v) => r.inputs[v]).join(' | ')} | ${tableResult.outputVariables.map((o) => r.outputs[o]).join(' | ')} |`
    );
    const fullText = [headerLine, sepLine, ...rowsLines].join('\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    if (!tableResult.success) return;
    const header = ['m_i', ...tableResult.inputVariables, ...tableResult.outputVariables].join(',');
    const rows = tableResult.rows.map((r) => [
      `m_${r.index}`,
      ...tableResult.inputVariables.map((v) => r.inputs[v]),
      ...tableResult.outputVariables.map((o) => r.outputs[o]),
    ].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'tabla_de_verdad_logiclab.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Variables for synthesis
  const synthVariables = useMemo(() => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    return letters.slice(0, synthVarCount);
  }, [synthVarCount]);

  const synthTotalRows = Math.pow(2, synthVarCount);

  // Minterms and dont cares for synthesis
  const activeSynthMinterms = useMemo(() => {
    const list: number[] = [];
    for (let i = 0; i < synthTotalRows; i++) {
      if (synthMinterms[i] === 1) list.push(i);
    }
    return list;
  }, [synthMinterms, synthTotalRows]);

  const activeSynthDontCares = useMemo(() => {
    const list: number[] = [];
    for (let i = 0; i < synthTotalRows; i++) {
      if (synthMinterms[i] === 'X') list.push(i);
    }
    return list;
  }, [synthMinterms, synthTotalRows]);

  // Preview minimized formula for synthesis
  const synthMinimizedFormula = useMemo(() => {
    try {
      if (activeSynthMinterms.length === 0) return '0';
      if (activeSynthMinterms.length === synthTotalRows) return '1';
      const qm = new QuineMcCluskeyEngine(synthVariables, activeSynthMinterms, activeSynthDontCares);
      const res = qm.solve();
      return res.sopSimplified || '0';
    } catch {
      return '';
    }
  }, [synthVariables, activeSynthMinterms, activeSynthDontCares, synthTotalRows]);

  const handleToggleSynthRow = (rowIndex: number) => {
    setSynthMinterms((prev) => {
      const current = prev[rowIndex] ?? 0;
      const next = current === 0 ? 1 : current === 1 ? 'X' : 0;
      return { ...prev, [rowIndex]: next };
    });
  };

  const handleSynthesizeCircuit = () => {
    synthesizeCircuitFromTable(synthVariables, activeSynthMinterms, activeSynthDontCares, synthesisMode);
    setSynthesisSuccessMsg('¡Circuito sintetizado y cargado en el lienzo con éxito! Comprobando equivalencia...');
    setTimeout(() => {
      setActiveTab('compare');
    }, 1200);
  };

  // Determine active output variable for Karnaugh analysis
  const activeOutputVar = useMemo(() => {
    if (selectedOutputVar && tableResult.outputVariables.includes(selectedOutputVar)) {
      return selectedOutputVar;
    }
    return tableResult.outputVariables[0] || '';
  }, [selectedOutputVar, tableResult.outputVariables]);

  // Evaluated Karnaugh engine & minimization from real circuit simulation
  const karnaughData = useMemo(() => {
    if (!tableResult.success || tableResult.inputVariables.length === 0 || !activeOutputVar) {
      return null;
    }
    const varCount = Math.min(5, Math.max(2, tableResult.inputVariables.length));
    const vars = tableResult.inputVariables.slice(0, varCount);
    while (vars.length < 2) {
      vars.push(String.fromCharCode(65 + vars.length));
    }

    const engine = new KarnaughEngine(varCount, vars);
    const minterms: number[] = [];
    const maxterms: number[] = [];
    const dontCares: number[] = [];

    tableResult.rows.forEach((r) => {
      const val = r.outputs[activeOutputVar];
      if (val === 1) minterms.push(r.index);
      else if (val === 0) maxterms.push(r.index);
      else if (val === 'X') dontCares.push(r.index);
    });

    engine.setFromMinterms(minterms, dontCares);
    const solved = engine.solve(karnaughMode, karnaughSubMap);
    const grid = engine.buildGrid(karnaughSubMap);

    return {
      engine,
      varCount,
      variables: vars,
      grid,
      solved,
      minterms,
      maxterms,
      dontCares,
    };
  }, [tableResult, activeOutputVar, karnaughMode, karnaughSubMap]);

  // Color helper for Karnaugh grid cells
  const getCellGroupColor = (mintermIndex: number) => {
    if (!karnaughData) return null;
    const matching = karnaughData.solved.groups.filter((g) => g.minterms.includes(mintermIndex));
    if (matching.length === 0) return null;
    return matching[0].color;
  };

  const handleOpenInKarnaughPage = () => {
    if (!karnaughData) return;
    const expr = karnaughMode === 'SOP' ? karnaughData.solved.sopExpression : karnaughData.solved.posExpression;
    setSharedBooleanFunction({
      expression: expr,
      variableCount: karnaughData.varCount,
      variables: karnaughData.variables,
      source: 'circuit',
      minterms: karnaughData.minterms,
      dontCares: karnaughData.dontCares,
      timestamp: Date.now(),
    });
    setAppActiveTab('karnaugh');
    onClose();
    showToast('info', 'Mapa de Karnaugh transferido al módulo interactivo');
  };

  const handleOpenInBooleanSolver = () => {
    if (!karnaughData) return;
    const expr = karnaughMode === 'SOP' ? karnaughData.solved.sopExpression : karnaughData.solved.posExpression;
    setSharedBooleanFunction({
      expression: expr,
      variableCount: karnaughData.varCount,
      variables: karnaughData.variables,
      source: 'circuit',
      minterms: karnaughData.minterms,
      dontCares: karnaughData.dontCares,
      timestamp: Date.now(),
    });
    setAppActiveTab('boolean-solver');
    onClose();
    showToast('info', 'Función transferida al simplificador booleano Quine-McCluskey');
  };

  const handleSynthesizeKarnaughMinimal = () => {
    if (!karnaughData) return;
    const expr = karnaughMode === 'SOP' ? karnaughData.solved.sopExpression : karnaughData.solved.posExpression;
    try {
      const { components: comps, connections: conns } = CircuitGenerator.fromExpression(expr, 'STANDARD');
      loadCircuit(comps, conns);
      showToast('success', `Circuito mínimo de Karnaugh (${expr}) sintetizado en el lienzo.`);
      onClose();
    } catch {
      showToast('error', 'Error al sintetizar circuito a partir del mapa de Karnaugh.');
    }
  };

  const handleSynthesizeVisualExpression = (exprToSynthesize?: string) => {
    const expr = (exprToSynthesize || synthVisualExpr).trim();
    if (!expr) {
      showToast('warning', 'Introduzca una expresión booleana válida');
      return;
    }
    try {
      const { components: comps, connections: conns } = BooleanLogicService.synthesizeCircuit(expr, synthesisMode);
      loadCircuit(comps, conns);
      setSynthesisSuccessMsg(`¡Circuito (${expr}) sintetizado exitosamente en el lienzo!`);
      showToast('success', `Circuito ${synthesisMode} sintetizado en el lienzo`);
      setTimeout(() => {
        setActiveTab('compare');
      }, 1200);
    } catch {
      showToast('error', 'Error al sintetizar el circuito a partir de la expresión booleana');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl flex flex-col overflow-hidden text-sm">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-sub)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-[var(--text-primary)]">
                  Sincronizador Circuito ⇄ Tabla de Verdad
                </h2>
                {isTableOutdated && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse">
                    Desactualizada
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Simulación del grafo eléctrico en tiempo real, síntesis Quine-McCluskey y verificación formal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs Navigation */}
        <div className="px-4 pt-2 border-b border-[var(--border-color)] bg-[var(--bg-surface-sub)] flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'table'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Tabla de Verdad</span>
            {isTableOutdated && <span className="w-2 h-2 rounded-full bg-amber-500" />}
          </button>

          <button
            onClick={() => setActiveTab('karnaugh')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'karnaugh'
                ? 'border-emerald-500 text-emerald-500'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Grid className="w-4 h-4 text-emerald-500" />
            <span>Mapa de Karnaugh</span>
          </button>

          <button
            onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'compare'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span>Comparar Circuito y Tabla</span>
          </button>

          <button
            onClick={() => setActiveTab('synthesize')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'synthesize'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Generar Circuito desde Tabla</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Validaciones ({tableResult.unconnectedPins?.length || 0})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* TAB 1: VER / GENERAR TABLA DE VERDAD */}
          {activeTab === 'table' && (
            <div className="space-y-4">
              {/* Outdated Notice Banner */}
              {isTableOutdated && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-500">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      El circuito ha sufrido modificaciones desde la última generación de la tabla.
                    </span>
                  </div>
                  <button
                    onClick={handleRefreshTable}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-black font-semibold transition-colors shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Actualizar tabla</span>
                  </button>
                </div>
              )}

              {!tableResult.success ? (
                <div className="p-8 text-center space-y-3">
                  <div className="inline-flex p-3 rounded-full bg-amber-500/15 text-amber-500">
                    <Cpu className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-[var(--text-primary)] text-base">
                    No se puede evaluar la tabla de verdad
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                    {tableResult.message}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Asegúrese de conectar al menos una entrada (interruptor o constante) y un punto de salida (LED o compuerta).
                  </p>
                </div>
              ) : (
                <>
                  {/* Boolean Minimization Banner */}
                  {tableResult.sopExpression && (
                    <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                        <div>
                          <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            Ecuación Booleana Simplificada (SOP)
                          </div>
                          <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                            <BooleanExpression prefix="F" expression={tableResult.sopExpression} />
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] font-mono-code text-[var(--text-secondary)] space-x-2 shrink-0">
                        <span>
                          <MathInline math={`\\sum m(${tableResult.minterms.join(', ')})`} />
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Table Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">
                        Entradas ({tableResult.inputVariables.length}): {tableResult.inputVariables.join(', ')}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        Salidas ({tableResult.outputVariables.length}): {tableResult.outputVariables.join(', ')}
                      </span>
                      <span>•</span>
                      <span>{tableResult.rows.length} combinaciones</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRefreshTable}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--bg-surface-sub)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium transition-colors"
                        title="Actualizar tabla con el estado actual del circuito"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                        <span>Actualizar</span>
                      </button>
                      <button
                        onClick={handleCopyTable}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--bg-surface-sub)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium transition-colors"
                        title="Copiar tabla al portapapeles en formato Markdown"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copiada' : 'Copiar'}</span>
                      </button>
                      <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--bg-surface-sub)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium transition-colors"
                        title="Descargar tabla en formato CSV"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-500" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Truth Table Grid */}
                  <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-xs text-center border-collapse">
                        <thead className="bg-[var(--bg-surface-sub)] sticky top-0 z-10 border-b border-[var(--border-color)] font-mono-code font-bold">
                          <tr>
                            <th className="py-2 px-3 border-r border-[var(--border-color)] text-[var(--text-secondary)] w-14">
                              m_i
                            </th>
                            {tableResult.inputVariables.map((v) => (
                              <th key={v} className="py-2 px-3 border-r border-[var(--border-color)] text-blue-500">
                                {v}
                              </th>
                            ))}
                            {tableResult.outputVariables.map((o) => (
                              <th key={o} className="py-2 px-4 text-emerald-500 font-bold">
                                {o}
                              </th>
                            ))}
                            <th className="py-2 px-3 text-[var(--text-secondary)] w-24">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)] font-mono-code">
                          {tableResult.rows.map((row) => {
                            const isActiveState = row.binary === currentActiveBinary;

                            return (
                              <tr
                                key={row.index}
                                className={`transition-colors ${
                                  isActiveState
                                    ? 'bg-blue-500/15 font-bold'
                                    : row.index % 2 === 0
                                    ? 'bg-[var(--bg-surface)]'
                                    : 'bg-[var(--bg-surface-sub)]/50'
                                } hover:bg-blue-500/10`}
                              >
                                <td className="py-1.5 px-3 border-r border-[var(--border-color)] text-[var(--text-secondary)]">
                                  m_{row.index}
                                </td>
                                {tableResult.inputVariables.map((v) => (
                                  <td key={v} className="py-1.5 px-3 border-r border-[var(--border-color)]">
                                    <span
                                      className={`px-1.5 py-0.5 rounded ${
                                        row.inputs[v] === 1
                                          ? 'text-blue-500 font-bold bg-blue-500/10'
                                          : 'text-[var(--text-secondary)]'
                                      }`}
                                    >
                                      {row.inputs[v]}
                                    </span>
                                  </td>
                                ))}
                                {tableResult.outputVariables.map((o) => {
                                  const val = row.outputs[o];
                                  return (
                                    <td key={o} className="py-1.5 px-4 font-bold">
                                      <span
                                        className={`px-2 py-0.5 rounded ${
                                          val === 1
                                            ? 'bg-emerald-500/20 text-emerald-500 font-bold'
                                            : val === 0
                                            ? 'bg-slate-500/20 text-slate-400'
                                            : 'bg-amber-500/20 text-amber-500'
                                        }`}
                                      >
                                        {val}
                                      </span>
                                    </td>
                                  );
                                })}
                                <td className="py-1.5 px-2">
                                  {isActiveState ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-500 font-bold">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Activo</span>
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleApplyCombination(row.inputs)}
                                      className="px-2 py-0.5 rounded text-[10px] bg-[var(--bg-surface-sub)] hover:bg-blue-600 hover:text-white border border-[var(--border-color)] transition-colors"
                                      title="Aplicar esta combinación a los interruptores del circuito"
                                    >
                                      Probar
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: MAPA DE KARNAUGH ASOCIADO AL CIRCUITO */}
          {activeTab === 'karnaugh' && (
            <div className="space-y-4">
              {/* Outdated Notice Banner */}
              {isTableOutdated && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-500">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      El circuito ha sufrido modificaciones desde la última evaluación del mapa de Karnaugh.
                    </span>
                  </div>
                  <button
                    onClick={handleRefreshTable}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-black font-semibold transition-colors shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Actualizar mapa</span>
                  </button>
                </div>
              )}

              {!tableResult.success || !karnaughData ? (
                <div className="p-8 text-center space-y-3">
                  <div className="inline-flex p-3 rounded-full bg-emerald-500/15 text-emerald-500">
                    <Grid className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-[var(--text-primary)] text-base">
                    No se puede generar el mapa de Karnaugh
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                    {tableResult.message || 'Se requiere al menos una entrada (interruptor o constante) y una salida (LED o compuerta) en el circuito.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Controls Bar: Multi-output selector, SOP/POS mode, Submap */}
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-sub)] border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Output Selector for Multi-Output Circuits */}
                      {tableResult.outputVariables.length > 1 ? (
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            Salida a Mapear:
                          </label>
                          <select
                            value={activeOutputVar}
                            onChange={(e) => setSelectedOutputVar(e.target.value)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border-color)] text-blue-500 cursor-pointer shadow-xs"
                          >
                            {tableResult.outputVariables.map((v) => (
                              <option key={v} value={v}>
                                Salida {v}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-bold text-[var(--text-secondary)] uppercase tracking-wider">Salida:</span>
                          <span className="font-bold text-blue-500 px-2 py-0.5 rounded bg-blue-500/10">
                            {activeOutputVar}
                          </span>
                        </div>
                      )}

                      {/* Mode Toggle: SOP / POS */}
                      <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-0.5 rounded-lg border border-[var(--border-color)]">
                        <button
                          type="button"
                          onClick={() => setKarnaughMode('SOP')}
                          className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-all ${
                            karnaughMode === 'SOP'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          SOP (Unos)
                        </button>
                        <button
                          type="button"
                          onClick={() => setKarnaughMode('POS')}
                          className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-all ${
                            karnaughMode === 'POS'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          POS (Ceros)
                        </button>
                      </div>

                      {/* 5-Variable Sub-map selector */}
                      {karnaughData.varCount === 5 && (
                        <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] p-0.5 rounded-lg border border-[var(--border-color)]">
                          <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] px-1.5">
                            Submapa ({karnaughData.variables[0]}):
                          </span>
                          <button
                            type="button"
                            onClick={() => setKarnaughSubMap(0)}
                            className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                              karnaughSubMap === 0 ? 'bg-blue-600 text-white' : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            {karnaughData.variables[0]} = 0
                          </button>
                          <button
                            type="button"
                            onClick={() => setKarnaughSubMap(1)}
                            className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                              karnaughSubMap === 1 ? 'bg-blue-600 text-white' : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            {karnaughData.variables[0]} = 1
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRefreshTable}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-sub)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Reevaluar circuito y recalcular mapa de Karnaugh"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                        <span>Recalcular</span>
                      </button>
                    </div>
                  </div>

                  {/* Minimized Equation Card */}
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                          <span>Función Simplificada por Mapa de Karnaugh ({karnaughMode})</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-500 font-normal">
                            Simulación Exacta
                          </span>
                        </div>
                        <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                          <BooleanExpression
                            prefix={activeOutputVar}
                            expression={
                              karnaughMode === 'SOP'
                                ? karnaughData.solved.sopExpression || '0'
                                : karnaughData.solved.posExpression || '1'
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-xs font-mono-code text-[var(--text-secondary)] shrink-0">
                      {karnaughMode === 'SOP' ? (
                        <span>
                          <MathInline math={`\\sum m(${karnaughData.minterms.join(', ') || '0'})`} />
                        </span>
                      ) : (
                        <span>
                          <MathInline math={`\\prod M(${karnaughData.maxterms.join(', ') || '0'})`} />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* The Interactive Gray-Code Karnaugh Map Matrix */}
                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--text-primary)]">
                        Distribución en Código Gray ({karnaughData.varCount} Variables: {karnaughData.variables.join(', ')})
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Adyacencia toroidal y de esquinas calculada
                      </span>
                    </div>

                    <div className="overflow-x-auto flex justify-center py-2">
                      <div className="inline-block border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm bg-[var(--bg-base)]">
                        <table className="border-collapse text-center select-none">
                          <thead>
                            <tr>
                              {/* Diagonal variable header */}
                              <th className="py-2.5 px-4 bg-[var(--bg-surface-sub)] border-b border-r border-[var(--border-color)] text-[11px] font-mono-code font-bold text-[var(--text-secondary)]">
                                {karnaughData.engine.getRowVars().join('')} \ {karnaughData.engine.getColVars().join('')}
                              </th>
                              {/* Column Gray code headers */}
                              {karnaughData.engine.getColGray().map((colBin) => (
                                <th
                                  key={colBin}
                                  className="py-2.5 px-5 bg-[var(--bg-surface-sub)] border-b border-r last:border-r-0 border-[var(--border-color)] text-xs font-mono-code font-bold text-blue-500"
                                >
                                  {colBin}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {karnaughData.grid.map((rowCells, rIdx) => (
                              <tr key={rIdx}>
                                {/* Row Gray code header */}
                                <th className="py-2.5 px-4 bg-[var(--bg-surface-sub)] border-b last:border-b-0 border-r border-[var(--border-color)] text-xs font-mono-code font-bold text-indigo-500">
                                  {karnaughData.engine.getRowGray()[rIdx]}
                                </th>
                                {/* Cell values */}
                                {rowCells.map((cell) => {
                                  const groupColor = getCellGroupColor(cell.mintermIndex);
                                  const isOne = cell.value === 1;
                                  const isZero = cell.value === 0;
                                  const isDontCare = cell.value === 'X';

                                  return (
                                    <td
                                      key={cell.col}
                                      className="relative py-3 px-5 border-b last:border-b-0 border-r last:border-r-0 border-[var(--border-color)] transition-all"
                                      style={{
                                        backgroundColor: groupColor ? `${groupColor}15` : undefined,
                                        boxShadow: groupColor ? `inset 0 0 0 2px ${groupColor}` : undefined,
                                      }}
                                    >
                                      {/* Logic value */}
                                      <div
                                        className={`text-sm font-bold font-mono-code ${
                                          isOne
                                            ? 'text-emerald-500 scale-105'
                                            : isZero
                                            ? 'text-[var(--text-muted)]'
                                            : 'text-amber-500'
                                        }`}
                                      >
                                        {cell.value}
                                      </div>
                                      {/* Minterm index subscript badge */}
                                      <span className="absolute bottom-1 right-1 text-[9px] font-mono-code text-[var(--text-muted)]">
                                        m{cell.mintermIndex}
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

                    {/* Groups and Prime Implicants List */}
                    {karnaughData.solved.groups.length > 0 && (
                      <div className="pt-2 border-t border-[var(--border-color)] space-y-1.5">
                        <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                          Agrupaciones Óptimas Identificadas ({karnaughData.solved.groups.length}):
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {karnaughData.solved.groups.map((group, idx) => (
                            <div
                              key={group.id}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border"
                              style={{
                                borderColor: `${group.color}60`,
                                backgroundColor: `${group.color}15`,
                                color: group.color,
                              }}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: group.color }}
                              />
                              <span className="font-bold">Grupo {idx + 1}:</span>
                              <span className="font-mono-code">
                                m({group.minterms.join(', ')})
                              </span>
                              <span>→</span>
                              <span className="font-bold font-mono-code">
                                {group.expression}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenInKarnaughPage}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface-sub)] hover:bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer"
                        title="Abrir este mapa de Karnaugh en el módulo interactivo a pantalla completa"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                        <span>Abrir en Pantalla de K-Maps</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenInBooleanSolver}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface-sub)] hover:bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer"
                        title="Analizar esta función en el simplificador Quine-McCluskey"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Simplificar con Quine-McCluskey</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSynthesizeKarnaughMinimal}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <Cpu className="w-4 h-4" />
                      <span>Sintetizar Circuito Mínimo en Lienzo</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: COMPARAR CIRCUITO Y TABLA */}
          {activeTab === 'compare' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)]">
                <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                  <GitCompare className="w-4 h-4 text-blue-500" />
                  <span>Verificación Matemática Formal</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Evalúa el motor de simulación real en todas las combinaciones de entrada y compara cada señal de salida con la tabla esperada.
                </p>
              </div>

              {comparisonResult.error ? (
                <div className="p-6 text-center space-y-2 border border-amber-500/30 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                  <div className="font-bold text-[var(--text-primary)]">No se pudo comparar</div>
                  <div className="text-xs text-[var(--text-secondary)]">{comparisonResult.error}</div>
                </div>
              ) : comparisonResult.equivalent ? (
                <div className="p-6 text-center space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10">
                  <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-500">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-500">
                    Circuito y tabla equivalentes
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] max-w-lg mx-auto">
                    El circuito conectado implementa con precisión matemática el 100% de las combinaciones ({comparisonResult.matchingCombinations} de {comparisonResult.totalCombinations} filas coinciden).
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-emerald-500/30 text-xs text-[var(--text-primary)]">
                    <span className="font-semibold">Entradas evaluadas:</span> {comparisonResult.inputs.join(', ')}
                    <span>•</span>
                    <span className="font-semibold">Salidas validadas:</span> {comparisonResult.outputs.join(', ')}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 flex items-start gap-3">
                    <XCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-rose-500 text-sm">
                        Circuito y tabla NO equivalentes
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Se detectaron {comparisonResult.mismatches.length} discrepancias entre el circuito simulado y los valores esperados ({comparisonResult.matchingCombinations} de {comparisonResult.totalCombinations} coincidencias).
                      </p>
                    </div>
                  </div>

                  {/* Mismatches Breakdown */}
                  <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                    <div className="p-2.5 bg-[var(--bg-surface-sub)] border-b border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)]">
                      Combinaciones con discrepancia
                    </div>
                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-xs text-center border-collapse">
                        <thead className="bg-[var(--bg-surface-sub)] font-mono-code font-bold">
                          <tr>
                            <th className="py-2 px-3 border-r border-[var(--border-color)]">Fila</th>
                            <th className="py-2 px-3 border-r border-[var(--border-color)]">Entradas</th>
                            <th className="py-2 px-3 border-r border-[var(--border-color)]">Salida</th>
                            <th className="py-2 px-3 border-r border-[var(--border-color)] text-emerald-500">Esperado</th>
                            <th className="py-2 px-3 text-rose-500">Obtenido en Circuito</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)] font-mono-code">
                          {comparisonResult.mismatches.map((m, idx) => (
                            <tr key={idx} className="bg-rose-500/5 hover:bg-rose-500/10">
                              <td className="py-1.5 px-3 border-r border-[var(--border-color)] text-[var(--text-secondary)]">
                                m_{m.rowIndex}
                              </td>
                              <td className="py-1.5 px-3 border-r border-[var(--border-color)]">
                                {Object.entries(m.inputs).map(([k, v]) => `${k}=${v}`).join(', ')}
                              </td>
                              <td className="py-1.5 px-3 border-r border-[var(--border-color)] font-bold">
                                {m.outputName}
                              </td>
                              <td className="py-1.5 px-3 border-r border-[var(--border-color)] text-emerald-500 font-bold">
                                {m.expected}
                              </td>
                              <td className="py-1.5 px-3 text-rose-500 font-bold">
                                {m.actual}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GENERAR CIRCUITO DESDE TABLA */}
          {activeTab === 'synthesize' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-[var(--text-primary)]">
                    Generador y Síntesis de Circuitos Lógicos
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Construya visualmente la función booleana con botones o defina los mintérminos 2ⁿ para sintetizar el circuito.
                  </p>
                </div>

                {/* Switcher: Visual Builder vs Table Matrix */}
                <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--border-color)] shrink-0">
                  <button
                    type="button"
                    onClick={() => setSynthInputType('visual')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      synthInputType === 'visual'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Constructor Visual
                  </button>
                  <button
                    type="button"
                    onClick={() => setSynthInputType('table')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      synthInputType === 'table'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Matriz de Mintérminos (2ⁿ)
                  </button>
                </div>
              </div>

              {synthesisSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{synthesisSuccessMsg}</span>
                </div>
              )}

              {/* Technology Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSynthesisMode('STANDARD')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    synthesisMode === 'STANDARD'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-500 shadow-sm'
                      : 'border-[var(--border-color)] bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="font-bold text-xs">Estándar (AND + OR + NOT)</div>
                  <div className="text-[11px] mt-1 opacity-80">
                    Suma de productos mínima con compuertas estándar multientrada
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSynthesisMode('NAND_ONLY')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    synthesisMode === 'NAND_ONLY'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-500 shadow-sm'
                      : 'border-[var(--border-color)] bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="font-bold text-xs">Exclusivo NAND (Universal)</div>
                  <div className="text-[11px] mt-1 opacity-80">
                    Transformación De Morgan: 100% compuertas NAND universales
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSynthesisMode('NOR_ONLY')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    synthesisMode === 'NOR_ONLY'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-500 shadow-sm'
                      : 'border-[var(--border-color)] bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="font-bold text-xs">Exclusivo NOR (Universal)</div>
                  <div className="text-[11px] mt-1 opacity-80">
                    Transformación De Morgan dual: 100% compuertas NOR
                  </div>
                </button>
              </div>

              {/* Mode A: Constructor Visual */}
              {synthInputType === 'visual' ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] space-y-4 shadow-xs">
                    <ConstructorFuncionBooleana
                      title="Constructor de Función para Síntesis de Circuito"
                      subtitle="Construya la expresión visualmente con compuertas y complementos para transferirla al lienzo"
                      initialVariables={synthVariables}
                      initialExpression={synthVisualExpr}
                      initialVarCount={synthVarCount}
                      allowedVarCounts={[2, 3, 4, 5, 6]}
                      onChange={(fn) => setSynthVisualExpr(fn.expression)}
                      onApply={(fn) => handleSynthesizeVisualExpression(fn.expression)}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => handleSynthesizeVisualExpression()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Sintetizar Circuito {synthesisMode} en Lienzo</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Mode B: Matriz de Mintérminos 2ⁿ */
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-secondary)]">Número de Variables:</span>
                    <div className="flex items-center gap-1.5">
                      {[2, 3, 4].map((n) => (
                        <button
                          key={n}
                          onClick={() => setSynthVarCount(n)}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                            synthVarCount === n
                              ? 'bg-blue-600 text-white'
                              : 'bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {n} ({Math.pow(2, n)} filas)
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Formula Preview */}
                  <div className="p-3 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] flex items-center justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                        Ecuación Booleana Minimizada (Quine-McCluskey)
                      </div>
                      <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                        <BooleanExpression prefix="F" expression={synthMinimizedFormula || '0'} />
                      </div>
                    </div>
                    <div className="text-xs font-mono-code text-[var(--text-secondary)]">
                      Mintérminos: [{activeSynthMinterms.join(', ')}]
                    </div>
                  </div>

                  {/* Editable Truth Table Matrix */}
                  <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-xs text-center border-collapse">
                        <thead className="bg-[var(--bg-surface-sub)] sticky top-0 z-10 border-b border-[var(--border-color)] font-mono-code font-bold">
                          <tr>
                            <th className="py-2 px-3 border-r border-[var(--border-color)] text-[var(--text-secondary)]">m_i</th>
                            {synthVariables.map((v) => (
                              <th key={v} className="py-2 px-3 border-r border-[var(--border-color)] text-blue-500">{v}</th>
                            ))}
                            <th className="py-2 px-4 text-emerald-500 font-bold">F (Clic para alternar 0 ⇄ 1 ⇄ X)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)] font-mono-code">
                          {Array.from({ length: synthTotalRows }).map((_, i) => {
                            const bin = i.toString(2).padStart(synthVarCount, '0');
                            const val = synthMinterms[i] ?? 0;
                            return (
                              <tr key={i} className="hover:bg-blue-500/10">
                                <td className="py-1 px-3 border-r border-[var(--border-color)] text-[var(--text-secondary)]">
                                  m_{i}
                                </td>
                                {bin.split('').map((bit, bitIdx) => (
                                  <td key={bitIdx} className="py-1 px-3 border-r border-[var(--border-color)]">
                                    {bit}
                                  </td>
                                ))}
                                <td className="py-1 px-4">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSynthRow(i)}
                                    className={`px-4 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                                      val === 1
                                        ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'
                                        : val === 0
                                        ? 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30'
                                        : 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
                                    }`}
                                  >
                                    {val}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSynthesizeCircuit}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Sintetizar y cargar circuito en lienzo</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DIAGNÓSTICO Y VALIDACIONES */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)]">
                <div className="font-bold text-[var(--text-primary)]">Diagnóstico Eléctrico del Circuito</div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Detección proactiva de terminales flotantes, bucles combinacionales y componentes de memoria secuencial.
                </p>
              </div>

              {/* Unconnected Pins */}
              <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span>Terminales sin Conectar (Flotantes)</span>
                  </div>
                  <span className="text-xs font-mono-code text-[var(--text-secondary)]">
                    {tableResult.unconnectedPins?.length || 0} detectados
                  </span>
                </div>

                {!tableResult.unconnectedPins || tableResult.unconnectedPins.length === 0 ? (
                  <div className="text-xs text-emerald-500 flex items-center gap-1.5 py-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Todos los pines de entrada y compuertas tienen conexiones válidas.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {tableResult.unconnectedPins.map((p, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1.5 rounded bg-[var(--bg-surface-sub)] text-xs flex items-center justify-between text-[var(--text-secondary)] font-mono-code"
                      >
                        <span>{p.compLabel} ({p.compId.slice(0, 8)})</span>
                        <span className="text-amber-500 font-bold">Pin: {p.pinLabel || p.pinName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sequential Components Warning */}
              {tableResult.hasSequentialComponents && (
                <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-1.5">
                  <div className="font-bold text-xs text-amber-500 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Advertencia: Componentes Secuenciales Detectados</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    El circuito contiene elementos con estado interno o dependientes de reloj (Flip-Flops, latches, contadores o reloj oscilador). Su comportamiento depende del tiempo e historial de estados y no puede reducirse enteramente a una función combinacional estática pura.
                  </p>
                </div>
              )}

              {/* Cycles */}
              {tableResult.hasCycle && (
                <div className="p-4 rounded-lg border border-rose-500/30 bg-rose-500/10 space-y-1.5">
                  <div className="font-bold text-xs text-rose-500 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    <span>Bucle Combinacional Detectado (Retroalimentación)</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Existe un ciclo en el grafo que puede provocar oscilaciones no convergentes o carreras críticas. El simulador aplica un límite de iteraciones para evitar bloqueos del sistema.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-surface-sub)] flex items-center justify-between text-xs">
          <div className="text-[var(--text-secondary)] flex items-center gap-2">
            <span>Motor: <strong className="text-[var(--text-primary)]">CircuitSimulator 2ⁿ Direct Graph</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
