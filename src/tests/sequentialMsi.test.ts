/**
 * Unit Tests for Advanced Sequential Electronics & MSI 74xx Standard ICs
 * Tests Flip-Flop D & JK with ~PRE/~CLR, 74LS90, 74LS194, 74LS85, and 74LS151
 */

import { describe, it, expect } from 'vitest';
import { createComponent } from '../engines/circuit/generator';
import { CircuitSimulator } from '../engines/circuit/simulator';
import { CircuitComponent, WireConnection } from '../types';

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

  let currentComp = comp;
  let currentSwitches = switches;
  let currentWires = wires;

  const simulate = (inputValues: Record<string, 0 | 1>, isClock = false) => {
    currentSwitches.forEach((sw) => {
      const pinName = sw.label.replace('SW_', '');
      if (inputValues[pinName] !== undefined) {
        const v = inputValues[pinName];
        if (!sw.state) sw.state = {};
        sw.state.switchActive = v === 1;
        sw.outputs[0].value = v;
      }
    });

    const res = CircuitSimulator.step([...currentSwitches, currentComp], currentWires, isClock);
    currentComp = res.components.find((c) => c.id === comp.id)!;
    currentSwitches = res.components.filter((c) => c.type === 'SWITCH');
    currentWires = res.connections;
    return currentComp;
  };

  return { switches, wires, simulate };
}

