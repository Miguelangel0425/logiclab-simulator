/**
 * LogicLab - Advanced Orthogonal Wire Routing & Manual Wire Manipulation Engine
 * Handles:
 * - Deterministic Manhattan (orthogonal) routing with obstacle awareness
 * - Manual segment dragging (horizontal & vertical) preserving strict 90° continuity
 * - Turn points (waypoints/vertices) addition, dragging, and deletion
 * - Collinear vertex simplification and normalization
 * - Corner fillets (SVG path generation with smooth 90° arc transitions)
 */

export interface Point {
  x: number;
  y: number;
}

export interface WireSegment {
  index: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isHorizontal: boolean;
  midX: number;
  midY: number;
  length: number;
}

export interface ObstacleBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Normalizes coordinate to a grid (e.g. 10px or 20px)
 */
export function snapCoord(val: number, gridSize = 10): number {
  if (gridSize <= 1) return Math.round(val);
  return Math.round(val / gridSize) * gridSize;
}

/**
 * Calculates standard default Manhattan orthogonal waypoints when no manual waypoints exist.
 * Avoids direct diagonal cuts and stays orthogonal.
 */
export function computeDefaultOrthogonalWaypoints(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  obstacles?: ObstacleBox[]
): Point[] {
  // Pure forward horizontal or purely vertical line: direct connection
  if (startX < endX && Math.abs(startY - endY) < 2) {
    return [];
  }
  if (Math.abs(startX - endX) < 2) {
    return [];
  }

  const dy = endY - startY;

  if (startX < endX) {
    // Normal forward flow (left-to-right)
    let midX = Math.round(startX + Math.max(24, (endX - startX) / 2));
    midX = snapCoord(midX, 10);

    // Obstacle avoidance: if midX vertical trace cuts directly through an obstacle, adjust midX
    if (obstacles && obstacles.length > 0) {
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);

      for (const obs of obstacles) {
        const obsLeft = obs.x - 10;
        const obsRight = obs.x + obs.width + 10;
        const obsTop = obs.y - 10;
        const obsBottom = obs.y + obs.height + 10;

        // Check vertical segment intersection
        if (midX >= obsLeft && midX <= obsRight && !(maxY < obsTop || minY > obsBottom)) {
          // Nudge midX to clear obstacle
          if (Math.abs(startX - obsLeft) > Math.abs(endX - obsRight) && obsRight < endX) {
            midX = snapCoord(obsRight + 12, 10);
          } else if (obsLeft > startX) {
            midX = snapCoord(obsLeft - 12, 10);
          }
        }
      }
    }

    return [
      { x: midX, y: startY },
      { x: midX, y: endY },
    ];
  } else {
    // Loopback / backward routing (source is to the right of destination)
    const loopOffset = dy >= 0 ? -36 : 36;
    let loopY = startY + loopOffset;
    loopY = snapCoord(loopY, 10);

    const stubOutX = snapCoord(startX + 30, 10);
    const stubInX = snapCoord(endX - 30, 10);

    return [
      { x: stubOutX, y: startY },
      { x: stubOutX, y: loopY },
      { x: stubInX, y: loopY },
      { x: stubInX, y: endY },
    ];
  }
}

/**
 * Returns full ordered list of vertices [Start, ...waypoints, End]
 */
export function getFullWireVertices(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  customWaypoints?: Point[],
  obstacles?: ObstacleBox[]
): Point[] {
  const pStart: Point = { x: startX, y: startY };
  const pEnd: Point = { x: endX, y: endY };

  if (customWaypoints && customWaypoints.length > 0) {
    return [pStart, ...customWaypoints.map((p) => ({ x: p.x, y: p.y })), pEnd];
  }

  const defaultWps = computeDefaultOrthogonalWaypoints(startX, startY, endX, endY, obstacles);
  return [pStart, ...defaultWps, pEnd];
}

