/**
 * Automatic Circuit Generator
 * Synthesizes visual circuits from Boolean expressions, SOP/POS, or minterms
 * Supports standard AND/OR/NOT, NAND-only, and NOR-only conversions
 */

import { CircuitComponent, ComponentType, Pin, WireConnection } from '../../types';
import { BooleanParser, extractVariables } from '../boolean/evaluator';
import { QuineMcCluskeyEngine } from '../boolean/quineMcCluskey';

export type SynthesisMode = 'STANDARD' | 'NAND_ONLY' | 'NOR_ONLY';

let compCounter = 0;
function makeId(prefix: string): string {
  compCounter++;
  return `${prefix}_${Date.now()}_${compCounter}`;
}

export function createComponent(
  type: ComponentType,
  x: number,
  y: number,
  label: string,
  inputCount = 2,
  orientation: 'right' | 'down' | 'left' | 'up' = 'right'
): CircuitComponent {
  const id = makeId(type.toLowerCase());
  const inputs: Pin[] = [];
  const outputs: Pin[] = [];

  // Width & height defaults
  let width = 110;
  let height = 70;

  switch (type) {
    case 'SWITCH':
      width = 90;
      height = 50;
      outputs.push({ id: `${id}_out`, name: 'Q', type: 'output', relX: 90, relY: 25, value: 0 });
      return {
        id,
        type,
        label,
        x,
        y,
        width,
        height,
        inputs: [],
        outputs,
        state: { switchActive: false },
      };

    case 'LED':
    case 'OUTPUT_LED':
      width = 70;
      height = 70;
      inputs.push({ id: `${id}_in`, name: 'D', type: 'input', relX: 0, relY: 35, value: 'X' });
      return {
        id,
        type,
        label,
        x,
        y,
        width,
        height,
        inputs,
        outputs: [{ id: `${id}_out`, name: 'Out', type: 'output', relX: 70, relY: 35, value: 'X' }],
      };

    case 'NOT':
      if (orientation === 'down') {
        width = 50;
        height = 80;
        inputs.push({ id: `${id}_in0`, name: 'A', type: 'input', relX: 25, relY: 0, value: 'X' });
        outputs.push({ id: `${id}_out`, name: 'Y', type: 'output', relX: 25, relY: 80, value: 'X' });
      } else {
        inputs.push({ id: `${id}_in0`, name: 'A', type: 'input', relX: 0, relY: 35, value: 'X' });
        outputs.push({ id: `${id}_out`, name: 'Y', type: 'output', relX: 110, relY: 35, value: 'X' });
      }
      break;

    case 'BUFFER':
      inputs.push({ id: `${id}_in0`, name: 'A', type: 'input', relX: 0, relY: 35, value: 'X' });
      outputs.push({ id: `${id}_out`, name: 'Y', type: 'output', relX: 110, relY: 35, value: 'X' });
      break;

    case 'AND':
    case 'OR':
    case 'NAND':
    case 'NOR':
    case 'XOR':
    case 'XNOR': {
      const count = Math.max(2, Math.min(8, inputCount));
      height = Math.max(70, count * 26);
      const step = height / (count + 1);
      for (let i = 0; i < count; i++) {
        inputs.push({
          id: `${id}_in${i}`,
          name: String.fromCharCode(65 + i),
          type: 'input',
          relX: 0,
          relY: Math.round(step * (i + 1)),
          value: 'X',
        });
      }
      outputs.push({
        id: `${id}_out`,
        name: 'Y',
        type: 'output',
        relX: width,
        relY: Math.round(height / 2),
        value: 'X',
      });
      break;
    }

    // Arithmetic
    case 'HALF_ADDER':
      width = 130;
      height = 90;
      inputs.push({ id: `${id}_a`, name: 'A', type: 'input', relX: 0, relY: 28, value: 'X' });
      inputs.push({ id: `${id}_b`, name: 'B', type: 'input', relX: 0, relY: 62, value: 'X' });
      outputs.push({ id: `${id}_s`, name: 'S', type: 'output', relX: 130, relY: 28, value: 'X' });
      outputs.push({ id: `${id}_c`, name: 'C', type: 'output', relX: 130, relY: 62, value: 'X' });
      break;

    case 'FULL_ADDER':
      width = 140;
      height = 110;
      inputs.push({ id: `${id}_a`, name: 'A', type: 'input', relX: 0, relY: 25, value: 'X' });
      inputs.push({ id: `${id}_b`, name: 'B', type: 'input', relX: 0, relY: 55, value: 'X' });
      inputs.push({ id: `${id}_cin`, name: 'Cin', type: 'input', relX: 0, relY: 85, value: 'X' });
      outputs.push({ id: `${id}_s`, name: 'S', type: 'output', relX: 140, relY: 35, value: 'X' });
      outputs.push({ id: `${id}_cout`, name: 'Cout', type: 'output', relX: 140, relY: 75, value: 'X' });
      break;

    case 'HALF_SUBTRACTOR':
      width = 130;
      height = 90;
      inputs.push({ id: `${id}_a`, name: 'A', type: 'input', relX: 0, relY: 28, value: 'X' });
      inputs.push({ id: `${id}_b`, name: 'B', type: 'input', relX: 0, relY: 62, value: 'X' });
      outputs.push({ id: `${id}_d`, name: 'D', type: 'output', relX: 130, relY: 28, value: 'X' });
      outputs.push({ id: `${id}_bout`, name: 'Bout', type: 'output', relX: 130, relY: 62, value: 'X' });
      break;

    case 'FULL_SUBTRACTOR':
      width = 140;
      height = 110;
      inputs.push({ id: `${id}_a`, name: 'A', type: 'input', relX: 0, relY: 25, value: 'X' });
      inputs.push({ id: `${id}_b`, name: 'B', type: 'input', relX: 0, relY: 55, value: 'X' });
      inputs.push({ id: `${id}_bin`, name: 'Bin', type: 'input', relX: 0, relY: 85, value: 'X' });
      outputs.push({ id: `${id}_d`, name: 'D', type: 'output', relX: 140, relY: 35, value: 'X' });
      outputs.push({ id: `${id}_bout`, name: 'Bout', type: 'output', relX: 140, relY: 75, value: 'X' });
      break;

    case 'ADDER_4BIT':
      width = 170;
      height = 170;
      // 4 A pins, 4 B pins, 1 Cin
      for (let i = 0; i < 4; i++) {
        inputs.push({ id: `${id}_a${i}`, name: `A${i}`, type: 'input', relX: 0, relY: 20 + i * 18, value: 'X' });
        inputs.push({ id: `${id}_b${i}`, name: `B${i}`, type: 'input', relX: 0, relY: 96 + i * 18, value: 'X' });
      }
      inputs.push({ id: `${id}_cin`, name: 'Cin', type: 'input', relX: 85, relY: 0, value: 'X' });
      for (let i = 0; i < 4; i++) {
        outputs.push({ id: `${id}_s${i}`, name: `S${i}`, type: 'output', relX: 170, relY: 30 + i * 28, value: 'X' });
      }
      outputs.push({ id: `${id}_cout`, name: 'Cout', type: 'output', relX: 85, relY: 170, value: 'X' });
      break;

    case 'MAGNITUDE_COMP':
      width = 140;
      height = 100;
      inputs.push({ id: `${id}_a`, name: 'A', type: 'input', relX: 0, relY: 35, value: 'X' });
      inputs.push({ id: `${id}_b`, name: 'B', type: 'input', relX: 0, relY: 65, value: 'X' });
      outputs.push({ id: `${id}_gt`, name: 'A>B', type: 'output', relX: 140, relY: 25, value: 'X' });
      outputs.push({ id: `${id}_eq`, name: 'A=B', type: 'output', relX: 140, relY: 50, value: 'X' });
      outputs.push({ id: `${id}_lt`, name: 'A<B', type: 'output', relX: 140, relY: 75, value: 'X' });
      break;

    // Routing
    case 'MUX_2TO1':
      width = 130;
      height = 100;
      inputs.push({ id: `${id}_d0`, name: 'D0', type: 'input', relX: 0, relY: 25, value: 'X' });
      inputs.push({ id: `${id}_d1`, name: 'D1', type: 'input', relX: 0, relY: 55, value: 'X' });
      inputs.push({ id: `${id}_s`, name: 'S', type: 'control', relX: 65, relY: 100, value: 'X' });
      outputs.push({ id: `${id}_y`, name: 'Y', type: 'output', relX: 130, relY: 45, value: 'X' });
      break;

    case 'MUX_4TO1':
      width = 140;
      height = 140;
      for (let i = 0; i < 4; i++) {
        inputs.push({ id: `${id}_d${i}`, name: `D${i}`, type: 'input', relX: 0, relY: 20 + i * 25, value: 'X' });
      }
      inputs.push({ id: `${id}_s0`, name: 'S0', type: 'control', relX: 45, relY: 140, value: 'X' });
      inputs.push({ id: `${id}_s1`, name: 'S1', type: 'control', relX: 95, relY: 140, value: 'X' });
      outputs.push({ id: `${id}_y`, name: 'Y', type: 'output', relX: 140, relY: 65, value: 'X' });
      break;

    case 'DEMUX_1TO4':
      width = 140;
      height = 140;
      inputs.push({ id: `${id}_d`, name: 'D', type: 'input', relX: 0, relY: 65, value: 'X' });
      inputs.push({ id: `${id}_s0`, name: 'S0', type: 'control', relX: 45, relY: 140, value: 'X' });
      inputs.push({ id: `${id}_s1`, name: 'S1', type: 'control', relX: 95, relY: 140, value: 'X' });
      for (let i = 0; i < 4; i++) {
        outputs.push({ id: `${id}_y${i}`, name: `Y${i}`, type: 'output', relX: 140, relY: 20 + i * 28, value: 'X' });
      }
      break;

    case 'DECODER_2TO4':
      width = 140;
      height = 130;
      inputs.push({ id: `${id}_a0`, name: 'A0', type: 'input', relX: 0, relY: 35, value: 'X' });
      inputs.push({ id: `${id}_a1`, name: 'A1', type: 'input', relX: 0, relY: 75, value: 'X' });
      inputs.push({ id: `${id}_en`, name: 'EN', type: 'control', relX: 70, relY: 130, value: 1 });
      for (let i = 0; i < 4; i++) {
        outputs.push({ id: `${id}_y${i}`, name: `Y${i}`, type: 'output', relX: 140, relY: 20 + i * 26, value: 'X' });
      }
      break;

    case 'DECODER_3TO8':
      width = 150;
      height = 230;
      inputs.push({ id: `${id}_a0`, name: 'A0', type: 'input', relX: 0, relY: 35, value: 'X' });
      inputs.push({ id: `${id}_a1`, name: 'A1', type: 'input', relX: 0, relY: 75, value: 'X' });
      inputs.push({ id: `${id}_a2`, name: 'A2', type: 'input', relX: 0, relY: 115, value: 'X' });
      inputs.push({ id: `${id}_en`, name: 'EN', type: 'control', relX: 75, relY: 230, value: 1 });
      for (let i = 0; i < 8; i++) {
        outputs.push({ id: `${id}_y${i}`, name: `Y${i}`, type: 'output', relX: 150, relY: 20 + i * 26, value: 'X' });
      }
      break;

    case 'BCD_TO_7SEG': {
      width = 140;
      height = 180;
      // D (MSB, 8), C (4), B (2), A (LSB, 1)
      inputs.push({ id: `${id}_d`, name: 'D', type: 'input', relX: 0, relY: 30, value: 'X' });
      inputs.push({ id: `${id}_c`, name: 'C', type: 'input', relX: 0, relY: 70, value: 'X' });
      inputs.push({ id: `${id}_b`, name: 'B', type: 'input', relX: 0, relY: 110, value: 'X' });
      inputs.push({ id: `${id}_a`, name: 'A', type: 'input', relX: 0, relY: 150, value: 'X' });
      const segNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
      for (let i = 0; i < 7; i++) {
        outputs.push({ id: `${id}_${segNames[i]}`, name: segNames[i], type: 'output', relX: 140, relY: 20 + i * 23, value: 'X' });
      }
      const isAnode = label.toLowerCase().includes('ánodo') || label.toLowerCase().includes('anode');
      return {
        id,
        type,
        label,
        x,
        y,
        width,
        height,
        inputs,
        outputs,
        state: { displayMode: isAnode ? 'anode' : 'cathode', invalidBcdMode: 'BLANK' },
      };
    }

    case 'ENCODER_DECIMAL_TO_BCD':
      width = 150;
      height = 250;
      for (let i = 0; i < 10; i++) {
        inputs.push({ id: `${id}_d${i}`, name: `D${i}`, type: 'input', relX: 0, relY: 18 + i * 23, value: 0 });
      }
      outputs.push({ id: `${id}_a`, name: 'A', type: 'output', relX: 150, relY: 35, value: 0 }); // 1
      outputs.push({ id: `${id}_b`, name: 'B', type: 'output', relX: 150, relY: 75, value: 0 }); // 2
      outputs.push({ id: `${id}_c`, name: 'C', type: 'output', relX: 150, relY: 115, value: 0 }); // 4
      outputs.push({ id: `${id}_d`, name: 'D', type: 'output', relX: 150, relY: 155, value: 0 }); // 8
      outputs.push({ id: `${id}_v`, name: 'V', type: 'output', relX: 150, relY: 205, value: 0 }); // Valid
      break;

    case 'PRIORITY_ENCODER_4TO2':
      width = 140;
      height = 150;
      for (let i = 0; i < 4; i++) {
        inputs.push({ id: `${id}_i${i}`, name: `I${i}`, type: 'input', relX: 0, relY: 25 + i * 32, value: 0 });
      }
      outputs.push({ id: `${id}_y1`, name: 'Y1', type: 'output', relX: 140, relY: 35, value: 0 }); // MSB
      outputs.push({ id: `${id}_y0`, name: 'Y0', type: 'output', relX: 140, relY: 75, value: 0 }); // LSB
      outputs.push({ id: `${id}_v`, name: 'V', type: 'output', relX: 140, relY: 115, value: 0 }); // Valid
      break;

    case 'PRIORITY_ENCODER_8TO3':
      width = 150;
      height = 230;
      for (let i = 0; i < 8; i++) {
        inputs.push({ id: `${id}_i${i}`, name: `I${i}`, type: 'input', relX: 0, relY: 18 + i * 26, value: 0 });
      }
      outputs.push({ id: `${id}_y2`, name: 'Y2', type: 'output', relX: 150, relY: 35, value: 0 }); // MSB
      outputs.push({ id: `${id}_y1`, name: 'Y1', type: 'output', relX: 150, relY: 75, value: 0 });
      outputs.push({ id: `${id}_y0`, name: 'Y0', type: 'output', relX: 150, relY: 115, value: 0 }); // LSB
      outputs.push({ id: `${id}_v`, name: 'V', type: 'output', relX: 150, relY: 175, value: 0 }); // Valid
      break;

    // Sequential
    case 'LATCH_SR':
      width = 130;
      height = 90;
      inputs.push({ id: `${id}_s`, name: 'S', type: 'input', relX: 0, relY: 28, value: 'X' });
      inputs.push({ id: `${id}_r`, name: 'R', type: 'input', relX: 0, relY: 62, value: 'X' });
      outputs.push({ id: `${id}_q`, name: 'Q', type: 'output', relX: 130, relY: 28, value: 0 });
      outputs.push({ id: `${id}_qbar`, name: "Q'", type: 'output', relX: 130, relY: 62, value: 1 });
      break;

    case 'FLIPFLOP_D':
      width = 130;
      height = 100;
      inputs.push({ id: `${id}_d`, name: 'D', type: 'input', relX: 0, relY: 30, value: 'X' });
      inputs.push({ id: `${id}_clk`, name: 'CLK', type: 'clock', relX: 0, relY: 70, value: 0 });
      inputs.push({ id: `${id}_pre`, name: '~PRE', type: 'input', relX: 65, relY: 0, value: 1 });
      inputs.push({ id: `${id}_clr`, name: '~CLR', type: 'input', relX: 65, relY: 100, value: 1 });
      outputs.push({ id: `${id}_q`, name: 'Q', type: 'output', relX: 130, relY: 30, value: 0 });
      outputs.push({ id: `${id}_qbar`, name: "Q'", type: 'output', relX: 130, relY: 70, value: 1 });
      return {
        id,
        type,
        label,
        x,
        y,
        width,
        height,
        inputs,
        outputs,
        state: { q: 0, qBar: 1, clockPrev: 0 },
      };

    case 'FLIPFLOP_JK':
      width = 130;
      height = 110;
      inputs.push({ id: `${id}_j`, name: 'J', type: 'input', relX: 0, relY: 25, value: 'X' });
      inputs.push({ id: `${id}_clk`, name: 'CLK', type: 'clock', relX: 0, relY: 55, value: 0 });
      inputs.push({ id: `${id}_k`, name: 'K', type: 'input', relX: 0, relY: 85, value: 'X' });
      inputs.push({ id: `${id}_pre`, name: '~PRE', type: 'input', relX: 65, relY: 0, value: 1 });
      inputs.push({ id: `${id}_clr`, name: '~CLR', type: 'input', relX: 65, relY: 110, value: 1 });
      outputs.push({ id: `${id}_q`, name: 'Q', type: 'output', relX: 130, relY: 30, value: 0 });
      outputs.push({ id: `${id}_qbar`, name: "Q'", type: 'output', relX: 130, relY: 80, value: 1 });
      return {
        id,
        type,
        label,
        x,
        y,
        width,
        height,
        inputs,
        outputs,
        state: { q: 0, qBar: 1, clockPrev: 0 },
      };

    case 'FLIPFLOP_T':
      width = 130;
      height = 100;
      inputs.push({ id: `${id}_t`, name: 'T', type: 'input', relX: 0, relY: 30, value: 'X' });
      inputs.push({ id: `${id}_clk`, name: 'CLK', type: 'clock', relX: 0, relY: 70, value: 0 });
      outputs.push({ id: `${id}_q`, name: 'Q', type: 'output', relX: 130, relY: 30, value: 0 });
      outputs.push({ id: `${id}_qbar`, name: "Q'", type: 'output', relX: 130, relY: 70, value: 1 });
      break;

    case 'COUNTER_4BIT':
      width = 150;
      height = 150;
      inputs.push({ id: `${id}_clk`, name: 'CLK', type: 'clock', relX: 0, relY: 40, value: 0 });
      inputs.push({ id: `${id}_rst`, name: 'RST', type: 'input', relX: 0, relY: 80, value: 0 });
      inputs.push({ id: `${id}_dir`, name: 'DIR', type: 'control', relX: 0, relY: 120, value: 1 });
      for (let i = 0; i < 4; i++) {
        outputs.push({ id: `${id}_q${i}`, name: `Q${i}`, type: 'output', relX: 150, relY: 25 + i * 28, value: 0 });
      }
      outputs.push({ id: `${id}_rco`, name: 'RCO', type: 'output', relX: 150, relY: 135, value: 0 });
      break;

    // MSI 74xx Standard ICs
    case 'IC_74LS90':
      width = 160;
      height = 210;
      // Inputs: CLK A, CLK B, R0(1), R0(2), R9(1), R9(2)
      inputs.push({ id: `${id}_clka`, name: 'CLK A', type: 'clock', relX: 0, relY: 28, value: 0 });
      inputs.push({ id: `${id}_clkb`, name: 'CLK B', type: 'clock', relX: 0, relY: 62, value: 0 });
      inputs.push({ id: `${id}_r01`, name: 'R0(1)', type: 'input', relX: 0, relY: 96, value: 0 });
      inputs.push({ id: `${id}_r02`, name: 'R0(2)', type: 'input', relX: 0, relY: 126, value: 0 });
      inputs.push({ id: `${id}_r91`, name: 'R9(1)', type: 'input', relX: 0, relY: 156, value: 0 });
      inputs.push({ id: `${id}_r92`, name: 'R9(2)', type: 'input', relX: 0, relY: 186, value: 0 });
      // Outputs: QA (div-2), QB, QC, QD (div-5)
      outputs.push({ id: `${id}_qa`, name: 'QA', type: 'output', relX: 160, relY: 36, value: 0 });
      outputs.push({ id: `${id}_qb`, name: 'QB', type: 'output', relX: 160, relY: 78, value: 0 });
      outputs.push({ id: `${id}_qc`, name: 'QC', type: 'output', relX: 160, relY: 120, value: 0 });
      outputs.push({ id: `${id}_qd`, name: 'QD', type: 'output', relX: 160, relY: 162, value: 0 });
      return {
        id,
        type,
        label: label || '74LS90 Contador BCD',
        x,
        y,
        width,
        height,
        inputs,
        outputs,
        state: { countA: 0, countBCD: 0, clockPrevA: 0, clockPrevB: 0 },
      };

    case 'IC_74LS194':
      width = 160;
      height = 260;
      // Inputs: ~CLR, CLK, S0, S1, SR, SL, D0..D3
      inputs.push({ id: `${id}_clr`, name: '~CLR', type: 'input', relX: 0, relY: 20, value: 1 });
      inputs.push({ id: `${id}_clk`, name: 'CLK', type: 'clock', relX: 0, relY: 44, value: 0 });
      inputs.push({ id: `${id}_s0`, name: 'S0', type: 'control', relX: 0, relY: 68, value: 0 });
      inputs.push({ id: `${id}_s1`, name: 'S1', type: 'control', relX: 0, relY: 92, value: 0 });
      inputs.push({ id: `${id}_sr`, name: 'SR', type: 'input', relX: 0, relY: 116, value: 0 });
      inputs.push({ id: `${id}_sl`, name: 'SL', type: 'input', relX: 0, relY: 140, value: 0 });
      inputs.push({ id: `${id}_d0`, name: 'D0', type: 'input', relX: 0, relY: 164, value: 0 });
      inputs.push({ id: `${id}_d1`, name: 'D1', type: 'input', relX: 0, relY: 188, value: 0 });
      inputs.push({ id: `${id}_d2`, name: 'D2', type: 'input', relX: 0, relY: 212, value: 0 });
      inputs.push({ id: `${id}_d3`, name: 'D3', type: 'input', relX: 0, relY: 236, value: 0 });
      // Outputs: Q0..Q3
      outputs.push({ id: `${id}_q0`, name: 'Q0', type: 'output', relX: 160, relY: 40, value: 0 });
      outputs.push({ id: `${id}_q1`, name: 'Q1', type: 'output', relX: 160, relY: 90, value: 0 });
      outputs.push({ id: `${id}_q2`, name: 'Q2', type: 'output', relX: 160, relY: 140, value: 0 });
      outputs.push({ id: `${id}_q3`, name: 'Q3', type: 'output', relX: 160, relY: 190, value: 0 });
      return {
        id,
        type,
        label: label || '74LS194 Registro 4B',
        x,
        y,
        width,
        height,
        inputs,
        outputs,
        state: { shiftBits: [0, 0, 0, 0], clockPrev: 0 },
      };

    case 'IC_74LS85':
      width = 160;
      height = 260;
      // Inputs: A3..A0, B3..B0, I_A>B, I_A=B, I_A<B
      inputs.push({ id: `${id}_a3`, name: 'A3', type: 'input', relX: 0, relY: 20, value: 0 });
      inputs.push({ id: `${id}_a2`, name: 'A2', type: 'input', relX: 0, relY: 42, value: 0 });
      inputs.push({ id: `${id}_a1`, name: 'A1', type: 'input', relX: 0, relY: 64, value: 0 });
      inputs.push({ id: `${id}_a0`, name: 'A0', type: 'input', relX: 0, relY: 86, value: 0 });
      inputs.push({ id: `${id}_b3`, name: 'B3', type: 'input', relX: 0, relY: 108, value: 0 });
      inputs.push({ id: `${id}_b2`, name: 'B2', type: 'input', relX: 0, relY: 130, value: 0 });
      inputs.push({ id: `${id}_b1`, name: 'B1', type: 'input', relX: 0, relY: 152, value: 0 });
      inputs.push({ id: `${id}_b0`, name: 'B0', type: 'input', relX: 0, relY: 174, value: 0 });
      inputs.push({ id: `${id}_igt`, name: 'I_A>B', type: 'input', relX: 0, relY: 196, value: 0 });
      inputs.push({ id: `${id}_ieq`, name: 'I_A=B', type: 'input', relX: 0, relY: 218, value: 1 });
      inputs.push({ id: `${id}_ilt`, name: 'I_A<B', type: 'input', relX: 0, relY: 240, value: 0 });
      // Outputs: A>B, A=B, A<B
      outputs.push({ id: `${id}_outgt`, name: 'A>B', type: 'output', relX: 160, relY: 60, value: 0 });
      outputs.push({ id: `${id}_outeq`, name: 'A=B', type: 'output', relX: 160, relY: 130, value: 1 });
      outputs.push({ id: `${id}_outlt`, name: 'A<B', type: 'output', relX: 160, relY: 200, value: 0 });
      return {
        id,
        type,
        label: label || '74LS85 Comparador 4B',
        x,
        y,
        width,
        height,
        inputs,
        outputs,
      };

    case 'IC_74LS151':
      width = 160;
      height = 280;
      // Inputs: D0..D7, S0, S1, S2, ~E
      for (let i = 0; i < 8; i++) {
        inputs.push({ id: `${id}_d${i}`, name: `D${i}`, type: 'input', relX: 0, relY: 18 + i * 22, value: 0 });
      }
      inputs.push({ id: `${id}_s0`, name: 'S0', type: 'control', relX: 0, relY: 198, value: 0 });
      inputs.push({ id: `${id}_s1`, name: 'S1', type: 'control', relX: 0, relY: 220, value: 0 });
      inputs.push({ id: `${id}_s2`, name: 'S2', type: 'control', relX: 0, relY: 242, value: 0 });
      inputs.push({ id: `${id}_en`, name: '~E', type: 'control', relX: 0, relY: 264, value: 0 });
      // Outputs: Y (data), ~W (inverted data)
      outputs.push({ id: `${id}_y`, name: 'Y', type: 'output', relX: 160, relY: 90, value: 0 });
      outputs.push({ id: `${id}_w`, name: '~W', type: 'output', relX: 160, relY: 170, value: 1 });
      return {
        id,
        type,
        label: label || '74LS151 MUX 8:1',
        x,
        y,
        width,
        height,
        inputs,
        outputs,
      };

    // Peripherals
    case 'CONSTANT_0':
      width = 80;
      height = 40;
      outputs.push({ id: `${id}_out`, name: '0', type: 'output', relX: 80, relY: 20, value: 0 });
      break;

    case 'CONSTANT_1':
      width = 80;
      height = 40;
      outputs.push({ id: `${id}_out`, name: '1', type: 'output', relX: 80, relY: 20, value: 1 });
      break;

    case 'CLOCK':
      width = 100;
      height = 60;
      outputs.push({ id: `${id}_out`, name: 'CLK', type: 'output', relX: 100, relY: 30, value: 0 });
      break;

    case 'SEVEN_SEGMENT': {
      width = 140;
      height = 180;
      const segNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
      for (let i = 0; i < 7; i++) {
        inputs.push({ id: `${id}_${segNames[i]}`, name: segNames[i], type: 'input', relX: 0, relY: 20 + i * 23, value: 0 });
      }
      const isAnode = label.toLowerCase().includes('ánodo') || label.toLowerCase().includes('anode');
      return {
        id,
        type,
        label,
        x,
        y,
        width,
        height,
        inputs,
        outputs: [],
        state: { displayMode: isAnode ? 'anode' : 'cathode' },
      };
    }

    case 'LED':
    case 'OUTPUT_LED':
    case 'OUTPUT_PIN':
      width = 70;
      height = 50;
      inputs.push({ id: `${id}_in`, name: 'In', type: 'input', relX: 0, relY: 25, value: 'X' });
      break;

    case 'CUSTOM_SUBCIRCUIT':
      width = 140;
      height = 90;
      inputs.push(
        { id: `${id}_in_0`, name: 'In0', type: 'input', relX: 0, relY: 30, value: 'X' },
        { id: `${id}_in_1`, name: 'In1', type: 'input', relX: 0, relY: 60, value: 'X' }
      );
      outputs.push(
        { id: `${id}_out_0`, name: 'Out0', type: 'output', relX: width, relY: 45, value: 'X' }
      );
      break;

    default:
      inputs.push({ id: `${id}_in`, name: 'In', type: 'input', relX: 0, relY: 30, value: 'X' });
      outputs.push({ id: `${id}_out`, name: 'Out', type: 'output', relX: width, relY: 30, value: 'X' });
  }

  return {
    id,
    type,
    label,
    x,
    y,
    width,
    height,
    inputs,
    outputs,
    inputCount: type.match(/^(AND|OR|NAND|NOR)$/) ? inputCount : undefined,
    orientation,
  };
}

