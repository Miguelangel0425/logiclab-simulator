import { describe, it, expect } from 'vitest';
import { createComponent } from '../engines/circuit/generator';
import { CircuitSimulator } from '../engines/circuit/simulator';
import { CircuitComponent, WireConnection } from '../types';

/**
 * Helper to build a driven testbench with real switch components and wires.
 * In CircuitSimulator, inputs are driven by connected components/wires.
 */
function createTestbench(comp: CircuitComponent) {
  const switches = comp.inputs.map((pin, idx) =>
    createComponent('SWITCH', -100, idx * 30, `SW_${pin.name}`)
  );
  const wires: WireConnection[] = switches.map((sw, idx) => ({
    id: `wire_tb_${comp.id}_${idx}`,
    fromComponentId: sw.id,
    fromPinId: sw.outputs[0].id,
    toComponentId: comp.id,
    toPinId: comp.inputs[idx].id,
    value: 0 as const,
  }));

  const simulate = (inputValues: (0 | 1)[]) => {
    inputValues.forEach((v, idx) => {
      if (switches[idx]) {
        switches[idx].state = { switchActive: v === 1 };
      }
    });
    const res = CircuitSimulator.step([...switches, comp], wires, false);
    return res.components.find((c) => c.id === comp.id)!;
  };

  return { switches, wires, simulate };
}

