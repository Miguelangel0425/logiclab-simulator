/**
 * Quine-McCluskey Algorithm with Petrick's Method
 * Exact Boolean Minimization Engine (SOP and POS)
 * Includes 100% Truth-Table Formal Equivalence Verification
 */

import { LogicValue, PrimeImplicant, QuineMcCluskeyResult } from '../../types';
import { ASTNode, BooleanParser, evaluateAST } from './evaluator';

interface BinaryTerm {
  binary: string; // e.g., "01-0"
  minterms: number[];
  used: boolean;
}

export class QuineMcCluskeyEngine {
  private variables: string[];
  private minterms: number[];
  private dontCares: number[];
  private numVars: number;
  private steps: string[] = [];

  constructor(variables: string[], minterms: number[], dontCares: number[] = []) {
    this.variables = variables.length > 0 ? variables : ['A', 'B', 'C', 'D'];
    this.numVars = this.variables.length;
    // ensure unique, sorted, and strictly within 0..(2^n - 1)
    const maxVal = Math.pow(2, this.numVars) - 1;
    this.minterms = Array.from(new Set(minterms))
      .filter((m) => m >= 0 && m <= maxVal)
      .sort((a, b) => a - b);
    this.dontCares = Array.from(new Set(dontCares))
      .filter((d) => d >= 0 && d <= maxVal && !this.minterms.includes(d))
      .sort((a, b) => a - b);
  }

  private countOnes(binary: string): number {
    return (binary.match(/1/g) || []).length;
  }

  private toBinary(n: number): string {
    return n.toString(2).padStart(this.numVars, '0');
  }

  private canCombine(t1: string, t2: string): number {
    let diffIndex = -1;
    for (let i = 0; i < t1.length; i++) {
      if (t1[i] !== t2[i]) {
        if (diffIndex !== -1) return -1; // more than 1 diff
        diffIndex = i;
      }
    }
    return diffIndex;
  }

  private combine(t1: string, t2: string, diffIndex: number): string {
    return t1.substring(0, diffIndex) + '-' + t1.substring(diffIndex + 1);
  }

  public termToExpression(binary: string, notation: 'prime' | 'bar' | 'not' = 'prime'): string {
    if (!binary.includes('0') && !binary.includes('1')) {
      return '1'; // tautology
    }
    const parts: string[] = [];
    for (let i = 0; i < binary.length; i++) {
      const bit = binary[i];
      const variable = this.variables[i];
      if (bit === '1') {
        parts.push(variable);
      } else if (bit === '0') {
        if (notation === 'prime') parts.push(`${variable}'`);
        else if (notation === 'bar') parts.push(`\\overline{${variable}}`);
        else parts.push(`¬${variable}`);
      }
    }
    return parts.join('');
  }

  public posTermToExpression(binary: string, notation: 'prime' | 'bar' = 'prime'): string {
    if (!binary.includes('0') && !binary.includes('1')) {
      return '0';
    }
    const parts: string[] = [];
    for (let i = 0; i < binary.length; i++) {
      const bit = binary[i];
      const variable = this.variables[i];
      // For POS from maxterms: bit 0 corresponds to variable uncomplemented, 1 to complemented
      if (bit === '0') {
        parts.push(variable);
      } else if (bit === '1') {
        if (notation === 'bar') parts.push(`\\overline{${variable}}`);
        else parts.push(`${variable}'`);
      }
    }
    return `(${parts.join(' + ')})`;
  }

  /**
   * Verifies that the candidate minimal expression matches the original truth table
   * across all 2^n input combinations. Don't-cares are allowed to be either 0 or 1.
   */
  public static verifyEquivalence(
    variables: string[],
    minterms: number[],
    dontCares: number[],
    expression: string,
    isSOP: boolean
  ): boolean {
    const numVars = variables.length;
    const totalCombos = Math.pow(2, numVars);

    const trimmed = expression.trim();
    if (trimmed === '0') {
      return minterms.length === 0;
    }
    if (trimmed === '1') {
      return minterms.length + dontCares.length === totalCombos;
    }

    let ast: ASTNode;
    try {
      const parser = new BooleanParser(expression);
      ast = parser.parse();
    } catch {
      return false;
    }

    const mintermSet = new Set(minterms);
    const dontCareSet = new Set(dontCares);

    for (let i = 0; i < totalCombos; i++) {
      if (dontCareSet.has(i)) {
        continue; // don't care: both 0 and 1 are acceptable
      }

      const expected = mintermSet.has(i) ? 1 : 0;
      const bin = i.toString(2).padStart(numVars, '0');
      const assignments: Record<string, LogicValue> = {};
      for (let v = 0; v < numVars; v++) {
        assignments[variables[v]] = (bin[v] === '1' ? 1 : 0);
      }

      const actual = evaluateAST(ast, assignments);
      if (actual !== expected) {
        return false;
      }
    }

    return true;
  }

