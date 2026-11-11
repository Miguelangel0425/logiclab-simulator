/**
 * LogicLab - Tests for Orthogonal Wire Rerouting, Segment Manipulation & Turn Points
 */

import { describe, it, expect } from 'vitest';
import {
  computeDefaultOrthogonalWaypoints,
  getFullWireVertices,
  simplifyOrthogonalVertices,
  extractWireSegments,
  moveWireSegmentOrthogonally,
  moveWaypointOrthogonally,
  addTurnPointToWire,
  removeTurnPointFromWire,
  generateOrthogonalSvgPath,
  Point,
} from '../engines/circuit/wireRouting';
import { CircuitSimulator } from '../engines/circuit/simulator';
import { CircuitComponent, WireConnection } from '../types';

describe('Orthogonal Wire Routing Engine', () => {
  it('generates standard Manhattan 90° waypoints for forward flow', () => {
    const startX = 100;
    const startY = 100;
    const endX = 300;
    const endY = 200;

    const waypoints = computeDefaultOrthogonalWaypoints(startX, startY, endX, endY);
    expect(waypoints.length).toBe(2);
    // Middle vertical segment x
    expect(waypoints[0].x).toBe(waypoints[1].x);
    expect(waypoints[0].y).toBe(startY);
    expect(waypoints[1].y).toBe(endY);

    const full = getFullWireVertices(startX, startY, endX, endY);
    expect(full.length).toBe(4);
    expect(full[0]).toEqual({ x: startX, y: startY });
    expect(full[3]).toEqual({ x: endX, y: endY });
  });

  it('generates loopback waypoints when source is to the right of destination', () => {
    const startX = 400;
    const startY = 100;
    const endX = 100;
    const endY = 100;

    const waypoints = computeDefaultOrthogonalWaypoints(startX, startY, endX, endY);
    expect(waypoints.length).toBeGreaterThanOrEqual(2);
    // Should route around with stubs
    expect(waypoints[0].x).toBeGreaterThan(startX);
  });

  it('extracts horizontal and vertical segments correctly', () => {
    const vertices: Point[] = [
      { x: 50, y: 100 },
      { x: 150, y: 100 }, // horizontal
      { x: 150, y: 250 }, // vertical
      { x: 300, y: 250 }, // horizontal
    ];

    const segs = extractWireSegments(vertices);
    expect(segs.length).toBe(3);
    expect(segs[0].isHorizontal).toBe(true);
    expect(segs[1].isHorizontal).toBe(false);
    expect(segs[2].isHorizontal).toBe(true);
    expect(segs[1].midX).toBe(150);
    expect(segs[1].midY).toBe(175);
  });

  it('moves an interior vertical segment along the X axis without disconnecting endpoints', () => {
    const initialVertices: Point[] = [
      { x: 50, y: 100 },
      { x: 150, y: 100 },
      { x: 150, y: 250 },
      { x: 300, y: 250 },
    ];

    // Drag vertical segment (index 1) from x=150 to x=200
    const newVertices = moveWireSegmentOrthogonally(initialVertices, 1, 200, 10);

    // Endpoints must stay anchored
    expect(newVertices[0]).toEqual({ x: 50, y: 100 });
    expect(newVertices[newVertices.length - 1]).toEqual({ x: 300, y: 250 });

    // The vertical line moved to 200
    expect(newVertices[1].x).toBe(200);
    expect(newVertices[2].x).toBe(200);
    expect(newVertices[1].y).toBe(100);
    expect(newVertices[2].y).toBe(250);
  });

  it('moves an interior horizontal segment along the Y axis cleanly', () => {
    const initialVertices: Point[] = [
      { x: 100, y: 50 },
      { x: 100, y: 150 },
      { x: 250, y: 150 },
      { x: 250, y: 300 },
    ];

    // Drag horizontal segment (index 1) from y=150 to y=180
    const newVertices = moveWireSegmentOrthogonally(initialVertices, 1, 180, 10);

    // Endpoints must stay anchored
    expect(newVertices[0]).toEqual({ x: 100, y: 50 });
    expect(newVertices[newVertices.length - 1]).toEqual({ x: 250, y: 300 });

    // The horizontal line moved to 180
    expect(newVertices[1].y).toBe(180);
    expect(newVertices[2].y).toBe(180);
    expect(newVertices[1].x).toBe(100);
    expect(newVertices[2].x).toBe(250);
  });

  it('adds turn points (waypoints) to create custom routing elbows', () => {
    const initialVertices: Point[] = [
      { x: 50, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
      { x: 350, y: 200 },
    ];

    const withTurn = addTurnPointToWire(initialVertices, { x: 100, y: 140 }, 10);
    expect(withTurn.length).toBeGreaterThan(initialVertices.length);
    // Endpoints still anchored
    expect(withTurn[0]).toEqual({ x: 50, y: 100 });
    expect(withTurn[withTurn.length - 1]).toEqual({ x: 350, y: 200 });
  });

  it('removes turn points cleanly and restores orthogonal continuity', () => {
    const verticesWithWaypoint: Point[] = [
      { x: 50, y: 100 },
      { x: 120, y: 100 }, // waypoint 0
      { x: 120, y: 160 }, // waypoint 1
      { x: 250, y: 160 }, // waypoint 2
      { x: 250, y: 200 }, // waypoint 3
      { x: 350, y: 200 },
    ];

    // Remove waypoint index 1
    const reduced = removeTurnPointFromWire(verticesWithWaypoint, 1);
    expect(reduced.length).toBeLessThan(verticesWithWaypoint.length);
    expect(reduced[0]).toEqual({ x: 50, y: 100 });
    expect(reduced[reduced.length - 1]).toEqual({ x: 350, y: 200 });
  });

  it('simplifies collinear points to maintain clean minimal schematics', () => {
    const redundantCollinear: Point[] = [
      { x: 100, y: 100 },
      { x: 150, y: 100 },
      { x: 200, y: 100 }, // collinear horizontal
      { x: 200, y: 180 },
      { x: 200, y: 240 }, // collinear vertical
      { x: 300, y: 240 },
    ];

    const simplified = simplifyOrthogonalVertices(redundantCollinear);
    expect(simplified.length).toBe(4);
    expect(simplified).toEqual([
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 240 },
      { x: 300, y: 240 },
    ]);
  });

  it('generates valid SVG path strings with arc fillets', () => {
    const vertices: Point[] = [
      { x: 50, y: 100 },
      { x: 150, y: 100 },
      { x: 150, y: 200 },
      { x: 250, y: 200 },
    ];

    const svg = generateOrthogonalSvgPath(vertices, 6);
    expect(svg.startsWith('M 50 100')).toBe(true);
    expect(svg.includes('Q')).toBe(true);
    expect(svg.endsWith('250 200')).toBe(true);
  });

  it('guarantees that modifying wire waypoints has zero impact on circuit simulation logic', () => {
    // Component A: SWITCH (value 1)
    const sw: CircuitComponent = {
      id: 'sw1',
      type: 'SWITCH',
      label: 'SW',
      x: 50,
      y: 100,
      width: 60,
      height: 40,
      inputs: [],
      outputs: [{ id: 'sw1_out', name: 'OUT', type: 'output', relX: 60, relY: 20, value: 1 }],
      state: { switchActive: true },
    };

    // Component B: NOT gate
    const notGate: CircuitComponent = {
      id: 'not1',
      type: 'NOT',
      label: 'NOT',
      x: 300,
      y: 100,
      width: 70,
      height: 50,
      inputs: [{ id: 'not1_in', name: 'IN', type: 'input', relX: 0, relY: 25, value: 0 }],
      outputs: [{ id: 'not1_out', name: 'OUT', type: 'output', relX: 70, relY: 25, value: 0 }],
    };

    // Wire 1: Default route without waypoints
    const wireStraight: WireConnection = {
      id: 'w1',
      fromComponentId: 'sw1',
      fromPinId: 'sw1_out',
      toComponentId: 'not1',
      toPinId: 'not1_in',
      value: 0,
    };

    const res1 = CircuitSimulator.step([sw, notGate], [wireStraight], false);
    const notOut1 = res1.components.find((c) => c.id === 'not1')?.outputs[0].value;
    expect(notOut1).toBe(0); // NOT 1 = 0

    // Wire 2: Heavily customized waypoints with zigzags
    const wireWithCustomWaypoints: WireConnection = {
      id: 'w1',
      fromComponentId: 'sw1',
      fromPinId: 'sw1_out',
      toComponentId: 'not1',
      toPinId: 'not1_in',
      value: 0,
      waypoints: [
        { x: 120, y: 100 },
        { x: 120, y: 40 },
        { x: 220, y: 40 },
        { x: 220, y: 125 },
      ],
    };

    const res2 = CircuitSimulator.step([sw, notGate], [wireWithCustomWaypoints], false);
    const notOut2 = res2.components.find((c) => c.id === 'not1')?.outputs[0].value;
    expect(notOut2).toBe(0); // Still 0, unaffected by geometry!
  });
});
