/**
 * LogicLab - Reusable Visual Boolean Function Constructor
 * Component: ConstructorFuncionBooleana
 * 
 * Central reusable UI component for creating, validating, and manipulating
 * boolean functions visually without manual typing:
 * - Dynamic variable quantity selector (2 to 6+ variables: A, B, C, D, E, F)
 * - Direct variable buttons (A, B, C...)
 * - True overline negated variables (A̅, B̅, C̅...)
 * - Standard logical operators (· AND, + OR, ⊕ XOR, (, ))
 * - Truth values (1 [emerald] and 0 [rose])
 * - Expression display matching design: green accent border, live formula, checkmark apply
 * - Undo, Backspace, and Reset / Clear actions
 * - Emits the shared FuncionBooleana data model + string expression callbacks
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Check,
  Delete,
  RotateCcw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { FuncionBooleana } from '../../types/booleanFunction';
import { BooleanLogicService } from '../../engines/boolean/booleanLogicService';

export interface ConstructorFuncionBooleanaProps {
  /** Initial boolean function or algebraic expression string */
  initialFunction?: FuncionBooleana | string;

  /** Initial expression string (convenience alias) */
  initialExpression?: string;

  /** Starting variable count (default 4) */
  initialVarCount?: number;

  /** Predefined variable names (e.g. ['A', 'B', 'C']) */
  initialVariables?: string[];

  /** Selectable variable count options */
  allowedVarCounts?: number[];

  /** Display title */
  title?: string;

  /** Display subtitle or pedagogical instruction */
  subtitle?: string;

  /** Show 1 and 0 constant value buttons */
  showValueButtons?: boolean;

  /** Compact mode for tight dialogs / toolbars */
  compact?: boolean;

  /** Custom container CSS class */
  className?: string;

  /** Emitted whenever the expression or function state changes */
  onChange?: (fn: FuncionBooleana) => void;

  /** Emitted when the user confirms the expression via checkmark or button */
  onApply?: (fn: FuncionBooleana) => void;

  /** Backward-compatible string callback */
  onSubmit?: (expression: string, variables: string[]) => void;

  /** Backward-compatible string change callback */
  onExpressionChange?: (expression: string) => void;

  /** Optional cancel handler */
  onCancel?: () => void;
}

const ALL_VAR_NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];

