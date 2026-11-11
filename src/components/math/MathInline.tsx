import React, { useMemo } from 'react';
import katex from 'katex';
import { normalizeGeneralMath } from '../../engines/boolean/booleanNotation';

interface MathInlineProps {
  math: string;
  className?: string;
  normalize?: boolean;
}

export const MathInline: React.FC<MathInlineProps> = ({
  math,
  className = '',
  normalize = true,
}) => {
  const html = useMemo(() => {
    if (!math) return '';
    const formula = normalize ? normalizeGeneralMath(math) : math;
    try {
      return katex.renderToString(formula, {
        displayMode: false,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return null;
    }
  }, [math, normalize]);

  if (!html) {
    return <span className={`font-mono-code text-[var(--text-secondary)] ${className}`}>{math}</span>;
  }

  return (
    <span
      className={`inline-math text-[var(--text-primary)] inline-flex items-center align-middle ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
