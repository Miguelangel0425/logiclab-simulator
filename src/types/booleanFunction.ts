/**
 * LogicLab - Shared Boolean Function Data Model
 * 
 * Provides a unified, UI-independent data structure representing a boolean function
 * across all modules (Truth Tables, Karnaugh Maps, Boolean Solver, and Circuit Canvas).
 */

import { LogicValue } from './index';

export interface TruthTableRowData {
  index: number;
  binary: string;
  inputs: Record<string, 0 | 1>;
  output: 0 | 1 | 'X';
}

export interface TruthTableData {
  variables: string[];
  outputName: string;
  totalRows: number;
  rows: TruthTableRowData[];
}

export interface FuncionBooleana {
  /** Unique function identifier */
  id: string;

  /** Display label or name (e.g., 'F1', 'Suma_XOR') */
  name: string;

  /** Number of active input variables (e.g., 2, 3, 4, 5, 6) */
  variableCount: number;

  /** Ordered array of variable names (e.g., ['A', 'B', 'C']) */
  variables: string[];

  /** Standard algebraic boolean expression (e.g., "A · B + C'") */
  expression: string;

  /** Tokenized representation for visual parsing and rendering */
  tokens: string[];

  /** Evaluated truth table matrix */
  truthTable?: TruthTableData;

  /** Indices where the function outputs 1 (Sum of Products minterms) */
  minterms: number[];

  /** Indices where the function outputs 0 (Product of Sums maxterms) */
  maxterms: number[];

  /** Indices where the function output is unspecified / don't care (X) */
  dontCares: number[];

  /** Number of outputs if multi-output function */
  outputCount?: number;

  /** Simplified minimal Sum of Products (SOP) */
  simplifiedSop?: string;

  /** Simplified minimal Product of Sums (POS) */
  simplifiedPos?: string;

  /** Source module that generated this function */
  source?: 'constructor' | 'circuit' | 'truth-table' | 'karnaugh' | 'solver';

  /** Timestamp of last modification */
  updatedAt: number;

  /** Arbitrary pedagogical or simulation metadata */
  metadata?: Record<string, any>;
}

export type BooleanOperator = 'AND' | 'OR' | 'XOR' | 'NOT' | '(' | ')';

export interface TokenItem {
  id: string;
  text: string;
  type: 'variable' | 'negated_variable' | 'operator' | 'literal' | 'parenthesis';
  varName?: string;
}
