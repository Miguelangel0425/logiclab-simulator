/**
 * LogicLab - Academic Laboratory Challenges & Evidence Report
 * Interactive mission catalog, testbench autograder, and printable laboratory report.
 */

import React, { useState } from 'react';
import {
  LAB_CHALLENGES,
  LabChallenge,
  ChallengeEvaluationResult,
  runChallengeTestbench,
} from '../../data/labChallenges';
import { useCircuitStore } from '../../store/useCircuitStore';
import { useAppStore } from '../../store/useAppStore';
import {
  Award,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Printer,
  Download,
  Copy,
  ExternalLink,
  BookOpen,
  Cpu,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Calendar,
  User,
  GraduationCap,
  FileCheck2,
} from 'lucide-react';

export const LabChallengesView: React.FC = () => {
  const { setActiveTab, showToast } = useAppStore();
  const { components, connections, loadCircuit } = useCircuitStore();

  const [selectedChallenge, setSelectedChallenge] = useState<LabChallenge>(LAB_CHALLENGES[0]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [studentName, setStudentName] = useState<string>('Estudiante de Computación Digital');
  const [studentId, setStudentId] = useState<string>('LAB-2026-ENG');
  const [institution, setInstitution] = useState<string>('Laboratorio de Circuitos Lógicos');

  const [evaluationResult, setEvaluationResult] = useState<ChallengeEvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  const filteredChallenges = LAB_CHALLENGES.filter((ch) => {
    if (filterCategory === 'all') return true;
    return ch.category.toLowerCase() === filterCategory.toLowerCase();
  });

  const handleLoadChallengeToEditor = (ch: LabChallenge) => {
    const circuitData = ch.initialCircuit();
    loadCircuit(circuitData.components, circuitData.connections);
    showToast('info', `Circuito base de "${ch.title}" cargado en el editor.`);
    setActiveTab('circuit');
  };

  const handleRunEvaluation = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      // Evaluate against current canvas circuit or challenge preset if canvas is empty
      const circuitToTest =
        components.length > 0
          ? { components, connections }
          : selectedChallenge.initialCircuit();

      const result = runChallengeTestbench(circuitToTest, selectedChallenge, studentName);
      setEvaluationResult(result);
      setIsEvaluating(false);

      if (result.score === 100) {
        showToast('success', `¡Excelente! Testbench completado con éxito: 100% (${result.passedCount}/${result.totalCount}).`);
      } else {
        showToast('info', `Evaluación completada: Calificación ${result.score}% (${result.passedCount}/${result.totalCount}).`);
      }
    }, 400);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleCopyReportText = () => {
    if (!evaluationResult) return;
    const text = [
      `========================================================================`,
      `LOGICLAB - INFORME OFICIAL DE LABORATORIO DE ELECTRÓNICA DIGITAL`,
      `========================================================================`,
      `Estudiante: ${studentName}`,
      `Matrícula:  ${studentId}`,
      `Institución:${institution}`,
      `Práctica:   ${selectedChallenge.title}`,
      `Fecha/Hora: ${new Date(evaluationResult.evaluatedAt).toLocaleString()}`,
      `Código Hash:${evaluationResult.verificationHash}`,
      `Calificación:${evaluationResult.score}% (${evaluationResult.passedCount}/${evaluationResult.totalCount} vectores)`,
      `------------------------------------------------------------------------`,
      `TABLA DE RESULTADOS DEL TESTBENCH:`,
      evaluationResult.vectorResults
        .map(
          (vr, idx) =>
            `[${vr.passed ? 'APROBADO' : 'FALLIDO'}] Vector ${idx + 1}: Entradas=${JSON.stringify(vr.inputs)} | Esperado=${JSON.stringify(vr.expected)} | Obtenido=${JSON.stringify(vr.actual)}`
        )
        .join('\n'),
      `========================================================================`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    showToast('success', 'Informe copiado al portapapeles.');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto p-4 sm:p-6 select-none">
      {/* Left Sidebar: Challenges List & Filter */}
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Misiones de Laboratorio</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Catálogo de prácticas académicas con autoevaluación formal y generación de informes de laboratorio.
          </p>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1 mb-3">
            {['all', 'Combinacional', 'Secuencial', 'Aritmética', 'MSI'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
                  filterCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat}
              </button>
            ))}
          </div>

          {/* Challenge Item Cards */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredChallenges.map((ch) => {
              const isSelected = selectedChallenge.id === ch.id;
              return (
                <div
                  key={ch.id}
                  onClick={() => {
                    setSelectedChallenge(ch);
                    setEvaluationResult(null);
                  }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/10 shadow-xs ring-1 ring-blue-500/30'
                      : 'border-[var(--border-color)] hover:border-blue-400 bg-[var(--bg-surface-sub)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider bg-blue-500/10 text-blue-500">
                      {ch.category}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        ch.difficulty === 'Básico'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : ch.difficulty === 'Intermedio'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-purple-500/10 text-purple-500'
                      }`}
                    >
                      {ch.difficulty}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight mb-1">
                    {ch.title}
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                    {ch.objective}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Student Credentials Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" />
            <h4 className="font-bold text-xs text-[var(--text-primary)]">Datos del Estudiante</h4>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] font-semibold text-[var(--text-secondary)] block mb-1">
                Nombre y Apellidos:
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-surface-sub)] text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[var(--text-secondary)] block mb-1">
                Matrícula / Código de Alumno:
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-surface-sub)] text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[var(--text-secondary)] block mb-1">
                Institución / Asignatura:
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-surface-sub)] text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Panel: Challenge Objective, Testbench & Grade */}
      <div className="flex-1 space-y-6">
        {/* Challenge Header Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-color)]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-600 text-white uppercase tracking-wider">
                  {selectedChallenge.category}
                </span>
                <span className="text-xs text-[var(--text-secondary)] font-semibold">
                  Dificultad: {selectedChallenge.difficulty}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)]">
                {selectedChallenge.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLoadChallengeToEditor(selectedChallenge)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] hover:border-blue-500 text-[var(--text-primary)] transition-all cursor-pointer"
                title="Cargar circuito esquemático en el editor principal"
              >
                <Cpu className="w-4 h-4 text-blue-500" />
                <span>Cargar en Editor</span>
              </button>
              <button
                onClick={handleRunEvaluation}
                disabled={isEvaluating}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>{isEvaluating ? 'Evaluando...' : 'Evaluar Testbench'}</span>
              </button>
            </div>
          </div>

          {/* Description & Objective */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Objetivo de Aprendizaje
              </h4>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                {selectedChallenge.objective}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Fundamento Teórico
              </h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {selectedChallenge.theory}
              </p>
            </div>
          </div>

          {/* Ports specification */}
          <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex flex-wrap gap-4 text-xs">
            <div>
              <span className="font-bold text-[var(--text-secondary)]">Terminales de Entrada: </span>
              <span className="font-mono-code font-bold text-blue-500">
                {selectedChallenge.inputNames.join(', ')}
              </span>
            </div>
            <div>
              <span className="font-bold text-[var(--text-secondary)]">Terminales de Salida: </span>
              <span className="font-mono-code font-bold text-emerald-500">
                {selectedChallenge.outputNames.join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Evaluation Score Banner if executed */}
        {evaluationResult && (
          <div
            className={`border rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 ${
              evaluationResult.score === 100
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : evaluationResult.score >= 70
                ? 'bg-blue-500/10 border-blue-500/40'
                : 'bg-amber-500/10 border-amber-500/40'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center font-extrabold text-2xl ${
                  evaluationResult.score === 100
                    ? 'bg-emerald-500 text-white'
                    : evaluationResult.score >= 70
                    ? 'bg-blue-500 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {evaluationResult.score}%
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-[var(--text-primary)]">
                    {evaluationResult.score === 100
                      ? 'Autoevaluación: Sobresaliente'
                      : evaluationResult.score >= 70
                      ? 'Autoevaluación: Notable'
                      : 'Autoevaluación: Requiere Revisión'}
                  </h3>
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {evaluationResult.passedCount} de {evaluationResult.totalCount} vectores de prueba superados satisfactoriamente.
                </p>
                <div className="text-[10px] font-mono-code text-[var(--text-secondary)] mt-1">
                  Código de Verificación: <span className="font-bold text-blue-500">{evaluationResult.verificationHash}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-blue-500 text-xs font-bold text-[var(--text-primary)] shadow-xs transition-all cursor-pointer shrink-0"
            >
              <FileCheck2 className="w-4 h-4 text-blue-500" />
              <span>Ver Reporte de Laboratorio</span>
            </button>
          </div>
        )}

        {/* Testbench Matrix Table */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Matriz de Vectores del Testbench</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Tabla de pruebas exhaustiva calculada mediante el simulador lógico real.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] font-mono-code uppercase text-[10px] border-b border-[var(--border-color)]">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Descripción de la Prueba</th>
                  {selectedChallenge.inputNames.map((n) => (
                    <th key={`in-${n}`} className="py-2.5 px-3 text-center text-blue-500">
                      {n}
                    </th>
                  ))}
                  {selectedChallenge.outputNames.map((n) => (
                    <th key={`out-exp-${n}`} className="py-2.5 px-3 text-center text-emerald-500">
                      {n} (Esp.)
                    </th>
                  ))}
                  {selectedChallenge.outputNames.map((n) => (
                    <th key={`out-act-${n}`} className="py-2.5 px-3 text-center">
                      {n} (Real)
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] font-mono-code text-[11px]">
                {selectedChallenge.testVectors.map((tv, idx) => {
                  const evalRow = evaluationResult?.vectorResults[idx];
                  const isPassed = evalRow?.passed;
                  return (
                    <tr
                      key={idx}
                      className={
                        evalRow
                          ? isPassed
                            ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                            : 'bg-red-500/5 hover:bg-red-500/10'
                          : 'hover:bg-[var(--bg-surface-sub)]'
                      }
                    >
                      <td className="py-2 px-3 font-bold text-[var(--text-secondary)]">{idx + 1}</td>
                      <td className="py-2 px-3 text-[var(--text-primary)] font-sans">{tv.description || `Vector ${idx + 1}`}</td>
                      {selectedChallenge.inputNames.map((n) => (
                        <td key={`v-in-${n}`} className="py-2 px-3 text-center font-bold">
                          {tv.inputs[n]}
                        </td>
                      ))}
                      {selectedChallenge.outputNames.map((n) => (
                        <td key={`v-exp-${n}`} className="py-2 px-3 text-center text-emerald-500 font-bold">
                          {tv.expectedOutputs[n]}
                        </td>
                      ))}
                      {selectedChallenge.outputNames.map((n) => {
                        const actualVal = evalRow ? evalRow.actual[n] : '-';
                        return (
                          <td
                            key={`v-act-${n}`}
                            className={`py-2 px-3 text-center font-bold ${
                              evalRow
                                ? actualVal === tv.expectedOutputs[n]
                                  ? 'text-emerald-500'
                                  : 'text-red-500'
                                : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            {actualVal}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-center">
                        {evalRow ? (
                          isPassed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> APROBADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" /> FALLIDO
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-[var(--text-secondary)] font-sans">Pendiente</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Printable Official Laboratory Evidence Report Modal */}
      {isReportModalOpen && evaluationResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-4 my-8">
            {/* Modal Action Bar */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface-sub)]">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  Reporte de Evidencias de Laboratorio
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyReportText}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-blue-500 text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-500" />
                  <span>Copiar</span>
                </button>
                <button
                  onClick={handlePrintReport}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-xs font-bold px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div id="printable-evidence-sheet" className="p-6 sm:p-8 space-y-6 bg-white text-gray-900 font-sans">
              {/* Document Header */}
              <div className="border-b-2 border-gray-800 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-lg font-black uppercase tracking-tight text-blue-900">
                    LOGICLAB DIGITAL COMPUTING SUITE
                  </h1>
                  <h2 className="text-sm font-bold text-gray-700">
                    INFORME DE EVIDENCIAS Y CERTIFICACIÓN DE PRÁCTICA DE LABORATORIO
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">{institution}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-900 font-mono-code font-bold text-xs rounded border border-blue-300">
                    {evaluationResult.verificationHash}
                  </span>
                  <div className="text-[10px] text-gray-500 mt-1 font-mono-code">
                    {new Date(evaluationResult.evaluatedAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Student and Challenge Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div>
                  <span className="font-bold text-gray-600 block">Alumno / Practicante:</span>
                  <span className="font-semibold text-gray-900 text-sm">{studentName}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-600 block">Matrícula / ID:</span>
                  <span className="font-mono-code font-semibold text-gray-900 text-sm">{studentId}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-600 block">Práctica Realizada:</span>
                  <span className="font-semibold text-gray-900">{selectedChallenge.title}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-600 block">Calificación de Testbench:</span>
                  <span
                    className={`font-black text-sm ${
                      evaluationResult.score === 100 ? 'text-emerald-700' : 'text-blue-800'
                    }`}
                  >
                    {evaluationResult.score}% ({evaluationResult.passedCount}/{evaluationResult.totalCount} vectores)
                  </span>
                </div>
              </div>

              {/* Testbench Matrix Table for Print */}
              <div>
                <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider mb-2">
                  Registro de Verificación Automática por Vectores de Prueba
                </h3>
                <table className="w-full text-[11px] border-collapse border border-gray-300">
                  <thead className="bg-gray-100 font-mono-code">
                    <tr>
                      <th className="border border-gray-300 p-1.5 text-center">#</th>
                      <th className="border border-gray-300 p-1.5 text-left">Condición / Vector</th>
                      <th className="border border-gray-300 p-1.5 text-center">Entradas</th>
                      <th className="border border-gray-300 p-1.5 text-center">Esperado</th>
                      <th className="border border-gray-300 p-1.5 text-center">Medido</th>
                      <th className="border border-gray-300 p-1.5 text-center">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono-code">
                    {evaluationResult.vectorResults.map((vr, i) => (
                      <tr key={i} className={vr.passed ? 'bg-emerald-50/50' : 'bg-red-50/50'}>
                        <td className="border border-gray-300 p-1.5 text-center">{i + 1}</td>
                        <td className="border border-gray-300 p-1.5 font-sans">{vr.description}</td>
                        <td className="border border-gray-300 p-1.5 text-center">
                          {Object.entries(vr.inputs)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(' ')}
                        </td>
                        <td className="border border-gray-300 p-1.5 text-center text-emerald-800 font-bold">
                          {Object.entries(vr.expected)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(' ')}
                        </td>
                        <td className="border border-gray-300 p-1.5 text-center font-bold">
                          {Object.entries(vr.actual)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(' ')}
                        </td>
                        <td className="border border-gray-300 p-1.5 text-center font-bold">
                          {vr.passed ? (
                            <span className="text-emerald-700">✓ PASS</span>
                          ) : (
                            <span className="text-red-700">✗ FAIL</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures and Validation Footnote */}
              <div className="pt-8 border-t border-gray-300 flex justify-between items-end text-xs">
                <div className="w-64 border-t border-gray-400 pt-2 text-center text-gray-600">
                  Firma del Alumno
                </div>
                <div className="w-64 border-t border-gray-400 pt-2 text-center text-gray-600">
                  Firma / Sello del Docente de Laboratorio
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