export const ConstructorFuncionBooleana: React.FC<ConstructorFuncionBooleanaProps> = ({
  initialFunction,
  initialExpression,
  initialVarCount = 4,
  initialVariables,
  allowedVarCounts = [2, 3, 4, 5, 6],
  title,
  subtitle,
  showValueButtons = true,
  compact = false,
  className = '',
  onChange,
  onApply,
  onSubmit,
  onExpressionChange,
  onCancel,
}) => {
  // Extract initial text expression
  const initialText = useMemo(() => {
    if (typeof initialFunction === 'string') return initialFunction;
    if (initialFunction && typeof initialFunction === 'object') return initialFunction.expression;
    if (initialExpression) return initialExpression;
    return '';
  }, [initialFunction, initialExpression]);

  // Determine starting variable count
  const [varCount, setVarCount] = useState<number>(() => {
    if (initialVariables && initialVariables.length >= 2) {
      return Math.min(6, Math.max(2, initialVariables.length));
    }
    if (initialFunction && typeof initialFunction === 'object' && initialFunction.variableCount) {
      return Math.min(6, Math.max(2, initialFunction.variableCount));
    }
    return Math.min(6, Math.max(2, initialVarCount));
  });

  // Expression tokens sequence, e.g. ["A̅", "B", " + ", "A", "C"]
  const [tokens, setTokens] = useState<string[]>(() => {
    if (!initialText.trim()) return [];
    return BooleanLogicService.tokenizeForVisualDisplay(initialText.trim());
  });

  // Undo history stack
  const [history, setHistory] = useState<string[][]>([]);

  // Push token change to history
  const pushTokenChange = useCallback((newTokens: string[]) => {
    setHistory((prev) => [...prev.slice(-15), tokens]);
    setTokens(newTokens);
  }, [tokens]);

  const activeVariables = useMemo(() => {
    return ALL_VAR_NAMES.slice(0, varCount);
  }, [varCount]);

  // Clean tokens if variable count is decreased
  useEffect(() => {
    const validLetters = new Set(activeVariables);
    const cleaned = tokens.filter((tok) => {
      const bare = tok.replace(/[\u0305'̅]/g, '').trim();
      if (/^[A-F]$/.test(bare)) {
        return validLetters.has(bare);
      }
      return true;
    });
    if (cleaned.length !== tokens.length) {
      setTokens(cleaned);
    }
  }, [varCount, activeVariables]);

  // Undo action
  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setTokens(prev);
  };

  // Backspace action
  const handleBackspace = () => {
    if (tokens.length === 0) return;
    pushTokenChange(tokens.slice(0, -1));
  };

  // Reset / Clear action
  const handleClear = () => {
    if (tokens.length === 0) return;
    pushTokenChange([]);
  };

  // Add token with syntax intelligence
  const handleAddToken = (token: string) => {
    const last = tokens[tokens.length - 1];
    const isOp = (t?: string) => t === ' + ' || t === ' · ' || t === ' ⊕ ';

    if (isOp(token) && (!last || isOp(last) || last === '(')) {
      return; // Do not append binary operator after nothing or after open parenthesis
    }

    if (token === ')' && (!tokens.includes('(') || last === '(' || isOp(last))) {
      return; // Do not append closing paren if unparenthesized or right after operator
    }

    pushTokenChange([...tokens, token]);
  };

  // Evaluate expression syntax validity
  const validation = useMemo(() => {
    if (tokens.length === 0) {
      return { isValid: false, message: 'La expresión está vacía. Selecciona variables para comenzar.' };
    }

    let parenCount = 0;
    for (const tok of tokens) {
      if (tok === '(') parenCount++;
      if (tok === ')') parenCount--;
      if (parenCount < 0) {
        return { isValid: false, message: 'Paréntesis de cierre sin apertura previa.' };
      }
    }
    if (parenCount !== 0) {
      return { isValid: false, message: `Falta cerrar ${parenCount} paréntesis.')'` };
    }

    const last = tokens[tokens.length - 1];
    if (last === ' + ' || last === ' · ' || last === ' ⊕ ' || last === '(') {
      return { isValid: false, message: 'Expresión incompleta: termina en operador o paréntesis abierto.' };
    }

    return { isValid: true, message: 'Expresión booleana válida y bien formada.' };
  }, [tokens]);

  // Convert tokens to standardized algebraic text (e.g. A'B + BC')
  const standardExpression = useMemo(() => {
    let expr = '';
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (tok.includes('\u0305') || tok.includes('̅')) {
        const v = tok.replace(/[\u0305̅]/g, '').trim();
        expr += `${v}'`;
      } else if (tok === ' · ') {
        expr += ' · ';
      } else if (tok === ' + ') {
        expr += ' + ';
      } else if (tok === ' ⊕ ') {
        expr += ' ^ ';
      } else {
        expr += tok;
      }
    }
    return expr.trim();
  }, [tokens]);

  // Build the shared FuncionBooleana data model
  const booleanFunctionModel: FuncionBooleana = useMemo(() => {
    return BooleanLogicService.createFunction(
      standardExpression,
      varCount,
      activeVariables,
      'F',
      'constructor'
    );
  }, [standardExpression, varCount, activeVariables]);

  // Notify onChange & onExpressionChange
  useEffect(() => {
    if (onChange) {
      onChange(booleanFunctionModel);
    }
    if (onExpressionChange) {
      onExpressionChange(standardExpression);
    }
  }, [booleanFunctionModel, standardExpression, onChange, onExpressionChange]);

  // Confirm / Apply action
  const handleConfirm = () => {
    if (!validation.isValid) return;

    if (onApply) {
      onApply(booleanFunctionModel);
    }
    if (onSubmit) {
      onSubmit(standardExpression, activeVariables);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Title & Variable Quantity Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-color)]">
        <div>
          <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>{title || 'Constructor de Función Booleana'}</span>
          </h4>
          {subtitle && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Number of Variables Selector */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[var(--bg-surface-sub)] p-1 rounded-xl border border-[var(--border-color)]">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] px-2">
            Variables:
          </span>
          {allowedVarCounts.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setVarCount(count)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                varCount === count
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
              title={`Configurar ${count} variables (${ALL_VAR_NAMES.slice(0, count).join(', ')})`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Main Expression Box: Green rounded border with checkmark (matches user uploaded reference) */}
      <div className="relative flex items-center bg-[var(--bg-surface)] border-2 border-emerald-500 rounded-xl px-4 py-3 shadow-md transition-all focus-within:ring-2 focus-within:ring-emerald-500/20">
        <div className="flex-1 min-h-[28px] flex items-center flex-wrap gap-1 font-mono text-base md:text-lg text-[var(--text-primary)] tracking-wide">
          {tokens.length === 0 ? (
            <span className="text-slate-400 italic font-sans text-sm md:text-base select-none">
              Escriba el término o seleccione las variables abajo...
            </span>
          ) : (
            tokens.map((tok, idx) => {
              const isOverlined = tok.includes('\u0305') || tok.includes('̅');
              const isOp = tok === ' + ' || tok === ' · ' || tok === ' ⊕ ';
              const isVal1 = tok === '1';
              const isVal0 = tok === '0';

              return (
                <span
                  key={idx}
                  className={`inline-block font-semibold transition-transform hover:scale-110 ${
                    isOverlined
                      ? 'text-cyan-400 font-bold'
                      : isOp
                      ? 'text-amber-400 font-bold mx-0.5'
                      : isVal1
                      ? 'text-emerald-500 font-bold'
                      : isVal0
                      ? 'text-rose-500 font-bold'
                      : 'text-[var(--text-primary)]'
                  }`}
                  style={isOverlined ? { textDecoration: 'overline' } : undefined}
                >
                  {tok}
                </span>
              );
            })
          )}
        </div>

        {/* Checkmark Button (matches reference image: green square button with checkmark icon) */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!validation.isValid}
          className={`ml-3 shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
            validation.isValid
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md hover:scale-105 active:scale-95'
              : 'bg-slate-800 text-slate-500 border-slate-700 opacity-60 cursor-not-allowed'
          }`}
          title={validation.isValid ? 'Confirmar y aplicar expresión' : validation.message}
        >
          <Check className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Validation status message */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-1.5">
          {validation.isValid ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          <span
            className={
              validation.isValid ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'
            }
          >
            {validation.message}
          </span>
        </div>

        {tokens.length > 0 && (
          <span className="text-[11px] font-mono text-[var(--text-secondary)]">
            {tokens.length} {tokens.length === 1 ? 'término' : 'términos'}
          </span>
        )}
      </div>

      {/* Visual Keyboard & Palette (matching reference image) */}
      <div className="bg-[var(--bg-surface-sub)] border border-[var(--border-color)] rounded-xl p-3 sm:p-4 space-y-3.5 shadow-xs">
        {/* Row 1: Direct Variables & Negated Variables with Overline + Truth Values */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Variables y Complementos
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Direct variables (A, B, C...) */}
            {activeVariables.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleAddToken(v)}
                className="min-w-[42px] h-10 px-3 rounded-xl bg-[var(--bg-surface)] hover:bg-blue-600/10 border border-[var(--border-color)] hover:border-blue-500 text-base font-bold text-[var(--text-primary)] hover:text-blue-500 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center font-mono"
                title={`Agregar variable ${v}`}
              >
                {v}
              </button>
            ))}

            {/* Visual separator */}
            <div className="h-6 w-px bg-[var(--border-color)] mx-1 hidden sm:block" />

            {/* Negated variables with true overline (A̅, B̅, C̅...) */}
            {activeVariables.map((v) => (
              <button
                key={`${v}_neg`}
                type="button"
                onClick={() => handleAddToken(`${v}\u0305`)}
                className="min-w-[42px] h-10 px-3 rounded-xl bg-[var(--bg-surface)] hover:bg-cyan-600/10 border border-[var(--border-color)] hover:border-cyan-500 text-base font-bold text-cyan-500 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center font-mono"
                title={`Agregar negación de ${v} (${v} negada)`}
                style={{ textDecoration: 'overline' }}
              >
                {v}
              </button>
            ))}

            {/* Truth value buttons 1 and 0 (colored like reference image) */}
            {showValueButtons && (
              <>
                <div className="h-6 w-px bg-[var(--border-color)] mx-1 hidden sm:block" />
                <button
                  type="button"
                  onClick={() => handleAddToken('1')}
                  className="min-w-[42px] h-10 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-base font-bold text-emerald-600 dark:text-emerald-400 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center font-mono"
                  title="Valor lógico 1 (Verdadero / ALTO)"
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={() => handleAddToken('0')}
                  className="min-w-[42px] h-10 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-base font-bold text-rose-600 dark:text-rose-400 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center font-mono"
                  title="Valor lógico 0 (Falso / BAJO)"
                >
                  0
                </button>
              </>
            )}
          </div>
        </div>

        {/* Row 2: Logical Operators & Parentheses */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Operadores Lógicos
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddToken(' · ')}
              className="h-9 px-3.5 rounded-xl bg-[var(--bg-surface)] hover:bg-amber-600/10 border border-[var(--border-color)] hover:border-amber-500 text-xs font-bold text-[var(--text-primary)] hover:text-amber-500 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 font-mono"
              title="Operador AND (Producto lógico)"
            >
              <span className="text-base text-amber-500">·</span>
              <span>AND</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddToken(' + ')}
              className="h-9 px-3.5 rounded-xl bg-[var(--bg-surface)] hover:bg-amber-600/10 border border-[var(--border-color)] hover:border-amber-500 text-xs font-bold text-[var(--text-primary)] hover:text-amber-500 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 font-mono"
              title="Operador OR (Suma lógica)"
            >
              <span className="text-base text-amber-500">+</span>
              <span>OR</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddToken(' ⊕ ')}
              className="h-9 px-3.5 rounded-xl bg-[var(--bg-surface)] hover:bg-amber-600/10 border border-[var(--border-color)] hover:border-amber-500 text-xs font-bold text-[var(--text-primary)] hover:text-amber-500 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 font-mono"
              title="Operador XOR (OR exclusivo)"
            >
              <span className="text-base text-amber-500">⊕</span>
              <span>XOR</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddToken('(')}
              className="min-w-[36px] h-9 px-3 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-blue-500 text-sm font-bold text-[var(--text-primary)] shadow-xs transition-all active:scale-95 cursor-pointer font-mono"
              title="Paréntesis de apertura ("
            >
              (
            </button>

            <button
              type="button"
              onClick={() => handleAddToken(')')}
              className="min-w-[36px] h-9 px-3 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-blue-500 text-sm font-bold text-[var(--text-primary)] shadow-xs transition-all active:scale-95 cursor-pointer font-mono"
              title="Paréntesis de cierre )"
            >
              )
            </button>
          </div>
        </div>

        {/* Row 3: Control and Reset Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]/70">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBackspace}
              disabled={tokens.length === 0}
              className="h-8 px-2.5 rounded-lg bg-[var(--bg-surface)] hover:bg-slate-700/30 border border-[var(--border-color)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              title="Borrar último término"
            >
              <Delete className="w-3.5 h-3.5" />
              <span>Borrar</span>
            </button>

            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="h-8 px-2.5 rounded-lg bg-[var(--bg-surface)] hover:bg-slate-700/30 border border-[var(--border-color)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              title="Deshacer último cambio"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Deshacer</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={tokens.length === 0}
              className="h-8 px-2.5 rounded-lg bg-[var(--bg-surface)] hover:bg-rose-500/10 border border-[var(--border-color)] hover:border-rose-500/50 text-xs font-medium text-[var(--text-secondary)] hover:text-rose-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              title="Reiniciar y limpiar expresión"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reiniciar</span>
            </button>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-8 px-3 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default ConstructorFuncionBooleana;