export class CircuitGenerator {
  /**
   * Generates a minimal circuit from truth table minterms using Quine-McCluskey minimization
   */
  public static fromTruthTable(
    variables: string[],
    minterms: number[],
    dontCares: number[] = [],
    mode: SynthesisMode = 'STANDARD'
  ): { components: CircuitComponent[]; connections: WireConnection[]; expression: string } {
    const qmVars = variables.map((v) => v.toUpperCase());
    const qm = new QuineMcCluskeyEngine(qmVars, minterms, dontCares);
    const solved = qm.solve();
    const expression = solved.sopSimplified || '0';
    const { components, connections } = CircuitGenerator.fromExpression(expression, mode);
    return { components, connections, expression };
  }

  /**
   * Generates a fully laid out circuit from a boolean expression string or SOP function
   */
  public static fromExpression(
    expression: string,
    mode: SynthesisMode = 'STANDARD'
  ): { components: CircuitComponent[]; connections: WireConnection[] } {
    const components: CircuitComponent[] = [];
    const connections: WireConnection[] = [];

    // Parse expression to find variables
    const parser = new BooleanParser(expression);
    const ast = parser.parse();
    const variables = extractVariables(ast);

    if (variables.length === 0) {
      // Constant function 0 or 1
      const constVal = expression.trim() === '1' ? 'CONSTANT_1' : 'CONSTANT_0';
      const c = createComponent(constVal, 100, 200, expression.trim() === '1' ? 'VCC' : 'GND');
      const led = createComponent('LED', 300, 185, 'Salida');
      components.push(c, led);
      connections.push({
        id: makeId('wire'),
        fromComponentId: c.id,
        fromPinId: c.outputs[0].id,
        toComponentId: led.id,
        toPinId: led.inputs[0].id,
        value: 0,
      });
      return { components, connections };
    }

    // Solve exact minimal SOP using Quine-McCluskey
    // Sample truth table to get minterms
    const totalCombos = Math.pow(2, variables.length);
    const minterms: number[] = [];
    for (let i = 0; i < totalCombos; i++) {
      const bin = i.toString(2).padStart(variables.length, '0');
      const testVals: Record<string, 0 | 1> = {};
      variables.forEach((v, idx) => {
        testVals[v] = parseInt(bin[idx], 10) as 0 | 1;
      });
      const parserTest = new BooleanParser(expression);
      const testAst = parserTest.parse();
      const val = evaluateTest(testAst, testVals);
      if (val === 1) minterms.push(i);
    }

    const qm = new QuineMcCluskeyEngine(variables, minterms);
    const qmResult = qm.solve();
    const coveredPIs = qmResult.primeImplicants.filter((p) => p.covered);

    // Layout configuration
    const colInputsX = 60;
    const colInvertersX = 220;
    const colAndGatesX = 400;
    const colOrGateX = 640;
    const colOutputX = 820;

    let startY = 80;
    const varCompMap: Record<string, { switchComp: CircuitComponent; notComp?: CircuitComponent }> = {};

    // 1. Column of Input Switches & Inverters
    variables.forEach((varName, idx) => {
      const switchComp = createComponent('SWITCH', colInputsX, startY + idx * 80, `Entrada ${varName}`);
      components.push(switchComp);

      // Check if inverted variable is needed
      const needsNot = mode === 'NOR_ONLY'
        ? coveredPIs.some((pi) => pi.binary[idx] === '1')
        : coveredPIs.some((pi) => pi.binary[idx] === '0');

      let notComp: CircuitComponent | undefined;

      if (needsNot) {
        const notGateType: ComponentType = mode === 'NAND_ONLY' ? 'NAND' : mode === 'NOR_ONLY' ? 'NOR' : 'NOT';
        const inputCount = notGateType === 'NOT' ? 1 : 2;
        notComp = createComponent(notGateType, colInvertersX, startY + idx * 80, `${notGateType} ${varName}`, inputCount);
        components.push(notComp);
        notComp.inputs.forEach((pin) => {
          connections.push({
            id: makeId('wire'),
            fromComponentId: switchComp.id,
            fromPinId: switchComp.outputs[0].id,
            toComponentId: notComp!.id,
            toPinId: pin.id,
            value: 0,
          });
        });
      }

      varCompMap[varName] = { switchComp, notComp };
    });

    // Special case: 0 terms (always 0) or 1 term with tautology
    if (coveredPIs.length === 0) {
      const led = createComponent('LED', colOutputX, 120, 'F = 0');
      components.push(led);
      return { components, connections };
    }

    // 2. Column of AND / Product Gates (one per product term)
    const andGates: CircuitComponent[] = [];
    const andGateSpacing = Math.max(90, Math.floor(400 / coveredPIs.length));

    coveredPIs.forEach((pi, pIdx) => {
      // Find required inputs for this product term
      const literals: { varName: string; inverted: boolean }[] = [];
      for (let i = 0; i < pi.binary.length; i++) {
        if (pi.binary[i] === '1') literals.push({ varName: variables[i], inverted: false });
        else if (pi.binary[i] === '0') literals.push({ varName: variables[i], inverted: true });
      }

      const gateType: ComponentType = mode === 'NAND_ONLY' ? 'NAND' : mode === 'NOR_ONLY' ? 'NOR' : 'AND';
      const andComp = createComponent(
        gateType,
        colAndGatesX,
        startY + pIdx * andGateSpacing,
        `Término ${pIdx + 1}`,
        Math.max(2, literals.length)
      );
      components.push(andComp);
      andGates.push(andComp);

      // Connect literals
      literals.forEach((lit, litIdx) => {
        const pinIn = andComp.inputs[litIdx];
        if (!pinIn) return;

        const src = varCompMap[lit.varName];
        if (mode === 'NOR_ONLY') {
          // In NOR_ONLY, un-inverted literal needs inverted variable (from notComp)
          const sourceComp = lit.inverted ? src.switchComp : src.notComp;
          if (sourceComp) {
            connections.push({
              id: makeId('wire'),
              fromComponentId: sourceComp.id,
              fromPinId: sourceComp.outputs[0].id,
              toComponentId: andComp.id,
              toPinId: pinIn.id,
              value: 0,
            });
          }
        } else {
          if (lit.inverted && src.notComp) {
            connections.push({
              id: makeId('wire'),
              fromComponentId: src.notComp.id,
              fromPinId: src.notComp.outputs[0].id,
              toComponentId: andComp.id,
              toPinId: pinIn.id,
              value: 0,
            });
          } else {
            connections.push({
              id: makeId('wire'),
              fromComponentId: src.switchComp.id,
              fromPinId: src.switchComp.outputs[0].id,
              toComponentId: andComp.id,
              toPinId: pinIn.id,
              value: 0,
            });
          }
        }
      });
    });

    // 3. Final OR / Combining Gate
    let finalSourceId = andGates[0].id;
    let finalPinId = andGates[0].outputs[0].id;

    if (andGates.length > 1) {
      const orGateType: ComponentType = mode === 'NAND_ONLY' ? 'NAND' : mode === 'NOR_ONLY' ? 'NOR' : 'OR';
      const orY = Math.round(startY + ((andGates.length - 1) * andGateSpacing) / 2);
      const orComp = createComponent(orGateType, colOrGateX, orY, 'Suma', andGates.length);
      components.push(orComp);

      andGates.forEach((andG, idx) => {
        const pinIn = orComp.inputs[idx];
        if (pinIn) {
          connections.push({
            id: makeId('wire'),
            fromComponentId: andG.id,
            fromPinId: andG.outputs[0].id,
            toComponentId: orComp.id,
            toPinId: pinIn.id,
            value: 0,
          });
        }
      });

      if (mode === 'NOR_ONLY') {
        const finalInverter = createComponent('NOR', colOrGateX + 110, orY, 'NOR Inversor', 2);
        components.push(finalInverter);
        finalInverter.inputs.forEach((pin) => {
          connections.push({
            id: makeId('wire'),
            fromComponentId: orComp.id,
            fromPinId: orComp.outputs[0].id,
            toComponentId: finalInverter.id,
            toPinId: pin.id,
            value: 0,
          });
        });
        finalSourceId = finalInverter.id;
        finalPinId = finalInverter.outputs[0].id;
      } else {
        finalSourceId = orComp.id;
        finalPinId = orComp.outputs[0].id;
      }
    } else if (mode === 'NAND_ONLY') {
      const orY = startY;
      const finalInverter = createComponent('NAND', colOrGateX, orY, 'NAND Inversor', 2);
      components.push(finalInverter);
      finalInverter.inputs.forEach((pin) => {
        connections.push({
          id: makeId('wire'),
          fromComponentId: andGates[0].id,
          fromPinId: andGates[0].outputs[0].id,
          toComponentId: finalInverter.id,
          toPinId: pin.id,
          value: 0,
        });
      });
      finalSourceId = finalInverter.id;
      finalPinId = finalInverter.outputs[0].id;
    }

    // 4. Output LED
    const ledY = Math.round(startY + ((andGates.length - 1) * andGateSpacing) / 2);
    const ledComp = createComponent('OUTPUT_LED', colOutputX, ledY, 'Salida F');
    components.push(ledComp);
    connections.push({
      id: makeId('wire'),
      fromComponentId: finalSourceId,
      fromPinId: finalPinId,
      toComponentId: ledComp.id,
      toPinId: ledComp.inputs[0].id,
      value: 0,
    });

    return { components, connections };
  }
}

function evaluateTest(node: any, values: Record<string, 0 | 1>): 0 | 1 {
  switch (node.type) {
    case 'CONST': return node.value;
    case 'VAR': return values[node.name] ?? 0;
    case 'NOT': return evaluateTest(node.child, values) === 1 ? 0 : 1;
    case 'AND': return (evaluateTest(node.left, values) === 1 && evaluateTest(node.right, values) === 1) ? 1 : 0;
    case 'OR': return (evaluateTest(node.left, values) === 1 || evaluateTest(node.right, values) === 1) ? 1 : 0;
    case 'XOR': return (evaluateTest(node.left, values) !== evaluateTest(node.right, values)) ? 1 : 0;
    case 'NAND': return !(evaluateTest(node.left, values) === 1 && evaluateTest(node.right, values) === 1) ? 1 : 0;
    case 'NOR': return !(evaluateTest(node.left, values) === 1 || evaluateTest(node.right, values) === 1) ? 1 : 0;
    case 'XNOR': return (evaluateTest(node.left, values) === evaluateTest(node.right, values)) ? 1 : 0;
    default: return 0;
  }
}
