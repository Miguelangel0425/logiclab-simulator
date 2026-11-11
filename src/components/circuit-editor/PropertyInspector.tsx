/**
 * LogicLab - Component & Canvas Property Inspector (Right Panel)
 * Live pin states, label editing, multi-input gate adjustment, and simulation parameters
 */

import React, { useState } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import {
  Trash2,
  Copy,
  Sliders,
  Activity,
  Info,
  Zap,
  X,
  RotateCw,
  Scissors,
  Table,
  Download,
  CheckCircle,
  ExternalLink,
  Box,
  Layers,
} from 'lucide-react';
import { SubcircuitRegistry } from '../../engines/circuit/subcircuitRegistry';
import { CreateSubcircuitModal } from './CreateSubcircuitModal';

export interface PropertyInspectorProps {
  onClose?: () => void;
  className?: string;
}

const generateBcdTableData = (
  isAnode: boolean,
  invalidMode: 'BLANK' | 'INVALID_DASH' | 'HEX_LETTERS'
) => {
  const rows = [];
  const CATHODE_MAP: Record<number, number[]> = {
    0: [1, 1, 1, 1, 1, 1, 0],
    1: [0, 1, 1, 0, 0, 0, 0],
    2: [1, 1, 0, 1, 1, 0, 1],
    3: [1, 1, 1, 1, 0, 0, 1],
    4: [0, 1, 1, 0, 0, 1, 1],
    5: [1, 0, 1, 1, 0, 1, 1],
    6: [1, 0, 1, 1, 1, 1, 1],
    7: [1, 1, 1, 0, 0, 0, 0],
    8: [1, 1, 1, 1, 1, 1, 1],
    9: [1, 1, 1, 1, 0, 1, 1],
  };

  const HEX_MAP: Record<number, { segs: number[]; char: string }> = {
    10: { segs: [1, 1, 1, 0, 1, 1, 1], char: 'A' },
    11: { segs: [0, 0, 1, 1, 1, 1, 1], char: 'b' },
    12: { segs: [1, 0, 0, 1, 1, 1, 0], char: 'C' },
    13: { segs: [0, 1, 1, 1, 1, 0, 1], char: 'd' },
    14: { segs: [1, 0, 0, 1, 1, 1, 1], char: 'E' },
    15: { segs: [1, 0, 0, 0, 1, 1, 1], char: 'F' },
  };

  for (let n = 0; n < 16; n++) {
    const D = (n >> 3) & 1;
    const C = (n >> 2) & 1;
    const B = (n >> 1) & 1;
    const A = n & 1;

    let segs: number[];
    let charDisplay: string;

    if (n <= 9) {
      segs = [...CATHODE_MAP[n]];
      charDisplay = String(n);
    } else {
      if (invalidMode === 'BLANK') {
        segs = [0, 0, 0, 0, 0, 0, 0];
        charDisplay = '(apagado)';
      } else if (invalidMode === 'HEX_LETTERS') {
        segs = [...HEX_MAP[n].segs];
        charDisplay = HEX_MAP[n].char;
      } else {
        segs = [0, 0, 0, 0, 0, 0, 1];
        charDisplay = '-';
      }
    }

    if (isAnode) {
      segs = segs.map((s) => (s === 1 ? 0 : 1));
    }

    rows.push({
      n,
      D,
      C,
      B,
      A,
      a: segs[0],
      b: segs[1],
      c: segs[2],
      d: segs[3],
      e: segs[4],
      f: segs[5],
      g: segs[6],
      charDisplay,
      isInvalid: n > 9,
    });
  }
  return rows;
};

