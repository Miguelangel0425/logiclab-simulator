/**
 * Unit Tests for Academic Laboratory Challenges & Testbench Engine
 */

import { describe, it, expect } from 'vitest';
import { LAB_CHALLENGES, runChallengeTestbench } from '../data/labChallenges';

describe('Academic Lab Challenges & Autograding Tests', () => {
  it('contains all 6 laboratory challenges with complete specifications', () => {
    expect(LAB_CHALLENGES.length).toBe(6);
    const ids = LAB_CHALLENGES.map((c) => c.id);
    expect(ids).toContain('challenge_parity');
    expect(ids).toContain('challenge_universal_nand');
    expect(ids).toContain('challenge_comp_2bit');
    expect(ids).toContain('challenge_bcd_detector');
    expect(ids).toContain('challenge_counter_mod6');
    expect(ids).toContain('challenge_shift_ring');
  });

  it('evaluates Reto 1 (Generador de Paridad Par) to 100% score with initial circuit', () => {
    const parityChallenge = LAB_CHALLENGES.find((c) => c.id === 'challenge_parity')!;
    const circuit = parityChallenge.initialCircuit();
    const result = runChallengeTestbench(circuit, parityChallenge, 'Carlos Gómez');

    expect(result.score).toBe(100);
    expect(result.passedCount).toBe(parityChallenge.testVectors.length);
    expect(result.verificationHash).toMatch(/^LL-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(result.studentName).toBe('Carlos Gómez');
  });

  it('evaluates Reto 2 (Lógica Universal NAND) to 100% score with initial circuit', () => {
    const nandChallenge = LAB_CHALLENGES.find((c) => c.id === 'challenge_universal_nand')!;
    const circuit = nandChallenge.initialCircuit();
    const result = runChallengeTestbench(circuit, nandChallenge, 'Elena Ruiz');

    expect(result.score).toBe(100);
    expect(result.passedCount).toBe(nandChallenge.testVectors.length);
  });

  it('evaluates Reto 3 (Comparador 2 Bits con 74LS85) to 100% score with initial circuit', () => {
    const compChallenge = LAB_CHALLENGES.find((c) => c.id === 'challenge_comp_2bit')!;
    const circuit = compChallenge.initialCircuit();
    const result = runChallengeTestbench(circuit, compChallenge, 'Mario Soto');

    expect(result.score).toBe(100);
    expect(result.passedCount).toBe(compChallenge.testVectors.length);
  });

  it('evaluates Reto 4 (Detector BCD Inválido) to 100% score with initial circuit', () => {
    const bcdChallenge = LAB_CHALLENGES.find((c) => c.id === 'challenge_bcd_detector')!;
    const circuit = bcdChallenge.initialCircuit();
    const result = runChallengeTestbench(circuit, bcdChallenge, 'Lucía Morales');

    expect(result.score).toBe(100);
    expect(result.passedCount).toBe(bcdChallenge.testVectors.length);
  });
});