  public solve(computeDual = true): QuineMcCluskeyResult {
    this.steps = [];

    // Special cases: all 0s or all 1s
    const totalCombinations = Math.pow(2, this.numVars);
    const allTerms = [...this.minterms, ...this.dontCares];

    if (this.minterms.length === 0) {
      return {
        originalExpression: '0',
        variables: this.variables,
        minterms: [],
        dontCares: this.dontCares,
        primeImplicants: [],
        essentialPrimeImplicants: [],
        sopSimplified: '0',
        posSimplified: '0',
        canonicalSop: '0',
        canonicalPos: this.buildCanonicalPOS() || '0',
        literalsBefore: 0,
        literalsAfter: 0,
        termsBefore: 0,
        termsAfter: 0,
        steps: [
          'La función no contiene ningún minterm activo: F = 0 (constante falsa).',
          `Verificación formal: Tabla de verdad comprobada al 100% en las 2^${this.numVars} combinaciones (todas son 0).`,
        ],
        isVerifiedEquivalent: true,
      };
    }

    if (this.minterms.length + this.dontCares.length === totalCombinations) {
      return {
        originalExpression: '1',
        variables: this.variables,
        minterms: this.minterms,
        dontCares: this.dontCares,
        primeImplicants: [
          { binary: '-'.repeat(this.numVars), minterms: allTerms, term: '1', isEssential: true, covered: true }
        ],
        essentialPrimeImplicants: [
          { binary: '-'.repeat(this.numVars), minterms: allTerms, term: '1', isEssential: true, covered: true }
        ],
        sopSimplified: '1',
        posSimplified: '1',
        canonicalSop: this.buildCanonicalSOP(),
        canonicalPos: '1',
        literalsBefore: this.minterms.length * this.numVars,
        literalsAfter: 0,
        termsBefore: this.minterms.length,
        termsAfter: 1,
        steps: [
          'Todos los minterms posibles están presentes o cubiertos por don\'t-cares: F = 1 (tautología constante).',
          `Verificación formal: Tabla de verdad comprobada al 100% en las 2^${this.numVars} combinaciones (todas son 1).`,
        ],
        isVerifiedEquivalent: true,
      };
    }

    this.steps.push(
      `Paso 1: Identificación de minterms Σm(${this.minterms.join(', ')}) con ${this.numVars} variables (${this.variables.join(', ')}).`
    );
    if (this.dontCares.length > 0) {
      this.steps.push(`Condiciones don't-care incluidas: d(${this.dontCares.join(', ')}).`);
    }

    // Step 1: Initial groups by number of 1s
    let currentGroups: Record<number, BinaryTerm[]> = {};
    for (const m of allTerms) {
      const bin = this.toBinary(m);
      const ones = this.countOnes(bin);
      if (!currentGroups[ones]) currentGroups[ones] = [];
      currentGroups[ones].push({
        binary: bin,
        minterms: [m],
        used: false,
      });
    }

    const primeImplicantsSet: BinaryTerm[] = [];
    let pass = 1;

    // Iteratively combine adjacent groups
    while (Object.keys(currentGroups).length > 0) {
      const nextGroups: Record<number, BinaryTerm[]> = {};
      const combinedBinaries = new Set<string>();
      let anyCombined = false;

      const groupKeys = Object.keys(currentGroups)
        .map(Number)
        .sort((a, b) => a - b);

      for (let k = 0; k < groupKeys.length; k++) {
        const groupNum = groupKeys[k];
        const nextGroupNum = groupKeys[k + 1];

        if (nextGroupNum === groupNum + 1) {
          const list1 = currentGroups[groupNum];
          const list2 = currentGroups[nextGroupNum];

          for (const item1 of list1) {
            for (const item2 of list2) {
              const diff = this.canCombine(item1.binary, item2.binary);
              if (diff !== -1) {
                item1.used = true;
                item2.used = true;
                anyCombined = true;

                const newBin = this.combine(item1.binary, item2.binary, diff);
                if (!combinedBinaries.has(newBin)) {
                  combinedBinaries.add(newBin);
                  const combinedMinterms = Array.from(new Set([...item1.minterms, ...item2.minterms])).sort((a, b) => a - b);
                  const ones = this.countOnes(newBin);
                  if (!nextGroups[ones]) nextGroups[ones] = [];
                  nextGroups[ones].push({
                    binary: newBin,
                    minterms: combinedMinterms,
                    used: false,
                  });
                }
              }
            }
          }
        }
      }

      // Collect unused as prime implicants
      for (const groupNum of groupKeys) {
        for (const item of currentGroups[groupNum]) {
          if (!item.used && !primeImplicantsSet.some((p) => p.binary === item.binary)) {
            primeImplicantsSet.push(item);
          }
        }
      }

      if (!anyCombined) break;
      this.steps.push(
        `Paso ${1 + pass}: Combinación de términos de orden ${pass} en implicantes de orden superior.`
      );
      currentGroups = nextGroups;
      pass++;
    }

    this.steps.push(
      `Paso ${1 + pass}: Identificados ${primeImplicantsSet.length} implicantes primos:`
    );

    const formattedPIs: PrimeImplicant[] = primeImplicantsSet.map((pi) => ({
      binary: pi.binary,
      minterms: pi.minterms,
      term: this.termToExpression(pi.binary),
      isEssential: false,
      covered: false,
    }));

    for (const pi of formattedPIs) {
      this.steps.push(`  • ${pi.term || '1'} (${pi.binary}) cubre minterms: {${pi.minterms.join(', ')}}`);
    }

    // Step 2: Essential Prime Implicant selection (Coverage Chart)
    const essentialPIs: PrimeImplicant[] = [];
    const mintermCoverage: Record<number, PrimeImplicant[]> = {};
    for (const m of this.minterms) {
      mintermCoverage[m] = [];
    }

    for (const pi of formattedPIs) {
      for (const m of pi.minterms) {
        if (mintermCoverage[m]) {
          mintermCoverage[m].push(pi);
        }
      }
    }

    // Find minterms covered by exactly 1 PI
    const coveredMinterms = new Set<number>();
    for (const m of this.minterms) {
      if (mintermCoverage[m]?.length === 1) {
        const epi = mintermCoverage[m][0];
        if (!essentialPIs.includes(epi)) {
          epi.isEssential = true;
          essentialPIs.push(epi);
        }
      }
    }

    // Mark covered minterms from EPIs
    for (const epi of essentialPIs) {
      for (const m of epi.minterms) {
        if (this.minterms.includes(m)) {
          coveredMinterms.add(m);
        }
      }
    }

    this.steps.push(
      `Paso ${2 + pass}: Identificación de ${essentialPIs.length} implicantes primos esenciales: ` +
        (essentialPIs.length > 0
          ? essentialPIs.map((e) => e.term).join(', ')
          : 'Ninguno estrictamente obligatorio de primera pasada.')
    );

    // Step 3: Petrick's Method / Minimal Coverage for remaining uncovered minterms
    const remainingMinterms = this.minterms.filter((m) => !coveredMinterms.has(m));
    const selectedRemainingPIs: PrimeImplicant[] = [];

    if (remainingMinterms.length > 0) {
      this.steps.push(
        `Paso ${3 + pass}: Cobertura de minterms restantes no esenciales {${remainingMinterms.join(', ')}} mediante método de Petrick / árbol de mínima cobertura.`
      );

      // Filter candidates that actually cover at least one of the remaining minterms
      const candidatePIs = formattedPIs.filter(
        (p) => !essentialPIs.includes(p) && p.minterms.some((m) => remainingMinterms.includes(m))
      );
      const chosen = this.findMinimalCover(remainingMinterms, candidatePIs);
      for (const p of chosen) {
        selectedRemainingPIs.push(p);
      }
    }

    const finalPIs = [...essentialPIs, ...selectedRemainingPIs];
    for (const pi of finalPIs) {
      pi.covered = true;
    }

    const sopSimplified = finalPIs.length > 0 ? finalPIs.map((p) => p.term).join(' + ') : '0';

    // Solve Dual POS without infinite recursion
    const posSimplified = computeDual ? this.solvePOS() : '';

    // Step 4: Strict Truth Table Verification
    const isSopVerified = QuineMcCluskeyEngine.verifyEquivalence(
      this.variables,
      this.minterms,
      this.dontCares,
      sopSimplified,
      true
    );

    const isPosVerified = computeDual
      ? QuineMcCluskeyEngine.verifyEquivalence(
          this.variables,
          this.minterms,
          this.dontCares,
          posSimplified,
          false
        )
      : true;

    if (!isSopVerified) {
      throw new Error(`Error de verificación: La expresión SOP '${sopSimplified}' no reproduce la tabla de verdad original.`);
    }
    if (computeDual && !isPosVerified) {
      throw new Error(`Error de verificación: La expresión POS '${posSimplified}' no reproduce la tabla de verdad original.`);
    }

    this.steps.push(
      `Paso ${4 + pass}: Verificación formal mediante tabla de verdad al 100%: evaluadas las 2^${this.numVars} combinaciones (${sopSimplified} SOP verificado, ${posSimplified} POS verificado).`
    );

    // Canonical forms
    const canonicalSop = this.buildCanonicalSOP();
    const canonicalPos = this.buildCanonicalPOS();

    const literalsBefore = this.minterms.length * this.numVars;
    let literalsAfter = 0;
    for (const pi of finalPIs) {
      const lit = pi.binary.replace(/-/g, '').length;
      literalsAfter += lit;
    }

    return {
      originalExpression: canonicalSop,
      variables: this.variables,
      minterms: this.minterms,
      dontCares: this.dontCares,
      primeImplicants: formattedPIs,
      essentialPrimeImplicants: essentialPIs,
      sopSimplified,
      posSimplified,
      canonicalSop,
      canonicalPos,
      literalsBefore,
      literalsAfter,
      termsBefore: this.minterms.length,
      termsAfter: finalPIs.length,
      steps: this.steps,
      isVerifiedEquivalent: isSopVerified && isPosVerified,
    };
  }

