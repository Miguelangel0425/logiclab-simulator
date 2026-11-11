/**
 * LogicLab - Component Library Sidebar
 * Categorized catalog of basic gates, compound ICs, sequential devices, and presets
 */

import React, { useState, useEffect } from 'react';
import { ComponentType, SubcircuitDefinition } from '../../types';
import { useCircuitStore } from '../../store/useCircuitStore';
import { CIRCUIT_PRESETS } from '../../engines/circuit/presets';
import { SubcircuitRegistry } from '../../engines/circuit/subcircuitRegistry';
import { CreateSubcircuitModal } from './CreateSubcircuitModal';
import { GateThumbnail } from './GateThumbnail';
import {
  Search,
  Cpu,
  Layers,
  Repeat,
  Radio,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Binary,
  Box,
  Copy,
  Trash2,
  ExternalLink,
  List,
  LayoutGrid,
} from 'lucide-react';

export interface ComponentLibraryProps {
  onClose?: () => void;
  className?: string;
}

interface ComponentItem {
  id?: string;
  type: ComponentType;
  name: string;
  desc: string;
  badge?: string;
  customLabel?: string;
  initialState?: Record<string, any>;
}

const CATEGORIES: {
  id: string;
  name: string;
  icon: React.ReactNode;
  items: ComponentItem[];
}[] = [
  {
    id: 'basic',
    name: 'Compuertas Básicas',
    icon: <Cpu className="w-4 h-4 text-blue-500" />,
    items: [
      { type: 'AND', name: 'Compuerta AND', desc: 'Y = A · B (Producto lógico)' },
      { type: 'OR', name: 'Compuerta OR', desc: 'Y = A + B (Suma lógica)' },
      { type: 'NOT', name: 'Inversor NOT', desc: 'Y = A̅ (Negación complementaria)' },
      { type: 'NAND', name: 'Compuerta NAND', desc: 'Y = (A·B)̅ (Universal)' },
      { type: 'NOR', name: 'Compuerta NOR', desc: 'Y = (A+B)̅ (Universal)' },
      { type: 'XOR', name: 'OR Exclusivo (XOR)', desc: 'Y = A ⊕ B (Desigualdad)' },
      { type: 'XNOR', name: 'Coincidencia (XNOR)', desc: 'Y = (A⊕B)̅ (Igualdad)' },
      { type: 'BUFFER', name: 'Buffer Lógico', desc: 'Y = A (Separador de señal)' },
    ],
  },
  {
    id: 'decoders_encoders',
    name: 'Decodificadores y Codificadores',
    icon: <Binary className="w-4 h-4 text-cyan-500" />,
    items: [
      {
        id: 'bcd_cathode',
        type: 'BCD_TO_7SEG',
        name: 'Decodificador BCD a 7 Seg (Cátodo)',
        desc: 'D, C, B, A a segmentos a..g (Activo en ALTO / 1)',
        customLabel: 'Decod BCD Cátodo',
        initialState: { displayMode: 'cathode' },
      },
      {
        id: 'bcd_anode',
        type: 'BCD_TO_7SEG',
        name: 'Decodificador BCD a 7 Seg (Ánodo)',
        desc: 'D, C, B, A a segmentos a..g (Activo en BAJO / 0)',
        customLabel: 'Decod BCD Ánodo',
        initialState: { displayMode: 'anode' },
      },
      {
        id: 'seven_seg',
        type: 'SEVEN_SEGMENT',
        name: 'Display 7 Segmentos',
        desc: 'Visualizador con 7 entradas individuales a..g',
        customLabel: 'Display 7-Seg',
      },
      {
        id: 'enc_dec_bcd',
        type: 'ENCODER_DECIMAL_TO_BCD',
        name: 'Codificador Decimal a BCD',
        desc: 'D0-D9 a salidas A, B, C, D + Válido V (74147)',
        customLabel: 'Codif. Decimal-BCD',
      },
      {
        id: 'prio_4to2',
        type: 'PRIORITY_ENCODER_4TO2',
        name: 'Codificador Prioridad 4 a 2',
        desc: 'I0-I3 a Y1, Y0 + V (Prioridad I3 > I2 > I1 > I0)',
        customLabel: 'Codif. Prioridad 4:2',
      },
      {
        id: 'prio_8to3',
        type: 'PRIORITY_ENCODER_8TO3',
        name: 'Codificador Prioridad 8 a 3',
        desc: 'I0-I7 a Y2, Y1, Y0 + V (Prioridad I7 > ... > I0)',
        customLabel: 'Codif. Prioridad 8:3',
      },
      {
        id: 'dec_2to4',
        type: 'DECODER_2TO4',
        name: 'Decodificador Binario 2 a 4',
        desc: 'A0, A1 y EN a 4 líneas de salida Y0-Y3',
        customLabel: 'Decodificador 2:4',
      },
      {
        id: 'dec_3to8',
        type: 'DECODER_3TO8',
        name: 'Decodificador Binario 3 a 8',
        desc: 'A0, A1, A2 y EN a 8 líneas Y0-Y7 (74138)',
        customLabel: 'Decodificador 3:8',
      },
    ],
  },
  {
    id: 'arithmetic',
    name: 'Aritmética Digital',
    icon: <Layers className="w-4 h-4 text-emerald-500" />,
    items: [
      { type: 'HALF_ADDER', name: 'Medio Sumador', desc: 'Suma 2 bits (S, Cout)' },
      { type: 'FULL_ADDER', name: 'Sumador Completo', desc: 'Suma A + B + Cin' },
      { type: 'HALF_SUBTRACTOR', name: 'Medio Restador', desc: 'Resta 2 bits (D, Bout)' },
      { type: 'FULL_SUBTRACTOR', name: 'Restador Completo', desc: 'A - B - Bin' },
      { type: 'ADDER_4BIT', name: 'Sumador 4 Bits', desc: 'Acarreo paralelo de 4 bits' },
      { type: 'MAGNITUDE_COMP', name: 'Comparador Magnitud', desc: 'A>B, A=B, A<B' },
    ],
  },
  {
    id: 'routing',
    name: 'Enrutamiento y Selección',
    icon: <Radio className="w-4 h-4 text-purple-500" />,
    items: [
      { type: 'MUX_2TO1', name: 'Multiplexor 2:1', desc: 'Selección de 2 canales' },
      { type: 'MUX_4TO1', name: 'Multiplexor 4:1', desc: 'Selección de 4 canales con 2 selectores' },
      { type: 'DEMUX_1TO4', name: 'Demultiplexor 1:4', desc: 'Distribuye 1 canal a 4' },
      { type: 'DECODER_2TO4', name: 'Decodificador 2 a 4', desc: 'Activa 1 línea de 4' },
      { type: 'ENCODER_4TO2', name: 'Codificador 4 a 2', desc: 'Genera dirección binaria' },
    ],
  },
  {
    id: 'sequential',
    name: 'Lógica Secuencial',
    icon: <Repeat className="w-4 h-4 text-amber-500" />,
    items: [
      { type: 'LATCH_SR', name: 'Biestable SR', desc: 'Memoria Set/Reset de 1 bit' },
      { type: 'FLIPFLOP_D', name: 'Flip-Flop D', desc: 'Flanco CLK con ~PRE y ~CLR asíncronos' },
      { type: 'FLIPFLOP_JK', name: 'Flip-Flop JK', desc: 'Set, Reset, Toggle con ~PRE y ~CLR' },
      { type: 'FLIPFLOP_T', name: 'Flip-Flop T', desc: 'Basculación binaria con reloj' },
      { type: 'COUNTER_4BIT', name: 'Contador 4 Bits', desc: 'Conteo ascendente / descendente' },
      { type: 'SHIFT_REG_4BIT', name: 'Registro Desplazamiento', desc: 'Desplazamiento serie/paralelo 4 bits' },
    ],
  },
  {
    id: 'msi',
    name: 'Circuitos Integrados (Serie 74xx)',
    icon: <Cpu className="w-4 h-4 text-cyan-500" />,
    items: [
      {
        type: 'IC_74LS90',
        name: '74LS90 Contador BCD',
        desc: 'Contador de décadas asíncrono (Div-2 y Div-5 con R0 y R9)',
        customLabel: '74LS90 Décadas BCD',
      },
      {
        type: 'IC_74LS194',
        name: '74LS194 Registro Universal 4B',
        desc: 'Registro bidireccional: Hold, Shift R, Shift L, Parallel Load',
        customLabel: '74LS194 Reg. Universal',
      },
      {
        type: 'IC_74LS85',
        name: '74LS85 Comparador de Magnitud',
        desc: 'Comparador de 4 bits (A>B, A=B, A<B con entradas cascada)',
        customLabel: '74LS85 Comparador 4B',
      },
      {
        type: 'IC_74LS151',
        name: '74LS151 Multiplexor 8:1',
        desc: 'Selector de 8 canales de datos con enable ~E y salidas Y, ~W',
        customLabel: '74LS151 MUX 8:1',
      },
    ],
  },
  {
    id: 'io',
    name: 'Entradas y Periféricos',
    icon: <Radio className="w-4 h-4 text-sky-500" />,
    items: [
      { type: 'SWITCH', name: 'Interruptor Digital', desc: 'Entrada manual conmutada (0/1)' },
      { type: 'PUSH_BUTTON', name: 'Pulsador Momentáneo', desc: 'Pulso activo mientras se presiona' },
      { type: 'CLOCK', name: 'Reloj Oscilador', desc: 'Genera tren de pulsos periódicos' },
      { type: 'CONSTANT_1', name: 'Nivel VCC (1)', desc: 'Nivel lógico alto permanente' },
      { type: 'CONSTANT_0', name: 'Nivel GND (0)', desc: 'Tierra / nivel lógico bajo' },
      { type: 'LED', name: 'Indicador LED', desc: 'Luz testigo con brillo activo' },
      { type: 'OUTPUT_PIN', name: 'Terminal de Salida', desc: 'Puerto de salida digital identificado' },
      { type: 'SEVEN_SEGMENT', name: 'Display 7 Segmentos', desc: 'Visualizador numérico hexadecimal' },
      { type: 'PROBE', name: 'Sonda Lógica (Probe)', desc: 'Mide y visualiza señal en cualquier punto' },
    ],
  },
];

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ onClose, className = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [subcircuitsVersion, setSubcircuitsVersion] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    subcircuits: true,
    basic: true,
    decoders_encoders: false,
    arithmetic: false,
    routing: false,
    sequential: false,
    io: false,
  });

  const {
    components,
    connections,
    selectedComponentIds,
    addComponent,
    insertSubcircuit,
    openSubcircuit,
    selectAll,
    loadCircuit,
  } = useCircuitStore();

  // Reactive subscription to registry updates (creation, duplication, deletion, import)
  useEffect(() => {
    return SubcircuitRegistry.subscribe(() => {
      setSubcircuitsVersion((v) => v + 1);
    });
  }, []);

  const allSubcircuits = SubcircuitRegistry.getAll();
  const filteredSubcircuits = allSubcircuits.filter((sub) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return sub.name.toLowerCase().includes(term) || (sub.description && sub.description.toLowerCase().includes(term));
  });

  const toggleCategory = (catId: string) => {
    setOpenCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleDragStart = (e: React.DragEvent, item: ComponentItem) => {
    e.dataTransfer.setData('application/logiclab-component', item.type);
    e.dataTransfer.setData(
      'application/logiclab-meta',
      JSON.stringify({ label: item.customLabel || item.name, state: item.initialState })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragStartSubcircuit = (e: React.DragEvent, sub: SubcircuitDefinition) => {
    e.dataTransfer.setData('application/logiclab-component', 'CUSTOM_SUBCIRCUIT');
    e.dataTransfer.setData('application/logiclab-subcircuit', sub.id);
    e.dataTransfer.setData(
      'application/logiclab-meta',
      JSON.stringify({ label: sub.name, subcircuitId: sub.id })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDuplicateSubcircuit = (e: React.MouseEvent, subId: string) => {
    e.stopPropagation();
    SubcircuitRegistry.duplicate(subId);
    setSubcircuitsVersion((v) => v + 1);
  };

  const handleDeleteSubcircuit = (e: React.MouseEvent, subId: string) => {
    e.stopPropagation();
    if (confirmDeleteId === subId) {
      SubcircuitRegistry.remove(subId);
      setConfirmDeleteId(null);
      setSubcircuitsVersion((v) => v + 1);
    } else {
      setConfirmDeleteId(subId);
      // Auto-reset confirmation after 4 seconds
      setTimeout(() => {
        setConfirmDeleteId((curr) => (curr === subId ? null : curr));
      }, 4000);
    }
  };

  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('logiclab_lib_view');
        if (saved === 'list' || saved === 'grid') return saved;
      } catch {
        // ignore
      }
    }
    return 'grid'; // Grid view with real symbols is primary by default
  });

  const handleViewModeChange = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    try {
      localStorage.setItem('logiclab_lib_view', mode);
    } catch {
      // ignore
    }
  };

  const filteredCategories = CATEGORIES.map((cat) => {
    if (!searchTerm.trim()) return cat;
    const term = searchTerm.toLowerCase();
    const items = cat.items.filter(
      (item) => item.name.toLowerCase().includes(term) || item.desc.toLowerCase().includes(term)
    );
    return { ...cat, items };
  }).filter((cat) => cat.items.length > 0);

  return (
    <aside className={`w-64 h-full border-r border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col select-none shrink-0 ${className}`}>
      {/* Header, View Mode Toggle & Search */}
      <div className="p-3 border-b border-[var(--border-color)] space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Biblioteca
          </h2>

          <div className="flex items-center gap-1">
            {/* View Mode Toggle: Grid vs List */}
            <div className="flex items-center gap-0.5 bg-[var(--bg-surface-sub)] p-0.5 rounded-lg border border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => handleViewModeChange('grid')}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Vista de cuadrícula visual (Símbolos reales)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('list')}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Vista de lista con descripciones"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                title="Cerrar biblioteca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-secondary)] pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar compuerta o CI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-surface-sub)] border border-[var(--border-color)] rounded-md pl-8 pr-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Accordion Categories */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {/* Mis Subcircuitos Section */}
        <div className="rounded-md border border-cyan-500/40 bg-cyan-950/20 overflow-hidden shadow-xs">
          <div className="flex items-center justify-between px-2.5 py-2 bg-cyan-950/50 text-xs font-bold text-cyan-300">
            <button
              onClick={() => toggleCategory('subcircuits')}
              className="flex items-center gap-2 hover:text-cyan-200 transition-colors cursor-pointer flex-1 text-left"
            >
              <Box className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Mis Subcircuitos ({filteredSubcircuits.length})</span>
              {openCategories.subcircuits ? (
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (selectedComponentIds.length === 0 && components.length > 0) {
                  selectAll();
                }
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer shrink-0"
              title="Crear un nuevo subcircuito modular a partir de la selección o en blanco"
            >
              <Plus className="w-3 h-3" />
              <span>Crear</span>
            </button>
          </div>

          {openCategories.subcircuits && (
            <div>
              {filteredSubcircuits.length === 0 ? (
                <div className="p-3 text-center space-y-2 bg-[var(--bg-surface)]">
                  <p className="text-xs text-slate-400 italic">
                    No hay subcircuitos creados aún.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedComponentIds.length === 0 && components.length > 0) {
                        selectAll();
                      }
                      setIsCreateModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Crear Subcircuito</span>
                  </button>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Selecciona compuertas en el lienzo para encapsularlas, o crea un subcircuito vacío para diseñarlo directamente.
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-[var(--bg-surface)]">
                  {filteredSubcircuits.map((sub) => {
                    const inCount = sub.ports.filter((p) => p.type === 'input').length;
                    const outCount = sub.ports.filter((p) => p.type === 'output').length;
                    const isDeleting = confirmDeleteId === sub.id;

                    return (
                      <div
                        key={sub.id}
                        draggable
                        onDragStart={(e) => handleDragStartSubcircuit(e, sub)}
                        onClick={() => insertSubcircuit(sub.id, 240, 240, sub.name)}
                        className={`group relative flex flex-col items-center justify-between p-2 rounded-xl bg-cyan-950/20 hover:bg-cyan-950/40 border transition-all text-center h-[88px] shadow-2xs cursor-grab active:cursor-grabbing ${
                          isDeleting ? 'border-rose-500 bg-rose-950/20' : 'border-slate-800 hover:border-cyan-500/50'
                        }`}
                        title={`${sub.name}: ${inCount} in • ${outCount} out\n${sub.description || ''}`}
                      >
                        {/* Hover Quick Action Icons for Subcircuit */}
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-slate-900/90 rounded p-0.5 border border-slate-700">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSubcircuit(sub.id);
                            }}
                            className="p-0.5 text-slate-300 hover:text-cyan-300 rounded hover:bg-slate-800 transition-colors"
                            title="Editar diseño interno"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDuplicateSubcircuit(e, sub.id)}
                            className="p-0.5 text-slate-300 hover:text-cyan-300 rounded hover:bg-slate-800 transition-colors"
                            title="Duplicar subcircuito"
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                          {!sub.readOnly && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSubcircuit(e, sub.id)}
                              className={`p-0.5 rounded transition-colors ${
                                isDeleting
                                  ? 'text-rose-400 bg-rose-900/60 animate-pulse'
                                  : 'text-slate-300 hover:text-rose-400 hover:bg-slate-800'
                              }`}
                              title={isDeleting ? 'Haz clic de nuevo para confirmar eliminación' : 'Eliminar subcircuito'}
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex-1 flex items-center justify-center pt-1">
                          <GateThumbnail type="CUSTOM_SUBCIRCUIT" subcircuitColor={sub.color} className="w-11 h-7" />
                        </div>

                        {isDeleting ? (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSubcircuit(e, sub.id)}
                            className="text-[10px] font-bold text-rose-300 bg-rose-600/80 hover:bg-rose-600 px-2 py-0.5 rounded w-full truncate transition-colors z-20 cursor-pointer"
                          >
                            ¿Eliminar?
                          </button>
                        ) : (
                          <div className="text-[10px] font-bold text-cyan-300 font-mono truncate w-full px-0.5">
                            {sub.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-1 space-y-1 bg-[var(--bg-surface)]">
                  {filteredSubcircuits.map((sub) => {
                    const inCount = sub.ports.filter((p) => p.type === 'input').length;
                    const outCount = sub.ports.filter((p) => p.type === 'output').length;
                    const isDeleting = confirmDeleteId === sub.id;

                    return (
                      <div
                        key={sub.id}
                        draggable
                        onDragStart={(e) => handleDragStartSubcircuit(e, sub)}
                        onClick={() => insertSubcircuit(sub.id, 240, 240, sub.name)}
                        className={`group flex items-center justify-between p-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                          isDeleting
                            ? 'bg-rose-950/30 border-rose-500/80'
                            : 'hover:bg-cyan-950/30 border-slate-800/80 hover:border-cyan-500/40'
                        }`}
                        title="Arrastra al lienzo o haz clic para insertar este subcircuito"
                      >
                        <div className="min-w-0 pr-1 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: sub.color || '#06b6d4' }}
                            />
                            <span className="text-xs font-bold text-cyan-300 font-mono truncate">
                              {sub.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                              {inCount} in • {outCount} out
                            </span>
                          </div>
                          {sub.description && (
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              {sub.description}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSubcircuit(sub.id);
                            }}
                            className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Abrir y editar diseño gráfico interno"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDuplicateSubcircuit(e, sub.id)}
                            className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Duplicar subcircuito"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {!sub.readOnly && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSubcircuit(e, sub.id)}
                              className={`p-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                                isDeleting
                                  ? 'bg-rose-600 text-white font-bold text-[10px] px-2'
                                  : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                              }`}
                              title={isDeleting ? 'Confirmar eliminación del subcircuito' : 'Eliminar de la biblioteca'}
                            >
                              <Trash2 className="w-3 h-3" />
                              {isDeleting && <span>¿Eliminar?</span>}
                            </button>
                          )}
                          <Plus className="w-3.5 h-3.5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {filteredCategories.map((cat) => {
          const isOpen = openCategories[cat.id] || !!searchTerm.trim();

          return (
            <div key={cat.id} className="rounded-md border border-[var(--border-color)] overflow-hidden">
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-2.5 py-2 bg-[var(--bg-surface-sub)] text-xs font-semibold text-[var(--text-primary)] hover:opacity-90 transition-opacity cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {cat.icon}
                  <span>{cat.name}</span>
                </div>
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
              </button>

              {isOpen && (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-[var(--bg-surface)]">
                    {cat.items.map((item, idx) => (
                      <div
                        key={item.id || `${item.type}_${idx}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onClick={() => addComponent(item.type, 200, 200, item.customLabel || item.name, item.initialState)}
                        className="group flex flex-col items-center justify-between p-2 rounded-xl bg-[var(--bg-surface-sub)] hover:bg-blue-600/10 border border-[var(--border-color)] hover:border-blue-500 cursor-grab active:cursor-grabbing transition-all text-center h-[76px] shadow-2xs hover:shadow-sm"
                        title={`${item.name} — ${item.desc}`}
                      >
                        <div className="flex-1 flex items-center justify-center text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">
                          <GateThumbnail type={item.type} className="w-11 h-7" />
                        </div>
                        <div className="text-[10px] font-semibold text-[var(--text-primary)] group-hover:text-blue-500 truncate w-full px-0.5">
                          {item.customLabel || item.name.replace(/^Compuerta\s+/i, '').replace(/^Inversor\s+/i, '')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-1 space-y-1 bg-[var(--bg-surface)]">
                    {cat.items.map((item, idx) => (
                      <div
                        key={item.id || `${item.type}_${idx}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onClick={() => addComponent(item.type, 200, 200, item.customLabel || item.name, item.initialState)}
                        className="group flex items-center justify-between p-2 rounded hover:bg-[var(--bg-surface-sub)] border border-transparent hover:border-[var(--border-color)] cursor-grab active:cursor-grabbing transition-colors"
                        title="Arrastre al lienzo o haga clic para agregar"
                      >
                        <div className="min-w-0 pr-1">
                          <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)] truncate">
                            {item.desc}
                          </div>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          );
        })}

        {/* Reference Presets Section */}
        <div className="rounded-md border border-[var(--border-color)] overflow-hidden pt-1">
          <div className="px-2.5 py-1.5 bg-[var(--bg-surface-sub)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>Circuitos de Referencia</span>
          </div>
          <div className="p-1 space-y-1">
            {CIRCUIT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  const circuit = preset.build();
                  loadCircuit(circuit.components, circuit.connections);
                }}
                className="w-full text-left p-2 rounded hover:bg-[var(--bg-surface-sub)] text-xs border border-transparent hover:border-[var(--border-color)] transition-colors"
              >
                <div className="font-medium text-[var(--text-primary)] truncate">{preset.name}</div>
                <div className="text-[10px] text-[var(--text-secondary)] line-clamp-1">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Create Subcircuit Modal */}
      <CreateSubcircuitModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        selectedComponents={components.filter((c) => selectedComponentIds.includes(c.id))}
        connections={connections}
      />
    </aside>
  );
};
