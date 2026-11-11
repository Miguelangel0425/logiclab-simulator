/**
 * LogicLab - Interactive Orthogonal Wire Routing, Segment Relocation & Waypoint Controls
 * Complies with ANSI/IEEE electrical schematic standards:
 * - Deterministic orthogonal (Manhattan) routes with 90° transitions
 * - Interactive segment dragging with dynamic cursor hints (ns-resize / ew-resize)
 * - Turn point (waypoint) handles with live dragging, double-click delete, and contextual actions
 * - T-Junction solder dots (•) on shared nets; clean non-connecting cross traces
 */

import React, { useMemo } from 'react';
import { LogicValue, WireConnection } from '../../types';
import {
  Point,
  getFullWireVertices,
  extractWireSegments,
  generateOrthogonalSvgPath,
  ObstacleBox,
} from '../../engines/circuit/wireRouting';

interface WireRouterProps {
  wire: WireConnection;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isSelected: boolean;
  onSelectWire: (id: string, e: React.MouseEvent) => void;
  onRemoveWire?: (id: string) => void;
  onStartSegmentDrag?: (wireId: string, segmentIndex: number, e: React.MouseEvent, vertices: Point[]) => void;
  onStartWaypointDrag?: (wireId: string, waypointIndex: number, e: React.MouseEvent, vertices: Point[]) => void;
  onContextMenu?: (wireId: string, e: React.MouseEvent, waypointIndex?: number) => void;
  onAddTurnPoint?: (wireId: string, pt: Point) => void;
  onRemoveTurnPoint?: (wireId: string, waypointIndex: number) => void;
  obstacles?: ObstacleBox[];
}

