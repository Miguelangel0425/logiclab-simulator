/**
 * LogicLab - Help, Shortcuts & Documentation Modal
 */

import React from 'react';
import { X, HelpCircle, Keyboard, Cpu, Sparkles, BookOpen } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Supr / Retroceso', desc: 'Eliminar el componente o cable seleccionado' },
    { key: 'Ctrl + D', desc: 'Duplicar componentes seleccionados' },
    { key: 'Ctrl + Z', desc: 'Deshacer última acción' },
    { key: 'Ctrl + Y', desc: 'Rehacer última acción' },
    { key: 'Espacio + Arrastre', desc: 'Desplazar el lienzo (Pan)' },
    { key: 'Rueda del ratón', desc: 'Acercar o alejar zoom (Zoom in/out)' },
    { key: 'Escape', desc: 'Cancelar cable en curso o limpiar selección' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-sub)]">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-500" />
            <h2 className="font-bold text-sm text-[var(--text-primary)]">Guía Rápida & Atajos de LogicLab</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[420px] space-y-4">
          {/* Quick Start Steps */}
          <div>
            <h3 className="font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>Cómo Conectar Circuitos</span>
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-[var(--text-secondary)] pl-1">
              <li>Arrastre compuertas desde la biblioteca izquierda al lienzo central.</li>
              <li>Haga clic en una terminal de salida (círculo a la derecha) y arrastre el cursor hasta una terminal de entrada.</li>
              <li>Haga clic sobre los Interruptores para conmutar su valor entre 0 (LOW) y 1 (HIGH).</li>
              <li>Observe la propagación en tiempo real: los cables activos se iluminan de verde neón.</li>
            </ol>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-emerald-500" />
              <span>Atajos de Teclado</span>
            </h3>
            <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
              {shortcuts.map((sc, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-2 text-[11px] ${
                    i % 2 === 0 ? 'bg-[var(--bg-surface-sub)]' : 'bg-[var(--bg-surface)]'
                  }`}
                >
                  <kbd className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono-code font-bold text-[var(--text-primary)]">
                    {sc.key}
                  </kbd>
                  <span className="text-[var(--text-secondary)]">{sc.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Boolean Notation tip */}
          <div>
            <h3 className="font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Sintaxis del Motor Booleano</span>
            </h3>
            <p className="text-[var(--text-secondary)] mb-2">
              El evaluador sintáctico seguro reconoce automáticamente:
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono-code text-[11px]">
              <div className="p-2 rounded bg-[var(--bg-surface-sub)] border border-[var(--border-color)]">
                <span className="text-blue-500 font-bold">AND:</span> A · B, A*B, AB
              </div>
              <div className="p-2 rounded bg-[var(--bg-surface-sub)] border border-[var(--border-color)]">
                <span className="text-blue-500 font-bold">OR:</span> A + B, A | B
              </div>
              <div className="p-2 rounded bg-[var(--bg-surface-sub)] border border-[var(--border-color)]">
                <span className="text-blue-500 font-bold">NOT:</span> A', !A, ~A, ¬A
              </div>
              <div className="p-2 rounded bg-[var(--bg-surface-sub)] border border-[var(--border-color)]">
                <span className="text-blue-500 font-bold">XOR:</span> A ⊕ B, A ^ B
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
