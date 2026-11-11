import { describe, it, expect } from 'vitest';
import { CIRCUIT_PRESETS } from '../engines/circuit/presets';
import { CircuitSimulator, EvaluationResult } from '../engines/circuit/simulator';
import { CircuitComponent, WireConnection, LogicValue } from '../types';

/**
 * Helper to evaluate a preset circuit with specific input switch values
 */
function evaluateCircuitWithInputs(
  presetId: string,
  inputValues: Record<string, 0 | 1>
): Record<string, LogicValue> {
  const preset = CIRCUIT_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`Preset ${presetId} no encontrado`);

  const { components, connections } = preset.build();

  // Set switch states according to inputValues map
  components.forEach((comp) => {
    if (comp.type === 'SWITCH') {
      const cleanLabel = comp.label.replace(/^Entrada\s+/i, '').replace(/\s*\(.*\)/, '').trim();
      const matchedKey = Object.keys(inputValues).find(
        (k) => k.toUpperCase() === cleanLabel.toUpperCase() || k.toUpperCase() === comp.label.toUpperCase()
      );
      if (matchedKey !== undefined) {
        const val = inputValues[matchedKey];
        comp.state = { switchActive: val === 1 };
        if (comp.outputs[0]) comp.outputs[0].value = val;
      }
    }
  });

  // Relax simulation until stable
  let state: EvaluationResult = { components, connections, cycleDetected: false, warnings: [], errors: [] };
  for (let i = 0; i < 8; i++) {
    state = CircuitSimulator.step(state.components, state.connections, false);
  }

  // Collect output LED values
  const outputs: Record<string, LogicValue> = {};
  state.components.forEach((comp) => {
    if (comp.type === 'LED' || comp.type === 'OUTPUT_LED' || comp.type === 'OUTPUT_PIN') {
      const cleanLabel = comp.label.replace(/^Salida\s+/i, '').replace(/\s*\(.*\)/, '').trim();
      outputs[cleanLabel] = comp.inputs[0]?.value ?? 'X';
    }
  });

  return outputs;
}

