/**
 * LogicLab - Custom Subcircuit Definition Registry & Factory
 * Manages custom user-defined IC components, port mapping,
 * localStorage persistence, and built-in reference subcircuits.
 */

import { CircuitComponent, Pin, SubcircuitDefinition, SubcircuitPort, WireConnection } from '../../types';
import { createComponent } from './generator';

const STORAGE_KEY = 'logiclab_custom_subcircuits';

// Build the built-in reference FULL ADDER subcircuit
function buildReferenceFullAdder(): SubcircuitDefinition {
  const swA = createComponent('SWITCH', 60, 60, 'A');
  const swB = createComponent('SWITCH', 60, 140, 'B');
  const swCin = createComponent('SWITCH', 60, 220, 'Cin');

  // XOR 1: A ^ B
  const xor1 = createComponent('XOR', 220, 80, 'XOR1 (A⊕B)');
  // XOR 2: (A ^ B) ^ Cin -> Sum
  const xor2 = createComponent('XOR', 380, 100, 'XOR2 (Sum)');

  // AND 1: A & B
  const and1 = createComponent('AND', 220, 240, 'AND1 (A·B)');
  // AND 2: (A ^ B) & Cin
  const and2 = createComponent('AND', 380, 200, 'AND2 ((A⊕B)·Cin)');

  // OR 1: (A & B) | ((A ^ B) & Cin) -> Cout
  const or1 = createComponent('OR', 520, 220, 'OR1 (Cout)');

  const ledS = createComponent('LED', 660, 100, 'S (Suma)');
  const ledCout = createComponent('LED', 660, 220, 'Cout (Acarreo)');

  const components: CircuitComponent[] = [swA, swB, swCin, xor1, xor2, and1, and2, or1, ledS, ledCout];

  const connections: WireConnection[] = [
    // A -> XOR1 input 0, AND1 input 0
    { id: 'w_fa_a_xor', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: xor1.id, toPinId: xor1.inputs[0].id, value: 0 },
    { id: 'w_fa_a_and', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: and1.id, toPinId: and1.inputs[0].id, value: 0 },

    // B -> XOR1 input 1, AND1 input 1
    { id: 'w_fa_b_xor', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: xor1.id, toPinId: xor1.inputs[1].id, value: 0 },
    { id: 'w_fa_b_and', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: and1.id, toPinId: and1.inputs[1].id, value: 0 },

    // XOR1 output -> XOR2 input 0, AND2 input 0
    { id: 'w_fa_xor1_xor2', fromComponentId: xor1.id, fromPinId: xor1.outputs[0].id, toComponentId: xor2.id, toPinId: xor2.inputs[0].id, value: 0 },
    { id: 'w_fa_xor1_and2', fromComponentId: xor1.id, fromPinId: xor1.outputs[0].id, toComponentId: and2.id, toPinId: and2.inputs[0].id, value: 0 },

    // Cin -> XOR2 input 1, AND2 input 1
    { id: 'w_fa_cin_xor', fromComponentId: swCin.id, fromPinId: swCin.outputs[0].id, toComponentId: xor2.id, toPinId: xor2.inputs[1].id, value: 0 },
    { id: 'w_fa_cin_and', fromComponentId: swCin.id, fromPinId: swCin.outputs[0].id, toComponentId: and2.id, toPinId: and2.inputs[1].id, value: 0 },

    // XOR2 output -> LED S
    { id: 'w_fa_s', fromComponentId: xor2.id, fromPinId: xor2.outputs[0].id, toComponentId: ledS.id, toPinId: ledS.inputs[0].id, value: 0 },

    // AND1 output -> OR1 input 0
    { id: 'w_fa_and1_or', fromComponentId: and1.id, fromPinId: and1.outputs[0].id, toComponentId: or1.id, toPinId: or1.inputs[0].id, value: 0 },

    // AND2 output -> OR1 input 1
    { id: 'w_fa_and2_or', fromComponentId: and2.id, fromPinId: and2.outputs[0].id, toComponentId: or1.id, toPinId: or1.inputs[1].id, value: 0 },

    // OR1 output -> LED Cout
    { id: 'w_fa_cout', fromComponentId: or1.id, fromPinId: or1.outputs[0].id, toComponentId: ledCout.id, toPinId: ledCout.inputs[0].id, value: 0 },
  ];

  const ports: SubcircuitPort[] = [
    { id: 'port_a', name: 'A', type: 'input', targetComponentId: swA.id, targetPinId: swA.outputs[0].id, order: 0, label: 'Entrada A' },
    { id: 'port_b', name: 'B', type: 'input', targetComponentId: swB.id, targetPinId: swB.outputs[0].id, order: 1, label: 'Entrada B' },
    { id: 'port_cin', name: 'Cin', type: 'input', targetComponentId: swCin.id, targetPinId: swCin.outputs[0].id, order: 2, label: 'Acarreo de entrada' },
    { id: 'port_s', name: 'S', type: 'output', targetComponentId: ledS.id, targetPinId: ledS.inputs[0].id, order: 0, label: 'Suma (S)' },
    { id: 'port_cout', name: 'Cout', type: 'output', targetComponentId: ledCout.id, targetPinId: ledCout.inputs[0].id, order: 1, label: 'Acarreo de salida' },
  ];

  return {
    id: 'sub_full_adder_reference',
    name: 'FULL ADDER',
    description: 'Sumador completo de 1 bit con acarreo de entrada Cin y salidas de Suma (S) y Acarreo (Cout).',
    category: 'Aritmética',
    components,
    connections,
    ports,
    version: 1,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    readOnly: false,
  };
}

