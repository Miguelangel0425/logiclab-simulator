/**
 * LogicLab - Centralized Boolean Logic Service
 * 
 * Single authoritative service for:
 * - Parsing & evaluating boolean expressions
 * - Generating truth tables
 * - Generating Karnaugh maps with Gray-code toroidal grouping
 * - Simplifying expressions via Quine-McCluskey / Petrick's method
 * - Checking logical equivalence with counterexample detection
 * - Synthesizing equivalent gate circuits
 * - Creating and manipulating the shared FuncionBooleana data model
 */

import {
  FuncionBooleana,
  TruthTableData,
  TruthTableRowData,
  TokenItem,
} from '../../types/booleanFunction';
import { CircuitComponent, WireConnection, KarnaughResult, QuineMcCluskeyResult } from '../../types';
import {
  BooleanParser,
  evaluateAST,
  extractVariables,
  ASTNode,
} from './evaluator';
import { QuineMcCluskeyEngine } from './quineMcCluskey';
import { KarnaughEngine } from '../karnaugh/karnaughEngine';
import { CircuitGenerator, SynthesisMode } from '../circuit/generator';

export interface EquivalenceResult {
  equivalent: boolean;
  variables: string[];
  totalCombinations: number;
  matchingCount: number;
  mismatches: {
    inputs: Record<string, 0 | 1>;
    fn1Output: 0 | 1;
    fn2Output: 0 | 1;
    binary: string;
  }[];
}

