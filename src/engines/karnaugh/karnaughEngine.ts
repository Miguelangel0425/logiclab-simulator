/**
 * Karnaugh Map Engine (2, 3, 4, 5 variables)
 * Gray code ordering, toroidal wrapping, 4-corner detection, step-by-step pedagogical reasoning
 * Strict truth-table equivalence verification
 */

import { KarnaughCell, KarnaughGroup, KarnaughResult, LogicValue } from '../../types';
import { QuineMcCluskeyEngine } from '../boolean/quineMcCluskey';

const GROUP_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#14B8A6', // Teal
];

export class KarnaughEngine {
  private variableCount: number;
  private variables: string[];
  private rowVars: string[];
  private colVars: string[];
  private rowGray: string[];
  private colGray: string[];
  private cells: Map<number, LogicValue> = new Map(); // mintermIndex -> 0 | 1 | 'X'

  constructor(variableCount: number, customVariables?: string[]) {
    this.variableCount = Math.max(2, Math.min(5, variableCount));
    const defaultVars = ['A', 'B', 'C', 'D', 'E'];
    this.variables = customVariables && customVariables.length >= this.variableCount
      ? customVariables.slice(0, this.variableCount)
      : defaultVars.slice(0, this.variableCount);

    if (this.variableCount === 2) {
      this.rowVars = [this.variables[0]]; // A
      this.colVars = [this.variables[1]]; // B
      this.rowGray = ['0', '1'];
      this.colGray = ['0', '1'];
    } else if (this.variableCount === 3) {
      this.rowVars = [this.variables[0]]; // A
      this.colVars = [this.variables[1], this.variables[2]]; // BC
      this.rowGray = ['0', '1'];
      this.colGray = ['00', '01', '11', '10'];
    } else if (this.variableCount === 4) {
      this.rowVars = [this.variables[0], this.variables[1]]; // AB
      this.colVars = [this.variables[2], this.variables[3]]; // CD
      this.rowGray = ['00', '01', '11', '10'];
      this.colGray = ['00', '01', '11', '10'];
    } else {
      // 5 variables: A selects sub-map, BC rows, DE cols
      this.rowVars = [this.variables[1], this.variables[2]]; // BC
      this.colVars = [this.variables[3], this.variables[4]]; // DE
      this.rowGray = ['00', '01', '11', '10'];
      this.colGray = ['00', '01', '11', '10'];
    }

    // initialize all cells to 0
    const totalCells = Math.pow(2, this.variableCount);
    for (let i = 0; i < totalCells; i++) {
      this.cells.set(i, 0);
    }
  }

  public setCell(mintermIndex: number, value: LogicValue) {
    this.cells.set(mintermIndex, value);
  }

  public getRowVars(): string[] {
    return this.rowVars;
  }

  public getColVars(): string[] {
    return this.colVars;
  }

  public getRowGray(): string[] {
    return this.rowGray;
  }

  public getColGray(): string[] {
    return this.colGray;
  }

  public setFromMinterms(minterms: number[], dontCares: number[] = []) {
    const totalCells = Math.pow(2, this.variableCount);
    for (let i = 0; i < totalCells; i++) {
      if (minterms.includes(i)) {
        this.cells.set(i, 1);
      } else if (dontCares.includes(i)) {
        this.cells.set(i, 'X');
      } else {
        this.cells.set(i, 0);
      }
    }
  }

  public getMintermIndex(rowGray: string, colGray: string, subMapBit = ''): number {
    const fullBinary = subMapBit + rowGray + colGray;
    return parseInt(fullBinary, 2);
  }

  public buildGrid(subMapIndex = 0): KarnaughCell[][] {
    const subMapBit = this.variableCount === 5 ? (subMapIndex === 0 ? '0' : '1') : '';
    const grid: KarnaughCell[][] = [];

    for (let r = 0; r < this.rowGray.length; r++) {
      const rowList: KarnaughCell[] = [];
      for (let c = 0; c < this.colGray.length; c++) {
        const m = this.getMintermIndex(this.rowGray[r], this.colGray[c], subMapBit);
        const val = this.cells.get(m) ?? 0;
        rowList.push({
          row: r,
          col: c,
          grayRow: this.rowGray[r],
          grayCol: this.colGray[c],
          mintermIndex: m,
          value: val,
        });
      }
      grid.push(rowList);
    }

    return grid;
  }