describe('Sequential MSI & Flip-Flop with PRE/CLR Tests', () => {
  describe('Flip-Flop D with Asynchronous Active-Low ~PRE and ~CLR', () => {
    it('sets Q=1 when ~PRE=0 and ~CLR=1 asynchronously without clock', () => {
      const dff = createComponent('FLIPFLOP_D', 100, 100, 'DFF_TEST');
      const tb = createTestbench(dff);

      const evaluated = tb.simulate({ D: 0, CLK: 0, '~PRE': 0, '~CLR': 1 }, false);
      expect(evaluated.outputs[0].value).toBe(1); // Q
      expect(evaluated.outputs[1].value).toBe(0); // Q'
    });

    it('clears Q=0 when ~CLR=0 and ~PRE=1 asynchronously without clock', () => {
      const dff = createComponent('FLIPFLOP_D', 100, 100, 'DFF_TEST');
      const tb = createTestbench(dff);

      const evaluated = tb.simulate({ D: 1, CLK: 0, '~PRE': 1, '~CLR': 0 }, false);
      expect(evaluated.outputs[0].value).toBe(0); // Q
      expect(evaluated.outputs[1].value).toBe(1); // Q'
    });

    it('operates synchronously on rising clock edge when ~PRE=1 and ~CLR=1', () => {
      const dff = createComponent('FLIPFLOP_D', 100, 100, 'DFF_TEST');
      const tb = createTestbench(dff);

      // Low clock
      let evaluated = tb.simulate({ D: 1, CLK: 0, '~PRE': 1, '~CLR': 1 }, false);
      expect(evaluated.outputs[0].value).toBe(0); // not set yet

      // Rising clock edge (0 -> 1)
      evaluated = tb.simulate({ D: 1, CLK: 1, '~PRE': 1, '~CLR': 1 }, true);
      expect(evaluated.outputs[0].value).toBe(1); // clocked HIGH
      expect(evaluated.outputs[1].value).toBe(0);
    });
  });

  describe('Flip-Flop JK with Asynchronous ~PRE and ~CLR', () => {
    it('sets Q=1 on ~PRE=0 and clears Q=0 on ~CLR=0', () => {
      const jk = createComponent('FLIPFLOP_JK', 100, 100, 'JK_TEST');
      const tb = createTestbench(jk);

      let evaluated = tb.simulate({ J: 0, K: 0, CLK: 0, '~PRE': 0, '~CLR': 1 }, false);
      expect(evaluated.outputs[0].value).toBe(1);

      evaluated = tb.simulate({ J: 0, K: 0, CLK: 0, '~PRE': 1, '~CLR': 0 }, false);
      expect(evaluated.outputs[0].value).toBe(0);
    });

    it('toggles Q when J=1, K=1 on clock rising edges', () => {
      const jk = createComponent('FLIPFLOP_JK', 100, 100, 'JK_TEST');
      const tb = createTestbench(jk);

      // Initial state Q=0
      tb.simulate({ J: 1, K: 1, CLK: 0, '~PRE': 1, '~CLR': 1 }, false);

      // Cycle 1: rising edge -> toggles from 0 to 1
      let evaluated = tb.simulate({ J: 1, K: 1, CLK: 1, '~PRE': 1, '~CLR': 1 }, true);
      expect(evaluated.outputs[0].value).toBe(1);

      // Falling edge
      tb.simulate({ J: 1, K: 1, CLK: 0, '~PRE': 1, '~CLR': 1 }, false);

      // Cycle 2: rising edge -> toggles from 1 to 0
      evaluated = tb.simulate({ J: 1, K: 1, CLK: 1, '~PRE': 1, '~CLR': 1 }, true);
      expect(evaluated.outputs[0].value).toBe(0);
    });
  });

  describe('74LS90 Decade Counter (Asynchronous BCD)', () => {
    it('divides by 2 on falling edge of CLK A', () => {
      const ic90 = createComponent('IC_74LS90', 100, 100, '7490_TEST');
      const tb = createTestbench(ic90);

      // Initial state: QA=0
      let evaluated = tb.simulate({ 'CLK A': 0, 'CLK B': 0, 'R0(1)': 0, 'R0(2)': 0, 'R9(1)': 0, 'R9(2)': 0 }, false);
      expect(evaluated.outputs[0].value).toBe(0);

      // Rising edge (0 -> 1) does NOT advance falling-edge counter
      evaluated = tb.simulate({ 'CLK A': 1, 'CLK B': 0, 'R0(1)': 0, 'R0(2)': 0, 'R9(1)': 0, 'R9(2)': 0 }, false);
      expect(evaluated.outputs[0].value).toBe(0);

      // Falling edge (1 -> 0) toggles QA to 1
      evaluated = tb.simulate({ 'CLK A': 0, 'CLK B': 0, 'R0(1)': 0, 'R0(2)': 0, 'R9(1)': 0, 'R9(2)': 0 }, false);
      expect(evaluated.outputs[0].value).toBe(1);

      // Second falling edge toggles QA back to 0
      tb.simulate({ 'CLK A': 1, 'CLK B': 0, 'R0(1)': 0, 'R0(2)': 0, 'R9(1)': 0, 'R9(2)': 0 }, false);
      evaluated = tb.simulate({ 'CLK A': 0, 'CLK B': 0, 'R0(1)': 0, 'R0(2)': 0, 'R9(1)': 0, 'R9(2)': 0 }, false);
      expect(evaluated.outputs[0].value).toBe(0);
    });

    it('resets to 0000 when R0(1)=1 and R0(2)=1', () => {
      const ic90 = createComponent('IC_74LS90', 100, 100, '7490_TEST');
      const tb = createTestbench(ic90);

      // Set R0(1)=1, R0(2)=1
      const evaluated = tb.simulate({ 'CLK A': 0, 'CLK B': 0, 'R0(1)': 1, 'R0(2)': 1, 'R9(1)': 0, 'R9(2)': 0 }, false);
      expect(evaluated.outputs[0].value).toBe(0); // QA
      expect(evaluated.outputs[1].value).toBe(0); // QB
      expect(evaluated.outputs[2].value).toBe(0); // QC
      expect(evaluated.outputs[3].value).toBe(0); // QD
    });

    it('resets to 1001 (BCD 9) when R9(1)=1 and R9(2)=1', () => {
      const ic90 = createComponent('IC_74LS90', 100, 100, '7490_TEST');
      const tb = createTestbench(ic90);

      const evaluated = tb.simulate({ 'CLK A': 0, 'CLK B': 0, 'R0(1)': 0, 'R0(2)': 0, 'R9(1)': 1, 'R9(2)': 1 }, false);
      expect(evaluated.outputs[0].value).toBe(1); // QA (1)
      expect(evaluated.outputs[1].value).toBe(0); // QB (0)
      expect(evaluated.outputs[2].value).toBe(0); // QC (0)
      expect(evaluated.outputs[3].value).toBe(1); // QD (8) -> Total = 9
    });
  });

  describe('74LS194 4-Bit Universal Shift Register', () => {
    it('executes Parallel Load when S1=1, S0=1 on clock rising edge', () => {
      const ic194 = createComponent('IC_74LS194', 100, 100, '74194_TEST');
      const tb = createTestbench(ic194);

      // Low clock
      tb.simulate({ '~CLR': 1, CLK: 0, S0: 1, S1: 1, SR: 0, SL: 0, D0: 1, D1: 0, D2: 1, D3: 1 }, false);
      // Rising clock edge
      const evaluated = tb.simulate({ '~CLR': 1, CLK: 1, S0: 1, S1: 1, SR: 0, SL: 0, D0: 1, D1: 0, D2: 1, D3: 1 }, true);

      expect(evaluated.outputs[0].value).toBe(1); // Q0
      expect(evaluated.outputs[1].value).toBe(0); // Q1
      expect(evaluated.outputs[2].value).toBe(1); // Q2
      expect(evaluated.outputs[3].value).toBe(1); // Q3
    });

    it('executes Shift Right when S1=0, S0=1', () => {
      const ic194 = createComponent('IC_74LS194', 100, 100, '74194_TEST');
      const tb = createTestbench(ic194);

      // 1. Parallel load 1010
      tb.simulate({ '~CLR': 1, CLK: 0, S0: 1, S1: 1, SR: 0, SL: 0, D0: 1, D1: 0, D2: 1, D3: 0 }, false);
      tb.simulate({ '~CLR': 1, CLK: 1, S0: 1, S1: 1, SR: 0, SL: 0, D0: 1, D1: 0, D2: 1, D3: 0 }, true);

      // 2. Shift Right with SR=0 (Clock 0 -> 1)
      tb.simulate({ '~CLR': 1, CLK: 0, S0: 1, S1: 0, SR: 0, SL: 0, D0: 0, D1: 0, D2: 0, D3: 0 }, false);
      const evaluated = tb.simulate({ '~CLR': 1, CLK: 1, S0: 1, S1: 0, SR: 0, SL: 0, D0: 0, D1: 0, D2: 0, D3: 0 }, true);

      // Expected shift: Q0 <- SR (0), Q1 <- Q0 (1), Q2 <- Q1 (0), Q3 <- Q2 (1)
      expect(evaluated.outputs[0].value).toBe(0);
      expect(evaluated.outputs[1].value).toBe(1);
      expect(evaluated.outputs[2].value).toBe(0);
      expect(evaluated.outputs[3].value).toBe(1);
    });

    it('asynchronously clears all bits to 0 when ~CLR=0', () => {
      const ic194 = createComponent('IC_74LS194', 100, 100, '74194_TEST');
      const tb = createTestbench(ic194);

      // Load all 1s
      tb.simulate({ '~CLR': 1, CLK: 0, S0: 1, S1: 1, SR: 0, SL: 0, D0: 1, D1: 1, D2: 1, D3: 1 }, false);
      tb.simulate({ '~CLR': 1, CLK: 1, S0: 1, S1: 1, SR: 0, SL: 0, D0: 1, D1: 1, D2: 1, D3: 1 }, true);

      // Clear ~CLR=0
      const evaluated = tb.simulate({ '~CLR': 0, CLK: 0, S0: 1, S1: 1, SR: 0, SL: 0, D0: 1, D1: 1, D2: 1, D3: 1 }, false);

      expect(evaluated.outputs[0].value).toBe(0);
      expect(evaluated.outputs[1].value).toBe(0);
      expect(evaluated.outputs[2].value).toBe(0);
      expect(evaluated.outputs[3].value).toBe(0);
    });
  });

  describe('74LS85 4-Bit Magnitude Comparator', () => {
    it('accurately evaluates A > B', () => {
      const comp = createComponent('IC_74LS85', 100, 100, '7485_TEST');
      const tb = createTestbench(comp);

      // A = 9 (1001), B = 5 (0101), Cascading: I_A>B=0, I_A=B=1, I_A<B=0
      const evaluated = tb.simulate({
        A3: 1, A2: 0, A1: 0, A0: 1,
        B3: 0, B2: 1, B1: 0, B0: 1,
        'I_A>B': 0, 'I_A=B': 1, 'I_A<B': 0,
      });

      expect(evaluated.outputs.find((p) => p.name === 'A>B')!.value).toBe(1);
      expect(evaluated.outputs.find((p) => p.name === 'A=B')!.value).toBe(0);
      expect(evaluated.outputs.find((p) => p.name === 'A<B')!.value).toBe(0);
    });

    it('accurately evaluates A = B with cascading input propagation', () => {
      const comp = createComponent('IC_74LS85', 100, 100, '7485_TEST');
      const tb = createTestbench(comp);

      // A = 6 (0110), B = 6 (0110), Cascading: I_A>B=0, I_A=B=1, I_A<B=0
      const evaluated = tb.simulate({
        A3: 0, A2: 1, A1: 1, A0: 0,
        B3: 0, B2: 1, B1: 1, B0: 0,
        'I_A>B': 0, 'I_A=B': 1, 'I_A<B': 0,
      });

      expect(evaluated.outputs.find((p) => p.name === 'A>B')!.value).toBe(0);
      expect(evaluated.outputs.find((p) => p.name === 'A=B')!.value).toBe(1);
      expect(evaluated.outputs.find((p) => p.name === 'A<B')!.value).toBe(0);
    });
  });

  describe('74LS151 8-to-1 Multiplexer', () => {
    it('routes selected input channel to Y and inverted to ~W', () => {
      const mux = createComponent('IC_74LS151', 100, 100, '74151_TEST');
      const tb = createTestbench(mux);

      // Select Channel 3 (S2=0, S1=1, S0=1), D3=1, others 0, ~E=0
      const evaluated = tb.simulate({
        D0: 0, D1: 0, D2: 0, D3: 1, D4: 0, D5: 0, D6: 0, D7: 0,
        S0: 1, S1: 1, S2: 0, '~E': 0,
      });

      expect(evaluated.outputs.find((p) => p.name === 'Y')!.value).toBe(1);
      expect(evaluated.outputs.find((p) => p.name === '~W')!.value).toBe(0);
    });

    it('forces Y=0 and ~W=1 when active-low strobe ~E=1 (disabled)', () => {
      const mux = createComponent('IC_74LS151', 100, 100, '74151_TEST');
      const tb = createTestbench(mux);

      const evaluated = tb.simulate({
        D0: 1, D1: 1, D2: 1, D3: 1, D4: 1, D5: 1, D6: 1, D7: 1,
        S0: 0, S1: 0, S2: 0, '~E': 1,
      });

      expect(evaluated.outputs.find((p) => p.name === 'Y')!.value).toBe(0);
      expect(evaluated.outputs.find((p) => p.name === '~W')!.value).toBe(1);
    });
  });
});