export class BooleanLogicService {
  /**
   * Creates a complete, rich FuncionBooleana object from an algebraic expression.
   */
  public static createFunction(
    expression: string,
    variableCount?: number,
    customVariables?: string[],
    name?: string,
    source?: FuncionBooleana['source']
  ): FuncionBooleana {
    const cleanExpr = expression.trim();
    const id = `fn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const parsedAST = cleanExpr ? BooleanParser.parse(cleanExpr) : null;
    const extracted = parsedAST ? extractVariables(parsedAST) : [];

    // Determine active variables
    let finalVars: string[];
    if (customVariables && customVariables.length > 0) {
      finalVars = [...customVariables];
      // Include any extracted variables that might not be in customVariables
      extracted.forEach((v) => {
        if (!finalVars.includes(v)) finalVars.push(v);
      });
    } else if (variableCount && variableCount > 0) {
      const defaultPool = ['A', 'B', 'C', 'D', 'E', 'F'];
      const targetCount = Math.max(variableCount, extracted.length);
      finalVars = defaultPool.slice(0, targetCount);
      extracted.forEach((v) => {
        if (!finalVars.includes(v)) finalVars.push(v);
      });
    } else {
      finalVars = extracted.length > 0 ? extracted : ['A', 'B'];
    }

    // Sort alphabetically for standard canonical form
    finalVars.sort();

    // Generate tokens
    const tokens = this.tokenizeForVisualDisplay(cleanExpr);

    // Build base function model
    const fn: FuncionBooleana = {
      id,
      name: name || 'F',
      variableCount: finalVars.length,
      variables: finalVars,
      expression: cleanExpr,
      tokens,
      minterms: [],
      maxterms: [],
      dontCares: [],
      outputCount: 1,
      source: source || 'constructor',
      updatedAt: Date.now(),
    };

    // If expression is valid, evaluate truth table, minterms, maxterms, and simplification
    if (parsedAST && cleanExpr) {
      const truthTable = this.generateTruthTable(fn);
      fn.truthTable = truthTable;

      const minterms: number[] = [];
      const maxterms: number[] = [];
      truthTable.rows.forEach((row) => {
        if (row.output === 1) minterms.push(row.index);
        else if (row.output === 0) maxterms.push(row.index);
      });

      fn.minterms = minterms;
      fn.maxterms = maxterms;

      // Calculate simplified SOP & POS
      try {
        const qm = new QuineMcCluskeyEngine(finalVars, minterms, []);
        const simplified = qm.solve();
        fn.simplifiedSop = simplified.sopSimplified;
        fn.simplifiedPos = simplified.posSimplified;
      } catch {
        // Fallback if Quine-McCluskey fails on boundary conditions
        fn.simplifiedSop = cleanExpr;
        fn.simplifiedPos = cleanExpr;
      }
    }

    return fn;
  }

  /**
   * Creates a FuncionBooleana from a set of minterms and variable specifications.
   */
  public static createFunctionFromMinterms(
    minterms: number[],
    variableCount: number,
    dontCares: number[] = [],
    customVariables?: string[],
    name?: string
  ): FuncionBooleana {
    const defaultPool = ['A', 'B', 'C', 'D', 'E', 'F'];
    const vars = customVariables && customVariables.length >= variableCount
      ? customVariables.slice(0, variableCount)
      : defaultPool.slice(0, variableCount);

    const qm = new QuineMcCluskeyEngine(vars, minterms, dontCares);
    const result = qm.solve();
    const expression = result.sopSimplified;

    const fn = this.createFunction(expression, variableCount, vars, name, 'karnaugh');
    fn.minterms = minterms;
    fn.dontCares = dontCares;
    fn.simplifiedSop = result.sopSimplified;
    fn.simplifiedPos = result.posSimplified;

    return fn;
  }

  /**
   * Evaluates a boolean function or raw expression against an input combination.
   */
  public static evaluate(
    fnOrExpr: FuncionBooleana | string,
    inputValues: Record<string, 0 | 1>
  ): 0 | 1 {
    const expr = typeof fnOrExpr === 'string' ? fnOrExpr : fnOrExpr.expression;
    if (!expr || !expr.trim()) return 0;

    try {
      const ast = BooleanParser.parse(expr);
      return evaluateAST(ast, inputValues);
    } catch {
      return 0;
    }
  }

  /**
   * Generates complete truth table matrix for a boolean function.
   */
  public static generateTruthTable(
    fnOrExpr: FuncionBooleana | string,
    customVariables?: string[]
  ): TruthTableData {
    let expr: string;
    let vars: string[];

    if (typeof fnOrExpr === 'string') {
      expr = fnOrExpr;
      const parsed = expr.trim() ? BooleanParser.parse(expr) : null;
      vars = customVariables && customVariables.length > 0
        ? customVariables
        : parsed ? extractVariables(parsed) : ['A', 'B'];
    } else {
      expr = fnOrExpr.expression;
      vars = customVariables || fnOrExpr.variables;
    }

    if (vars.length === 0) vars = ['A', 'B'];
    const totalRows = Math.pow(2, vars.length);
    const rows: TruthTableRowData[] = [];
    const ast = expr && expr.trim() ? BooleanParser.parse(expr) : null;

    for (let i = 0; i < totalRows; i++) {
      const binary = i.toString(2).padStart(vars.length, '0');
      const inputs: Record<string, 0 | 1> = {};

      for (let v = 0; v < vars.length; v++) {
        inputs[vars[v]] = binary[v] === '1' ? 1 : 0;
      }

      let output: 0 | 1 = 0;
      if (ast) {
        try {
          output = evaluateAST(ast, inputs);
        } catch {
          output = 0;
        }
      }

      rows.push({
        index: i,
        binary,
        inputs,
        output,
      });
    }

    return {
      variables: vars,
      outputName: typeof fnOrExpr === 'object' ? fnOrExpr.name : 'F',
      totalRows,
      rows,
    };
  }

  /**
   * Generates a Karnaugh map with Gray-code layout, prime implicant visual grouping,
   * toroidal edge-wrapping, and pedagogical explanation steps.
   */
  public static generateKarnaughMap(
    fnOrMinterms: FuncionBooleana | { minterms: number[]; dontCares?: number[]; variableCount: number; variables?: string[] },
    mode: 'SOP' | 'POS' = 'SOP',
    subMapIndex = 0
  ): KarnaughResult {
    let minterms: number[];
    let dontCares: number[];
    let varCount: number;
    let variables: string[] | undefined;

    if ('minterms' in fnOrMinterms && Array.isArray(fnOrMinterms.minterms)) {
      minterms = fnOrMinterms.minterms;
      dontCares = fnOrMinterms.dontCares || [];
      varCount = fnOrMinterms.variableCount;
      variables = fnOrMinterms.variables;
    } else {
      const fn = fnOrMinterms as FuncionBooleana;
      minterms = fn.minterms;
      dontCares = fn.dontCares || [];
      varCount = fn.variableCount;
      variables = fn.variables;
    }

    const engine = new KarnaughEngine(varCount, variables);
    minterms.forEach((m) => engine.setCell(m, 1));
    dontCares.forEach((d) => engine.setCell(d, 'X'));

    return engine.solve(mode, subMapIndex);
  }

  /**
   * Minimizes a boolean function using Quine-McCluskey and Petrick's method.
   */
  public static simplify(
    fnOrExpr: FuncionBooleana | { minterms: number[]; dontCares?: number[]; variables: string[] }
  ): QuineMcCluskeyResult {
    if ('variables' in fnOrExpr && 'minterms' in fnOrExpr) {
      const qm = new QuineMcCluskeyEngine(
        fnOrExpr.variables,
        fnOrExpr.minterms,
        fnOrExpr.dontCares || []
      );
      return qm.solve();
    }

    const fn = fnOrExpr as FuncionBooleana;
    const qm = new QuineMcCluskeyEngine(fn.variables, fn.minterms, fn.dontCares || []);
    return qm.solve();
  }

  /**
   * Verifies if two boolean functions or expressions are logically equivalent.
   * Compares outputs across all 2^N combinations and identifies exact counterexamples.
   */
  public static checkEquivalence(
    fn1: FuncionBooleana | string,
    fn2: FuncionBooleana | string
  ): EquivalenceResult {
    const expr1 = typeof fn1 === 'string' ? fn1 : fn1.expression;
    const expr2 = typeof fn2 === 'string' ? fn2 : fn2.expression;

    const ast1 = expr1.trim() ? BooleanParser.parse(expr1) : null;
    const ast2 = expr2.trim() ? BooleanParser.parse(expr2) : null;

    const vars1 = ast1 ? extractVariables(ast1) : [];
    const vars2 = ast2 ? extractVariables(ast2) : [];

    const combinedVars = Array.from(new Set([...vars1, ...vars2])).sort();
    if (combinedVars.length === 0) {
      combinedVars.push('A', 'B');
    }

    const totalCombinations = Math.pow(2, combinedVars.length);
    let matchingCount = 0;
    const mismatches: EquivalenceResult['mismatches'] = [];

    for (let i = 0; i < totalCombinations; i++) {
      const binary = i.toString(2).padStart(combinedVars.length, '0');
      const inputs: Record<string, 0 | 1> = {};
      for (let v = 0; v < combinedVars.length; v++) {
        inputs[combinedVars[v]] = binary[v] === '1' ? 1 : 0;
      }

      const out1 = ast1 ? evaluateAST(ast1, inputs) : 0;
      const out2 = ast2 ? evaluateAST(ast2, inputs) : 0;

      if (out1 === out2) {
        matchingCount++;
      } else {
        mismatches.push({
          inputs,
          fn1Output: out1,
          fn2Output: out2,
          binary,
        });
      }
    }

    return {
      equivalent: mismatches.length === 0,
      variables: combinedVars,
      totalCombinations,
      matchingCount,
      mismatches,
    };
  }

  /**
   * Generates a fully wired schematic circuit from a boolean function or expression.
   */
  public static synthesizeCircuit(
    fnOrExpr: FuncionBooleana | string,
    mode: SynthesisMode = 'STANDARD'
  ): { components: CircuitComponent[]; connections: WireConnection[] } {
    const expr = typeof fnOrExpr === 'string'
      ? fnOrExpr
      : (fnOrExpr.simplifiedSop || fnOrExpr.expression);

    return CircuitGenerator.fromExpression(expr, mode);
  }

  /**
   * Tokenizes an algebraic expression into display strings for visual formula chips.
   */
  public static tokenizeForVisualDisplay(expr: string): string[] {
    if (!expr || !expr.trim()) return [];

    const clean = expr
      .replace(/\s+/g, ' ')
      .replace(/\*/g, '·')
      .replace(/&/g, '·')
      .replace(/\|/g, '+')
      .replace(/\^/g, '⊕');

    const tokens: string[] = [];
    let i = 0;

    while (i < clean.length) {
      const ch = clean[i];

      if (ch === ' ') {
        i++;
        continue;
      }

      if (ch === '+' || ch === '·' || ch === '⊕') {
        tokens.push(` ${ch} `);
        i++;
        continue;
      }

      if (ch === '(' || ch === ')' || ch === '1' || ch === '0') {
        tokens.push(ch);
        i++;
        continue;
      }

      // Check for variable followed by prime ' or overline
      if (/^[A-Za-z]$/.test(ch)) {
        const v = ch.toUpperCase();
        if (i + 1 < clean.length && (clean[i + 1] === "'" || clean[i + 1] === '\u0305' || clean[i + 1] === '̅')) {
          tokens.push(`${v}\u0305`);
          i += 2;
          continue;
        } else {
          tokens.push(v);
          i++;
          continue;
        }
      }

      // Check for ~A or !A
      if (ch === '~' || ch === '!') {
        if (i + 1 < clean.length && /^[A-Za-z]$/.test(clean[i + 1])) {
          tokens.push(`${clean[i + 1].toUpperCase()}\u0305`);
          i += 2;
          continue;
        }
      }

      i++;
    }

    return tokens;
  }
}
