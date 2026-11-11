/**
 * LogicLab - Educational Explorer Module
 * Complete interactive digital logic curriculum, step-by-step worked lessons, quizzes, and live circuit demos
 * Professional KaTeX mathematical rendering with overline negations (\overline{...})
 */

import React, { useState } from 'react';
import { EDUCATIONAL_LESSONS } from '../data/educationLessons';
import { CIRCUIT_PRESETS } from '../engines/circuit/presets';
import { useAppStore } from '../store/useAppStore';
import { useCircuitStore } from '../store/useCircuitStore';
import { MathBlock, MathInline } from '../components/math';
import confetti from 'canvas-confetti';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  XCircle,
  Cpu,
  ArrowRight,
  Calculator,
  Menu,
  X,
} from 'lucide-react';

export const EducationalExplorerPage: React.FC = () => {
  const { setActiveTab, showToast } = useAppStore();
  const { loadCircuit } = useCircuitStore();

  const [selectedLessonId, setSelectedLessonId] = useState<string>(EDUCATIONAL_LESSONS[0].id);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [completedLessons, setCompletedLessons] = useState<Record<string, boolean>>({});
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState<boolean>(false);

  const currentLesson = EDUCATIONAL_LESSONS.find((l) => l.id === selectedLessonId) || EDUCATIONAL_LESSONS[0];

  // Quiz submission
  const handleSelectOption = (optionIndex: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentLesson.id]: optionIndex,
    }));

    if (optionIndex === currentLesson.quiz.correctIndex) {
      setCompletedLessons((prev) => ({ ...prev, [currentLesson.id]: true }));
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {
        // ignore
      }
    }
  };

  // Load demo circuit attached to lesson
  const handleLoadDemo = () => {
    if (!currentLesson.sampleCircuitKey) return;
    const preset = CIRCUIT_PRESETS.find((p) => p.id === currentLesson.sampleCircuitKey);
    if (preset) {
      const { components, connections } = preset.build();
      loadCircuit(components, connections);
      setActiveTab('circuit');
      showToast('info', `Circuito de demostración "${preset.name}" cargado en el editor.`);
    }
  };

  const progressPercent = Math.round(
    (Object.keys(completedLessons).length / EDUCATIONAL_LESSONS.length) * 100
  );

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col md:flex-row bg-[var(--bg-base)] text-[var(--text-primary)] select-none">
      {/* Mobile drawer toggle */}
      <div className="md:hidden p-3 bg-[var(--bg-surface)] border-b border-[var(--border-color)] flex items-center justify-between">
        <button
          onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-sub)] text-xs font-semibold text-[var(--text-primary)]"
        >
          {isSidebarOpenMobile ? <X className="w-4 h-4 text-blue-500" /> : <Menu className="w-4 h-4 text-blue-500" />}
          <span>{isSidebarOpenMobile ? 'Cerrar Temario' : 'Ver Temario del Curso'}</span>
        </button>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="text-[var(--text-secondary)]">Progreso:</span>
          <span className="text-blue-500">{progressPercent}%</span>
        </div>
      </div>

      {/* Lessons Sidebar (Desktop & Slide-over Mobile) */}
      <aside
        className={`w-full md:w-72 lg:w-80 border-r border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col shrink-0 transition-all ${
          isSidebarOpenMobile ? 'block' : 'hidden md:flex'
        }`}
      >
        <div className="p-4 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-500" />
              <span>Plan de Aprendizaje</span>
            </h2>
            <span className="text-xs font-bold text-blue-500">{progressPercent}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-[var(--bg-surface-sub)] overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {EDUCATIONAL_LESSONS.map((lesson, idx) => {
            const isSelected = lesson.id === selectedLessonId;
            const isDone = completedLessons[lesson.id];

            return (
              <button
                key={lesson.id}
                onClick={() => {
                  setSelectedLessonId(lesson.id);
                  setIsSidebarOpenMobile(false);
                }}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-transparent hover:border-[var(--border-color)] hover:bg-[var(--bg-surface-sub)] text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Módulo #{idx + 1} • {lesson.level}
                  </span>
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <span className="text-[10px] text-[var(--text-secondary)]">{lesson.duration}</span>
                  )}
                </div>
                <div className="text-xs font-medium mt-1 truncate">{lesson.title}</div>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-surface-sub)]">
          <button
            onClick={() => setActiveTab('practice')}
            className="w-full p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
            title="Ir al laboratorio interactivo de sumadores"
          >
            <Calculator className="w-4 h-4" />
            <span>Laboratorio de Sumadores</span>
          </button>
        </div>
      </aside>

      {/* Main Lesson Content */}
      <main className="flex-1 h-full overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Lesson Header */}
          <div className="space-y-2 pb-4 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
                {currentLesson.category}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-500/10 text-slate-400">
                {currentLesson.level}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">{currentLesson.title}</h1>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{currentLesson.summary}</p>
          </div>

          {/* Theoretical Text */}
          <div className="p-4 sm:p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-3 text-xs leading-relaxed text-[var(--text-primary)]">
            <h3 className="font-bold text-sm flex items-center gap-2 text-blue-500">
              <BookOpen className="w-4 h-4" />
              <span>Desarrollo Teórico y Conceptual</span>
            </h3>
            {currentLesson.content.map((paragraph, i) => (
              <p key={i} className="text-justify">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Formulas Card with Professional KaTeX MathBlock */}
          {currentLesson.formulas && currentLesson.formulas.length > 0 && (
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Leyes, Ecuaciones y Modelos Matemáticos
              </h4>
              <div className="space-y-2">
                {currentLesson.formulas.map((form, i) => (
                  <MathBlock key={i} math={form} />
                ))}
              </div>
            </div>
          )}

          {/* Truth table preview if available */}
          {currentLesson.truthTablePreview && (
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Tabla de Verdad Demostrativa
              </h4>
              <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
                <table className="w-full text-left text-xs border-collapse min-w-[300px]">
                  <thead className="bg-[var(--bg-surface-sub)] border-b border-[var(--border-color)] text-[var(--text-secondary)] text-[10px] font-bold">
                    <tr>
                      {currentLesson.truthTablePreview.headers.map((h, i) => (
                        <th key={i} className="p-2 font-mono-code text-center">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] font-mono-code">
                    {currentLesson.truthTablePreview.rows.map((r, ri) => (
                      <tr key={ri} className="hover:bg-blue-500/5">
                        {r.map((cell, ci) => (
                          <td key={ci} className="p-2 text-center">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Interactive Demo Circuit Button */}
          {currentLesson.sampleCircuitKey && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-xs text-blue-600 dark:text-blue-400">
                  Laboratorio Práctico Demostrativo
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Carga el circuito interactivo en el lienzo para probar las entradas y medir las señales.
                </div>
              </div>
              <button
                onClick={handleLoadDemo}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                <Cpu className="w-4 h-4" />
                <span>Abrir Circuito en Simulador</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Lesson Quiz */}
          <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Evaluación Formativa del Módulo
              </h3>
              {completedLessons[currentLesson.id] && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aprobado</span>
                </span>
              )}
            </div>

            <p className="text-xs font-medium text-[var(--text-primary)]">
              {currentLesson.quiz.question}
            </p>

            <div className="space-y-2">
              {currentLesson.quiz.options.map((opt, optIdx) => {
                const isSelected = userAnswers[currentLesson.id] === optIdx;
                const isCorrect = optIdx === currentLesson.quiz.correctIndex;
                const hasAnswered = userAnswers[currentLesson.id] !== undefined;

                let btnStyle = 'border-[var(--border-color)] bg-[var(--bg-surface-sub)] hover:border-blue-500/50';

                if (hasAnswered) {
                  if (isCorrect) {
                    btnStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold';
                  } else if (isSelected) {
                    btnStyle = 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400';
                  } else {
                    btnStyle = 'border-[var(--border-color)] opacity-50';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full text-left p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {hasAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    {hasAnswered && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {userAnswers[currentLesson.id] !== undefined && (
              <div className="p-3 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] text-xs space-y-1">
                <div className="font-bold text-[11px] text-[var(--text-secondary)] uppercase">
                  Explicación Técnica:
                </div>
                <p className="text-[var(--text-primary)] leading-relaxed">
                  {currentLesson.quiz.explanation}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
