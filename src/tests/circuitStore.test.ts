import { describe, it, expect, beforeEach } from 'vitest';
import { circuitStore } from '../store/useCircuitStore';
import { createComponent } from '../engines/circuit/generator';

describe('Circuit Store - Connection Validation & Undo/Redo', () => {
  beforeEach(() => {
    circuitStore.clearCircuit();
  });

  it('prevents connecting an output to another output (short-circuit rejection)', () => {
    const swA = createComponent('SWITCH', 0, 0, 'A');
    const swB = createComponent('SWITCH', 0, 100, 'B');

    circuitStore.loadCircuit([swA, swB], []);

    // Try to drag from swA output to swB output
    circuitStore.startDraggingWire(swA.id, swA.outputs[0].id, true, 0, 0);
    const result = circuitStore.finishDraggingWire(swB.id, swB.outputs[0].id);

    expect(result.success).toBe(false);
    expect(result.type).toBe('error');
    expect(result.message).toContain('No se pueden conectar dos terminales de salida');
    expect(circuitStore.connections.length).toBe(0);
  });

  it('prevents connecting an input to another input', () => {
    const and1 = createComponent('AND', 100, 0, 'AND1');
    const and2 = createComponent('AND', 100, 100, 'AND2');

    circuitStore.loadCircuit([and1, and2], []);

    circuitStore.startDraggingWire(and1.id, and1.inputs[0].id, false, 0, 0);
    const result = circuitStore.finishDraggingWire(and2.id, and2.inputs[0].id);

    expect(result.success).toBe(false);
    expect(result.type).toBe('warning');
    expect(result.message).toContain('No se pueden conectar dos terminales de entrada');
    expect(circuitStore.connections.length).toBe(0);
  });

  it('prevents connecting a component to itself directly', () => {
    const andGate = createComponent('AND', 100, 0, 'AND');
    circuitStore.loadCircuit([andGate], []);

    circuitStore.startDraggingWire(andGate.id, andGate.outputs[0].id, true, 0, 0);
    const result = circuitStore.finishDraggingWire(andGate.id, andGate.inputs[0].id);

    expect(result.success).toBe(false);
    expect(result.type).toBe('warning');
    expect(result.message).toContain('mismo componente');
    expect(circuitStore.connections.length).toBe(0);
  });

  it('successfully creates valid connection and allows dragging from Input to Output', () => {
    const swA = createComponent('SWITCH', 0, 0, 'A');
    const andGate = createComponent('AND', 100, 0, 'AND');
    circuitStore.loadCircuit([swA, andGate], []);

    // Start dragging from AND input pin to SWITCH output pin
    circuitStore.startDraggingWire(andGate.id, andGate.inputs[0].id, false, 100, 20);
    const result = circuitStore.finishDraggingWire(swA.id, swA.outputs[0].id);

    expect(result.success).toBe(true);
    expect(circuitStore.connections.length).toBe(1);
    expect(circuitStore.connections[0].fromComponentId).toBe(swA.id);
    expect(circuitStore.connections[0].toComponentId).toBe(andGate.id);
  });

  it('verifies Undo (Deshacer) and Redo (Rehacer) on wire creation and deletion', () => {
    const swA = createComponent('SWITCH', 0, 0, 'A');
    const led = createComponent('LED', 200, 0, 'LED');
    circuitStore.loadCircuit([swA, led], []);

    expect(circuitStore.connections.length).toBe(0);

    // Create wire
    circuitStore.startDraggingWire(swA.id, swA.outputs[0].id, true, 0, 0);
    circuitStore.finishDraggingWire(led.id, led.inputs[0].id);
    expect(circuitStore.connections.length).toBe(1);

    // Undo wire creation
    circuitStore.undo();
    expect(circuitStore.connections.length).toBe(0);

    // Redo wire creation
    circuitStore.redo();
    expect(circuitStore.connections.length).toBe(1);
  });

  it('verifies real-time signal propagation and Undo when toggling switches', () => {
    const swA = createComponent('SWITCH', 0, 0, 'A');
    const notGate = createComponent('NOT', 100, 0, 'NOT');
    const led = createComponent('LED', 250, 0, 'LED');

    circuitStore.loadCircuit([swA, notGate, led], [
      { id: 'w1', fromComponentId: swA.id, fromPinId: swA.outputs[0].id, toComponentId: notGate.id, toPinId: notGate.inputs[0].id, value: 0 },
      { id: 'w2', fromComponentId: notGate.id, fromPinId: notGate.outputs[0].id, toComponentId: led.id, toPinId: led.inputs[0].id, value: 1 },
    ]);

    // Initial state: switch is 0 -> NOT output is 1 -> LED is 1
    let ledComp = circuitStore.components.find((c) => c.id === led.id);
    expect(ledComp?.inputs[0].value).toBe(1);

    // Toggle switch: active -> 1 -> NOT output becomes 0 -> LED becomes 0
    circuitStore.toggleSwitch(swA.id);
    ledComp = circuitStore.components.find((c) => c.id === led.id);
    expect(ledComp?.inputs[0].value).toBe(0);

    // Undo switch toggle: restores switch to 0 -> NOT output back to 1 -> LED back to 1
    circuitStore.undo();
    ledComp = circuitStore.components.find((c) => c.id === led.id);
    expect(ledComp?.inputs[0].value).toBe(1);
  });

  it('verifies CAD component rotation by 90-degree steps and pin coordinate transformation', () => {
    const andGate = createComponent('AND', 100, 100, 'AND_ROT');
    circuitStore.loadCircuit([andGate], []);

    const comp = circuitStore.components[0];
    const origPinY = comp.outputs[0].relY;
    expect(comp.rotation || 0).toBe(0);

    // Rotate 90° clockwise
    circuitStore.rotateComponent(comp.id, true);
    let rotated = circuitStore.components[0];
    expect(rotated.rotation).toBe(90);

    // Rotate another 90° (180°)
    circuitStore.rotateComponent(comp.id, true);
    rotated = circuitStore.components[0];
    expect(rotated.rotation).toBe(180);

    // Rotate another 90° (270°)
    circuitStore.rotateComponent(comp.id, true);
    rotated = circuitStore.components[0];
    expect(rotated.rotation).toBe(270);

    // Rotate another 90° (back to 0°)
    circuitStore.rotateComponent(comp.id, true);
    rotated = circuitStore.components[0];
    expect(rotated.rotation).toBe(0);
    expect(rotated.outputs[0].relY).toBe(origPinY);
  });

  it('verifies CAD copy, cut, and paste workflow with internal wire remapping', () => {
    const swA = createComponent('SWITCH', 0, 0, 'A');
    const led = createComponent('LED', 200, 0, 'LED');
    const wire = {
      id: 'w_test',
      fromComponentId: swA.id,
      fromPinId: swA.outputs[0].id,
      toComponentId: led.id,
      toPinId: led.inputs[0].id,
      value: 0 as const,
    };

    circuitStore.loadCircuit([swA, led], [wire]);
    expect(circuitStore.components.length).toBe(2);
    expect(circuitStore.connections.length).toBe(1);

    // Select both and copy
    circuitStore.setSelectedComponents([swA.id, led.id]);
    circuitStore.copySelected();
    expect(circuitStore.hasClipboard).toBe(true);

    // Paste creates 2 new components and 1 remapped wire
    circuitStore.paste();
    expect(circuitStore.components.length).toBe(4);
    expect(circuitStore.connections.length).toBe(2);

    // Cut removes selected
    circuitStore.cutSelected();
    expect(circuitStore.components.length).toBe(2);
    expect(circuitStore.connections.length).toBe(1);
  });

  it('verifies multi-component group movement preserves relative positions', () => {
    const comp1 = createComponent('AND', 100, 100, 'AND1');
    const comp2 = createComponent('OR', 300, 100, 'OR1');
    circuitStore.loadCircuit([comp1, comp2], []);

    // Move both by dx=+40, dy=+60
    circuitStore.updateComponentPositions([
      { id: comp1.id, x: 140, y: 160 },
      { id: comp2.id, x: 340, y: 160 },
    ], true);

    const updated1 = circuitStore.components.find((c) => c.id === comp1.id);
    const updated2 = circuitStore.components.find((c) => c.id === comp2.id);
    expect(updated1?.x).toBe(140);
    expect(updated1?.y).toBe(160);
    expect(updated2?.x).toBe(340);
    expect(updated2?.y).toBe(160);
    expect((updated2?.x || 0) - (updated1?.x || 0)).toBe(200); // relative distance preserved
  });
});