/**
 * Simplifies a sequence of orthogonal points by:
 * 1. Removing identical consecutive points
 * 2. Removing collinear intermediate points (3 points on same horizontal or vertical line become 2)
 */
export function simplifyOrthogonalVertices(vertices: Point[]): Point[] {
  if (vertices.length <= 2) return vertices.map((p) => ({ ...p }));

  // 1. Remove duplicate adjacent points
  const deduped: Point[] = [vertices[0]];
  for (let i = 1; i < vertices.length; i++) {
    const prev = deduped[deduped.length - 1];
    const curr = vertices[i];
    if (Math.abs(prev.x - curr.x) > 1 || Math.abs(prev.y - curr.y) > 1) {
      deduped.push({ x: curr.x, y: curr.y });
    }
  }

  if (deduped.length <= 2) return deduped;

  // 2. Remove collinear points
  const simplified: Point[] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = deduped[i];
    const next = deduped[i + 1];

    const isCollinearH = Math.abs(prev.y - curr.y) < 2 && Math.abs(curr.y - next.y) < 2;
    const isCollinearV = Math.abs(prev.x - curr.x) < 2 && Math.abs(curr.x - next.x) < 2;

    if (!isCollinearH && !isCollinearV) {
      simplified.push(curr);
    }
  }

  simplified.push(deduped[deduped.length - 1]);
  return simplified;
}

/**
 * Extracts line segments between consecutive vertices
 */
export function extractWireSegments(vertices: Point[]): WireSegment[] {
  const segments: WireSegment[] = [];
  for (let i = 0; i < vertices.length - 1; i++) {
    const p1 = vertices[i];
    const p2 = vertices[i + 1];
    const isH = Math.abs(p1.y - p2.y) <= Math.abs(p1.x - p2.x);
    segments.push({
      index: i,
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      isHorizontal: isH,
      midX: Math.round((p1.x + p2.x) / 2),
      midY: Math.round((p1.y + p2.y) / 2),
      length: Math.hypot(p2.x - p1.x, p2.y - p1.y),
    });
  }
  return segments;
}

/**
 * Relocates a segment orthogonally:
 * - If horizontal: adjusts Y position, modifying connected vertical segments
 * - If vertical: adjusts X position, modifying connected horizontal segments
 * - Keeps terminal pin attachments (index 0 and index last) locked to component pins
 * - Returns the updated full vertices array
 */
