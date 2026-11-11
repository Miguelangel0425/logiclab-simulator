/**
 * LogicLab - Project Management, Import/Export & Persistence Modal
 * Save to localStorage, JSON import/export, SVG/PNG export, CSV export
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useCircuitStore } from '../../store/useCircuitStore';
import { ProjectData } from '../../types';
import {
  X,
  Save,
  Download,
  Upload,
  Trash2,
  Copy,
  FileText,
  Image,
  Clock,
  Check,
  AlertCircle,
} from 'lucide-react';

import { SubcircuitRegistry } from '../../engines/circuit/subcircuitRegistry';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose }) => {
  const { project, setProjectName, showToast } = useAppStore();
  const { components, connections, viewTransform, loadCircuit } = useCircuitStore();

  const [savedProjects, setSavedProjects] = useState<ProjectData[]>([]);
  const [activeTab, setActiveTab] = useState<'saved' | 'export' | 'import'>('saved');

  // Load saved projects list
  const refreshSaved = () => {
    try {
      const raw = localStorage.getItem('logiclab_saved_projects');
      if (raw) {
        setSavedProjects(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) refreshSaved();
  }, [isOpen]);

  if (!isOpen) return null;

  // Save current project
  const handleSaveCurrent = () => {
    const currentData: ProjectData = {
      metadata: {
        ...project,
        updatedAt: Date.now(),
      },
      components,
      connections,
      viewTransform,
      subcircuits: SubcircuitRegistry.exportAll(),
    };

    try {
      const existing = savedProjects.filter((p) => p.metadata.id !== project.id);
      const updated = [currentData, ...existing];
      localStorage.setItem('logiclab_saved_projects', JSON.stringify(updated));
      setSavedProjects(updated);
      showToast('success', `Proyecto "${project.name}" guardado con sus subcircuitos.`);
    } catch {
      showToast('error', 'Error al guardar el proyecto en el almacenamiento local.');
    }
  };

  // Load a saved project
  const handleLoadProject = (p: ProjectData) => {
    if (p.subcircuits && Array.isArray(p.subcircuits)) {
      SubcircuitRegistry.importDefinitions(p.subcircuits);
    }
    loadCircuit(p.components, p.connections);
    setProjectName(p.metadata.name);
    showToast('info', `Proyecto "${p.metadata.name}" cargado.`);
    onClose();
  };

  // Delete a saved project
  const handleDeleteProject = (id: string, name: string) => {
    if (!window.confirm(`¿Está seguro de eliminar el proyecto "${name}"?`)) return;
    const updated = savedProjects.filter((p) => p.metadata.id !== id);
    localStorage.setItem('logiclab_saved_projects', JSON.stringify(updated));
    setSavedProjects(updated);
    showToast('info', 'Proyecto eliminado.');
  };

  // Export JSON
  const handleExportJSON = () => {
    const data: ProjectData = {
      metadata: { ...project, updatedAt: Date.now() },
      components,
      connections,
      viewTransform,
      subcircuits: SubcircuitRegistry.exportAll(),
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_logiclab.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Archivo JSON del circuito y subcircuitos descargado.');
  };

  // Import JSON with validation
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.components || !Array.isArray(parsed.components) || !parsed.connections) {
          throw new Error('Estructura de archivo de circuito inválida.');
        }

        if (parsed.subcircuits && Array.isArray(parsed.subcircuits)) {
          SubcircuitRegistry.importDefinitions(parsed.subcircuits);
        }

        loadCircuit(parsed.components, parsed.connections);
        if (parsed.metadata?.name) {
          setProjectName(parsed.metadata.name);
        }
        showToast('success', 'Circuito y subcircuitos importados correctamente.');
        onClose();
      } catch (err: any) {
        showToast('error', `Error de importación: ${err.message || 'Formato no reconocido'}`);
      }
    };
    reader.readAsText(file);
  };

  // Export as SVG
  const handleExportSVG = () => {
    const svgElem = document.querySelector('svg.overflow-visible');
    if (!svgElem) {
      showToast('error', 'No se encontró el lienzo vectorial para exportar.');
      return;
    }
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElem);
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}.svg`;
    a.click();
    showToast('success', 'Diagrama exportado en formato vectorial SVG.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-sub)]">
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4 text-blue-500" />
            <h2 className="font-bold text-sm text-[var(--text-primary)]">Administrador de Proyectos</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Subnav */}
        <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-2.5 font-semibold text-center border-b-2 transition-all ${
              activeTab === 'saved'
                ? 'border-blue-500 text-blue-500 bg-blue-500/5'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Guardados Localmente ({savedProjects.length})
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2.5 font-semibold text-center border-b-2 transition-all ${
              activeTab === 'export'
                ? 'border-blue-500 text-blue-500 bg-blue-500/5'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Exportar Diagramas
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2.5 font-semibold text-center border-b-2 transition-all ${
              activeTab === 'import'
                ? 'border-blue-500 text-blue-500 bg-blue-500/5'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Importar JSON
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 max-h-[360px] overflow-y-auto space-y-3">
          {activeTab === 'saved' && (
            <>
              {/* Quick Save Current Button */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)]">
                <div>
                  <div className="font-bold text-[var(--text-primary)]">Proyecto en edición actual:</div>
                  <div className="text-[var(--text-secondary)] text-[11px]">
                    "{project.name}" • {components.length} componentes, {connections.length} cables
                  </div>
                </div>
                <button
                  onClick={handleSaveCurrent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Ahora</span>
                </button>
              </div>

              {/* Saved list */}
              {savedProjects.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No hay proyectos guardados en el almacenamiento local.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedProjects.map((p) => (
                    <div
                      key={p.metadata.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-color)] hover:border-blue-500/50 bg-[var(--bg-surface-sub)] transition-colors"
                    >
                      <div>
                        <div className="font-bold text-[var(--text-primary)]">{p.metadata.name}</div>
                        <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)] mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(p.metadata.updatedAt).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>{p.components.length} componentes</span>
                          <span>•</span>
                          <span>{p.connections.length} conexiones</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleLoadProject(p)}
                          className="px-2.5 py-1 rounded bg-[var(--bg-surface)] hover:bg-blue-600 hover:text-white border border-[var(--border-color)] font-semibold transition-colors"
                        >
                          Cargar
                        </button>
                        <button
                          onClick={() => handleDeleteProject(p.metadata.id, p.metadata.name)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                          title="Eliminar proyecto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'export' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-sub)] flex items-center justify-between">
                <div>
                  <div className="font-bold text-[var(--text-primary)]">Archivo de Proyecto LogicLab (JSON)</div>
                  <div className="text-[var(--text-secondary)] text-[11px]">
                    Guarda la arquitectura completa, compuertas, pines, cables y posición del lienzo.
                  </div>
                </div>
                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar JSON</span>
                </button>
              </div>

              <div className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-sub)] flex items-center justify-between">
                <div>
                  <div className="font-bold text-[var(--text-primary)]">Vectorial SVG de Alta Definición</div>
                  <div className="text-[var(--text-secondary)] text-[11px]">
                    Exporta un esquema gráfico nítido listo para informes técnicos, tesis y presentaciones.
                  </div>
                </div>
                <button
                  onClick={handleExportSVG}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-blue-600 hover:text-white font-semibold transition-colors"
                >
                  <Image className="w-3.5 h-3.5" />
                  <span>Descargar SVG</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="p-6 rounded-lg border-2 border-dashed border-[var(--border-color)] hover:border-blue-500 text-center space-y-3 transition-colors">
              <Upload className="w-8 h-8 mx-auto text-blue-500" />
              <div>
                <div className="font-bold text-sm text-[var(--text-primary)]">Selecciona un archivo .json de LogicLab</div>
                <div className="text-[var(--text-secondary)] text-[11px] mt-1">
                  Se validará la integridad del modelo de datos y las conexiones de terminales antes de cargar.
                </div>
              </div>
              <label className="inline-block px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer transition-colors">
                Examinar Archivo
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
