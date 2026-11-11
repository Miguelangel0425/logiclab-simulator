/**
 * LogicLab - Academic Laboratory Challenges & Testbench Engine
 * Real automated circuit validation for combinational, sequential, and MSI logic.
 */

import { CircuitComponent, WireConnection, LogicValue } from '../types';
import { createComponent } from '../engines/circuit/generator';
import { CircuitSimulator } from '../engines/circuit/simulator';

export interface TestVector {
  description?: string;
  inputs: Record<string, 0 | 1>;
  expectedOutputs: Record<string, 0 | 1>;
  clockPulses?: number;
}

export interface LabChallenge {
  id: string;
  title: string;
  category: 'Combinacional' | 'Secuencial' | 'Aritmética' | 'MSI';
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  objective: string;
  description: string;
  theory: string;
  inputNames: string[];
  outputNames: string[];
  testVectors: TestVector[];
  initialCircuit: () => { components: CircuitComponent[]; connections: WireConnection[] };
  solutionHint: string;
}

export interface TestVectorResult {
  vectorIndex: number;
  description?: string;
  inputs: Record<string, 0 | 1>;
  expected: Record<string, 0 | 1>;
  actual: Record<string, 0 | 1 | string>;
  passed: boolean;
  details?: string;
}

export interface ChallengeEvaluationResult {
  challengeId: string;
  challengeTitle: string;
  studentName: string;
  score: number; // 0 to 100
  passedCount: number;
  totalCount: number;
  vectorResults: TestVectorResult[];
  evaluatedAt: number;
  verificationHash: string;
}

/**
 * Generate a tamper-evident academic verification code
 */
function generateVerificationCode(student: string, challengeId: string, score: number, timestamp: number): string {
  const seed = `${student.trim().toUpperCase()}_${challengeId}_${score}_${timestamp}_LOGICLAB_ACADEMIC_KEY`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  const timeHex = (timestamp % 0xffff).toString(16).toUpperCase().padStart(4, '0');
  return `LL-${hex.slice(0, 4)}-${timeHex}-${hex.slice(4, 8)}`;
}

