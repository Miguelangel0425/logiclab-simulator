/**
 * LogicLab - Interactive Circuit Canvas
 * Real-time drag & drop, magnetic pin snap, bidirectional wire routing, undo/redo & validation
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useCircuitStore } from '../../store/useCircuitStore';
import { useAppStore } from '../../store/useAppStore';
import { LogicValue } from '../../types';
import { GateSymbol } from './GateSymbol';
import { WireRouter } from './WireRouter';
import { HierarchyBreadcrumbs } from './HierarchyBreadcrumbs';
import { CreateSubcircuitModal } from './CreateSubcircuitModal';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Sparkles,
  Box,
  CornerUpRight,
  RotateCcw,
  Trash2,
  PlusCircle,
  GitBranch,
} from 'lucide-react';
import {
  Point,
  ObstacleBox,
  moveWireSegmentOrthogonally,
  moveWaypointOrthogonally,
  addTurnPointToWire,
  removeTurnPointFromWire,
  extractWireSegments,
  getFullWireVertices,
} from '../../engines/circuit/wireRouting';

interface HoveredTargetPin {
  compId: string;
  pinId: string;
  isOutput: boolean;
  pinName: string;
  x: number;
  y: number;
}

interface WireDragState {
  wireId: string;
  type: 'segment' | 'waypoint';
  index: number;
  initialVertices: Point[];
  initialWaypoints?: Point[];
}

interface WireContextMenuState {
  wireId: string;
  worldX: number;
  worldY: number;
  screenX: number;
  screenY: number;
  waypointIndex?: number;
}

export const CircuitCanvas: React.FC = () => {
  const { showToast } = useAppStore();
  const {
    components,
    connections,
    selectedComponentIds,
    selectedWireId,
    draggingWire,
    viewTransform,
    snapToGrid,
    addComponent,
    insertSubcircuit,
    openSubcircuit,
    isInsideSubcircuit,
    updateComponentPosition,
    updateComponentPositions,
    removeComponent,
    duplicateSelected,
    copySelected,
    cutSelected,
    paste,
    selectAll,
    rotateSelected,
    rotateComponent,
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
    setViewTransform,
    setSelectedComponents,
    setSelectedWire,
    resetView,
    undo,
    redo,
  } = useCircuitStore();

  const [isCreateSubcircuitOpen, setIsCreateSubcircuitOpen] = useState(false);

  // Wire interaction & manipulation state
  const [wireDragState, setWireDragState] = useState<WireDragState | null>(null);
  const [wireContextMenu, setWireContextMenu] = useState<WireContextMenuState | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Dragging component state
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });
  const compStartPosRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const multiStartPosRef = useRef<Record<string, { x: number; y: number }>>({});
  const lastCompClickRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });

  // Marquee selection state
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const isMarqueeDraggingRef = useRef<boolean>(false);

  // Magnetic pin snapping state
  const [hoveredTargetPin, setHoveredTargetPin] = useState<HoveredTargetPin | null>(null);

  // Canvas panning state
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ startX: number; startY: number; viewX: number; viewY: number }>({
    startX: 0,
    startY: 0,
    viewX: 0,
    viewY: 0,
  });

  // Touch pan & pinch zoom state
  const touchStartRef = useRef<{
    startX: number;
    startY: number;
    viewX: number;
    viewY: number;
    pinchDist: number;
    startZoom: number;
  }>({
    startX: 0,
    startY: 0,
    viewX: 0,
    viewY: 0,
    pinchDist: 0,
    startZoom: 1,
  });

  const handleZoomIn = () => {
    setViewTransform({
      ...viewTransform,
      zoom: Math.min(2.5, Math.round((viewTransform.zoom + 0.15) * 100) / 100),
    });
  };

  const handleZoomOut = () => {
    setViewTransform({
      ...viewTransform,
      zoom: Math.max(0.3, Math.round((viewTransform.zoom - 0.15) * 100) / 100),
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        viewX: viewTransform.x,
        viewY: viewTransform.y,
        pinchDist: 0,
        startZoom: viewTransform.zoom,
      };
      setIsPanning(true);
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartRef.current = {
        startX: (t1.clientX + t2.clientX) / 2,
        startY: (t1.clientY + t2.clientY) / 2,
        viewX: viewTransform.x,
        viewY: viewTransform.y,
        pinchDist: dist,
        startZoom: viewTransform.zoom,
      };
      setIsPanning(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.startX;
      const dy = touch.clientY - touchStartRef.current.startY;
      setViewTransform({
        x: touchStartRef.current.viewX + dx,
        y: touchStartRef.current.viewY + dy,
      });
    } else if (e.touches.length === 2 && touchStartRef.current.pinchDist > 0) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = currentDist / touchStartRef.current.pinchDist;
      const newZoom = Math.min(2.5, Math.max(0.3, touchStartRef.current.startZoom * ratio));
      setViewTransform({
        zoom: newZoom,
        x: touchStartRef.current.viewX,
        y: touchStartRef.current.viewY,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  // Convert mouse screen coordinates to canvas world coordinates
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - viewTransform.x) / viewTransform.zoom;
      const y = (clientY - rect.top - viewTransform.y) / viewTransform.zoom;
      return { x, y };
    },
    [viewTransform]
  );

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(2.5, Math.max(0.3, viewTransform.zoom * zoomFactor));

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom centered around mouse pointer
    const newX = mouseX - (mouseX - viewTransform.x) * (newZoom / viewTransform.zoom);
    const newY = mouseY - (mouseY - viewTransform.y) * (newZoom / viewTransform.zoom);

    setViewTransform({ zoom: newZoom, x: newX, y: newY });
  };

  // Keyboard shortcuts (Copy, Cut, Paste, Duplicate, Select All, Rotate, Delete, Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedComponentIds.length > 0) {
          selectedComponentIds.forEach((id) => removeComponent(id));
        } else if (selectedWireId) {
          removeConnection(selectedWireId);
        }
      } else if (e.key === 'Escape') {
        cancelDraggingWire();
        setHoveredTargetPin(null);
        setSelectedComponents([]);
        setSelectedWire(null);
        setWireContextMenu(null);
        setWireDragState(null);
        setMarquee(null);
        isMarqueeDraggingRef.current = false;
      } else if (isCtrlOrMeta && key === 'c') {
        e.preventDefault();
        copySelected();
        if (selectedComponentIds.length > 0) {
          showToast('info', `${selectedComponentIds.length} componente(s) copiado(s) al portapapeles`);
        }
      } else if (isCtrlOrMeta && key === 'x') {
        e.preventDefault();
        cutSelected();
        showToast('info', 'Componente(s) cortado(s)');
      } else if (isCtrlOrMeta && key === 'v') {
        e.preventDefault();
        paste();
        showToast('success', 'Componente(s) pegado(s) desde portapapeles');
      } else if (isCtrlOrMeta && key === 'a') {
        e.preventDefault();
        selectAll();
      } else if (isCtrlOrMeta && key === 'd') {
        e.preventDefault();
        duplicateSelected();
        showToast('success', 'Componente duplicado');
      } else if (key === 'r' && !isCtrlOrMeta) {
        e.preventDefault();
        if (selectedComponentIds.length > 0) {
          rotateSelected(true);
        }
      } else if (isCtrlOrMeta && key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      } else if (isCtrlOrMeta && key === 'y') {
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedComponentIds,
    selectedWireId,
    undo,
    redo,
    duplicateSelected,
    copySelected,
    cutSelected,
    paste,
    selectAll,
    rotateSelected,
    removeComponent,
    removeConnection,
    cancelDraggingWire,
    setSelectedComponents,
    setSelectedWire,
    showToast,
  ]);

  // Compute bounding boxes of components to assist smart automatic orthogonal routing
  const obstacles: ObstacleBox[] = useMemo(() => {
    return components.map((c) => ({
      x: c.x,
      y: c.y,
      width: c.width,
      height: c.height,
    }));
  }, [components]);

  // Wire Segment & Waypoint Drag Handlers
  const handleStartSegmentDrag = (wireId: string, segmentIndex: number, e: React.MouseEvent, vertices: Point[]) => {
    setSelectedWire(wireId);
    setSelectedComponents([]);
    setWireContextMenu(null);
    const wire = connections.find((w) => w.id === wireId);
    setWireDragState({
      wireId,
      type: 'segment',
      index: segmentIndex,
      initialVertices: vertices.map((p) => ({ ...p })),
      initialWaypoints: wire?.waypoints ? JSON.parse(JSON.stringify(wire.waypoints)) : undefined,
    });
  };

  const handleStartWaypointDrag = (wireId: string, waypointIndex: number, e: React.MouseEvent, vertices: Point[]) => {
    setSelectedWire(wireId);
    setSelectedComponents([]);
    setWireContextMenu(null);
    const wire = connections.find((w) => w.id === wireId);
    setWireDragState({
      wireId,
      type: 'waypoint',
      index: waypointIndex,
      initialVertices: vertices.map((p) => ({ ...p })),
      initialWaypoints: wire?.waypoints ? JSON.parse(JSON.stringify(wire.waypoints)) : undefined,
    });
  };

  const handleAddTurnPoint = (wireId: string, pt: Point) => {
    const wire = connections.find((w) => w.id === wireId);
    if (!wire) return;
    const start = getPinPos(wire.fromComponentId, wire.fromPinId, true);
    const end = getPinPos(wire.toComponentId, wire.toPinId, false);
    const full = getFullWireVertices(start.x, start.y, end.x, end.y, wire.waypoints, obstacles);
    const nextVertices = addTurnPointToWire(full, pt, snapToGrid ? 20 : 10);
    const newWaypoints = nextVertices.slice(1, -1);
    updateWireWaypoints(wireId, newWaypoints, true);
    showToast('success', 'Punto de giro añadido al cable');
    setWireContextMenu(null);
  };

  const handleRemoveTurnPoint = (wireId: string, waypointIndex: number) => {
    const wire = connections.find((w) => w.id === wireId);
    if (!wire) return;
    const start = getPinPos(wire.fromComponentId, wire.fromPinId, true);
    const end = getPinPos(wire.toComponentId, wire.toPinId, false);
    const full = getFullWireVertices(start.x, start.y, end.x, end.y, wire.waypoints, obstacles);
    const nextVertices = removeTurnPointFromWire(full, waypointIndex);
    const newWaypoints = nextVertices.slice(1, -1);
    updateWireWaypoints(wireId, newWaypoints.length > 0 ? newWaypoints : undefined, true);
    showToast('info', 'Punto de giro eliminado');
    setWireContextMenu(null);
  };

  const handleWireContextMenu = (wireId: string, e: React.MouseEvent, waypointIndex?: number) => {
    const world = screenToWorld(e.clientX, e.clientY);
    setWireContextMenu({
      wireId,
      worldX: world.x,
      worldY: world.y,
      screenX: e.clientX,
      screenY: e.clientY,
      waypointIndex,
    });
  };

  // Canvas background mousedown (start pan or marquee selection)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setWireContextMenu(null);

    // Middle button or Shift+click = Canvas Pan
    if (e.button === 1 || e.shiftKey) {
      setIsPanning(true);
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        viewX: viewTransform.x,
        viewY: viewTransform.y,
      };
      return;
    }

    // Left click on background = Start Marquee Selection or Deselect
    if (e.button === 0) {
      const world = screenToWorld(e.clientX, e.clientY);
      isMarqueeDraggingRef.current = true;
      setMarquee({
        startX: world.x,
        startY: world.y,
        currentX: world.x,
        currentY: world.y,
      });
      setSelectedComponents([]);
      setSelectedWire(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 0. Drag wire segment or waypoint
    if (wireDragState) {
      const world = screenToWorld(e.clientX, e.clientY);
      const wire = connections.find((w) => w.id === wireDragState.wireId);
      if (wire) {
        if (wireDragState.type === 'segment') {
          const segs = extractWireSegments(wireDragState.initialVertices);
          const seg = segs[wireDragState.index];
          if (seg) {
            const newCoord = seg.isHorizontal ? world.y : world.x;
            const newVertices = moveWireSegmentOrthogonally(
              wireDragState.initialVertices,
              wireDragState.index,
              newCoord,
              snapToGrid ? 20 : 10
            );
            const newWps = newVertices.slice(1, -1);
            updateWireWaypoints(wire.id, newWps, false);
          }
        } else if (wireDragState.type === 'waypoint') {
          const newVertices = moveWaypointOrthogonally(
            wireDragState.initialVertices,
            wireDragState.index,
            world.x,
            world.y,
            snapToGrid ? 20 : 10
          );
          const newWps = newVertices.slice(1, -1);
          updateWireWaypoints(wire.id, newWps, false);
        }
      }
      return;
    }

    // 1. Pan canvas
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.startX;
      const dy = e.clientY - panStartRef.current.startY;
      setViewTransform({
        x: panStartRef.current.viewX + dx,
        y: panStartRef.current.viewY + dy,
      });
      return;
    }

    // 2. Marquee box selection
    if (isMarqueeDraggingRef.current && marquee) {
      const world = screenToWorld(e.clientX, e.clientY);
      setMarquee({
        ...marquee,
        currentX: world.x,
        currentY: world.y,
      });
      return;
    }

    // 3. Drag component(s)
    if (draggingCompId) {
      const world = screenToWorld(e.clientX, e.clientY);
      const newX = world.x - dragOffsetRef.current.offsetX;
      const newY = world.y - dragOffsetRef.current.offsetY;
      const startPos = compStartPosRef.current;
      if (startPos) {
        const dx = newX - startPos.x;
        const dy = newY - startPos.y;
        if (selectedComponentIds.length > 1 && selectedComponentIds.includes(draggingCompId)) {
          const updates = selectedComponentIds.map((id) => {
            const orig = multiStartPosRef.current[id] || { x: 0, y: 0 };
            return { id, x: orig.x + dx, y: orig.y + dy };
          });
          updateComponentPositions(updates, false);
        } else {
          updateComponentPosition(draggingCompId, newX, newY, false);
        }
      }
      return;
    }

    // 4. Drag pending wire with magnetic pin snapping
    if (draggingWire) {
      const world = screenToWorld(e.clientX, e.clientY);
      let closestPin: HoveredTargetPin | null = null;
      let minDistance = 24; // snap threshold in world pixels

      for (const comp of components) {
        if (comp.id === draggingWire.fromComponentId) continue; // cannot connect to same component

        const candidatePins = draggingWire.isFromOutput ? comp.inputs : comp.outputs;

        for (const pin of candidatePins) {
          const pinWorldX = comp.x + pin.relX;
          const pinWorldY = comp.y + pin.relY;
          const dist = Math.hypot(world.x - pinWorldX, world.y - pinWorldY);

          if (dist < minDistance) {
            minDistance = dist;
            closestPin = {
              compId: comp.id,
              pinId: pin.id,
              isOutput: !draggingWire.isFromOutput,
              pinName: pin.name,
              x: pinWorldX,
              y: pinWorldY,
            };
          }
        }
      }

      if (closestPin) {
        setHoveredTargetPin(closestPin);
        updateDraggingWire(closestPin.x, closestPin.y);
      } else {
        setHoveredTargetPin(null);
        updateDraggingWire(world.x, world.y);
      }
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    // Finish dragging wire segment or waypoint: save to history
    if (wireDragState) {
      const wire = connections.find((w) => w.id === wireDragState.wireId);
      if (wire) {
        const changed = JSON.stringify(wire.waypoints) !== JSON.stringify(wireDragState.initialWaypoints);
        if (changed) {
          updateWireWaypoints(wire.id, wire.waypoints, true);
        }
      }
      setWireDragState(null);
    }

    // Finish marquee selection
    if (isMarqueeDraggingRef.current && marquee) {
      isMarqueeDraggingRef.current = false;
      const x1 = Math.min(marquee.startX, marquee.currentX);
      const x2 = Math.max(marquee.startX, marquee.currentX);
      const y1 = Math.min(marquee.startY, marquee.currentY);
      const y2 = Math.max(marquee.startY, marquee.currentY);
      const isDrag = Math.hypot(x2 - x1, y2 - y1) > 6;
      if (isDrag) {
        const enclosedIds = components
          .filter((c) => c.x + c.width >= x1 && c.x <= x2 && c.y + c.height >= y1 && c.y <= y2)
          .map((c) => c.id);
        setSelectedComponents(enclosedIds);
      }
      setMarquee(null);
    }

    // Finished dragging component: record in history if position changed
    if (draggingCompId) {
      if (selectedComponentIds.length > 1 && selectedComponentIds.includes(draggingCompId)) {
        const startPos = compStartPosRef.current;
        const comp = components.find((c) => c.id === draggingCompId);
        if (comp && startPos && (comp.x !== startPos.x || comp.y !== startPos.y)) {
          const updates = selectedComponentIds.map((id) => {
            const c = components.find((compItem) => compItem.id === id);
            return { id, x: c?.x || 0, y: c?.y || 0 };
          });
          updateComponentPositions(updates, true);
        }
      } else {
        const comp = components.find((c) => c.id === draggingCompId);
        if (comp && compStartPosRef.current && compStartPosRef.current.id === draggingCompId) {
          if (comp.x !== compStartPosRef.current.x || comp.y !== compStartPosRef.current.y) {
            updateComponentPosition(comp.id, comp.x, comp.y, true);
          }
        }
      }
      setDraggingCompId(null);
      compStartPosRef.current = null;
      multiStartPosRef.current = {};
    }

    // Finished dragging wire with magnetic snap
    if (draggingWire) {
      if (hoveredTargetPin) {
        const res = finishDraggingWire(hoveredTargetPin.compId, hoveredTargetPin.pinId);
        if (res && res.message) {
          showToast(res.type, res.message);
        }
      } else {
        cancelDraggingWire();
      }
      setHoveredTargetPin(null);
    }
  };

  // Start dragging a component
  const handleComponentMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let newSelection = selectedComponentIds;
    if (e.shiftKey) {
      if (selectedComponentIds.includes(id)) {
        newSelection = selectedComponentIds.filter((cid) => cid !== id);
      } else {
        newSelection = [...selectedComponentIds, id];
      }
      setSelectedComponents(newSelection);
    } else {
      if (!selectedComponentIds.includes(id)) {
        newSelection = [id];
        setSelectedComponents([id]);
      }
    }
    const comp = components.find((c) => c.id === id);
    if (!comp) return;

    // Detect double-click on subcircuits reliably
    const now = Date.now();
    if (comp.type === 'CUSTOM_SUBCIRCUIT' && comp.subcircuitId) {
      if (lastCompClickRef.current.id === id && now - lastCompClickRef.current.time < 450) {
        lastCompClickRef.current = { id: '', time: 0 };
        openSubcircuit(comp.id);
        showToast('info', `Diseño interno de ${comp.label || 'Subcircuito'}`);
        return;
      }
      lastCompClickRef.current = { id, time: now };
    }

    const world = screenToWorld(e.clientX, e.clientY);
    dragOffsetRef.current = {
      offsetX: world.x - comp.x,
      offsetY: world.y - comp.y,
    };
    compStartPosRef.current = { id, x: comp.x, y: comp.y };

    // Record initial positions of all selected components
    const multiMap: Record<string, { x: number; y: number }> = {};
    for (const cid of newSelection) {
      const c = components.find((item) => item.id === cid);
      if (c) multiMap[cid] = { x: c.x, y: c.y };
    }
    multiStartPosRef.current = multiMap;
    setDraggingCompId(id);
  };

  // Bidirectional pin interactions: start from either output or input
  const handlePinMouseDown = (
    pinId: string,
    isOutput: boolean,
    pinX: number,
    pinY: number,
    e: React.MouseEvent
  ) => {
    const parentComp = components.find((c) =>
      isOutput
        ? c.outputs.some((p) => p.id === pinId)
        : c.inputs.some((p) => p.id === pinId)
    );
    if (!parentComp) return;

    startDraggingWire(parentComp.id, pinId, isOutput, pinX, pinY);
  };

  const handlePinMouseUp = (pinId: string, isOutput: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!draggingWire) return;

    const targetComp = components.find((c) =>
      isOutput
        ? c.outputs.some((p) => p.id === pinId)
        : c.inputs.some((p) => p.id === pinId)
    );

    if (targetComp) {
      const res = finishDraggingWire(targetComp.id, pinId);
      if (res && res.message) {
        showToast(res.type, res.message);
      }
    }
    setHoveredTargetPin(null);
  };

  // Find absolute coordinates for a component pin
  const getPinPos = (compId: string, pinId: string, isOutput: boolean) => {
    const comp = components.find((c) => c.id === compId);
    if (!comp) return { x: 0, y: 0 };
    const list = isOutput ? comp.outputs : comp.inputs;
    const pin = list.find((p) => p.id === pinId);
    if (!pin) return { x: comp.x, y: comp.y };
    return {
      x: comp.x + pin.relX,
      y: comp.y + pin.relY,
    };
  };

  // Drag-and-drop from outside (Component Library palette)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/logiclab-component');
    const subcircuitId = e.dataTransfer.getData('application/logiclab-subcircuit');
    const metaStr = e.dataTransfer.getData('application/logiclab-meta');
    let meta: any = null;
    if (metaStr) {
      try {
        meta = JSON.parse(metaStr);
      } catch {
        // ignore parse error
      }
    }
    const world = screenToWorld(e.clientX, e.clientY);
    if (subcircuitId) {
      insertSubcircuit(subcircuitId, world.x, world.y, meta?.label);
    } else if (type === 'CUSTOM_SUBCIRCUIT' && meta?.subcircuitId) {
      insertSubcircuit(meta.subcircuitId, world.x, world.y, meta?.label);
    } else if (type) {
      addComponent(type as any, world.x, world.y, meta?.label, meta?.state);
    }
  };

  // Fan-out solder dots for output terminals driving multiple wires
  const fanoutJunctions = useMemo(() => {
    const counts = new Map<string, { count: number; compId: string; pinId: string; val: LogicValue }>();
    for (const w of connections) {
      const key = `${w.fromComponentId}:${w.fromPinId}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
      } else {
        counts.set(key, { count: 1, compId: w.fromComponentId, pinId: w.fromPinId, val: w.value });
      }
    }
    const junctions: { x: number; y: number; val: LogicValue }[] = [];
    counts.forEach((item) => {
      if (item.count > 1) {
        const pos = getPinPos(item.compId, item.pinId, true);
        junctions.push({ x: pos.x, y: pos.y, val: item.val });
      }
    });
    return junctions;
  }, [connections, components]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full overflow-hidden bg-[var(--bg-base)] cursor-crosshair select-none touch-none"
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Background Dot Grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <pattern
            id="logiclab-grid"
            width={20 * viewTransform.zoom}
            height={20 * viewTransform.zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${viewTransform.x % (20 * viewTransform.zoom)}, ${
              viewTransform.y % (20 * viewTransform.zoom)
            })`}
          >
            <circle
              cx={2}
              cy={2}
              r={1 * Math.min(1.5, Math.max(0.6, viewTransform.zoom))}
              fill="var(--canvas-grid-dot)"
              opacity={0.5}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#logiclab-grid)" />
      </svg>

      {/* Main Vector Circuit Canvas */}
      <svg className="absolute inset-0 w-full h-full overflow-visible">
        <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.zoom})`}>
          {/* Wire Connections Layer */}
          {connections.map((wire) => {
            const start = getPinPos(wire.fromComponentId, wire.fromPinId, true);
            const end = getPinPos(wire.toComponentId, wire.toPinId, false);
            return (
              <WireRouter
                key={wire.id}
                wire={wire}
                startX={start.x}
                startY={start.y}
                endX={end.x}
                endY={end.y}
                isSelected={selectedWireId === wire.id}
                onSelectWire={(id) => {
                  setSelectedWire(id);
                  setSelectedComponents([]);
                  setWireContextMenu(null);
                }}
                onRemoveWire={removeConnection}
                onStartSegmentDrag={handleStartSegmentDrag}
                onStartWaypointDrag={handleStartWaypointDrag}
                onContextMenu={handleWireContextMenu}
                onAddTurnPoint={handleAddTurnPoint}
                onRemoveTurnPoint={handleRemoveTurnPoint}
                obstacles={obstacles}
              />
            );
          })}

          {/* Pending Wire Drag Line */}
          {draggingWire && (
            <g className="pointer-events-none">
              <path
                d={`M ${draggingWire.fromX} ${draggingWire.fromY} L ${draggingWire.currentX} ${draggingWire.currentY}`}
                fill="none"
                stroke="var(--color-brand)"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                className="animate-signal-flow"
              />
              {/* Origin pin marker */}
              <circle cx={draggingWire.fromX} cy={draggingWire.fromY} r={5} fill="var(--color-brand)" />
              {/* Current cursor / target pin marker */}
              <circle cx={draggingWire.currentX} cy={draggingWire.currentY} r={6} fill="var(--color-brand)" opacity={0.8} />
            </g>
          )}

          {/* Magnetic Pin Snap Ring indicator */}
          {hoveredTargetPin && (
            <g transform={`translate(${hoveredTargetPin.x}, ${hoveredTargetPin.y})`} className="pointer-events-none">
              <circle r={12} fill="none" stroke="var(--signal-high)" strokeWidth={2.5} className="animate-pulse" />
              <rect x={14} y={-10} width={90} height={20} rx={4} fill="var(--bg-surface)" stroke="var(--border-color)" strokeWidth={1} />
              <text x={18} y={4} className="text-[10px] font-mono-code font-bold fill-[var(--signal-high)]">
                Conectar a {hoveredTargetPin.pinName}
              </text>
            </g>
          )}

          {/* Component Nodes Layer */}
          {components.map((comp) => (
            <g
              key={comp.id}
              onMouseDown={(e) => handleComponentMouseDown(comp.id, e)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (comp.type === 'CUSTOM_SUBCIRCUIT' && comp.subcircuitId) {
                  openSubcircuit(comp.id);
                  showToast('info', `Diseño interno de ${comp.label || 'Subcircuito'}`);
                }
              }}
              className={comp.type === 'CUSTOM_SUBCIRCUIT' ? 'cursor-pointer' : 'cursor-move'}
            >
              <GateSymbol
                component={comp}
                isSelected={selectedComponentIds.includes(comp.id)}
                hoveredPinId={hoveredTargetPin?.compId === comp.id ? hoveredTargetPin.pinId : null}
                onPinMouseDown={handlePinMouseDown}
                onPinMouseUp={handlePinMouseUp}
                onToggleSwitch={toggleSwitch}
                onPressButton={pressButton}
              />
            </g>
          ))}

          {/* Fan-Out Electrical Solder Junction Dots (•) */}
          {fanoutJunctions.map((j, idx) => (
            <circle
              key={`fanout-${idx}`}
              cx={j.x}
              cy={j.y}
              r={5}
              fill={j.val === 1 ? 'var(--signal-high)' : j.val === 0 ? 'var(--signal-low)' : 'var(--color-warn)'}
              stroke="var(--bg-surface)"
              strokeWidth={1.5}
              className="pointer-events-none filter drop-shadow-xs"
            />
          ))}

          {/* Marquee Selection Rectangle */}
          {marquee && (
            <rect
              x={Math.min(marquee.startX, marquee.currentX)}
              y={Math.min(marquee.startY, marquee.currentY)}
              width={Math.abs(marquee.currentX - marquee.startX)}
              height={Math.abs(marquee.currentY - marquee.startY)}
              fill="rgba(59, 130, 246, 0.12)"
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              className="pointer-events-none"
            />
          )}
        </g>
      </svg>

      {/* Hierarchical Breadcrumbs Bar (when inside a subcircuit) */}
      <HierarchyBreadcrumbs />

      {/* Floating Action Bar: Subcircuit Open & Create */}
      {!isInsideSubcircuit && (
        <div
          className="absolute top-14 left-4 z-30 flex flex-wrap items-center gap-2 pointer-events-auto select-none"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {selectedComponentIds.length === 1 && (() => {
            const selComp = components.find((c) => c.id === selectedComponentIds[0]);
            if (selComp?.type === 'CUSTOM_SUBCIRCUIT' && selComp.subcircuitId) {
              return (
                <div className="flex items-center gap-2 bg-slate-900/95 border border-cyan-500/50 rounded-xl px-3.5 py-1.5 shadow-2xl backdrop-blur-md animate-fade-in">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-xs text-cyan-200 font-mono font-bold">
                    {selComp.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      openSubcircuit(selComp.id);
                      showToast('info', `Diseño interno de ${selComp.label || 'Subcircuito'}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-md transition-all border border-cyan-400/40 cursor-pointer"
                    title="Abre el lienzo gráfico para ver y editar las compuertas y cables internos"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Ver / Editar Diseño Interno</span>
                  </button>
                </div>
              );
            }
            return null;
          })()}

          {selectedComponentIds.length >= 1 && (
            <div className="flex items-center gap-2 bg-slate-900/95 border border-cyan-500/50 rounded-xl px-3 py-1.5 shadow-2xl backdrop-blur-md animate-fade-in">
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>
                  {selectedComponentIds.length} {selectedComponentIds.length === 1 ? 'componente' : 'componentes'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateSubcircuitOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all border border-cyan-400/40 cursor-pointer"
                title="Crear un bloque subcircuito modular a partir de la selección"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Crear subcircuito</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Subcircuit Modal */}
      <CreateSubcircuitModal
        isOpen={isCreateSubcircuitOpen}
        onClose={() => setIsCreateSubcircuitOpen(false)}
        selectedComponents={components.filter((c) => selectedComponentIds.includes(c.id))}
        connections={connections}
      />

      {/* Canvas Viewport HUD (Zoom & Snap indicator with touch controls) */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 sm:gap-2 bg-[var(--bg-surface)] p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-[var(--border-color)] shadow-md text-xs font-mono-code text-[var(--text-secondary)]">
        <div className="flex items-center gap-1 border-r border-[var(--border-color)] pr-2 mr-1 pointer-events-auto">
          <button
            onClick={handleZoomOut}
            title="Alejar Zoom"
            className="p-1 rounded hover:bg-[var(--bg-surface-sub)] hover:text-blue-500 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            title="Restablecer Vista (100%)"
            className="px-1.5 py-0.5 rounded text-[11px] font-bold hover:bg-[var(--bg-surface-sub)] hover:text-blue-500 transition-colors"
          >
            {Math.round(viewTransform.zoom * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            title="Acercar Zoom"
            className="p-1 rounded hover:bg-[var(--bg-surface-sub)] hover:text-blue-500 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span>Grid: {snapToGrid ? '20px' : 'Libre'}</span>
          <span>•</span>
          <span>Comps: {components.length}</span>
          <span>•</span>
          <span>Cables: {connections.length}</span>
        </div>
      </div>

      {/* Floating Quick Action Badge when a Wire is Selected */}
      {selectedWireId && !wireDragState && (() => {
        const selWire = connections.find((w) => w.id === selectedWireId);
        if (!selWire) return null;
        const hasCustomRoute = !!(selWire.waypoints && selWire.waypoints.length > 0);
        return (
          <div
            className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-slate-900/95 border border-blue-500/50 rounded-xl px-3 py-1.5 shadow-2xl backdrop-blur-md animate-fade-in text-xs text-slate-200 select-none pointer-events-auto"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700/80">
              <GitBranch className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-blue-300">Cable</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                {hasCustomRoute ? `${selWire.waypoints!.length} giros` : 'Auto'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const start = getPinPos(selWire.fromComponentId, selWire.fromPinId, true);
                const end = getPinPos(selWire.toComponentId, selWire.toPinId, false);
                const full = getFullWireVertices(start.x, start.y, end.x, end.y, selWire.waypoints, obstacles);
                const segs = extractWireSegments(full);
                const midSeg = segs[Math.floor(segs.length / 2)];
                if (midSeg) {
                  handleAddTurnPoint(selWire.id, { x: midSeg.midX, y: midSeg.midY });
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Agrega un punto de giro en el centro del cable"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Agregar giro</span>
            </button>

            {hasCustomRoute && (
              <button
                type="button"
                onClick={() => {
                  resetWireRoute(selWire.id);
                  showToast('info', 'Ruta automática ortogonal restablecida');
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Eliminar puntos de giro manuales y volver al enrutamiento automático"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Ruta auto</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                removeConnection(selWire.id);
                showToast('info', 'Cable eliminado');
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-rose-100 rounded-lg transition-colors cursor-pointer border border-rose-800/40"
              title="Eliminar este cable (Tecla Supr / Backspace)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar</span>
            </button>
          </div>
        );
      })()}

      {/* Right-Click Context Menu for Wires */}
      {wireContextMenu && (
        <div
          style={{ left: wireContextMenu.screenX, top: wireContextMenu.screenY }}
          className="fixed z-50 min-w-[210px] bg-slate-900/95 border border-slate-700 rounded-xl p-1.5 shadow-2xl backdrop-blur-md text-xs font-sans text-slate-200 animate-in fade-in zoom-in-95 duration-100 select-none"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1 text-[11px] font-mono text-slate-400 border-b border-slate-800 mb-1 flex items-center justify-between">
            <span>Opciones de cable</span>
            <span className="text-[10px] text-blue-400 font-mono">90° Ortogonal</span>
          </div>

          <button
            type="button"
            onClick={() => {
              handleAddTurnPoint(wireContextMenu.wireId, {
                x: wireContextMenu.worldX,
                y: wireContextMenu.worldY,
              });
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-blue-600/30 hover:text-blue-200 rounded-lg transition-colors text-left cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Agregar punto de giro aquí</span>
          </button>

          {wireContextMenu.waypointIndex !== undefined && (
            <button
              type="button"
              onClick={() => {
                handleRemoveTurnPoint(wireContextMenu.wireId, wireContextMenu.waypointIndex!);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-amber-600/30 hover:text-amber-200 rounded-lg transition-colors text-left cursor-pointer"
            >
              <CornerUpRight className="w-3.5 h-3.5 text-amber-400" />
              <span>Eliminar este punto de giro</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              resetWireRoute(wireContextMenu.wireId);
              showToast('info', 'Ruta automática ortogonal restablecida');
              setWireContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors text-left cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            <span>Restablecer ruta automática</span>
          </button>

          <div className="my-1 border-t border-slate-800" />

          <button
            type="button"
            onClick={() => {
              removeConnection(wireContextMenu.wireId);
              showToast('info', 'Cable eliminado');
              setWireContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-rose-600/30 text-rose-300 hover:text-rose-100 rounded-lg transition-colors text-left cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Eliminar cable (Supr)</span>
          </button>
        </div>
      )}
    </div>
  );
};
