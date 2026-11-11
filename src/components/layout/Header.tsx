/**
 * LogicLab - Top Header Navigation & Project Control
 * Brand, project title, undo/redo, theme switch, tab navigation, export/import
 * Fully responsive: desktop full bar, tablet icon bar, mobile drawer & touch targets
 */

import React, { useState } from 'react';
import { useAppStore, ActiveTab } from '../../store/useAppStore';
import { useCircuitStore } from '../../store/useCircuitStore';
import {
  Cpu,
  Undo2,
  Redo2,
  Sun,
  Moon,
  Laptop,
  FolderDown,
  HelpCircle,
  Play,
  Pause,
  Grid,
  Table,
  Sparkles,
  GraduationCap,
  Calculator,
  Menu,
  X,
} from 'lucide-react';

interface HeaderProps {
  onOpenProjectModal: () => void;
  onOpenHelpModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenProjectModal, onOpenHelpModal }) => {
  const { theme, setTheme, activeTab, setActiveTab, project, setProjectName } = useAppStore();
  const { canUndo, canRedo, undo, redo, simulation, togglePause } = useCircuitStore();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.name);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      setProjectName(titleInput.trim());
    } else {
      setTitleInput(project.name);
    }
  };

  const navTabs: { id: ActiveTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: 'circuit', label: 'Editor de Circuitos', shortLabel: 'Editor', icon: <Cpu className="w-4 h-4" /> },
    { id: 'truth-table', label: 'Tablas de Verdad', shortLabel: 'Tablas', icon: <Table className="w-4 h-4" /> },
    { id: 'karnaugh', label: 'Mapas de Karnaugh', shortLabel: 'Karnaugh', icon: <Grid className="w-4 h-4" /> },
    { id: 'boolean-solver', label: 'Simplificador Booleano', shortLabel: 'Álgebra', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'practice', label: 'Laboratorio y Prácticas', shortLabel: 'Laboratorio', icon: <Calculator className="w-4 h-4" /> },
    { id: 'education', label: 'Aprender Lógica', shortLabel: 'Aprender', icon: <GraduationCap className="w-4 h-4" /> },
  ];

  return (
    <>
      <header className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-2 sm:px-4 flex items-center justify-between select-none z-30 shrink-0 max-w-full">
        {/* Brand & Project Name */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Menú de Navegación"
            aria-label="Abrir menú"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-blue-500" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)] shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/30 shrink-0">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight leading-none text-sm sm:text-base">LogicLab</span>
              <span className="text-[9px] sm:text-[10px] text-blue-500 font-semibold leading-tight hidden xs:inline">
                Digital Simulator
              </span>
            </div>
          </div>

          <div className="hidden sm:block h-4 w-[1px] bg-[var(--border-color)] mx-1" />

          {/* Project Name editable */}
          <div className="hidden sm:block truncate max-w-[120px] md:max-w-[180px]">
            {isEditingTitle ? (
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                autoFocus
                className="text-xs font-semibold px-2 py-1 rounded bg-[var(--bg-surface-sub)] border border-blue-500 text-[var(--text-primary)] focus:outline-none w-full"
              />
            ) : (
              <button
                onClick={() => {
                  setTitleInput(project.name);
                  setIsEditingTitle(true);
                }}
                className="text-xs font-semibold text-[var(--text-primary)] hover:text-blue-500 px-2 py-1 rounded hover:bg-[var(--bg-surface-sub)] transition-colors truncate w-full text-left"
                title="Haga clic para renombrar el proyecto"
              >
                {project.name}
              </button>
            )}
          </div>

          {/* Live Simulation Indicator */}
          <button
            onClick={togglePause}
            className={`hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold transition-all shrink-0 ${
              simulation.isRunning && !simulation.isPaused
                ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25'
                : 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25'
            }`}
            title={simulation.isPaused ? 'Simulación en pausa. Haga clic para reanudar.' : 'Simulando en tiempo real.'}
          >
            <span className={`w-2 h-2 rounded-full ${simulation.isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
            <span>{simulation.isPaused ? 'PAUSADO' : 'EN VIVO'}</span>
          </button>
        </div>

        {/* Desktop Feature Tabs (>= 1024px) */}
        <nav className="hidden lg:flex items-center gap-1 bg-[var(--bg-surface-sub)] p-1 rounded-lg border border-[var(--border-color)]">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[var(--bg-surface)] text-blue-500 shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tablet Feature Tabs (768px - 1023px) */}
        <nav className="hidden md:flex lg:hidden items-center gap-1 bg-[var(--bg-surface-sub)] p-1 rounded-lg border border-[var(--border-color)]">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[var(--bg-surface)] text-blue-500 shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title={tab.label}
              >
                {tab.icon}
                <span className="hidden xl:inline">{tab.shortLabel}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Undo/Redo, Projects, Theme, Help */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Deshacer (Ctrl+Z)"
              className="p-1.5 rounded hover:bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Rehacer (Ctrl+Y)"
              className="p-1.5 rounded hover:bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Project Management Modal Button */}
          <button
            onClick={onOpenProjectModal}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-surface-sub)] hover:bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-primary)] transition-colors"
            title="Guardar, Exportar e Importar Proyecto"
          >
            <FolderDown className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden md:inline">Proyectos</span>
          </button>

          {/* Theme Switcher Button */}
          <div className="flex items-center border border-[var(--border-color)] rounded-md overflow-hidden bg-[var(--bg-surface-sub)]">
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 transition-colors ${theme === 'light' ? 'bg-[var(--bg-surface)] text-amber-500' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title="Tema Claro"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 transition-colors ${theme === 'dark' ? 'bg-[var(--bg-surface)] text-blue-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title="Tema Oscuro"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`hidden sm:block p-1.5 transition-colors ${theme === 'system' ? 'bg-[var(--bg-surface)] text-emerald-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title="Preferencia del Sistema"
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Help */}
          <button
            onClick={onOpenHelpModal}
            className="p-1.5 rounded hover:bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Ayuda y Atajos de Teclado"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation (< lg) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-14 bottom-0 z-40 bg-[var(--bg-base)]/95 backdrop-blur-md border-b border-[var(--border-color)] overflow-y-auto p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Módulos de la Aplicación
              </span>
              <button
                onClick={togglePause}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                  simulation.isRunning && !simulation.isPaused
                    ? 'bg-emerald-500/20 text-emerald-500'
                    : 'bg-amber-500/20 text-amber-500'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${simulation.isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                <span>Simulación: {simulation.isPaused ? 'PAUSADA' : 'EN VIVO'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-bold text-left transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-sub)]'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'bg-[var(--bg-surface-sub)] text-blue-500'}`}>
                      {tab.icon}
                    </div>
                    <div>
                      <div>{tab.label}</div>
                      <div className="text-[11px] font-normal text-[var(--text-secondary)]">
                        {tab.id === 'circuit' && 'Diseña esquemas lógicos y prueba señales'}
                        {tab.id === 'truth-table' && 'Analiza combinaciones y minterms'}
                        {tab.id === 'karnaugh' && 'Minimización visual y Código Gray'}
                        {tab.id === 'boolean-solver' && 'Quine-McCluskey exacto y Petrick'}
                        {tab.id === 'education' && 'Lecciones interactivas y ejercicios'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>LogicLab v1.0 • Simulador Digital</span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface-sub)] font-bold text-[var(--text-primary)]"
            >
              Cerrar Menú
            </button>
          </div>
        </div>
      )}
    </>
  );
};