export const LAB_CHALLENGES: LabChallenge[] = [
  {
    id: 'challenge_parity',
    title: 'Reto 1: Generador de Paridad Par de 3 Bits',
    category: 'Combinacional',
    difficulty: 'Básico',
    objective: 'Diseñar un circuito que genere un bit de paridad P tal que el número total de unos en (D0, D1, D2, P) sea siempre par.',
    description: 'Recibe tres bits de entrada (D0, D1, D2) y genera la salida P = D0 ⊕ D1 ⊕ D2. P valdrá 1 si la cantidad de unos en las entradas es impar, forzando a que la palabra de 4 bits tenga paridad par.',
    theory: 'En telecomunicaciones y memorias digitales, la comprobación de paridad es una de las técnicas más extendidas para detección de errores en palabras transmitidas. La función XOR en cascada actúa como sumador de módulo 2.',
    inputNames: ['D0', 'D1', 'D2'],
    outputNames: ['P'],
    testVectors: [
      { description: '0 unos (par) -> P=0', inputs: { D0: 0, D1: 0, D2: 0 }, expectedOutputs: { P: 0 } },
      { description: '1 uno (impar) -> P=1', inputs: { D0: 1, D1: 0, D2: 0 }, expectedOutputs: { P: 1 } },
      { description: '1 uno (impar) -> P=1', inputs: { D0: 0, D1: 1, D2: 0 }, expectedOutputs: { P: 1 } },
      { description: '2 unos (par) -> P=0', inputs: { D0: 1, D1: 1, D2: 0 }, expectedOutputs: { P: 0 } },
      { description: '1 uno (impar) -> P=1', inputs: { D0: 0, D1: 0, D2: 1 }, expectedOutputs: { P: 1 } },
      { description: '2 unos (par) -> P=0', inputs: { D0: 1, D1: 0, D2: 1 }, expectedOutputs: { P: 0 } },
      { description: '2 unos (par) -> P=0', inputs: { D0: 0, D1: 1, D2: 1 }, expectedOutputs: { P: 0 } },
      { description: '3 unos (impar) -> P=1', inputs: { D0: 1, D1: 1, D2: 1 }, expectedOutputs: { P: 1 } },
    ],
    initialCircuit: () => {
      const sw0 = createComponent('SWITCH', 60, 80, 'D0');
      const sw1 = createComponent('SWITCH', 60, 180, 'D1');
      const sw2 = createComponent('SWITCH', 60, 280, 'D2');
      const xor1 = createComponent('XOR', 280, 120, 'XOR 1', 2);
      const xor2 = createComponent('XOR', 460, 180, 'XOR 2', 2);
      const ledP = createComponent('LED', 640, 180, 'P');

      const connections: WireConnection[] = [
        { id: 'w1', fromComponentId: sw0.id, fromPinId: sw0.outputs[0].id, toComponentId: xor1.id, toPinId: xor1.inputs[0].id, value: 0 },
        { id: 'w2', fromComponentId: sw1.id, fromPinId: sw1.outputs[0].id, toComponentId: xor1.id, toPinId: xor1.inputs[1].id, value: 0 },
        { id: 'w3', fromComponentId: xor1.id, fromPinId: xor1.outputs[0].id, toComponentId: xor2.id, toPinId: xor2.inputs[0].id, value: 0 },
        { id: 'w4', fromComponentId: sw2.id, fromPinId: sw2.outputs[0].id, toComponentId: xor2.id, toPinId: xor2.inputs[1].id, value: 0 },
        { id: 'w5', fromComponentId: xor2.id, fromPinId: xor2.outputs[0].id, toComponentId: ledP.id, toPinId: ledP.inputs[0].id, value: 0 },
      ];
      return { components: [sw0, sw1, sw2, xor1, xor2, ledP], connections };
    },
    solutionHint: 'Conecta D0 y D1 a una compuerta XOR, y la salida de esta a una segunda XOR con D2. La salida final se conecta al indicador LED P.',
  },
  {
    id: 'challenge_universal_nand',
    title: 'Reto 2: Lógica Universal NAND: F = A·B + C\'',
    category: 'Combinacional',
    difficulty: 'Intermedio',
    objective: 'Implementar la función booleana F(A,B,C) = A·B + C\' usando exclusivamente compuertas NAND de 2 entradas.',
    description: 'Aplica el Teorema de De Morgan para convertir la suma de productos en compuertas NAND equivalentes: F = ((A·B)\' · (C\')\')\'. Requiere un inversor NAND para C\' y compuertas NAND adicionales.',
    theory: 'El conjunto de compuertas {NAND} constituye una base booleana funcionalmente completa. Cualquier circuito combinacional de la electrónica digital puede ser fabricado en su totalidad utilizando un único tipo de circuito integrado TTL 7400.',
    inputNames: ['A', 'B', 'C'],
    outputNames: ['F'],
    testVectors: [
      { description: '0 0 0 -> F = 0 + 1 = 1', inputs: { A: 0, B: 0, C: 0 }, expectedOutputs: { F: 1 } },
      { description: '0 0 1 -> F = 0 + 0 = 0', inputs: { A: 0, B: 0, C: 1 }, expectedOutputs: { F: 0 } },
      { description: '0 1 0 -> F = 0 + 1 = 1', inputs: { A: 0, B: 1, C: 0 }, expectedOutputs: { F: 1 } },
      { description: '0 1 1 -> F = 0 + 0 = 0', inputs: { A: 0, B: 1, C: 1 }, expectedOutputs: { F: 0 } },
      { description: '1 0 0 -> F = 0 + 1 = 1', inputs: { A: 1, B: 0, C: 0 }, expectedOutputs: { F: 1 } },
      { description: '1 0 1 -> F = 0 + 0 = 0', inputs: { A: 1, B: 0, C: 1 }, expectedOutputs: { F: 0 } },
      { description: '1 1 0 -> F = 1 + 1 = 1', inputs: { A: 1, B: 1, C: 0 }, expectedOutputs: { F: 1 } },
      { description: '1 1 1 -> F = 1 + 0 = 1', inputs: { A: 1, B: 1, C: 1 }, expectedOutputs: { F: 1 } },
    ],
    initialCircuit: () => {
      const swA = createComponent('SWITCH', 60, 80, 'A');
      const swB = createComponent('SWITCH', 60, 170, 'B');
      const swC = createComponent('SWITCH', 60, 260, 'C');

      // NAND 1: (A·B)'
      const nand1 = createComponent('NAND', 260, 110, 'NAND 1 (A·B)\'', 2);
      // NAND 2: Inversor C -> (C·C)' = C'
      const nandC = createComponent('NAND', 260, 250, 'NAND Inv (C\')', 2);
      // NAND 3: Inversor de C' para obtener C doble negado en NAND final
      const nand3 = createComponent('NAND', 430, 250, 'NAND (C\'\')\'', 2);
      // Output NAND
      const nandOut = createComponent('NAND', 580, 170, 'NAND Final', 2);
      const ledF = createComponent('LED', 740, 175, 'F');

      const connections: WireConnection[] = [
        { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: nand1.id, toPinId: nand1.inputs[0].id, value: 0 },
        { id: 'w2', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: nand1.id, toPinId: nand1.inputs[1].id, value: 0 },
        { id: 'w3', fromComponentId: swC.id, fromPinId: swC.outputs[0].id, toComponentId: nandC.id, toPinId: nandC.inputs[0].id, value: 0 },
        { id: 'w4', fromComponentId: swC.id, fromPinId: swC.outputs[0].id, toComponentId: nandC.id, toPinId: nandC.inputs[1].id, value: 0 },
        { id: 'w5', fromComponentId: nandC.id, fromPinId: nandC.outputs[0].id, toComponentId: nand3.id, toPinId: nand3.inputs[0].id, value: 0 },
        { id: 'w6', fromComponentId: nandC.id, fromPinId: nandC.outputs[0].id, toComponentId: nand3.id, toPinId: nand3.inputs[1].id, value: 0 },
        { id: 'w7', fromComponentId: nand1.id, fromPinId: nand1.outputs[0].id, toComponentId: nandOut.id, toPinId: nandOut.inputs[0].id, value: 0 },
        { id: 'w8', fromComponentId: nand3.id, fromPinId: nand3.outputs[0].id, toComponentId: nandOut.id, toPinId: nandOut.inputs[1].id, value: 0 },
        { id: 'w9', fromComponentId: nandOut.id, fromPinId: nandOut.outputs[0].id, toComponentId: ledF.id, toPinId: ledF.inputs[0].id, value: 0 },
      ];
      return { components: [swA, swB, swC, nand1, nandC, nand3, nandOut, ledF], connections };
    },
    solutionHint: 'F = ((A·B)\' · (C)\')\'. Une la salida de (A·B)\' y de C\' a través de la etapa final NAND para verificar la ley de De Morgan.',
  },
  {
    id: 'challenge_comp_2bit',
    title: 'Reto 3: Comparador de Magnitud de 2 Bits',
    category: 'Aritmética',
    difficulty: 'Intermedio',
    objective: 'Verificar la comparación binaria entre dos palabras de 2 bits A = (A1, A0) y B = (B1, B0), activando las salidas A_GT_B, A_EQ_B y A_LT_B.',
    description: 'Compara números en el rango de 0 a 3. Se debe activar una y sólo una de las tres salidas: A>B si A > B; A=B si A == B; A<B si A < B.',
    theory: 'El comparador de magnitud digital opera evaluando primero los bits más significativos (MSB). Si A1 != B1, el resultado queda determinado. Si A1 == B1, se evalúan los bits menos significativos A0 y B0.',
    inputNames: ['A1', 'A0', 'B1', 'B0'],
    outputNames: ['A_GT_B', 'A_EQ_B', 'A_LT_B'],
    testVectors: [
      { description: 'A=0, B=0 -> A=B', inputs: { A1: 0, A0: 0, B1: 0, B0: 0 }, expectedOutputs: { A_GT_B: 0, A_EQ_B: 1, A_LT_B: 0 } },
      { description: 'A=0, B=1 -> A<B', inputs: { A1: 0, A0: 0, B1: 0, B0: 1 }, expectedOutputs: { A_GT_B: 0, A_EQ_B: 0, A_LT_B: 1 } },
      { description: 'A=1, B=0 -> A>B', inputs: { A1: 0, A0: 1, B1: 0, B0: 0 }, expectedOutputs: { A_GT_B: 1, A_EQ_B: 0, A_LT_B: 0 } },
      { description: 'A=1, B=1 -> A=B', inputs: { A1: 0, A0: 1, B1: 0, B0: 1 }, expectedOutputs: { A_GT_B: 0, A_EQ_B: 1, A_LT_B: 0 } },
      { description: 'A=2, B=1 -> A>B', inputs: { A1: 1, A0: 0, B1: 0, B0: 1 }, expectedOutputs: { A_GT_B: 1, A_EQ_B: 0, A_LT_B: 0 } },
      { description: 'A=2, B=3 -> A<B', inputs: { A1: 1, A0: 0, B1: 1, B0: 1 }, expectedOutputs: { A_GT_B: 0, A_EQ_B: 0, A_LT_B: 1 } },
      { description: 'A=3, B=2 -> A>B', inputs: { A1: 1, A0: 1, B1: 1, B0: 0 }, expectedOutputs: { A_GT_B: 1, A_EQ_B: 0, A_LT_B: 0 } },
      { description: 'A=3, B=3 -> A=B', inputs: { A1: 1, A0: 1, B1: 1, B0: 1 }, expectedOutputs: { A_GT_B: 0, A_EQ_B: 1, A_LT_B: 0 } },
    ],
    initialCircuit: () => {
      const swA1 = createComponent('SWITCH', 60, 60, 'A1');
      const swA0 = createComponent('SWITCH', 60, 140, 'A0');
      const swB1 = createComponent('SWITCH', 60, 240, 'B1');
      const swB0 = createComponent('SWITCH', 60, 320, 'B0');

      // 74LS85 4-Bit Comparator
      const comp = createComponent('IC_74LS85', 280, 130, '74LS85');
      const ledGt = createComponent('LED', 520, 120, 'A_GT_B');
      const ledEq = createComponent('LED', 520, 190, 'A_EQ_B');
      const ledLt = createComponent('LED', 520, 260, 'A_LT_B');

      const connections: WireConnection[] = [
        // A1 -> A1 (pin idx 2), A0 -> A0 (pin idx 3), A3=0, A2=0
        { id: 'w1', fromComponentId: swA1.id, fromPinId: swA1.outputs[0].id, toComponentId: comp.id, toPinId: comp.inputs[2].id, value: 0 },
        { id: 'w2', fromComponentId: swA0.id, fromPinId: swA0.outputs[0].id, toComponentId: comp.id, toPinId: comp.inputs[3].id, value: 0 },
        // B1 -> B1 (pin idx 6), B0 -> B0 (pin idx 7)
        { id: 'w3', fromComponentId: swB1.id, fromPinId: swB1.outputs[0].id, toComponentId: comp.id, toPinId: comp.inputs[6].id, value: 0 },
        { id: 'w4', fromComponentId: swB0.id, fromPinId: swB0.outputs[0].id, toComponentId: comp.id, toPinId: comp.inputs[7].id, value: 0 },
        // Outputs
        { id: 'w5', fromComponentId: comp.id, fromPinId: comp.outputs[0].id, toComponentId: ledGt.id, toPinId: ledGt.inputs[0].id, value: 0 },
        { id: 'w6', fromComponentId: comp.id, fromPinId: comp.outputs[1].id, toComponentId: ledEq.id, toPinId: ledEq.inputs[0].id, value: 0 },
        { id: 'w7', fromComponentId: comp.id, fromPinId: comp.outputs[2].id, toComponentId: ledLt.id, toPinId: ledLt.inputs[0].id, value: 0 },
      ];
      return { components: [swA1, swA0, swB1, swB0, comp, ledGt, ledEq, ledLt], connections };
    },
    solutionHint: 'Conecta A1, A0 en los bits 1 y 0 de A, y B1, B0 en los bits 1 y 0 de B del circuito 74LS85. Las entradas superiores A3, A2, B3, B2 se mantienen en 0.',
  },
  {
    id: 'challenge_bcd_detector',
    title: 'Reto 4: Validador y Detector de Código BCD Inválido (10 a 15)',
    category: 'MSI',
    difficulty: 'Intermedio',
    objective: 'Construir un circuito detector de combinaciones inválidas en BCD (números 1010₂ a 1111₂, del 10 al 15 decimal).',
    description: 'En el código BCD de 4 bits (D3, D2, D1, D0), los valores 0 a 9 son válidos (VAL=1, INV=0). Si el valor es mayor o igual a 10, la señal INV debe activarse a 1 (INV = D3·D2 + D3·D1 = D3·(D2 + D1)).',
    theory: 'El código BCD empaquetado solo aprovecha 10 de las 16 combinaciones binarias de un nibble de 4 bits. Los 6 estados restantes son estados prohibidos y requieren detección para evitar fallos en procesadores o displays.',
    inputNames: ['D3', 'D2', 'D1', 'D0'],
    outputNames: ['VAL', 'INV'],
    testVectors: [
      { description: 'BCD 0 -> Válido', inputs: { D3: 0, D2: 0, D1: 0, D0: 0 }, expectedOutputs: { VAL: 1, INV: 0 } },
      { description: 'BCD 5 -> Válido', inputs: { D3: 0, D2: 1, D1: 0, D0: 1 }, expectedOutputs: { VAL: 1, INV: 0 } },
      { description: 'BCD 9 -> Válido', inputs: { D3: 1, D2: 0, D1: 0, D0: 1 }, expectedOutputs: { VAL: 1, INV: 0 } },
      { description: 'Bin 10 (1010) -> Inválido', inputs: { D3: 1, D2: 0, D1: 1, D0: 0 }, expectedOutputs: { VAL: 0, INV: 1 } },
      { description: 'Bin 11 (1011) -> Inválido', inputs: { D3: 1, D2: 0, D1: 1, D0: 1 }, expectedOutputs: { VAL: 0, INV: 1 } },
      { description: 'Bin 12 (1100) -> Inválido', inputs: { D3: 1, D2: 1, D1: 0, D0: 0 }, expectedOutputs: { VAL: 0, INV: 1 } },
      { description: 'Bin 14 (1110) -> Inválido', inputs: { D3: 1, D2: 1, D1: 1, D0: 0 }, expectedOutputs: { VAL: 0, INV: 1 } },
      { description: 'Bin 15 (1111) -> Inválido', inputs: { D3: 1, D2: 1, D1: 1, D0: 1 }, expectedOutputs: { VAL: 0, INV: 1 } },
    ],
    initialCircuit: () => {
      const sw3 = createComponent('SWITCH', 60, 60, 'D3');
      const sw2 = createComponent('SWITCH', 60, 140, 'D2');
      const sw1 = createComponent('SWITCH', 60, 220, 'D1');
      const sw0 = createComponent('SWITCH', 60, 300, 'D0');

      const orGate = createComponent('OR', 260, 180, 'OR (D2+D1)', 2);
      const andGate = createComponent('AND', 420, 130, 'AND D3·(D2+D1)', 2);
      const notGate = createComponent('NOT', 560, 240, 'NOT Inv');
      const ledInv = createComponent('LED', 680, 130, 'INV');
      const ledVal = createComponent('LED', 680, 240, 'VAL');

      const connections: WireConnection[] = [
        { id: 'w1', fromComponentId: sw2.id, fromPinId: sw2.outputs[0].id, toComponentId: orGate.id, toPinId: orGate.inputs[0].id, value: 0 },
        { id: 'w2', fromComponentId: sw1.id, fromPinId: sw1.outputs[0].id, toComponentId: orGate.id, toPinId: orGate.inputs[1].id, value: 0 },
        { id: 'w3', fromComponentId: sw3.id, fromPinId: sw3.outputs[0].id, toComponentId: andGate.id, toPinId: andGate.inputs[0].id, value: 0 },
        { id: 'w4', fromComponentId: orGate.id, fromPinId: orGate.outputs[0].id, toComponentId: andGate.id, toPinId: andGate.inputs[1].id, value: 0 },
        { id: 'w5', fromComponentId: andGate.id, fromPinId: andGate.outputs[0].id, toComponentId: ledInv.id, toPinId: ledInv.inputs[0].id, value: 0 },
        { id: 'w6', fromComponentId: andGate.id, fromPinId: andGate.outputs[0].id, toComponentId: notGate.id, toPinId: notGate.inputs[0].id, value: 0 },
        { id: 'w7', fromComponentId: notGate.id, fromPinId: notGate.outputs[0].id, toComponentId: ledVal.id, toPinId: ledVal.inputs[0].id, value: 0 },
      ];
      return { components: [sw3, sw2, sw1, sw0, orGate, andGate, notGate, ledInv, ledVal], connections };
    },
    solutionHint: 'La función mínima para detectar números mayores a 9 es INV = D3·D2 + D3·D1 = D3·(D2+D1). La señal VAL es la negación de INV.',
  },
  {
    id: 'challenge_counter_mod6',
    title: 'Reto 5: Contador Asíncrono Módulo 6 (0 a 5)',
    category: 'Secuencial',
    difficulty: 'Avanzado',
    objective: 'Diseñar un contador digital cíclico que cuente exactamente desde 0 hasta 5 (000₂ a 101₂) y se reinicie automáticamente a 0 en el sexto pulso.',
    description: 'Utilizando el contador 74LS90 configurado en cascada (QA conectado a CLK B), las líneas de salida QB (2) y QC (4) se conectan a los pines de reset R0(1) y R0(2). Al alcanzar el estado 6 (QD=0, QC=1, QB=1, QA=0), el contador se resetea inmediatamente a 0.',
    theory: 'El truncamiento de secuencia en contadores asíncronos permite sintetizar cualquier módulo arbitrario M conectando las salidas que conforman el número M en binario a las entradas asíncronas de borrado (CLEAR / R0).',
    inputNames: ['CLK', 'RST'],
    outputNames: ['QC', 'QB', 'QA'],
    testVectors: [
      { description: 'Reset inicial -> Cuenta 000', inputs: { CLK: 0, RST: 1 }, expectedOutputs: { QC: 0, QB: 0, QA: 0 }, clockPulses: 0 },
      { description: 'Pulso 1 -> Cuenta 001 (1)', inputs: { CLK: 1, RST: 0 }, expectedOutputs: { QC: 0, QB: 0, QA: 1 }, clockPulses: 1 },
      { description: 'Pulso 2 -> Cuenta 010 (2)', inputs: { CLK: 1, RST: 0 }, expectedOutputs: { QC: 0, QB: 1, QA: 0 }, clockPulses: 1 },
      { description: 'Pulso 3 -> Cuenta 011 (3)', inputs: { CLK: 1, RST: 0 }, expectedOutputs: { QC: 0, QB: 1, QA: 1 }, clockPulses: 1 },
      { description: 'Pulso 4 -> Cuenta 100 (4)', inputs: { CLK: 1, RST: 0 }, expectedOutputs: { QC: 1, QB: 0, QA: 0 }, clockPulses: 1 },
      { description: 'Pulso 5 -> Cuenta 101 (5)', inputs: { CLK: 1, RST: 0 }, expectedOutputs: { QC: 1, QB: 0, QA: 1 }, clockPulses: 1 },
      { description: 'Pulso 6 -> Auto-reset a 000 (0)', inputs: { CLK: 1, RST: 0 }, expectedOutputs: { QC: 0, QB: 0, QA: 0 }, clockPulses: 1 },
    ],
    initialCircuit: () => {
      const clk = createComponent('CLOCK', 60, 80, 'CLK');
      const rst = createComponent('SWITCH', 60, 200, 'RST');
      const ic90 = createComponent('IC_74LS90', 260, 100, '74LS90 Mod-6');
      const ledA = createComponent('LED', 520, 80, 'QA');
      const ledB = createComponent('LED', 520, 160, 'QB');
      const ledC = createComponent('LED', 520, 240, 'QC');

      const connections: WireConnection[] = [
        // CLK to CLK A
        { id: 'w1', fromComponentId: clk.id, fromPinId: clk.outputs[0].id, toComponentId: ic90.id, toPinId: ic90.inputs[0].id, value: 0 },
        // QA to CLK B (Cascade mod-2 into mod-5)
        { id: 'w2', fromComponentId: ic90.id, fromPinId: ic90.outputs[0].id, toComponentId: ic90.id, toPinId: ic90.inputs[1].id, value: 0 },
        // QB to R0(1) (Pin idx 2) & QC to R0(2) (Pin idx 3) -> Reset on 6 (QC=1, QB=1)
        { id: 'w3', fromComponentId: ic90.id, fromPinId: ic90.outputs[1].id, toComponentId: ic90.id, toPinId: ic90.inputs[2].id, value: 0 },
        { id: 'w4', fromComponentId: ic90.id, fromPinId: ic90.outputs[2].id, toComponentId: ic90.id, toPinId: ic90.inputs[3].id, value: 0 },
        // Output LEDs
        { id: 'w5', fromComponentId: ic90.id, fromPinId: ic90.outputs[0].id, toComponentId: ledA.id, toPinId: ledA.inputs[0].id, value: 0 },
        { id: 'w6', fromComponentId: ic90.id, fromPinId: ic90.outputs[1].id, toComponentId: ledB.id, toPinId: ledB.inputs[0].id, value: 0 },
        { id: 'w7', fromComponentId: ic90.id, fromPinId: ic90.outputs[2].id, toComponentId: ledC.id, toPinId: ledC.inputs[0].id, value: 0 },
      ];
      return { components: [clk, rst, ic90, ledA, ledB, ledC], connections };
    },
    solutionHint: 'Para truncar el conteo en 6 (0110₂), puentea QA a CLK B, y conecta la salida QB a R0(1) y la salida QC a R0(2).',
  },
  {
    id: 'challenge_shift_ring',
    title: 'Reto 6: Registro de Desplazamiento Universal 74LS194',
    category: 'Secuencial',
    difficulty: 'Avanzado',
    objective: 'Operar el registro universal 74LS194 comprobando carga paralela de 1100₂ y posterior desplazamiento a la derecha (Shift Right).',
    description: 'Carga el dato binario 1100₂ en los pines D0..D3 con S1=1, S0=1, y en los siguientes ciclos conmuta a Shift Right (S1=0, S0=1 con entrada serie SR=0) observando el vaciado paulatino del registro.',
    theory: 'El 74LS194 es uno de los registros MSI más versátiles de la serie TTL, permitiendo cuatro modos síncronos de operación seleccionados por las líneas S1 y S0, y borrado maestro asíncrono activo en bajo.',
    inputNames: ['S1', 'S0', 'SR', 'CLK'],
    outputNames: ['Q0', 'Q1', 'Q2', 'Q3'],
    testVectors: [
      { description: 'Carga Paralela 1100₂ (S1=1, S0=1)', inputs: { S1: 1, S0: 1, SR: 0, CLK: 1 }, expectedOutputs: { Q0: 1, Q1: 1, Q2: 0, Q3: 0 }, clockPulses: 1 },
      { description: 'Shift Right 1er pulso -> 0110₂ (S1=0, S0=1, SR=0)', inputs: { S1: 0, S0: 1, SR: 0, CLK: 1 }, expectedOutputs: { Q0: 0, Q1: 1, Q2: 1, Q3: 0 }, clockPulses: 1 },
      { description: 'Shift Right 2do pulso -> 0011₂', inputs: { S1: 0, S0: 1, SR: 0, CLK: 1 }, expectedOutputs: { Q0: 0, Q1: 0, Q2: 1, Q3: 1 }, clockPulses: 1 },
      { description: 'Shift Right 3er pulso -> 0001₂', inputs: { S1: 0, S0: 1, SR: 0, CLK: 1 }, expectedOutputs: { Q0: 0, Q1: 0, Q2: 0, Q3: 1 }, clockPulses: 1 },
      { description: 'Shift Right 4to pulso -> 0000₂', inputs: { S1: 0, S0: 1, SR: 0, CLK: 1 }, expectedOutputs: { Q0: 0, Q1: 0, Q2: 0, Q3: 0 }, clockPulses: 1 },
    ],
    initialCircuit: () => {
      const swS1 = createComponent('SWITCH', 60, 60, 'S1');
      const swS0 = createComponent('SWITCH', 60, 140, 'S0');
      const swSR = createComponent('SWITCH', 60, 220, 'SR');
      const clk = createComponent('CLOCK', 60, 300, 'CLK');

      const ic194 = createComponent('IC_74LS194', 280, 110, '74LS194');
      // Set initial parallel inputs D0=1, D1=1, D2=0, D3=0 on the IC inputs
      const d0Pin = ic194.inputs.find((p) => p.name === 'D0'); if (d0Pin) d0Pin.value = 1;
      const d1Pin = ic194.inputs.find((p) => p.name === 'D1'); if (d1Pin) d1Pin.value = 1;
      const d2Pin = ic194.inputs.find((p) => p.name === 'D2'); if (d2Pin) d2Pin.value = 0;
      const d3Pin = ic194.inputs.find((p) => p.name === 'D3'); if (d3Pin) d3Pin.value = 0;

      const led0 = createComponent('LED', 540, 50, 'Q0');
      const led1 = createComponent('LED', 540, 110, 'Q1');
      const led2 = createComponent('LED', 540, 170, 'Q2');
      const led3 = createComponent('LED', 540, 230, 'Q3');

      const connections: WireConnection[] = [
        { id: 'w1', fromComponentId: swS0.id, fromPinId: swS0.outputs[0].id, toComponentId: ic194.id, toPinId: ic194.inputs[2].id, value: 0 },
        { id: 'w2', fromComponentId: swS1.id, fromPinId: swS1.outputs[0].id, toComponentId: ic194.id, toPinId: ic194.inputs[3].id, value: 0 },
        { id: 'w3', fromComponentId: swSR.id, fromPinId: swSR.outputs[0].id, toComponentId: ic194.id, toPinId: ic194.inputs[4].id, value: 0 },
        { id: 'w4', fromComponentId: clk.id, fromPinId: clk.outputs[0].id, toComponentId: ic194.id, toPinId: ic194.inputs[1].id, value: 0 },
        { id: 'w5', fromComponentId: ic194.id, fromPinId: ic194.outputs[0].id, toComponentId: led0.id, toPinId: led0.inputs[0].id, value: 0 },
        { id: 'w6', fromComponentId: ic194.id, fromPinId: ic194.outputs[1].id, toComponentId: led1.id, toPinId: led1.inputs[0].id, value: 0 },
        { id: 'w7', fromComponentId: ic194.id, fromPinId: ic194.outputs[2].id, toComponentId: led2.id, toPinId: led2.inputs[0].id, value: 0 },
        { id: 'w8', fromComponentId: ic194.id, fromPinId: ic194.outputs[3].id, toComponentId: led3.id, toPinId: led3.inputs[0].id, value: 0 },
      ];
      return { components: [swS1, swS0, swSR, clk, ic194, led0, led1, led2, led3], connections };
    },
    solutionHint: 'Conecta S1 y S0 a los selectores de modo y el interruptor SR a la entrada serie para desplazamiento a la derecha.',
  },
];

