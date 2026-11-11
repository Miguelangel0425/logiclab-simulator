import React, { useState, useEffect } from 'react';
import { X, Layers, Plus, Trash2, ArrowUp, ArrowDown, Sparkles, Check, AlertTriangle } from 'lucide-react';
import { CircuitComponent, SubcircuitPort, WireConnection } from '../../types';
import { SubcircuitRegistry } from '../../engines/circuit/subcircuitRegistry';
import { useCircuitStore } from '../../store/useCircuitStore';

interface CreateSubcircuitModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedComponents: CircuitComponent[];
  connections: WireConnection[];
}

export const CreateSubcircuitModal: React.FC<CreateSubcircuitModalProps> = ({
  isOpen,
  onClose,
  selectedComponents,
  connections,
}) => {
  const store = useCircuitStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Personalizados');
  const [color, setColor] = useState('#06b6d4');
  const [replaceSelection, setReplaceSelection] = useState(true);
  const [inputPorts, setInputPorts] = useState<SubcircuitPort[]>([]);
  const [outputPorts, setOutputPorts] = useState<SubcircuitPort[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Determine effective components (from props or canvas fallback)
  const effectiveComponents = selectedComponents.length > 0 ? selectedComponents : store.components;

  // Initialize inferred ports when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (effectiveComponents.length === 0) {
      setName('NUEVO_SUBCIRCUITO');
      setDescription('Subcircuito personalizado diseñado en LogicLab.');
      setInputPorts([]);
      setOutputPorts([]);
      setError(null);
      return;
    }

    // Default name proposal
    const compTypes = effectiveComponents.map((c) => c.type);
    let proposedName = 'MI_SUBCIRCUITO';
    if (compTypes.filter((t) => t === 'XOR').length >= 2 && compTypes.includes('AND') && compTypes.includes('OR')) {
      proposedName = 'FULL ADDER';
    } else if (compTypes.includes('XOR') && compTypes.includes('AND')) {
      proposedName = 'HALF ADDER';
    } else if (effectiveComponents.length === 1) {
      proposedName = `${effectiveComponents[0].label || effectiveComponents[0].type}_MOD`;
    }
    setName(proposedName);
    setDescription(`Subcircuito compuesto por ${effectiveComponents.length} componentes digitales.`);
    setError(null);

    const inferred = SubcircuitRegistry.inferPorts(effectiveComponents, connections);
    setInputPorts(inferred.inputPorts);
    setOutputPorts(inferred.outputPorts);
  }, [isOpen, selectedComponents, connections, store.components.length]);

  if (!isOpen) return null;

  const handleAutoInferAllPorts = () => {
    if (effectiveComponents.length === 0) return;
    const inferred = SubcircuitRegistry.inferPorts(effectiveComponents, connections);
    // If still 0 ports, manually expose all boundary inputs and outputs
    if (inferred.inputPorts.length === 0) {
      effectiveComponents.forEach((c) => {
        c.inputs.forEach((p, idx) => {
          inferred.inputPorts.push({
            id: `port_in_${inferred.inputPorts.length}`,
            name: `${c.label || c.type}_${p.name || idx}`,
            type: 'input',
            targetComponentId: c.id,
            targetPinId: p.id,
            order: inferred.inputPorts.length,
            label: p.name,
          });
        });
      });
    }
    if (inferred.outputPorts.length === 0) {
      effectiveComponents.forEach((c) => {
        c.outputs.forEach((p, idx) => {
          inferred.outputPorts.push({
            id: `port_out_${inferred.outputPorts.length}`,
            name: `${c.label || c.type}_${p.name || idx}`,
            type: 'output',
            targetComponentId: c.id,
            targetPinId: p.id,
            order: inferred.outputPorts.length,
            label: p.name,
          });
        });
      });
    }
    setInputPorts(inferred.inputPorts);
    setOutputPorts(inferred.outputPorts);
    setError(null);
  };

  const handleMovePort = (type: 'input' | 'output', index: number, direction: 'up' | 'down') => {
    const list = type === 'input' ? [...inputPorts] : [...outputPorts];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const [moved] = list.splice(index, 1);
    list.splice(targetIdx, 0, moved);

    const reindexed = list.map((p, idx) => ({ ...p, order: idx }));
    if (type === 'input') {
      setInputPorts(reindexed);
    } else {
      setOutputPorts(reindexed);
    }
  };

  const handleUpdatePortName = (type: 'input' | 'output', index: number, newName: string) => {
    if (type === 'input') {
      setInputPorts((prev) =>
        prev.map((p, i) => (i === index ? { ...p, name: newName, label: newName } : p))
      );
    } else {
      setOutputPorts((prev) =>
        prev.map((p, i) => (i === index ? { ...p, name: newName, label: newName } : p))
      );
    }
  };

  const handleRemovePort = (type: 'input' | 'output', index: number) => {
    if (type === 'input') {
      setInputPorts((prev) => prev.filter((_, i) => i !== index).map((p, idx) => ({ ...p, order: idx })));
    } else {
      setOutputPorts((prev) => prev.filter((_, i) => i !== index).map((p, idx) => ({ ...p, order: idx })));
    }
  };

  const handleAddAvailablePort = (type: 'input' | 'output') => {
    if (type === 'input') {
      for (const comp of effectiveComponents) {
        for (const pin of comp.inputs) {
          const already = inputPorts.some((p) => p.targetComponentId === comp.id && p.targetPinId === pin.id);
          if (!already) {
            setInputPorts((prev) => [
              ...prev,
              {
                id: `port_in_${Date.now()}_${prev.length}`,
                name: `${comp.label || comp.type}_${pin.name}`,
                type: 'input',
                targetComponentId: comp.id,
                targetPinId: pin.id,
                order: prev.length,
                label: pin.name,
              },
            ]);
            return;
          }
        }
      }
      const firstComp = effectiveComponents[0];
      if (firstComp) {
        setInputPorts((prev) => [
          ...prev,
          {
            id: `port_in_${Date.now()}_${prev.length}`,
            name: `IN_${prev.length + 1}`,
            type: 'input',
            targetComponentId: firstComp.id,
            targetPinId: firstComp.inputs[0]?.id || 'in',
            order: prev.length,
            label: `IN_${prev.length + 1}`,
          },
        ]);
      }
    } else {
      for (const comp of effectiveComponents) {
        for (const pin of comp.outputs) {
          const already = outputPorts.some((p) => p.targetComponentId === comp.id && p.targetPinId === pin.id);
          if (!already) {
            setOutputPorts((prev) => [
              ...prev,
              {
                id: `port_out_${Date.now()}_${prev.length}`,
                name: `${comp.label || comp.type}_${pin.name}`,
                type: 'output',
                targetComponentId: comp.id,
                targetPinId: pin.id,
                order: prev.length,
                label: pin.name,
              },
            ]);
            return;
          }
        }
      }
      const lastComp = effectiveComponents[effectiveComponents.length - 1];
      if (lastComp) {
        setOutputPorts((prev) => [
          ...prev,
          {
            id: `port_out_${Date.now()}_${prev.length}`,
            name: `OUT_${prev.length + 1}`,
            type: 'output',
            targetComponentId: lastComp.id,
            targetPinId: lastComp.outputs[0]?.id || 'out',
            order: prev.length,
            label: `OUT_${prev.length + 1}`,
          },
        ]);
      }
    }
  };

  const handleCreateBlankDirectly = () => {
    const subName = (name.trim() || 'NUEVO_SUBCIRCUITO').toUpperCase();
    const blank = store.createBlankSubcircuit(subName, description, category, color);
    store.openSubcircuit(blank.id);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor ingresa un nombre para el subcircuito.');
      return;
    }

    if (effectiveComponents.length === 0) {
      handleCreateBlankDirectly();
      return;
    }

    if (inputPorts.length === 0 && outputPorts.length === 0) {
      setError('El subcircuito debe tener al menos una entrada o una salida externa. Pulsa «Auto-detectar» o «Añadir».');
      return;
    }

    const allPorts: SubcircuitPort[] = [...inputPorts, ...outputPorts];

    const result = store.createSubcircuitFromSelection({
      name: name.trim().toUpperCase(),
      description: description.trim(),
      category: category.trim() || 'Personalizados',
      color,
      ports: allPorts,
      replaceSelection: selectedComponents.length > 0 ? replaceSelection : false,
      componentIds: effectiveComponents.map((c) => c.id),
    });

    if (result.success) {
      onClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                {effectiveComponents.length > 0
                  ? 'Crear Subcircuito a partir de la Selección'
                  : 'Crear Nuevo Subcircuito Modular'}
              </h2>
              <p className="text-xs text-slate-400">
                {effectiveComponents.length > 0
                  ? `Encapsula ${effectiveComponents.length} componentes en un bloque modular reutilizable`
                  : 'Crea un subcircuito en blanco y diseña su esquemático directamente en el lienzo'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {effectiveComponents.length === 0 && (
            <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-cyan-300">¿Quieres diseñar un subcircuito desde cero?</span>
                <p className="text-slate-400 text-[11px]">
                  Puedes crear este bloque vacío e ingresar a su editor gráfico interno para colocar compuertas y cables.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateBlankDirectly}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shrink-0 transition-colors cursor-pointer shadow-md"
              >
                Crear en blanco y abrir
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Nombre del Subcircuito *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej: FULL ADDER, MUX_4TO1"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Categoría
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="ej: Aritmética, Personalizados"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Descripción
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Función del circuito, ecuaciones lógicas o notas de uso..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Color & Replacement option */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-300">Color distintivo:</span>
              <div className="flex items-center gap-1.5">
                {['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
              <input
                type="checkbox"
                checked={replaceSelection}
                onChange={(e) => setReplaceSelection(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 bg-slate-900 w-4 h-4"
              />
              <span>Reemplazar selección por la instancia en el lienzo</span>
            </label>
          </div>

          {/* Ports Section Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Terminales y Puertos Externos
            </span>
            {effectiveComponents.length > 0 && (
              <button
                type="button"
                onClick={handleAutoInferAllPorts}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 cursor-pointer transition-colors"
                title="Analiza automáticamente las compuertas y genera puertos de entrada y salida"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Auto-detectar terminales</span>
              </button>
            )}
          </div>

          {/* Input & Output Ports Definition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Ports */}
            <div className="space-y-2 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                  Puertos de Entrada ({inputPorts.length})
                </span>
                <button
                  type="button"
                  onClick={() => handleAddAvailablePort('input')}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 px-1.5 py-0.5 rounded hover:bg-slate-800"
                >
                  <Plus className="w-3 h-3" /> Añadir
                </button>
              </div>

              {inputPorts.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center italic">
                  No se detectaron entradas externas.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {inputPorts.map((port, idx) => (
                    <div
                      key={port.id}
                      className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-900 rounded-lg border border-slate-800 text-xs"
                    >
                      <span className="text-[10px] text-slate-500 font-mono w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        value={port.name}
                        onChange={(e) => handleUpdatePortName('input', idx, e.target.value)}
                        className="flex-1 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                      />
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMovePort('input', idx, 'up')}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                          title="Subir"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === inputPorts.length - 1}
                          onClick={() => handleMovePort('input', idx, 'down')}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                          title="Bajar"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePort('input', idx)}
                          className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-slate-800"
                          title="Eliminar puerto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Output Ports */}
            <div className="space-y-2 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  Puertos de Salida ({outputPorts.length})
                </span>
                <button
                  type="button"
                  onClick={() => handleAddAvailablePort('output')}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5 rounded hover:bg-slate-800"
                >
                  <Plus className="w-3 h-3" /> Añadir
                </button>
              </div>

              {outputPorts.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center italic">
                  No se detectaron salidas externas.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {outputPorts.map((port, idx) => (
                    <div
                      key={port.id}
                      className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-900 rounded-lg border border-slate-800 text-xs"
                    >
                      <span className="text-[10px] text-slate-500 font-mono w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        value={port.name}
                        onChange={(e) => handleUpdatePortName('output', idx, e.target.value)}
                        className="flex-1 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMovePort('output', idx, 'up')}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                          title="Subir"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === outputPorts.length - 1}
                          onClick={() => handleMovePort('output', idx, 'down')}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                          title="Bajar"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePort('output', idx)}
                          className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-slate-800"
                          title="Eliminar puerto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/20 transition-all border border-cyan-400/40"
          >
            <Sparkles className="w-4 h-4" />
            <span>Crear y Guardar Subcircuito</span>
          </button>
        </div>
      </div>
    </div>
  );
};