  private findMinimalCover(uncovered: number[], candidates: PrimeImplicant[]): PrimeImplicant[] {
    if (uncovered.length === 0) return [];
    if (candidates.length === 0) return [];

    let bestSet: PrimeImplicant[] = candidates;
    let minCost = Infinity;

    // Search combinations from k=1 upwards
    const maxK = Math.min(candidates.length, uncovered.length);
    for (let k = 1; k <= maxK; k++) {
      const combos = this.getCombinations(candidates, k);
      for (const combo of combos) {
        // check if covers all uncovered minterms
        const coveredAll = uncovered.every((m) => combo.some((pi) => pi.minterms.includes(m)));
        if (coveredAll) {
          const cost = combo.reduce((sum, pi) => sum + pi.binary.replace(/-/g, '').length, 0);
          if (cost < minCost) {
            minCost = cost;
            bestSet = combo;
          }
        }
      }
      if (bestSet !== candidates) break; // found minimal number of implicants
    }

    return bestSet;
  }

  private getCombinations<T>(arr: T[], k: number): T[][] {
    if (k === 1) return arr.map((x) => [x]);
    const result: T[][] = [];
    for (let i = 0; i <= arr.length - k; i++) {
      const head = arr[i];
      const tail = arr.slice(i + 1);
      const sub = this.getCombinations(tail, k - 1);
      for (const s of sub) {
        result.push([head, ...s]);
      }
    }
    return result;
  }

