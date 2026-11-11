/**
 * LogicLab - Circuit Canvas & Simulation Store
 * Manages components, wire routing, real-time clock oscillator, undo/redo, selection
 */

import { useState, useEffect } from 'react';
import {
  CircuitComponent,
  ComponentType,
  HierarchyBreadcrumb,
  Pin,
  SimulationState,
  SubcircuitDefinition,
  SubcircuitPort,
  WireConnection,
} from '../types';
import {
  CircuitSimulator,
  CircuitTruthTableResult,
  CircuitTableComparisonResult,
} from '../engines/circuit/simulator';
import { createComponent, CircuitGenerator, SynthesisMode } from '../engines/circuit/generator';
import { CIRCUIT_PRESETS } from '../engines/circuit/presets';
import { SubcircuitRegistry } from '../engines/circuit/subcircuitRegistry';

export interface DraggingWire {
  fromComponentId: string;
  fromPinId: string;
  isFromOutput: boolean;
  fromX: number;
  fromY: number;
  currentX: number;
  currentY: number;
}

export interface FinishWireResult {
  success: boolean;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface ViewTransform {
  x: number;
  y: number;
  zoom: number;
}

interface HistorySnapshot {
  components: CircuitComponent[];
  connections: WireConnection[];
}

export interface HierarchyStackLevel {
  subcircuitId: string;
  instanceId?: string;
  instanceLabel?: string;
  subcircuitName: string;
  readOnly?: boolean;
  parentComponents: CircuitComponent[];
  parentConnections: WireConnection[];
  parentViewTransform: ViewTransform;
  parentSelectedComponentIds: string[];
  parentSelectedWireId: string | null;
}

// Initial state with a testbench demo
const initialDemo = CIRCUIT_PRESETS[0].build();

let components: CircuitComponent[] = initialDemo.components;
let connections: WireConnection[] = initialDemo.connections;
let selectedComponentIds: string[] = [];
let selectedWireId: string | null = null;
let hierarchyStack: HierarchyStackLevel[] = [];
let draggingWire: DraggingWire | null = null;
let viewTransform: ViewTransform = { x: 50, y: 50, zoom: 1 };
let snapToGrid = true;
let structureVersion = 1;
let tableVersion = 0;
let lastCircuitStructureChange: number = Date.now();
let associatedTruthTable: CircuitTruthTableResult | null = null;
let associatedTruthTableTimestamp: number = 0;

function markStructureChanged() {
  structureVersion++;
  lastCircuitStructureChange = Date.now();
}

try {
  associatedTruthTable = CircuitSimulator.generateTruthTable(components, connections);
  associatedTruthTableTimestamp = Date.now();
  tableVersion = structureVersion;
} catch {
  // Non-critical fallback
}

let simulation: SimulationState = {
  isRunning: true,
  isPaused: false,
  clockHz: 2,
  stepCount: 0,
  lastEvaluated: Date.now(),
  cycleDetected: false,
  errors: [],
  warnings: [],
};

let clipboard: { components: CircuitComponent[]; connections: WireConnection[] } | null = null;
const pastHistory: HistorySnapshot[] = [];
const futureHistory: HistorySnapshot[] = [];

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}

function pushHistory() {
  pastHistory.push({
    components: JSON.parse(JSON.stringify(components)),
    connections: JSON.parse(JSON.stringify(connections)),
  });
  if (pastHistory.length > 50) {
    pastHistory.shift();
  }
  futureHistory.length = 0; // clear future on new action
  notify();
}

// Initial evaluation
const initialEval = CircuitSimulator.step(components, connections, false);
components = initialEval.components;
connections = initialEval.connections;

// Pure action functions
function runEvaluation(clockTick = false) {
  const result = CircuitSimulator.step(components, connections, clockTick);
  components = result.components;
  connections = result.connections;
  simulation = {
    ...simulation,
    cycleDetected: result.cycleDetected,
    warnings: result.warnings,
    errors: result.errors,
    lastEvaluated: Date.now(),
  };
  notify();
}

function addComponent(type: ComponentType, x: number, y: number, label?: string, initialState?: Record<string, any>): CircuitComponent {
  pushHistory();
  const finalX = snapToGrid ? Math.round(x / 20) * 20 : x;
  const finalY = snapToGrid ? Math.round(y / 20) * 20 : y;
  const comp = createComponent(type, finalX, finalY, label || type);
  if (initialState) {
    comp.state = { ...comp.state, ...initialState };
  }
  components = [...components, comp];
  selectedComponentIds = [comp.id];
  selectedWireId = null;
  markStructureChanged();
  runEvaluation();
  return comp;
}

function updateComponentPosition(id: string, x: number, y: number, saveHistory = false) {
  if (saveHistory) pushHistory();
  const finalX = snapToGrid ? Math.round(x / 20) * 20 : x;
  const finalY = snapToGrid ? Math.round(y / 20) * 20 : y;
  components = components.map((c) => (c.id === id ? { ...c, x: finalX, y: finalY } : c));
  notify();
}

function removeComponent(id: string) {
  pushHistory();
  components = components.filter((c) => c.id !== id);
  connections = connections.filter((w) => w.fromComponentId !== id && w.toComponentId !== id);
  selectedComponentIds = selectedComponentIds.filter((cid) => cid !== id);
  markStructureChanged();
  runEvaluation();
}