// Build reference HALF ADDER subcircuit
function buildReferenceHalfAdder(): SubcircuitDefinition {
  const swA = createComponent('SWITCH', 60, 60, 'A');
  const swB = createComponent('SWITCH', 60, 160, 'B');
  const xor1 = createComponent('XOR', 220, 80, 'XOR1 (Suma)');
  const and1 = createComponent('AND', 220, 180, 'AND1 (Acarreo)');
  const ledS = createComponent('LED', 380, 80, 'S (Suma)');
  const ledC = createComponent('LED', 380, 180, 'C (Acarreo)');

  const components: CircuitComponent[] = [swA, swB, xor1, and1, ledS, ledC];

  const connections: WireConnection[] = [
    { id: 'w_ha_a_xor', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: xor1.id, toPinId: xor1.inputs[0].id, value: 0 },
    { id: 'w_ha_a_and', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: and1.id, toPinId: and1.inputs[0].id, value: 0 },
    { id: 'w_ha_b_xor', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: xor1.id, toPinId: xor1.inputs[1].id, value: 0 },
    { id: 'w_ha_b_and', fromComponentId: swB.id, fromPinId: swB.outputs[0].id, toComponentId: and1.id, toPinId: and1.inputs[1].id, value: 0 },
    { id: 'w_ha_s', fromComponentId: xor1.id, fromPinId: xor1.outputs[0].id, toComponentId: ledS.id, toPinId: ledS.inputs[0].id, value: 0 },
    { id: 'w_ha_c', fromComponentId: and1.id, fromPinId: and1.outputs[0].id, toComponentId: ledC.id, toPinId: ledC.inputs[0].id, value: 0 },
  ];

  const ports: SubcircuitPort[] = [
    { id: 'port_ha_a', name: 'A', type: 'input', targetComponentId: swA.id, targetPinId: swA.outputs[0].id, order: 0, label: 'Entrada A' },
    { id: 'port_ha_b', name: 'B', type: 'input', targetComponentId: swB.id, targetPinId: swB.outputs[0].id, order: 1, label: 'Entrada B' },
    { id: 'port_ha_s', name: 'S', type: 'output', targetComponentId: ledS.id, targetPinId: ledS.inputs[0].id, order: 0, label: 'Suma (S)' },
    { id: 'port_ha_c', name: 'C', type: 'output', targetComponentId: ledC.id, targetPinId: ledC.inputs[0].id, order: 1, label: 'Acarreo (C)' },
  ];

  return {
    id: 'sub_half_adder_reference',
    name: 'HALF ADDER',
    description: 'Semisumador de 2 bits con salidas S = A⊕B y C = A·B.',
    category: 'Aritmética',
    components,
    connections,
    ports,
    version: 1,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    readOnly: false,
  };
}