  private solvePOS(): string {
    const total = Math.pow(2, this.numVars);
    const maxterms: number[] = [];
    for (let i = 0; i < total; i++) {
      if (!this.minterms.includes(i) && !this.dontCares.includes(i)) {
        maxterms.push(i);
      }
    }

    if (maxterms.length === 0) return '1';
    if (maxterms.length === total) return '0';

    // Solve for maxterms using dual Quine-McCluskey (computeDual = false to terminate recursion)
    const dualEngine = new QuineMcCluskeyEngine(this.variables, maxterms, this.dontCares);
    const dualResult = dualEngine.solve(false);

    // Map each dual SOP product term to dual POS sum term
    if (dualResult.sopSimplified === '0') return '1';
    if (dualResult.sopSimplified === '1') return '0';

    const posTerms = dualResult.primeImplicants
      .filter((pi) => pi.covered)
      .map((pi) => this.posTermToExpression(pi.binary));

    return posTerms.length > 0 ? posTerms.join(' · ') : '1';
  }

  private buildCanonicalSOP(): string {
    if (this.minterms.length === 0) return '0';
    return this.minterms
      .map((m) => {
        const bin = this.toBinary(m);
        return this.termToExpression(bin);
      })
      .join(' + ');
  }

  private buildCanonicalPOS(): string {
    const total = Math.pow(2, this.numVars);
    const maxterms: number[] = [];
    for (let i = 0; i < total; i++) {
      if (!this.minterms.includes(i) && !this.dontCares.includes(i)) {
        maxterms.push(i);
      }
    }
    if (maxterms.length === 0) return '1';
    return maxterms
      .map((m) => {
        const bin = this.toBinary(m);
        return this.posTermToExpression(bin);
      })
      .join(' · ');
  }
}