function duplicateSelected() {
  if (selectedComponentIds.length === 0) return;
  pushHistory();
  const newComps: CircuitComponent[] = [];
  const idMap: Record<string, string> = {};

  for (const oldId of selectedComponentIds) {
    const orig = components.find((c) => c.id === oldId);
    if (orig) {
      const copy = createComponent(orig.type, orig.x + 40, orig.y + 40, `${orig.label} (Copia)`, orig.inputCount, orig.orientation);
      if (orig.rotation) {
        copy.rotation = orig.rotation;
        const count90 = (orig.rotation / 90) % 4;
        const cx = copy.width / 2;
        const cy = copy.height / 2;
        for (let i = 0; i < count90; i++) {
          copy.inputs = copy.inputs.map((p) => ({ ...p, relX: Math.round(cx - (p.relY - cy)), relY: Math.round(cy + (p.relX - cx)) }));
          copy.outputs = copy.outputs.map((p) => ({ ...p, relX: Math.round(cx - (p.relY - cy)), relY: Math.round(cy + (p.relX - cx)) }));
        }
      }
      idMap[orig.id] = copy.id;
      newComps.push(copy);
    }
  }

  components = [...components, ...newComps];
  selectedComponentIds = newComps.map((c) => c.id);
  markStructureChanged();
  runEvaluation();
}

function updateComponentPositions(updates: { id: string; x: number; y: number }[], saveHistory = false) {
  if (saveHistory) pushHistory();
  const updateMap = new Map<string, { x: number; y: number; dx: number; dy: number }>();
  for (const u of updates) {
    const finalX = snapToGrid ? Math.round(u.x / 20) * 20 : u.x;
    const finalY = snapToGrid ? Math.round(u.y / 20) * 20 : u.y;
    const existing = components.find((c) => c.id === u.id);
    const dx = existing ? finalX - existing.x : 0;
    const dy = existing ? finalY - existing.y : 0;
    updateMap.set(u.id, { x: finalX, y: finalY, dx, dy });
  }
  components = components.map((c) => {
    const u = updateMap.get(c.id);
    return u ? { ...c, x: u.x, y: u.y } : c;
  });

  // If a wire has custom waypoints, and BOTH connected components were moved by the same delta,
  // translate the wire waypoints along with the group so the manual routing is preserved!
  connections = connections.map((w) => {
    if (!w.waypoints || w.waypoints.length === 0) return w;
    const fromUpdate = updateMap.get(w.fromComponentId);
    const toUpdate = updateMap.get(w.toComponentId);
    if (fromUpdate && toUpdate && Math.abs(fromUpdate.dx - toUpdate.dx) < 2 && Math.abs(fromUpdate.dy - toUpdate.dy) < 2) {
      const dx = fromUpdate.dx;
      const dy = fromUpdate.dy;
      if (dx !== 0 || dy !== 0) {
        return {
          ...w,
          waypoints: w.waypoints.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })),
          branchPoint: w.branchPoint ? { x: w.branchPoint.x + dx, y: w.branchPoint.y + dy } : undefined,
        };
      }
    }
    return w;
  });

  notify();
}

function copySelected() {
  if (selectedComponentIds.length === 0) return;
  const selectedSet = new Set(selectedComponentIds);
  const clonedComps = components.filter((c) => selectedSet.has(c.id));
  const clonedConns = connections.filter(
    (w) => selectedSet.has(w.fromComponentId) && selectedSet.has(w.toComponentId)
  );
  clipboard = {
    components: JSON.parse(JSON.stringify(clonedComps)),
    connections: JSON.parse(JSON.stringify(clonedConns)),
  };
}

function cutSelected() {
  if (selectedComponentIds.length === 0) return;
  copySelected();
  pushHistory();
  const selectedSet = new Set(selectedComponentIds);
  components = components.filter((c) => !selectedSet.has(c.id));
  connections = connections.filter(
    (w) => !selectedSet.has(w.fromComponentId) && !selectedSet.has(w.toComponentId)
  );
  selectedComponentIds = [];
  selectedWireId = null;
  markStructureChanged();
  runEvaluation();
}