  public solve(mode: 'SOP' | 'POS' = 'SOP', subMapIndex = 0): KarnaughResult {
    const minterms: number[] = [];
    const dontCares: number[] = [];
    const maxterms: number[] = [];

    const totalCells = Math.pow(2, this.variableCount);
    for (let i = 0; i < totalCells; i++) {
      const val = this.cells.get(i) ?? 0;
      if (val === 1) minterms.push(i);
      else if (val === 'X') dontCares.push(i);
      else maxterms.push(i);
    }

    // 1. Run exact minimization via Quine-McCluskey for SOP
    const qmSop = new QuineMcCluskeyEngine(this.variables, minterms, dontCares);
    const qmResultSop = qmSop.solve(true);

    // 2. Run exact minimization for POS (minimizing maxterms)
    const qmPos = new QuineMcCluskeyEngine(this.variables, maxterms, dontCares);
    const qmResultPos = qmPos.solve(false);

    // Map prime implicants to visual Karnaugh groups according to mode (1s for SOP, 0s for POS)
    const isSOP = mode === 'SOP';
    const targetTerms = isSOP
      ? qmResultSop.primeImplicants.filter((pi) => pi.covered)
      : qmResultPos.primeImplicants.filter((pi) => pi.covered);

    const groups: KarnaughGroup[] = [];

    targetTerms.forEach((pi, index) => {
      const color = GROUP_COLORS[index % GROUP_COLORS.length];
      const coveredCells: { row: number; col: number; subMap?: number }[] = [];

      for (const m of pi.minterms) {
        // Find layer, row & col of m in grid
        const bin = m.toString(2).padStart(this.variableCount, '0');
        let rBin: string;
        let cBin: string;
        let subMapLayer = 0;

        if (this.variableCount === 2) {
          rBin = bin[0];
          cBin = bin[1];
        } else if (this.variableCount === 3) {
          rBin = bin[0];
          cBin = bin.substring(1, 3);
        } else if (this.variableCount === 4) {
          rBin = bin.substring(0, 2);
          cBin = bin.substring(2, 4);
        } else {
          // 5 vars
          subMapLayer = bin[0] === '1' ? 1 : 0;
          rBin = bin.substring(1, 3);
          cBin = bin.substring(3, 5);
        }

        const r = this.rowGray.indexOf(rBin);
        const c = this.colGray.indexOf(cBin);
        if (r !== -1 && c !== -1) {
          coveredCells.push({ row: r, col: c, subMap: subMapLayer });
        }
      }

      // Check which variables remained constant
      const varsKept: string[] = [];
      for (let v = 0; v < this.variables.length; v++) {
        if (pi.binary[v] !== '-') {
          varsKept.push(this.variables[v]);
        }
      }

      // Compute group expression
      const expr = isSOP
        ? pi.term
        : qmPos.posTermToExpression(pi.binary);

      groups.push({
        id: `group-${index}`,
        color,
        minterms: pi.minterms,
        cells: coveredCells,
        expression: expr,
        variablesKept: varsKept,
        isEssential: pi.isEssential,
      });
    });

    // 3. Strict Truth Table Verification
    const isSopVerified = QuineMcCluskeyEngine.verifyEquivalence(
      this.variables,
      minterms,
      dontCares,
      qmResultSop.sopSimplified,
      true
    );

    const isPosVerified = QuineMcCluskeyEngine.verifyEquivalence(
      this.variables,
      minterms,
      dontCares,
      qmResultSop.posSimplified,
      false
    );

    const isVerified = isSopVerified && isPosVerified;

    // Pedagogical steps
    const activeLabel = isSOP ? 'minterms (unos)' : 'maxterms (ceros)';
    const countActive = isSOP ? minterms.length : maxterms.length;
    const steps: string[] = [
      `1. Disposición en Código Gray: Las filas y columnas se ordenan según el código reflejado (${this.colGray.join(', ')}), garantizando que las celdas adyacentes difieran en exactamente 1 variable lógica (distancia de Hamming = 1).`,
      `2. Identificación de ${activeLabel}: Se localizan ${countActive} celdas en el mapa, respetando las adyacencias toroidales (borde izquierdo con derecho, borde superior con inferior, y las 4 esquinas).`,
      `3. Formación de grupos máximos en potencias de dos: Se detectan ${groups.length} agrupaciones rectangulares (${groups.map(g => `${g.cells.length} celdas`).join(', ') || 'ninguna'}) cubriendo todos los términos ${isSOP ? 'activos' : 'nulos'}.`,
      `4. Eliminación de variables alternantes: Para cada grupo, las variables cuyos valores cambian de 0 a 1 dentro del bloque se cancelan algebraicamente.`,
      `5. Expresión mínima obtenida: F = ${qmResultSop.sopSimplified} (SOP) | F = ${qmResultSop.posSimplified} (POS).`,
      `6. Verificación formal de tabla de verdad: Comprobadas las 2^${this.variableCount} combinaciones (${isVerified ? '100% verificado y conforme con la tabla original' : 'requiere revisión'}).`,
    ];

    const activeGrid = this.buildGrid(subMapIndex);
    const subGrids = this.variableCount === 5 ? [this.buildGrid(0), this.buildGrid(1)] : undefined;

    return {
      variableCount: this.variableCount,
      variables: this.variables,
      rowVariables: this.rowVars,
      colVariables: this.colVars,
      grid: activeGrid,
      subGrids,
      groups,
      sopExpression: qmResultSop.sopSimplified,
      posExpression: qmResultSop.posSimplified,
      steps,
      isEquivalent: isVerified,
    };
  }
}
