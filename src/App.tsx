/**
 * LogicLab - Digital Logic Simulator
 * Main Application Shell & View Routing
 */

import React, { useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { Header } from './components/layout/Header';
import { CircuitEditorPage } from './pages/CircuitEditorPage';
import { TruthTablePage } from './pages/TruthTablePage';
import { KarnaughPage } from './pages/KarnaughPage';
import { BooleanSolverPage } from './pages/BooleanSolverPage';
import { EducationalExplorerPage } from './pages/EducationalExplorerPage';
import { AdderPracticePage } from './pages/AdderPracticePage';
import { ProjectModal } from './components/common/ProjectModal';
import { HelpModal } from './components/common/HelpModal';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function App() {
  const { activeTab, notifications, dismissToast } = useAppStore();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Top Header */}
      <Header
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
      />

      {/* Primary Workspace Routed View */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'circuit' && <CircuitEditorPage />}
        {activeTab === 'truth-table' && <TruthTablePage />}
        {activeTab === 'karnaugh' && <KarnaughPage />}
        {activeTab === 'boolean-solver' && <BooleanSolverPage />}
        {activeTab === 'practice' && <AdderPracticePage />}
        {activeTab === 'education' && <EducationalExplorerPage />}
      </main>

      {/* Project Management Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />

      {/* Help & Shortcuts Modal */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Global Toast Notification System */}
      <div className="fixed bottom-12 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
        {notifications.map((notif) => {
          let icon = <Info className="w-4 h-4 text-blue-500" />;
          let borderStyle = 'border-blue-500/30 bg-[var(--bg-surface)]';

          if (notif.type === 'success') {
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            borderStyle = 'border-emerald-500/30 bg-[var(--bg-surface)]';
          } else if (notif.type === 'warning') {
            icon = <AlertTriangle className="w-4 h-4 text-amber-500" />;
            borderStyle = 'border-amber-500/30 bg-[var(--bg-surface)]';
          } else if (notif.type === 'error') {
            icon = <XCircle className="w-4 h-4 text-red-500" />;
            borderStyle = 'border-red-500/30 bg-[var(--bg-surface)]';
          }

          return (
            <div
              key={notif.id}
              className={`pointer-events-auto p-3 rounded-lg border shadow-lg flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 ${borderStyle}`}
            >
              <div className="flex items-center gap-2">
                {icon}
                <span className="text-[var(--text-primary)]">{notif.message}</span>
              </div>
              <button
                onClick={() => dismissToast(notif.id)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