export function moveWireSegmentOrthogonally(
  vertices: Point[],
  segmentIndex: number,
  newCoord: number,
  gridSize = 10
): Point[] {
  const pts = vertices.map((p) => ({ ...p }));
  const numSegments = pts.length - 1;
  if (segmentIndex < 0 || segmentIndex >= numSegments) return pts;

  const p1 = pts[segmentIndex];
  const p2 = pts[segmentIndex + 1];
  const isH = Math.abs(p1.y - p2.y) <= Math.abs(p1.x - p2.x);
  const snapped = snapCoord(newCoord, gridSize);

  if (isH) {
    // Moving horizontal segment along Y axis
    if (segmentIndex === 0 && segmentIndex === numSegments - 1) {
      // Direct single segment from start to end: split into 3-step orthogonal U-turn or Z-step
      const midX = snapCoord((p1.x + p2.x) / 2, gridSize);
      return simplifyOrthogonalVertices([
        p1,
        { x: midX, y: p1.y },
        { x: midX, y: snapped },
        { x: p2.x, y: snapped },
        p2,
      ]);
    }

    if (segmentIndex === 0) {
      // First segment: keep p1 locked to pin, insert orthogonal stub then jog
      const stubX = snapCoord(p1.x + 24, gridSize);
      pts.splice(1, 0, { x: stubX, y: p1.y }, { x: stubX, y: snapped });
      pts[3].y = snapped;
      return simplifyOrthogonalVertices(pts);
    }

    if (segmentIndex === numSegments - 1) {
      // Last segment: keep p2 locked to pin, insert orthogonal jog before pin
      const stubX = snapCoord(p2.x - 24, gridSize);
      pts.splice(segmentIndex + 1, 0, { x: stubX, y: snapped }, { x: stubX, y: p2.y });
      pts[segmentIndex].y = snapped;
      return simplifyOrthogonalVertices(pts);
    }

    // Interior horizontal segment: shift both endpoints to new Y
    pts[segmentIndex].y = snapped;
    pts[segmentIndex + 1].y = snapped;
    return simplifyOrthogonalVertices(pts);
  } else {
    // Moving vertical segment along X axis
    if (segmentIndex === 0 && segmentIndex === numSegments - 1) {
      const midY = snapCoord((p1.y + p2.y) / 2, gridSize);
      return simplifyOrthogonalVertices([
        p1,
        { x: p1.x, y: midY },
        { x: snapped, y: midY },
        { x: snapped, y: p2.y },
        p2,
      ]);
    }

    if (segmentIndex === 0) {
      const stubY = snapCoord(p1.y + 24, gridSize);
      pts.splice(1, 0, { x: p1.x, y: stubY }, { x: snapped, y: stubY });
      pts[3].x = snapped;
      return simplifyOrthogonalVertices(pts);
    }

    if (segmentIndex === numSegments - 1) {
      const stubY = snapCoord(p2.y - 24, gridSize);
      pts.splice(segmentIndex + 1, 0, { x: snapped, y: stubY }, { x: p2.x, y: stubY });
      pts[segmentIndex].x = snapped;
      return simplifyOrthogonalVertices(pts);
    }

    // Interior vertical segment: shift both endpoints to new X
    pts[segmentIndex].x = snapped;
    pts[segmentIndex + 1].x = snapped;
    return simplifyOrthogonalVertices(pts);
  }
}

/**
 * Moves an explicit waypoint handle (vertex) orthogonally.
 * waypointIndex is 0-based in customWaypoints (corresponding to vertex index waypointIndex + 1).
 */
export function moveWaypointOrthogonally(
  vertices: Point[],
  waypointIndex: number,
  newX: number,
  newY: number,
  gridSize = 10
): Point[] {
  const pts = vertices.map((p) => ({ ...p }));
  const vIdx = waypointIndex + 1;
  if (vIdx <= 0 || vIdx >= pts.length - 1) return pts;

  const sx = snapCoord(newX, gridSize);
  const sy = snapCoord(newY, gridSize);

  const prev = pts[vIdx - 1];
  const next = pts[vIdx + 1];

  pts[vIdx].x = sx;
  pts[vIdx].y = sy;

  // Maintain orthogonal lines with neighbors
  const prevIsH = Math.abs(prev.y - pts[vIdx].y) <= Math.abs(prev.x - pts[vIdx].x);
  if (prevIsH) {
    prev.y = sy;
  } else {
    prev.x = sx;
  }

  const nextIsH = Math.abs(pts[vIdx].y - next.y) <= Math.abs(pts[vIdx].x - next.x);
  if (nextIsH) {
    next.y = sy;
  } else {
    next.x = sx;
  }

  return simplifyOrthogonalVertices(pts);
}

/**
 * Adds a new orthogonal turn point / jog into a wire at the specified point or segment
 */