describe('Prácticas de Sumadores - Verificación con Motor Real de Simulación', () => {
  describe('1. Semisumador (Half Adder)', () => {
    const truthTableCases: Array<{ A: 0 | 1; B: 0 | 1; S: 0 | 1; C: 0 | 1 }> = [
      { A: 0, B: 0, S: 0, C: 0 },
      { A: 0, B: 1, S: 1, C: 0 },
      { A: 1, B: 0, S: 1, C: 0 },
      { A: 1, B: 1, S: 0, C: 1 },
    ];

    it('verifica las 4 combinaciones en el Semisumador construido con compuertas discretas (XOR + AND)', () => {
      truthTableCases.forEach(({ A, B, S, C }) => {
        const results = evaluateCircuitWithInputs('half_adder_gates', { A, B });
        expect(results['S']).toBe(S);
        expect(results['C']).toBe(C);
      });
    });

    it('verifica las 4 combinaciones en el Semisumador con bloque reutilizable HALF_ADDER', () => {
      truthTableCases.forEach(({ A, B, S, C }) => {
        const results = evaluateCircuitWithInputs('half_adder', { A, B });
        expect(results['S']).toBe(S);
        expect(results['C']).toBe(C);
      });
    });
  });

  describe('2. Sumador Completo (Full Adder)', () => {
    const fullAdderCases: Array<{ A: 0 | 1; B: 0 | 1; Cin: 0 | 1; S: 0 | 1; Cout: 0 | 1 }> = [
      { A: 0, B: 0, Cin: 0, S: 0, Cout: 0 },
      { A: 0, B: 0, Cin: 1, S: 1, Cout: 0 },
      { A: 0, B: 1, Cin: 0, S: 1, Cout: 0 },
      { A: 0, B: 1, Cin: 1, S: 0, Cout: 1 },
      { A: 1, B: 0, Cin: 0, S: 1, Cout: 0 },
      { A: 1, B: 0, Cin: 1, S: 0, Cout: 1 },
      { A: 1, B: 1, Cin: 0, S: 0, Cout: 1 },
      { A: 1, B: 1, Cin: 1, S: 1, Cout: 1 },
    ];

    it('verifica las 8 combinaciones en el Sumador Completo con compuertas discretas (2 XOR, 2 AND, 1 OR)', () => {
      fullAdderCases.forEach(({ A, B, Cin, S, Cout }) => {
        const results = evaluateCircuitWithInputs('full_adder_gates', { A, B, Cin });
        expect(results['S']).toBe(S);
        expect(results['Cout']).toBe(Cout);
      });
    });

    it('verifica las 8 combinaciones en el Sumador Completo construido con 2 semisumadores + OR', () => {
      fullAdderCases.forEach(({ A, B, Cin, S, Cout }) => {
        const results = evaluateCircuitWithInputs('full_adder_two_ha', { A, B, Cin });
        expect(results['S']).toBe(S);
        expect(results['Cout']).toBe(Cout);
      });
    });

    it('verifica las 8 combinaciones en el Sumador Completo con bloque reutilizable FULL_ADDER', () => {
      fullAdderCases.forEach(({ A, B, Cin, S, Cout }) => {
        const results = evaluateCircuitWithInputs('full_adder_discrete', { A, B, Cin });
        expect(results['S']).toBe(S);
        expect(results['Cout']).toBe(Cout);
      });
    });
  });

  describe('3. Sumador de 4 Bits (Ripple Carry y Bloque)', () => {
    const testCases: Array<{
      aBin: string; // A3..A0
      bBin: string; // B3..B0
      cin: 0 | 1;
      expectedBin: string; // Cout S3 S2 S1 S0 (5 bits)
      desc: string;
    }> = [
      { aBin: '0111', bBin: '0010', cin: 0, expectedBin: '01001', desc: '0111 + 0010 = 01001 (7 + 2 = 9) [Requisito específico]' },
      { aBin: '1111', bBin: '1111', cin: 0, expectedBin: '11110', desc: '1111 + 1111 = 11110 (15 + 15 = 30) [Requisito específico]' },
      { aBin: '0000', bBin: '0000', cin: 0, expectedBin: '00000', desc: '0 + 0 = 0' },
      { aBin: '0001', bBin: '0001', cin: 0, expectedBin: '00010', desc: '1 + 1 = 2' },
      { aBin: '0011', bBin: '0101', cin: 0, expectedBin: '01000', desc: '3 + 5 = 8' },
      { aBin: '1000', bBin: '0111', cin: 0, expectedBin: '01111', desc: '8 + 7 = 15' },
      { aBin: '1010', bBin: '0101', cin: 0, expectedBin: '01111', desc: '10 + 5 = 15' },
      { aBin: '1100', bBin: '0011', cin: 0, expectedBin: '01111', desc: '12 + 3 = 15' },
      { aBin: '1111', bBin: '0001', cin: 0, expectedBin: '10000', desc: '15 + 1 = 16 (Genera Cout)' },
      { aBin: '1011', bBin: '0110', cin: 0, expectedBin: '10001', desc: '11 + 6 = 17' },
      { aBin: '0111', bBin: '0010', cin: 1, expectedBin: '01010', desc: '7 + 2 + Cin(1) = 10' },
    ];

    it('verifica cascada de 4 Sumadores Completos conectando correctamente los acarreos sucesivos', () => {
      testCases.forEach(({ aBin, bBin, cin, expectedBin, desc }) => {
        // aBin is A3 A2 A1 A0, bBin is B3 B2 B1 B0
        const inputRecord: Record<string, 0 | 1> = {
          'Cin': cin,
          'Cin (C0)': cin,
          'A0': parseInt(aBin[3], 10) as 0 | 1,
          'A1': parseInt(aBin[2], 10) as 0 | 1,
          'A2': parseInt(aBin[1], 10) as 0 | 1,
          'A3': parseInt(aBin[0], 10) as 0 | 1,
          'B0': parseInt(bBin[3], 10) as 0 | 1,
          'B1': parseInt(bBin[2], 10) as 0 | 1,
          'B2': parseInt(bBin[1], 10) as 0 | 1,
          'B3': parseInt(bBin[0], 10) as 0 | 1,
        };

        const results = evaluateCircuitWithInputs('adder_4bit_ripple', inputRecord);

        const cout = results['Cout'] ?? 0;
        const s3 = results['S3'] ?? 0;
        const s2 = results['S2'] ?? 0;
        const s1 = results['S1'] ?? 0;
        const s0 = results['S0'] ?? 0;
        const actualBin = `${cout}${s3}${s2}${s1}${s0}`;

        expect(actualBin, `Fallo en caso: ${desc}`).toBe(expectedBin);
      });
    });

    it('verifica el sumador de 4 bits integrado (ADDER_4BIT block) para todos los casos seleccionados', () => {
      testCases.forEach(({ aBin, bBin, cin, expectedBin, desc }) => {
        const inputRecord: Record<string, 0 | 1> = {
          'Cin': cin,
          'A0': parseInt(aBin[3], 10) as 0 | 1,
          'A1': parseInt(aBin[2], 10) as 0 | 1,
          'A2': parseInt(aBin[1], 10) as 0 | 1,
          'A3': parseInt(aBin[0], 10) as 0 | 1,
          'B0': parseInt(bBin[3], 10) as 0 | 1,
          'B1': parseInt(bBin[2], 10) as 0 | 1,
          'B2': parseInt(bBin[1], 10) as 0 | 1,
          'B3': parseInt(bBin[0], 10) as 0 | 1,
        };

        const results = evaluateCircuitWithInputs('adder_4bit_block', inputRecord);

        const cout = results['Cout'] ?? 0;
        const s3 = results['S3'] ?? 0;
        const s2 = results['S2'] ?? 0;
        const s1 = results['S1'] ?? 0;
        const s0 = results['S0'] ?? 0;
        const actualBin = `${cout}${s3}${s2}${s1}${s0}`;

        expect(actualBin, `Fallo en caso: ${desc}`).toBe(expectedBin);
      });
    });
  });
});
