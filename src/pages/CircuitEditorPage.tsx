/**
 * LogicLab - Circuit Editor Page
 * Integrates Component Palette, Vector Circuit Canvas, Properties Inspector & Bottom Console
 * Fully responsive: desktop 3-column, tablet collapsible panels, mobile slide-over drawers & touch gestures
 * Features bidirectional circuit-truth table controls:
 * - «Generar tabla de verdad»
 * - «Ver tabla asociada»
 * - «Actualizar tabla»
 * - «Generar circuito desde tabla»
 * - «Comparar circuito y tabla»
 */

import React, { useState, useEffect } from 'react';
import { ComponentLibrary } from '../components/circuit-editor/ComponentLibrary';
import { CircuitCanvas } from '../components/circuit-editor/CircuitCanvas';
import { PropertyInspector } from '../components/circuit-editor/PropertyInspector';
import { BottomConsole } from '../components/circuit-editor/BottomConsole';
import {
  CircuitTruthTableModal,
  TruthTableModalTab,
} from '../components/circuit-editor/CircuitTruthTableModal';
import { TruthTableToolbar } from '../components/circuit-editor/TruthTableToolbar';
import { useCircuitStore } from '../store/useCircuitStore';
import { useAppStore } from '../store/useAppStore';
import {
  Layers,
  Sliders,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Table,
  RefreshCw,
  GitCompare,
  Sparkles,
  AlertTriangle,
  Calculator,
} from 'lucide-react';

