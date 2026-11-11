/**
 * LogicLab - Types & Data Models
 */

export type LogicValue = 0 | 1 | 'X' | 'Z';

export type GateCategory = 
  | 'basic'
  | 'arithmetic'
  | 'routing'
  | 'sequential'
  | 'msi'
  | 'io';

export type ComponentType =
  // Basic Gates
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'NAND'
  | 'NOR'
  | 'XOR'
  | 'XNOR'
  | 'BUFFER'
  // Arithmetic
  | 'HALF_ADDER'
  | 'FULL_ADDER'
  | 'HALF_SUBTRACTOR'
  | 'FULL_SUBTRACTOR'
  | 'ADDER_4BIT'
  | 'MAGNITUDE_COMP'
  // Routing, Decoders & Encoders
  | 'MUX_2TO1'
  | 'MUX_4TO1'
  | 'DEMUX_1TO4'
  | 'DECODER_2TO4'
  | 'DECODER_3TO8'
  | 'ENCODER_4TO2'
  | 'BCD_TO_7SEG'
  | 'ENCODER_DECIMAL_TO_BCD'
  | 'PRIORITY_ENCODER_4TO2'
  | 'PRIORITY_ENCODER_8TO3'
  // Sequential
  | 'LATCH_SR'
  | 'FLIPFLOP_D'
  | 'FLIPFLOP_JK'
  | 'FLIPFLOP_T'
  | 'COUNTER_4BIT'
  | 'SHIFT_REG_4BIT'
  // MSI 74xx Standard ICs
  | 'IC_74LS90'
  | 'IC_74LS194'
  | 'IC_74LS85'
  | 'IC_74LS151'
  // IO & Peripherals
  | 'SWITCH'
  | 'PUSH_BUTTON'
  | 'CONSTANT_0'
  | 'CONSTANT_1'
  | 'CLOCK'
  | 'LED'
  | 'OUTPUT_LED'
  | 'OUTPUT_PIN'
  | 'SEVEN_SEGMENT'
  | 'PROBE'
  // Custom Hierarchical Subcircuits
  | 'CUSTOM_SUBCIRCUIT';

export interface Pin {
  id: string;
  name: string;
  type: 'input' | 'output' | 'control' | 'clock';
  relX: number; // percentage or relative px
  relY: number; // percentage or relative px
  value: LogicValue;
  label?: string;
}

export interface SubcircuitPort {
  id: string;
  name: string;
  type: 'input' | 'output';
  targetComponentId: string; // Internal component in subcircuit
  targetPinId: string;       // Pin in internal component
  order: number;             // Order on external symbol
  label?: string;
}

export interface SubcircuitDefinition {
  id: string;
  name: string;
  description: string;
  category?: string;
  color?: string;
  components: CircuitComponent[];
  connections: WireConnection[];
  ports: SubcircuitPort[];
  version: number;
  createdAt: number;
  updatedAt: number;
  readOnly?: boolean;
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  inputs: Pin[];
  outputs: Pin[];
  subcircuitId?: string; // Reference to SubcircuitDefinition.id when type === 'CUSTOM_SUBCIRCUIT'
  // Component parameters & internal memory
  state?: {
    storedBit?: LogicValue;
    q?: LogicValue;
    qBar?: LogicValue;
    count?: number;
    clockPrev?: LogicValue;
    shiftBits?: LogicValue[];
    switchActive?: boolean;
    buttonPressed?: boolean;
    hz?: number;
    lastClockTick?: number;
    displayMode?: 'cathode' | 'anode';
    invalidBcdMode?: 'BLANK' | 'INVALID_DASH' | 'HEX_LETTERS';
    commonPolarity?: 'cathode' | 'anode';
    recognizedChar?: string;
    segLit?: Record<string, boolean> & boolean[];
    subcircuitInternalState?: { components: CircuitComponent[]; connections: WireConnection[] };
    // Advanced MSI Sequential & Combinational State
    clockPrevA?: LogicValue;
    clockPrevB?: LogicValue;
    countA?: number;
    countBCD?: number;
    compResults?: { gt: LogicValue; eq: LogicValue; lt: LogicValue };
    selectedMuxChannel?: number;
  };
  inputCount?: number; // for multi-input AND/OR/NAND/NOR (2 to 8)
  orientation?: 'right' | 'down' | 'left' | 'up'; // orientation of gate symbol (e.g. downward NOT inverter)
  rotation?: 0 | 90 | 180 | 270; // 0=0°, 90=90°, 180=180°, 270=270° CAD rotation
}