export function addTurnPointToWire(
  vertices: Point[],
  targetPoint: Point,
  gridSize = 10
): Point[] {
  const sx = snapCoord(targetPoint.x, gridSize);
  const sy = snapCoord(targetPoint.y, gridSize);
  const pts = vertices.map((p) => ({ ...p }));

  // Find the closest segment to targetPoint
  let closestSegIdx = 0;
  let minDistance = Infinity;

  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    // Distance from point to line segment
    const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
    let dist = 0;
    if (l2 === 0) {
      dist = Math.hypot(sx - p1.x, sy - p1.y);
    } else {
      let t = ((sx - p1.x) * (p2.x - p1.x) + (sy - p1.y) * (p2.y - p1.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      const projX = p1.x + t * (p2.x - p1.x);
      const projY = p1.y + t * (p2.y - p1.y);
      dist = Math.hypot(sx - projX, sy - projY);
    }

    if (dist < minDistance) {
      minDistance = dist;
      closestSegIdx = i;
    }
  }

  const pA = pts[closestSegIdx];
  const pB = pts[closestSegIdx + 1];
  const isH = Math.abs(pA.y - pB.y) <= Math.abs(pA.x - pB.x);

  if (isH) {
    // Horizontal segment: insert a 2-point step (jog) through (sx, sy)
    const jog: Point[] = [
      { x: sx, y: pA.y },
      { x: sx, y: sy !== pA.y ? sy : pA.y + 20 },
    ];
    pts.splice(closestSegIdx + 1, 0, ...jog);
  } else {
    // Vertical segment: insert step through (sx, sy)
    const jog: Point[] = [
      { x: pA.x, y: sy },
      { x: sx !== pA.x ? sx : pA.x + 20, y: sy },
    ];
    pts.splice(closestSegIdx + 1, 0, ...jog);
  }

  return simplifyOrthogonalVertices(pts);
}

/**
 * Removes an existing waypoint and preserves continuity
 */
export function removeTurnPointFromWire(vertices: Point[], waypointIndex: number): Point[] {
  const pts = vertices.map((p) => ({ ...p }));
  const vIdx = waypointIndex + 1;
  if (vIdx <= 0 || vIdx >= pts.length - 1) return pts;

  // Remove vertex
  pts.splice(vIdx, 1);

  // If intermediate connection is non-orthogonal, insert single corner step
  if (pts.length >= 2) {
    const prev = pts[Math.max(0, vIdx - 1)];
    const next = pts[Math.min(pts.length - 1, vIdx)];
    if (Math.abs(prev.x - next.x) > 2 && Math.abs(prev.y - next.y) > 2) {
      pts.splice(vIdx, 0, { x: next.x, y: prev.y });
    }
  }

  return simplifyOrthogonalVertices(pts);
}

/**
 * Generates an SVG path string from orthogonal vertices with optional rounded corners.
 */
export function generateOrthogonalSvgPath(vertices: Point[], cornerRadius = 6): string {
  if (vertices.length === 0) return '';
  if (vertices.length === 1) return `M ${vertices[0].x} ${vertices[0].y}`;
  if (vertices.length === 2 || cornerRadius <= 0) {
    let d = `M ${vertices[0].x} ${vertices[0].y}`;
    for (let i = 1; i < vertices.length; i++) {
      d += ` L ${vertices[i].x} ${vertices[i].y}`;
    }
    return d;
  }

  let d = `M ${vertices[0].x} ${vertices[0].y}`;

  for (let i = 1; i < vertices.length - 1; i++) {
    const prev = vertices[i - 1];
    const curr = vertices[i];
    const next = vertices[i + 1];

    const d1x = curr.x - prev.x;
    const d1y = curr.y - prev.y;
    const len1 = Math.hypot(d1x, d1y);

    const d2x = next.x - curr.x;
    const d2y = next.y - curr.y;
    const len2 = Math.hypot(d2x, d2y);

    const r = Math.min(cornerRadius, len1 / 2, len2 / 2);

    if (r < 2 || len1 < 2 || len2 < 2) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    // Point before corner
    const startX = curr.x - (d1x / len1) * r;
    const startY = curr.y - (d1y / len1) * r;

    // Point after corner
    const endX = curr.x + (d2x / len2) * r;
    const endY = curr.y + (d2y / len2) * r;

    d += ` L ${startX} ${startY} Q ${curr.x} ${curr.y} ${endX} ${endY}`;
  }

  const last = vertices[vertices.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}
