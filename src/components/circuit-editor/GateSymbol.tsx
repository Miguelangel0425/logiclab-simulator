/**
 * LogicLab - ANSI/IEEE Standard Gate Symbols & Compound IC Components
 * High-precision vector graphics with active signal coloring and pin terminals
 * Fully integrated with semantic theme tokens (Light / Dark)
 */

import React from 'react';
import { CircuitComponent, LogicValue } from '../../types';

interface GateSymbolProps {
  component: CircuitComponent;
  isSelected: boolean;
  hoveredPinId?: string | null;
  onPinMouseDown: (pinId: string, isOutput: boolean, pinX: number, pinY: number, e: React.MouseEvent) => void;
  onPinMouseUp: (pinId: string, isOutput: boolean, e: React.MouseEvent) => void;
  onToggleSwitch?: (id: string) => void;
  onPressButton?: (id: string, pressed: boolean) => void;
}

export const GateSymbol: React.FC<GateSymbolProps> = ({
  component,
  isSelected,
  hoveredPinId,
  onPinMouseDown,
  onPinMouseUp,
  onToggleSwitch,
  onPressButton,
}) => {
  const { type, width, height, inputs, outputs, label, state } = component;

  // Signal color helper from semantic variables
  const getSignalColor = (val: LogicValue) => {
    if (val === 1) return 'var(--signal-high)';
    if (val === 0) return 'var(--signal-low)';
    return 'var(--color-warn)'; // X / contention
  };

  const renderPin = (pin: any, isOutput: boolean) => {
    const pinColor = getSignalColor(pin.value);
    const absX = pin.relX;
    const absY = pin.relY;
    const isHoveredTarget = hoveredPinId === pin.id;

    return (
      <g
        key={pin.id}
        className="cursor-crosshair group/pin"
        onMouseDown={(e) => {
          e.stopPropagation();
          onPinMouseDown(pin.id, isOutput, component.x + absX, component.y + absY, e);
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          onPinMouseUp(pin.id, isOutput, e);
        }}
      >
        {/* Invisible larger hit target (24px diameter) */}
        <circle cx={absX} cy={absY} r={12} fill="transparent" />

        {/* Snap Target Glow indicator */}
        {isHoveredTarget && (
          <circle
            cx={absX}
            cy={absY}
            r={9}
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth={2}
            className="animate-pulse"
          />
        )}

        {/* Pin Terminal Circle */}
        <circle
          cx={absX}
          cy={absY}
          r={isHoveredTarget ? 6 : 4}
          fill={pinColor}
          stroke="var(--bg-surface)"
          strokeWidth={1.5}
          className="transition-all duration-150 group-hover/pin:scale-150 group-hover/pin:stroke-blue-400"
        />

        {/* Value tooltip on hover */}
        <text
          x={isOutput ? absX - 8 : absX + 8}
          y={absY + 3}
          textAnchor={isOutput ? 'end' : 'start'}
          className="text-[9px] font-mono-code font-bold fill-[var(--text-secondary)] pointer-events-none select-none"
        >
          {pin.name}
          {pin.value !== 'X' ? `:${pin.value}` : ''}
        </text>
      </g>
    );
  };

  const renderGateBody = () => {
    const midY = Math.round(height / 2);
    const top = 8;
    const bottom = height - 8;
    const arcR = Math.round((bottom - top) / 2);

    switch (type) {
      // AND Gate (Flat back, rounded front)
      case 'AND': {
        const outVal = outputs[0]?.value;
        const color = getSignalColor(outVal);
        const arcStartX = Math.max(25, width - 20 - arcR);
        return (
          <g>
            <path
              d={`M 15 ${top} L ${arcStartX} ${top} A ${arcR} ${arcR} 0 0 1 ${arcStartX} ${bottom} L 15 ${bottom} Z`}
              fill="var(--component-body)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            {/* Dynamic lead lines to pin terminals */}
            {inputs.map((pin) => (
              <line
                key={pin.id}
                x1={0}
                y1={pin.relY}
                x2={15}
                y2={pin.relY}
                stroke="var(--component-stroke)"
                strokeWidth={2}
              />
            ))}
            <line
              x1={arcStartX + arcR}
              y1={outputs[0]?.relY || midY}
              x2={width}
              y2={outputs[0]?.relY || midY}
              stroke={color}
              strokeWidth={2}
            />
            <text x={Math.round((15 + arcStartX + arcR) / 2) - 4} y={midY + 4} textAnchor="middle" className="text-[12px] font-bold fill-[var(--text-primary)] opacity-85">
              &
            </text>
          </g>
        );
      }

      // NAND Gate (AND + Bubble)
      case 'NAND': {
        const outVal = outputs[0]?.value;
        const color = getSignalColor(outVal);
        const arcStartX = Math.max(25, width - 28 - arcR);
        const bubbleX = arcStartX + arcR + 5;
        return (
          <g>
            <path
              d={`M 15 ${top} L ${arcStartX} ${top} A ${arcR} ${arcR} 0 0 1 ${arcStartX} ${bottom} L 15 ${bottom} Z`}
              fill="var(--component-body)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            {/* Inversion Bubble */}
            <circle cx={bubbleX} cy={midY} r={4.5} fill="var(--bg-surface)" stroke="var(--component-stroke)" strokeWidth={2} />
            {inputs.map((pin) => (
              <line
                key={pin.id}
                x1={0}
                y1={pin.relY}
                x2={15}
                y2={pin.relY}
                stroke="var(--component-stroke)"
                strokeWidth={2}
              />
            ))}
            <line
              x1={bubbleX + 4.5}
              y1={outputs[0]?.relY || midY}
              x2={width}
              y2={outputs[0]?.relY || midY}
              stroke={color}
              strokeWidth={2}
            />
            <text x={Math.round((15 + arcStartX + arcR) / 2) - 6} y={midY + 4} textAnchor="middle" className="text-[12px] font-bold fill-[var(--text-primary)] opacity-85">
              &
            </text>
          </g>
        );
      }

      // OR Gate (Curved back, pointed front)
      case 'OR': {
        const outVal = outputs[0]?.value;
        const color = getSignalColor(outVal);
        const noseX = width - 20;
        return (
          <g>
            <path
              d={`M 15 ${top} Q 30 ${midY} 15 ${bottom} Q ${width - 35} ${bottom} ${noseX} ${midY} Q ${width - 35} ${top} 15 ${top} Z`}
              fill="var(--component-body)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            {inputs.map((pin) => (
              <line
                key={pin.id}
                x1={0}
                y1={pin.relY}
                x2={22}
                y2={pin.relY}
                stroke="var(--component-stroke)"
                strokeWidth={2}
              />
            ))}
            <line
              x1={noseX}
              y1={outputs[0]?.relY || midY}
              x2={width}
              y2={outputs[0]?.relY || midY}
              stroke={color}
              strokeWidth={2}
            />
            <text x={42} y={midY + 4} textAnchor="middle" className="text-[11px] font-bold fill-[var(--text-primary)] opacity-85">
              ≥1
            </text>
          </g>
        );
      }

      // NOR Gate (OR + Bubble)
      case 'NOR': {
        const outVal = outputs[0]?.value;
        const color = getSignalColor(outVal);
        const noseX = width - 26;
        const bubbleX = noseX + 5;
        return (
          <g>
            <path
              d={`M 15 ${top} Q 30 ${midY} 15 ${bottom} Q ${width - 40} ${bottom} ${noseX} ${midY} Q ${width - 40} ${top} 15 ${top} Z`}
              fill="var(--component-body)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            <circle cx={bubbleX} cy={midY} r={4.5} fill="var(--bg-surface)" stroke="var(--component-stroke)" strokeWidth={2} />
            {inputs.map((pin) => (
              <line
                key={pin.id}
                x1={0}
                y1={pin.relY}
                x2={22}
                y2={pin.relY}
                stroke="var(--component-stroke)"
                strokeWidth={2}
              />
            ))}
            <line
              x1={bubbleX + 4.5}
              y1={outputs[0]?.relY || midY}
              x2={width}
              y2={outputs[0]?.relY || midY}
              stroke={color}
              strokeWidth={2}
            />
            <text x={40} y={midY + 4} textAnchor="middle" className="text-[11px] font-bold fill-[var(--text-primary)] opacity-85">
              ≥1
            </text>
          </g>
        );
      }

      // XOR Gate (Double curved back, pointed front)
      case 'XOR': {
        const outVal = outputs[0]?.value;
        const color = getSignalColor(outVal);
        const noseX = width - 20;
        return (
          <g>
            <path d={`M 8 ${top} Q 23 ${midY} 8 ${bottom}`} fill="none" stroke="var(--component-stroke)" strokeWidth={2} />
            <path
              d={`M 17 ${top} Q 32 ${midY} 17 ${bottom} Q ${width - 35} ${bottom} ${noseX} ${midY} Q ${width - 35} ${top} 17 ${top} Z`}
              fill="var(--component-body)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            {inputs.map((pin) => (
              <line
                key={pin.id}
                x1={0}
                y1={pin.relY}
                x2={17}
                y2={pin.relY}
                stroke="var(--component-stroke)"
                strokeWidth={2}
              />
            ))}
            <line
              x1={noseX}
              y1={outputs[0]?.relY || midY}
              x2={width}
              y2={outputs[0]?.relY || midY}
              stroke={color}
              strokeWidth={2}
            />
            <text x={44} y={midY + 4} textAnchor="middle" className="text-[11px] font-bold fill-[var(--text-primary)] opacity-85">
              =1
            </text>
          </g>
        );
      }

      // XNOR Gate
      case 'XNOR': {
        const outVal = outputs[0]?.value;
        const color = getSignalColor(outVal);
        const noseX = width - 26;
        const bubbleX = noseX + 5;
        return (
          <g>
            <path d={`M 8 ${top} Q 23 ${midY} 8 ${bottom}`} fill="none" stroke="var(--component-stroke)" strokeWidth={2} />
            <path
              d={`M 17 ${top} Q 32 ${midY} 17 ${bottom} Q ${width - 40} ${bottom} ${noseX} ${midY} Q ${width - 40} ${top} 17 ${top} Z`}
              fill="var(--component-body)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            <circle cx={bubbleX} cy={midY} r={4.5} fill="var(--bg-surface)" stroke="var(--component-stroke)" strokeWidth={2} />
            {inputs.map((pin) => (
              <line
                key={pin.id}
                x1={0}
                y1={pin.relY}
                x2={17}
                y2={pin.relY}
                stroke="var(--component-stroke)"
                strokeWidth={2}
              />
            ))}
            <line
              x1={bubbleX + 4.5}
              y1={outputs[0]?.relY || midY}
              x2={width}
              y2={outputs[0]?.relY || midY}
              stroke={color}
              strokeWidth={2}
            />
            <text x={44} y={midY + 4} textAnchor="middle" className="text-[11px] font-bold fill-[var(--text-primary)] opacity-85">
              =1
            </text>
          </g>
        );
      }

      // NOT Inverter (Triangle + bubble, supports vertical downward orientation)
      case 'NOT': {
        const outVal = outputs[0]?.value;
        const color = getSignalColor(outVal);
        if (component.orientation === 'down') {
          return (
            <g>
              <polygon
                points={`10,18 40,18 25,58`}
                fill="var(--component-body)"
                stroke="var(--component-stroke)"
                strokeWidth={2}
              />
              <circle cx={25} cy={64} r={4.5} fill="var(--bg-surface)" stroke="var(--component-stroke)" strokeWidth={2} />
              <line x1={25} y1={0} x2={25} y2={18} stroke="var(--component-stroke)" strokeWidth={2} />
              <line x1={25} y1={68.5} x2={25} y2={height} stroke={color} strokeWidth={2} />
              <text x={25} y={34} textAnchor="middle" className="text-[11px] font-bold fill-[var(--text-primary)] opacity-85">
                1
              </text>
            </g>
          );
        }
        return (
          <g>
            <polygon
              points={`20,12 20,58 68,35`}
              fill="var(--component-body)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            <circle cx={74} cy={35} r={5} fill="var(--bg-surface)" stroke="var(--component-stroke)" strokeWidth={2} />
            <line x1={0} y1={35} x2={20} y2={35} stroke="var(--component-stroke)" strokeWidth={2} />
            <line x1={79} y1={35} x2={width} y2={35} stroke={color} strokeWidth={2} />
            <text x={38} y={38} textAnchor="middle" className="text-[12px] font-bold fill-[var(--text-primary)] opacity-85">
              1
            </text>
          </g>
        );
      }

      // BUFFER
      case 'BUFFER': {
        const outVal = outputs[0]?.value;
        const color = getSignalColor(outVal);
        return (
          <g>
            <polygon
              points={`20,12 20,58 74,35`}
              fill="var(--component-body)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            <line x1={0} y1={35} x2={20} y2={35} stroke="var(--component-stroke)" strokeWidth={2} />
            <line x1={74} y1={35} x2={width} y2={35} stroke={color} strokeWidth={2} />
            <text x={40} y={38} textAnchor="middle" className="text-[12px] font-bold fill-[var(--text-primary)] opacity-85">
              1
            </text>
          </g>
        );
      }

      // Interactive Switch
      case 'SWITCH': {
        const isActive = !!state?.switchActive;
        return (
          <g
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSwitch?.(component.id);
            }}
          >
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={6}
              fill="var(--bg-surface)"
              stroke={isActive ? 'var(--signal-high)' : 'var(--border-color)'}
              strokeWidth={2}
            />
            {/* Switch slider track */}
            <rect
              x={14}
              y={15}
              width={40}
              height={20}
              rx={10}
              fill={isActive ? 'var(--signal-high)' : 'var(--bg-surface-hover)'}
              opacity={isActive ? 0.35 : 0.8}
            />
            {/* Slider thumb */}
            <circle
              cx={isActive ? 44 : 24}
              cy={25}
              r={8}
              fill={isActive ? 'var(--signal-high)' : 'var(--text-secondary)'}
              className="transition-all duration-150 drop-shadow-sm"
            />
            <text
              x={64}
              y={29}
              className={`text-xs font-mono-code font-bold ${isActive ? 'fill-[var(--signal-high)] font-extrabold' : 'fill-[var(--text-secondary)]'}`}
            >
              {isActive ? '1' : '0'}
            </text>
          </g>
        );
      }

      // LED Indicator
      case 'LED': {
        const isLit = inputs[0]?.value === 1;
        return (
          <g>
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={8}
              fill="var(--bg-surface)"
              stroke="var(--border-color)"
              strokeWidth={1.5}
            />
            {/* Glowing Lamp Dome */}
            <circle
              cx={35}
              cy={35}
              r={16}
              fill={isLit ? 'var(--signal-high)' : 'var(--signal-low)'}
              className={`transition-all duration-200 ${isLit ? 'led-glow-on' : 'led-glow-off'}`}
            />
            {/* Shiny highlight */}
            <ellipse cx={30} cy={29} rx={5} ry={3} fill="#FFFFFF" opacity={isLit ? 0.85 : 0.2} />
          </g>
        );
      }

      // 7-Segment Display with realistic beveled polygons and lead terminals
      case 'SEVEN_SEGMENT': {
        const isAnode = state?.displayMode === 'anode';
        let segLit: boolean[] = [false, false, false, false, false, false, false];
        if (state && Array.isArray((state as any).segLit)) {
          segLit = (state as any).segLit;
        } else if (inputs.length >= 7) {
          segLit = inputs.slice(0, 7).map((pin) => (isAnode ? pin.value === 0 : pin.value === 1));
        } else {
          const count = state?.count ?? 0;
          const segMap: Record<string, number[]> = {
            a: [1,0,1,1,0,1,1,1,1,1,1,0,1,0,1,1],
            b: [1,1,1,1,1,0,0,1,1,1,1,0,0,1,0,0],
            c: [1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,0],
            d: [1,0,1,1,0,1,1,0,1,1,0,1,1,1,1,0],
            e: [1,0,1,0,0,0,1,0,1,0,1,1,1,1,1,1],
            f: [1,0,0,0,1,1,1,0,1,1,1,1,1,0,1,1],
            g: [0,0,1,1,1,1,1,0,1,1,1,1,0,1,1,1],
          };
          if (count >= 0 && count <= 15) {
            segLit = ['a','b','c','d','e','f','g'].map((k) => segMap[k][count] === 1);
          }
        }

        const litColor = '#ef4444'; // Red LED
        const dimColor = 'rgba(239, 68, 68, 0.12)';
        const displayChar = (state as any)?.recognizedChar || (state?.count !== undefined && state.count >= 0 ? state.count.toString(16).toUpperCase() : '');

        return (
          <g>
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={8}
              fill="var(--bg-surface)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            {/* Beveled Display Screen */}
            <rect
              x={38}
              y={14}
              width={width - 46}
              height={height - 38}
              rx={6}
              fill="#120c0c"
              stroke="#261717"
              strokeWidth={1.5}
            />

            {/* Input Lead lines & Labels for a..g */}
            {inputs.map((pin) => (
              <g key={pin.id}>
                <line x1={0} y1={pin.relY} x2={38} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={8} y={pin.relY - 3} className="text-[9px] font-mono-code font-bold fill-[var(--text-secondary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* 7-Segment SVG Polygons (Slanted CAD geometry) */}
            <g transform="translate(64, 26) skewX(-4)">
              {/* Segment a (top) */}
              <polygon
                points="4,0 36,0 31,6 9,6"
                fill={segLit[0] ? litColor : dimColor}
                filter={segLit[0] ? 'drop-shadow(0px 0px 4px #ef4444)' : undefined}
              />
              {/* Segment b (top right) */}
              <polygon
                points="37,2 41,6 37,42 32,37 32,7"
                fill={segLit[1] ? litColor : dimColor}
                filter={segLit[1] ? 'drop-shadow(0px 0px 4px #ef4444)' : undefined}
              />
              {/* Segment c (bottom right) */}
              <polygon
                points="37,46 41,50 37,86 32,81 32,51"
                fill={segLit[2] ? litColor : dimColor}
                filter={segLit[2] ? 'drop-shadow(0px 0px 4px #ef4444)' : undefined}
              />
              {/* Segment d (bottom) */}
              <polygon
                points="9,82 31,82 36,88 4,88"
                fill={segLit[3] ? litColor : dimColor}
                filter={segLit[3] ? 'drop-shadow(0px 0px 4px #ef4444)' : undefined}
              />
              {/* Segment e (bottom left) */}
              <polygon
                points="8,46 8,81 3,86 -1,50 3,46"
                fill={segLit[4] ? litColor : dimColor}
                filter={segLit[4] ? 'drop-shadow(0px 0px 4px #ef4444)' : undefined}
              />
              {/* Segment f (top left) */}
              <polygon
                points="8,7 8,37 3,42 -1,6 3,2"
                fill={segLit[5] ? litColor : dimColor}
                filter={segLit[5] ? 'drop-shadow(0px 0px 4px #ef4444)' : undefined}
              />
              {/* Segment g (center) */}
              <polygon
                points="7,44 33,44 36,44 33,48 7,48 4,44"
                fill={segLit[6] ? litColor : dimColor}
                filter={segLit[6] ? 'drop-shadow(0px 0px 4px #ef4444)' : undefined}
              />
              {/* Decimal Point */}
              <circle cx={46} cy={85} r={3} fill={dimColor} />
            </g>

            {/* Recognized character or status readout at top */}
            {displayChar && (
              <text x={122} y={32} textAnchor="end" className="text-[13px] font-mono-code font-extrabold fill-[#ef4444]">
                {displayChar}
              </text>
            )}

            {/* Mode badge: Cátodo común / Ánodo común */}
            <text x={86} y={height - 12} textAnchor="middle" className="text-[8px] font-mono-code font-bold uppercase fill-[var(--text-secondary)]">
              {isAnode ? 'Ánodo Común' : 'Cátodo Común'}
            </text>
          </g>
        );
      }

      // Decodificador BCD a 7 Segmentos
      case 'BCD_TO_7SEG': {
        const isAnode = state?.displayMode === 'anode';
        const invMode = state?.invalidBcdMode || 'BLANK';
        const d = inputs[0]?.value;
        const c = inputs[1]?.value;
        const b = inputs[2]?.value;
        const a = inputs[3]?.value;
        let bcdVal = -1;
        if (d !== 'X' && c !== 'X' && b !== 'X' && a !== 'X') {
          bcdVal = ((d ? 8 : 0) + (c ? 4 : 0) + (b ? 2 : 0) + (a ? 1 : 0));
        }

        return (
          <g>
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={6}
              fill="var(--bg-surface)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            {/* Header banner */}
            <rect x={4} y={4} width={width - 8} height={20} rx={5} fill="var(--bg-surface-sub)" />
            <text x={width / 2} y={17} textAnchor="middle" className="text-[9px] font-bold uppercase tracking-wider fill-[var(--text-secondary)] pointer-events-none">
              DEC BCD → 7 SEG
            </text>

            {/* Input Leads & Labels */}
            {inputs.map((pin) => (
              <g key={pin.id}>
                <line x1={0} y1={pin.relY} x2={16} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={19} y={pin.relY + 3} className="text-[10px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* Output Leads & Labels */}
            {outputs.map((pin) => (
              <g key={pin.id}>
                <line x1={width - 16} y1={pin.relY} x2={width} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={width - 20} y={pin.relY + 3} textAnchor="end" className="text-[10px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* Center Status Box */}
            <rect x={36} y={35} width={68} height={52} rx={4} fill="var(--bg-surface-sub)" stroke="var(--border-color)" strokeWidth={1} />
            <text x={70} y={56} textAnchor="middle" className="text-[20px] font-mono-code font-extrabold fill-blue-500">
              {bcdVal >= 0 && bcdVal <= 9
                ? bcdVal
                : bcdVal > 9
                ? (invMode === 'HEX_LETTERS' ? bcdVal.toString(16).toUpperCase() : invMode === 'INVALID_DASH' ? '-' : 'BLANK')
                : '?'}
            </text>
            <text x={70} y={74} textAnchor="middle" className="text-[8px] font-mono-code font-bold uppercase fill-[var(--text-secondary)]">
              {isAnode ? 'Activo BAJO (0)' : 'Activo ALTO (1)'}
            </text>

            {/* Mode Indicators */}
            <text x={70} y={115} textAnchor="middle" className="text-[9px] font-bold fill-purple-500">
              {isAnode ? 'ÁNODO COMÚN' : 'CÁTODO COMÚN'}
            </text>
            <text x={70} y={135} textAnchor="middle" className="text-[8px] font-mono-code fill-[var(--text-secondary)]">
              {invMode === 'BLANK' ? 'Inv: Blanco' : invMode === 'INVALID_DASH' ? 'Inv: Guión' : 'Inv: Hex'}
            </text>
            <text x={70} y={155} textAnchor="middle" className="text-[8px] font-mono-code fill-[var(--text-secondary)]">
              {isAnode ? '7447' : '7448'}
            </text>
          </g>
        );
      }

      // Codificador Decimal a BCD
      case 'ENCODER_DECIMAL_TO_BCD': {
        return (
          <g>
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={6}
              fill="var(--bg-surface)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            <rect x={4} y={4} width={width - 8} height={18} rx={5} fill="var(--bg-surface-sub)" />
            <text x={width / 2} y={16} textAnchor="middle" className="text-[9px] font-bold uppercase tracking-wider fill-[var(--text-secondary)] pointer-events-none">
              DECIMAL → BCD (74147)
            </text>

            {/* Inputs D0..D9 */}
            {inputs.map((pin) => (
              <g key={pin.id}>
                <line x1={0} y1={pin.relY} x2={16} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={19} y={pin.relY + 3} className="text-[9px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* Outputs A, B, C, D, V */}
            {outputs.map((pin) => (
              <g key={pin.id}>
                <line x1={width - 16} y1={pin.relY} x2={width} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={width - 20} y={pin.relY + 3} textAnchor="end" className="text-[9px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            <text x={width / 2} y={height / 2 + 5} textAnchor="middle" className="text-[10px] font-bold fill-[var(--text-secondary)] pointer-events-none">
              PRIORIDAD D9 → D0
            </text>
          </g>
        );
      }

      // Codificador de Prioridad 4 a 2
      case 'PRIORITY_ENCODER_4TO2': {
        return (
          <g>
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={6}
              fill="var(--bg-surface)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            <rect x={4} y={4} width={width - 8} height={18} rx={5} fill="var(--bg-surface-sub)" />
            <text x={width / 2} y={16} textAnchor="middle" className="text-[9px] font-bold uppercase tracking-wider fill-[var(--text-secondary)] pointer-events-none">
              CODIF. PRIORIDAD 4:2
            </text>

            {/* Inputs I0..I3 */}
            {inputs.map((pin) => (
              <g key={pin.id}>
                <line x1={0} y1={pin.relY} x2={16} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={19} y={pin.relY + 3} className="text-[10px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* Outputs Y1, Y0, V */}
            {outputs.map((pin) => (
              <g key={pin.id}>
                <line x1={width - 16} y1={pin.relY} x2={width} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={width - 20} y={pin.relY + 3} textAnchor="end" className="text-[10px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            <text x={width / 2} y={height / 2 + 6} textAnchor="middle" className="text-[8px] font-mono-code font-bold fill-indigo-500">
              I3 &gt; I2 &gt; I1 &gt; I0
            </text>
          </g>
        );
      }

      // Codificador de Prioridad 8 a 3
      case 'PRIORITY_ENCODER_8TO3': {
        return (
          <g>
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={6}
              fill="var(--bg-surface)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            <rect x={4} y={4} width={width - 8} height={18} rx={5} fill="var(--bg-surface-sub)" />
            <text x={width / 2} y={16} textAnchor="middle" className="text-[9px] font-bold uppercase tracking-wider fill-[var(--text-secondary)] pointer-events-none">
              CODIF. PRIORIDAD 8:3
            </text>

            {/* Inputs I0..I7 */}
            {inputs.map((pin) => (
              <g key={pin.id}>
                <line x1={0} y1={pin.relY} x2={16} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={19} y={pin.relY + 3} className="text-[9px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* Outputs Y2, Y1, Y0, V */}
            {outputs.map((pin) => (
              <g key={pin.id}>
                <line x1={width - 16} y1={pin.relY} x2={width} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={width - 20} y={pin.relY + 3} textAnchor="end" className="text-[10px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            <text x={width / 2} y={height / 2 + 6} textAnchor="middle" className="text-[8px] font-mono-code font-bold fill-indigo-500">
              I7 &gt; ... &gt; I0 (74148)
            </text>
          </g>
        );
      }

      // Decodificador 3 a 8
      case 'DECODER_3TO8': {
        return (
          <g>
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={6}
              fill="var(--bg-surface)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            <rect x={4} y={4} width={width - 8} height={18} rx={5} fill="var(--bg-surface-sub)" />
            <text x={width / 2} y={16} textAnchor="middle" className="text-[9px] font-bold uppercase tracking-wider fill-[var(--text-secondary)] pointer-events-none">
              DECODIFICADOR 3:8 (74138)
            </text>

            {/* Inputs A0, A1, A2, EN */}
            {inputs.map((pin) => (
              <g key={pin.id}>
                <line x1={0} y1={pin.relY} x2={16} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={19} y={pin.relY + 3} className="text-[9px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* Outputs Y0..Y7 */}
            {outputs.map((pin) => (
              <g key={pin.id}>
                <line x1={width - 16} y1={pin.relY} x2={width} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={width - 20} y={pin.relY + 3} textAnchor="end" className="text-[9px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            <text x={width / 2} y={height / 2 + 6} textAnchor="middle" className="text-[9px] font-mono-code font-bold fill-emerald-500">
              Y = 1 &lt;&lt; A
            </text>
          </g>
        );
      }

      // Flip-Flops (D, JK, T) with ~PRE and ~CLR terminals
      case 'FLIPFLOP_D':
      case 'FLIPFLOP_JK':
      case 'FLIPFLOP_T': {
        const qVal = outputs.find((p) => p.name === 'Q')?.value ?? state?.q ?? 0;
        const qBarVal = outputs.find((p) => p.name.includes('Q') && p.name !== 'Q')?.value ?? state?.qBar ?? 1;
        const clkPin = inputs.find((p) => p.type === 'clock' || p.name === 'CLK');
        const prePin = inputs.find((p) => p.name.includes('PRE'));
        const clrPin = inputs.find((p) => p.name.includes('CLR'));

        return (
          <g>
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={6}
              fill="var(--bg-surface)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            {/* Header notch banner */}
            <rect x={4} y={4} width={width - 8} height={16} rx={5} fill="var(--bg-surface-sub)" />
            <text x={width / 2} y={15} textAnchor="middle" className="text-[9px] font-mono-code font-bold uppercase tracking-wider fill-[var(--text-secondary)] pointer-events-none">
              {type === 'FLIPFLOP_D' ? 'FF TIPO D' : type === 'FLIPFLOP_JK' ? 'FF TIPO JK' : 'FF TIPO T'}
            </text>

            {/* Inversion bubble for ~PRE (top) */}
            {prePin && (
              <g>
                <circle cx={prePin.relX} cy={prePin.relY + 6} r={3} fill="none" stroke="var(--component-stroke)" strokeWidth={1.2} />
                <text x={prePin.relX} y={prePin.relY + 16} textAnchor="middle" className="text-[8px] font-mono-code font-bold fill-red-400">
                  PRE
                </text>
              </g>
            )}

            {/* Inversion bubble for ~CLR (bottom) */}
            {clrPin && (
              <g>
                <circle cx={clrPin.relX} cy={clrPin.relY - 6} r={3} fill="none" stroke="var(--component-stroke)" strokeWidth={1.2} />
                <text x={clrPin.relX} y={clrPin.relY - 10} textAnchor="middle" className="text-[8px] font-mono-code font-bold fill-red-400">
                  CLR
                </text>
              </g>
            )}

            {/* Clock Dynamic Edge Triangle */}
            {clkPin && (
              <polyline
                points={`4,${clkPin.relY - 6} 12,${clkPin.relY} 4,${clkPin.relY + 6}`}
                fill="none"
                stroke="var(--component-stroke)"
                strokeWidth={1.8}
              />
            )}

            {/* Input Pin Lead lines & Labels */}
            {inputs
              .filter((p) => !p.name.includes('PRE') && !p.name.includes('CLR'))
              .map((pin) => (
                <g key={pin.id}>
                  <line x1={0} y1={pin.relY} x2={14} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                  <text x={16} y={pin.relY + 3.5} className="text-[9px] font-mono-code font-bold fill-[var(--text-primary)]">
                    {pin.name}
                  </text>
                </g>
              ))}

            {/* Output Pin Lead lines & Labels */}
            {outputs.map((pin) => (
              <g key={pin.id}>
                <line x1={width - 14} y1={pin.relY} x2={width} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={width - 16} y={pin.relY + 3.5} textAnchor="end" className="text-[9px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* Live State readout in center */}
            <g transform={`translate(${width / 2}, ${height / 2 + 6})`}>
              <text textAnchor="middle" className="text-[11px] font-mono-code font-extrabold fill-blue-500">
                Q={qVal} Q'={qBarVal}
              </text>
            </g>
          </g>
        );
      }

      // 74LS90 Decade Counter (Asynchronous BCD Counter)
      case 'IC_74LS90': {
        const qa = outputs[0]?.value ?? 0;
        const qb = outputs[1]?.value ?? 0;
        const qc = outputs[2]?.value ?? 0;
        const qd = outputs[3]?.value ?? 0;
        const count = state?.count ?? (qa === 1 ? 1 : 0) + (qb === 1 ? 2 : 0) + (qc === 1 ? 4 : 0) + (qd === 1 ? 8 : 0);

        return (
          <g>
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={6}
              fill="var(--bg-surface)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            {/* Top header bar */}
            <rect x={4} y={4} width={width - 8} height={18} rx={5} fill="var(--bg-surface-sub)" />
            {/* Chip notch */}
            <path d={`M ${width / 2 - 8} 4 A 8 8 0 0 0 ${width / 2 + 8} 4 Z`} fill="var(--bg-base)" stroke="var(--border-color)" strokeWidth={1} />
            <text x={width / 2} y={16} textAnchor="middle" className="text-[9px] font-mono-code font-bold uppercase tracking-wider fill-blue-500 pointer-events-none">
              74LS90 CONTADOR BCD
            </text>

            {/* Left Inputs */}
            {inputs.map((pin) => (
              <g key={pin.id}>
                <line x1={0} y1={pin.relY} x2={16} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={18} y={pin.relY + 3} className="text-[8px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* Right Outputs */}
            {outputs.map((pin) => (
              <g key={pin.id}>
                <line x1={width - 16} y1={pin.relY} x2={width} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={width - 18} y={pin.relY + 3} textAnchor="end" className="text-[8px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* Center Status Display */}
            <g transform={`translate(${width / 2}, ${height / 2 + 6})`}>
              <rect x={-36} y={-16} width={72} height={32} rx={4} fill="var(--bg-surface-sub)" stroke="var(--border-color)" strokeWidth={1} />
              <text x={0} y={-2} textAnchor="middle" className="text-[12px] font-mono-code font-extrabold fill-emerald-500">
                DEC: {count}
              </text>
              <text x={0} y={11} textAnchor="middle" className="text-[8px] font-mono-code font-bold fill-[var(--text-secondary)]">
                {qd}{qc}{qb}{qa}₂
              </text>
            </g>
          </g>
        );
      }

      // 74LS194 4-Bit Universal Bidirectional Shift Register
      case 'IC_74LS194': {
        const bits = state?.shiftBits ?? [outputs[0]?.value ?? 0, outputs[1]?.value ?? 0, outputs[2]?.value ?? 0, outputs[3]?.value ?? 0];
        const s0 = inputs.find((p) => p.name === 'S0')?.value ?? 0;
        const s1 = inputs.find((p) => p.name === 'S1')?.value ?? 0;
        const clr = inputs.find((p) => p.name === '~CLR')?.value ?? 1;

        let modeText = 'HOLD';
        if (clr === 0) modeText = 'RESET';
        else if (s1 === 0 && s0 === 1) modeText = 'SHIFT R >>';
        else if (s1 === 1 && s0 === 0) modeText = 'SHIFT L <<';
        else if (s1 === 1 && s0 === 1) modeText = 'CARGA PARALELA';

        return (
          <g>
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={6}
              fill="var(--bg-surface)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            <rect x={4} y={4} width={width - 8} height={18} rx={5} fill="var(--bg-surface-sub)" />
            <path d={`M ${width / 2 - 8} 4 A 8 8 0 0 0 ${width / 2 + 8} 4 Z`} fill="var(--bg-base)" stroke="var(--border-color)" strokeWidth={1} />
            <text x={width / 2} y={16} textAnchor="middle" className="text-[9px] font-mono-code font-bold uppercase tracking-wider fill-purple-500 pointer-events-none">
              74LS194 REGISTRO 4B
            </text>

            {/* Inputs */}
            {inputs.map((pin) => (
              <g key={pin.id}>
                <line x1={0} y1={pin.relY} x2={16} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={18} y={pin.relY + 3} className="text-[8px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* Outputs */}
            {outputs.map((pin) => (
              <g key={pin.id}>
                <line x1={width - 16} y1={pin.relY} x2={width} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={width - 18} y={pin.relY + 3} textAnchor="end" className="text-[8px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* Center Status Display */}
            <g transform={`translate(${width / 2}, ${height / 2 + 10})`}>
              <rect x={-40} y={-22} width={80} height={42} rx={4} fill="var(--bg-surface-sub)" stroke="var(--border-color)" strokeWidth={1} />
              <text x={0} y={-8} textAnchor="middle" className="text-[8px] font-mono-code font-bold uppercase fill-purple-400">
                {modeText}
              </text>
              <text x={0} y={12} textAnchor="middle" className="text-[12px] font-mono-code font-extrabold fill-blue-400 tracking-widest">
                {bits.join('')}
              </text>
            </g>
          </g>
        );
      }

      // 74LS85 4-Bit Magnitude Comparator
      case 'IC_74LS85': {
        const outGt = outputs.find((p) => p.name === 'A>B')?.value;
        const outEq = outputs.find((p) => p.name === 'A=B')?.value;
        const outLt = outputs.find((p) => p.name === 'A<B')?.value;

        let verdict = 'A = B';
        let verdictColor = 'text-amber-500';
        if (outGt === 1) {
          verdict = 'A > B';
          verdictColor = 'text-emerald-500';
        } else if (outLt === 1) {
          verdict = 'A < B';
          verdictColor = 'text-blue-500';
        }

        return (
          <g>
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={6}
              fill="var(--bg-surface)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            <rect x={4} y={4} width={width - 8} height={18} rx={5} fill="var(--bg-surface-sub)" />
            <path d={`M ${width / 2 - 8} 4 A 8 8 0 0 0 ${width / 2 + 8} 4 Z`} fill="var(--bg-base)" stroke="var(--border-color)" strokeWidth={1} />
            <text x={width / 2} y={16} textAnchor="middle" className="text-[9px] font-mono-code font-bold uppercase tracking-wider fill-emerald-500 pointer-events-none">
              74LS85 COMPARADOR 4B
            </text>

            {/* Inputs */}
            {inputs.map((pin) => (
              <g key={pin.id}>
                <line x1={0} y1={pin.relY} x2={16} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={18} y={pin.relY + 3} className="text-[8px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* Outputs */}
            {outputs.map((pin) => (
              <g key={pin.id}>
                <line x1={width - 16} y1={pin.relY} x2={width} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={width - 18} y={pin.relY + 3} textAnchor="end" className="text-[8px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* Center Status */}
            <g transform={`translate(${width / 2}, ${height / 2 + 10})`}>
              <rect x={-36} y={-16} width={72} height={32} rx={4} fill="var(--bg-surface-sub)" stroke="var(--border-color)" strokeWidth={1} />
              <text x={0} y={5} textAnchor="middle" className={`text-[12px] font-mono-code font-extrabold fill-emerald-500`}>
                {verdict}
              </text>
            </g>
          </g>
        );
      }

      // 74LS151 8-to-1 Multiplexer
      case 'IC_74LS151': {
        const en = inputs.find((p) => p.name === '~E')?.value ?? 0;
        const code = state?.selectedMuxChannel ?? 0;
        const outY = outputs.find((p) => p.name === 'Y')?.value ?? 0;

        return (
          <g>
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={6}
              fill="var(--bg-surface)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            <rect x={4} y={4} width={width - 8} height={18} rx={5} fill="var(--bg-surface-sub)" />
            <path d={`M ${width / 2 - 8} 4 A 8 8 0 0 0 ${width / 2 + 8} 4 Z`} fill="var(--bg-base)" stroke="var(--border-color)" strokeWidth={1} />
            <text x={width / 2} y={16} textAnchor="middle" className="text-[9px] font-mono-code font-bold uppercase tracking-wider fill-sky-500 pointer-events-none">
              74LS151 MUX 8:1
            </text>

            {/* Inputs */}
            {inputs.map((pin) => (
              <g key={pin.id}>
                <line x1={0} y1={pin.relY} x2={16} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={18} y={pin.relY + 3} className="text-[8px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* Outputs */}
            {outputs.map((pin) => (
              <g key={pin.id}>
                <line x1={width - 16} y1={pin.relY} x2={width} y2={pin.relY} stroke="var(--component-stroke)" strokeWidth={1.5} />
                <text x={width - 18} y={pin.relY + 3} textAnchor="end" className="text-[8px] font-mono-code font-bold fill-[var(--text-primary)]">
                  {pin.name}
                </text>
              </g>
            ))}

            {/* Center Status */}
            <g transform={`translate(${width / 2}, ${height / 2 + 10})`}>
              <rect x={-36} y={-16} width={72} height={32} rx={4} fill="var(--bg-surface-sub)" stroke="var(--border-color)" strokeWidth={1} />
              <text x={0} y={-2} textAnchor="middle" className="text-[8px] font-mono-code font-bold uppercase fill-[var(--text-secondary)]">
                {en === 1 ? 'DESACTIVADO' : `CANAL D${code}`}
              </text>
              <text x={0} y={11} textAnchor="middle" className="text-[11px] font-mono-code font-extrabold fill-sky-500">
                Y={outY}
              </text>
            </g>
          </g>
        );
      }

      // CLOCK Oscillator
      case 'CLOCK': {
        const val = outputs[0]?.value;
        const color = getSignalColor(val);
        return (
          <g>
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={6}
              fill="var(--bg-surface)"
              stroke={color}
              strokeWidth={2}
            />
            {/* Square wave icon */}
            <path d="M 20 40 L 32 40 L 32 20 L 48 20 L 48 40 L 60 40 L 60 20 L 72 20" fill="none" stroke={color} strokeWidth={2} />
            <text x={45} y={52} textAnchor="middle" className="text-[9px] font-mono-code font-bold fill-[var(--text-secondary)]">
              {val === 1 ? 'HIGH' : 'LOW'}
            </text>
          </g>
        );
      }

      // Generic IC Block (Full Adder, MUX, Decoders, Flip-Flops, Counters, etc.)
      case 'CUSTOM_SUBCIRCUIT': {
        return (
          <g>
            {/* Integrated Circuit Body */}
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={6}
              fill="var(--bg-surface)"
              stroke={isSelected ? '#3b82f6' : 'var(--component-stroke)'}
              strokeWidth={isSelected ? 2.5 : 2}
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"
            />
            {/* Header notch / banner */}
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={20}
              rx={6}
              fill="var(--bg-surface-sub)"
              stroke="var(--border-color)"
              strokeWidth={1}
            />
            {/* IC Orientation Notch */}
            <path
              d={`M ${width / 2 - 8} 4 A 8 8 0 0 0 ${width / 2 + 8} 4 Z`}
              fill="var(--bg-base)"
              stroke="var(--border-color)"
              strokeWidth={1}
            />

            {/* Subcircuit Type Name */}
            <text
              x={width / 2}
              y={17}
              textAnchor="middle"
              className="text-[9px] font-mono-code font-bold uppercase tracking-wider fill-blue-500 pointer-events-none"
            >
              {label}
            </text>

            {/* Inner hint icon / badge */}
            <g transform={`translate(${width / 2 - 14}, ${height / 2 - 7})`} className="opacity-40">
              <rect width={28} height={14} rx={3} fill="var(--bg-surface-sub)" stroke="var(--border-color)" strokeWidth={0.8} />
              <text x={14} y={10} textAnchor="middle" className="text-[7px] font-mono-code font-bold fill-[var(--text-secondary)]">
                SUB
              </text>
            </g>

            {/* Left Port Labels */}
            {inputs.map((pin) => (
              <text
                key={`lbl-in-${pin.id}`}
                x={12}
                y={pin.relY + 3.5}
                textAnchor="start"
                className="text-[9px] font-mono-code font-semibold fill-[var(--text-secondary)] pointer-events-none"
              >
                {pin.name}
              </text>
            ))}

            {/* Right Port Labels */}
            {outputs.map((pin) => (
              <text
                key={`lbl-out-${pin.id}`}
                x={width - 12}
                y={pin.relY + 3.5}
                textAnchor="end"
                className="text-[9px] font-mono-code font-semibold fill-[var(--text-secondary)] pointer-events-none"
              >
                {pin.name}
              </text>
            ))}
          </g>
        );
      }

      default: {
        return (
          <g>
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={height - 8}
              rx={6}
              fill="var(--bg-surface)"
              stroke="var(--component-stroke)"
              strokeWidth={2}
            />
            {/* Top header bar */}
            <rect
              x={4}
              y={4}
              width={width - 8}
              height={18}
              rx={5}
              fill="var(--bg-surface-sub)"
            />
            <text
              x={width / 2}
              y={16}
              textAnchor="middle"
              className="text-[9px] font-bold uppercase tracking-wider fill-[var(--text-secondary)] pointer-events-none"
            >
              {type.replace(/_/g, ' ')}
            </text>

            {/* Label in center */}
            <text
              x={width / 2}
              y={height / 2 + 3}
              textAnchor="middle"
              className="text-[11px] font-semibold fill-[var(--text-primary)] pointer-events-none"
            >
              {label}
            </text>
          </g>
        );
      }
    }
  };

  return (
    <g
      id={`comp-${component.id}`}
      transform={`translate(${component.x}, ${component.y})`}
      className={`select-none transition-shadow ${isSelected ? 'filter drop-shadow-[0_0_8px_rgba(37,99,235,0.8)]' : ''}`}
    >
      {/* Component Box / Symbol */}
      <g transform={component.rotation ? `rotate(${component.rotation}, ${width / 2}, ${height / 2})` : undefined}>
        {renderGateBody()}
      </g>

      {/* Component Label under symbol if not an IC block */}
      {!type.includes('ADDER') && !type.includes('MUX') && !type.includes('FLIPFLOP') && !type.includes('COUNTER') && !type.includes('74LS') && !type.includes('IC_') && type !== 'SEVEN_SEGMENT' && type !== 'CUSTOM_SUBCIRCUIT' && (
        <text
          x={width / 2}
          y={height + 14}
          textAnchor="middle"
          className="text-[10px] font-medium fill-[var(--text-secondary)] pointer-events-none"
        >
          {label}
        </text>
      )}

      {/* Input Pin Terminals */}
      {inputs.map((pin) => renderPin(pin, false))}

      {/* Output Pin Terminals */}
      {outputs.map((pin) => renderPin(pin, true))}
    </g>
  );
};