function paste() {
  if (!clipboard || clipboard.components.length === 0) return;
  pushHistory();
  const idMap: Record<string, string> = {};
  const pinMap: Record<string, string> = {};
  const newComps: CircuitComponent[] = [];

  for (const orig of clipboard.components) {
    const copy = createComponent(orig.type, orig.x + 40, orig.y + 40, `${orig.label} (Copia)`, orig.inputCount, orig.orientation);
    idMap[orig.id] = copy.id;
    if (orig.rotation) {
      copy.rotation = orig.rotation;
      const count90 = (orig.rotation / 90) % 4;
      const cx = copy.width / 2;
      const cy = copy.height / 2;
      for (let i = 0; i < count90; i++) {
        copy.inputs = copy.inputs.map((p) => ({ ...p, relX: Math.round(cx - (p.relY - cy)), relY: Math.round(cy + (p.relX - cx)) }));
        copy.outputs = copy.outputs.map((p) => ({ ...p, relX: Math.round(cx - (p.relY - cy)), relY: Math.round(cy + (p.relX - cx)) }));
      }
    }
    orig.inputs.forEach((p, idx) => {
      if (copy.inputs[idx]) pinMap[p.id] = copy.inputs[idx].id;
    });
    orig.outputs.forEach((p, idx) => {
      if (copy.outputs[idx]) pinMap[p.id] = copy.outputs[idx].id;
    });
    newComps.push(copy);
  }

  const newConns: WireConnection[] = [];
  for (const conn of clipboard.connections) {
    const newFromComp = idMap[conn.fromComponentId];
    const newToComp = idMap[conn.toComponentId];
    const newFromPin = pinMap[conn.fromPinId];
    const newToPin = pinMap[conn.toPinId];
    if (newFromComp && newToComp && newFromPin && newToPin) {
      newConns.push({
        id: `wire_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fromComponentId: newFromComp,
        fromPinId: newFromPin,
        toComponentId: newToComp,
        toPinId: newToPin,
        value: conn.value,
      });
    }
  }

  components = [...components, ...newComps];
  connections = [...connections, ...newConns];
  selectedComponentIds = newComps.map((c) => c.id);
  selectedWireId = null;
  markStructureChanged();
  runEvaluation();
}

function selectAll() {
  selectedComponentIds = components.map((c) => c.id);
  selectedWireId = null;
  notify();
}

function rotateComponent(id: string, clockwise = true) {
  pushHistory();
  components = components.map((comp) => {
    if (comp.id !== id) return comp;
    const current = comp.rotation || 0;
    const next = ((current + (clockwise ? 90 : 270)) % 360) as 0 | 90 | 180 | 270;
    const cx = comp.width / 2;
    const cy = comp.height / 2;
    const rotatePin = (p: Pin): Pin => {
      if (clockwise) {
        return { ...p, relX: Math.round(cx - (p.relY - cy)), relY: Math.round(cy + (p.relX - cx)) };
      } else {
        return { ...p, relX: Math.round(cx + (p.relY - cy)), relY: Math.round(cy - (p.relX - cx)) };
      }
    };
    return {
      ...comp,
      rotation: next,
      inputs: comp.inputs.map(rotatePin),
      outputs: comp.outputs.map(rotatePin),
    };
  });
  markStructureChanged();
  runEvaluation();
}

function rotateSelected(clockwise = true) {
  if (selectedComponentIds.length === 0) return;
  pushHistory();
  const selectedSet = new Set(selectedComponentIds);
  components = components.map((comp) => {
    if (!selectedSet.has(comp.id)) return comp;
    const current = comp.rotation || 0;
    const next = ((current + (clockwise ? 90 : 270)) % 360) as 0 | 90 | 180 | 270;
    const cx = comp.width / 2;
    const cy = comp.height / 2;
    const rotatePin = (p: Pin): Pin => {
      if (clockwise) {
        return { ...p, relX: Math.round(cx - (p.relY - cy)), relY: Math.round(cy + (p.relX - cx)) };
      } else {
        return { ...p, relX: Math.round(cx + (p.relY - cy)), relY: Math.round(cy - (p.relX - cx)) };
      }
    };
    return {
      ...comp,
      rotation: next,
      inputs: comp.inputs.map(rotatePin),
      outputs: comp.outputs.map(rotatePin),
    };
  });
  markStructureChanged();
  runEvaluation();
}

function toggleSwitch(id: string) {
  pushHistory();
  components = components.map((c) => {
    if (c.id === id && c.type === 'SWITCH') {
      const active = !c.state?.switchActive;
      return {
        ...c,
        state: { ...c.state, switchActive: active },
      };
    }
    return c;
  });
  runEvaluation();
}

function pressButton(id: string, pressed: boolean) {
  components = components.map((c) => {
    if (c.id === id && c.type === 'PUSH_BUTTON') {
      return {
        ...c,
        state: { ...c.state, buttonPressed: pressed },
      };
    }
    return c;
  });
  runEvaluation();
}

function startDraggingWire(
  fromComponentId: string,
  fromPinId: string,
  isFromOutput: boolean,
  fromX: number,
  fromY: number
) {
  draggingWire = {
    fromComponentId,
    fromPinId,
    isFromOutput,
    fromX,
    fromY,
    currentX: fromX,
    currentY: fromY,
  };
  notify();
}

function updateDraggingWire(currentX: number, currentY: number) {
  if (draggingWire) {
    draggingWire = { ...draggingWire, currentX, currentY };
    notify();
  }
}

function finishDraggingWire(
  toComponentIdOrDragObj?: string | any,
  toPinIdOrTargetObj?: string | any
): FinishWireResult {
  let sourceCompId = draggingWire?.fromComponentId;
  let sourcePinId = draggingWire?.fromPinId;
  let targetCompId = typeof toComponentIdOrDragObj === 'string' ? toComponentIdOrDragObj : undefined;
  let targetPinId = typeof toPinIdOrTargetObj === 'string' ? toPinIdOrTargetObj : undefined;

  if (toComponentIdOrDragObj && typeof toComponentIdOrDragObj === 'object') {
    sourceCompId = toComponentIdOrDragObj.fromComponentId || toComponentIdOrDragObj.componentId;
    sourcePinId = toComponentIdOrDragObj.fromPinId || toComponentIdOrDragObj.pinId;
  }
  if (toPinIdOrTargetObj && typeof toPinIdOrTargetObj === 'object') {
    targetCompId = toPinIdOrTargetObj.toComponentId || toPinIdOrTargetObj.componentId;
    targetPinId = toPinIdOrTargetObj.toPinId || toPinIdOrTargetObj.pinId;
  }

  if (!sourceCompId || !sourcePinId || !targetCompId || !targetPinId) {
    draggingWire = null;
    notify();
    return { success: false, message: 'Conexión cancelada o incompleta', type: 'info' };
  }

  const sourceComp = components.find((c) => c.id === sourceCompId);
  const targetComp = components.find((c) => c.id === targetCompId);

  if (!sourceComp || !targetComp) {
    draggingWire = null;
    notify();
    return { success: false, message: 'Componente no encontrado', type: 'error' };
  }

  const sourcePin =
    sourceComp.outputs.find((p) => p.id === sourcePinId) ||
    sourceComp.inputs.find((p) => p.id === sourcePinId);

  const targetPin =
    targetComp.inputs.find((p) => p.id === targetPinId) ||
    targetComp.outputs.find((p) => p.id === targetPinId);

  if (!sourcePin || !targetPin) {
    draggingWire = null;
    notify();
    return { success: false, message: 'Terminal no encontrada', type: 'error' };
  }

  // Regla 1: Mismo componente
  if (sourceComp.id === targetComp.id) {
    draggingWire = null;
    notify();
    return {
      success: false,
      message: 'No se permite conectar terminales del mismo componente directamente.',
      type: 'warning',
    };
  }

  const isSourceOutput = sourcePin.type === 'output' || sourcePin.type === 'clock';
  const isTargetOutput = targetPin.type === 'output' || targetPin.type === 'clock';
  const isSourceInput = sourcePin.type === 'input' || sourcePin.type === 'control';
  const isTargetInput = targetPin.type === 'input' || targetPin.type === 'control';

  // Regla 2: Salida a Salida (cortocircuito lógico)
  if (isSourceOutput && isTargetOutput) {
    draggingWire = null;
    notify();
    return {
      success: false,
      message: 'Conexión inválida: No se pueden conectar dos terminales de salida entre sí (cortocircuito lógico).',
      type: 'error',
    };
  }

  // Regla 3: Entrada a Entrada (sin fuente)
  if (isSourceInput && isTargetInput) {
    draggingWire = null;
    notify();
    return {
      success: false,
      message: 'Conexión inválida: No se pueden conectar dos terminales de entrada entre sí (ninguna proporciona señal).',
      type: 'warning',
    };
  }

  // Determinar emisor (salida) y receptor (entrada)
  let finalFromComp = sourceComp;
  let finalFromPin = sourcePin;
  let finalToComp = targetComp;
  let finalToPin = targetPin;

  if (isSourceInput) {
    // Arrastrado desde entrada hacia salida: invertir sentido formal
    finalFromComp = targetComp;
    finalFromPin = targetPin;
    finalToComp = sourceComp;
    finalToPin = sourcePin;
  }

  // Regla 4: Conexión duplicada exacta
  const exists = connections.some(
    (w) =>
      w.fromComponentId === finalFromComp.id &&
      w.fromPinId === finalFromPin.id &&
      w.toComponentId === finalToComp.id &&
      w.toPinId === finalToPin.id
  );

  if (exists) {
    draggingWire = null;
    notify();
    return { success: false, message: 'Esta conexión ya existe.', type: 'info' };
  }

  // Regla 5: Controlador único por entrada (reemplazo limpio de driver anterior)
  pushHistory();

  const existingDriverWire = connections.find(
    (w) => w.toComponentId === finalToComp.id && w.toPinId === finalToPin.id
  );
  let wasReplaced = false;
  if (existingDriverWire) {
    connections = connections.filter((w) => w.id !== existingDriverWire.id);
    wasReplaced = true;
  }

  const newWire: WireConnection = {
    id: `wire_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    fromComponentId: finalFromComp.id,
    fromPinId: finalFromPin.id,
    toComponentId: finalToComp.id,
    toPinId: finalToPin.id,
    value: finalFromPin.value,
  };
  connections = [...connections, newWire];
  draggingWire = null;
  markStructureChanged();
  runEvaluation();

  return {
    success: true,
    message: wasReplaced
      ? `Terminal '${finalToPin.name}' reconectada a la nueva salida.`
      : `Terminal '${finalFromPin.name}' conectada con éxito a '${finalToPin.name}'.`,
    type: 'success',
  };
}

function cancelDraggingWire() {
  draggingWire = null;
  notify();
}

function removeConnection(id: string) {
  pushHistory();
  connections = connections.filter((w) => w.id !== id);
  if (selectedWireId === id) selectedWireId = null;
  markStructureChanged();
  runEvaluation();
}

function updateWireWaypoints(wireId: string, waypoints: { x: number; y: number }[] | undefined, saveHistory = false) {
  if (saveHistory) pushHistory();
  connections = connections.map((w) => (w.id === wireId ? { ...w, waypoints } : w));
  notify();
}

function resetWireRoute(wireId: string) {
  pushHistory();
  connections = connections.map((w) => (w.id === wireId ? { ...w, waypoints: undefined } : w));
  notify();
}

function addWaypointToWire(wireId: string, point: { x: number; y: number }, index?: number) {
  const wire = connections.find((w) => w.id === wireId);
  if (!wire) return;
  pushHistory();
  const currentWps = wire.waypoints ? [...wire.waypoints] : [];
  if (typeof index === 'number' && index >= 0 && index <= currentWps.length) {
    currentWps.splice(index, 0, point);
  } else {
    currentWps.push(point);
  }
  connections = connections.map((w) => (w.id === wireId ? { ...w, waypoints: currentWps } : w));
  notify();
}

function removeWaypointFromWire(wireId: string, waypointIndex: number) {
  const wire = connections.find((w) => w.id === wireId);
  if (!wire || !wire.waypoints) return;
  pushHistory();
  const nextWps = wire.waypoints.filter((_, idx) => idx !== waypointIndex);
  connections = connections.map((w) => (w.id === wireId ? { ...w, waypoints: nextWps.length > 0 ? nextWps : undefined } : w));
  notify();
}

function loadCircuit(newComps: CircuitComponent[], newConns: WireConnection[]) {
  pushHistory();
  components = newComps;
  connections = newConns;
  selectedComponentIds = [];
  selectedWireId = null;
  markStructureChanged();
  runEvaluation();
}

function clearCircuit() {
  pushHistory();
  components = [];
  connections = [];
  selectedComponentIds = [];
  selectedWireId = null;
  markStructureChanged();
  runEvaluation();
}

function undo() {
  if (pastHistory.length === 0) return;
  const current = {
    components: JSON.parse(JSON.stringify(components)),
    connections: JSON.parse(JSON.stringify(connections)),
  };
  futureHistory.push(current);
  const previous = pastHistory.pop()!;
  components = previous.components;
  connections = previous.connections;
  selectedComponentIds = [];
  selectedWireId = null;
  markStructureChanged();
  runEvaluation();
}

function redo() {
  if (futureHistory.length === 0) return;
  const current = {
    components: JSON.parse(JSON.stringify(components)),
    connections: JSON.parse(JSON.stringify(connections)),
  };
  pastHistory.push(current);
  const next = futureHistory.pop()!;
  components = next.components;
  connections = next.connections;
  selectedComponentIds = [];
  selectedWireId = null;
  markStructureChanged();
  runEvaluation();
}

function setViewTransform(transform: Partial<ViewTransform>) {
  viewTransform = { ...viewTransform, ...transform };
  notify();
}

function resetView() {
  viewTransform = { x: 50, y: 50, zoom: 1 };
  notify();
}

function setSelectedComponents(ids: string[]) {
  selectedComponentIds = ids;
  if (ids.length > 0) selectedWireId = null;
  notify();
}

function setSelectedWire(id: string | null) {
  selectedWireId = id;
  if (id) selectedComponentIds = [];
  notify();
}

function toggleSimulation() {
  simulation = { ...simulation, isRunning: !simulation.isRunning };
  notify();
}

function togglePause() {
  simulation = { ...simulation, isPaused: !simulation.isPaused };
  notify();
}

function stepOnce() {
  simulation = { ...simulation, stepCount: simulation.stepCount + 1 };
  runEvaluation(true);
}

function setClockHz(hz: number) {
  simulation = { ...simulation, clockHz: Math.max(0.5, Math.min(20, hz)) };
  notify();
}

function setSnapToGrid(snap: boolean) {
  snapToGrid = snap;
  notify();
}

function updateComponentLabel(id: string, label: string) {
  components = components.map((c) => (c.id === id ? { ...c, label } : c));
  markStructureChanged();
  notify();
}

function updateComponentInputCount(id: string, count: number) {
  pushHistory();
  components = components.map((c) => {
    if (c.id === id && c.type.match(/^(AND|OR|NAND|NOR|XOR|XNOR)$/)) {
      const fresh = createComponent(c.type, c.x, c.y, c.label, count);
      return {
        ...fresh,
        id: c.id,
      };
    }
    return c;
  });
  const comp = components.find((c) => c.id === id);
  if (comp) {
    const pinIds = new Set(comp.inputs.map((p) => p.id));
    connections = connections.filter((w) => w.toComponentId !== id || pinIds.has(w.toPinId));
  }
  markStructureChanged();
  runEvaluation();
}

function updateComponentState(id: string, partialState: Record<string, any>) {
  pushHistory();
  components = components.map((c) => {
    if (c.id === id) {
      return {
        ...c,
        state: { ...c.state, ...partialState },
      };
    }
    return c;
  });
  markStructureChanged();
  runEvaluation();
}

function updateComponentOrientation(id: string, orientation: 'right' | 'down') {
  pushHistory();
  components = components.map((c) => {
    if (c.id === id && c.type === 'NOT') {
      const fresh = createComponent(c.type, c.x, c.y, c.label, 1, orientation);
      return {
        ...fresh,
        id: c.id,
      };
    }
    return c;
  });
  markStructureChanged();
  runEvaluation();
}

function generateAssociatedTruthTable(): CircuitTruthTableResult {
  const result = CircuitSimulator.generateTruthTable(components, connections);
  associatedTruthTable = result;
  associatedTruthTableTimestamp = Date.now();
  tableVersion = structureVersion;
  notify();
  return result;
}

function compareWithTable(targetTable?: {
  inputs: string[];
  outputs: { name: string; values: (0 | 1)[] }[];
  rows: { inputs: Record<string, 0 | 1>; outputs: Record<string, 0 | 1> }[];
}): CircuitTableComparisonResult {
  const table = targetTable || (associatedTruthTable && associatedTruthTable.success ? {
    inputs: associatedTruthTable.inputVariables,
    outputs: associatedTruthTable.outputVariables.map((name) => ({
      name,
      values: associatedTruthTable!.rows.map((r) => r.outputs[name] as (0 | 1)),
    })),
    rows: associatedTruthTable.rows.map((r) => ({
      inputs: r.inputs as Record<string, 0 | 1>,
      outputs: r.outputs as Record<string, 0 | 1>,
    })),
  } : undefined);

  if (!table) {
    return {
      equivalent: false,
      inputs: [],
      outputs: [],
      totalCombinations: 0,
      matches: 0,
      matchingCombinations: 0,
      mismatches: [],
      message: 'No hay tabla asociada para comparar. Genera o sincroniza una tabla primero.',
      error: 'No hay tabla asociada para comparar. Genera o sincroniza una tabla primero.',
    };
  }

  return CircuitSimulator.compareCircuitWithTable(components, connections, table);
}

function synthesizeCircuitFromTable(
  variables: string[],
  minterms: number[],
  dontCares: number[] = [],
  mode: SynthesisMode = 'STANDARD'
) {
  pushHistory();
  const synthesized = CircuitGenerator.fromTruthTable(variables, minterms, dontCares, mode);
  components = synthesized.components;
  connections = synthesized.connections;
  selectedComponentIds = [];
  selectedWireId = null;
  markStructureChanged();
  try {
    associatedTruthTable = CircuitSimulator.generateTruthTable(components, connections);
    associatedTruthTableTimestamp = Date.now();
    tableVersion = structureVersion;
  } catch {
    // Ignore initial generation errors if partial
  }
  runEvaluation();
}

function getHierarchyBreadcrumbs(): HierarchyBreadcrumb[] {
  const crumbs: HierarchyBreadcrumb[] = [
    {
      level: 0,
      subcircuitId: null,
      name: 'Circuito Principal',
    },
  ];
  hierarchyStack.forEach((lvl, idx) => {
    crumbs.push({
      level: idx + 1,
      subcircuitId: lvl.subcircuitId,
      instanceId: lvl.instanceId,
      instanceLabel: lvl.instanceLabel,
      subcircuitName: lvl.subcircuitName,
      name: lvl.instanceLabel ? `${lvl.instanceLabel} (${lvl.subcircuitName})` : lvl.subcircuitName,
      readOnly: lvl.readOnly,
    });
  });
  return crumbs;
}

function openSubcircuit(componentIdOrSubcircuitId: string): boolean {
  const comp = components.find((c) => c.id === componentIdOrSubcircuitId);
  let def: SubcircuitDefinition | undefined;

  if (comp && comp.type === 'CUSTOM_SUBCIRCUIT' && comp.subcircuitId) {
    def = SubcircuitRegistry.get(comp.subcircuitId);
  } else {
    def = SubcircuitRegistry.get(componentIdOrSubcircuitId);
  }

  if (!def) return false;

  hierarchyStack.push({
    subcircuitId: def.id,
    instanceId: comp?.id,
    instanceLabel: comp?.label || def.name,
    subcircuitName: def.name,
    readOnly: def.readOnly,
    parentComponents: JSON.parse(JSON.stringify(components)),
    parentConnections: JSON.parse(JSON.stringify(connections)),
    parentViewTransform: { ...viewTransform },
    parentSelectedComponentIds: [...selectedComponentIds],
    parentSelectedWireId: selectedWireId,
  });

  let internalComps: CircuitComponent[];
  let internalConns: WireConnection[];

  if (comp?.state?.subcircuitInternalState?.components && comp.state.subcircuitInternalState.components.length > 0) {
    internalComps = JSON.parse(JSON.stringify(comp.state.subcircuitInternalState.components));
    internalConns = JSON.parse(JSON.stringify(comp.state.subcircuitInternalState.connections));
  } else {
    internalComps = JSON.parse(JSON.stringify(def.components));
    internalConns = JSON.parse(JSON.stringify(def.connections));
  }

  // Ensure internal components are cleanly positioned in view starting around (80, 80)
  if (internalComps.length > 0) {
    const minX = Math.min(...internalComps.map((c) => c.x));
    const minY = Math.min(...internalComps.map((c) => c.y));
    const offX = 80 - minX;
    const offY = 80 - minY;
    if (Math.abs(offX) > 20 || Math.abs(offY) > 20) {
      internalComps.forEach((c) => {
        c.x += offX;
        c.y += offY;
      });
      internalConns.forEach((w) => {
        if (w.waypoints) {
          w.waypoints = w.waypoints.map((pt) => ({ x: pt.x + offX, y: pt.y + offY }));
        }
        if (w.branchPoint) {
          w.branchPoint = { x: w.branchPoint.x + offX, y: w.branchPoint.y + offY };
        }
      });
    }
  }

  components = internalComps;
  connections = internalConns;
  selectedComponentIds = [];
  selectedWireId = null;
  viewTransform = { x: 50, y: 50, zoom: 1 };
  pastHistory.length = 0;
  futureHistory.length = 0;

  markStructureChanged();
  runEvaluation();
  return true;
}

function closeSubcircuit(): boolean {
  if (hierarchyStack.length === 0) return false;

  const currentLevel = hierarchyStack.pop()!;
  const parentComps = currentLevel.parentComponents;
  const parentConns = currentLevel.parentConnections;

  const instance = parentComps.find((c) => c.id === currentLevel.instanceId);
  if (instance) {
    if (!instance.state) instance.state = {};
    instance.state.subcircuitInternalState = {
      components: JSON.parse(JSON.stringify(components)),
      connections: JSON.parse(JSON.stringify(connections)),
    };
  }

  components = parentComps;
  connections = parentConns;
  viewTransform = currentLevel.parentViewTransform;
  selectedComponentIds = currentLevel.parentSelectedComponentIds;
  selectedWireId = currentLevel.parentSelectedWireId;
  pastHistory.length = 0;
  futureHistory.length = 0;

  markStructureChanged();
  runEvaluation();
  return true;
}

function navigateToHierarchyLevel(levelIndex: number): void {
  while (hierarchyStack.length > levelIndex) {
    closeSubcircuit();
  }
}

function saveActiveSubcircuitToDefinition(): { success: boolean; message: string } {
  if (hierarchyStack.length === 0) {
    return { success: false, message: 'No estás dentro de un subcircuito.' };
  }

  const currentLevel = hierarchyStack[hierarchyStack.length - 1];
  const def = SubcircuitRegistry.get(currentLevel.subcircuitId);
  if (!def) {
    return { success: false, message: 'Definición de subcircuito no encontrada.' };
  }

  SubcircuitRegistry.update(def.id, {
    components: JSON.parse(JSON.stringify(components)),
    connections: JSON.parse(JSON.stringify(connections)),
  });

  // Update all instances across parent hierarchy levels that use this definition
  hierarchyStack.forEach((lvl) => {
    lvl.parentComponents.forEach((c) => {
      if (c.subcircuitId === def.id && c.state?.subcircuitInternalState) {
        c.state.subcircuitInternalState = {
          components: JSON.parse(JSON.stringify(components)),
          connections: JSON.parse(JSON.stringify(connections)),
        };
      }
    });
  });

  notify();
  return {
    success: true,
    message: `Subcircuito "${def.name}" actualizado en la biblioteca y en todas las instancias.`,
  };
}

export interface CreateSubcircuitOptions {
  name: string;
  description?: string;
  category?: string;
  color?: string;
  ports: SubcircuitPort[];
  replaceSelection?: boolean;
  componentIds?: string[];
}

function createBlankSubcircuit(
  name?: string,
  description?: string,
  category?: string,
  color?: string
): SubcircuitDefinition {
  const subcircuitId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const def: SubcircuitDefinition = {
    id: subcircuitId,
    name: (name || 'NUEVO_SUBCIRCUITO').trim().toUpperCase(),
    description: description?.trim() || 'Subcircuito modular personalizado',
    category: category?.trim() || 'Personalizados',
    color: color || '#06b6d4',
    components: [],
    connections: [],
    ports: [],
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    readOnly: false,
  };
  SubcircuitRegistry.register(def);
  notify();
  return def;
}

function createSubcircuitFromSelection(
  nameOrOptions: string | CreateSubcircuitOptions,
  description?: string,
  category?: string,
  ports?: SubcircuitPort[],
  replaceSelection = true
): { success: boolean; message: string; subcircuit?: SubcircuitDefinition } {
  let finalName = '';
  let finalDesc = '';
  let finalCat = 'Personalizados';
  let finalColor = '#06b6d4';
  let finalPorts: SubcircuitPort[] = [];
  let finalReplace = true;
  let customComponentIds: string[] | undefined;

  if (typeof nameOrOptions === 'object') {
    finalName = nameOrOptions.name;
    finalDesc = nameOrOptions.description || '';
    finalCat = nameOrOptions.category || 'Personalizados';
    finalColor = nameOrOptions.color || '#06b6d4';
    finalPorts = nameOrOptions.ports || [];
    finalReplace = nameOrOptions.replaceSelection ?? true;
    customComponentIds = nameOrOptions.componentIds;
  } else {
    finalName = nameOrOptions;
    finalDesc = description || '';
    finalCat = category || 'Personalizados';
    finalPorts = ports || [];
    finalReplace = replaceSelection;
  }

  let targetIds = selectedComponentIds;
  if (customComponentIds && customComponentIds.length > 0) {
    targetIds = customComponentIds;
  } else if (targetIds.length === 0 && components.length > 0) {
    targetIds = components.map((c) => c.id);
  }

  if (targetIds.length === 0) {
    return {
      success: false,
      message: 'No hay componentes en el lienzo para encapsular. Coloca primero compuertas o circuitos en el lienzo.',
    };
  }

  pushHistory();
  const selectedSet = new Set(targetIds);
  const selectedComps = components.filter((c) => selectedSet.has(c.id));
  const internalConns = connections.filter(
    (w) => selectedSet.has(w.fromComponentId) && selectedSet.has(w.toComponentId)
  );

  const minX = Math.min(...selectedComps.map((c) => c.x));
  const minY = Math.min(...selectedComps.map((c) => c.y));
  const maxX = Math.max(...selectedComps.map((c) => c.x + c.width));
  const maxY = Math.max(...selectedComps.map((c) => c.y + c.height));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const shiftX = -minX + 80;
  const shiftY = -minY + 80;

  const clonedComps: CircuitComponent[] = selectedComps.map((c) => ({
    ...JSON.parse(JSON.stringify(c)),
    x: c.x + shiftX,
    y: c.y + shiftY,
  }));
  const clonedConns: WireConnection[] = internalConns.map((w) => ({
    ...JSON.parse(JSON.stringify(w)),
    waypoints: w.waypoints ? w.waypoints.map((pt) => ({ x: pt.x + shiftX, y: pt.y + shiftY })) : undefined,
    branchPoint: w.branchPoint ? { x: w.branchPoint.x + shiftX, y: w.branchPoint.y + shiftY } : undefined,
  }));

  // Ensure input/output boundary components exist inside the subcircuit
  const inputPorts = finalPorts.filter((p) => p.type === 'input').sort((a, b) => a.order - b.order);
  const outputPorts = finalPorts.filter((p) => p.type === 'output').sort((a, b) => a.order - b.order);

  inputPorts.forEach((port, idx) => {
    const targetComp = clonedComps.find((c) => c.id === port.targetComponentId);
    if (
      targetComp &&
      targetComp.type !== 'SWITCH' &&
      targetComp.type !== 'PUSH_BUTTON' &&
      targetComp.type !== 'CONSTANT_0' &&
      targetComp.type !== 'CONSTANT_1'
    ) {
      const swY = Math.max(60, targetComp.y);
      const sw = createComponent('SWITCH', 40, swY, port.name);
      clonedComps.unshift(sw);
      clonedConns.push({
        id: `wire_syn_in_${port.id}_${Date.now()}_${idx}`,
        fromComponentId: sw.id,
        fromPinId: sw.outputs[0].id,
        toComponentId: targetComp.id,
        toPinId: port.targetPinId,
        value: 0,
      });
      port.targetComponentId = sw.id;
      port.targetPinId = sw.outputs[0].id;
    }
  });

  const currMaxX = Math.max(...clonedComps.map((c) => c.x + c.width), 340);
  outputPorts.forEach((port, idx) => {
    const targetComp = clonedComps.find((c) => c.id === port.targetComponentId);
    if (
      targetComp &&
      targetComp.type !== 'LED' &&
      targetComp.type !== 'OUTPUT_LED' &&
      targetComp.type !== 'OUTPUT_PIN'
    ) {
      const ledY = Math.max(60, targetComp.y);
      const led = createComponent('LED', currMaxX + 80, ledY, port.name);
      clonedComps.push(led);
      clonedConns.push({
        id: `wire_syn_out_${port.id}_${Date.now()}_${idx}`,
        fromComponentId: targetComp.id,
        fromPinId: port.targetPinId,
        toComponentId: led.id,
        toPinId: led.inputs[0].id,
        value: 0,
      });
      port.targetComponentId = led.id;
      port.targetPinId = led.inputs[0].id;
    }
  });

  const subcircuitId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const def: SubcircuitDefinition = {
    id: subcircuitId,
    name: finalName.trim() || 'MI SUBCIRCUITO',
    description: finalDesc.trim() || 'Subcircuito personalizado',
    category: finalCat.trim() || 'Mis subcircuitos',
    color: finalColor,
    components: clonedComps,
    connections: clonedConns,
    ports: finalPorts,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    readOnly: false,
  };

  SubcircuitRegistry.register(def);

  if (finalReplace) {
    const newInstance = SubcircuitRegistry.createInstance(
      def.id,
      Math.round(centerX / 20) * 20,
      Math.round(centerY / 20) * 20,
      def.name
    );

    const rewiredConnections: WireConnection[] = [];

    for (const w of connections) {
      const isInternal = selectedSet.has(w.fromComponentId) && selectedSet.has(w.toComponentId);
      if (isInternal) continue;

      const isIncoming = !selectedSet.has(w.fromComponentId) && selectedSet.has(w.toComponentId);
      const isOutgoing = selectedSet.has(w.fromComponentId) && !selectedSet.has(w.toComponentId);

      if (isIncoming) {
        const port = def.ports.find(
          (p) => p.type === 'input' && p.targetComponentId === w.toComponentId && p.targetPinId === w.toPinId
        ) || def.ports.find((p) => p.type === 'input' && p.targetComponentId === w.toComponentId);

        if (port) {
          const instPin = newInstance.inputs.find((p) => p.name === port.name) || newInstance.inputs[port.order];
          if (instPin) {
            rewiredConnections.push({
              ...w,
              toComponentId: newInstance.id,
              toPinId: instPin.id,
            });
            continue;
          }
        }
      } else if (isOutgoing) {
        const port = def.ports.find(
          (p) => p.type === 'output' && p.targetComponentId === w.fromComponentId && p.targetPinId === w.fromPinId
        ) || def.ports.find((p) => p.type === 'output' && p.targetComponentId === w.fromComponentId);

        if (port) {
          const instPin = newInstance.outputs.find((p) => p.name === port.name) || newInstance.outputs[port.order];
          if (instPin) {
            rewiredConnections.push({
              ...w,
              fromComponentId: newInstance.id,
              fromPinId: instPin.id,
            });
            continue;
          }
        }
      }

      if (!selectedSet.has(w.fromComponentId) && !selectedSet.has(w.toComponentId)) {
        rewiredConnections.push(w);
      }
    }

    components = [...components.filter((c) => !selectedSet.has(c.id)), newInstance];
    connections = rewiredConnections;
    selectedComponentIds = [newInstance.id];
    selectedWireId = null;
  }

  markStructureChanged();
  runEvaluation();

  return {
    success: true,
    message: `Subcircuito "${def.name}" creado y guardado en "Mis subcircuitos".`,
    subcircuit: def,
  };
}

function insertSubcircuit(subcircuitId: string, x = 200, y = 200, label?: string): CircuitComponent {
  pushHistory();
  const finalX = snapToGrid ? Math.round(x / 20) * 20 : x;
  const finalY = snapToGrid ? Math.round(y / 20) * 20 : y;
  const inst = SubcircuitRegistry.createInstance(subcircuitId, finalX, finalY, label);
  components = [...components, inst];
  selectedComponentIds = [inst.id];
  selectedWireId = null;
  markStructureChanged();
  runEvaluation();
  return inst;
}

// Pure store instance accessible outside React
export const circuitStore = {
  get components() { return components; },
  get connections() { return connections; },
  get selectedComponentIds() { return selectedComponentIds; },
  get selectedWireId() { return selectedWireId; },
  get draggingWire() { return draggingWire; },
  get viewTransform() { return viewTransform; },
  get snapToGrid() { return snapToGrid; },
  get simulation() { return simulation; },
  get canUndo() { return pastHistory.length > 0; },
  get canRedo() { return futureHistory.length > 0; },
  get associatedTruthTable() { return associatedTruthTable; },
  get associatedTruthTableTimestamp() { return associatedTruthTableTimestamp; },
  get lastCircuitStructureChange() { return lastCircuitStructureChange; },
  get isTableOutdated() {
    if (!associatedTruthTable) return true;
    return structureVersion > tableVersion;
  },
  get hasClipboard() { return clipboard !== null && clipboard.components.length > 0; },
  get hierarchyStack() { return hierarchyStack; },
  get currentHierarchyDepth() { return hierarchyStack.length; },
  get isInsideSubcircuit() { return hierarchyStack.length > 0; },
  get currentSubcircuitInfo() { return hierarchyStack.length > 0 ? hierarchyStack[hierarchyStack.length - 1] : null; },
  getHierarchyBreadcrumbs,
  openSubcircuit,
  closeSubcircuit,
  navigateToHierarchyLevel,
  saveActiveSubcircuitToDefinition,
  createSubcircuitFromSelection,
  createBlankSubcircuit,
  insertSubcircuit,
  addComponent,
  updateComponentPosition,
  updateComponentPositions,
  removeComponent,
  duplicateSelected,
  copySelected,
  cutSelected,
  paste,
  selectAll,
  rotateComponent,
  rotateSelected,
  toggleSwitch,
  pressButton,
  startDraggingWire,
  updateDraggingWire,
  finishDraggingWire,
  cancelDraggingWire,
  removeConnection,
  updateWireWaypoints,
  resetWireRoute,
  addWaypointToWire,
  removeWaypointFromWire,
  loadCircuit,
  clearCircuit,
  undo,
  redo,
  setViewTransform,
  resetView,
  setSelectedComponents,
  setSelectedWire,
  toggleSimulation,
  togglePause,
  stepOnce,
  setClockHz,
  setSnapToGrid,
  updateComponentLabel,
  updateComponentInputCount,
  updateComponentOrientation,
  updateComponentState,
  runEvaluation,
  generateAssociatedTruthTable,
  compareWithTable,
  synthesizeCircuitFromTable,
};

// React hook wrapper
export function useCircuitStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Clock oscillator interval
  useEffect(() => {
    if (!simulation.isRunning || simulation.isPaused) return;

    const intervalMs = Math.max(50, Math.floor(1000 / (simulation.clockHz * 2)));
    const interval = setInterval(() => {
      const result = CircuitSimulator.step(components, connections, true);
      components = result.components;
      connections = result.connections;
      simulation = {
        ...simulation,
        stepCount: simulation.stepCount + 1,
        lastEvaluated: Date.now(),
        cycleDetected: result.cycleDetected,
        warnings: result.warnings,
        errors: result.errors,
      };
      notify();
    }, intervalMs);

    return () => clearInterval(interval);
  }, []);

  return circuitStore;
}
