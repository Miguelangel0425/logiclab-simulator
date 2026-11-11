/**
 * Pre-built Educational & Engineering Reference Circuits
 */

import { CircuitComponent, WireConnection } from '../../types';
import { createComponent } from './generator';
import { SubcircuitRegistry } from './subcircuitRegistry';

export interface CircuitPreset {
  id: string;
  name: string;
  category: 'Aritmética' | 'Combinacional' | 'Secuencial' | 'Demostración';
  description: string;
  build: () => { components: CircuitComponent[]; connections: WireConnection[] };
}

export const CIRCUIT_PRESETS: CircuitPreset[] = [
  {
    id: 'reference_nand_circuit',
    name: 'Circuito de Referencia: Lógica NAND Multinivel',
    category: 'Combinacional',
    description: 'Circuito complejo con compuertas NAND de 2 y 3 entradas, inversores vertical y horizontal, uniones en T con puntos de soldadura (•) y cruces de cables sin conexión.',
    build: () => {
      // 3 Binary inputs
      const swA = createComponent('SWITCH', 60, 90, 'a');
      const swB = createComponent('SWITCH', 60, 190, 'b');
      const swC = createComponent('SWITCH', 60, 290, 'c');

      // Top NAND gate (2 inputs: a, b)
      const nand1 = createComponent('NAND', 340, 80, 'NAND 1 (a·b)', 2);

      // Vertical Inverter (NOT a, pointing downward)
      const not1 = createComponent('NOT', 230, 170, 'NOT a', 2, 'down');

      // Middle NAND gate (2 inputs: NOT a, c)
      const nand2 = createComponent('NAND', 340, 270, 'NAND 2 (a̅·c)', 2);

      // Horizontal Inverter (NOT b, pointing right)
      const not2 = createComponent('NOT', 340, 420, 'NOT b', 2, 'right');

      // 3-Input NAND gate (combines outputs of nand1, nand2, not2)
      const nand3 = createComponent('NAND', 580, 250, 'NAND 3 (Salida F)', 3);

      // Output LED indicator
      const ledF = createComponent('LED', 740, 256, 'F = b + a̅c');

      const connections: WireConnection[] = [
        // 1. Input 'a' to NAND 1 input 1 (top pin)
        {
          id: 'w_a_nand1',
          fromComponentId: swA.id,
          fromPinId: swA.outputs[0].id,
          toComponentId: nand1.id,
          toPinId: nand1.inputs[0].id,
          value: 0,
        },
        // 2. Branch from 'a' into vertical Inverter NOT 1 (T-junction with solder dot at x=255, y=115)
        {
          id: 'w_a_branch_not1',
          fromComponentId: swA.id,
          fromPinId: swA.outputs[0].id,
          toComponentId: not1.id,
          toPinId: not1.inputs[0].id,
          value: 0,
          branchPoint: { x: 255, y: 115 },
          waypoints: [{ x: 255, y: 115 }],
        },
        // 3. Input 'b' to NAND 1 input 2 (bottom pin)
        {
          id: 'w_b_nand1',
          fromComponentId: swB.id,
          fromPinId: swB.outputs[0].id,
          toComponentId: nand1.id,
          toPinId: nand1.inputs[1].id,
          value: 0,
          waypoints: [{ x: 200, y: 215 }, { x: 200, y: 127 }],
        },
        // 4. Branch from 'b' into horizontal Inverter NOT 2 (T-junction with solder dot at x=180, y=215)
        {
          id: 'w_b_branch_not2',
          fromComponentId: swB.id,
          fromPinId: swB.outputs[0].id,
          toComponentId: not2.id,
          toPinId: not2.inputs[0].id,
          value: 0,
          branchPoint: { x: 180, y: 215 },
          waypoints: [{ x: 180, y: 215 }, { x: 180, y: 455 }],
        },
        // 5. Input 'c' to NAND 2 input 2 (bottom pin) - CROSSES wire 4 at (180, 315) WITHOUT connection
        {
          id: 'w_c_nand2',
          fromComponentId: swC.id,
          fromPinId: swC.outputs[0].id,
          toComponentId: nand2.id,
          toPinId: nand2.inputs[1].id,
          value: 0,
          waypoints: [{ x: 200, y: 315 }, { x: 200, y: 317 }],
        },
        // 6. NOT 1 output to NAND 2 input 1 (top pin)
        {
          id: 'w_not1_nand2',
          fromComponentId: not1.id,
          fromPinId: not1.outputs[0].id,
          toComponentId: nand2.id,
          toPinId: nand2.inputs[0].id,
          value: 1,
          waypoints: [{ x: 255, y: 293 }],
        },
        // 7. NAND 1 output to NAND 3 input 1 (top pin)
        {
          id: 'w_nand1_nand3',
          fromComponentId: nand1.id,
          fromPinId: nand1.outputs[0].id,
          toComponentId: nand3.id,
          toPinId: nand3.inputs[0].id,
          value: 1,
          waypoints: [{ x: 530, y: 115 }, { x: 530, y: 271 }],
        },
        // 8. NAND 2 output to NAND 3 input 2 (middle pin)
        {
          id: 'w_nand2_nand3',
          fromComponentId: nand2.id,
          fromPinId: nand2.outputs[0].id,
          toComponentId: nand3.id,
          toPinId: nand3.inputs[1].id,
          value: 1,
          waypoints: [{ x: 540, y: 305 }, { x: 540, y: 291 }],
        },
        // 9. NOT 2 output to NAND 3 input 3 (bottom pin)
        {
          id: 'w_not2_nand3',
          fromComponentId: not2.id,
          fromPinId: not2.outputs[0].id,
          toComponentId: nand3.id,
          toPinId: nand3.inputs[2].id,
          value: 1,
          waypoints: [{ x: 530, y: 455 }, { x: 530, y: 312 }],
        },
        // 10. NAND 3 output to LED F
        {
          id: 'w_nand3_led',
          fromComponentId: nand3.id,
          fromPinId: nand3.outputs[0].id,
          toComponentId: ledF.id,
          toPinId: ledF.inputs[0].id,
          value: 0,
        },
      ];

      return {
        components: [swA, swB, swC, nand1, not1, nand2, not2, nand3, ledF],
        connections,
      };
    },
  },
  {
    id: 'testbench_gates',
    name: 'Banco de Pruebas: AND, OR, NOT, XOR',
    category: 'Demostración',
    description: 'Circuito interactivo completo para verificar las 4 combinaciones lógicas de AND, OR, NOT y XOR simultáneamente.',
    build: () => {
      const swA = createComponent('SWITCH', 60, 120, 'Entrada A');
      const swB = createComponent('SWITCH', 60, 280, 'Entrada B');

      const andGate = createComponent('AND', 260, 60, 'Compuerta AND');
      const orGate = createComponent('OR', 260, 160, 'Compuerta OR');
      const notGate = createComponent('NOT', 260, 260, 'Inversor NOT A');
      const xorGate = createComponent('XOR', 260, 360, 'Compuerta XOR');

      const ledAnd = createComponent('LED', 460, 50, 'Y_AND (A · B)');
      const ledOr = createComponent('LED', 460, 150, 'Y_OR (A + B)');
      const ledNot = createComponent('LED', 460, 250, "Y_NOT (A')");
      const ledXor = createComponent('LED', 460, 350, 'Y_XOR (A ⊕ B)');

      const connections: WireConnection[] = [
        // Inputs to AND
        { id: 'w_and_a', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: andGate.id, toPinId: andGate.inputs[0].id, value: 0 },
        { id: 'w_and_b', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: andGate.id, toPinId: andGate.inputs[1].id, value: 0 },
        { id: 'w_and_out', fromComponentId: andGate.id, fromPinId: andGate.outputs[0].id, toComponentId: ledAnd.id, toPinId: ledAnd.inputs[0].id, value: 0 },

        // Inputs to OR
        { id: 'w_or_a', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: orGate.id, toPinId: orGate.inputs[0].id, value: 0 },
        { id: 'w_or_b', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: orGate.id, toPinId: orGate.inputs[1].id, value: 0 },
        { id: 'w_or_out', fromComponentId: orGate.id, fromPinId: orGate.outputs[0].id, toComponentId: ledOr.id, toPinId: ledOr.inputs[0].id, value: 0 },

        // Inputs to NOT (from A)
        { id: 'w_not_a', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: notGate.id, toPinId: notGate.inputs[0].id, value: 0 },
        { id: 'w_not_out', fromComponentId: notGate.id, fromPinId: notGate.outputs[0].id, toComponentId: ledNot.id, toPinId: ledNot.inputs[0].id, value: 1 },

        // Inputs to XOR
        { id: 'w_xor_a', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: xorGate.id, toPinId: xorGate.inputs[0].id, value: 0 },
        { id: 'w_xor_b', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: xorGate.id, toPinId: xorGate.inputs[1].id, value: 0 },
        { id: 'w_xor_out', fromComponentId: xorGate.id, fromPinId: xorGate.outputs[0].id, toComponentId: ledXor.id, toPinId: ledXor.inputs[0].id, value: 0 },
      ];

      return {
        components: [swA, swB, andGate, orGate, notGate, xorGate, ledAnd, ledOr, ledNot, ledXor],
        connections,
      };
    },
  },
  {
    id: 'half_adder_gates',
    name: 'Semisumador con Compuertas (XOR + AND)',
    category: 'Aritmética',
    description: 'Semisumador elemental a nivel de compuertas: Suma S = A ⊕ B (XOR) y Acarreo C = A · B (AND).',
    build: () => {
      const swA = createComponent('SWITCH', 60, 80, 'A');
      const swB = createComponent('SWITCH', 60, 200, 'B');
      const xorGate = createComponent('XOR', 280, 80, 'XOR (Suma S)', 2);
      const andGate = createComponent('AND', 280, 200, 'AND (Acarreo C)', 2);
      const ledS = createComponent('LED', 500, 90, 'S (Suma)');
      const ledC = createComponent('LED', 500, 210, 'C (Acarreo)');

      const connections: WireConnection[] = [
        { id: 'w_a_xor', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: xorGate.id, toPinId: xorGate.inputs[0].id, value: 0 },
        { id: 'w_a_and', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: andGate.id, toPinId: andGate.inputs[0].id, value: 0 },
        { id: 'w_b_xor', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: xorGate.id, toPinId: xorGate.inputs[1].id, value: 0 },
        { id: 'w_b_and', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: andGate.id, toPinId: andGate.inputs[1].id, value: 0 },
        { id: 'w_s_out', fromComponentId: xorGate.id, fromPinId: xorGate.outputs[0].id, toComponentId: ledS.id, toPinId: ledS.inputs[0].id, value: 0 },
        { id: 'w_c_out', fromComponentId: andGate.id, fromPinId: andGate.outputs[0].id, toComponentId: ledC.id, toPinId: ledC.inputs[0].id, value: 0 },
      ];

      return { components: [swA, swB, xorGate, andGate, ledS, ledC], connections };
    },
  },
  {
    id: 'half_adder',
    name: 'Semisumador Modular (Bloque IC)',
    category: 'Aritmética',
    description: 'Semisumador implementado con bloque funcional reutilizable HALF_ADDER (entradas A y B; salidas S y C).',
    build: () => {
      const swA = createComponent('SWITCH', 80, 100, 'A');
      const swB = createComponent('SWITCH', 80, 200, 'B');
      const ha = createComponent('HALF_ADDER', 280, 130, 'Medio Sumador');
      const ledS = createComponent('LED', 520, 120, 'S (Suma)');
      const ledC = createComponent('LED', 520, 210, 'C (Acarreo)');

      const connections: WireConnection[] = [
        { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: ha.id, toPinId: ha.inputs[0].id, value: 0 },
        { id: 'w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: ha.id, toPinId: ha.inputs[1].id, value: 0 },
        { id: 'w3', fromComponentId: ha.id, fromPinId: ha.outputs[0].id, toComponentId: ledS.id, toPinId: ledS.inputs[0].id, value: 0 },
        { id: 'w4', fromComponentId: ha.id, fromPinId: ha.outputs[1].id, toComponentId: ledC.id, toPinId: ledC.inputs[0].id, value: 0 },
      ];

      return { components: [swA, swB, ha, ledS, ledC], connections };
    },
  },
  {
    id: 'full_adder_gates',
    name: 'Sumador Completo con Compuertas (2 XOR, 2 AND, 1 OR)',
    category: 'Aritmética',
    description: 'Sumador completo construido con compuertas discretas: S = A ⊕ B ⊕ Cin, Cout = AB + Cin(A ⊕ B).',
    build: () => {
      const swA = createComponent('SWITCH', 60, 60, 'A');
      const swB = createComponent('SWITCH', 60, 150, 'B');
      const swCin = createComponent('SWITCH', 60, 250, 'Cin');

      const xor1 = createComponent('XOR', 250, 70, 'XOR 1 (A ⊕ B)', 2);
      const xor2 = createComponent('XOR', 460, 100, 'XOR 2 (Suma S)', 2);
      const and1 = createComponent('AND', 250, 210, 'AND 1 (A · B)', 2);
      const and2 = createComponent('AND', 460, 230, 'AND 2 (P · Cin)', 2);
      const or1 = createComponent('OR', 640, 220, 'OR (Cout)', 2);

      const ledS = createComponent('LED', 760, 100, 'S (Suma)');
      const ledCout = createComponent('LED', 760, 220, 'Cout');

      const connections: WireConnection[] = [
        // A & B to XOR1
        { id: 'fa_w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: xor1.id, toPinId: xor1.inputs[0].id, value: 0 },
        { id: 'fa_w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: xor1.id, toPinId: xor1.inputs[1].id, value: 0 },
        // A & B to AND1
        { id: 'fa_w3', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: and1.id, toPinId: and1.inputs[0].id, value: 0 },
        { id: 'fa_w4', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: and1.id, toPinId: and1.inputs[1].id, value: 0 },
        // XOR1 out to XOR2 input 0
        { id: 'fa_w5', fromComponentId: xor1.id, fromPinId: xor1.outputs[0].id, toComponentId: xor2.id, toPinId: xor2.inputs[0].id, value: 0 },
        // Cin to XOR2 input 1
        { id: 'fa_w6', fromComponentId: swCin.id, fromPinId: swCin.outputs[0].id, toComponentId: xor2.id, toPinId: xor2.inputs[1].id, value: 0 },
        // XOR1 out to AND2 input 0
        { id: 'fa_w7', fromComponentId: xor1.id, fromPinId: xor1.outputs[0].id, toComponentId: and2.id, toPinId: and2.inputs[0].id, value: 0 },
        // Cin to AND2 input 1
        { id: 'fa_w8', fromComponentId: swCin.id, fromPinId: swCin.outputs[0].id, toComponentId: and2.id, toPinId: and2.inputs[1].id, value: 0 },
        // XOR2 out to Sum LED
        { id: 'fa_w9', fromComponentId: xor2.id, fromPinId: xor2.outputs[0].id, toComponentId: ledS.id, toPinId: ledS.inputs[0].id, value: 0 },
        // AND1 out and AND2 out to OR
        { id: 'fa_w10', fromComponentId: and1.id, fromPinId: and1.outputs[0].id, toComponentId: or1.id, toPinId: or1.inputs[0].id, value: 0 },
        { id: 'fa_w11', fromComponentId: and2.id, fromPinId: and2.outputs[0].id, toComponentId: or1.id, toPinId: or1.inputs[1].id, value: 0 },
        // OR out to Cout LED
        { id: 'fa_w12', fromComponentId: or1.id, fromPinId: or1.outputs[0].id, toComponentId: ledCout.id, toPinId: ledCout.inputs[0].id, value: 0 },
      ];

      return { components: [swA, swB, swCin, xor1, xor2, and1, and2, or1, ledS, ledCout], connections };
    },
  },
  {
    id: 'full_adder_two_ha',
    name: 'Sumador Completo con 2 Semisumadores + OR',
    category: 'Aritmética',
    description: 'Arquitectura clásica de sumador completo modular encadenando dos semisumadores y una compuerta OR para el acarreo.',
    build: () => {
      const swA = createComponent('SWITCH', 60, 80, 'A');
      const swB = createComponent('SWITCH', 60, 160, 'B');
      const swCin = createComponent('SWITCH', 60, 270, 'Cin');

      const ha1 = createComponent('HALF_ADDER', 240, 100, 'Semisumador 1');
      const ha2 = createComponent('HALF_ADDER', 440, 160, 'Semisumador 2');
      const orGate = createComponent('OR', 640, 240, 'OR Acarreos', 2);

      const ledS = createComponent('LED', 680, 140, 'S (Suma)');
      const ledCout = createComponent('LED', 780, 240, 'Cout');

      const connections: WireConnection[] = [
        { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: ha1.id, toPinId: ha1.inputs[0].id, value: 0 },
        { id: 'w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: ha1.id, toPinId: ha1.inputs[1].id, value: 0 },
        { id: 'w3', fromComponentId: ha1.id, fromPinId: ha1.outputs[0].id, toComponentId: ha2.id, toPinId: ha2.inputs[0].id, value: 0 },
        { id: 'w4', fromComponentId: swCin.id, fromPinId: swCin.outputs[0].id, toComponentId: ha2.id, toPinId: ha2.inputs[1].id, value: 0 },
        { id: 'w5', fromComponentId: ha2.id, fromPinId: ha2.outputs[0].id, toComponentId: ledS.id, toPinId: ledS.inputs[0].id, value: 0 },
        { id: 'w6', fromComponentId: ha1.id, fromPinId: ha1.outputs[1].id, toComponentId: orGate.id, toPinId: orGate.inputs[0].id, value: 0 },
        { id: 'w7', fromComponentId: ha2.id, fromPinId: ha2.outputs[1].id, toComponentId: orGate.id, toPinId: orGate.inputs[1].id, value: 0 },
        { id: 'w8', fromComponentId: orGate.id, fromPinId: orGate.outputs[0].id, toComponentId: ledCout.id, toPinId: ledCout.inputs[0].id, value: 0 },
      ];

      return { components: [swA, swB, swCin, ha1, ha2, orGate, ledS, ledCout], connections };
    },
  },
  {
    id: 'full_adder_discrete',
    name: 'Sumador Completo Modular (Bloque IC)',
    category: 'Aritmética',
    description: 'Sumador completo implementado con bloque funcional FULL_ADDER reutilizable (entradas A, B, Cin; salidas S, Cout).',
    build: () => {
      const swA = createComponent('SWITCH', 60, 80, 'A');
      const swB = createComponent('SWITCH', 60, 180, 'B');
      const swCin = createComponent('SWITCH', 60, 280, 'Cin');
      const fa = createComponent('FULL_ADDER', 280, 140, 'Full Adder 74xx');
      const ledS = createComponent('LED', 520, 130, 'S (Suma)');
      const ledCout = createComponent('LED', 520, 230, 'Cout');

      const connections: WireConnection[] = [
        { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: fa.id, toPinId: fa.inputs[0].id, value: 0 },
        { id: 'w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: fa.id, toPinId: fa.inputs[1].id, value: 0 },
        { id: 'w3', fromComponentId: swCin.id, fromPinId: swCin.outputs[0].id, toComponentId: fa.id, toPinId: fa.inputs[2].id, value: 0 },
        { id: 'w4', fromComponentId: fa.id, fromPinId: fa.outputs[0].id, toComponentId: ledS.id, toPinId: ledS.inputs[0].id, value: 0 },
        { id: 'w5', fromComponentId: fa.id, fromPinId: fa.outputs[1].id, toComponentId: ledCout.id, toPinId: ledCout.inputs[0].id, value: 0 },
      ];

      return { components: [swA, swB, swCin, fa, ledS, ledCout], connections };
    },
  },
  {
    id: 'adder_4bit_ripple',
    name: 'Sumador de 4 Bits por Cascada (Ripple Carry)',
    category: 'Aritmética',
    description: 'Sumador paralelo de 4 bits construido con 4 bloques Sumadores Completos en cascada de acarreo serie (C0 → C1 → C2 → C3 → Cout).',
    build: () => {
      // Inputs: A0..A3, B0..B3, Cin (C0)
      const swCin = createComponent('SWITCH', 40, 40, 'Cin (C0)');

      const swA0 = createComponent('SWITCH', 40, 120, 'A0');
      const swB0 = createComponent('SWITCH', 40, 180, 'B0');

      const swA1 = createComponent('SWITCH', 40, 270, 'A1');
      const swB1 = createComponent('SWITCH', 40, 330, 'B1');

      const swA2 = createComponent('SWITCH', 40, 420, 'A2');
      const swB2 = createComponent('SWITCH', 40, 480, 'B2');

      const swA3 = createComponent('SWITCH', 40, 570, 'A3');
      const swB3 = createComponent('SWITCH', 40, 630, 'B3');

      // 4 Full Adders
      const fa0 = createComponent('FULL_ADDER', 280, 120, 'FA0 (Bit 0)');
      const fa1 = createComponent('FULL_ADDER', 280, 270, 'FA1 (Bit 1)');
      const fa2 = createComponent('FULL_ADDER', 280, 420, 'FA2 (Bit 2)');
      const fa3 = createComponent('FULL_ADDER', 280, 570, 'FA3 (Bit 3)');

      // Outputs
      const ledS0 = createComponent('LED', 520, 120, 'S0');
      const ledS1 = createComponent('LED', 520, 270, 'S1');
      const ledS2 = createComponent('LED', 520, 420, 'S2');
      const ledS3 = createComponent('LED', 520, 570, 'S3');
      const ledCout = createComponent('LED', 520, 660, 'Cout');

      const connections: WireConnection[] = [
        // Bit 0 inputs
        { id: 'w_a0', fromComponentId: swA0.id, fromPinId: swA0.outputs[0].id, toComponentId: fa0.id, toPinId: fa0.inputs[0].id, value: 0 },
        { id: 'w_b0', fromComponentId: swB0.id, fromPinId: swB0.outputs[0].id, toComponentId: fa0.id, toPinId: fa0.inputs[1].id, value: 0 },
        { id: 'w_c0', fromComponentId: swCin.id, fromPinId: swCin.outputs[0].id, toComponentId: fa0.id, toPinId: fa0.inputs[2].id, value: 0 },
        { id: 'w_s0', fromComponentId: fa0.id, fromPinId: fa0.outputs[0].id, toComponentId: ledS0.id, toPinId: ledS0.inputs[0].id, value: 0 },

        // Ripple Carry 0 -> 1
        { id: 'w_c1', fromComponentId: fa0.id, fromPinId: fa0.outputs[1].id, toComponentId: fa1.id, toPinId: fa1.inputs[2].id, value: 0 },

        // Bit 1 inputs
        { id: 'w_a1', fromComponentId: swA1.id, fromPinId: swA1.outputs[0].id, toComponentId: fa1.id, toPinId: fa1.inputs[0].id, value: 0 },
        { id: 'w_b1', fromComponentId: swB1.id, fromPinId: swB1.outputs[0].id, toComponentId: fa1.id, toPinId: fa1.inputs[1].id, value: 0 },
        { id: 'w_s1', fromComponentId: fa1.id, fromPinId: fa1.outputs[0].id, toComponentId: ledS1.id, toPinId: ledS1.inputs[0].id, value: 0 },

        // Ripple Carry 1 -> 2
        { id: 'w_c2', fromComponentId: fa1.id, fromPinId: fa1.outputs[1].id, toComponentId: fa2.id, toPinId: fa2.inputs[2].id, value: 0 },

        // Bit 2 inputs
        { id: 'w_a2', fromComponentId: swA2.id, fromPinId: swA2.outputs[0].id, toComponentId: fa2.id, toPinId: fa2.inputs[0].id, value: 0 },
        { id: 'w_b2', fromComponentId: swB2.id, fromPinId: swB2.outputs[0].id, toComponentId: fa2.id, toPinId: fa2.inputs[1].id, value: 0 },
        { id: 'w_s2', fromComponentId: fa2.id, fromPinId: fa2.outputs[0].id, toComponentId: ledS2.id, toPinId: ledS2.inputs[0].id, value: 0 },

        // Ripple Carry 2 -> 3
        { id: 'w_c3', fromComponentId: fa2.id, fromPinId: fa2.outputs[1].id, toComponentId: fa3.id, toPinId: fa3.inputs[2].id, value: 0 },

        // Bit 3 inputs
        { id: 'w_a3', fromComponentId: swA3.id, fromPinId: swA3.outputs[0].id, toComponentId: fa3.id, toPinId: fa3.inputs[0].id, value: 0 },
        { id: 'w_b3', fromComponentId: swB3.id, fromPinId: swB3.outputs[0].id, toComponentId: fa3.id, toPinId: fa3.inputs[1].id, value: 0 },
        { id: 'w_s3', fromComponentId: fa3.id, fromPinId: fa3.outputs[0].id, toComponentId: ledS3.id, toPinId: ledS3.inputs[0].id, value: 0 },

        // Final Carry Out
        { id: 'w_cout', fromComponentId: fa3.id, fromPinId: fa3.outputs[1].id, toComponentId: ledCout.id, toPinId: ledCout.inputs[0].id, value: 0 },
      ];

      return {
        components: [
          swCin,
          swA0, swB0, fa0, ledS0,
          swA1, swB1, fa1, ledS1,
          swA2, swB2, fa2, ledS2,
          swA3, swB3, fa3, ledS3,
          ledCout,
        ],
        connections,
      };
    },
  },
  {
    id: 'adder_4bit_block',
    name: 'Sumador de 4 Bits Integrado (Chip 74xx283)',
    category: 'Aritmética',
    description: 'Sumador binario de 4 bits integrado de alta velocidad con entradas de bus A[3:0], B[3:0], acarreo inicial Cin y salidas S[3:0], Cout.',
    build: () => {
      const swA0 = createComponent('SWITCH', 60, 60, 'A0');
      const swA1 = createComponent('SWITCH', 60, 110, 'A1');
      const swA2 = createComponent('SWITCH', 60, 160, 'A2');
      const swA3 = createComponent('SWITCH', 60, 210, 'A3');

      const swB0 = createComponent('SWITCH', 60, 280, 'B0');
      const swB1 = createComponent('SWITCH', 60, 330, 'B1');
      const swB2 = createComponent('SWITCH', 60, 380, 'B2');
      const swB3 = createComponent('SWITCH', 60, 430, 'B3');

      const swCin = createComponent('SWITCH', 220, 20, 'Cin');

      const adder4 = createComponent('ADDER_4BIT', 260, 160, '74xx283 4-Bit Adder');

      const ledS0 = createComponent('LED', 500, 80, 'S0');
      const ledS1 = createComponent('LED', 500, 140, 'S1');
      const ledS2 = createComponent('LED', 500, 200, 'S2');
      const ledS3 = createComponent('LED', 500, 260, 'S3');
      const ledCout = createComponent('LED', 500, 340, 'Cout');

      const connections: WireConnection[] = [
        // A0..A3
        { id: 'w_a0', fromComponentId: swA0.id, fromPinId: swA0.outputs[0].id, toComponentId: adder4.id, toPinId: adder4.inputs[0].id, value: 0 },
        { id: 'w_a1', fromComponentId: swA1.id, fromPinId: swA1.outputs[0].id, toComponentId: adder4.id, toPinId: adder4.inputs[1].id, value: 0 },
        { id: 'w_a2', fromComponentId: swA2.id, fromPinId: swA2.outputs[0].id, toComponentId: adder4.id, toPinId: adder4.inputs[2].id, value: 0 },
        { id: 'w_a3', fromComponentId: swA3.id, fromPinId: swA3.outputs[0].id, toComponentId: adder4.id, toPinId: adder4.inputs[3].id, value: 0 },

        // B0..B3
        { id: 'w_b0', fromComponentId: swB0.id, fromPinId: swB0.outputs[0].id, toComponentId: adder4.id, toPinId: adder4.inputs[4].id, value: 0 },
        { id: 'w_b1', fromComponentId: swB1.id, fromPinId: swB1.outputs[0].id, toComponentId: adder4.id, toPinId: adder4.inputs[5].id, value: 0 },
        { id: 'w_b2', fromComponentId: swB2.id, fromPinId: swB2.outputs[0].id, toComponentId: adder4.id, toPinId: adder4.inputs[6].id, value: 0 },
        { id: 'w_b3', fromComponentId: swB3.id, fromPinId: swB3.outputs[0].id, toComponentId: adder4.id, toPinId: adder4.inputs[7].id, value: 0 },

        // Cin
        { id: 'w_cin', fromComponentId: swCin.id, fromPinId: swCin.outputs[0].id, toComponentId: adder4.id, toPinId: adder4.inputs[8].id, value: 0 },

        // S0..S3
        { id: 'w_s0', fromComponentId: adder4.id, fromPinId: adder4.outputs[0].id, toComponentId: ledS0.id, toPinId: ledS0.inputs[0].id, value: 0 },
        { id: 'w_s1', fromComponentId: adder4.id, fromPinId: adder4.outputs[1].id, toComponentId: ledS1.id, toPinId: ledS1.inputs[0].id, value: 0 },
        { id: 'w_s2', fromComponentId: adder4.id, fromPinId: adder4.outputs[2].id, toComponentId: ledS2.id, toPinId: ledS2.inputs[0].id, value: 0 },
        { id: 'w_s3', fromComponentId: adder4.id, fromPinId: adder4.outputs[3].id, toComponentId: ledS3.id, toPinId: ledS3.inputs[0].id, value: 0 },

        // Cout
        { id: 'w_cout', fromComponentId: adder4.id, fromPinId: adder4.outputs[4].id, toComponentId: ledCout.id, toPinId: ledCout.inputs[0].id, value: 0 },
      ];

      return {
        components: [
          swA0, swA1, swA2, swA3,
          swB0, swB1, swB2, swB3,
          swCin,
          adder4,
          ledS0, ledS1, ledS2, ledS3, ledCout,
        ],
        connections,
      };
    },
  },
  {
    id: 'mux_4to1_selector',
    name: 'Multiplexor 4 a 1 (MUX 4:1)',
    category: 'Combinacional',
    description: 'Enruta una de 4 líneas de datos (D0..D3) a la salida según los selectores binarios S0 y S1.',
    build: () => {
      const d0 = createComponent('SWITCH', 60, 60, 'D0');
      const d1 = createComponent('SWITCH', 60, 130, 'D1');
      const d2 = createComponent('SWITCH', 60, 200, 'D2');
      const d3 = createComponent('SWITCH', 60, 270, 'D3');
      const s0 = createComponent('SWITCH', 200, 360, 'Sel 0 (LSB)');
      const s1 = createComponent('SWITCH', 320, 360, 'Sel 1 (MSB)');
      const mux = createComponent('MUX_4TO1', 300, 130, 'MUX 4:1');
      const outLed = createComponent('LED', 540, 175, 'Salida Y');

      const connections: WireConnection[] = [
        { id: 'w1', fromComponentId: d0.id, fromPinId: d0.outputs[0].id, toComponentId: mux.id, toPinId: mux.inputs[0].id, value: 0 },
        { id: 'w2', fromComponentId: d1.id, fromPinId: d1.outputs[0].id, toComponentId: mux.id, toPinId: mux.inputs[1].id, value: 0 },
        { id: 'w3', fromComponentId: d2.id, fromPinId: d2.outputs[0].id, toComponentId: mux.id, toPinId: mux.inputs[2].id, value: 0 },
        { id: 'w4', fromComponentId: d3.id, fromPinId: d3.outputs[0].id, toComponentId: mux.id, toPinId: mux.inputs[3].id, value: 0 },
        { id: 'w5', fromComponentId: s0.id, fromPinId: s0.outputs[0].id, toComponentId: mux.id, toPinId: mux.inputs[4].id, value: 0 },
        { id: 'w6', fromComponentId: s1.id, fromPinId: s1.outputs[0].id, toComponentId: mux.id, toPinId: mux.inputs[5].id, value: 0 },
        { id: 'w7', fromComponentId: mux.id, fromPinId: mux.outputs[0].id, toComponentId: outLed.id, toPinId: outLed.inputs[0].id, value: 0 },
      ];

      return { components: [d0, d1, d2, d3, s0, s1, mux, outLed], connections };
    },
  },
  {
    id: 'decoder_2to4_circuit',
    name: 'Decodificador 2 a 4 líneas',
    category: 'Combinacional',
    description: 'Activa una única línea de salida entre 4 posibles según la combinación de entrada (A0, A1).',
    build: () => {
      const a0 = createComponent('SWITCH', 60, 120, 'A0');
      const a1 = createComponent('SWITCH', 60, 200, 'A1');
      const dec = createComponent('DECODER_2TO4', 260, 130, 'Decodificador');
      const l0 = createComponent('LED', 480, 80, 'Y0 (00)');
      const l1 = createComponent('LED', 480, 140, 'Y1 (01)');
      const l2 = createComponent('LED', 480, 200, 'Y2 (10)');
      const l3 = createComponent('LED', 480, 260, 'Y3 (11)');

      const connections: WireConnection[] = [
        { id: 'w1', fromComponentId: a0.id, fromPinId: a0.outputs[0].id, toComponentId: dec.id, toPinId: dec.inputs[0].id, value: 0 },
        { id: 'w2', fromComponentId: a1.id, fromPinId: a1.outputs[0].id, toComponentId: dec.id, toPinId: dec.inputs[1].id, value: 0 },
        { id: 'w3', fromComponentId: dec.id, fromPinId: dec.outputs[0].id, toComponentId: l0.id, toPinId: l0.inputs[0].id, value: 0 },
        { id: 'w4', fromComponentId: dec.id, fromPinId: dec.outputs[1].id, toComponentId: l1.id, toPinId: l1.inputs[0].id, value: 0 },
        { id: 'w5', fromComponentId: dec.id, fromPinId: dec.outputs[2].id, toComponentId: l2.id, toPinId: l2.inputs[0].id, value: 0 },
        { id: 'w6', fromComponentId: dec.id, fromPinId: dec.outputs[3].id, toComponentId: l3.id, toPinId: l3.inputs[0].id, value: 0 },
      ];

      return { components: [a0, a1, dec, l0, l1, l2, l3], connections };
    },
  },
  {
    id: 'bcd_decoder_7seg_demo',
    name: 'Decodificador BCD a Display 7 Segmentos',
    category: 'Combinacional',
    description: 'Entradas BCD de 4 bits (D, C, B, A) decodificadas a 7 segmentos estándar a..g en un display digital.',
    build: () => {
      const swD = createComponent('SWITCH', 60, 60, 'D (8)');
      const swC = createComponent('SWITCH', 60, 130, 'C (4)');
      const swB = createComponent('SWITCH', 60, 200, 'B (2)');
      const swA = createComponent('SWITCH', 60, 270, 'A (1)');
      const bcd = createComponent('BCD_TO_7SEG', 280, 80, 'Decod BCD 7-Seg');
      const display = createComponent('SEVEN_SEGMENT', 540, 80, 'Display 7-Seg');

      const connections: WireConnection[] = [
        { id: 'w_d', fromComponentId: swD.id, fromPinId: swD.outputs[0].id, toComponentId: bcd.id, toPinId: bcd.inputs[0].id, value: 0 },
        { id: 'w_c', fromComponentId: swC.id, fromPinId: swC.outputs[0].id, toComponentId: bcd.id, toPinId: bcd.inputs[1].id, value: 0 },
        { id: 'w_b', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: bcd.id, toPinId: bcd.inputs[2].id, value: 0 },
        { id: 'w_a', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: bcd.id, toPinId: bcd.inputs[3].id, value: 0 },
        ...[0, 1, 2, 3, 4, 5, 6].map((idx) => ({
          id: `w_seg_${idx}`,
          fromComponentId: bcd.id,
          fromPinId: bcd.outputs[idx].id,
          toComponentId: display.id,
          toPinId: display.inputs[idx].id,
          value: 0 as const,
        })),
      ];

      return { components: [swD, swC, swB, swA, bcd, display], connections };
    },
  },
  {
    id: 'priority_encoder_8to3_demo',
    name: 'Codificador de Prioridad 8 a 3',
    category: 'Combinacional',
    description: '8 entradas prioritarias (I7 > ... > I0) codificadas a 3 bits de dirección (Y2, Y1, Y0) con señal de entrada válida (V).',
    build: () => {
      const sw7 = createComponent('SWITCH', 60, 40, 'I7');
      const sw6 = createComponent('SWITCH', 60, 90, 'I6');
      const sw5 = createComponent('SWITCH', 60, 140, 'I5');
      const sw4 = createComponent('SWITCH', 60, 190, 'I4');
      const sw3 = createComponent('SWITCH', 60, 240, 'I3');
      const sw2 = createComponent('SWITCH', 60, 290, 'I2');
      const sw1 = createComponent('SWITCH', 60, 340, 'I1');
      const sw0 = createComponent('SWITCH', 60, 390, 'I0');

      const enc = createComponent('PRIORITY_ENCODER_8TO3', 280, 130, 'Codif. Prioridad 8:3');
      const ledY2 = createComponent('LED', 520, 110, 'Y2 (MSB)');
      const ledY1 = createComponent('LED', 520, 170, 'Y1');
      const ledY0 = createComponent('LED', 520, 230, 'Y0 (LSB)');
      const ledV = createComponent('LED', 520, 290, 'V (Válido)');

      const inputs = [sw0, sw1, sw2, sw3, sw4, sw5, sw6, sw7];
      const connections: WireConnection[] = [
        ...inputs.map((sw, idx) => ({
          id: `w_prio_${idx}`,
          fromComponentId: sw.id,
          fromPinId: sw.outputs[0].id,
          toComponentId: enc.id,
          toPinId: enc.inputs[idx].id,
          value: 0 as const,
        })),
        { id: 'w_y2', fromComponentId: enc.id, fromPinId: enc.outputs[0].id, toComponentId: ledY2.id, toPinId: ledY2.inputs[0].id, value: 0 },
        { id: 'w_y1', fromComponentId: enc.id, fromPinId: enc.outputs[1].id, toComponentId: ledY1.id, toPinId: ledY1.inputs[0].id, value: 0 },
        { id: 'w_y0', fromComponentId: enc.id, fromPinId: enc.outputs[2].id, toComponentId: ledY0.id, toPinId: ledY0.inputs[0].id, value: 0 },
        { id: 'w_v', fromComponentId: enc.id, fromPinId: enc.outputs[3].id, toComponentId: ledV.id, toPinId: ledV.inputs[0].id, value: 0 },
      ];

      return { components: [...inputs, enc, ledY2, ledY1, ledY0, ledV], connections };
    },
  },
  {
    id: 'counter_7seg_display',
    name: 'Contador Binario con Display 7 Segmentos',
    category: 'Secuencial',
    description: 'Reloj oscilador conectado a un contador de 4 bits decodificado con BCD_TO_7SEG a un display de 7 segmentos.',
    build: () => {
      const clk = createComponent('CLOCK', 60, 140, 'Generador CLK');
      const rst = createComponent('SWITCH', 60, 230, 'Reset');
      const counter = createComponent('COUNTER_4BIT', 240, 120, 'Contador 4-bit');
      const bcd = createComponent('BCD_TO_7SEG', 460, 100, 'Decod BCD');
      const display = createComponent('SEVEN_SEGMENT', 680, 100, 'Display 7-Seg');
      const rcoLed = createComponent('LED', 460, 310, 'Fin Conteo (RCO)');

      const connections: WireConnection[] = [
        { id: 'w1', fromComponentId: clk.id, fromPinId: clk.outputs[0].id, toComponentId: counter.id, toPinId: counter.inputs[0].id, value: 0 },
        { id: 'w2', fromComponentId: rst.id, fromPinId: rst.outputs[0].id, toComponentId: counter.id, toPinId: counter.inputs[1].id, value: 0 },
        // counter Q3..Q0 to BCD decoder D..A
        { id: 'w3', fromComponentId: counter.id, fromPinId: counter.outputs[3].id, toComponentId: bcd.id, toPinId: bcd.inputs[0].id, value: 0 },
        { id: 'w4', fromComponentId: counter.id, fromPinId: counter.outputs[2].id, toComponentId: bcd.id, toPinId: bcd.inputs[1].id, value: 0 },
        { id: 'w5', fromComponentId: counter.id, fromPinId: counter.outputs[1].id, toComponentId: bcd.id, toPinId: bcd.inputs[2].id, value: 0 },
        { id: 'w6', fromComponentId: counter.id, fromPinId: counter.outputs[0].id, toComponentId: bcd.id, toPinId: bcd.inputs[3].id, value: 0 },
        // bcd outputs a..g to display inputs a..g
        ...[0, 1, 2, 3, 4, 5, 6].map((idx) => ({
          id: `w_seg_${idx}`,
          fromComponentId: bcd.id,
          fromPinId: bcd.outputs[idx].id,
          toComponentId: display.id,
          toPinId: display.inputs[idx].id,
          value: 0 as const,
        })),
        { id: 'w7', fromComponentId: counter.id, fromPinId: counter.outputs[4].id, toComponentId: rcoLed.id, toPinId: rcoLed.inputs[0].id, value: 0 },
      ];

      return { components: [clk, rst, counter, bcd, display, rcoLed], connections };
    },
  },
  {
    id: 'sr_latch_memory',
    name: 'Biestable SR (Memoria Elemental)',
    category: 'Secuencial',
    description: 'Celda de almacenamiento de 1 bit con entradas Set (Poner a 1) y Reset (Poner a 0) y salidas complementarias Q y Q\'.',
    build: () => {
      const swS = createComponent('SWITCH', 80, 100, 'Set (S)');
      const swR = createComponent('SWITCH', 80, 200, 'Reset (R)');
      const latch = createComponent('LATCH_SR', 280, 130, 'Biestable SR');
      const ledQ = createComponent('LED', 480, 110, 'Estado Q');
      const ledQBar = createComponent('LED', 480, 210, "Estado Q'");

      const connections: WireConnection[] = [
        { id: 'w1', fromComponentId: swS.id, fromPinId: swS.outputs[0].id, toComponentId: latch.id, toPinId: latch.inputs[0].id, value: 0 },
        { id: 'w2', fromComponentId: swR.id, fromPinId: swR.outputs[0].id, toComponentId: latch.id, toPinId: latch.inputs[1].id, value: 0 },
        { id: 'w3', fromComponentId: latch.id, fromPinId: latch.outputs[0].id, toComponentId: ledQ.id, toPinId: ledQ.inputs[0].id, value: 0 },
        { id: 'w4', fromComponentId: latch.id, fromPinId: latch.outputs[1].id, toComponentId: ledQBar.id, toPinId: ledQBar.inputs[0].id, value: 1 },
      ];

      return { components: [swS, swR, latch, ledQ, ledQBar], connections };
    },
  },
  {
    id: 'full_adder_primitive',
    name: 'Sumador Completo con Compuertas Primitivas',
    category: 'Aritmética',
    description: 'Implementación canónica con 2 compuertas XOR, 2 AND y 1 OR. Ideal para seleccionar y encapsular en «Crear Subcircuito».',
    build: () => {
      const swA = createComponent('SWITCH', 80, 80, 'A');
      const swB = createComponent('SWITCH', 80, 180, 'B');
      const swCin = createComponent('SWITCH', 80, 280, 'Cin');

      const xor1 = createComponent('XOR', 260, 100, 'XOR 1', 2);
      const xor2 = createComponent('XOR', 460, 130, 'XOR 2 (Suma)', 2);

      const and1 = createComponent('AND', 340, 240, 'AND 1', 2);
      const and2 = createComponent('AND', 460, 340, 'AND 2', 2);
      const or1 = createComponent('OR', 620, 290, 'OR 1 (Cout)', 2);

      const ledS = createComponent('LED', 660, 136, 'S (Suma)');
      const ledCout = createComponent('LED', 760, 296, 'Cout (Acarreo)');

      const connections: WireConnection[] = [
        { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: xor1.id, toPinId: xor1.inputs[0].id, value: 0 },
        { id: 'w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: xor1.id, toPinId: xor1.inputs[1].id, value: 0 },
        { id: 'w3', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: and2.id, toPinId: and2.inputs[0].id, value: 0 },
        { id: 'w4', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: and2.id, toPinId: and2.inputs[1].id, value: 0 },
        { id: 'w5', fromComponentId: xor1.id, fromPinId: xor1.outputs[0].id, toComponentId: xor2.id, toPinId: xor2.inputs[0].id, value: 0 },
        { id: 'w6', fromComponentId: swCin.id, fromPinId: swCin.outputs[0].id, toComponentId: xor2.id, toPinId: xor2.inputs[1].id, value: 0 },
        { id: 'w7', fromComponentId: xor1.id, fromPinId: xor1.outputs[0].id, toComponentId: and1.id, toPinId: and1.inputs[0].id, value: 0 },
        { id: 'w8', fromComponentId: swCin.id, fromPinId: swCin.outputs[0].id, toComponentId: and1.id, toPinId: and1.inputs[1].id, value: 0 },
        { id: 'w9', fromComponentId: and1.id, fromPinId: and1.outputs[0].id, toComponentId: or1.id, toPinId: or1.inputs[0].id, value: 0 },
        { id: 'w10', fromComponentId: and2.id, fromPinId: and2.outputs[0].id, toComponentId: or1.id, toPinId: or1.inputs[1].id, value: 0 },
        { id: 'w11', fromComponentId: xor2.id, fromPinId: xor2.outputs[0].id, toComponentId: ledS.id, toPinId: ledS.inputs[0].id, value: 0 },
        { id: 'w12', fromComponentId: or1.id, fromPinId: or1.outputs[0].id, toComponentId: ledCout.id, toPinId: ledCout.inputs[0].id, value: 0 },
      ];

      return {
        components: [swA, swB, swCin, xor1, xor2, and1, and2, or1, ledS, ledCout],
        connections,
      };
    },
  },
  {
    id: 'adder_4bit_subcircuits',
    name: 'Sumador de 4 Bits con 4 Subcircuitos FULL ADDER',
    category: 'Aritmética',
    description: 'Diseño jerárquico profesional: 4 instancias de FULL ADDER con acarreo en cascada (Ripple Carry: Cout_i -> Cin_i+1). Haz doble clic en cualquier bloque FA para inspeccionar su interior.',
    build: () => {
      // 4 Subcircuit instances (bits 0, 1, 2, 3)
      const fa0 = SubcircuitRegistry.createInstance('builtin_full_adder', 240, 60, 'FA0 (Bit 0)');
      const fa1 = SubcircuitRegistry.createInstance('builtin_full_adder', 240, 200, 'FA1 (Bit 1)');
      const fa2 = SubcircuitRegistry.createInstance('builtin_full_adder', 240, 340, 'FA2 (Bit 2)');
      const fa3 = SubcircuitRegistry.createInstance('builtin_full_adder', 240, 480, 'FA3 (Bit 3)');

      // Initial Carry In switch
      const cin = createComponent('SWITCH', 60, 20, 'Cin (Inicial)');

      // Inputs A0-A3
      const a0 = createComponent('SWITCH', 60, 70, 'A0');
      const b0 = createComponent('SWITCH', 60, 110, 'B0');

      const a1 = createComponent('SWITCH', 60, 210, 'A1');
      const b1 = createComponent('SWITCH', 60, 250, 'B1');

      const a2 = createComponent('SWITCH', 60, 350, 'A2');
      const b2 = createComponent('SWITCH', 60, 390, 'B2');

      const a3 = createComponent('SWITCH', 60, 490, 'A3');
      const b3 = createComponent('SWITCH', 60, 530, 'B3');

      // Outputs S0-S3 and Cout
      const s0 = createComponent('LED', 460, 70, 'S0 (Bit 0)');
      const s1 = createComponent('LED', 460, 210, 'S1 (Bit 1)');
      const s2 = createComponent('LED', 460, 350, 'S2 (Bit 2)');
      const s3 = createComponent('LED', 460, 490, 'S3 (Bit 3)');
      const cout = createComponent('LED', 460, 560, 'Cout Final');

      const connections: WireConnection[] = [
        // Bit 0: Cin, A0, B0 -> FA0
        { id: 'w_cin_fa0', fromComponentId: cin.id, fromPinId: cin.outputs[0].id, toComponentId: fa0.id, toPinId: fa0.inputs[2].id, value: 0 },
        { id: 'w_a0_fa0', fromComponentId: a0.id, fromPinId: a0.outputs[0].id, toComponentId: fa0.id, toPinId: fa0.inputs[0].id, value: 0 },
        { id: 'w_b0_fa0', fromComponentId: b0.id, fromPinId: b0.outputs[0].id, toComponentId: fa0.id, toPinId: fa0.inputs[1].id, value: 0 },
        { id: 'w_fa0_s0', fromComponentId: fa0.id, fromPinId: fa0.outputs[0].id, toComponentId: s0.id, toPinId: s0.inputs[0].id, value: 0 },

        // Ripple Carry 0 -> 1: FA0 Cout -> FA1 Cin
        { id: 'w_c0_c1', fromComponentId: fa0.id, fromPinId: fa0.outputs[1].id, toComponentId: fa1.id, toPinId: fa1.inputs[2].id, value: 0 },
        { id: 'w_a1_fa1', fromComponentId: a1.id, fromPinId: a1.outputs[0].id, toComponentId: fa1.id, toPinId: fa1.inputs[0].id, value: 0 },
        { id: 'w_b1_fa1', fromComponentId: b1.id, fromPinId: b1.outputs[0].id, toComponentId: fa1.id, toPinId: fa1.inputs[1].id, value: 0 },
        { id: 'w_fa1_s1', fromComponentId: fa1.id, fromPinId: fa1.outputs[0].id, toComponentId: s1.id, toPinId: s1.inputs[0].id, value: 0 },

        // Ripple Carry 1 -> 2: FA1 Cout -> FA2 Cin
        { id: 'w_c1_c2', fromComponentId: fa1.id, fromPinId: fa1.outputs[1].id, toComponentId: fa2.id, toPinId: fa2.inputs[2].id, value: 0 },
        { id: 'w_a2_fa2', fromComponentId: a2.id, fromPinId: a2.outputs[0].id, toComponentId: fa2.id, toPinId: fa2.inputs[0].id, value: 0 },
        { id: 'w_b2_fa2', fromComponentId: b2.id, fromPinId: b2.outputs[0].id, toComponentId: fa2.id, toPinId: fa2.inputs[1].id, value: 0 },
        { id: 'w_fa2_s2', fromComponentId: fa2.id, fromPinId: fa2.outputs[0].id, toComponentId: s2.id, toPinId: s2.inputs[0].id, value: 0 },

        // Ripple Carry 2 -> 3: FA2 Cout -> FA3 Cin
        { id: 'w_c2_c3', fromComponentId: fa2.id, fromPinId: fa2.outputs[1].id, toComponentId: fa3.id, toPinId: fa3.inputs[2].id, value: 0 },
        { id: 'w_a3_fa3', fromComponentId: a3.id, fromPinId: a3.outputs[0].id, toComponentId: fa3.id, toPinId: fa3.inputs[0].id, value: 0 },
        { id: 'w_b3_fa3', fromComponentId: b3.id, fromPinId: b3.outputs[0].id, toComponentId: fa3.id, toPinId: fa3.inputs[1].id, value: 0 },
        { id: 'w_fa3_s3', fromComponentId: fa3.id, fromPinId: fa3.outputs[0].id, toComponentId: s3.id, toPinId: s3.inputs[0].id, value: 0 },

        // Final Carry Out
        { id: 'w_fa3_cout', fromComponentId: fa3.id, fromPinId: fa3.outputs[1].id, toComponentId: cout.id, toPinId: cout.inputs[0].id, value: 0 },
      ];

      return {
        components: [cin, a0, b0, a1, b1, a2, b2, a3, b3, fa0, fa1, fa2, fa3, s0, s1, s2, s3, cout],
        connections,
      };
    },
  },
];
