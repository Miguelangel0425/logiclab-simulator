import React, { useMemo } from 'react';
import katex from 'katex';
import { ASTNode } from '../../engines/boolean/evaluator';
import { astToLatex, booleanStringToLatex } from '../../engines/boolean/booleanNotation';

interface BooleanExpressionProps {
  expression?: string;
  ast?: ASTNode | null;
  displayMode?: boolean;
  prefix?: string;
  className?: string;
}

export const BooleanExpression: React.FC<BooleanExpressionProps> = ({
  expression = '',
  ast = null,
  displayMode = false,
  prefix = '',
  className = '',
}) => {
  const latex = useMemo(() => {
    let coreLatex = '';
    if (ast) {
      coreLatex = astToLatex(ast);
    } else if (expression) {
      coreLatex = booleanStringToLatex(expression);
    }

    if (!coreLatex) return '';
    return prefix ? `${prefix} = ${coreLatex}` : coreLatex;
  }, [expression, ast, prefix]);

  const html = useMemo(() => {
    if (!latex) return '';
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return null;
    }
  }, [latex, displayMode]);

  if (!html) {
    return (
      <span className={`font-mono-code text-xs text-[var(--text-secondary)] ${className}`}>
        {prefix ? `${prefix} = ${expression}` : expression}
      </span>
    );
  }

  if (displayMode) {
    return (
      <div
        className={`my-1.5 py-2 px-3 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] text-[var(--text-primary)] overflow-x-auto max-w-full text-center flex items-center justify-center ${className}`}
      >
        <div
          className="katex-display-wrapper inline-block min-w-0"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  }

  return (
    <span
      className={`inline-boolean-expr text-[var(--text-primary)] inline-flex items-center align-middle font-medium ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