export const WireRouter: React.FC<WireRouterProps> = ({
  wire,
  startX,
  startY,
  endX,
  endY,
  isSelected,
  onSelectWire,
  onStartSegmentDrag,
  onStartWaypointDrag,
  onContextMenu,
  onAddTurnPoint,
  onRemoveTurnPoint,
  obstacles,
}) => {
  // Compute full orthogonal vertices including default or manual waypoints
  const vertices = useMemo(() => {
    return getFullWireVertices(startX, startY, endX, endY, wire.waypoints, obstacles);
  }, [startX, startY, endX, endY, wire.waypoints, obstacles]);

  // Generate smooth 90° corner arc SVG path
  const pathD = useMemo(() => {
    return generateOrthogonalSvgPath(vertices, 6);
  }, [vertices]);

  // Extract individual segments for interactive dragging
  const segments = useMemo(() => {
    return extractWireSegments(vertices);
  }, [vertices]);

  // Color according to digital logic level
  const getWireColor = (val: LogicValue) => {
    if (val === 1) return 'var(--signal-high)';
    if (val === 0) return 'var(--signal-low)';
    return 'var(--color-warn)';
  };

  const wireColor = getWireColor(wire.value);
  const isHigh = wire.value === 1;

  // Custom waypoints (excluding start and end)
  const waypointVertices = useMemo(() => {
    if (vertices.length <= 2) return [];
    return vertices.slice(1, -1);
  }, [vertices]);

  return (
    <g className="group/wire select-none">
      {/* 1. Base hit region for selecting the wire */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onSelectWire(wire.id, e);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelectWire(wire.id, e);
          onContextMenu?.(wire.id, e);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onAddTurnPoint?.(wire.id, { x: e.clientX, y: e.clientY });
        }}
      />

      {/* 2. Outer selection glow & focus halo */}
      {isSelected && (
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth={7}
          strokeOpacity={0.45}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none filter drop-shadow-sm"
        />
      )}

      {/* 3. Main conductive copper trace */}
      <path
        d={pathD}
        fill="none"
        stroke={isSelected ? 'var(--color-brand)' : wireColor}
        strokeWidth={isSelected ? 3.5 : 2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none transition-colors duration-150"
      />

      {/* 4. Animated logic signal propagation pulse when HIGH (1) */}
      {isHigh && (
        <path
          d={pathD}
          fill="none"
          stroke="var(--signal-high)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-signal-flow pointer-events-none"
        />
      )}

      {/* 5. T-Junction Solder Dot (•) on branched connections */}
      {wire.branchPoint && (
        <circle
          cx={wire.branchPoint.x}
          cy={wire.branchPoint.y}
          r={5}
          fill={wireColor}
          stroke="var(--bg-surface)"
          strokeWidth={1.5}
          className="pointer-events-none filter drop-shadow-xs"
        />
      )}

      {/* 6. Terminal pin connection dots */}
      <circle cx={startX} cy={startY} r={3.5} fill={wireColor} className="pointer-events-none" />
      <circle cx={endX} cy={endY} r={3.5} fill={wireColor} className="pointer-events-none" />

      {/* 7. INTERACTIVE CONTROLS (Only visible when wire is selected) */}
      {isSelected && (
        <g className="wire-manipulation-layer">
          {/* A. Segment Relocation Bars & Midpoint Handles */}
          {segments.map((seg) => {
            const cursorClass = seg.isHorizontal ? 'cursor-ns-resize' : 'cursor-ew-resize';
            return (
              <g key={`seg-${seg.index}`} className="group/seg">
                {/* Wide invisible drag line for this segment */}
                <line
                  x1={seg.x1}
                  y1={seg.y1}
                  x2={seg.x2}
                  y2={seg.y2}
                  stroke="transparent"
                  strokeWidth={14}
                  className={cursorClass}
                  onMouseDown={(e) => {
                    if (e.button === 0) {
                      e.stopPropagation();
                      onStartSegmentDrag?.(wire.id, seg.index, e, vertices);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onContextMenu?.(wire.id, e);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onAddTurnPoint?.(wire.id, { x: seg.midX, y: seg.midY });
                  }}
                />

                {/* Visible Midpoint Handle (Diamond / Pill Handle) if segment is long enough */}
                {seg.length >= 24 && (
                  <g
                    transform={`translate(${seg.midX}, ${seg.midY})`}
                    className={`${cursorClass} transition-transform duration-100 group-hover/seg:scale-125`}
                    onMouseDown={(e) => {
                      if (e.button === 0) {
                        e.stopPropagation();
                        onStartSegmentDrag?.(wire.id, seg.index, e, vertices);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onContextMenu?.(wire.id, e);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onAddTurnPoint?.(wire.id, { x: seg.midX, y: seg.midY });
                    }}
                  >
                    <rect
                      x={-5}
                      y={-5}
                      width={10}
                      height={10}
                      rx={2.5}
                      transform="rotate(45)"
                      fill="var(--bg-surface)"
                      stroke="var(--color-brand)"
                      strokeWidth={2}
                      className="filter drop-shadow-xs"
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* B. Waypoint / Turn Point Handles (Vertices) */}
          {waypointVertices.map((wp, wpIdx) => (
            <g
              key={`wp-${wpIdx}`}
              transform={`translate(${wp.x}, ${wp.y})`}
              className="cursor-grab active:cursor-grabbing group/wp"
              onMouseDown={(e) => {
                if (e.button === 0) {
                  e.stopPropagation();
                  onStartWaypointDrag?.(wire.id, wpIdx, e, vertices);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onRemoveTurnPoint?.(wire.id, wpIdx);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu?.(wire.id, e, wpIdx);
              }}
            >
              {/* Outer halo for easy grabbing */}
              <circle r={10} fill="transparent" />

              {/* Waypoint circle handle */}
              <circle
                r={5.5}
                fill="var(--bg-surface)"
                stroke="var(--color-brand)"
                strokeWidth={2.5}
                className="transition-all duration-100 group-hover/wp:scale-130 group-hover/wp:stroke-[var(--signal-high)] filter drop-shadow-sm"
              />
              <circle r={2} fill="var(--color-brand)" className="pointer-events-none" />
            </g>
          ))}
        </g>
      )}
    </g>
  );
};