describe('Módulo de Decodificadores, Codificadores y Displays de 7 Segmentos', () => {
  // 1. Decodificador BCD a 7 Segmentos - Cátodo Común (Activo ALTO: 1 = ON)
  describe('1. Decodificador BCD a 7 Segmentos (Cátodo Común)', () => {
    const EXPECTED_CATHODE_SEGS: Record<number, number[]> = {
      0: [1, 1, 1, 1, 1, 1, 0], // a,b,c,d,e,f
      1: [0, 1, 1, 0, 0, 0, 0], // b,c
      2: [1, 1, 0, 1, 1, 0, 1], // a,b,d,e,g
      3: [1, 1, 1, 1, 0, 0, 1], // a,b,c,d,g
      4: [0, 1, 1, 0, 0, 1, 1], // b,c,f,g
      5: [1, 0, 1, 1, 0, 1, 1], // a,c,d,f,g
      6: [1, 0, 1, 1, 1, 1, 1], // a,c,d,e,f,g
      7: [1, 1, 1, 0, 0, 0, 0], // a,b,c
      8: [1, 1, 1, 1, 1, 1, 1], // a,b,c,d,e,f,g
      9: [1, 1, 1, 1, 0, 1, 1], // a,b,c,d,f,g
    };

    for (let digit = 0; digit <= 9; digit++) {
      it(`debe decodificar correctamente el dígito BCD ${digit} en cátodo común`, () => {
        const bcd = createComponent('BCD_TO_7SEG', 0, 0, 'BCD Decod');
        bcd.state = { displayMode: 'cathode' };
        const tb = createTestbench(bcd);

        // D (MSB, 8), C (4), B (2), A (LSB, 1)
        const d = ((digit >> 3) & 1) as 0 | 1;
        const c = ((digit >> 2) & 1) as 0 | 1;
        const b = ((digit >> 1) & 1) as 0 | 1;
        const a = (digit & 1) as 0 | 1;

        const evaluatedBcd = tb.simulate([d, c, b, a]);
        const segOutputs = evaluatedBcd.outputs.map((p) => p.value);

        expect(segOutputs).toEqual(EXPECTED_CATHODE_SEGS[digit]);
      });
    }
  });

  // 2. Decodificador BCD a 7 Segmentos - Ánodo Común (Activo BAJO: 0 = ON)
  describe('2. Decodificador BCD a 7 Segmentos (Ánodo Común)', () => {
    it('debe invertir las salidas a nivel BAJO (0 = ON) en ánodo común para dígitos 0 al 9', () => {
      const cathodeSegs: Record<number, number[]> = {
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

      for (let digit = 0; digit <= 9; digit++) {
        const bcd = createComponent('BCD_TO_7SEG', 0, 0, 'BCD Decod Anodo');
        bcd.state = { displayMode: 'anode' };
        const tb = createTestbench(bcd);

        const d = ((digit >> 3) & 1) as 0 | 1;
        const c = ((digit >> 2) & 1) as 0 | 1;
        const b = ((digit >> 1) & 1) as 0 | 1;
        const a = (digit & 1) as 0 | 1;

        const evaluatedBcd = tb.simulate([d, c, b, a]);
        const segOutputs = evaluatedBcd.outputs.map((p) => p.value);

        const expectedAnode = cathodeSegs[digit].map((s) => (s === 1 ? 0 : 1));
        expect(segOutputs).toEqual(expectedAnode);
      }
    });
  });

  // 3. Manejo de valores BCD no válidos (10 a 15)
  describe('3. Manejo de códigos BCD inválidos (10 a 15)', () => {
    it('modo INVALID_DASH debe encender solo el segmento g (guion central)', () => {
      for (let val = 10; val <= 15; val++) {
        const bcd = createComponent('BCD_TO_7SEG', 0, 0, 'BCD');
        bcd.state = { displayMode: 'cathode', invalidBcdMode: 'INVALID_DASH' };
        const tb = createTestbench(bcd);

        const d = ((val >> 3) & 1) as 0 | 1;
        const c = ((val >> 2) & 1) as 0 | 1;
        const b = ((val >> 1) & 1) as 0 | 1;
        const a = (val & 1) as 0 | 1;

        const res = tb.simulate([d, c, b, a]);
        // a..f = 0, g = 1
        expect(res.outputs.map((p) => p.value)).toEqual([0, 0, 0, 0, 0, 0, 1]);
      }
    });

    it('modo BLANK debe apagar todos los segmentos (todos en 0 para cátodo)', () => {
      const bcd = createComponent('BCD_TO_7SEG', 0, 0, 'BCD');
      bcd.state = { displayMode: 'cathode', invalidBcdMode: 'BLANK' };
      const tb = createTestbench(bcd);

      // 1010 = 10
      const res = tb.simulate([1, 0, 1, 0]);
      expect(res.outputs.map((p) => p.value)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });

    it('modo HEX_LETTERS debe generar caracteres A, b, C, d, E, F', () => {
      const bcd = createComponent('BCD_TO_7SEG', 0, 0, 'BCD');
      bcd.state = { displayMode: 'cathode', invalidBcdMode: 'HEX_LETTERS' };
      const tb = createTestbench(bcd);

      // 10 = A -> a,b,c,e,f,g (1,1,1,0,1,1,1)
      let res = tb.simulate([1, 0, 1, 0]);
      expect(res.outputs.map((p) => p.value)).toEqual([1, 1, 1, 0, 1, 1, 1]);

      // 14 = E -> a,d,e,f,g (1,0,0,1,1,1,1)
      res = tb.simulate([1, 1, 1, 0]);
      expect(res.outputs.map((p) => p.value)).toEqual([1, 0, 0, 1, 1, 1, 1]);
    });
  });

  // 4. Codificador Decimal a BCD (74147)
  describe('4. Codificador Decimal a BCD', () => {
    it('debe codificar entradas únicas D0 a D9 en salidas BCD A, B, C, D y Valid V', () => {
      for (let d = 0; d <= 9; d++) {
        const enc = createComponent('ENCODER_DECIMAL_TO_BCD', 0, 0, 'Enc Decimal-BCD');
        const tb = createTestbench(enc);

        const inputs = Array.from({ length: 10 }, (_, idx) => (idx === d ? 1 : 0) as 0 | 1);
        const res = tb.simulate(inputs);

        // Outputs: A (LSB, 1), B (2), C (4), D (8), V (valid)
        const A = res.outputs[0].value;
        const B = res.outputs[1].value;
        const C = res.outputs[2].value;
        const D = res.outputs[3].value;
        const V = res.outputs[4].value;

        const reconstructedVal = ((D as number) << 3) | ((C as number) << 2) | ((B as number) << 1) | (A as number);
        expect(V).toBe(1);
        expect(reconstructedVal).toBe(d);
      }
    });

    it('debe dar prioridad a la entrada activa más alta cuando coinciden varias (74147)', () => {
      const enc = createComponent('ENCODER_DECIMAL_TO_BCD', 0, 0, 'Enc Priority');
      const tb = createTestbench(enc);

      // Set D2, D5 and D8 active simultaneously
      const inputs = Array(10).fill(0) as (0 | 1)[];
      inputs[2] = 1;
      inputs[5] = 1;
      inputs[8] = 1;

      const res = tb.simulate(inputs);
      const A = res.outputs[0].value;
      const B = res.outputs[1].value;
      const C = res.outputs[2].value;
      const D = res.outputs[3].value;
      const V = res.outputs[4].value;

      expect(V).toBe(1);
      // D8 must win -> D=1, C=0, B=0, A=0
      expect({ D, C, B, A }).toEqual({ D: 1, C: 0, B: 0, A: 0 });
    });

    it('debe emitir V=0 si no hay ninguna entrada activa', () => {
      const enc = createComponent('ENCODER_DECIMAL_TO_BCD', 0, 0, 'Enc');
      const tb = createTestbench(enc);
      const res = tb.simulate(Array(10).fill(0));
      expect(res.outputs[4].value).toBe(0); // V = 0
    });
  });

  // 5. Codificador de Prioridad 4 a 2 bits
  describe('5. Codificador de Prioridad 4 a 2 bits (I3 > I2 > I1 > I0)', () => {
    it('debe codificar entradas individuales con prioridad estricta y señal V', () => {
      const enc = createComponent('PRIORITY_ENCODER_4TO2', 0, 0, 'Enc 4:2');
      const tb = createTestbench(enc);

      // I0 only -> Y1=0, Y0=0, V=1
      let res = tb.simulate([1, 0, 0, 0]);
      expect(res.outputs.map((p) => p.value)).toEqual([0, 0, 1]); // Y1, Y0, V

      // I1 only -> Y1=0, Y0=1, V=1
      res = tb.simulate([0, 1, 0, 0]);
      expect(res.outputs.map((p) => p.value)).toEqual([0, 1, 1]);

      // I2 only -> Y1=1, Y0=0, V=1
      res = tb.simulate([0, 0, 1, 0]);
      expect(res.outputs.map((p) => p.value)).toEqual([1, 0, 1]);

      // I3 only -> Y1=1, Y0=1, V=1
      res = tb.simulate([0, 0, 0, 1]);
      expect(res.outputs.map((p) => p.value)).toEqual([1, 1, 1]);
    });

    it('debe dar prioridad a I3 sobre I0, I1, I2 cuando están activas concurrentemente', () => {
      const enc = createComponent('PRIORITY_ENCODER_4TO2', 0, 0, 'Enc 4:2');
      const tb = createTestbench(enc);

      // I0=1, I1=1, I3=1 -> I3 must win
      const res = tb.simulate([1, 1, 0, 1]);
      expect(res.outputs[0].value).toBe(1); // Y1
      expect(res.outputs[1].value).toBe(1); // Y0
      expect(res.outputs[2].value).toBe(1); // V
    });
  });

  // 6. Codificador de Prioridad 8 a 3 bits
  describe('6. Codificador de Prioridad 8 a 3 bits (I7 > ... > I0)', () => {
    it('debe codificar individualmente de I0 a I7 a 3 bits binarios Y2..Y0', () => {
      for (let i = 0; i <= 7; i++) {
        const enc = createComponent('PRIORITY_ENCODER_8TO3', 0, 0, 'Enc 8:3');
        const tb = createTestbench(enc);

        const inputs = Array.from({ length: 8 }, (_, idx) => (idx === i ? 1 : 0) as 0 | 1);
        const res = tb.simulate(inputs);

        const Y2 = res.outputs[0].value as number;
        const Y1 = res.outputs[1].value as number;
        const Y0 = res.outputs[2].value as number;
        const V = res.outputs[3].value;

        expect(V).toBe(1);
        const code = (Y2 << 2) | (Y1 << 1) | Y0;
        expect(code).toBe(i);
      }
    });

    it('debe dar prioridad al índice mayor cuando múltiples entradas compiten', () => {
      const enc = createComponent('PRIORITY_ENCODER_8TO3', 0, 0, 'Enc 8:3');
      const tb = createTestbench(enc);

      const inputs = Array(8).fill(0) as (0 | 1)[];
      inputs[1] = 1;
      inputs[4] = 1;
      inputs[6] = 1; // 6 must win

      const res = tb.simulate(inputs);
      const Y2 = res.outputs[0].value;
      const Y1 = res.outputs[1].value;
      const Y0 = res.outputs[2].value;

      expect({ Y2, Y1, Y0 }).toEqual({ Y2: 1, Y1: 1, Y0: 0 }); // 6 = 110
    });
  });

  // 7. Decodificador Binario 2 a 4 líneas
  describe('7. Decodificador Binario 2 a 4 líneas con Enable (EN)', () => {
    it('debe activar exactamente una de las 4 salidas cuando EN = 1', () => {
      const combinations = [
        { A0: 0, A1: 0, expected: [1, 0, 0, 0] },
        { A0: 1, A1: 0, expected: [0, 1, 0, 0] },
        { A0: 0, A1: 1, expected: [0, 0, 1, 0] },
        { A0: 1, A1: 1, expected: [0, 0, 0, 1] },
      ];

      for (const comb of combinations) {
        const dec = createComponent('DECODER_2TO4', 0, 0, 'Dec 2:4');
        const tb = createTestbench(dec);

        // Inputs: A0, A1, EN
        const res = tb.simulate([comb.A0 as 0 | 1, comb.A1 as 0 | 1, 1]);
        expect(res.outputs.map((p) => p.value)).toEqual(comb.expected);
      }
    });

    it('debe forzar todas las salidas a 0 cuando EN = 0', () => {
      const dec = createComponent('DECODER_2TO4', 0, 0, 'Dec 2:4');
      const tb = createTestbench(dec);

      const res = tb.simulate([1, 1, 0]); // EN = 0
      expect(res.outputs.map((p) => p.value)).toEqual([0, 0, 0, 0]);
    });
  });

  // 8. Decodificador Binario 3 a 8 líneas
  describe('8. Decodificador Binario 3 a 8 líneas con Enable (EN)', () => {
    it('debe activar exactamente una de las 8 líneas Y0..Y7 cuando EN = 1', () => {
      for (let code = 0; code < 8; code++) {
        const dec = createComponent('DECODER_3TO8', 0, 0, 'Dec 3:8');
        const tb = createTestbench(dec);

        const a0 = (code & 1) as 0 | 1; // A0 (LSB)
        const a1 = ((code >> 1) & 1) as 0 | 1; // A1
        const a2 = ((code >> 2) & 1) as 0 | 1; // A2 (MSB)

        const res = tb.simulate([a0, a1, a2, 1]); // EN = 1
        const expected = [0, 0, 0, 0, 0, 0, 0, 0];
        expected[code] = 1;
        expect(res.outputs.map((p) => p.value)).toEqual(expected);
      }
    });

    it('debe desactivar todas las salidas cuando EN = 0', () => {
      const dec = createComponent('DECODER_3TO8', 0, 0, 'Dec 3:8');
      const tb = createTestbench(dec);

      const res = tb.simulate([1, 1, 1, 0]); // EN = 0
      expect(res.outputs.map((p) => p.value)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    });
  });

  // 9. Display de 7 Segmentos con terminales dedicadas y conexión a Decodificador BCD
  describe('9. Integración: Decodificador BCD conectado por cables a Display de 7 Segmentos', () => {
    it('debe encender los segmentos del display correctamente a través de cables en cátodo común', () => {
      // 4 Switches for BCD
      const swD = createComponent('SWITCH', 0, 0, 'SW_D');
      const swC = createComponent('SWITCH', 0, 40, 'SW_C');
      const swB = createComponent('SWITCH', 0, 80, 'SW_B');
      const swA = createComponent('SWITCH', 0, 120, 'SW_A');

      const bcd = createComponent('BCD_TO_7SEG', 200, 0, 'BCD Decod');
      bcd.state = { displayMode: 'cathode' };
      const display = createComponent('SEVEN_SEGMENT', 450, 0, 'Display');
      display.state = { displayMode: 'cathode' };

      // Set BCD input = 3 (0011 -> D=0, C=0, B=1, A=1)
      swD.state = { switchActive: false };
      swC.state = { switchActive: false };
      swB.state = { switchActive: true };
      swA.state = { switchActive: true };

      // Connect switches to BCD
      const wires: WireConnection[] = [
        { id: 'w_d', fromComponentId: swD.id, fromPinId: swD.outputs[0].id, toComponentId: bcd.id, toPinId: bcd.inputs[0].id, value: 0 },
        { id: 'w_c', fromComponentId: swC.id, fromPinId: swC.outputs[0].id, toComponentId: bcd.id, toPinId: bcd.inputs[1].id, value: 0 },
        { id: 'w_b', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: bcd.id, toPinId: bcd.inputs[2].id, value: 0 },
        { id: 'w_a', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: bcd.id, toPinId: bcd.inputs[3].id, value: 0 },
        // Connect 7 outputs of BCD to 7 inputs of Display
        ...[0, 1, 2, 3, 4, 5, 6].map((idx) => ({
          id: `wire_bcd_seg_${idx}`,
          fromComponentId: bcd.id,
          fromPinId: bcd.outputs[idx].id,
          toComponentId: display.id,
          toPinId: display.inputs[idx].id,
          value: 0 as const,
        })),
      ];

      // Simulate circuit step
      const stepRes = CircuitSimulator.step([swD, swC, swB, swA, bcd, display], wires);
      const evalDisplay = stepRes.components.find((c) => c.id === display.id)!;

      // In digit 3: a, b, c, d, g are lit, e and f are off
      expect(evalDisplay.state?.segLit?.a).toBe(true);
      expect(evalDisplay.state?.segLit?.b).toBe(true);
      expect(evalDisplay.state?.segLit?.c).toBe(true);
      expect(evalDisplay.state?.segLit?.d).toBe(true);
      expect(evalDisplay.state?.segLit?.e).toBe(false);
      expect(evalDisplay.state?.segLit?.f).toBe(false);
      expect(evalDisplay.state?.segLit?.g).toBe(true);
      expect(evalDisplay.state?.recognizedChar).toBe('3');
    });

    it('debe encender los segmentos del display en ánodo común cuando la señal es 0 (GND)', () => {
      const swD = createComponent('SWITCH', 0, 0, 'SW_D');
      const swC = createComponent('SWITCH', 0, 40, 'SW_C');
      const swB = createComponent('SWITCH', 0, 80, 'SW_B');
      const swA = createComponent('SWITCH', 0, 120, 'SW_A');

      const bcd = createComponent('BCD_TO_7SEG', 200, 0, 'BCD Ánodo');
      bcd.state = { displayMode: 'anode' };
      const display = createComponent('SEVEN_SEGMENT', 450, 0, 'Display Ánodo');
      display.state = { displayMode: 'anode' };

      // Set BCD input = 7 (0111 -> D=0, C=1, B=1, A=1)
      swD.state = { switchActive: false };
      swC.state = { switchActive: true };
      swB.state = { switchActive: true };
      swA.state = { switchActive: true };

      const wires: WireConnection[] = [
        { id: 'w_d', fromComponentId: swD.id, fromPinId: swD.outputs[0].id, toComponentId: bcd.id, toPinId: bcd.inputs[0].id, value: 0 },
        { id: 'w_c', fromComponentId: swC.id, fromPinId: swC.outputs[0].id, toComponentId: bcd.id, toPinId: bcd.inputs[1].id, value: 0 },
        { id: 'w_b', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: bcd.id, toPinId: bcd.inputs[2].id, value: 0 },
        { id: 'w_a', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: bcd.id, toPinId: bcd.inputs[3].id, value: 0 },
        ...[0, 1, 2, 3, 4, 5, 6].map((idx) => ({
          id: `wire_anode_${idx}`,
          fromComponentId: bcd.id,
          fromPinId: bcd.outputs[idx].id,
          toComponentId: display.id,
          toPinId: display.inputs[idx].id,
          value: 0 as const,
        })),
      ];

      const stepRes = CircuitSimulator.step([swD, swC, swB, swA, bcd, display], wires);
      const evalDisplay = stepRes.components.find((c) => c.id === display.id)!;

      // In digit 7: a, b, c are lit (their pin value is 0, which lights in anode mode!)
      expect(evalDisplay.state?.segLit?.a).toBe(true);
      expect(evalDisplay.state?.segLit?.b).toBe(true);
      expect(evalDisplay.state?.segLit?.c).toBe(true);
      expect(evalDisplay.state?.segLit?.d).toBe(false);
      expect(evalDisplay.state?.segLit?.e).toBe(false);
      expect(evalDisplay.state?.segLit?.f).toBe(false);
      expect(evalDisplay.state?.segLit?.g).toBe(false);
      expect(evalDisplay.state?.recognizedChar).toBe('7');
    });
  });
});
