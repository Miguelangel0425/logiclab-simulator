/**
 * LogicLab - Circuit Simulation & Signal Propagation Engine
 * Supports combinatorial and sequential logic, edge detection, clock ticks, and cycle guards.
 */

import { CircuitComponent, LogicValue, SubcircuitDefinition, WireConnection } from '../../types';
import { QuineMcCluskeyEngine } from '../boolean/quineMcCluskey';
import { SubcircuitRegistry } from './subcircuitRegistry';

export interface EvaluationResult {
  components: CircuitComponent[];
  connections: WireConnection[];
  cycleDetected: boolean;
  warnings: string[];
  errors: string[];
}

export interface CircuitTruthTableRow {
  index: number;
  binary: string;
  inputs: Record<string, 0 | 1>;
  outputs: Record<string, LogicValue>;
  minterm: number;
}

export interface CircuitValidationInfo {
  unconnectedPins: { compId: string; componentId?: string; compLabel: string; pinId: string; pinName: string; pinLabel?: string }[];
  hasSequentialComponents: boolean;
  sequentialComponentNames: string[];
  hasCycle: boolean;
  warnings: string[];
}

export interface CircuitTruthTableResult {
  success: boolean;
  message?: string;
  inputVariables: string[];
  outputVariables: string[];
  rows: CircuitTruthTableRow[];
  minterms: number[];
  maxterms: number[];
  sopExpression?: string;
  circuitTimestamp: number;
  unconnectedPins?: { compId: string; componentId?: string; compLabel: string; pinId: string; pinName: string; pinLabel?: string }[];
  hasSequentialComponents?: boolean;
  hasCycle?: boolean;
  validation: CircuitValidationInfo;
}

export interface CircuitTableMismatch {
  index: number;
  rowIndex: number;
  binary: string;
  inputs: Record<string, 0 | 1>;
  outputName: string;
  expected: any;
  actual: any;
  expectedRecord?: Record<string, LogicValue>;
  actualRecord?: Record<string, LogicValue>;
}

export interface CircuitTableComparisonResult {
  equivalent: boolean;
  totalCombinations: number;
  matches: number;
  matchingCombinations: number;
  mismatches: CircuitTableMismatch[];
  message: string;
  inputs: string[];
  outputs: string[];
  error?: string;
}

export class CircuitSimulator {
  /**
   * Evaluates one full simulation step of the circuit.
   */
  public static step(
    components: CircuitComponent[],
    connections: WireConnection[],
    isClockTick = false,
    subcircuitDefs?: Map<string, SubcircuitDefinition> | Record<string, SubcircuitDefinition>,
    callingStack: Set<string> = new Set()
  ): EvaluationResult {
    const comps: CircuitComponent[] = JSON.parse(JSON.stringify(components));
    const conns: WireConnection[] = JSON.parse(JSON.stringify(connections));
    const warnings: string[] = [];
    const errors: string[] = [];

    // Map for fast pin lookup
    const pinDrivers: Map<string, LogicValue[]> = new Map(); // toPinKey -> [values]

    // 1. Initial pass on autonomous sources (Switches, Constants, Clocks)
    for (const comp of comps) {
      if (comp.type === 'CONSTANT_0') {
        if (comp.outputs[0]) comp.outputs[0].value = 0;
      } else if (comp.type === 'CONSTANT_1') {
        if (comp.outputs[0]) comp.outputs[0].value = 1;
      } else if (comp.type === 'SWITCH') {
        const val = comp.state?.switchActive !== undefined
          ? (comp.state.switchActive ? 1 : 0)
          : (comp.outputs[0]?.value === 1 ? 1 : 0);
        if (comp.outputs[0]) comp.outputs[0].value = val;
      } else if (comp.type === 'PUSH_BUTTON') {
        const val = comp.state?.buttonPressed ? 1 : 0;
        if (comp.outputs[0]) comp.outputs[0].value = val;
      } else if (comp.type === 'CLOCK') {
        if (isClockTick) {
          const current = comp.outputs[0]?.value === 1 ? 0 : 1;
          if (comp.outputs[0]) comp.outputs[0].value = current;
        }
      }
    }

    // Iterative propagation loop (relaxing up to 12 iterations for combinational stability)
    let cycleDetected = false;
    const MAX_ITERATIONS = 15;
    let iteration = 0;
    let hasChanged = true;

    while (hasChanged && iteration < MAX_ITERATIONS) {
      hasChanged = false;
      iteration++;

      // Transfer output signals along connections to inputs
      pinDrivers.clear();

      for (const wire of conns) {
        const sourceComp = comps.find((c) => c.id === wire.fromComponentId);
        const sourcePin = sourceComp?.outputs.find((p) => p.id === wire.fromPinId);
        const sigValue: LogicValue = sourcePin ? sourcePin.value : 'X';

        wire.value = sigValue;

        const targetKey = `${wire.toComponentId}:${wire.toPinId}`;
        if (!pinDrivers.has(targetKey)) {
          pinDrivers.set(targetKey, []);
        }
        pinDrivers.get(targetKey)!.push(sigValue);
      }

      // Apply driven values to input pins (check for contention)
      for (const comp of comps) {
        for (const inPin of comp.inputs) {
          const key = `${comp.id}:${inPin.id}`;
          const drivers = pinDrivers.get(key);

          let newVal: LogicValue = 'X'; // floating / unconnected
          if (drivers && drivers.length > 0) {
            // Contention check: multiple drivers with conflicting 0 and 1
            const hasZero = drivers.includes(0);
            const hasOne = drivers.includes(1);
            if (hasZero && hasOne) {
              newVal = 'X';
              if (iteration === 1) {
                warnings.push(
                  `Conflicto de señal en el pin '${inPin.name}' de '${comp.label || comp.type}': múltiples salidas con niveles opuestos (cortocircuito lógico).`
                );
              }
            } else if (hasOne) {
              newVal = 1;
            } else if (hasZero) {
              newVal = 0;
            } else {
              newVal = drivers[0];
            }
          }

          if (inPin.value !== newVal) {
            inPin.value = newVal;
            hasChanged = true;
          }
        }

        // Evaluate component logic
        const changedInEval = this.evaluateComponent(comp, isClockTick, warnings, subcircuitDefs, callingStack);
        if (changedInEval) {
          hasChanged = true;
        }
      }
    }

    if (iteration >= MAX_ITERATIONS && hasChanged) {
      cycleDetected = true;
      warnings.push(
        'Bucle combinacional detectado sin retardo o con oscilación inestable. Verifique las retroalimentaciones del circuito.'
      );
    }

    return {
      components: comps,
      connections: conns,
      cycleDetected,
      warnings,
      errors,
    };
  }

