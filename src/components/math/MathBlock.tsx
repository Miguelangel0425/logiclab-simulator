import React, { useMemo } from 'react';
import katex from 'katex';
import { normalizeGeneralMath } from '../../engines/boolean/booleanNotation';

interface MathBlockProps {
  math: string;
  className?: string;
  normalize?: boolean;
}

export const MathBlock: React.FC<MathBlockProps> = ({
  math,
  className = '',
  normalize = true,
}) => {
  const html = useMemo(() => {
    if (!math) return '';
    const formula = normalize ? normalizeGeneralMath(math) : math;
    try {
      return katex.renderToString(formula, {
        displayMode: true,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return null;
    }
  }, [math, normalize]);

  if (!html) {
    return (
      <div className={`p-3 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] text-xs font-mono-code text-[var(--color-error)] text-center ${className}`}>
        [Error al renderizar fórmula: {math}]
      </div>
    );
  }

  return (
    <div
      className={`my-2 py-2 px-3 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] text-[var(--text-primary)] overflow-x-auto max-w-full text-center flex items-center justify-center ${className}`}
    >
      <div
        className="katex-display-wrapper inline-block min-w-0"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};