export interface WireConnection {
  id: string;
  fromComponentId: string;
  fromPinId: string;
  toComponentId: string;
  toPinId: string;
  value: LogicValue;
  waypoints?: { x: number; y: number }[]; // custom orthogonal route waypoints
  branchPoint?: { x: number; y: number }; // point where wire branches from trunk
}

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  clockHz: number;
  stepCount: number;
  lastEvaluated: number;
  cycleDetected: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectData {
  metadata: ProjectMetadata;
  components: CircuitComponent[];
  connections: WireConnection[];
  subcircuits?: SubcircuitDefinition[];
  viewTransform: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface HierarchyBreadcrumb {
  level: number;
  subcircuitId: string | null; // null = root / main circuit
  instanceId?: string;         // component id of the subcircuit instance
  instanceLabel?: string;      // label of the instance (e.g. FA0)
  name: string;               // display name
  subcircuitName?: string;
  readOnly?: boolean;
}

// Truth Table types
export interface TruthTableColumn {
  id: string;
  name: string;
  isInput: boolean;
  expression?: string;
}

export interface TruthTableRow {
  index: number;
  inputs: Record<string, LogicValue>;
  outputs: Record<string, LogicValue>;
}

export interface TruthTableData {
  variables: string[];
  functions: { name: string; expression: string }[];
  rows: TruthTableRow[];
  minterms: number[];
  maxterms: number[];
  dontCares: number[];
}

// Karnaugh Map types
export interface KarnaughCell {
  row: number;
  col: number;
  grayRow: string;
  grayCol: string;
  mintermIndex: number;
  value: LogicValue;
}

export interface KarnaughGroup {
  id: string;
  color: string;
  minterms: number[];
  cells: { row: number; col: number }[];
  expression: string;
  variablesKept: string[];
  isEssential: boolean;
}

export interface KarnaughResult {
  variableCount: number;
  variables: string[];
  rowVariables: string[];
  colVariables: string[];
  grid: KarnaughCell[][];
  subGrids?: KarnaughCell[][][];
  groups: KarnaughGroup[];
  sopExpression: string;
  posExpression: string;
  steps: string[];
  isEquivalent: boolean;
}

// Quine-McCluskey types
export interface PrimeImplicant {
  binary: string; // e.g. "0-11"
  minterms: number[];
  term: string; // e.g. "A'CD"
  isEssential: boolean;
  covered: boolean;
}

export interface QuineMcCluskeyResult {
  originalExpression: string;
  variables: string[];
  minterms: number[];
  dontCares: number[];
  primeImplicants: PrimeImplicant[];
  essentialPrimeImplicants: PrimeImplicant[];
  sopSimplified: string;
  posSimplified: string;
  canonicalSop: string;
  canonicalPos: string;
  literalsBefore: number;
  literalsAfter: number;
  termsBefore: number;
  termsAfter: number;
  steps: string[];
  isVerifiedEquivalent?: boolean;
}

// Educational Lesson
export interface EducationalLesson {
  id: string;
  title: string;
  category: string;
  duration: string;
  level: 'Básico' | 'Intermedio' | 'Avanzado';
  summary: string;
  content: string[];
  formulas?: string[];
  truthTablePreview?: {
    headers: string[];
    rows: (string | number)[][];
  };
  sampleCircuitKey?: string;
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}