  /**
   * Evaluates logic behavior of an individual component
   */
  private static evaluateComponent(
    comp: CircuitComponent,
    isClockTick: boolean,
    warnings: string[],
    subcircuitDefs?: Map<string, SubcircuitDefinition> | Record<string, SubcircuitDefinition>,
    callingStack: Set<string> = new Set()
  ): boolean {
    let outputsChanged = false;

    const setOutput = (pinIdx: number, val: LogicValue) => {
      const pin = comp.outputs[pinIdx];
      if (pin && pin.value !== val) {
        pin.value = val;
        outputsChanged = true;
      }
    };

    const inVal = (pinIdx: number): LogicValue => {
      return comp.inputs[pinIdx] ? comp.inputs[pinIdx].value : 'X';
    };

    switch (comp.type) {
      // Basic Gates
      case 'AND': {
        const anyZero = comp.inputs.some((p) => p.value === 0);
        const anyX = comp.inputs.some((p) => p.value === 'X');
        if (anyZero) setOutput(0, 0);
        else if (anyX) setOutput(0, 'X');
        else setOutput(0, 1);
        break;
      }
      case 'OR': {
        const anyOne = comp.inputs.some((p) => p.value === 1);
        const anyX = comp.inputs.some((p) => p.value === 'X');
        if (anyOne) setOutput(0, 1);
        else if (anyX) setOutput(0, 'X');
        else setOutput(0, 0);
        break;
      }
      case 'NOT': {
        const v = inVal(0);
        if (v === 1) setOutput(0, 0);
        else if (v === 0) setOutput(0, 1);
        else setOutput(0, 'X');
        break;
      }
      case 'NAND': {
        const anyZero = comp.inputs.some((p) => p.value === 0);
        const anyX = comp.inputs.some((p) => p.value === 'X');
        if (anyZero) setOutput(0, 1);
        else if (anyX) setOutput(0, 'X');
        else setOutput(0, 0);
        break;
      }
      case 'NOR': {
        const anyOne = comp.inputs.some((p) => p.value === 1);
        const anyX = comp.inputs.some((p) => p.value === 'X');
        if (anyOne) setOutput(0, 0);
        else if (anyX) setOutput(0, 'X');
        else setOutput(0, 1);
        break;
      }
      case 'XOR': {
        const anyX = comp.inputs.some((p) => p.value === 'X' || p.value === 'Z');
        if (anyX) {
          setOutput(0, 'X');
        } else {
          const ones = comp.inputs.filter((p) => p.value === 1).length;
          setOutput(0, ones % 2 === 1 ? 1 : 0);
        }
        break;
      }
      case 'XNOR': {
        const anyX = comp.inputs.some((p) => p.value === 'X' || p.value === 'Z');
        if (anyX) {
          setOutput(0, 'X');
        } else {
          const ones = comp.inputs.filter((p) => p.value === 1).length;
          setOutput(0, ones % 2 === 0 ? 1 : 0);
        }
        break;
      }
      case 'BUFFER': {
        setOutput(0, inVal(0));
        break;
      }

      // Arithmetic
      case 'HALF_ADDER': {
        const a = inVal(0);
        const b = inVal(1);
        if (a === 'X' || b === 'X' || a === 'Z' || b === 'Z') {
          setOutput(0, 'X'); // S
          setOutput(1, 'X'); // C
        } else {
          const numA = a as number;
          const numB = b as number;
          setOutput(0, (numA ^ numB) ? 1 : 0); // Sum
          setOutput(1, (numA & numB) ? 1 : 0); // Carry
        }
        break;
      }
      case 'FULL_ADDER': {
        const a = inVal(0);
        const b = inVal(1);
        const cin = inVal(2);
        if (a === 'X' || b === 'X' || cin === 'X' || a === 'Z' || b === 'Z' || cin === 'Z') {
          setOutput(0, 'X');
          setOutput(1, 'X');
        } else {
          const numA = a as number;
          const numB = b as number;
          const numCin = cin as number;
          const sum = numA ^ numB ^ numCin;
          const cout = (numA & numB) | (numB & numCin) | (numA & numCin);
          setOutput(0, sum ? 1 : 0);
          setOutput(1, cout ? 1 : 0);
        }
        break;
      }
      case 'HALF_SUBTRACTOR': {
        const a = inVal(0);
        const b = inVal(1);
        if (a === 'X' || b === 'X' || a === 'Z' || b === 'Z') {
          setOutput(0, 'X'); // Diff
          setOutput(1, 'X'); // Borrow
        } else {
          const numA = a as number;
          const numB = b as number;
          setOutput(0, (numA ^ numB) ? 1 : 0);
          setOutput(1, (!numA && numB) ? 1 : 0);
        }
        break;
      }
      case 'FULL_SUBTRACTOR': {
        const a = inVal(0);
        const b = inVal(1);
        const bin = inVal(2);
        if (a === 'X' || b === 'X' || bin === 'X' || a === 'Z' || b === 'Z' || bin === 'Z') {
          setOutput(0, 'X');
          setOutput(1, 'X');
        } else {
          const numA = a as number;
          const numB = b as number;
          const numBin = bin as number;
          const diff = numA ^ numB ^ numBin;
          const notA = numA === 0 ? 1 : 0;
          const notAxorB = (numA ^ numB) === 0 ? 1 : 0;
          const bout = (notA & numB) | (notAxorB & numBin);
          setOutput(0, diff ? 1 : 0);
          setOutput(1, bout ? 1 : 0);
        }
        break;
      }
      case 'ADDER_4BIT': {
        // 4-bit A (inputs 0..3), 4-bit B (inputs 4..7), Cin (input 8)
        let cin = inVal(8) === 1 ? 1 : 0;
        let valid = true;
        for (let i = 0; i < 4; i++) {
          const ai = inVal(i);
          const bi = inVal(i + 4);
          if (ai === 'X' || bi === 'X' || ai === 'Z' || bi === 'Z') {
            setOutput(i, 'X');
            valid = false;
          } else {
            const numA = ai as number;
            const numB = bi as number;
            const sum = numA ^ numB ^ cin;
            cin = (numA & numB) | (numB & cin) | (numA & cin);
            setOutput(i, sum ? 1 : 0);
          }
        }
        setOutput(4, valid ? (cin ? 1 : 0) : 'X'); // Cout
        break;
      }
      case 'MAGNITUDE_COMP': {
        const a = inVal(0);
        const b = inVal(1);
        if (a === 'X' || b === 'X') {
          setOutput(0, 'X'); // A > B
          setOutput(1, 'X'); // A = B
          setOutput(2, 'X'); // A < B
        } else {
          setOutput(0, a > b ? 1 : 0);
          setOutput(1, a === b ? 1 : 0);
          setOutput(2, a < b ? 1 : 0);
        }
        break;
      }

      // Routing
      case 'MUX_2TO1': {
        const d0 = inVal(0);
        const d1 = inVal(1);
        const s = inVal(2); // select
        if (s === 0) setOutput(0, d0);
        else if (s === 1) setOutput(0, d1);
        else setOutput(0, 'X');
        break;
      }
      case 'MUX_4TO1': {
        const d0 = inVal(0);
        const d1 = inVal(1);
        const d2 = inVal(2);
        const d3 = inVal(3);
        const s0 = inVal(4);
        const s1 = inVal(5);
        if (s0 === 'X' || s1 === 'X') {
          setOutput(0, 'X');
        } else {
          const sel = (s1 ? 2 : 0) + (s0 ? 1 : 0);
          const data = [d0, d1, d2, d3];
          setOutput(0, data[sel]);
        }
        break;
      }
      case 'DEMUX_1TO4': {
        const d = inVal(0);
        const s0 = inVal(1);
        const s1 = inVal(2);
        if (s0 === 'X' || s1 === 'X') {
          for (let i = 0; i < 4; i++) setOutput(i, 'X');
        } else {
          const sel = (s1 ? 2 : 0) + (s0 ? 1 : 0);
          for (let i = 0; i < 4; i++) {
            setOutput(i, i === sel ? d : 0);
          }
        }
        break;
      }
      case 'DECODER_2TO4': {
        const a0 = inVal(0);
        const a1 = inVal(1);
        const en = comp.inputs[2] ? inVal(2) : 1; // enable pin
        if (en === 0) {
          for (let i = 0; i < 4; i++) setOutput(i, 0);
        } else if (a0 === 'X' || a1 === 'X' || en === 'X') {
          for (let i = 0; i < 4; i++) setOutput(i, 'X');
        } else {
          const sel = (a1 ? 2 : 0) + (a0 ? 1 : 0);
          for (let i = 0; i < 4; i++) {
            setOutput(i, i === sel ? 1 : 0);
          }
        }
        break;
      }
      case 'DECODER_3TO8': {
        const a0 = inVal(0);
        const a1 = inVal(1);
        const a2 = inVal(2);
        const en = comp.inputs[3] ? inVal(3) : 1;
        if (en === 0) {
          for (let i = 0; i < 8; i++) setOutput(i, 0);
        } else if (a0 === 'X' || a1 === 'X' || a2 === 'X' || en === 'X') {
          for (let i = 0; i < 8; i++) setOutput(i, 'X');
        } else {
          const sel = (a2 ? 4 : 0) + (a1 ? 2 : 0) + (a0 ? 1 : 0);
          for (let i = 0; i < 8; i++) {
            setOutput(i, i === sel ? 1 : 0);
          }
        }
        break;
      }
      case 'BCD_TO_7SEG': {
        // Inputs: D (MSB, weight 8), C (weight 4), B (weight 2), A (LSB, weight 1)
        const d = inVal(0);
        const c = inVal(1);
        const b = inVal(2);
        const a = inVal(3);
        const isAnode = comp.state?.displayMode === 'anode';
        const invalidMode = comp.state?.invalidBcdMode || 'BLANK';

        if (d === 'X' || c === 'X' || b === 'X' || a === 'X' ||
            d === 'Z' || c === 'Z' || b === 'Z' || a === 'Z') {
          for (let i = 0; i < 7; i++) setOutput(i, 'X');
          break;
        }

        const bcd = (d ? 8 : 0) + (c ? 4 : 0) + (b ? 2 : 0) + (a ? 1 : 0);
        // Canonical Active-HIGH (Cathode) segment patterns for a, b, c, d, e, f, g
        let segs: number[] = [0, 0, 0, 0, 0, 0, 0];
        if (bcd <= 9) {
          const table: Record<number, number[]> = {
            0: [1, 1, 1, 1, 1, 1, 0],
            1: [0, 1, 1, 0, 0, 0, 0],
            2: [1, 1, 0, 1, 1, 0, 1],
            3: [1, 1, 1, 1, 0, 0, 1],
            4: [0, 1, 1, 0, 0, 1, 1],
            5: [1, 0, 1, 1, 0, 1, 1],
            6: [1, 0, 1, 1, 1, 1, 1],
            7: [1, 1, 1, 0, 0, 0, 0],
            8: [1, 1, 1, 1, 1, 1, 1],
            9: [1, 1, 1, 1, 0, 1, 1],
          };
          segs = table[bcd];
        } else {
          // Invalid BCD (10 to 15 / 1010 to 1111)
          if (invalidMode === 'INVALID_DASH') {
            segs = [0, 0, 0, 0, 0, 0, 1]; // Only center 'g' lit
          } else if (invalidMode === 'HEX_LETTERS') {
            const hexTable: Record<number, number[]> = {
              10: [1, 1, 1, 0, 1, 1, 1], // A
              11: [0, 0, 1, 1, 1, 1, 1], // b
              12: [1, 0, 0, 1, 1, 1, 0], // C
              13: [0, 1, 1, 1, 1, 0, 1], // d
              14: [1, 0, 0, 1, 1, 1, 1], // E
              15: [1, 0, 0, 0, 1, 1, 1], // F
            };
            segs = hexTable[bcd] || [0, 0, 0, 0, 0, 0, 0];
          } else {
            // 'BLANK': All segments turned off
            segs = [0, 0, 0, 0, 0, 0, 0];
          }
        }

        // Apply Common Anode vs Common Cathode polarity
        // Cátodo común: 1 = encendido, 0 = apagado
        // Ánodo común: 0 = encendido, 1 = apagado
        for (let i = 0; i < 7; i++) {
          const lit = segs[i] === 1;
          const outputVal: LogicValue = isAnode ? (lit ? 0 : 1) : (lit ? 1 : 0);
          setOutput(i, outputVal);
        }
        break;
      }
      case 'ENCODER_DECIMAL_TO_BCD': {
        // Inputs D0 to D9 (indices 0..9)
        // Outputs: A (1), B (2), C (4), D (8), V (Valid)
        let highestActive = -1;
        let hasX = false;
        for (let i = 9; i >= 0; i--) {
          const val = inVal(i);
          if (val === 1) {
            highestActive = i;
            break;
          } else if (val === 'X' || val === 'Z') {
            hasX = true;
          }
        }

        if (highestActive >= 0) {
          setOutput(0, (highestActive & 1) ? 1 : 0); // A (weight 1)
          setOutput(1, (highestActive & 2) ? 1 : 0); // B (weight 2)
          setOutput(2, (highestActive & 4) ? 1 : 0); // C (weight 4)
          setOutput(3, (highestActive & 8) ? 1 : 0); // D (weight 8)
          setOutput(4, 1); // Valid
        } else if (hasX) {
          setOutput(0, 'X');
          setOutput(1, 'X');
          setOutput(2, 'X');
          setOutput(3, 'X');
          setOutput(4, 'X');
        } else {
          setOutput(0, 0);
          setOutput(1, 0);
          setOutput(2, 0);
          setOutput(3, 0);
          setOutput(4, 0);
        }
        break;
      }
      case 'PRIORITY_ENCODER_4TO2': {
        // Inputs: I0..I3 (indices 0..3) with I3 having highest priority
        // Outputs: Y1 (MSB, weight 2), Y0 (LSB, weight 1), V (Valid)
        const i3 = inVal(3);
        const i2 = inVal(2);
        const i1 = inVal(1);
        const i0 = inVal(0);

        if (i3 === 1) {
          setOutput(0, 1); setOutput(1, 1); setOutput(2, 1); // Y1=1, Y0=1, V=1
        } else if (i3 === 'X') {
          setOutput(0, 'X'); setOutput(1, 'X'); setOutput(2, 'X');
        } else if (i2 === 1) {
          setOutput(0, 1); setOutput(1, 0); setOutput(2, 1); // Y1=1, Y0=0, V=1
        } else if (i2 === 'X') {
          setOutput(0, 'X'); setOutput(1, 'X'); setOutput(2, 'X');
        } else if (i1 === 1) {
          setOutput(0, 0); setOutput(1, 1); setOutput(2, 1); // Y1=0, Y0=1, V=1
        } else if (i1 === 'X') {
          setOutput(0, 'X'); setOutput(1, 'X'); setOutput(2, 'X');
        } else if (i0 === 1) {
          setOutput(0, 0); setOutput(1, 0); setOutput(2, 1); // Y1=0, Y0=0, V=1
        } else if (i0 === 'X') {
          setOutput(0, 'X'); setOutput(1, 'X'); setOutput(2, 'X');
        } else {
          // All 0
          setOutput(0, 0); setOutput(1, 0); setOutput(2, 0);
        }
        break;
      }
      case 'PRIORITY_ENCODER_8TO3': {
        // Inputs: I0..I7 (indices 0..7), I7 is highest priority
        // Outputs: Y2 (MSB, 4), Y1 (2), Y0 (LSB, 1), V (Valid)
        let highest = -1;
        let hasX = false;
        for (let i = 7; i >= 0; i--) {
          const v = inVal(i);
          if (v === 1) {
            highest = i;
            break;
          } else if (v === 'X' || v === 'Z') {
            hasX = true;
            break;
          }
        }

        if (highest >= 0) {
          setOutput(0, (highest & 4) ? 1 : 0); // Y2 (MSB)
          setOutput(1, (highest & 2) ? 1 : 0); // Y1
          setOutput(2, (highest & 1) ? 1 : 0); // Y0 (LSB)
          setOutput(3, 1); // Valid
        } else if (hasX) {
          setOutput(0, 'X'); setOutput(1, 'X'); setOutput(2, 'X'); setOutput(3, 'X');
        } else {
          setOutput(0, 0); setOutput(1, 0); setOutput(2, 0); setOutput(3, 0);
        }
        break;
      }
      case 'ENCODER_4TO2': {
        const i0 = inVal(0) === 1;
        const i1 = inVal(1) === 1;
        const i2 = inVal(2) === 1;
        const i3 = inVal(3) === 1;
        if (i3) {
          setOutput(0, 1); setOutput(1, 1); setOutput(2, 1); // Y0, Y1, Valid
        } else if (i2) {
          setOutput(0, 0); setOutput(1, 1); setOutput(2, 1);
        } else if (i1) {
          setOutput(0, 1); setOutput(1, 0); setOutput(2, 1);
        } else if (i0) {
          setOutput(0, 0); setOutput(1, 0); setOutput(2, 1);
        } else {
          setOutput(0, 0); setOutput(1, 0); setOutput(2, 0);
        }
        break;
      }

      // Sequential circuits
      case 'LATCH_SR': {
        const s = inVal(0);
        const r = inVal(1);
        if (!comp.state) comp.state = { q: 0, qBar: 1 };

        if (s === 1 && r === 1) {
          warnings.push(`Biestable SR '${comp.label || comp.id}': Estado indefinido prohibido (S=1 y R=1 simultáneos).`);
          comp.state.q = 'X';
          comp.state.qBar = 'X';
        } else if (s === 1 && r === 0) {
          comp.state.q = 1;
          comp.state.qBar = 0;
        } else if (s === 0 && r === 1) {
          comp.state.q = 0;
          comp.state.qBar = 1;
        }
        // if s=0, r=0 -> memory (retains q)
        setOutput(0, comp.state.q ?? 0);
        setOutput(1, comp.state.qBar ?? 1);
        break;
      }
      case 'FLIPFLOP_D': {
        const dPin = comp.inputs.find((p) => p.name === 'D') ?? comp.inputs[0];
        const clkPin = comp.inputs.find((p) => p.name === 'CLK' || p.type === 'clock') ?? comp.inputs[1];
        const prePin = comp.inputs.find((p) => p.name === '~PRE' || p.name === 'PRE' || p.name === "PRE'");
        const clrPin = comp.inputs.find((p) => p.name === '~CLR' || p.name === 'CLR' || p.name === "CLR'");

        const d = dPin ? dPin.value : inVal(0);
        const clk = clkPin ? clkPin.value : inVal(1);
        const pre = prePin ? (prePin.value === 'X' ? 1 : prePin.value) : 1;
        const clr = clrPin ? (clrPin.value === 'X' ? 1 : clrPin.value) : 1;

        if (!comp.state) comp.state = { q: 0, qBar: 1, clockPrev: 0 };

        // Active-low asynchronous Preset and Clear overrides
        if (pre === 0 && clr === 1) {
          comp.state.q = 1;
          comp.state.qBar = 0;
        } else if (clr === 0 && pre === 1) {
          comp.state.q = 0;
          comp.state.qBar = 1;
        } else if (pre === 0 && clr === 0) {
          // Unstable / forbidden condition in 7474
          comp.state.q = 1;
          comp.state.qBar = 1;
        } else {
          // Synchronous clock transition on rising edge
          const isRisingEdge = comp.state.clockPrev === 0 && clk === 1;
          if (isRisingEdge) {
            if (d === 'X' || d === 'Z') {
              comp.state.q = 'X';
              comp.state.qBar = 'X';
            } else {
              comp.state.q = d;
              comp.state.qBar = d === 1 ? 0 : 1;
            }
          }
        }
        comp.state.clockPrev = clk;
        setOutput(0, comp.state.q ?? 0);
        setOutput(1, comp.state.qBar ?? 1);
        break;
      }
      case 'FLIPFLOP_JK': {
        const jPin = comp.inputs.find((p) => p.name === 'J') ?? comp.inputs[0];
        const kPin = comp.inputs.find((p) => p.name === 'K') ?? (comp.inputs.length >= 3 ? comp.inputs[2] : comp.inputs[1]);
        const clkPin = comp.inputs.find((p) => p.name === 'CLK' || p.type === 'clock') ?? (comp.inputs.length >= 3 ? comp.inputs[1] : comp.inputs[2]);
        const prePin = comp.inputs.find((p) => p.name === '~PRE' || p.name === 'PRE' || p.name === "PRE'");
        const clrPin = comp.inputs.find((p) => p.name === '~CLR' || p.name === 'CLR' || p.name === "CLR'");

        const j = jPin ? jPin.value : inVal(0);
        const k = kPin ? kPin.value : inVal(1);
        const clk = clkPin ? clkPin.value : inVal(2);
        const pre = prePin ? (prePin.value === 'X' ? 1 : prePin.value) : 1;
        const clr = clrPin ? (clrPin.value === 'X' ? 1 : clrPin.value) : 1;

        if (!comp.state) comp.state = { q: 0, qBar: 1, clockPrev: 0 };

        if (pre === 0 && clr === 1) {
          comp.state.q = 1;
          comp.state.qBar = 0;
        } else if (clr === 0 && pre === 1) {
          comp.state.q = 0;
          comp.state.qBar = 1;
        } else if (pre === 0 && clr === 0) {
          comp.state.q = 1;
          comp.state.qBar = 1;
        } else {
          const isRisingEdge = comp.state.clockPrev === 0 && clk === 1;
          if (isRisingEdge) {
            if (j === 0 && k === 1) {
              comp.state.q = 0;
              comp.state.qBar = 1;
            } else if (j === 1 && k === 0) {
              comp.state.q = 1;
              comp.state.qBar = 0;
            } else if (j === 1 && k === 1) {
              const prevQ = comp.state.q === 1 ? 1 : 0;
              comp.state.q = prevQ === 1 ? 0 : 1;
              comp.state.qBar = comp.state.q === 1 ? 0 : 1;
            } else if (j === 'X' || k === 'X') {
              comp.state.q = 'X';
              comp.state.qBar = 'X';
            }
          }
        }
        comp.state.clockPrev = clk;
        setOutput(0, comp.state.q ?? 0);
        setOutput(1, comp.state.qBar ?? 1);
        break;
      }
      case 'FLIPFLOP_T': {
        const t = inVal(0);
        const clk = inVal(1);
        if (!comp.state) comp.state = { q: 0, qBar: 1, clockPrev: 0 };

        const isRisingEdge = comp.state.clockPrev === 0 && clk === 1;
        if (isRisingEdge && t === 1) {
          const prevQ = comp.state.q === 1 ? 1 : 0;
          comp.state.q = prevQ === 1 ? 0 : 1;
          comp.state.qBar = comp.state.q === 1 ? 0 : 1;
        }
        comp.state.clockPrev = clk;
        setOutput(0, comp.state.q ?? 0);
        setOutput(1, comp.state.qBar ?? 1);
        break;
      }
      case 'COUNTER_4BIT': {
        const clk = inVal(0);
        const reset = inVal(1);
        const dir = comp.inputs[2] ? inVal(2) : 1; // 1=Up, 0=Down
        if (!comp.state) comp.state = { count: 0, clockPrev: 0 };

        if (reset === 1) {
          comp.state.count = 0;
        } else {
          const isRisingEdge = comp.state.clockPrev === 0 && clk === 1;
          if (isRisingEdge) {
            let current = comp.state.count ?? 0;
            if (dir === 1 || dir === 'X') {
              current = (current + 1) % 16;
            } else {
              current = (current - 1 + 16) % 16;
            }
            comp.state.count = current;
          }
        }
        comp.state.clockPrev = clk;

        const cnt = comp.state.count ?? 0;
        setOutput(0, (cnt & 1) ? 1 : 0); // Q0
        setOutput(1, (cnt & 2) ? 1 : 0); // Q1
        setOutput(2, (cnt & 4) ? 1 : 0); // Q2
        setOutput(3, (cnt & 8) ? 1 : 0); // Q3
        setOutput(4, cnt === 15 ? 1 : 0); // RCO (Terminal Count)
        break;
      }

      // MSI 74xx Standard ICs
      case 'IC_74LS90': {
        const clkA = comp.inputs.find((p) => p.name === 'CLK A')?.value ?? inVal(0);
        const clkB = comp.inputs.find((p) => p.name === 'CLK B')?.value ?? inVal(1);
        const r01 = comp.inputs.find((p) => p.name === 'R0(1)')?.value ?? inVal(2);
        const r02 = comp.inputs.find((p) => p.name === 'R0(2)')?.value ?? inVal(3);
        const r91 = comp.inputs.find((p) => p.name === 'R9(1)')?.value ?? inVal(4);
        const r92 = comp.inputs.find((p) => p.name === 'R9(2)')?.value ?? inVal(5);

        if (!comp.state) comp.state = { countA: 0, countBCD: 0, clockPrevA: 0, clockPrevB: 0 };

        const resetToZero = r01 === 1 && r02 === 1;
        const resetToNine = r91 === 1 && r92 === 1;

        if (resetToZero) {
          comp.state.countA = 0;
          comp.state.countBCD = 0;
        } else if (resetToNine) {
          comp.state.countA = 1;
          comp.state.countBCD = 4; // BCD 9: QA=1, QB=0, QC=0, QD=1
        } else {
          // Section A: Divide by 2 (negative edge triggered: 1 -> 0)
          const isFallingA = comp.state.clockPrevA === 1 && clkA === 0;
          if (isFallingA) {
            comp.state.countA = (comp.state.countA ?? 0) === 1 ? 0 : 1;
          }

          // Section B: Divide by 5 (negative edge triggered: 1 -> 0)
          const isFallingB = comp.state.clockPrevB === 1 && clkB === 0;
          if (isFallingB) {
            comp.state.countBCD = ((comp.state.countBCD ?? 0) + 1) % 5;
          }
        }

        comp.state.clockPrevA = clkA;
        comp.state.clockPrevB = clkB;

        const qA = comp.state.countA ?? 0;
        const bcd = comp.state.countBCD ?? 0;
        const qB = (bcd === 1 || bcd === 3) ? 1 : 0;
        const qC = (bcd === 2 || bcd === 3) ? 1 : 0;
        const qD = (bcd === 4) ? 1 : 0;

        comp.state.count = qA + (qB << 1) + (qC << 2) + (qD << 3);

        setOutput(0, qA as LogicValue);
        setOutput(1, qB as LogicValue);
        setOutput(2, qC as LogicValue);
        setOutput(3, qD as LogicValue);
        break;
      }

      case 'IC_74LS194': {
        const clr = comp.inputs.find((p) => p.name === '~CLR')?.value ?? inVal(0);
        const clk = comp.inputs.find((p) => p.name === 'CLK')?.value ?? inVal(1);
        const s0 = comp.inputs.find((p) => p.name === 'S0')?.value ?? inVal(2);
        const s1 = comp.inputs.find((p) => p.name === 'S1')?.value ?? inVal(3);
        const sr = comp.inputs.find((p) => p.name === 'SR')?.value ?? inVal(4);
        const sl = comp.inputs.find((p) => p.name === 'SL')?.value ?? inVal(5);
        const d0 = comp.inputs.find((p) => p.name === 'D0')?.value ?? inVal(6);
        const d1 = comp.inputs.find((p) => p.name === 'D1')?.value ?? inVal(7);
        const d2 = comp.inputs.find((p) => p.name === 'D2')?.value ?? inVal(8);
        const d3 = comp.inputs.find((p) => p.name === 'D3')?.value ?? inVal(9);

        if (!comp.state) comp.state = { shiftBits: [0, 0, 0, 0], clockPrev: 0 };
        if (!comp.state.shiftBits || comp.state.shiftBits.length !== 4) {
          comp.state.shiftBits = [0, 0, 0, 0];
        }

        if (clr === 0) {
          // Asynchronous master reset
          comp.state.shiftBits = [0, 0, 0, 0];
        } else {
          const isRisingEdge = comp.state.clockPrev === 0 && clk === 1;
          if (isRisingEdge) {
            const mode = ((s1 === 1 ? 2 : 0) | (s0 === 1 ? 1 : 0));
            const current = [...comp.state.shiftBits];
            if (mode === 0) {
              // Hold (no change)
            } else if (mode === 1) {
              // Shift Right: SR into Q0, Q0 into Q1, Q1 into Q2, Q2 into Q3
              comp.state.shiftBits = [sr === 'X' ? 0 : sr, current[0], current[1], current[2]];
            } else if (mode === 2) {
              // Shift Left: SL into Q3, Q3 into Q2, Q2 into Q1, Q1 into Q0
              comp.state.shiftBits = [current[1], current[2], current[3], sl === 'X' ? 0 : sl];
            } else if (mode === 3) {
              // Parallel Load: D0..D3 into Q0..Q3
              comp.state.shiftBits = [
                d0 === 'X' ? 0 : d0,
                d1 === 'X' ? 0 : d1,
                d2 === 'X' ? 0 : d2,
                d3 === 'X' ? 0 : d3,
              ];
            }
          }
        }

        comp.state.clockPrev = clk;
        setOutput(0, comp.state.shiftBits[0] as LogicValue);
        setOutput(1, comp.state.shiftBits[1] as LogicValue);
        setOutput(2, comp.state.shiftBits[2] as LogicValue);
        setOutput(3, comp.state.shiftBits[3] as LogicValue);
        break;
      }

      case 'IC_74LS85': {
        const a3 = comp.inputs.find((p) => p.name === 'A3')?.value ?? inVal(0);
        const a2 = comp.inputs.find((p) => p.name === 'A2')?.value ?? inVal(1);
        const a1 = comp.inputs.find((p) => p.name === 'A1')?.value ?? inVal(2);
        const a0 = comp.inputs.find((p) => p.name === 'A0')?.value ?? inVal(3);
        const b3 = comp.inputs.find((p) => p.name === 'B3')?.value ?? inVal(4);
        const b2 = comp.inputs.find((p) => p.name === 'B2')?.value ?? inVal(5);
        const b1 = comp.inputs.find((p) => p.name === 'B1')?.value ?? inVal(6);
        const b0 = comp.inputs.find((p) => p.name === 'B0')?.value ?? inVal(7);
        const igt = comp.inputs.find((p) => p.name === 'I_A>B')?.value ?? inVal(8);
        const ieq = comp.inputs.find((p) => p.name === 'I_A=B')?.value ?? inVal(9);
        const ilt = comp.inputs.find((p) => p.name === 'I_A<B')?.value ?? inVal(10);

        const a3Val = a3 === 'X' || a3 === 'Z' ? 0 : a3;
        const a2Val = a2 === 'X' || a2 === 'Z' ? 0 : a2;
        const a1Val = a1 === 'X' || a1 === 'Z' ? 0 : a1;
        const a0Val = a0 === 'X' || a0 === 'Z' ? 0 : a0;
        const b3Val = b3 === 'X' || b3 === 'Z' ? 0 : b3;
        const b2Val = b2 === 'X' || b2 === 'Z' ? 0 : b2;
        const b1Val = b1 === 'X' || b1 === 'Z' ? 0 : b1;
        const b0Val = b0 === 'X' || b0 === 'Z' ? 0 : b0;

        const valA = ((a3Val as number) << 3) | ((a2Val as number) << 2) | ((a1Val as number) << 1) | (a0Val as number);
        const valB = ((b3Val as number) << 3) | ((b2Val as number) << 2) | ((b1Val as number) << 1) | (b0Val as number);

          if (valA > valB) {
            setOutput(0, 1);
            setOutput(1, 0);
            setOutput(2, 0);
          } else if (valA < valB) {
            setOutput(0, 0);
            setOutput(1, 0);
            setOutput(2, 1);
          } else {
            const cascadeEq = ieq === 'X' ? 1 : ieq;
            const cascadeGt = igt === 'X' ? 0 : igt;
            const cascadeLt = ilt === 'X' ? 0 : ilt;
            setOutput(0, cascadeGt as LogicValue);
            setOutput(1, cascadeEq as LogicValue);
            setOutput(2, cascadeLt as LogicValue);
          }
          break;
        }

      case 'IC_74LS151': {
        const dInputs = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => comp.inputs.find((p) => p.name === `D${i}`)?.value ?? inVal(i));
        const s0 = comp.inputs.find((p) => p.name === 'S0')?.value ?? inVal(8);
        const s1 = comp.inputs.find((p) => p.name === 'S1')?.value ?? inVal(9);
        const s2 = comp.inputs.find((p) => p.name === 'S2')?.value ?? inVal(10);
        const en = comp.inputs.find((p) => p.name === '~E')?.value ?? inVal(11);

        if (en === 1) {
          setOutput(0, 0);
          setOutput(1, 1);
        } else if (en === 'X') {
          setOutput(0, 'X');
          setOutput(1, 'X');
        } else {
          if (s0 === 'X' || s1 === 'X' || s2 === 'X') {
            setOutput(0, 'X');
            setOutput(1, 'X');
          } else {
            const code = ((s2 as number) << 2) | ((s1 as number) << 1) | (s0 as number);
            const selected = dInputs[code];
            if (!comp.state) comp.state = {};
            comp.state.selectedMuxChannel = code;

            if (selected === 'X' || selected === 'Z') {
              setOutput(0, 'X');
              setOutput(1, 'X');
            } else {
              setOutput(0, selected);
              setOutput(1, selected === 1 ? 0 : 1);
            }
          }
        }
        break;
      }

      // IO Peripherals
      case 'LED':
      case 'OUTPUT_LED': {
        // Output pin reflects input directly
        setOutput(0, inVal(0));
        break;
      }
      case 'OUTPUT_PIN': {
        setOutput(0, inVal(0));
        break;
      }
      case 'SEVEN_SEGMENT': {
        if (!comp.state) comp.state = {};
        if (comp.inputs.length >= 7) {
          // 7 individual segment terminals: a, b, c, d, e, f, g
          const isAnode = comp.state?.displayMode === 'anode';
          const litArr: boolean[] = [];
          for (let i = 0; i < 7; i++) {
            const v = inVal(i);
            // Cátodo común: 1 enciende, 0 apaga
            // Ánodo común: 0 enciende, 1 apaga
            litArr.push(isAnode ? v === 0 : v === 1);
          }
          const segLit = Object.assign(litArr, {
            a: litArr[0],
            b: litArr[1],
            c: litArr[2],
            d: litArr[3],
            e: litArr[4],
            f: litArr[5],
            g: litArr[6],
          });
          (comp.state as any).segLit = segLit;

          // Recognize alphanumeric character for CAD display readout
          const pat = segLit.map((l) => (l ? '1' : '0')).join('');
          const patterns: Record<string, { char: string; num: number }> = {
            '1111110': { char: '0', num: 0 },
            '0110000': { char: '1', num: 1 },
            '1101101': { char: '2', num: 2 },
            '1111001': { char: '3', num: 3 },
            '0110011': { char: '4', num: 4 },
            '1011011': { char: '5', num: 5 },
            '1011111': { char: '6', num: 6 },
            '1110000': { char: '7', num: 7 },
            '1111111': { char: '8', num: 8 },
            '1111011': { char: '9', num: 9 },
            '1110111': { char: 'A', num: 10 },
            '0011111': { char: 'b', num: 11 },
            '1001110': { char: 'C', num: 12 },
            '0111101': { char: 'd', num: 13 },
            '1001111': { char: 'E', num: 14 },
            '1000111': { char: 'F', num: 15 },
            '0000001': { char: '-', num: -1 },
          };
          const match = patterns[pat];
          (comp.state as any).recognizedChar = match ? match.char : '';
          comp.state.count = match ? match.num : -1;
        } else {
          // Legacy 4 binary inputs: A, B, C, D (where A=LSB, D=MSB)
          const a = inVal(0);
          const b = inVal(1);
          const c = inVal(2);
          const d = inVal(3);
          if (a === 'X' || b === 'X' || c === 'X' || d === 'X') {
            comp.state.count = -1;
          } else {
            const num = (d ? 8 : 0) + (c ? 4 : 0) + (b ? 2 : 0) + (a ? 1 : 0);
            comp.state.count = num;
          }
        }
        break;
      }
      case 'PROBE': {
        // Just passes value
        setOutput(0, inVal(0));
        break;
      }
      case 'CUSTOM_SUBCIRCUIT': {
        const subcircuitId = comp.subcircuitId;
        if (!subcircuitId) {
          comp.outputs.forEach((_, idx) => setOutput(idx, 'X'));
          break;
        }

        // Circular reference recursion guard
        if (callingStack.has(subcircuitId)) {
          warnings.push(`Referencia circular infinita detectada en el subcircuito '${comp.label || subcircuitId}'.`);
          comp.outputs.forEach((_, idx) => setOutput(idx, 'X'));
          break;
        }

        // Retrieve definition
        let def: SubcircuitDefinition | undefined;
        if (subcircuitDefs) {
          if (subcircuitDefs instanceof Map) {
            def = subcircuitDefs.get(subcircuitId);
          } else {
            def = (subcircuitDefs as Record<string, SubcircuitDefinition>)[subcircuitId];
          }
        }
        if (!def) {
          def = SubcircuitRegistry.get(subcircuitId);
        }

        if (!def) {
          warnings.push(`Definición no encontrada para el subcircuito ID: ${subcircuitId}`);
          comp.outputs.forEach((_, idx) => setOutput(idx, 'X'));
          break;
        }

        // Maintain independent internal simulation state per instance
        if (!comp.state) comp.state = {};
        if (!comp.state.subcircuitInternalState || !comp.state.subcircuitInternalState.components) {
          comp.state.subcircuitInternalState = {
            components: JSON.parse(JSON.stringify(def.components)),
            connections: JSON.parse(JSON.stringify(def.connections)),
          };
        }

        const internalComps = comp.state.subcircuitInternalState.components;
        const internalConns = comp.state.subcircuitInternalState.connections;

        // Propagate external inputs into internal circuit components
        const inputPorts = def.ports.filter((p) => p.type === 'input').sort((a, b) => a.order - b.order);
        inputPorts.forEach((port, idx) => {
          const extVal = inVal(idx);
          const targetComp = internalComps.find((c) => c.id === port.targetComponentId);
          if (targetComp) {
            if (targetComp.type === 'SWITCH') {
              targetComp.state = { ...targetComp.state, switchActive: extVal === 1 };
              if (targetComp.outputs[0]) targetComp.outputs[0].value = extVal;
            } else if (targetComp.type === 'CONSTANT_0') {
              if (targetComp.outputs[0]) targetComp.outputs[0].value = 0;
            } else if (targetComp.type === 'CONSTANT_1') {
              if (targetComp.outputs[0]) targetComp.outputs[0].value = 1;
            } else {
              const targetInputPin = targetComp.inputs.find((p) => p.id === port.targetPinId);
              if (targetInputPin) {
                targetInputPin.value = extVal;
              }
              const targetOutputPin = targetComp.outputs.find((p) => p.id === port.targetPinId);
              if (targetOutputPin) {
                targetOutputPin.value = extVal;
              }
            }
          }
        });

        // Run internal simulation with cycle protection
        const nextStack = new Set(callingStack);
        nextStack.add(subcircuitId);

        let internalStepRes = CircuitSimulator.step(
          internalComps,
          internalConns,
          isClockTick,
          subcircuitDefs,
          nextStack
        );
        // Additional settle pass for combinational propagation
        internalStepRes = CircuitSimulator.step(
          internalStepRes.components,
          internalStepRes.connections,
          false,
          subcircuitDefs,
          nextStack
        );

        comp.state.subcircuitInternalState.components = internalStepRes.components;
        comp.state.subcircuitInternalState.connections = internalStepRes.connections;

        // Collect outputs from internal circuit and set external output pins
        const outputPorts = def.ports.filter((p) => p.type === 'output').sort((a, b) => a.order - b.order);
        outputPorts.forEach((port, idx) => {
          const targetComp = internalStepRes.components.find((c) => c.id === port.targetComponentId);
          let outVal: LogicValue = 'X';
          if (targetComp) {
            if (targetComp.type === 'LED' || targetComp.type === 'OUTPUT_LED' || targetComp.type === 'OUTPUT_PIN') {
              outVal = targetComp.inputs[0]?.value ?? 'X';
            } else {
              const outPin = targetComp.outputs.find((p) => p.id === port.targetPinId) || targetComp.outputs[0];
              outVal = outPin ? outPin.value : (targetComp.inputs.find((p) => p.id === port.targetPinId)?.value ?? 'X');
            }
          }
          setOutput(idx, outVal);
        });

        break;
      }
    }

