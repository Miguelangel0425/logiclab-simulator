/**
 * LogicLab - Compact & Minimizable Truth Table Toolbar
 * Provides quick access to all Truth Table synchronization & analysis actions:
 * 1. Generar tabla de verdad
 * 2. Ver tabla asociada
 * 3. Actualizar tabla
 * 4. Generar circuito desde tabla
 * 5. Comparar circuito y tabla
 * + Módulo de prácticas de sumadores
 * 
 * Features:
 * - Minimizable state with tiny footprint to maximize canvas workspace
 * - Quick-access dropdown menu directly from minimized state
 * - Outdated state visual badge indicator
 * - Persistent preference via localStorage
 * - Seamless responsive behavior (desktop compact bar, mobile dropdown/pill)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  Sparkles,
  RefreshCw,
  Layers,
  GitCompare,
  Calculator,
  ChevronUp,
  ChevronDown,
  Minimize2,
  Maximize2,
  MoreVertical,
  Wrench,
  Check,
  AlertCircle,
  Grid,
  Zap,
} from 'lucide-react';

export interface TruthTableToolbarProps {
  onGenerateTruthTable: () => void;
  onViewAssociatedTable: () => void;
  onUpdateTable: () => void;
  onGenerateCircuitFromTable: () => void;
  onCompareCircuitAndTable: () => void;
  onGenerateKarnaugh: () => void;
  onViewKarnaugh: () => void;
  onSimplifyFunction: () => void;
  onOpenPractice?: () => void;
  isTableOutdated: boolean;
  isMobile?: boolean;
  defaultMinimized?: boolean;
}

const STORAGE_KEY = 'logiclab_truthtable_toolbar_minimized';

export const TruthTableToolbar: React.FC<TruthTableToolbarProps> = ({
  onGenerateTruthTable,
  onViewAssociatedTable,
  onUpdateTable,
  onGenerateCircuitFromTable,
  onCompareCircuitAndTable,
  onGenerateKarnaugh,
  onViewKarnaugh,
  onSimplifyFunction,
  onOpenPractice,
  isTableOutdated,
  isMobile = false,
  defaultMinimized,
}) => {
  // Read persisted preference; default to minimized on mobile or defaultMinimized, expanded on desktop
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
          return saved === 'true';
        }
      } catch {
        // ignore
      }
    }
    if (defaultMinimized !== undefined) return defaultMinimized;
    return isMobile;
  });

  // Dropdown menu state (for quick access from minimized mode or mobile)
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize state changes to localStorage
  const handleToggleMinimize = (minimized: boolean) => {
    setIsMinimized(minimized);
    setIsDropdownOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(minimized));
    } catch {
      // ignore
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDropdownOpen]);

  // Keyboard escape closes dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen]);

  // Prevent canvas dragging or selection when interacting with the toolbar
  const stopPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  // Minimized Floating Pill Mode
  if (isMinimized) {
    return (
      <div
        ref={containerRef}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
        className="relative pointer-events-auto flex items-center select-none"
      >
        <div className="flex items-center bg-[var(--bg-surface)]/95 backdrop-blur-md rounded-xl border border-[var(--border-color)] shadow-lg p-0.5 hover:border-blue-500/50 transition-all">
          {/* Main button: Click to expand full bar */}
          <button
            type="button"
            onClick={() => handleToggleMinimize(false)}
            title="Herramientas de tabla de verdad (Clic para expandir)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-sub)] transition-colors group cursor-pointer"
          >
            <div className="relative flex items-center justify-center">
              <Table className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
              {isTableOutdated && (
                <span
                  title="La tabla está desactualizada respecto al circuito"
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse"
                />
              )}
            </div>
            <span className="font-semibold text-[11px] hidden sm:inline text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
              Tablas
            </span>
            <Maximize2 className="w-3 h-3 text-[var(--text-muted)] group-hover:text-blue-500 transition-colors ml-0.5" />
          </button>

          {/* Quick Dropdown Trigger for immediate action access without expanding */}
          <div className="h-4 w-[1px] bg-[var(--border-color)] my-auto" />
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            title="Menú rápido de acciones de tabla de verdad"
            aria-expanded={isDropdownOpen}
            className={`p-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-sub)] transition-colors cursor-pointer ${
              isDropdownOpen ? 'bg-[var(--bg-surface-sub)] text-blue-500' : ''
            }`}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
          </button>
        </div>

        {/* Minimized Dropdown Popover Menu */}
        {isDropdownOpen && (
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-64 bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl rounded-xl p-1.5 z-50 text-xs animate-fade-in divide-y divide-[var(--border-color)]/50"
            onMouseDown={stopPropagation}
          >
            <div className="p-1.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
              <span>Herramientas de Tabla</span>
              {isTableOutdated && (
                <span className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold lowercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  desincronizado
                </span>
              )}
            </div>

            <div className="py-1 space-y-0.5">
              {/* 1. Generar tabla de verdad */}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onGenerateTruthTable();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--text-primary)] hover:bg-blue-500/10 hover:text-blue-500 font-medium transition-colors cursor-pointer"
              >
                <Table className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-semibold text-xs">Generar tabla de verdad</div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">Simula todas las 2ⁿ combinaciones</div>
                </div>
              </button>

              {/* 2. Ver tabla asociada */}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onViewAssociatedTable();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-sub)] font-medium transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-semibold text-xs">Ver tabla asociada</div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">Visualizar tabla actual</div>
                </div>
              </button>

              {/* 3. Actualizar tabla */}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onUpdateTable();
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left font-medium transition-colors cursor-pointer ${
                  isTableOutdated
                    ? 'bg-amber-500/15 text-amber-500 font-bold hover:bg-amber-500/25'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-sub)]'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isTableOutdated ? 'animate-spin-slow text-amber-500' : 'text-blue-500'} shrink-0`} />
                <div className="flex-1 truncate">
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span>Actualizar tabla</span>
                    {isTableOutdated && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">Recalcular según circuito</div>
                </div>
              </button>

              {/* 4. Generar circuito desde tabla */}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onGenerateCircuitFromTable();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-sub)] font-medium transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-semibold text-xs">Generar circuito desde tabla</div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">Sintetizar compuertas lógicas</div>
                </div>
              </button>

              {/* 5. Comparar circuito y tabla */}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onCompareCircuitAndTable();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-sub)] font-medium transition-colors cursor-pointer"
              >
                <GitCompare className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-semibold text-xs">Comparar circuito y tabla</div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">Verificar equivalencia formal</div>
                </div>
              </button>

              {/* 6. Generar mapa de Karnaugh */}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onGenerateKarnaugh();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--text-primary)] hover:bg-emerald-500/10 hover:text-emerald-500 font-medium transition-colors cursor-pointer"
              >
                <Grid className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-semibold text-xs">Generar mapa de Karnaugh</div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">Mapa 2ⁿ con código Gray</div>
                </div>
              </button>

              {/* 7. Ver mapa de Karnaugh asociado */}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onViewKarnaugh();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-sub)] font-medium transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-semibold text-xs">Ver mapa asociado</div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">Agrupaciones y adyacencia</div>
                </div>
              </button>

              {/* 8. Simplificar función */}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onSimplifyFunction();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--text-primary)] hover:bg-amber-500/10 hover:text-amber-500 font-medium transition-colors cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-semibold text-xs">Simplificar función</div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">Forma mínima SOP / POS</div>
                </div>
              </button>
            </div>

            {/* Practical module & expand action footer */}
            <div className="pt-1 space-y-0.5">
              {onOpenPractice && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenPractice();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-purple-400 hover:bg-purple-500/10 font-medium transition-colors cursor-pointer"
                >
                  <Calculator className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="font-semibold text-xs">Práctica de Sumadores</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleToggleMinimize(false)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 mt-1 rounded-lg text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-sub)] font-medium transition-colors cursor-pointer border border-[var(--border-color)]/60"
              >
                <Maximize2 className="w-3 h-3 text-blue-500" />
                <span>Expandir barra en pantalla</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Expanded Compact Floating Toolbar
  return (
    <div
      ref={containerRef}
      onMouseDown={stopPropagation}
      onClick={stopPropagation}
      className="relative pointer-events-auto flex items-center select-none"
    >
      <div className="flex items-center gap-0.5 sm:gap-1 bg-[var(--bg-surface)]/95 backdrop-blur-md p-1 rounded-xl border border-[var(--border-color)] shadow-lg overflow-x-auto max-w-[calc(100vw-140px)] sm:max-w-none scrollbar-none">
        
        {/* 1. Generar tabla de verdad */}
        <button
          type="button"
          onClick={onGenerateTruthTable}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs text-xs font-semibold transition-all whitespace-nowrap cursor-pointer active:scale-95"
          title="Generar tabla de verdad exhaustiva (2ⁿ) a partir de la simulación del circuito"
        >
          <Table className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">Generar tabla de verdad</span>
          <span className="md:hidden">Generar tabla</span>
        </button>

        {/* 2. Ver tabla asociada */}
        <button
          type="button"
          onClick={onViewAssociatedTable}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg hover:bg-[var(--bg-surface-sub)] text-[var(--text-primary)] text-xs font-medium transition-all whitespace-nowrap cursor-pointer active:scale-95"
          title="Ver tabla de verdad asociada al circuito"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="hidden lg:inline">Ver tabla asociada</span>
          <span className="lg:hidden">Ver tabla</span>
        </button>

        {/* 3. Actualizar tabla */}
        <button
          type="button"
          onClick={onUpdateTable}
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
            isTableOutdated
              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-500 font-bold hover:bg-amber-500/25'
              : 'hover:bg-[var(--bg-surface-sub)] text-[var(--text-primary)]'
          }`}
          title={
            isTableOutdated
              ? 'La tabla está desactualizada respecto a los cambios en el circuito. Pulse para sincronizar.'
              : 'Actualizar tabla de verdad con el estado actual del circuito'
          }
        >
          <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isTableOutdated ? 'animate-spin-slow text-amber-500' : 'text-blue-500'}`} />
          <span className="hidden xl:inline">Actualizar tabla</span>
          <span className="xl:hidden">Actualizar</span>
          {isTableOutdated && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          )}
        </button>

        {/* 4. Generar circuito desde tabla */}
        <button
          type="button"
          onClick={onGenerateCircuitFromTable}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg hover:bg-[var(--bg-surface-sub)] text-[var(--text-primary)] text-xs font-medium transition-all whitespace-nowrap cursor-pointer active:scale-95"
          title="Introducir o editar una tabla de verdad para sintetizar el circuito en el lienzo"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="hidden xl:inline">Generar circuito desde tabla</span>
          <span className="xl:hidden">Sintetizar</span>
        </button>

        {/* 5. Comparar circuito y tabla */}
        <button
          type="button"
          onClick={onCompareCircuitAndTable}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg hover:bg-[var(--bg-surface-sub)] text-[var(--text-primary)] text-xs font-medium transition-all whitespace-nowrap cursor-pointer active:scale-95"
          title="Comparar y verificar matemáticamente si el circuito y la tabla son equivalentes"
        >
          <GitCompare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="hidden lg:inline">Comparar circuito y tabla</span>
          <span className="lg:hidden">Comparar</span>
        </button>

        {/* 6. Generar mapa de Karnaugh */}
        <button
          type="button"
          onClick={onGenerateKarnaugh}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-400 text-xs font-medium transition-all whitespace-nowrap cursor-pointer active:scale-95"
          title="Generar mapa de Karnaugh (K-Map) a partir de las entradas y salidas del circuito"
        >
          <Grid className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="hidden xl:inline">Mapa de Karnaugh</span>
          <span className="xl:hidden">K-Map</span>
        </button>

        {/* 7. Simplificar función */}
        <button
          type="button"
          onClick={onSimplifyFunction}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg hover:bg-amber-500/10 text-amber-500 hover:text-amber-400 text-xs font-medium transition-all whitespace-nowrap cursor-pointer active:scale-95"
          title="Simplificar función booleana con Quine-McCluskey a partir de la evaluación del circuito"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="hidden xl:inline">Simplificar función</span>
          <span className="xl:hidden">Simplificar</span>
        </button>

        {/* Optional separator */}
        <div className="h-4 w-[1px] bg-[var(--border-color)] mx-0.5 hidden md:block" />

        {/* 6. Práctica de Sumadores */}
        {onOpenPractice && (
          <button
            type="button"
            onClick={onOpenPractice}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-semibold transition-all whitespace-nowrap shadow-xs cursor-pointer active:scale-95"
            title="Abrir Módulo de Prácticas de Semisumador, Sumador Completo y 4 Bits"
          >
            <Calculator className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="hidden sm:inline">Práctica de Sumadores</span>
            <span className="sm:hidden">Práctica</span>
          </button>
        )}

        {/* Collapse / Minimize Action Button */}
        <div className="h-4 w-[1px] bg-[var(--border-color)] mx-0.5" />
        <button
          type="button"
          onClick={() => handleToggleMinimize(true)}
          title="Minimizar barra de herramientas (recuperar espacio en el lienzo)"
          className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-sub)] transition-colors cursor-pointer group"
          aria-label="Minimizar barra de herramientas"
        >
          <Minimize2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
};