export class SubcircuitRegistry {
  private static definitions: Map<string, SubcircuitDefinition> = new Map();
  private static isInitialized = false;

  public static initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Load built-in standards
    const fa = buildReferenceFullAdder();
    const ha = buildReferenceHalfAdder();
    this.definitions.set(fa.id, fa);
    this.definitions.set('builtin_full_adder', fa);
    this.definitions.set(ha.id, ha);
    this.definitions.set('builtin_half_adder', ha);

    // Load from LocalStorage if available in browser
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored: SubcircuitDefinition[] = JSON.parse(raw);
          stored.forEach((def) => {
            if (def && def.id) {
              this.definitions.set(def.id, def);
            }
          });
        }
      }
    } catch {
      // LocalStorage unavailable or corrupt
    }
  }

  public static persist(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Only persist non-alias definitions
        const arr = Array.from(this.definitions.values()).filter(
          (d, idx, self) => self.findIndex((item) => item.id === d.id) === idx
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      }
    } catch {
      // ignore
    }
  }

  public static getAll(): SubcircuitDefinition[] {
    this.initialize();
    // Return unique definitions by ID
    const uniqueMap = new Map<string, SubcircuitDefinition>();
    for (const def of this.definitions.values()) {
      if (!uniqueMap.has(def.id)) {
        uniqueMap.set(def.id, def);
      }
    }
    return Array.from(uniqueMap.values());
  }

  public static get(id: string): SubcircuitDefinition | undefined {
    this.initialize();
    if (this.definitions.has(id)) return this.definitions.get(id);
    if (id === 'builtin_full_adder' || id === 'sub_full_adder_reference') {
      return this.definitions.get('sub_full_adder_reference') || this.definitions.get('builtin_full_adder');
    }
    if (id === 'builtin_half_adder' || id === 'sub_half_adder_reference') {
      return this.definitions.get('sub_half_adder_reference') || this.definitions.get('builtin_half_adder');
    }
    return this.getByName(id);
  }

  public static getByName(name: string): SubcircuitDefinition | undefined {
    this.initialize();
    const clean = name.trim().toLowerCase();
    for (const def of this.definitions.values()) {
      if (def.name.trim().toLowerCase() === clean) return def;
    }
    return undefined;
  }

  private static listeners = new Set<() => void>();

  public static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error in SubcircuitRegistry subscriber:', err);
      }
    });
  }

  public static register(def: SubcircuitDefinition, persist = true): void {
    this.initialize();
    this.definitions.set(def.id, def);
    if (persist) this.persist();
    this.notify();
  }

  public static remove(id: string): boolean {
    this.initialize();
    const ok = this.definitions.delete(id);
    if (ok) this.persist();
    this.notify();
    return ok;
  }

  public static duplicate(id: string, newName?: string): SubcircuitDefinition | undefined {
    this.initialize();
    const orig = this.definitions.get(id);
    if (!orig) return undefined;

    const newId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cloned: SubcircuitDefinition = JSON.parse(JSON.stringify(orig));
    cloned.id = newId;
    cloned.name = newName || `${orig.name} (Copia)`;
    cloned.createdAt = Date.now();
    cloned.updatedAt = Date.now();
    cloned.readOnly = false;

    this.definitions.set(newId, cloned);
    this.persist();
    this.notify();
    return cloned;
  }

  public static update(id: string, updates: Partial<SubcircuitDefinition>): SubcircuitDefinition | undefined {
    this.initialize();
    const orig = this.definitions.get(id);
    if (!orig) return undefined;

    const updated: SubcircuitDefinition = {
      ...orig,
      ...updates,
      version: orig.version + 1,
      updatedAt: Date.now(),
    };
    this.definitions.set(id, updated);
    this.persist();
    this.notify();
    return updated;
  }

  public static exportAll(): SubcircuitDefinition[] {
    this.initialize();
    return Array.from(this.definitions.values());
  }

  public static importDefinitions(defs: SubcircuitDefinition[]): void {
    this.initialize();
    if (Array.isArray(defs)) {
      defs.forEach((d) => {
        if (d && d.id) {
          this.definitions.set(d.id, d);
        }
      });
      this.persist();
    }
  }

  /**
   * Creates an instance component of CUSTOM_SUBCIRCUIT on canvas.
   * Dynamically constructs Pin layout based on the definition's ports.
   */
  public static createInstance(
    defId: string,
    x: number,
    y: number,
    customLabel?: string
  ): CircuitComponent {
    this.initialize();
    const def = this.definitions.get(defId);
    if (!def) {
      throw new Error(`Subcircuito con ID '${defId}' no encontrado en el registro.`);
    }

    const inputPorts = def.ports.filter((p) => p.type === 'input').sort((a, b) => a.order - b.order);
    const outputPorts = def.ports.filter((p) => p.type === 'output').sort((a, b) => a.order - b.order);

    const maxPins = Math.max(inputPorts.length, outputPorts.length, 2);
    const pinSpacing = 26;
    const height = Math.max(80, 36 + maxPins * pinSpacing);
    const width = Math.max(120, Math.min(220, Math.max(def.name.length * 10 + 40, 120)));

    const instanceId = `subinst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Create external input pins on the left edge
    const inputs: Pin[] = inputPorts.map((port, idx) => ({
      id: `${instanceId}_pin_in_${idx}_${port.name}`,
      name: port.name,
      type: 'input',
      relX: 0,
      relY: 30 + idx * pinSpacing,
      value: 'X',
      label: port.label || port.name,
    }));

    // Create external output pins on the right edge
    const outputs: Pin[] = outputPorts.map((port, idx) => ({
      id: `${instanceId}_pin_out_${idx}_${port.name}`,
      name: port.name,
      type: 'output',
      relX: width,
      relY: 30 + idx * pinSpacing,
      value: 'X',
      label: port.label || port.name,
    }));

    // Clone internal components and connections for this instance
    const internalComps: CircuitComponent[] = JSON.parse(JSON.stringify(def.components));
    const internalConns: WireConnection[] = JSON.parse(JSON.stringify(def.connections));

    return {
      id: instanceId,
      type: 'CUSTOM_SUBCIRCUIT',
      subcircuitId: def.id,
      label: customLabel || def.name,
      x,
      y,
      width,
      height,
      inputs,
      outputs,
      state: {
        subcircuitInternalState: {
          components: internalComps,
          connections: internalConns,
        },
      },
    };
  }

  /**
   * Helper to analyze a selection of components and infer boundary input/output ports.
   */
  public static inferPorts(
    selectedComponents: CircuitComponent[],
    allConnections: WireConnection[]
  ): { inputPorts: SubcircuitPort[]; outputPorts: SubcircuitPort[] } {
    const selectedIds = new Set(selectedComponents.map((c) => c.id));
    const inputPorts: SubcircuitPort[] = [];
    const outputPorts: SubcircuitPort[] = [];

    // 1. Check for wires coming into selected components from outside
    const externalIncoming = allConnections.filter(
      (w) => !selectedIds.has(w.fromComponentId) && selectedIds.has(w.toComponentId)
    );
    // 2. Check for wires leaving selected components to outside
    const externalOutgoing = allConnections.filter(
      (w) => selectedIds.has(w.fromComponentId) && !selectedIds.has(w.toComponentId)
    );

    const seenIn = new Set<string>();
    externalIncoming.forEach((w) => {
      const targetComp = selectedComponents.find((c) => c.id === w.toComponentId);
      const targetPin = targetComp?.inputs.find((p) => p.id === w.toPinId);
      if (targetComp && targetPin) {
        const key = `${targetComp.id}:${targetPin.id}`;
        if (!seenIn.has(key)) {
          seenIn.add(key);
          inputPorts.push({
            id: `port_in_${inputPorts.length}`,
            name: targetPin.name || `In${inputPorts.length}`,
            type: 'input',
            targetComponentId: targetComp.id,
            targetPinId: targetPin.id,
            order: inputPorts.length,
            label: targetPin.label || targetPin.name,
          });
        }
      }
    });

    const seenOut = new Set<string>();
    externalOutgoing.forEach((w) => {
      const sourceComp = selectedComponents.find((c) => c.id === w.fromComponentId);
      const sourcePin = sourceComp?.outputs.find((p) => p.id === w.fromPinId);
      if (sourceComp && sourcePin) {
        const key = `${sourceComp.id}:${sourcePin.id}`;
        if (!seenOut.has(key)) {
          seenOut.add(key);
          outputPorts.push({
            id: `port_out_${outputPorts.length}`,
            name: sourcePin.name || `Out${outputPorts.length}`,
            type: 'output',
            targetComponentId: sourceComp.id,
            targetPinId: sourcePin.id,
            order: outputPorts.length,
            label: sourcePin.label || sourcePin.name,
          });
        }
      }
    });

    // 3. Fallback: If no external wires, look for input components (SWITCH, CONSTANT, etc.)
    // or unconnected inputs inside the selection
    if (inputPorts.length === 0) {
      selectedComponents.forEach((c) => {
        if (c.type === 'SWITCH' || c.type === 'PUSH_BUTTON' || c.type === 'CONSTANT_0' || c.type === 'CONSTANT_1') {
          inputPorts.push({
            id: `port_in_${inputPorts.length}`,
            name: c.label || c.type,
            type: 'input',
            targetComponentId: c.id,
            targetPinId: c.outputs[0]?.id || 'out',
            order: inputPorts.length,
            label: c.label,
          });
        }
      });
    }

    // 4. Fallback for outputs: look for output components (LED, OUTPUT_PIN, etc.)
    // or unconsumed outputs
    if (outputPorts.length === 0) {
      selectedComponents.forEach((c) => {
        if (c.type === 'LED' || c.type === 'OUTPUT_LED' || c.type === 'OUTPUT_PIN') {
          outputPorts.push({
            id: `port_out_${outputPorts.length}`,
            name: c.label || c.type,
            type: 'output',
            targetComponentId: c.id,
            targetPinId: c.inputs[0]?.id || 'in',
            order: outputPorts.length,
            label: c.label,
          });
        }
      });
    }

    // 5. If still no input ports found, pick the unconnected input pins of gates
    if (inputPorts.length === 0) {
      const internalDrivenPinKeys = new Set(allConnections.map((w) => `${w.toComponentId}:${w.toPinId}`));
      selectedComponents.forEach((c) => {
        c.inputs.forEach((p) => {
          if (!internalDrivenPinKeys.has(`${c.id}:${p.id}`)) {
            inputPorts.push({
              id: `port_in_${inputPorts.length}`,
              name: p.name || `In${inputPorts.length}`,
              type: 'input',
              targetComponentId: c.id,
              targetPinId: p.id,
              order: inputPorts.length,
              label: p.label || p.name,
            });
          }
        });
      });
    }

    // 6. If still no output ports found, pick unconsumed output pins of gates
    if (outputPorts.length === 0) {
      const internalDriverPinKeys = new Set(allConnections.map((w) => `${w.fromComponentId}:${w.fromPinId}`));
      selectedComponents.forEach((c) => {
        c.outputs.forEach((p) => {
          if (!internalDriverPinKeys.has(`${c.id}:${p.id}`)) {
            outputPorts.push({
              id: `port_out_${outputPorts.length}`,
              name: p.name || c.label || `Out${outputPorts.length}`,
              type: 'output',
              targetComponentId: c.id,
              targetPinId: p.id,
              order: outputPorts.length,
              label: p.label || p.name,
            });
          }
        });
      });
    }

    return { inputPorts, outputPorts };
  }
}