    return outputsChanged;
  }

  /**
   * Generates a complete 2^n truth table by evaluating all combinations of primary inputs.
   */
  public static generateTruthTable(
    components: CircuitComponent[],
    connections: WireConnection[]
  ): CircuitTruthTableResult {
    // 1. Detect primary inputs (switches, constants, or input pins)
    const inputCandidates = components.filter(
      (c) => c.type === 'SWITCH' || c.type === 'CONSTANT_0' || c.type === 'CONSTANT_1' || c.type === 'CLOCK'
    );

    const emptyValidation: CircuitValidationInfo = {
      unconnectedPins: [],
      hasSequentialComponents: false,
      sequentialComponentNames: [],
      hasCycle: false,
      warnings: [],
    };

    // If no switches/constants, find components with inputs that have no drivers
    if (inputCandidates.length === 0) {
      return {
        success: false,
        message: 'No se detectaron interruptores o fuentes de entrada en el circuito.',
        inputVariables: [],
        outputVariables: [],
        rows: [],
        minterms: [],
        maxterms: [],
        circuitTimestamp: Date.now(),
        validation: emptyValidation,
      };
    }

    // Sort inputs by y-position or label so 'a', 'b', 'c' appear in order
    const sortedInputs = [...inputCandidates].sort((a, b) => {
      // If labels like 'a', 'b', 'c', sort by label
      const cleanA = a.label.replace(/^Entrada\s+/i, '').trim().toLowerCase();
      const cleanB = b.label.replace(/^Entrada\s+/i, '').trim().toLowerCase();
      if (cleanA.length <= 2 && cleanB.length <= 2 && cleanA !== cleanB) {
        return cleanA.localeCompare(cleanB);
      }
      return a.y - b.y;
    });

    const inputVariables = sortedInputs.map((c) => {
      const clean = c.label.replace(/^Entrada\s+/i, '').trim();
      return clean.length > 0 && clean.length <= 4 ? clean : c.id.slice(0, 3);
    });

    // 2. Detect outputs (LED, OUTPUT_PIN, OUTPUT_LED, PROBE, or leaf gates)
    let outputCandidates = components.filter(
      (c) => c.type === 'LED' || c.type === 'OUTPUT_LED' || c.type === 'OUTPUT_PIN' || c.type === 'PROBE'
    );

    // If no explicit LED/pin, check for gates whose outputs have no connected wires
    if (outputCandidates.length === 0) {
      const drivenOutputPinKeys = new Set(connections.map((w) => `${w.fromComponentId}:${w.fromPinId}`));
      const leafGates = components.filter(
        (c) =>
          c.outputs.length > 0 &&
          !inputCandidates.some((inp) => inp.id === c.id) &&
          c.outputs.some((p) => !drivenOutputPinKeys.has(`${c.id}:${p.id}`))
      );
      if (leafGates.length > 0) {
        outputCandidates = leafGates;
      }
    }

    if (outputCandidates.length === 0) {
      return {
        success: false,
        message: 'No se detectaron salidas (indicadores LED o terminales finales) en el circuito.',
        inputVariables,
        outputVariables: [],
        rows: [],
        minterms: [],
        maxterms: [],
        circuitTimestamp: Date.now(),
        validation: emptyValidation,
      };
    }

    const outputVariables = outputCandidates.map((c) => {
      const clean = c.label.replace(/^Salida\s+/i, '').trim();
      return clean.length > 0 && clean.length <= 6 ? clean : 'F';
    });

    const N = sortedInputs.length;
    if (N > 8) {
      return {
        success: false,
        message: `El circuito tiene demasiadas entradas (${N} entradas = 2^${N} combinaciones). El límite para la tabla es de 8 entradas.`,
        inputVariables,
        outputVariables,
        rows: [],
        minterms: [],
        maxterms: [],
        circuitTimestamp: Date.now(),
        validation: emptyValidation,
      };
    }

    const totalRows = Math.pow(2, N);
    const rows: CircuitTruthTableRow[] = [];
    const minterms: number[] = [];
    const maxterms: number[] = [];

    for (let i = 0; i < totalRows; i++) {
      const bin = i.toString(2).padStart(N, '0');
      const inputRecord: Record<string, 0 | 1> = {};

      // Clone components
      const testComps: CircuitComponent[] = JSON.parse(JSON.stringify(components));
      const testConns: WireConnection[] = JSON.parse(JSON.stringify(connections));

      // Set input values according to binary pattern
      sortedInputs.forEach((inpComp, idx) => {
        const bit = parseInt(bin[idx], 10) as 0 | 1;
        inputRecord[inputVariables[idx]] = bit;

        const target = testComps.find((c) => c.id === inpComp.id);
        if (target) {
          if (target.type === 'SWITCH') {
            target.state = { ...target.state, switchActive: bit === 1 };
            if (target.outputs[0]) target.outputs[0].value = bit;
          } else if (target.outputs[0]) {
            target.outputs[0].value = bit;
          }
        }
      });

      // Relax until stable
      let evalResult: EvaluationResult = { components: testComps, connections: testConns, cycleDetected: false, warnings: [], errors: [] };
      for (let stepIdx = 0; stepIdx < 4; stepIdx++) {
        evalResult = CircuitSimulator.step(evalResult.components, evalResult.connections, false);
      }

      // Collect outputs
      const outputRecord: Record<string, LogicValue> = {};
      outputCandidates.forEach((outComp, idx) => {
        const currentOut = evalResult.components.find((c) => c.id === outComp.id);
        let val: LogicValue = 'X';
        if (currentOut) {
          if (currentOut.type === 'LED' || currentOut.type === 'OUTPUT_LED' || currentOut.type === 'OUTPUT_PIN') {
            val = currentOut.inputs[0]?.value ?? 'X';
          } else {
            val = currentOut.outputs[0]?.value ?? 'X';
          }
        }
        outputRecord[outputVariables[idx]] = val;
      });

      // Primary output logic level for minterm calculation
      const primaryOutVal = outputRecord[outputVariables[0]];
      if (primaryOutVal === 1) {
        minterms.push(i);
      } else if (primaryOutVal === 0) {
        maxterms.push(i);
      }

      rows.push({
        index: i,
        binary: bin,
        inputs: inputRecord,
        outputs: outputRecord,
        minterm: i,
      });
    }

    // Compute simplified SOP formula if possible
    let sopExpression: string | undefined;
    try {
      if (minterms.length > 0 && inputVariables.length <= 6) {
        const qmVars = inputVariables.map((v) => v.toUpperCase());
        const qm = new QuineMcCluskeyEngine(qmVars, minterms);
        const solved = qm.solve();
        sopExpression = solved.sopSimplified;
      } else if (minterms.length === 0) {
        sopExpression = '0';
      }
    } catch {
      // Non-critical fallback
    }

    // Validation diagnostics
    const unconnectedPins: { compId: string; componentId?: string; compLabel: string; pinId: string; pinName: string; pinLabel?: string }[] = [];
    const connectedInputPinKeys = new Set(connections.map((w) => `${w.toComponentId}:${w.toPinId}`));

    for (const comp of components) {
      if (comp.type === 'SWITCH' || comp.type === 'CONSTANT_0' || comp.type === 'CONSTANT_1' || comp.type === 'CLOCK') {
        continue;
      }
      for (const pin of comp.inputs) {
        const key = `${comp.id}:${pin.id}`;
        if (!connectedInputPinKeys.has(key)) {
          unconnectedPins.push({
            compId: comp.id,
            componentId: comp.id,
            compLabel: comp.label || comp.type,
            pinId: pin.id,
            pinName: pin.name,
            pinLabel: pin.label || pin.name,
          });
        }
      }
    }

    const sequentialTypes = new Set([
      'LATCH_SR',
      'SR_LATCH',
      'FLIPFLOP_D',
      'D_FLIP_FLOP',
      'FLIPFLOP_JK',
      'JK_FLIP_FLOP',
      'FLIPFLOP_T',
      'T_FLIP_FLOP',
      'COUNTER_4BIT',
      'CLOCK',
      'SHIFT_REG_4BIT',
      'IC_74LS90',
      'IC_74LS194',
    ]);
    const sequentialComps = components.filter((c) => sequentialTypes.has(c.type));
    const hasSequentialComponents = sequentialComps.length > 0;
    const sequentialComponentNames = sequentialComps.map((c) => c.label || c.type);

    const validationWarnings: string[] = [];
    if (unconnectedPins.length > 0) {
      validationWarnings.push(
        `Hay ${unconnectedPins.length} terminal(es) de entrada sin conectar (señal flotante o indeterminada X).`
      );
    }
    if (hasSequentialComponents) {
      validationWarnings.push(
        'El circuito contiene componentes secuenciales (biestables o reloj). Su respuesta depende del estado y sincronismo, no es puramente combinacional.'
      );
    }

    return {
      success: true,
      inputVariables,
      outputVariables,
      rows,
      minterms,
      maxterms,
      sopExpression,
      circuitTimestamp: Date.now(),
      unconnectedPins,
      hasSequentialComponents,
      hasCycle: false,
      validation: {
        unconnectedPins,
        hasSequentialComponents,
        sequentialComponentNames,
        hasCycle: false,
        warnings: validationWarnings,
      },
    };
  }

  /**
   * Compares the live circuit against a truth table across all 2^n combinations.
   */
  public static compareCircuitWithTable(
    components: CircuitComponent[],
    connections: WireConnection[],
    targetTable: CircuitTruthTableResult | any
  ): CircuitTableComparisonResult {
    if (!targetTable || !targetTable.rows || targetTable.rows.length === 0) {
      return {
        equivalent: false,
        totalCombinations: 0,
        matches: 0,
        matchingCombinations: 0,
        mismatches: [],
        message: 'No hay tabla de verdad para comparar.',
        inputs: [],
        outputs: [],
      };
    }

    const liveTable = CircuitSimulator.generateTruthTable(components, connections);
    if (!liveTable.success) {
      return {
        equivalent: false,
        totalCombinations: targetTable.rows.length,
        matches: 0,
        matchingCombinations: 0,
        mismatches: [],
        message: liveTable.message || 'Error al evaluar el circuito.',
        inputs: liveTable.inputVariables || [],
        outputs: liveTable.outputVariables || [],
      };
    }

    const mismatches: CircuitTableMismatch[] = [];
    let matches = 0;
    const targetOutVars = targetTable.outputVariables?.length
      ? targetTable.outputVariables
      : targetTable.outputs?.map((o: any) => o.name) ||
        Object.keys(targetTable.rows[0]?.outputs || { F: 0 });
    const primaryOut = targetOutVars[0] || 'F';
    const liveOut = liveTable.outputVariables[0] || 'F';

    targetTable.rows.forEach((targetRow: any, rowIdx: number) => {
      const rowIndex = targetRow.index !== undefined ? targetRow.index : rowIdx;
      const liveRow = liveTable.rows.find((r, rIdx) => {
        if (targetRow.index !== undefined && r.index === targetRow.index) return true;
        if (targetRow.binary && r.binary === targetRow.binary) return true;
        if (targetRow.inputs) {
          const keys = Object.keys(targetRow.inputs);
          if (keys.length > 0) {
            const matchAllInputs = keys.every((k) => {
              const cleanKey = k.toUpperCase();
              const liveKey = Object.keys(r.inputs).find((lk) => lk.toUpperCase() === cleanKey);
              return liveKey ? r.inputs[liveKey] === targetRow.inputs[k] : false;
            });
            if (matchAllInputs) return true;
          }
        }
        return rIdx === rowIdx;
      });

      const expectedVal = targetRow.outputs[primaryOut];
      const actualVal = liveRow ? liveRow.outputs[liveOut] : 'X';

      if (expectedVal === actualVal) {
        matches++;
      } else {
        mismatches.push({
          index: rowIndex,
          rowIndex: rowIndex,
          binary: targetRow.binary || liveRow?.binary || '',
          inputs: targetRow.inputs || liveRow?.inputs || {},
          outputName: primaryOut,
          expected: expectedVal,
          actual: actualVal,
          expectedRecord: targetRow.outputs,
          actualRecord: liveRow ? liveRow.outputs : { [liveOut]: 'X' },
        });
      }
    });

    const equivalent = mismatches.length === 0;
    const message = equivalent
      ? `Circuito y tabla equivalentes (100% de coincidencias en las ${targetTable.rows.length} combinaciones).`
      : `Discrepancia detectada: ${mismatches.length} de ${targetTable.rows.length} combinaciones difieren entre el circuito y la tabla.`;

    return {
      equivalent,
      totalCombinations: targetTable.rows.length,
      matches,
      matchingCombinations: matches,
      mismatches,
      message,
      inputs: liveTable.inputVariables,
      outputs: liveTable.outputVariables,
    };
  }
}
