/**
 * LogicLab - Academic Practice Module for Digital Adders
 * Modules:
 * 1. Semisumador (Half Adder) - 2 inputs (A, B), 2 outputs (S, C) - 4 combinations
 * 2. Sumador Completo (Full Adder) - 3 inputs (A, B, Cin), 2 outputs (S, Cout) - 8 combinations
 * 3. Sumador de 4 Bits (4-Bit Binary Adder) - A3..A0, B3..B0, Cin, outputs S3..S0, Cout
 *
 * Supports both discrete gate level and reusable modular blocks.
 * Real-time simulation via CircuitSimulator.step() - ZERO hardcoded / fake results.
 * Manual testing, auto-sweep mode, truth table generation, experimental logging,
 * evidence capture, and CSV export.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CIRCUIT_PRESETS, CircuitPreset } from '../engines/circuit/presets';
import { CircuitSimulator, EvaluationResult } from '../engines/circuit/simulator';
import { useCircuitStore } from '../store/useCircuitStore';
import { useAppStore } from '../store/useAppStore';
import { MathBlock, MathInline } from '../components/math';
import { LabChallengesView } from '../components/practice/LabChallengesView';
import {
  Calculator,
  Award,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Cpu,
  Layers,
  ArrowRight,
  ClipboardCheck,
  Zap,
  Info,
  Check,
  ExternalLink,
} from 'lucide-react';

export type AdderType = 'half' | 'full' | '4bit';

interface ExperimentalEntry {
  id: string;
  timestamp: string;
  circuitType: string;
  architecture: string;
  inputs: Record<string, 0 | 1>;
  outputs: Record<string, 0 | 1 | string>;
  expectedOutputs: Record<string, 0 | 1>;
  decimalA?: number;
  decimalB?: number;
  cin?: number;
  decimalSum?: number;
  isCorrect: boolean;
}

export const AdderPracticePage: React.FC = () => {
  const { setActiveTab, showToast } = useAppStore();
  const { loadCircuit } = useCircuitStore();

  // Top navigation between Adders Laboratory and Guided Challenges
  const [activeSection, setActiveSection] = useState<'adders' | 'challenges'>('adders');

  // Selected Adder Circuit Module
  const [selectedAdder, setSelectedAdder] = useState<AdderType>('half');

  // Architecture options per adder type
  const [halfArch, setHalfArch] = useState<'gates' | 'modular'>('gates');
  const [fullArch, setFullArch] = useState<'gates' | 'two_ha' | 'modular'>('gates');
  const [adder4Arch, setAdder4Arch] = useState<'ripple' | 'block'>('ripple');

  // Interactive Inputs
  // Half Adder inputs: A, B
  const [haA, setHaA] = useState<0 | 1>(0);
  const [haB, setHaB] = useState<0 | 1>(0);

  // Full Adder inputs: A, B, Cin
  const [faA, setFaA] = useState<0 | 1>(0);
  const [faB, setFaB] = useState<0 | 1>(0);
  const [faCin, setFaCin] = useState<0 | 1>(0);

  // 4-Bit Adder inputs: A3..A0, B3..B0, Cin
  const [a3, setA3] = useState<0 | 1>(0);
  const [a2, setA2] = useState<0 | 1>(1);
  const [a1, setA1] = useState<0 | 1>(1);
  const [a0, setA0] = useState<0 | 1>(1); // Default A = 0111 (7)

  const [b3, setB3] = useState<0 | 1>(0);
  const [b2, setB2] = useState<0 | 1>(0);
  const [b1, setB1] = useState<0 | 1>(1);
  const [b0, setB0] = useState<0 | 1>(0); // Default B = 0010 (2)

  const [adder4Cin, setAdder4Cin] = useState<0 | 1>(0);

  // Simulation Results & State
  const [isTruthTableGenerated, setIsTruthTableGenerated] = useState(true);
  const [activeViewTab, setActiveViewTab] = useState<'table' | 'log'>('table');

  // Auto-sweep Stepper State
  const [isAutoSweeping, setIsAutoSweeping] = useState(false);
  const [sweepIndex, setSweepIndex] = useState(0);
  const [sweepSpeedMs, setSweepSpeedMs] = useState(1200);

  // Experimental Log entries
  const [experimentalLog, setExperimentalLog] = useState<ExperimentalEntry[]>([]);

  // Evidence modal state
  const [evidenceCopied, setEvidenceCopied] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);

  // Determine current preset ID from selections
  const currentPresetId = useMemo(() => {
    if (selectedAdder === 'half') {
      return halfArch === 'gates' ? 'half_adder_gates' : 'half_adder';
    }
    if (selectedAdder === 'full') {
      if (fullArch === 'gates') return 'full_adder_gates';
      if (fullArch === 'two_ha') return 'full_adder_two_ha';
      return 'full_adder_discrete';
    }
    return adder4Arch === 'ripple' ? 'adder_4bit_ripple' : 'adder_4bit_block';
  }, [selectedAdder, halfArch, fullArch, adder4Arch]);

  // Current preset object
  const currentPreset = useMemo(
    () => CIRCUIT_PRESETS.find((p) => p.id === currentPresetId) || CIRCUIT_PRESETS[0],
    [currentPresetId]
  );

  // Current inputs map based on selected adder
  const currentInputsRecord = useMemo<Record<string, 0 | 1>>(() => {
    const rec: Record<string, 0 | 1> = {};
    if (selectedAdder === 'half') {
      rec.A = haA;
      rec.B = haB;
    } else if (selectedAdder === 'full') {
      rec.A = faA;
      rec.B = faB;
      rec.Cin = faCin;
    } else {
      rec.A0 = a0; rec.A1 = a1; rec.A2 = a2; rec.A3 = a3;
      rec.B0 = b0; rec.B1 = b1; rec.B2 = b2; rec.B3 = b3;
      rec.Cin = adder4Cin;
      rec['Cin (C0)'] = adder4Cin;
    }
    return rec;
  }, [selectedAdder, haA, haB, faA, faB, faCin, a0, a1, a2, a3, b0, b1, b2, b3, adder4Cin]);

  // Execute real circuit simulation on current inputs
  const liveSimulationOutputs = useMemo(() => {
    const { components, connections } = currentPreset.build();

    // Inject switch values
    components.forEach((comp) => {
      if (comp.type === 'SWITCH') {
        const cleanLabel = comp.label.replace(/^Entrada\s+/i, '').replace(/\s*\(.*\)/, '').trim();
        const matchedKey = Object.keys(currentInputsRecord).find(
          (k) => k.toUpperCase() === cleanLabel.toUpperCase() || k.toUpperCase() === comp.label.toUpperCase()
        );
        if (matchedKey !== undefined) {
          const val = currentInputsRecord[matchedKey];
          comp.state = { switchActive: val === 1 };
          if (comp.outputs[0]) comp.outputs[0].value = val;
        }
      }
    });

    // Run propagation steps with real engine
    let evalState: EvaluationResult = { components, connections, cycleDetected: false, warnings: [], errors: [] };
    for (let step = 0; step < 8; step++) {
      evalState = CircuitSimulator.step(evalState.components, evalState.connections, false);
    }

    // Extract outputs from LEDs
    const results: Record<string, 0 | 1 | 'X'> = {};
    evalState.components.forEach((comp) => {
      if (comp.type === 'LED' || comp.type === 'OUTPUT_LED' || comp.type === 'OUTPUT_PIN') {
        const cleanLabel = comp.label.replace(/^Salida\s+/i, '').replace(/\s*\(.*\)/, '').trim();
        const raw = comp.inputs[0]?.value;
        results[cleanLabel] = raw === 1 ? 1 : raw === 0 ? 0 : 'X';
      }
    });

    // Also inspect intermediate carry signals in ripple carry cascade
    let intermediateCarries: { c1: 0 | 1 | 'X'; c2: 0 | 1 | 'X'; c3: 0 | 1 | 'X' } | undefined;
    if (selectedAdder === '4bit' && adder4Arch === 'ripple') {
      const fa0 = evalState.components.find((c) => c.label.includes('FA0') || c.label.includes('Bit 0'));
      const fa1 = evalState.components.find((c) => c.label.includes('FA1') || c.label.includes('Bit 1'));
      const fa2 = evalState.components.find((c) => c.label.includes('FA2') || c.label.includes('Bit 2'));
      intermediateCarries = {
        c1: (fa0?.outputs[1]?.value as any) ?? 'X',
        c2: (fa1?.outputs[1]?.value as any) ?? 'X',
        c3: (fa2?.outputs[1]?.value as any) ?? 'X',
      };
    }

    return { outputs: results, intermediateCarries, finalComponents: evalState.components };
  }, [currentPreset, currentInputsRecord, selectedAdder, adder4Arch]);

  // Generate Exhaustive or Selected Truth Table via Real Simulation
  const simulatedTruthTable = useMemo(() => {
    const rows: Array<{
      index: number;
      binaryInputs: string;
      inputs: Record<string, 0 | 1>;
      outputs: Record<string, 0 | 1 | 'X'>;
      expectedOutputs: Record<string, 0 | 1>;
      isMatch: boolean;
      decimalExpression?: string;
    }> = [];

    if (selectedAdder === 'half') {
      for (let i = 0; i < 4; i++) {
        const aBit = ((i >> 1) & 1) as 0 | 1;
        const bBit = (i & 1) as 0 | 1;

        const { components, connections } = currentPreset.build();
        components.forEach((comp) => {
          if (comp.type === 'SWITCH') {
            const clean = comp.label.replace(/^Entrada\s+/i, '').trim().toUpperCase();
            const bit = clean === 'A' ? aBit : bBit;
            comp.state = { switchActive: bit === 1 };
            if (comp.outputs[0]) comp.outputs[0].value = bit;
          }
        });

        let evalState: EvaluationResult = { components, connections, cycleDetected: false, warnings: [], errors: [] };
        for (let s = 0; s < 6; s++) {
          evalState = CircuitSimulator.step(evalState.components, evalState.connections, false);
        }

        const outS: 0 | 1 | 'X' = (evalState.components.find((c) => c.label.includes('S'))?.inputs[0]?.value as any) ?? 'X';
        const outC: 0 | 1 | 'X' = (evalState.components.find((c) => c.label.includes('C'))?.inputs[0]?.value as any) ?? 'X';

        const expS = (aBit ^ bBit) as 0 | 1;
        const expC = (aBit & bBit) as 0 | 1;

        rows.push({
          index: i,
          binaryInputs: `${aBit} ${bBit}`,
          inputs: { A: aBit, B: bBit },
          outputs: { S: outS, C: outC },
          expectedOutputs: { S: expS, C: expC },
          isMatch: outS === expS && outC === expC,
          decimalExpression: `${aBit} + ${bBit} = ${expC}${expS}₂ (${aBit + bBit})`,
        });
      }
    } else if (selectedAdder === 'full') {
      for (let i = 0; i < 8; i++) {
        const aBit = ((i >> 2) & 1) as 0 | 1;
        const bBit = ((i >> 1) & 1) as 0 | 1;
        const cinBit = (i & 1) as 0 | 1;

        const { components, connections } = currentPreset.build();
        components.forEach((comp) => {
          if (comp.type === 'SWITCH') {
            const clean = comp.label.replace(/^Entrada\s+/i, '').trim().toUpperCase();
            let bit: 0 | 1 = 0;
            if (clean === 'A') bit = aBit;
            else if (clean === 'B') bit = bBit;
            else if (clean.startsWith('CIN') || clean.startsWith('C')) bit = cinBit;
            comp.state = { switchActive: bit === 1 };
            if (comp.outputs[0]) comp.outputs[0].value = bit;
          }
        });

        let evalState: EvaluationResult = { components, connections, cycleDetected: false, warnings: [], errors: [] };
        for (let s = 0; s < 8; s++) {
          evalState = CircuitSimulator.step(evalState.components, evalState.connections, false);
        }

        const outS: 0 | 1 | 'X' = (evalState.components.find((c) => c.label.includes('S'))?.inputs[0]?.value as any) ?? 'X';
        const outCout: 0 | 1 | 'X' = (evalState.components.find((c) => c.label.includes('Cout'))?.inputs[0]?.value as any) ?? 'X';

        const expS = (aBit ^ bBit ^ cinBit) as 0 | 1;
        const expCout = ((aBit & bBit) | (bBit & cinBit) | (aBit & cinBit)) as 0 | 1;

        rows.push({
          index: i,
          binaryInputs: `${aBit} ${bBit} ${cinBit}`,
          inputs: { A: aBit, B: bBit, Cin: cinBit },
          outputs: { S: outS, Cout: outCout },
          expectedOutputs: { S: expS, Cout: expCout },
          isMatch: outS === expS && outCout === expCout,
          decimalExpression: `${aBit} + ${bBit} + ${cinBit} = ${expCout}${expS}₂ (${aBit + bBit + cinBit})`,
        });
      }
    } else {
      // 4-Bit Adder Selected Representative Cases (at least 10 selected, including required test vectors)
      const fourBitCases = [
        { a: 7, b: 2, cin: 0, tag: 'Requisito: 0111 + 0010 = 01001 (7+2=9)' },
        { a: 15, b: 15, cin: 0, tag: 'Requisito: 1111 + 1111 = 11110 (15+15=30)' },
        { a: 0, b: 0, cin: 0, tag: 'Elemento Neutro (0+0=0)' },
        { a: 1, b: 1, cin: 0, tag: '1+1=2' },
        { a: 3, b: 5, cin: 0, tag: '3+5=8' },
        { a: 8, b: 7, cin: 0, tag: '8+7=15 (Máximo sin acarreo)' },
        { a: 10, b: 5, cin: 0, tag: '10+5=15 (Alternado 1010+0101)' },
        { a: 12, b: 3, cin: 0, tag: '12+3=15' },
        { a: 15, b: 1, cin: 0, tag: '15+1=16 (Desbordamiento simple)' },
        { a: 11, b: 6, cin: 0, tag: '11+6=17' },
        { a: 7, b: 2, cin: 1, tag: '7+2 con Cin=1 = 10 (01010)' },
      ];

      fourBitCases.forEach((c, idx) => {
        const aBin = c.a.toString(2).padStart(4, '0');
        const bBin = c.b.toString(2).padStart(4, '0');
        const cinBit = c.cin as 0 | 1;

        const inputRecord: Record<string, 0 | 1> = {
          'Cin': cinBit,
          'Cin (C0)': cinBit,
          'A0': parseInt(aBin[3], 10) as 0 | 1,
          'A1': parseInt(aBin[2], 10) as 0 | 1,
          'A2': parseInt(aBin[1], 10) as 0 | 1,
          'A3': parseInt(aBin[0], 10) as 0 | 1,
          'B0': parseInt(bBin[3], 10) as 0 | 1,
          'B1': parseInt(bBin[2], 10) as 0 | 1,
          'B2': parseInt(bBin[1], 10) as 0 | 1,
          'B3': parseInt(bBin[0], 10) as 0 | 1,
        };

        const { components, connections } = currentPreset.build();
        components.forEach((comp) => {
          if (comp.type === 'SWITCH') {
            const clean = comp.label.replace(/^Entrada\s+/i, '').replace(/\s*\(.*\)/, '').trim();
            const matchedKey = Object.keys(inputRecord).find(
              (k) => k.toUpperCase() === clean.toUpperCase() || k.toUpperCase() === comp.label.toUpperCase()
            );
            if (matchedKey !== undefined) {
              const bit = inputRecord[matchedKey];
              comp.state = { switchActive: bit === 1 };
              if (comp.outputs[0]) comp.outputs[0].value = bit;
            }
          }
        });

        let evalState: EvaluationResult = { components, connections, cycleDetected: false, warnings: [], errors: [] };
        for (let s = 0; s < 10; s++) {
          evalState = CircuitSimulator.step(evalState.components, evalState.connections, false);
        }

        const outS0: 0 | 1 | 'X' = (evalState.components.find((comp) => comp.label.includes('S0'))?.inputs[0]?.value as any) ?? 'X';
        const outS1: 0 | 1 | 'X' = (evalState.components.find((comp) => comp.label.includes('S1'))?.inputs[0]?.value as any) ?? 'X';
        const outS2: 0 | 1 | 'X' = (evalState.components.find((comp) => comp.label.includes('S2'))?.inputs[0]?.value as any) ?? 'X';
        const outS3: 0 | 1 | 'X' = (evalState.components.find((comp) => comp.label.includes('S3'))?.inputs[0]?.value as any) ?? 'X';
        const outCout: 0 | 1 | 'X' = (evalState.components.find((comp) => comp.label.includes('Cout'))?.inputs[0]?.value as any) ?? 'X';

        const expSum = c.a + c.b + c.cin;
        const expBin = expSum.toString(2).padStart(5, '0');
        const expCout = parseInt(expBin[0], 10) as 0 | 1;
        const expS3 = parseInt(expBin[1], 10) as 0 | 1;
        const expS2 = parseInt(expBin[2], 10) as 0 | 1;
        const expS1 = parseInt(expBin[3], 10) as 0 | 1;
        const expS0 = parseInt(expBin[4], 10) as 0 | 1;

        const isMatch =
          outCout === expCout &&
          outS3 === expS3 &&
          outS2 === expS2 &&
          outS1 === expS1 &&
          outS0 === expS0;

        rows.push({
          index: idx,
          binaryInputs: `A=${aBin} B=${bBin} Cin=${cinBit}`,
          inputs: {
            A: c.a as any,
            B: c.b as any,
            Cin: cinBit,
          },
          outputs: {
            Cout: outCout,
            S3: outS3,
            S2: outS2,
            S1: outS1,
            S0: outS0,
          },
          expectedOutputs: {
            Cout: expCout,
            S3: expS3,
            S2: expS2,
            S1: expS1,
            S0: expS0,
          },
          isMatch,
          decimalExpression: `${c.a} + ${c.b} + ${c.cin} = ${expSum} (${expBin}₂) | ${c.tag}`,
        });
      });
    }

    return rows;
  }, [selectedAdder, currentPreset]);

  // Derived Decimal and Binary Calculations for 4-bit adder
  const decimalA = a3 * 8 + a2 * 4 + a1 * 2 + a0;
  const decimalB = b3 * 8 + b2 * 4 + b1 * 2 + b0;
  const theoreticalTotalSum = decimalA + decimalB + adder4Cin;
  const theoreticalBinarySum = theoreticalTotalSum.toString(2).padStart(5, '0');

  // Simulated Outputs
  const simOutputs = liveSimulationOutputs.outputs;
  const simS = simOutputs['S'] ?? 'X';
  const simC = (simOutputs['C'] ?? simOutputs['Cout']) ?? 'X';
  const simS0 = simOutputs['S0'] ?? 'X';
  const simS1 = simOutputs['S1'] ?? 'X';
  const simS2 = simOutputs['S2'] ?? 'X';
  const simS3 = simOutputs['S3'] ?? 'X';
  const simCout = simOutputs['Cout'] ?? 'X';

  const simulatedBinary5Bit = `${simCout}${simS3}${simS2}${simS1}${simS0}`;
  const simulatedDecimalSum =
    simCout !== 'X' && simS3 !== 'X' && simS2 !== 'X' && simS1 !== 'X' && simS0 !== 'X'
      ? (simCout as number) * 16 + (simS3 as number) * 8 + (simS2 as number) * 4 + (simS1 as number) * 2 + (simS0 as number)
      : null;

  // Specific check verification badges
  const isReq1Verified =
    selectedAdder === '4bit' &&
    decimalA === 7 &&
    decimalB === 2 &&
    adder4Cin === 0 &&
    simulatedBinary5Bit === '01001';

  const isReq2Verified =
    selectedAdder === '4bit' &&
    decimalA === 15 &&
    decimalB === 15 &&
    adder4Cin === 0 &&
    simulatedBinary5Bit === '11110';

  // Manual log registration
  const handleRegisterExperimentalRow = () => {
    const timestamp = new Date().toLocaleTimeString('es-ES', { hour12: false });
    let isCorrect = false;

    if (selectedAdder === 'half') {
      const expS = (haA ^ haB) as 0 | 1;
      const expC = (haA & haB) as 0 | 1;
      isCorrect = simS === expS && simC === expC;

      const newEntry: ExperimentalEntry = {
        id: `exp_${Date.now()}_${Math.random()}`,
        timestamp,
        circuitType: 'Semisumador (Half Adder)',
        architecture: halfArch === 'gates' ? 'Compuertas Discretas (XOR+AND)' : 'Bloque IC HALF_ADDER',
        inputs: { A: haA, B: haB },
        outputs: { S: simS, C: simC },
        expectedOutputs: { S: expS, C: expC },
        decimalA: haA,
        decimalB: haB,
        decimalSum: haA + haB,
        isCorrect,
      };
      setExperimentalLog((prev) => [newEntry, ...prev]);
    } else if (selectedAdder === 'full') {
      const expS = (faA ^ faB ^ faCin) as 0 | 1;
      const expCout = ((faA & faB) | (faB & faCin) | (faA & faCin)) as 0 | 1;
      isCorrect = simS === expS && simC === expCout;

      const newEntry: ExperimentalEntry = {
        id: `exp_${Date.now()}_${Math.random()}`,
        timestamp,
        circuitType: 'Sumador Completo (Full Adder)',
        architecture:
          fullArch === 'gates'
            ? 'Compuertas Discretas (2 XOR, 2 AND, 1 OR)'
            : fullArch === 'two_ha'
            ? 'Modular (2 Semisumadores + OR)'
            : 'Bloque IC FULL_ADDER',
        inputs: { A: faA, B: faB, Cin: faCin },
        outputs: { S: simS, Cout: simC },
        expectedOutputs: { S: expS, Cout: expCout },
        decimalA: faA,
        decimalB: faB,
        cin: faCin,
        decimalSum: faA + faB + faCin,
        isCorrect,
      };
      setExperimentalLog((prev) => [newEntry, ...prev]);
    } else {
      isCorrect = simulatedBinary5Bit === theoreticalBinarySum;

      const newEntry: ExperimentalEntry = {
        id: `exp_${Date.now()}_${Math.random()}`,
        timestamp,
        circuitType: 'Sumador 4 Bits',
        architecture:
          adder4Arch === 'ripple' ? 'Cascada 4 Full Adders (Ripple Carry)' : 'Bloque Integrado ADDER_4BIT',
        inputs: {
          A3: a3, A2: a2, A1: a1, A0: a0,
          B3: b3, B2: b2, B1: b1, B0: b0,
          Cin: adder4Cin,
        },
        outputs: { Cout: simCout, S3: simS3, S2: simS2, S1: simS1, S0: simS0 },
        expectedOutputs: {
          Cout: parseInt(theoreticalBinarySum[0], 10) as 0 | 1,
          S3: parseInt(theoreticalBinarySum[1], 10) as 0 | 1,
          S2: parseInt(theoreticalBinarySum[2], 10) as 0 | 1,
          S1: parseInt(theoreticalBinarySum[3], 10) as 0 | 1,
          S0: parseInt(theoreticalBinarySum[4], 10) as 0 | 1,
        },
        decimalA,
        decimalB,
        cin: adder4Cin,
        decimalSum: theoreticalTotalSum,
        isCorrect,
      };
      setExperimentalLog((prev) => [newEntry, ...prev]);
    }

    showToast('success', 'Combinación registrada con éxito en el registro experimental.');
  };

  // Auto-sweep stepper interval
  useEffect(() => {
    if (!isAutoSweeping) return;

    const timer = setInterval(() => {
      if (selectedAdder === 'half') {
        setSweepIndex((prev) => {
          const next = (prev + 1) % 4;
          setHaA(((next >> 1) & 1) as 0 | 1);
          setHaB((next & 1) as 0 | 1);
          return next;
        });
      } else if (selectedAdder === 'full') {
        setSweepIndex((prev) => {
          const next = (prev + 1) % 8;
          setFaA(((next >> 2) & 1) as 0 | 1);
          setFaB(((next >> 1) & 1) as 0 | 1);
          setFaCin((next & 1) as 0 | 1);
          return next;
        });
      } else {
        // 4-bit adder auto-sweep through the 11 representative test cases
        setSweepIndex((prev) => {
          const next = (prev + 1) % simulatedTruthTable.length;
          const target = simulatedTruthTable[next];
          if (target && target.inputs.A !== undefined) {
            applyDecimal4Bit(target.inputs.A as number, target.inputs.B as number, target.inputs.Cin as 0 | 1);
          }
          return next;
        });
      }
    }, sweepSpeedMs);

    return () => clearInterval(timer);
  }, [isAutoSweeping, selectedAdder, sweepSpeedMs, simulatedTruthTable]);

  // Fast helper to apply decimal numbers to 4-bit adder
  const applyDecimal4Bit = (decA: number, decB: number, cin: 0 | 1 = 0) => {
    const aClamped = Math.max(0, Math.min(15, decA));
    const bClamped = Math.max(0, Math.min(15, decB));
    const binA = aClamped.toString(2).padStart(4, '0');
    const binB = bClamped.toString(2).padStart(4, '0');

    setA3(parseInt(binA[0], 10) as 0 | 1);
    setA2(parseInt(binA[1], 10) as 0 | 1);
    setA1(parseInt(binA[2], 10) as 0 | 1);
    setA0(parseInt(binA[3], 10) as 0 | 1);

    setB3(parseInt(binB[0], 10) as 0 | 1);
    setB2(parseInt(binB[1], 10) as 0 | 1);
    setB1(parseInt(binB[2], 10) as 0 | 1);
    setB0(parseInt(binB[3], 10) as 0 | 1);

    setAdder4Cin(cin);
  };

  // Load circuit in the visual editor
  const handleLoadCircuitInEditor = () => {
    const { components, connections } = currentPreset.build();
    loadCircuit(components, connections);
    setActiveTab('circuit');
    showToast('info', `Circuito "${currentPreset.name}" cargado en el editor visual.`);
  };

  // Export tables to CSV
  const handleExportCSV = () => {
    let csvContent = '';
    const dateStr = new Date().toISOString().slice(0, 10);

    if (activeViewTab === 'table') {
      csvContent = 'Indice,Entradas_Binarias,Salidas_Simuladas,Salidas_Esperadas,Resultado_Verificacion\n';
      simulatedTruthTable.forEach((r) => {
        const outStr = Object.entries(r.outputs).map(([k, v]) => `${k}=${v}`).join(' ');
        const expStr = Object.entries(r.expectedOutputs).map(([k, v]) => `${k}=${v}`).join(' ');
        csvContent += `"${r.index}","${r.binaryInputs}","${outStr}","${expStr}","${r.isMatch ? 'CORRECTO' : 'DISCREPANCIA'}"\n`;
      });
    } else {
      csvContent = 'Hora,Circuito,Arquitectura,Entradas,Salidas_Obtenidas,Salidas_Esperadas,Suma_Decimal,Estado\n';
      experimentalLog.forEach((e) => {
        const inStr = Object.entries(e.inputs).map(([k, v]) => `${k}=${v}`).join(' ');
        const outStr = Object.entries(e.outputs).map(([k, v]) => `${k}=${v}`).join(' ');
        const expStr = Object.entries(e.expectedOutputs).map(([k, v]) => `${k}=${v}`).join(' ');
        csvContent += `"${e.timestamp}","${e.circuitType}","${e.architecture}","${inStr}","${outStr}","${expStr}","${e.decimalSum ?? ''}","${e.isCorrect ? 'VALIDADO' : 'ERROR'}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `practica_sumador_${selectedAdder}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Archivo CSV exportado exitosamente.');
  };

  // Generate Evidence Report Text
  const evidenceReportText = useMemo(() => {
    const now = new Date().toLocaleString('es-ES');
    let report = `========================================================\n`;
    report += `LOGICLAB - REPORTE DE EVIDENCIA DE LABORATORIO DIGITAL\n`;
    report += `========================================================\n`;
    report += `Fecha y Hora: ${now}\n`;
    report += `Práctica: ${
      selectedAdder === 'half'
        ? 'Semisumador (Half Adder)'
        : selectedAdder === 'full'
        ? 'Sumador Completo (Full Adder)'
        : 'Sumador Binario de 4 Bits'
    }\n`;
    report += `Arquitectura: ${currentPreset.name}\n`;
    report += `Motor de Simulación: LogicLab Engine v2.0 (Simulación Exacta)\n`;
    report += `--------------------------------------------------------\n\n`;

    if (selectedAdder === 'half') {
      report += `ESTADO DE ENTRADAS:\n`;
      report += `  - Entrada A: ${haA}\n`;
      report += `  - Entrada B: ${haB}\n\n`;
      report += `RESULTADOS OBTENIDOS POR EL SIMULADOR:\n`;
      report += `  - Suma (S = A ⊕ B): ${simS}\n`;
      report += `  - Acarreo (C = A · B): ${simC}\n\n`;
      report += `VERIFICACIÓN MATEMÁTICA:\n`;
      report += `  ${haA} + ${haB} = ${haA + haB}₁₀ | Binario: ${simC}${simS}₂\n`;
      report += `  Estado: ${(simS === (haA ^ haB) && simC === (haA & haB)) ? 'VÁLIDO (100% Coincidente)' : 'DISCREPANCIA'}\n`;
    } else if (selectedAdder === 'full') {
      report += `ESTADO DE ENTRADAS:\n`;
      report += `  - Entrada A: ${faA}\n`;
      report += `  - Entrada B: ${faB}\n`;
      report += `  - Acarreo Inicial (Cin): ${faCin}\n\n`;
      report += `RESULTADOS OBTENIDOS POR EL SIMULADOR:\n`;
      report += `  - Suma (S = A ⊕ B ⊕ Cin): ${simS}\n`;
      report += `  - Acarreo de Salida (Cout = AB + Cin(A⊕B)): ${simC}\n\n`;
      report += `VERIFICACIÓN MATEMÁTICA:\n`;
      report += `  ${faA} + ${faB} + ${faCin} = ${faA + faB + faCin}₁₀ | Binario: ${simC}${simS}₂\n`;
      const expS = faA ^ faB ^ faCin;
      const expCout = (faA & faB) | (faB & faCin) | (faA & faCin);
      report += `  Estado: ${(simS === expS && simC === expCout) ? 'VÁLIDO (100% Coincidente)' : 'DISCREPANCIA'}\n`;
    } else {
      report += `ESTADO DE ENTRADAS:\n`;
      report += `  - Bus A: [A3=${a3}, A2=${a2}, A1=${a1}, A0=${a0}] = ${a3}${a2}${a1}${a0}₂ (${decimalA}₁₀)\n`;
      report += `  - Bus B: [B3=${b3}, B2=${b2}, B1=${b1}, B0=${b0}] = ${b3}${b2}${b1}${b0}₂ (${decimalB}₁₀)\n`;
      report += `  - Acarreo Inicial (Cin/C0): ${adder4Cin}\n\n`;
      report += `CADENA DE ACARREOS INTERMEDIOS:\n`;
      if (liveSimulationOutputs.intermediateCarries) {
        report += `  - C1 (FA0 → FA1): ${liveSimulationOutputs.intermediateCarries.c1}\n`;
        report += `  - C2 (FA1 → FA2): ${liveSimulationOutputs.intermediateCarries.c2}\n`;
        report += `  - C3 (FA2 → FA3): ${liveSimulationOutputs.intermediateCarries.c3}\n`;
      }
      report += `  - Cout (Acarreo Final): ${simCout}\n\n`;
      report += `SALIDAS OBTENIDAS POR EL SIMULADOR:\n`;
      report += `  - Bus Suma: [S3=${simS3}, S2=${simS2}, S1=${simS1}, S0=${simS0}]\n`;
      report += `  - Salida Completa (Cout S3 S2 S1 S0): ${simulatedBinary5Bit}₂ (${simulatedDecimalSum ?? 'X'}₁₀)\n\n`;
      report += `VERIFICACIÓN EXPERIMENTAL:\n`;
      report += `  Suma Teórica Esperada: ${decimalA} + ${decimalB} + ${adder4Cin} = ${theoreticalTotalSum}₁₀ (${theoreticalBinarySum}₂)\n`;
      report += `  Comprobación de Casos Críticos:\n`;
      report += `    • 0111 + 0010 = 01001: ${isReq1Verified ? 'VERIFICADO CON ÉXITO' : (decimalA === 7 && decimalB === 2 ? 'EN PROCESO' : 'NO ACTIVO')}\n`;
      report += `    • 1111 + 1111 = 11110: ${isReq2Verified ? 'VERIFICADO CON ÉXITO' : (decimalA === 15 && decimalB === 15 ? 'EN PROCESO' : 'NO ACTIVO')}\n`;
      report += `  Estado General: ${simulatedBinary5Bit === theoreticalBinarySum ? 'EQUIVALENTE Y VALIDADO' : 'DISCREPANCIA'}\n`;
    }

    report += `\n========================================================\n`;
    report += `Fin del Reporte de Práctica\n`;
    return report;
  }, [
    selectedAdder, currentPreset, haA, haB, faA, faB, faCin,
    a3, a2, a1, a0, b3, b2, b1, b0, adder4Cin, decimalA, decimalB,
    simS, simC, simS0, simS1, simS2, simS3, simCout,
    simulatedBinary5Bit, simulatedDecimalSum, theoreticalTotalSum, theoreticalBinarySum,
    isReq1Verified, isReq2Verified, liveSimulationOutputs
  ]);

  const handleCopyEvidence = () => {
    navigator.clipboard.writeText(evidenceReportText);
    setEvidenceCopied(true);
    showToast('success', 'Evidencia copiada al portapapeles.');
    setTimeout(() => setEvidenceCopied(false), 2500);
  };

  const handleDownloadEvidence = () => {
    const blob = new Blob([evidenceReportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidencia_practica_${selectedAdder}_${Date.now()}.txt`;
    a.click();
    showToast('success', 'Archivo de evidencia descargado.');
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[var(--bg-base)] text-[var(--text-primary)] p-3 sm:p-6 select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Tabs between Adders and Lab Challenges */}
        <div className="flex items-center gap-2 p-1.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl w-fit shadow-xs">
          <button
            onClick={() => setActiveSection('adders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'adders'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-sub)]'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Práctica de Sumadores</span>
          </button>
          <button
            onClick={() => setActiveSection('challenges')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'challenges'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-sub)]'
            }`}
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Retos Guiados y Autoevaluación</span>
          </button>
        </div>

        {activeSection === 'challenges' ? (
          <LabChallengesView />
        ) : (
          <>
            {/* Module Header & Lab Banner */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wider">
                Práctica Académica de Laboratorio
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                <Zap className="w-3.5 h-3.5" />
                Simulación en Tiempo Real
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <Calculator className="w-6 h-6 text-blue-500" />
              <span>Laboratorio de Sumadores Binarios</span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Experimentación con Semisumador, Sumador Completo y Sumador Binario de 4 bits mediante compuertas y bloques modulares.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLoadCircuitInEditor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-sub)] hover:border-blue-500 text-xs font-semibold text-[var(--text-primary)] hover:text-blue-500 transition-colors shadow-xs"
              title="Abre el circuito actual en el lienzo de trabajo para inspeccionar sus cables y compuertas"
            >
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>Cargar en el Editor</span>
            </button>

            <button
              onClick={() => setIsEvidenceModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-xs font-semibold transition-colors shadow-xs"
              title="Genera reporte formal con las entradas, salidas y verificación matemática"
            >
              <ClipboardCheck className="w-4 h-4 text-purple-500" />
              <span>Capturar Evidencias</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface-sub)] hover:border-emerald-500 text-xs font-semibold text-[var(--text-primary)] hover:text-emerald-500 transition-colors shadow-xs"
              title="Exporta las tablas de prueba o de verdad a un archivo CSV estándar"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* 1. Main Circuit Type Selector Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Semisumador */}
          <button
            onClick={() => {
              setSelectedAdder('half');
              setIsAutoSweeping(false);
            }}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
              selectedAdder === 'half'
                ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30 shadow-md'
                : 'bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[var(--text-secondary)]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-500">
                Módulo 1
              </span>
              <span className="text-[10px] font-mono-code bg-[var(--bg-surface-sub)] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)]">
                4 Combinaciones
              </span>
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Semisumador (Half Adder)</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Suma de 2 bits sin acarreo previo. Entradas <span className="font-mono-code font-bold">A, B</span>; salidas <span className="font-mono-code font-bold">S, C</span>.
            </p>
          </button>

          {/* Sumador Completo */}
          <button
            onClick={() => {
              setSelectedAdder('full');
              setIsAutoSweeping(false);
            }}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
              selectedAdder === 'full'
                ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30 shadow-md'
                : 'bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[var(--text-secondary)]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-500">
                Módulo 2
              </span>
              <span className="text-[10px] font-mono-code bg-[var(--bg-surface-sub)] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)]">
                8 Combinaciones
              </span>
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Sumador Completo (Full Adder)</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Suma de 3 bits con acarreo de entrada. Entradas <span className="font-mono-code font-bold">A, B, Cin</span>; salidas <span className="font-mono-code font-bold">S, Cout</span>.
            </p>
          </button>

          {/* Sumador de 4 Bits */}
          <button
            onClick={() => {
              setSelectedAdder('4bit');
              setIsAutoSweeping(false);
            }}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
              selectedAdder === '4bit'
                ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30 shadow-md'
                : 'bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[var(--text-secondary)]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-500">
                Módulo 3
              </span>
              <span className="text-[10px] font-mono-code bg-[var(--bg-surface-sub)] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)]">
                10+ Casos Académicos
              </span>
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Sumador Binario de 4 Bits</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Suma en paralelo de dos palabras binarias <span className="font-mono-code font-bold">A[3:0], B[3:0]</span> y acarreo <span className="font-mono-code font-bold">Cin</span>.
            </p>
          </button>
        </div>

        {/* 2. Architecture Variant & Mathematical Formula Header */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Architecture Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1 shrink-0">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              Arquitectura del Circuito:
            </span>

            {selectedAdder === 'half' && (
              <div className="flex items-center gap-1 bg-[var(--bg-surface-sub)] p-1 rounded-lg border border-[var(--border-color)]">
                <button
                  onClick={() => setHalfArch('gates')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    halfArch === 'gates' ? 'bg-[var(--bg-surface)] text-blue-500 shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Compuertas Discretas (XOR + AND)
                </button>
                <button
                  onClick={() => setHalfArch('modular')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    halfArch === 'modular' ? 'bg-[var(--bg-surface)] text-blue-500 shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Bloque Reutilizable (HALF_ADDER)
                </button>
              </div>
            )}

            {selectedAdder === 'full' && (
              <div className="flex items-center gap-1 bg-[var(--bg-surface-sub)] p-1 rounded-lg border border-[var(--border-color)]">
                <button
                  onClick={() => setFullArch('gates')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    fullArch === 'gates' ? 'bg-[var(--bg-surface)] text-blue-500 shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Compuertas Discretas (2 XOR, 2 AND, 1 OR)
                </button>
                <button
                  onClick={() => setFullArch('two_ha')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    fullArch === 'two_ha' ? 'bg-[var(--bg-surface)] text-blue-500 shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  2 Semisumadores + OR
                </button>
                <button
                  onClick={() => setFullArch('modular')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    fullArch === 'modular' ? 'bg-[var(--bg-surface)] text-blue-500 shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Bloque IC (FULL_ADDER)
                </button>
              </div>
            )}

            {selectedAdder === '4bit' && (
              <div className="flex items-center gap-1 bg-[var(--bg-surface-sub)] p-1 rounded-lg border border-[var(--border-color)]">
                <button
                  onClick={() => setAdder4Arch('ripple')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    adder4Arch === 'ripple' ? 'bg-[var(--bg-surface)] text-blue-500 shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Cascada de 4 Sumadores (Ripple Carry C0→C1→C2→C3→Cout)
                </button>
                <button
                  onClick={() => setAdder4Arch('block')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    adder4Arch === 'block' ? 'bg-[var(--bg-surface)] text-blue-500 shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Bloque Integrado (ADDER_4BIT 74xx283)
                </button>
              </div>
            )}
          </div>

          {/* Mathematical Equations Card */}
          <div className="flex items-center gap-3 text-xs bg-[var(--bg-surface-sub)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
            <span className="font-bold text-[var(--text-secondary)]">Ecuaciones:</span>
            {selectedAdder === 'half' && (
              <div className="flex items-center gap-3 font-mono-code font-semibold">
                <span className="text-blue-500">
                  <MathInline math="S = A \oplus B" />
                </span>
                <span className="text-amber-500">
                  <MathInline math="C = A \cdot B" />
                </span>
              </div>
            )}
            {selectedAdder === 'full' && (
              <div className="flex items-center gap-3 font-mono-code font-semibold">
                <span className="text-blue-500">
                  <MathInline math="S = A \oplus B \oplus C_{in}" />
                </span>
                <span className="text-amber-500">
                  <MathInline math="C_{out} = A B + C_{in}(A \oplus B)" />
                </span>
              </div>
            )}
            {selectedAdder === '4bit' && (
              <div className="flex items-center gap-3 font-mono-code font-semibold">
                <span className="text-blue-500">
                  <MathInline math="S_i = A_i \oplus B_i \oplus C_i" />
                </span>
                <span className="text-amber-500">
                  <MathInline math="C_{i+1} = A_i B_i + C_i(A_i \oplus B_i)" />
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Interactive Testing & Real-Time Visualization Bench */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Inputs Controls (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-5 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span>Controles de Entrada Binaria</span>
                </h3>

                {/* Sweep Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsAutoSweeping(!isAutoSweeping)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                      isAutoSweeping
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                    }`}
                    title={isAutoSweeping ? 'Pausar recorrido automático' : 'Iniciar recorrido automático de combinaciones'}
                  >
                    {isAutoSweeping ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isAutoSweeping ? 'Pausa' : 'Auto'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (selectedAdder === 'half') {
                        setHaA(((sweepIndex + 1) % 4 >> 1 & 1) as 0 | 1);
                        setHaB(((sweepIndex + 1) % 4 & 1) as 0 | 1);
                        setSweepIndex((p) => (p + 1) % 4);
                      } else if (selectedAdder === 'full') {
                        const nxt = (sweepIndex + 1) % 8;
                        setFaA(((nxt >> 2) & 1) as 0 | 1);
                        setFaB(((nxt >> 1) & 1) as 0 | 1);
                        setFaCin((nxt & 1) as 0 | 1);
                        setSweepIndex(nxt);
                      } else {
                        const nxt = (sweepIndex + 1) % simulatedTruthTable.length;
                        const t = simulatedTruthTable[nxt];
                        if (t && t.inputs.A !== undefined) {
                          applyDecimal4Bit(t.inputs.A as number, t.inputs.B as number, t.inputs.Cin as 0 | 1);
                        }
                        setSweepIndex(nxt);
                      }
                    }}
                    className="p-1.5 rounded bg-[var(--bg-surface-sub)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]"
                    title="Paso siguiente en la secuencia"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Half Adder Input Toggles */}
              {selectedAdder === 'half' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center p-4 rounded-xl bg-[var(--bg-surface-sub)] border border-[var(--border-color)] space-y-2">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Entrada A</span>
                    <button
                      onClick={() => setHaA(haA === 1 ? 0 : 1)}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center font-mono-code text-2xl font-black transition-all shadow-md ${
                        haA === 1
                          ? 'bg-blue-600 text-white ring-4 ring-blue-500/30'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                      }`}
                    >
                      {haA}
                    </button>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono-code">
                      Nivel: {haA === 1 ? 'ALTO (1)' : 'BAJO (0)'}
                    </span>
                  </div>

                  <div className="flex flex-col items-center p-4 rounded-xl bg-[var(--bg-surface-sub)] border border-[var(--border-color)] space-y-2">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Entrada B</span>
                    <button
                      onClick={() => setHaB(haB === 1 ? 0 : 1)}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center font-mono-code text-2xl font-black transition-all shadow-md ${
                        haB === 1
                          ? 'bg-blue-600 text-white ring-4 ring-blue-500/30'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                      }`}
                    >
                      {haB}
                    </button>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono-code">
                      Nivel: {haB === 1 ? 'ALTO (1)' : 'BAJO (0)'}
                    </span>
                  </div>
                </div>
              )}

              {/* Full Adder Input Toggles */}
              {selectedAdder === 'full' && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-3 rounded-xl bg-[var(--bg-surface-sub)] border border-[var(--border-color)] space-y-2">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Entrada A</span>
                    <button
                      onClick={() => setFaA(faA === 1 ? 0 : 1)}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono-code text-xl font-black transition-all shadow-md ${
                        faA === 1
                          ? 'bg-blue-600 text-white ring-4 ring-blue-500/30'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                      }`}
                    >
                      {faA}
                    </button>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono-code">{faA ? 'HIGH' : 'LOW'}</span>
                  </div>

                  <div className="flex flex-col items-center p-3 rounded-xl bg-[var(--bg-surface-sub)] border border-[var(--border-color)] space-y-2">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Entrada B</span>
                    <button
                      onClick={() => setFaB(faB === 1 ? 0 : 1)}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono-code text-xl font-black transition-all shadow-md ${
                        faB === 1
                          ? 'bg-blue-600 text-white ring-4 ring-blue-500/30'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                      }`}
                    >
                      {faB}
                    </button>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono-code">{faB ? 'HIGH' : 'LOW'}</span>
                  </div>

                  <div className="flex flex-col items-center p-3 rounded-xl bg-[var(--bg-surface-sub)] border border-[var(--border-color)] space-y-2">
                    <span className="text-xs font-bold text-amber-500">Cin (C0)</span>
                    <button
                      onClick={() => setFaCin(faCin === 1 ? 0 : 1)}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono-code text-xl font-black transition-all shadow-md ${
                        faCin === 1
                          ? 'bg-amber-600 text-white ring-4 ring-amber-500/30'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                      }`}
                    >
                      {faCin}
                    </button>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono-code">{faCin ? 'HIGH' : 'LOW'}</span>
                  </div>
                </div>
              )}

              {/* 4-Bit Adder Input Toggles */}
              {selectedAdder === '4bit' && (
                <div className="space-y-4">
                  {/* Bus A */}
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-sub)] border border-[var(--border-color)] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-blue-500">Palabra A (4 Bits): {a3}{a2}{a1}{a0}₂ = {decimalA}₁₀</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[var(--text-secondary)] font-mono-code">Dec:</span>
                        <input
                          type="number"
                          min={0}
                          max={15}
                          value={decimalA}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            applyDecimal4Bit(val, decimalB, adder4Cin);
                          }}
                          className="w-12 px-1 py-0.5 text-center text-xs font-mono-code font-bold rounded bg-[var(--bg-surface)] border border-[var(--border-color)]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'A3 (MSB)', val: a3, set: setA3 },
                        { label: 'A2', val: a2, set: setA2 },
                        { label: 'A1', val: a1, set: setA1 },
                        { label: 'A0 (LSB)', val: a0, set: setA0 },
                      ].map((bit, idx) => (
                        <button
                          key={idx}
                          onClick={() => bit.set((bit.val === 1 ? 0 : 1) as 0 | 1)}
                          className={`p-2 rounded-lg flex flex-col items-center justify-center font-mono-code transition-all ${
                            bit.val === 1
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                          }`}
                        >
                          <span className="text-[9px] text-[var(--text-secondary)] mb-0.5">{bit.label}</span>
                          <span className="text-base font-extrabold">{bit.val}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bus B */}
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-sub)] border border-[var(--border-color)] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-indigo-400">Palabra B (4 Bits): {b3}{b2}{b1}{b0}₂ = {decimalB}₁₀</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[var(--text-secondary)] font-mono-code">Dec:</span>
                        <input
                          type="number"
                          min={0}
                          max={15}
                          value={decimalB}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            applyDecimal4Bit(decimalA, val, adder4Cin);
                          }}
                          className="w-12 px-1 py-0.5 text-center text-xs font-mono-code font-bold rounded bg-[var(--bg-surface)] border border-[var(--border-color)]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'B3 (MSB)', val: b3, set: setB3 },
                        { label: 'B2', val: b2, set: setB2 },
                        { label: 'B1', val: b1, set: setB1 },
                        { label: 'B0 (LSB)', val: b0, set: setB0 },
                      ].map((bit, idx) => (
                        <button
                          key={idx}
                          onClick={() => bit.set((bit.val === 1 ? 0 : 1) as 0 | 1)}
                          className={`p-2 rounded-lg flex flex-col items-center justify-center font-mono-code transition-all ${
                            bit.val === 1
                              ? 'bg-indigo-600 text-white font-bold shadow-xs'
                              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                          }`}
                        >
                          <span className="text-[9px] text-[var(--text-secondary)] mb-0.5">{bit.label}</span>
                          <span className="text-base font-extrabold">{bit.val}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cin Initial Carry */}
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-sub)] border border-[var(--border-color)] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-500 block">Acarreo Inicial (Cin / C0)</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Suma acarreo previo del sistema</span>
                    </div>
                    <button
                      onClick={() => setAdder4Cin(adder4Cin === 1 ? 0 : 1)}
                      className={`px-4 py-1.5 rounded-lg font-mono-code text-sm font-bold transition-all ${
                        adder4Cin === 1 ? 'bg-amber-600 text-white shadow-xs' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                      }`}
                    >
                      Cin = {adder4Cin}
                    </button>
                  </div>

                  {/* Fast Academic Preset Vectors */}
                  <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                      Casos de Prueba Académicos Rápidos:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono-code">
                      <button
                        onClick={() => applyDecimal4Bit(7, 2, 0)}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          decimalA === 7 && decimalB === 2 && adder4Cin === 0
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold ring-1 ring-emerald-500'
                            : 'bg-[var(--bg-surface-sub)] border-[var(--border-color)] hover:border-emerald-500/50'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>0111 + 0010 = 01001</span>
                          <span className="text-[9px] px-1 bg-emerald-500/20 text-emerald-400 rounded">7 + 2</span>
                        </div>
                        <span className="text-[9px] text-[var(--text-secondary)]">★ Requisito Obligatorio</span>
                      </button>

                      <button
                        onClick={() => applyDecimal4Bit(15, 15, 0)}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          decimalA === 15 && decimalB === 15 && adder4Cin === 0
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold ring-1 ring-emerald-500'
                            : 'bg-[var(--bg-surface-sub)] border-[var(--border-color)] hover:border-emerald-500/50'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>1111 + 1111 = 11110</span>
                          <span className="text-[9px] px-1 bg-emerald-500/20 text-emerald-400 rounded">15 + 15</span>
                        </div>
                        <span className="text-[9px] text-[var(--text-secondary)]">★ Requisito Obligatorio</span>
                      </button>

                      <button
                        onClick={() => applyDecimal4Bit(8, 7, 0)}
                        className="p-1.5 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] hover:border-blue-500 text-left"
                      >
                        1000 + 0111 = 15 (8+7)
                      </button>
                      <button
                        onClick={() => applyDecimal4Bit(15, 1, 0)}
                        className="p-1.5 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] hover:border-blue-500 text-left"
                      >
                        1111 + 0001 = 16 (Acarreo)
                      </button>
                      <button
                        onClick={() => applyDecimal4Bit(11, 6, 0)}
                        className="p-1.5 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] hover:border-blue-500 text-left"
                      >
                        1011 + 0110 = 17 (11+6)
                      </button>
                      <button
                        onClick={() => applyDecimal4Bit(7, 2, 1)}
                        className="p-1.5 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] hover:border-blue-500 text-left"
                      >
                        0111 + 0010 + 1 = 10
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Register current experiment button */}
              <button
                onClick={handleRegisterExperimentalRow}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Registrar Combinación Actual en el Historial</span>
              </button>
            </div>
          </div>

          {/* Right Column: Real-time Simulation Engine Visualizer (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-5 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-500" />
                    <span>Salidas Simuladas en Tiempo Real</span>
                  </h3>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    Calculadas paso a paso por el motor real de simulación
                  </span>
                </div>

                {/* Specific check banners */}
                {isReq1Verified && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    0111 + 0010 = 01001 Verificado
                  </span>
                )}
                {isReq2Verified && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    1111 + 1111 = 11110 Verificado
                  </span>
                )}
              </div>

              {/* Live Signal Badges for Half Adder */}
              {selectedAdder === 'half' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[var(--bg-surface-sub)] border border-[var(--border-color)] flex flex-col items-center justify-center space-y-2">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Suma S = A ⊕ B</span>
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center font-mono-code text-3xl font-black transition-all ${
                        simS === 1
                          ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                      }`}
                    >
                      {simS}
                    </div>
                    <span className="text-xs font-mono-code text-[var(--text-secondary)]">
                      {haA} ⊕ {haB} = {simS}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--bg-surface-sub)] border border-[var(--border-color)] flex flex-col items-center justify-center space-y-2">
                    <span className="text-xs font-bold text-amber-500">Acarreo C = A · B</span>
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center font-mono-code text-3xl font-black transition-all ${
                        simC === 1
                          ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                      }`}
                    >
                      {simC}
                    </div>
                    <span className="text-xs font-mono-code text-[var(--text-secondary)]">
                      {haA} · {haB} = {simC}
                    </span>
                  </div>
                </div>
              )}

              {/* Live Signal Badges for Full Adder */}
              {selectedAdder === 'full' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[var(--bg-surface-sub)] border border-[var(--border-color)] flex flex-col items-center justify-center space-y-2">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Suma S = A ⊕ B ⊕ Cin</span>
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center font-mono-code text-3xl font-black transition-all ${
                        simS === 1
                          ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                      }`}
                    >
                      {simS}
                    </div>
                    <span className="text-xs font-mono-code text-[var(--text-secondary)]">
                      {faA} ⊕ {faB} ⊕ {faCin} = {simS}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--bg-surface-sub)] border border-[var(--border-color)] flex flex-col items-center justify-center space-y-2">
                    <span className="text-xs font-bold text-amber-500">Acarreo Cout</span>
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center font-mono-code text-3xl font-black transition-all ${
                        simC === 1
                          ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                      }`}
                    >
                      {simC}
                    </div>
                    <span className="text-xs font-mono-code text-[var(--text-secondary)]">
                      Acarreo hacia la etapa superior
                    </span>
                  </div>
                </div>
              )}

              {/* Live Signal Badges for 4-Bit Adder */}
              {selectedAdder === '4bit' && (
                <div className="space-y-4">
                  {/* Carry Ripple Cascade Visualizer */}
                  {adder4Arch === 'ripple' && liveSimulationOutputs.intermediateCarries && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                      <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">
                        Propagación de Acarreos en Cascada (Ripple Carry Chaining):
                      </span>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono-code">
                        <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-color)]">
                          <span className="text-[10px] text-[var(--text-secondary)] block">Etapa 0 (Cin)</span>
                          <span className="font-bold text-amber-500">{adder4Cin}</span>
                          <span className="text-[9px] text-[var(--text-secondary)] block">C0 → FA0</span>
                        </div>
                        <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-color)]">
                          <span className="text-[10px] text-[var(--text-secondary)] block">FA0 → FA1</span>
                          <span className="font-bold text-amber-500">{liveSimulationOutputs.intermediateCarries.c1}</span>
                          <span className="text-[9px] text-[var(--text-secondary)] block">Acarreo C1</span>
                        </div>
                        <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-color)]">
                          <span className="text-[10px] text-[var(--text-secondary)] block">FA1 → FA2</span>
                          <span className="font-bold text-amber-500">{liveSimulationOutputs.intermediateCarries.c2}</span>
                          <span className="text-[9px] text-[var(--text-secondary)] block">Acarreo C2</span>
                        </div>
                        <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-color)]">
                          <span className="text-[10px] text-[var(--text-secondary)] block">FA2 → FA3</span>
                          <span className="font-bold text-amber-500">{liveSimulationOutputs.intermediateCarries.c3}</span>
                          <span className="text-[9px] text-[var(--text-secondary)] block">Acarreo C3</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5-Bit Final Output Bus */}
                  <div className="p-4 rounded-xl bg-[var(--bg-surface-sub)] border border-[var(--border-color)] space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>Bus de Salida Suma Completa [Cout S3 S2 S1 S0]:</span>
                      <span className="font-mono-code text-blue-500 text-sm">
                        Total Decimal: {simulatedDecimalSum ?? 'X'}₁₀
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {/* Cout */}
                      <div
                        className={`p-3 rounded-xl flex flex-col items-center justify-center font-mono-code transition-all ${
                          simCout === 1
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                        }`}
                      >
                        <span className="text-[9px] opacity-80 mb-0.5">Cout (2⁴)</span>
                        <span className="text-xl font-black">{simCout}</span>
                      </div>

                      {/* S3 */}
                      <div
                        className={`p-3 rounded-xl flex flex-col items-center justify-center font-mono-code transition-all ${
                          simS3 === 1
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                        }`}
                      >
                        <span className="text-[9px] opacity-80 mb-0.5">S3 (2³)</span>
                        <span className="text-xl font-black">{simS3}</span>
                      </div>

                      {/* S2 */}
                      <div
                        className={`p-3 rounded-xl flex flex-col items-center justify-center font-mono-code transition-all ${
                          simS2 === 1
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                        }`}
                      >
                        <span className="text-[9px] opacity-80 mb-0.5">S2 (2²)</span>
                        <span className="text-xl font-black">{simS2}</span>
                      </div>

                      {/* S1 */}
                      <div
                        className={`p-3 rounded-xl flex flex-col items-center justify-center font-mono-code transition-all ${
                          simS1 === 1
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                        }`}
                      >
                        <span className="text-[9px] opacity-80 mb-0.5">S1 (2¹)</span>
                        <span className="text-xl font-black">{simS1}</span>
                      </div>

                      {/* S0 */}
                      <div
                        className={`p-3 rounded-xl flex flex-col items-center justify-center font-mono-code transition-all ${
                          simS0 === 1
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                        }`}
                      >
                        <span className="text-[9px] opacity-80 mb-0.5">S0 (2⁰)</span>
                        <span className="text-xl font-black">{simS0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Mathematical Check Summary */}
                  <div className="p-3 rounded-lg bg-[var(--bg-surface-sub)] border border-[var(--border-color)] flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)] font-mono-code">
                      Operación: {decimalA} + {decimalB} {adder4Cin ? `+ ${adder4Cin}` : ''} = {theoreticalTotalSum}₁₀ ({theoreticalBinarySum}₂)
                    </span>
                    <span
                      className={`font-bold flex items-center gap-1 ${
                        simulatedBinary5Bit === theoreticalBinarySum ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      {simulatedBinary5Bit === theoreticalBinarySum ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Simulación Exacta
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4" />
                          Discrepancia
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Tabbed Experimental Data Tables & Results Analysis */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-xs overflow-hidden">
          {/* Table Header & View Switcher */}
          <div className="p-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveViewTab('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeViewTab === 'table'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-sub)]'
                }`}
              >
                Tabla de Verdad Completa ({simulatedTruthTable.length} Combinaciones)
              </button>

              <button
                onClick={() => setActiveViewTab('log')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeViewTab === 'log'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-sub)]'
                }`}
              >
                <span>Registro Experimental</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--bg-surface-sub)] border border-[var(--border-color)]">
                  {experimentalLog.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {activeViewTab === 'log' && experimentalLog.length > 0 && (
                <button
                  onClick={() => setExperimentalLog([])}
                  className="px-2.5 py-1 rounded text-red-400 hover:bg-red-500/10 border border-red-500/20 font-semibold"
                >
                  Limpiar Registro
                </button>
              )}
            </div>
          </div>

          {/* Tab 1: Comprehensive Simulated Truth Table */}
          {activeViewTab === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] uppercase text-[10px] tracking-wider border-b border-[var(--border-color)] font-mono-code">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Entradas Binarias</th>
                    <th className="px-4 py-3">Salidas Simuladas (Motor Real)</th>
                    <th className="px-4 py-3">Salidas Teóricas</th>
                    <th className="px-4 py-3">Operación Decimal / Nota</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)] font-mono-code">
                  {simulatedTruthTable.map((row) => {
                    // Check if current row matches active inputs
                    let isCurrentActiveRow = false;
                    if (selectedAdder === 'half') {
                      isCurrentActiveRow = row.inputs.A === haA && row.inputs.B === haB;
                    } else if (selectedAdder === 'full') {
                      isCurrentActiveRow = row.inputs.A === faA && row.inputs.B === faB && row.inputs.Cin === faCin;
                    } else {
                      isCurrentActiveRow =
                        row.inputs.A === decimalA &&
                        row.inputs.B === decimalB &&
                        row.inputs.Cin === adder4Cin;
                    }

                    return (
                      <tr
                        key={row.index}
                        className={`transition-colors ${
                          isCurrentActiveRow
                            ? 'bg-blue-500/15 font-bold border-l-4 border-l-blue-500'
                            : 'hover:bg-[var(--bg-surface-sub)]'
                        }`}
                      >
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">{row.index}</td>
                        <td className="px-4 py-2.5 text-[var(--text-primary)] font-bold">{row.binaryInputs}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-blue-500">
                            {Object.entries(row.outputs).map(([k, v]) => `${k}=${v}`).join('  ')}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                          {Object.entries(row.expectedOutputs).map(([k, v]) => `${k}=${v}`).join('  ')}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">{row.decimalExpression}</td>
                        <td className="px-4 py-2.5 text-center">
                          {row.isMatch ? (
                            <span className="inline-flex items-center gap-1 text-emerald-500 font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" /> Coincide
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-500 font-bold text-[10px] bg-red-500/10 px-2 py-0.5 rounded">
                              <AlertCircle className="w-3 h-3" /> Error
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: User Experimental Log */}
          {activeViewTab === 'log' && (
            <div className="overflow-x-auto">
              {experimentalLog.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-secondary)] space-y-2">
                  <ClipboardCheck className="w-8 h-8 mx-auto text-[var(--text-secondary)] opacity-50" />
                  <p className="text-xs font-semibold">No hay pruebas experimentales registradas aún.</p>
                  <p className="text-[11px]">
                    Configure los niveles lógicos de entrada y pulse «Registrar Combinación Actual» para registrar los resultados obtenidos del simulador.
                  </p>
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--bg-surface-sub)] text-[var(--text-secondary)] uppercase text-[10px] tracking-wider border-b border-[var(--border-color)] font-mono-code">
                    <tr>
                      <th className="px-4 py-3">Hora</th>
                      <th className="px-4 py-3">Módulo</th>
                      <th className="px-4 py-3">Arquitectura</th>
                      <th className="px-4 py-3">Entradas Probadas</th>
                      <th className="px-4 py-3">Salidas Obtenidas</th>
                      <th className="px-4 py-3">Salidas Esperadas</th>
                      <th className="px-4 py-3 text-center">Validación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] font-mono-code">
                    {experimentalLog.map((entry) => (
                      <tr key={entry.id} className="hover:bg-[var(--bg-surface-sub)]">
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">{entry.timestamp}</td>
                        <td className="px-4 py-2.5 font-bold text-[var(--text-primary)]">{entry.circuitType}</td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)] text-[11px]">{entry.architecture}</td>
                        <td className="px-4 py-2.5 font-bold text-blue-500">
                          {Object.entries(entry.inputs).map(([k, v]) => `${k}=${v}`).join(' ')}
                        </td>
                        <td className="px-4 py-2.5 text-emerald-400 font-bold">
                          {Object.entries(entry.outputs).map(([k, v]) => `${k}=${v}`).join(' ')}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                          {Object.entries(entry.expectedOutputs).map(([k, v]) => `${k}=${v}`).join(' ')}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {entry.isCorrect ? (
                            <span className="inline-flex items-center gap-1 text-emerald-500 font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" /> Validado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-500 font-bold text-[10px] bg-red-500/10 px-2 py-0.5 rounded">
                              <AlertCircle className="w-3 h-3" /> Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {/* Modal: Laboratory Evidence Capture */}
      {isEvidenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Evidencia Formal de Laboratorio
                </h3>
              </div>
              <button
                onClick={() => setIsEvidenceModalOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Reporte generado a partir de la simulación activa para entregar como evidencia de la práctica académica.
            </p>

            <pre className="flex-1 overflow-y-auto p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-color)] text-[11px] font-mono-code text-[var(--text-primary)] whitespace-pre-wrap select-text leading-relaxed">
              {evidenceReportText}
            </pre>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <button
                onClick={handleCopyEvidence}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--bg-surface-sub)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] transition-all"
              >
                {evidenceCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-blue-500" />}
                <span>{evidenceCopied ? '¡Copiado!' : 'Copiar al Portapapeles'}</span>
              </button>

              <button
                onClick={handleDownloadEvidence}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Reporte (.txt)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
