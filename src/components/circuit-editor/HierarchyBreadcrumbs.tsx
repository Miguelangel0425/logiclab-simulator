import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Layers, Save, Check, AlertCircle } from 'lucide-react';
import { useCircuitStore } from '../../store/useCircuitStore';

export const HierarchyBreadcrumbs: React.FC = () => {
  const store = useCircuitStore();
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  if (!store.isInsideSubcircuit) {
    return null;
  }

  const breadcrumbs = store.getHierarchyBreadcrumbs();
  const currentInfo = store.currentSubcircuitInfo;

  const handleSaveToDefinition = () => {
    const res = store.saveActiveSubcircuitToDefinition();
    if (res.success) {
      setSaveSuccess(res.message);
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  return (
    <div className="absolute top-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/95 border border-cyan-500/40 rounded-xl shadow-2xl backdrop-blur-md">
      {/* Breadcrumbs trail */}
      <div className="flex items-center gap-2 overflow-x-auto text-sm py-1">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 font-semibold text-xs tracking-wider uppercase">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          Modo Subcircuito (Nivel {store.currentHierarchyDepth})
        </span>

        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={crumb.level}>
              {idx > 0 && <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
              <button
                type="button"
                onClick={() => store.navigateToHierarchyLevel(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isLast
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'text-slate-400 hover:text-cyan-200 hover:bg-slate-800'
                }`}
                title={isLast ? 'Nivel actual' : `Volver a ${crumb.name}`}
              >
                <span>{crumb.name}</span>
                {crumb.subcircuitName && crumb.subcircuitName !== crumb.name && (
                  <span className="text-[10px] text-cyan-400/80 font-mono">[{crumb.subcircuitName}]</span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {saveSuccess && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-1 rounded-md animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            {saveSuccess}
          </span>
        )}

        {currentInfo && !currentInfo.readOnly && (
          <button
            type="button"
            onClick={handleSaveToDefinition}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors shadow-sm"
            title="Actualiza la definición global del subcircuito con los cambios actuales para futuras instancias"
          >
            <Save className="w-3.5 h-3.5 text-cyan-400" />
            <span>Guardar en definición</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => store.closeSubcircuit()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md hover:shadow-cyan-500/20 transition-all border border-cyan-400/30"
          title="Regresa al circuito principal actualizando el estado de la instancia"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al circuito principal</span>
        </button>
      </div>
    </div>
  );
};
