/**
 * LogicLab - ANSI/IEEE Vector Graphic Component Thumbnails
 * Clean, recognizable, non-decorative schematic symbols for the Component Library Grid View
 */

import React from 'react';
import { ComponentType } from '../../types';

export interface GateThumbnailProps {
  type: ComponentType;
  className?: string;
  size?: number;
  subcircuitColor?: string;
}

export const GateThumbnail: React.FC<GateThumbnailProps> = ({
  type,
  className = 'w-12 h-8',
  size,
  subcircuitColor,
}) => {
  const strokeColor = 'currentColor';
  const style = size ? { width: size, height: (size * 2) / 3 } : undefined;

  switch (type) {
    case 'AND':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          {/* Inputs */}
          <line x1="6" y1="13" x2="18" y2="13" />
          <line x1="6" y1="27" x2="18" y2="27" />
          {/* AND Body: flat back, curved front */}
          <path d="M 18 7 L 34 7 A 13 13 0 0 1 34 33 L 18 33 Z" fill="rgba(59, 130, 246, 0.12)" />
          {/* Output */}
          <line x1="47" y1="20" x2="55" y2="20" />
        </svg>
      );

    case 'OR':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          {/* Inputs */}
          <line x1="6" y1="13" x2="20" y2="13" />
          <line x1="6" y1="27" x2="20" y2="27" />
          {/* OR Body: curved back, pointed front */}
          <path d="M 16 7 Q 24 20 16 33 Q 34 33 46 20 Q 34 7 16 7 Z" fill="rgba(59, 130, 246, 0.12)" />
          {/* Output */}
          <line x1="46" y1="20" x2="55" y2="20" />
        </svg>
      );

    case 'NOT':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          {/* Input */}
          <line x1="8" y1="20" x2="20" y2="20" />
          {/* Triangle */}
          <polygon points="20,8 42,20 20,32" fill="rgba(59, 130, 246, 0.12)" />
          {/* Inversion Circle */}
          <circle cx="45" cy="20" r="3" fill="var(--bg-surface, #1e293b)" stroke={strokeColor} strokeWidth={1.8} />
          {/* Output */}
          <line x1="48" y1="20" x2="54" y2="20" />
        </svg>
      );

    case 'NAND':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <line x1="5" y1="13" x2="16" y2="13" />
          <line x1="5" y1="27" x2="16" y2="27" />
          <path d="M 16 7 L 31 7 A 13 13 0 0 1 31 33 L 16 33 Z" fill="rgba(59, 130, 246, 0.12)" />
          <circle cx="47" cy="20" r="3" fill="var(--bg-surface, #1e293b)" stroke={strokeColor} strokeWidth={1.8} />
          <line x1="50" y1="20" x2="56" y2="20" />
        </svg>
      );

    case 'NOR':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <line x1="5" y1="13" x2="18" y2="13" />
          <line x1="5" y1="27" x2="18" y2="27" />
          <path d="M 14 7 Q 22 20 14 33 Q 32 33 42 20 Q 32 7 14 7 Z" fill="rgba(59, 130, 246, 0.12)" />
          <circle cx="45" cy="20" r="3" fill="var(--bg-surface, #1e293b)" stroke={strokeColor} strokeWidth={1.8} />
          <line x1="48" y1="20" x2="56" y2="20" />
        </svg>
      );

    case 'XOR':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <line x1="4" y1="13" x2="14" y2="13" />
          <line x1="4" y1="27" x2="14" y2="27" />
          {/* Back Arc */}
          <path d="M 11 7 Q 19 20 11 33" stroke={strokeColor} strokeWidth={1.8} />
          {/* XOR Main Body */}
          <path d="M 16 7 Q 24 20 16 33 Q 34 33 46 20 Q 34 7 16 7 Z" fill="rgba(59, 130, 246, 0.12)" />
          <line x1="46" y1="20" x2="56" y2="20" />
        </svg>
      );

    case 'XNOR':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <line x1="4" y1="13" x2="14" y2="13" />
          <line x1="4" y1="27" x2="14" y2="27" />
          <path d="M 11 7 Q 19 20 11 33" stroke={strokeColor} strokeWidth={1.8} />
          <path d="M 16 7 Q 24 20 16 33 Q 32 33 42 20 Q 32 7 16 7 Z" fill="rgba(59, 130, 246, 0.12)" />
          <circle cx="45" cy="20" r="3" fill="var(--bg-surface, #1e293b)" stroke={strokeColor} strokeWidth={1.8} />
          <line x1="48" y1="20" x2="56" y2="20" />
        </svg>
      );

    case 'BUFFER':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <line x1="8" y1="20" x2="20" y2="20" />
          <polygon points="20,8 46,20 20,32" fill="rgba(59, 130, 246, 0.12)" />
          <line x1="46" y1="20" x2="54" y2="20" />
        </svg>
      );

    case 'SWITCH':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          {/* Terminals */}
          <line x1="6" y1="20" x2="18" y2="20" />
          <circle cx="20" cy="20" r="2.5" fill="currentColor" />
          {/* Angled Lever */}
          <line x1="20" y1="20" x2="38" y2="10" stroke="var(--color-brand, #3b82f6)" strokeWidth={2.2} />
          <circle cx="40" cy="20" r="2.5" fill="currentColor" />
          <line x1="42" y1="20" x2="54" y2="20" />
        </svg>
      );

    case 'PUSH_BUTTON':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <line x1="8" y1="24" x2="22" y2="24" />
          <line x1="38" y1="24" x2="52" y2="24" />
          <circle cx="22" cy="24" r="2.5" fill="currentColor" />
          <circle cx="38" cy="24" r="2.5" fill="currentColor" />
          {/* Button contact bar & plunger */}
          <line x1="18" y1="16" x2="42" y2="16" strokeWidth={2.2} />
          <line x1="30" y1="16" x2="30" y2="7" strokeWidth={2} />
          <line x1="24" y1="7" x2="36" y2="7" strokeWidth={2.5} stroke="var(--color-brand, #3b82f6)" />
        </svg>
      );

    case 'LED':
    case 'OUTPUT_LED':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <line x1="8" y1="20" x2="22" y2="20" />
          {/* Diode Triangle */}
          <polygon points="22,10 22,30 36,20" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth={1.8} />
          {/* Cathode Bar */}
          <line x1="36" y1="10" x2="36" y2="30" stroke="#ef4444" strokeWidth={2} />
          <line x1="36" y1="20" x2="52" y2="20" />
          {/* Light emission arrows */}
          <path d="M 28 8 L 36 2 M 36 2 L 32 2 M 36 2 L 36 6" stroke="#ef4444" strokeWidth={1.5} />
          <path d="M 33 11 L 41 5 M 41 5 L 37 5 M 41 5 L 41 9" stroke="#ef4444" strokeWidth={1.5} />
        </svg>
      );

    case 'CLOCK':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          {/* Square wave */}
          <path
            d="M 10 27 L 18 27 L 18 13 L 28 13 L 28 27 L 38 27 L 38 13 L 48 13 L 48 27"
            stroke="var(--color-brand, #3b82f6)"
            strokeWidth={2}
          />
        </svg>
      );

    case 'CONSTANT_0':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <circle cx="30" cy="20" r="13" fill="rgba(239, 68, 68, 0.12)" stroke="#ef4444" />
          <text x="30" y="25" textAnchor="middle" fill="#ef4444" fontSize="15" fontWeight="bold" stroke="none">
            0
          </text>
        </svg>
      );

    case 'CONSTANT_1':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <circle cx="30" cy="20" r="13" fill="rgba(16, 185, 129, 0.12)" stroke="#10b981" />
          <text x="30" y="25" textAnchor="middle" fill="#10b981" fontSize="15" fontWeight="bold" stroke="none">
            1
          </text>
        </svg>
      );

    case 'SEVEN_SEGMENT':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.5}>
          <rect x="18" y="4" width="24" height="32" rx="3" fill="#0f172a" stroke="#334155" />
          {/* Digital 8 segments preview */}
          <line x1="23" y1="8" x2="37" y2="8" stroke="#ef4444" strokeWidth={2} />
          <line x1="22" y1="9" x2="22" y2="19" stroke="#ef4444" strokeWidth={2} />
          <line x1="38" y1="9" x2="38" y2="19" stroke="#ef4444" strokeWidth={2} />
          <line x1="23" y1="20" x2="37" y2="20" stroke="#ef4444" strokeWidth={2} />
          <line x1="22" y1="21" x2="22" y2="31" stroke="#ef4444" strokeWidth={2} />
          <line x1="38" y1="21" x2="38" y2="31" stroke="#ef4444" strokeWidth={2} />
          <line x1="23" y1="32" x2="37" y2="32" stroke="#ef4444" strokeWidth={2} />
        </svg>
      );

    case 'HALF_ADDER':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <rect x="14" y="6" width="32" height="28" rx="3" fill="rgba(6, 182, 212, 0.12)" stroke="#06b6d4" />
          <text x="30" y="23" textAnchor="middle" fill="#06b6d4" fontSize="11" fontWeight="bold" stroke="none">
            HA
          </text>
          <line x1="5" y1="13" x2="14" y2="13" />
          <line x1="5" y1="27" x2="14" y2="27" />
          <line x1="46" y1="13" x2="55" y2="13" />
          <line x1="46" y1="27" x2="55" y2="27" />
        </svg>
      );

    case 'FULL_ADDER':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <rect x="14" y="5" width="32" height="30" rx="3" fill="rgba(59, 130, 246, 0.12)" stroke="#3b82f6" />
          <text x="30" y="23" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="bold" stroke="none">
            FA
          </text>
          <line x1="5" y1="11" x2="14" y2="11" />
          <line x1="5" y1="20" x2="14" y2="20" />
          <line x1="5" y1="29" x2="14" y2="29" />
          <line x1="46" y1="14" x2="55" y2="14" />
          <line x1="46" y1="26" x2="55" y2="26" />
        </svg>
      );

    case 'ADDER_4BIT':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <rect x="12" y="6" width="36" height="28" rx="3" fill="rgba(139, 92, 246, 0.12)" stroke="#8b5cf6" />
          <text x="30" y="23" textAnchor="middle" fill="#8b5cf6" fontSize="10" fontWeight="bold" stroke="none">
            + 4-Bit
          </text>
        </svg>
      );

    case 'MAGNITUDE_COMP':
    case 'IC_74LS85':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <rect x="10" y="6" width="40" height="28" rx="3" fill="rgba(16, 185, 129, 0.12)" stroke="#10b981" />
          <text x="30" y="22" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold" stroke="none">
            {type === 'IC_74LS85' ? '74LS85' : 'COMP'}
          </text>
          <text x="30" y="30" textAnchor="middle" fill="#10b981" fontSize="7" stroke="none">
            &gt; = &lt;
          </text>
        </svg>
      );

    case 'MUX_2TO1':
    case 'MUX_4TO1':
    case 'IC_74LS151':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          {/* Trapezoid multiplexer symbol */}
          <polygon points="16,6 44,12 44,28 16,34" fill="rgba(245, 158, 11, 0.12)" stroke="#f59e0b" />
          <text x="28" y="23" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold" stroke="none">
            {type === 'IC_74LS151' ? '74151' : 'MUX'}
          </text>
        </svg>
      );

    case 'DEMUX_1TO4':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <polygon points="16,12 44,6 44,34 16,28" fill="rgba(245, 158, 11, 0.12)" stroke="#f59e0b" />
          <text x="32" y="23" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold" stroke="none">
            DEMUX
          </text>
        </svg>
      );

    case 'DECODER_2TO4':
    case 'DECODER_3TO8':
    case 'BCD_TO_7SEG':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <rect x="12" y="6" width="36" height="28" rx="3" fill="rgba(6, 182, 212, 0.12)" stroke="#06b6d4" />
          <text x="30" y="23" textAnchor="middle" fill="#06b6d4" fontSize="9" fontWeight="bold" stroke="none">
            {type === 'BCD_TO_7SEG' ? 'BCD→7S' : 'DECOD'}
          </text>
        </svg>
      );

    case 'ENCODER_4TO2':
    case 'ENCODER_DECIMAL_TO_BCD':
    case 'PRIORITY_ENCODER_4TO2':
    case 'PRIORITY_ENCODER_8TO3':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <rect x="12" y="6" width="36" height="28" rx="3" fill="rgba(6, 182, 212, 0.12)" stroke="#06b6d4" />
          <text x="30" y="23" textAnchor="middle" fill="#06b6d4" fontSize="9" fontWeight="bold" stroke="none">
            CODIF
          </text>
        </svg>
      );

    case 'FLIPFLOP_D':
    case 'FLIPFLOP_JK':
    case 'FLIPFLOP_T':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <rect x="14" y="6" width="32" height="28" rx="2" fill="rgba(99, 102, 241, 0.12)" stroke="#6366f1" />
          {/* Dynamic clock triangle on left */}
          <path d="M 14 16 L 20 20 L 14 24" stroke="#6366f1" strokeWidth={1.8} />
          <text x="32" y="23" textAnchor="middle" fill="#6366f1" fontSize="9" fontWeight="bold" stroke="none">
            {type === 'FLIPFLOP_D' ? 'FF-D' : type === 'FLIPFLOP_JK' ? 'FF-JK' : 'FF-T'}
          </text>
        </svg>
      );

    case 'IC_74LS90':
    case 'COUNTER_4BIT':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <rect x="10" y="6" width="40" height="28" rx="2" fill="#0f172a" stroke="#475569" />
          <path d="M 27 6 A 3 3 0 0 0 33 6" fill="#1e293b" stroke="#475569" />
          <text x="30" y="23" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold" stroke="none">
            {type === 'IC_74LS90' ? '74LS90' : 'CONT-4'}
          </text>
        </svg>
      );

    case 'IC_74LS194':
    case 'SHIFT_REG_4BIT':
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={strokeColor} strokeWidth={1.8}>
          <rect x="10" y="6" width="40" height="28" rx="2" fill="#0f172a" stroke="#475569" />
          <path d="M 27 6 A 3 3 0 0 0 33 6" fill="#1e293b" stroke="#475569" />
          <text x="30" y="23" textAnchor="middle" fill="#a78bfa" fontSize="8" fontWeight="bold" stroke="none">
            {type === 'IC_74LS194' ? '74LS194' : 'REG-4'}
          </text>
        </svg>
      );

    case 'CUSTOM_SUBCIRCUIT':
    default:
      return (
        <svg viewBox="0 0 60 40" className={className} fill="none" stroke={subcircuitColor || strokeColor} strokeWidth={1.8}>
          <rect
            x="12"
            y="6"
            width="36"
            height="28"
            rx="3"
            fill="rgba(6, 182, 212, 0.15)"
            stroke={subcircuitColor || '#06b6d4'}
          />
          <text
            x="30"
            y="23"
            textAnchor="middle"
            fill={subcircuitColor || '#06b6d4'}
            fontSize="9"
            fontWeight="bold"
            stroke="none"
          >
            MOD
          </text>
        </svg>
      );
  }
};