export const CircuitEditorPage: React.FC = () => {
  const { showToast, setActiveTab } = useAppStore();
  const {
    selectedComponentIds,
    selectedWireId,
    isTableOutdated,
    associatedTruthTable,
    generateAssociatedTruthTable,
  } = useCircuitStore();

  // Screen width responsive check
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [isTablet, setIsTablet] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false
  );

  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1024;
  });

  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1280;
  });

  const [isTruthTableOpen, setIsTruthTableOpen] = useState<boolean>(false);
  const [truthTableTab, setTruthTableTab] = useState<TruthTableModalTab>('table');

  // Track window resizing
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const mobile = w < 768;
      const tablet = w >= 768 && w < 1024;
      setIsMobile(mobile);
      setIsTablet(tablet);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // When a component or wire is selected, auto-open properties if on desktop or tablet
  useEffect(() => {
    if ((selectedComponentIds.length > 0 || selectedWireId) && !isMobile) {
      setIsInspectorOpen(true);
    }
  }, [selectedComponentIds, selectedWireId, isMobile]);

  // Synchronizer action handlers
  const handleGenerateTruthTable = () => {
    generateAssociatedTruthTable();
    setTruthTableTab('table');
    setIsTruthTableOpen(true);
    showToast('success', 'Tabla de verdad generada mediante simulación de grafo');
  };

  const handleViewAssociatedTable = () => {
    setTruthTableTab('table');
    setIsTruthTableOpen(true);
  };

  const handleUpdateTable = () => {
    generateAssociatedTruthTable();
    showToast('info', 'Tabla de verdad actualizada con el circuito actual');
  };

  const handleGenerateCircuitFromTable = () => {
    setTruthTableTab('synthesize');
    setIsTruthTableOpen(true);
  };

  const handleCompareCircuitAndTable = () => {
    setTruthTableTab('compare');
    setIsTruthTableOpen(true);
  };

  const handleGenerateKarnaugh = () => {
    generateAssociatedTruthTable();
    setTruthTableTab('karnaugh');
    setIsTruthTableOpen(true);
    showToast('success', 'Mapa de Karnaugh generado a partir de la simulación del circuito');
  };

  const handleViewKarnaugh = () => {
    setTruthTableTab('karnaugh');
    setIsTruthTableOpen(true);
  };

  const handleSimplifyFunction = () => {
    generateAssociatedTruthTable();
    setTruthTableTab('karnaugh');
    setIsTruthTableOpen(true);
    showToast('info', 'Función simplificada con Quine-McCluskey y mapa de Karnaugh');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Central workspace: Left Library + Canvas + Right Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop & Tablet: In-flow Collapsible Library */}
        {!isMobile && isLibraryOpen && (
          <div className="h-full relative flex shrink-0">
            <ComponentLibrary
              className={isTablet ? 'w-56' : 'w-64'}
              onClose={() => setIsLibraryOpen(false)}
            />
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 h-full w-full relative overflow-hidden flex flex-col">
          {/* Top Synchronizer & Panel Toolbar */}
          <div className="absolute top-2.5 inset-x-2.5 z-20 flex items-center justify-between pointer-events-none gap-2">
            
            {/* Left Controls: Library toggle */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {(!isLibraryOpen || isMobile) && (
                <button
                  onClick={() => setIsLibraryOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-sub)] border border-[var(--border-color)] shadow-md text-xs font-semibold text-[var(--text-primary)] transition-all"
                  title="Abrir Biblioteca de Componentes"
                >
                  <Layers className="w-4 h-4 text-blue-500" />
                  <span className="hidden sm:inline">Componentes</span>
                </button>
              )}

              {!isMobile && isLibraryOpen && (
                <button
                  onClick={() => setIsLibraryOpen(false)}
                  className="p-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-sub)] border border-[var(--border-color)] shadow-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                  title="Contraer Biblioteca"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Center Controls: Truth Table Synchronization Toolbar */}
            <TruthTableToolbar
              onGenerateTruthTable={handleGenerateTruthTable}
              onViewAssociatedTable={handleViewAssociatedTable}
              onUpdateTable={handleUpdateTable}
              onGenerateCircuitFromTable={handleGenerateCircuitFromTable}
              onCompareCircuitAndTable={handleCompareCircuitAndTable}
              onGenerateKarnaugh={handleGenerateKarnaugh}
              onViewKarnaugh={handleViewKarnaugh}
              onSimplifyFunction={handleSimplifyFunction}
              onOpenPractice={() => setActiveTab('practice')}
              isTableOutdated={isTableOutdated}
              isMobile={isMobile}
            />

            {/* Right Controls: Inspector toggle */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {!isMobile && isInspectorOpen && (
                <button
                  onClick={() => setIsInspectorOpen(false)}
                  className="p-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-sub)] border border-[var(--border-color)] shadow-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                  title="Contraer Inspector"
                >
                  <PanelRightClose className="w-4 h-4" />
                </button>
              )}

              {(!isInspectorOpen || isMobile) && (
                <button
                  onClick={() => setIsInspectorOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-sub)] border border-[var(--border-color)] shadow-md text-xs font-semibold text-[var(--text-primary)] transition-all"
                  title="Abrir Inspector de Propiedades"
                >
                  <Sliders className="w-4 h-4 text-purple-500" />
                  <span className="hidden sm:inline">Propiedades</span>
                  {selectedComponentIds.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </button>
              )}
            </div>

          </div>

          {/* The Circuit Canvas */}
          <CircuitCanvas />
        </div>

        {/* Desktop & Tablet: In-flow Collapsible Inspector */}
        {!isMobile && isInspectorOpen && (
          <div className="h-full relative flex shrink-0">
            <PropertyInspector
              className={isTablet ? 'w-60' : 'w-72'}
              onClose={() => setIsInspectorOpen(false)}
            />
          </div>
        )}

        {/* Mobile Slide-Over Drawer: Component Library */}
        {isMobile && isLibraryOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setIsLibraryOpen(false)}
            />
            {/* Drawer */}
            <div className="relative w-4/5 max-w-xs h-full bg-[var(--bg-surface)] shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-200">
              <ComponentLibrary
                className="w-full h-full border-r-0"
                onClose={() => setIsLibraryOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Mobile Slide-Over Drawer: Property Inspector */}
        {isMobile && isInspectorOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setIsInspectorOpen(false)}
            />
            {/* Drawer */}
            <div className="relative w-4/5 max-w-xs h-full bg-[var(--bg-surface)] shadow-2xl z-10 flex flex-col animate-in slide-in-from-right duration-200">
              <PropertyInspector
                className="w-full h-full border-l-0"
                onClose={() => setIsInspectorOpen(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom simulation diagnostic bar */}
      <BottomConsole
        onOpenTruthTableModal={(tab) => {
          setTruthTableTab(tab || 'table');
          setIsTruthTableOpen(true);
        }}
      />

      {/* Circuit Truth Table Modal */}
      <CircuitTruthTableModal
        isOpen={isTruthTableOpen}
        onClose={() => setIsTruthTableOpen(false)}
        defaultTab={truthTableTab}
      />
    </div>
  );
};