/**
 * Execute automated testbench evaluation on a circuit
 */
export function runChallengeTestbench(
  circuit: { components: CircuitComponent[]; connections: WireConnection[] },
  challenge: LabChallenge,
  studentName = 'Estudiante de Laboratorio'
): ChallengeEvaluationResult {
  // Deep clone components and connections so testing doesn't alter the live canvas state
  const testComponents: CircuitComponent[] = JSON.parse(JSON.stringify(circuit.components));
  const testConnections: WireConnection[] = JSON.parse(JSON.stringify(circuit.connections));

  const vectorResults: TestVectorResult[] = [];
  let passedCount = 0;

  // Locate input switches / sources in circuit matching challenge input names
  const inputMap: Record<string, CircuitComponent> = {};
  for (const name of challenge.inputNames) {
    const cleanName = name.trim().toUpperCase();
    const found = testComponents.find((c) => {
      const lbl = (c.label || '').trim().toUpperCase();
      return lbl === cleanName || lbl.includes(cleanName) || c.inputs.some((p) => p.name.toUpperCase() === cleanName);
    });
    if (found) inputMap[name] = found;
  }

  // Locate output indicators (LEDs / probes) in circuit matching challenge output names
  const outputMap: Record<string, CircuitComponent> = {};
  for (const name of challenge.outputNames) {
    const cleanName = name.trim().toUpperCase();
    const found = testComponents.find((c) => {
      const lbl = (c.label || '').trim().toUpperCase();
      return lbl === cleanName || lbl.includes(cleanName) || c.outputs.some((p) => p.name.toUpperCase() === cleanName);
    });
    if (found) outputMap[name] = found;
  }

  let currentComps = testComponents;
  let currentConns = testConnections;

  // Run each test vector in order
  for (let idx = 0; idx < challenge.testVectors.length; idx++) {
    const vector = challenge.testVectors[idx];

    // Apply vector inputs to circuit switches
    for (const [inName, inVal] of Object.entries(vector.inputs)) {
      const cleanName = inName.trim().toUpperCase();
      const comp =
        currentComps.find(
          (c) =>
            (c.type === 'SWITCH' || c.type === 'CLOCK' || c.type === 'PUSH_BUTTON') &&
            (c.label || '').trim().toUpperCase() === cleanName
        ) ||
        currentComps.find(
          (c) =>
            (c.type === 'SWITCH' || c.type === 'CLOCK' || c.type === 'PUSH_BUTTON') &&
            (c.label || '').trim().toUpperCase().endsWith(cleanName)
        ) ||
        currentComps.find((c) => (c.label || '').trim().toUpperCase() === cleanName);

      if (comp) {
        if (!comp.state) comp.state = {};
        comp.state.switchActive = inVal === 1;
        comp.state.buttonPressed = inVal === 1;
        if (comp.outputs[0]) {
          comp.outputs[0].value = inVal;
        }
      }
    }

    // Step the simulation engine
    if (vector.clockPulses && vector.clockPulses > 0) {
      for (let p = 0; p < vector.clockPulses; p++) {
        // Toggle clock: 0 -> 1 -> 0
        const clkComp = currentComps.find((c) => c.type === 'CLOCK' || (c.label || '').toUpperCase().includes('CLK'));
        if (clkComp && clkComp.outputs[0]) {
          clkComp.outputs[0].value = 0;
          let res = CircuitSimulator.step(currentComps, currentConns, false);
          currentComps = res.components;
          currentConns = res.connections;

          const clkComp2 = currentComps.find((c) => c.id === clkComp.id);
          if (clkComp2 && clkComp2.outputs[0]) clkComp2.outputs[0].value = 1;
          res = CircuitSimulator.step(currentComps, currentConns, true);
          currentComps = res.components;
          currentConns = res.connections;

          const clkComp3 = currentComps.find((c) => c.id === clkComp.id);
          if (clkComp3 && clkComp3.outputs[0]) clkComp3.outputs[0].value = 0;
          res = CircuitSimulator.step(currentComps, currentConns, false);
          currentComps = res.components;
          currentConns = res.connections;
        } else {
          const res = CircuitSimulator.step(currentComps, currentConns, true);
          currentComps = res.components;
          currentConns = res.connections;
        }
      }
    } else {
      // Combinational propagation settling (up to 4 passes)
      for (let pass = 0; pass < 4; pass++) {
        const res = CircuitSimulator.step(currentComps, currentConns, false);
        currentComps = res.components;
        currentConns = res.connections;
      }
    }

    // Read actual circuit outputs
    const actualOutputs: Record<string, 0 | 1 | string> = {};
    let vectorPassed = true;

    for (const [outName, expectedVal] of Object.entries(vector.expectedOutputs)) {
      const cleanOut = outName.trim().toUpperCase();
      const comp =
        currentComps.find(
          (c) =>
            (c.type === 'LED' || c.type === 'OUTPUT_LED' || c.type === 'OUTPUT_PIN') &&
            (c.label || '').trim().toUpperCase() === cleanOut
        ) ||
        currentComps.find(
          (c) =>
            (c.type === 'LED' || c.type === 'OUTPUT_LED' || c.type === 'OUTPUT_PIN') &&
            (c.label || '').trim().toUpperCase().includes(cleanOut)
        ) ||
        currentComps.find((c) => (c.label || '').trim().toUpperCase() === cleanOut) ||
        currentComps.find((c) => c.outputs.some((p) => p.name.toUpperCase() === cleanOut));

      let measuredVal: 0 | 1 | string = 'X';

      if (comp) {
        if (comp.type === 'LED' || comp.type === 'OUTPUT_LED') {
          measuredVal = comp.inputs[0]?.value === 1 ? 1 : comp.inputs[0]?.value === 0 ? 0 : 'X';
        } else if (comp.type === 'OUTPUT_PIN') {
          measuredVal = comp.inputs[0]?.value === 1 ? 1 : 0;
        } else if (comp.outputs.length > 0) {
          const matchingPin = comp.outputs.find((p) => p.name.toUpperCase() === cleanOut);
          const pin = matchingPin || comp.outputs[0];
          measuredVal = pin.value === 1 ? 1 : pin.value === 0 ? 0 : 'X';
        }
      }

      actualOutputs[outName] = measuredVal;
      if (measuredVal !== expectedVal) {
        vectorPassed = false;
      }
    }

    if (vectorPassed) passedCount++;

    vectorResults.push({
      vectorIndex: idx,
      description: vector.description,
      inputs: vector.inputs,
      expected: vector.expectedOutputs,
      actual: actualOutputs,
      passed: vectorPassed,
    });
  }

  const score = Math.round((passedCount / challenge.testVectors.length) * 100);
  const timestamp = Date.now();
  const verificationHash = generateVerificationCode(studentName, challenge.id, score, timestamp);

  return {
    challengeId: challenge.id,
    challengeTitle: challenge.title,
    studentName,
    score,
    passedCount,
    totalCount: challenge.testVectors.length,
    vectorResults,
    evaluatedAt: timestamp,
    verificationHash,
  };
}