const handleExportBcdCsv = (
  isAnode: boolean,
  invalidMode: 'BLANK' | 'INVALID_DASH' | 'HEX_LETTERS'
) => {
  const rows = generateBcdTableData(isAnode, invalidMode);
  let csv = 'Decimal,D,C,B,A,a,b,c,d,e,f,g,Caracter,Modo\n';
  rows.forEach((r) => {
    csv += `${r.n},${r.D},${r.C},${r.B},${r.A},${r.a},${r.b},${r.c},${r.d},${r.e},${r.f},${r.g},"${r.charDisplay}","${isAnode ? 'Anodo Comun' : 'Catodo Comun'}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `tabla_verdad_bcd_${isAnode ? 'anodo' : 'catodo'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({ onClose, className = '' }) => {
  const [showBcdModal, setShowBcdModal] = useState(false);
  const [isCreateSubcircuitOpen, setIsCreateSubcircuitOpen] = useState(false);

  const {
    components,
    connections,
    selectedComponentIds,
    selectedWireId,
    simulation,
    snapToGrid,
    removeComponent,
    removeConnection,
    duplicateSelected,
    copySelected,
    cutSelected,
    rotateComponent,
    rotateSelected,
    updateComponentLabel,
    updateComponentInputCount,
    updateComponentOrientation,
    updateComponentState,
    openSubcircuit,
    setClockHz,
    setSnapToGrid,
    resetView,
  } = useCircuitStore();

  const selectedComp = components.find((c) => c.id === selectedComponentIds[0]);
  const selectedWire = connections.find((w) => w.id === selectedWireId);

  // Helper for pin state badges
  const renderValBadge = (val: any) => {
    if (val === 1) {
      return <span className="px-1.5 py-0.5 text-[10px] font-mono-code font-bold rounded bg-emerald-500/20 text-emerald-500">1 (HIGH)</span>;
    }
    if (val === 0) {
      return <span className="px-1.5 py-0.5 text-[10px] font-mono-code font-bold rounded bg-slate-500/20 text-slate-400">0 (LOW)</span>;
    }
    return <span className="px-1.5 py-0.5 text-[10px] font-mono-code font-bold rounded bg-amber-500/20 text-amber-500">X (FLOTANTE)</span>;
  };

  return (
    <aside className={`w-72 h-full border-l border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col select-none text-xs shrink-0 ${className}`}>
      <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          <Sliders className="w-3.5 h-3.5" />
          <span>Inspector de Propiedades</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Cerrar inspector"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {selectedComp ? (
          <>
            {/* Component Header & Actions */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono-code text-[10px] text-blue-500 font-bold uppercase">
                  {selectedComp.type}
                </span>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">{selectedComp.label}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={copySelected}
                  title="Copiar componente (Ctrl+C)"
                  className="p-1.5 rounded hover:bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-blue-500 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={cutSelected}
                  title="Cortar componente (Ctrl+X)"
                  className="p-1.5 rounded hover:bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-amber-500 transition-colors"
                >
                  <Scissors className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={duplicateSelected}
                  title="Duplicar componente (Ctrl+D)"
                  className="p-1.5 rounded hover:bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-blue-500 transition-colors"
                >
                  <span className="font-mono-code text-[11px] font-bold">×2</span>
                </button>
                <button
                  onClick={() => rotateComponent(selectedComp.id, true)}
                  title="Rotar 90° horario (R)"
                  className="p-1.5 rounded hover:bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-indigo-500 transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => removeComponent(selectedComp.id)}
                  title="Eliminar (Supr)"
                  className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Action: Encapsulate into Subcircuit */}
            <div className="p-2.5 rounded-lg bg-cyan-950/25 border border-cyan-500/40 flex items-center justify-between gap-2 shadow-xs">
              <div className="min-w-0 pr-1">
                <span className="font-bold text-xs text-cyan-300 truncate block">
                  {selectedComponentIds.length === 1 ? 'Encapsular Componente' : `Encapsular ${selectedComponentIds.length} Componentes`}
                </span>
                <p className="text-[10px] text-slate-400 truncate">
                  Crear bloque modular reutilizable
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateSubcircuitOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0"
                title="Crear un subcircuito con los componentes seleccionados"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Subcircuito</span>
              </button>
            </div>

            {/* CAD Rotation Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Orientación / Rotación
                </label>
                <span className="font-mono-code text-[10px] text-blue-500 font-bold">
                  {selectedComp.rotation || 0}°
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {([0, 90, 180, 270] as const).map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => {
                      const cur = selectedComp.rotation || 0;
                      const diff = (deg - cur + 360) % 360;
                      if (diff === 90) rotateComponent(selectedComp.id, true);
                      else if (diff === 180) { rotateComponent(selectedComp.id, true); rotateComponent(selectedComp.id, true); }
                      else if (diff === 270) rotateComponent(selectedComp.id, false);
                    }}
                    className={`py-1 text-[11px] font-mono-code rounded font-semibold border transition-all ${
                      (selectedComp.rotation || 0) === deg
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-surface-hover)]'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Label editing */}
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Etiqueta / Nombre
              </label>
              <input
                type="text"
                value={selectedComp.label}
                onChange={(e) => updateComponentLabel(selectedComp.id, e.target.value)}
                className="w-full bg-[var(--bg-surface-sub)] border border-[var(--border-color)] rounded px-2.5 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            {/* Configurable inputs for AND/OR/NAND/NOR/XOR/XNOR */}
            {selectedComp.type.match(/^(AND|OR|NAND|NOR|XOR|XNOR)$/) && (
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Número de Entradas (2 a 8)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateComponentInputCount(selectedComp.id, Math.max(2, selectedComp.inputs.length - 1))}
                    disabled={selectedComp.inputs.length <= 2}
                    className="w-7 h-7 rounded flex items-center justify-center bg-[var(--bg-surface-sub)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] font-bold text-xs disabled:opacity-40"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={2}
                    max={8}
                    value={selectedComp.inputs.length}
                    onChange={(e) => updateComponentInputCount(selectedComp.id, parseInt(e.target.value, 10))}
                    className="flex-1 accent-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => updateComponentInputCount(selectedComp.id, Math.min(8, selectedComp.inputs.length + 1))}
                    disabled={selectedComp.inputs.length >= 8}
                    className="w-7 h-7 rounded flex items-center justify-center bg-[var(--bg-surface-sub)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] font-bold text-xs disabled:opacity-40"
                  >
                    +
                  </button>
                  <span className="font-mono-code font-bold w-6 text-center text-blue-500">
                    {selectedComp.inputs.length}
                  </span>
                </div>
              </div>
            )}

            {/* Inverter Orientation Toggle */}
            {selectedComp.type === 'NOT' && (
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Orientación del Inversor
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateComponentOrientation(selectedComp.id, 'right')}
                    className={`py-1.5 px-2 rounded text-xs font-medium border ${
                      selectedComp.orientation !== 'down'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    Horizontal (→)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateComponentOrientation(selectedComp.id, 'down')}
                    className={`py-1.5 px-2 rounded text-xs font-medium border ${
                      selectedComp.orientation === 'down'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    Vertical (↓)
                  </button>
                </div>
              </div>
            )}

            {/* Configuración específica: BCD a 7 Segmentos */}
            {selectedComp.type === 'BCD_TO_7SEG' && (
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-[var(--text-primary)]">
                    Modo de Decodificador BCD
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-mono-code font-bold">
                    {selectedComp.state?.displayMode === 'anode' ? 'Ánodo Común' : 'Cátodo Común'}
                  </span>
                </div>

                {/* Polaridad */}
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                    Polaridad de Salida (a..g)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateComponentState(selectedComp.id, { displayMode: 'cathode' })}
                      className={`py-1 px-2 rounded text-[11px] font-medium border transition-colors ${
                        selectedComp.state?.displayMode !== 'anode'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)]'
                      }`}
                    >
                      Cátodo (1 = ON)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateComponentState(selectedComp.id, { displayMode: 'anode' })}
                      className={`py-1 px-2 rounded text-[11px] font-medium border transition-colors ${
                        selectedComp.state?.displayMode === 'anode'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)]'
                      }`}
                    >
                      Ánodo (0 = ON)
                    </button>
                  </div>
                </div>

                {/* Manejo de BCD Inválido (10 a 15) */}
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                    Valores No Válidos (10 a 15)
                  </label>
                  <select
                    value={selectedComp.state?.invalidBcdMode || 'INVALID_DASH'}
                    onChange={(e) =>
                      updateComponentState(selectedComp.id, {
                        invalidBcdMode: e.target.value as any,
                      })
                    }
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  >
                    <option value="INVALID_DASH">Guion Central (-)</option>
                    <option value="BLANK">Totalmente Apagado</option>
                    <option value="HEX_LETTERS">Hexadecimal (A, b, C, d, E, F)</option>
                  </select>
                </div>

                {/* Botón Ver Tabla de Verdad BCD */}
                <button
                  type="button"
                  onClick={() => setShowBcdModal(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Ver tabla de verdad BCD</span>
                </button>
              </div>
            )}

            {/* Configuración específica: Display 7 Segmentos */}
            {selectedComp.type === 'SEVEN_SEGMENT' && (
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-[var(--text-primary)]">
                    Display 7 Segmentos
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono-code font-bold">
                    {selectedComp.state?.displayMode === 'anode' ? 'Ánodo Común' : 'Cátodo Común'}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                    Tipo de Conexión
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateComponentState(selectedComp.id, { displayMode: 'cathode' })}
                      className={`py-1 px-2 rounded text-[11px] font-medium border transition-colors ${
                        selectedComp.state?.displayMode !== 'anode'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)]'
                      }`}
                    >
                      Cátodo (1 enciende)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateComponentState(selectedComp.id, { displayMode: 'anode' })}
                      className={`py-1 px-2 rounded text-[11px] font-medium border transition-colors ${
                        selectedComp.state?.displayMode === 'anode'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)]'
                      }`}
                    >
                      Ánodo (0 enciende)
                    </button>
                  </div>
                </div>

                {/* Monitor en tiempo real de segmentos */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                      Estado de Segmentos
                    </span>
                    <span className="font-mono-code text-[11px] font-bold text-blue-500">
                      Símbolo: {selectedComp.state?.recognizedChar ?? '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((seg) => {
                      const isLit = !!selectedComp.state?.segLit?.[seg];
                      return (
                        <div
                          key={seg}
                          className={`p-1 text-center rounded border font-mono-code text-[10px] font-bold transition-colors ${
                            isLit
                              ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-xs'
                              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] opacity-60'
                          }`}
                        >
                          {seg.toUpperCase()}: {isLit ? 'ON' : 'off'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Codificador Decimal a BCD (74147) */}
            {selectedComp.type === 'ENCODER_DECIMAL_TO_BCD' && (
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] space-y-2 text-[11px]">
                <div className="font-bold text-[var(--text-primary)]">
                  Codificador Decimal a BCD (74147)
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Codifica 10 líneas decimales ($D_0$ a $D_9$) a código BCD de 4 bits ($A, B, C, D$) y señal de entrada activa ($V$).
                </p>
                <div className="p-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-[10px] space-y-1">
                  <div className="flex justify-between font-mono-code">
                    <span className="text-[var(--text-secondary)]">Prioridad:</span>
                    <span className="text-amber-500 font-bold">D9 &gt; D8 &gt; ... &gt; D0</span>
                  </div>
                  <div className="flex justify-between font-mono-code">
                    <span className="text-[var(--text-secondary)]">Señal V (Válido):</span>
                    <span className={selectedComp.outputs.find((p) => p.name === 'V')?.value === 1 ? 'text-emerald-500 font-bold' : 'text-slate-400 font-bold'}>
                      {selectedComp.outputs.find((p) => p.name === 'V')?.value === 1 ? '1 (Activo)' : '0 (Inactivo)'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Codificadores de Prioridad 4:2 y 8:3 */}
            {(selectedComp.type === 'PRIORITY_ENCODER_4TO2' || selectedComp.type === 'PRIORITY_ENCODER_8TO3') && (
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] space-y-2 text-[11px]">
                <div className="font-bold text-[var(--text-primary)]">
                  {selectedComp.type === 'PRIORITY_ENCODER_4TO2'
                    ? 'Codificador de Prioridad 4 a 2'
                    : 'Codificador de Prioridad 8 a 3'}
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Resuelve accesos concurrentes priorizando siempre el bit más significativo (MSB).
                </p>
                <div className="p-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-[10px] space-y-1">
                  <div className="flex justify-between font-mono-code">
                    <span className="text-[var(--text-secondary)]">Regla de prioridad:</span>
                    <span className="text-amber-500 font-bold">
                      {selectedComp.type === 'PRIORITY_ENCODER_4TO2' ? 'I3 > I2 > I1 > I0' : 'I7 > I6 > ... > I0'}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono-code">
                    <span className="text-[var(--text-secondary)]">Señal V (Entrada activa):</span>
                    <span className={selectedComp.outputs.find((p) => p.name === 'V')?.value === 1 ? 'text-emerald-500 font-bold' : 'text-slate-400 font-bold'}>
                      {selectedComp.outputs.find((p) => p.name === 'V')?.value === 1 ? '1 (Válido)' : '0 (Sin entrada)'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Decodificadores Binarios 2:4 y 3:8 */}
            {(selectedComp.type === 'DECODER_2TO4' || selectedComp.type === 'DECODER_3TO8') && (
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] space-y-2 text-[11px]">
                <div className="font-bold text-[var(--text-primary)]">
                  {selectedComp.type === 'DECODER_2TO4'
                    ? 'Decodificador Binario 2 a 4'
                    : 'Decodificador Binario 3 a 8'}
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Activa exactamente la línea de salida $Y_k$ seleccionada por la dirección binaria cuando la entrada de habilitación $EN$ es 1.
                </p>
                <div className="p-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-[10px] space-y-1">
                  <div className="flex justify-between font-mono-code">
                    <span className="text-[var(--text-secondary)]">Entrada EN (Enable):</span>
                    <span className={selectedComp.inputs.find((p) => p.name === 'EN')?.value === 1 ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                      {selectedComp.inputs.find((p) => p.name === 'EN')?.value === 1 ? '1 (Habilitado)' : '0 (Deshabilitado)'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Subcircuito Personalizado / Jerárquico */}
            {selectedComp.type === 'CUSTOM_SUBCIRCUIT' && (
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                    <Box className="w-4 h-4 text-cyan-400" />
                    <span>Subcircuito Jerárquico</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                    {selectedComp.inputs.length} IN • {selectedComp.outputs.length} OUT
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => openSubcircuit(selectedComp.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-900/20 transition-all border border-cyan-400/40 cursor-pointer"
                  title="Abre el lienzo gráfico para ver y editar las compuertas y cables internos"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir Diseño Interno (Doble Clic)</span>
                </button>

                {(() => {
                  const def = selectedComp.subcircuitId ? SubcircuitRegistry.get(selectedComp.subcircuitId) : undefined;
                  const intComps = selectedComp.state?.subcircuitInternalState?.components || def?.components || [];
                  const intConns = selectedComp.state?.subcircuitInternalState?.connections || def?.connections || [];
                  return (
                    <div className="text-[10px] space-y-1 text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Definición base:</span>
                        <span className="font-mono font-semibold text-cyan-300">{def?.name || selectedComp.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Compuertas/elementos:</span>
                        <span className="font-mono font-semibold text-white">{intComps.length} internos</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cables internos:</span>
                        <span className="font-mono font-semibold text-white">{intConns.length} conexiones</span>
                      </div>
                      {def?.description && (
                        <p className="text-[9px] text-slate-400 pt-1.5 border-t border-slate-800 italic">
                          {def.description}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Terminal Pins Status */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                <span>Estado Lógico de Terminales</span>
              </h4>

              {/* Input Pins */}
              <div className="space-y-1 mb-2">
                <div className="text-[10px] font-semibold text-[var(--text-secondary)]">Entradas:</div>
                {selectedComp.inputs.map((pin) => (
                  <div
                    key={pin.id}
                    className="flex items-center justify-between p-1.5 rounded bg-[var(--bg-surface-sub)] border border-[var(--border-color)]"
                  >
                    <span className="font-mono-code font-semibold">{pin.name}</span>
                    {renderValBadge(pin.value)}
                  </div>
                ))}
              </div>

              {/* Output Pins */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-[var(--text-secondary)]">Salidas:</div>
                {selectedComp.outputs.map((pin) => (
                  <div
                    key={pin.id}
                    className="flex items-center justify-between p-1.5 rounded bg-[var(--bg-surface-sub)] border border-[var(--border-color)]"
                  >
                    <span className="font-mono-code font-semibold">{pin.name}</span>
                    {renderValBadge(pin.value)}
                  </div>
                ))}
              </div>
            </div>

            {/* Coordinates & Technical Specs */}
            <div className="p-2.5 rounded bg-[var(--bg-surface-sub)] border border-[var(--border-color)] text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Posición en lienzo:</span>
                <span className="font-mono-code font-medium">({selectedComp.x}, {selectedComp.y}) px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Dimensiones:</span>
                <span className="font-mono-code font-medium">{selectedComp.width} × {selectedComp.height} px</span>
              </div>
            </div>
          </>
        ) : selectedWire ? (
          /* Wire Connection Inspector */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Conexión de Cable</h3>
              <button
                onClick={() => removeConnection(selectedWire.id)}
                className="p-1.5 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                title="Eliminar conexión"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2.5 rounded bg-[var(--bg-surface-sub)] border border-[var(--border-color)] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Nivel lógico transmitido:</span>
                {renderValBadge(selectedWire.value)}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                Conecta la salida de un componente emisor directamente a una entrada receptora sin atenuación.
              </div>
            </div>
          </div>
        ) : (
          /* General Circuit & Simulation Settings */
          <div className="space-y-4">
            <div className="p-2.5 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)]">
              <div className="flex items-center gap-2 mb-2 font-semibold text-[var(--text-primary)]">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Generador de Reloj (CLK)</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[var(--text-secondary)]">Frecuencia del reloj:</span>
                  <span className="font-mono-code font-bold text-blue-500">{simulation.clockHz} Hz</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={simulation.clockHz}
                  onChange={(e) => setClockHz(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                <Info className="w-4 h-4 text-blue-500" />
                <span>Métricas del Esquema</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-secondary)]">Componentes totales:</span>
                <span className="font-mono-code font-bold">{components.length}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-secondary)]">Cables y conexiones:</span>
                <span className="font-mono-code font-bold">{connections.length}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-secondary)]">Ciclos de simulación:</span>
                <span className="font-mono-code font-bold">{simulation.stepCount}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[var(--bg-surface-sub)] transition-colors">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                  className="rounded text-blue-600 accent-blue-600"
                />
                <span className="font-medium text-[var(--text-primary)]">Ajustar a cuadrícula (20px)</span>
              </label>

              <button
                onClick={resetView}
                className="w-full py-1.5 px-3 rounded border border-[var(--border-color)] bg-[var(--bg-surface-sub)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium transition-colors"
              >
                Centrar Vista de Lienzo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Tabla de Verdad BCD a 7 Segmentos */}
      {showBcdModal && selectedComp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-sub)]">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                  <Table className="w-5 h-5 text-blue-500" />
                  <span>Tabla de Verdad: Decodificador BCD a 7 Segmentos</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  16 combinaciones binarias de entrada (D, C, B, A) y salidas directas para display (a, b, c, d, e, f, g).
                </p>
              </div>
              <button
                onClick={() => setShowBcdModal(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls Bar */}
            <div className="px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--text-secondary)]">Polaridad:</span>
                  <span
                    className={`px-2 py-0.5 rounded font-mono-code font-bold ${
                      selectedComp.state?.displayMode === 'anode'
                        ? 'bg-amber-500/20 text-amber-500'
                        : 'bg-emerald-500/20 text-emerald-500'
                    }`}
                  >
                    {selectedComp.state?.displayMode === 'anode'
                      ? 'Ánodo Común (0 = Encendido)'
                      : 'Cátodo Común (1 = Encendido)'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--text-secondary)]">No válidos (10-15):</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {selectedComp.state?.invalidBcdMode === 'BLANK'
                      ? 'Apagado'
                      : selectedComp.state?.invalidBcdMode === 'HEX_LETTERS'
                      ? 'Hex (A..F)'
                      : 'Guion (-) [Estándar]'}
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  handleExportBcdCsv(
                    selectedComp.state?.displayMode === 'anode',
                    selectedComp.state?.invalidBcdMode || 'INVALID_DASH'
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs transition-colors"
                title="Descargar tabla en formato CSV"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </button>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--bg-surface-sub)] text-[var(--text-secondary)]">
                    <th className="py-2 px-2 text-center font-mono-code font-bold">N</th>
                    <th className="py-2 px-2 text-center font-mono-code font-bold">D (8)</th>
                    <th className="py-2 px-2 text-center font-mono-code font-bold">C (4)</th>
                    <th className="py-2 px-2 text-center font-mono-code font-bold">B (2)</th>
                    <th className="py-2 px-2 text-center font-mono-code font-bold">A (1)</th>
                    <th className="py-2 px-2 text-center font-mono-code font-bold text-red-500">a</th>
                    <th className="py-2 px-2 text-center font-mono-code font-bold text-red-500">b</th>
                    <th className="py-2 px-2 text-center font-mono-code font-bold text-red-500">c</th>
                    <th className="py-2 px-2 text-center font-mono-code font-bold text-red-500">d</th>
                    <th className="py-2 px-2 text-center font-mono-code font-bold text-red-500">e</th>
                    <th className="py-2 px-2 text-center font-mono-code font-bold text-red-500">f</th>
                    <th className="py-2 px-2 text-center font-mono-code font-bold text-red-500">g</th>
                    <th className="py-2 px-3 text-center font-bold">Visualizador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {generateBcdTableData(
                    selectedComp.state?.displayMode === 'anode',
                    selectedComp.state?.invalidBcdMode || 'INVALID_DASH'
                  ).map((row) => (
                    <tr
                      key={row.n}
                      className={`hover:bg-[var(--bg-surface-hover)] transition-colors ${
                        row.isInvalid ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="py-1.5 px-2 text-center font-mono-code font-bold text-[var(--text-secondary)]">
                        {row.n}
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono-code">{row.D}</td>
                      <td className="py-1.5 px-2 text-center font-mono-code">{row.C}</td>
                      <td className="py-1.5 px-2 text-center font-mono-code">{row.B}</td>
                      <td className="py-1.5 px-2 text-center font-mono-code">{row.A}</td>
                      <td className="py-1.5 px-2 text-center font-mono-code font-bold text-red-500">{row.a}</td>
                      <td className="py-1.5 px-2 text-center font-mono-code font-bold text-red-500">{row.b}</td>
                      <td className="py-1.5 px-2 text-center font-mono-code font-bold text-red-500">{row.c}</td>
                      <td className="py-1.5 px-2 text-center font-mono-code font-bold text-red-500">{row.d}</td>
                      <td className="py-1.5 px-2 text-center font-mono-code font-bold text-red-500">{row.e}</td>
                      <td className="py-1.5 px-2 text-center font-mono-code font-bold text-red-500">{row.f}</td>
                      <td className="py-1.5 px-2 text-center font-mono-code font-bold text-red-500">{row.g}</td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded font-mono-code font-bold bg-[var(--bg-surface-sub)] border border-[var(--border-color)] text-blue-500 min-w-8">
                          {row.charDisplay}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-surface-sub)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <div>
                Nota: Salidas generadas directamente en conformidad con la norma de decodificación BCD-7Seg.
              </div>
              <button
                onClick={() => setShowBcdModal(false)}
                className="px-4 py-1.5 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] font-medium text-[var(--text-primary)] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Subcircuit Modal */}
      <CreateSubcircuitModal
        isOpen={isCreateSubcircuitOpen}
        onClose={() => setIsCreateSubcircuitOpen(false)}
        selectedComponents={components.filter((c) => selectedComponentIds.includes(c.id))}
        connections={connections}
      />
    </aside>
  );
};
