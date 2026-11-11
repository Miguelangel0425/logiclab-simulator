import React from 'react';
import { MathBlock } from './MathBlock';

interface FormulaWithExplanationProps {
  title?: string;
  formula: string;
  explanation: string;
  badge?: string;
  className?: string;
}

export const FormulaWithExplanation: React.FC<FormulaWithExplanationProps> = ({
  title,
  formula,
  explanation,
  badge,
  className = '',
}) => {
  return (
    <div
      className={`p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-2 text-xs text-[var(--text-primary)] ${className}`}
    >
      {(title || badge) && (
        <div className="flex items-center justify-between gap-2">
          {title && <span className="font-bold text-[var(--text-primary)]">{title}</span>}
          {badge && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
              {badge}
            </span>
          )}
        </div>
      )}

      <MathBlock math={formula} />

      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
        {explanation}
      </p>
    </div>
  );
};
