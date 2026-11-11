/**
 * Educational Course Content - Computación Digital y Diseño Lógico
 * Formatted with professional KaTeX math expressions and standardized overline negations (\overline{...})
 */

import { EducationalLesson } from '../types';

export const EDUCATIONAL_LESSONS: EducationalLesson[] = [
  {
    id: 'lesson-binary-basics',
    title: 'Fundamentos del Sistema Binario',
    category: 'Fundamentos',
    duration: '10 min',
    level: 'Básico',
    summary: 'Comprende el sistema de numeración base 2, bits, nibbles, bytes y la representación binaria de información digital.',
    content: [
      'Los circuitos electrónicos modernos operan con tensiones binarias: nivel alto (HIGH, típicamente 5V o 3.3V, representado matemáticamente como 1) y nivel bajo (LOW, 0V o tierra, representado como 0).',
      'El sistema binario es un sistema posicional donde cada posición k de derecha a izquierda representa una potencia de 2 (2^k).',
      'Por ejemplo, el número binario 1101₂ equivale a: (1 × 2³) + (1 × 2²) + (0 × 2¹) + (1 × 2⁰) = 8 + 4 + 0 + 1 = 13 en base decimal.',
      'Un grupo de 4 bits se denomina nibble o cuarteto (representa un dígito hexadecimal 0-F), mientras que 8 bits forman un byte (capaz de representar 256 valores distintos de 0 a 255).'
    ],
    formulas: [
      'N_{10} = \\sum_{i=0}^{n-1} b_i \\cdot 2^i',
      '\\text{Rango para } n \\text{ bits: } 0 \\le N \\le 2^n - 1'
    ],
    truthTablePreview: {
      headers: ['Decimal', 'Binario (4-bit)', 'Hexadecimal'],
      rows: [
        ['0', '0000', '0x0'],
        ['5', '0101', '0x5'],
        ['10', '1010', '0xA'],
        ['15', '1111', '0xF'],
      ]
    },
    sampleCircuitKey: 'counter_7seg_display',
    quiz: {
      question: '¿Cuál es el valor decimal equivalente del número binario 10110₂?',
      options: ['18', '22', '26', '30'],
      correctIndex: 1,
      explanation: '16 + 0 + 4 + 2 + 0 = 22 en base decimal.'
    }
  },
  {
    id: 'lesson-boolean-algebra',
    title: 'Álgebra de Boole y Operaciones Fundamentales',
    category: 'Álgebra Lógica',
    duration: '15 min',
    level: 'Básico',
    summary: 'La estructura matemática desarrollada por George Boole que sustenta toda la arquitectura de computadores.',
    content: [
      'El álgebra booleana es una estructura algebraica definida sobre el conjunto {0, 1} con dos operaciones binarias fundamentales (AND denoted ·, OR denoted +) y una operación unaria (NOT con barra superior: \\overline{A}).',
      'Operación AND (Conjunción lógica): Produce 1 si y solo si todas sus entradas son 1. Equivale al producto lógico.',
      'Operación OR (Disyunción lógica): Produce 1 si al menos una de sus entradas es 1. Equivale a la suma lógica.',
      'Operación NOT (Negación o complemento): Invierte el valor binario: \\overline{0} = 1, y \\overline{1} = 0.'
    ],
    formulas: [
      'A \\cdot 0 = 0,\\quad A \\cdot 1 = A,\\quad A \\cdot A = A,\\quad A \\cdot \\overline{A} = 0',
      'A + 0 = A,\\quad A + 1 = 1,\\quad A + A = A,\\quad A + \\overline{A} = 1',
      '\\overline{\\overline{A}} = A\\quad (\\text{Doble negación})'
    ],
    sampleCircuitKey: 'half_adder',
    quiz: {
      question: 'Según los postulados booleanos, ¿a qué equivale la expresión A · (A + B)?',
      options: ['A · B', 'A', 'A + B', '1'],
      correctIndex: 1,
      explanation: 'Por la ley de absorción: A · (A + B) = A·A + A·B = A + A·B = A·(1 + B) = A·1 = A.'
    }
  },
  {
    id: 'lesson-logic-gates',
    title: 'Compuertas Lógicas Básicas y Universales',
    category: 'Hardware Digital',
    duration: '15 min',
    level: 'Básico',
    summary: 'Símbolos ANSI/IEEE, tablas de verdad y comportamiento físico de compuertas AND, OR, NOT, NAND, NOR, XOR y XNOR.',
    content: [
      'Las compuertas lógicas son los bloques de construcción físicos fundamentales de cualquier procesador o circuito integrado.',
      'Compuerta XOR (OR Exclusivo): Produce 1 cuando un número impar de entradas es 1. Para 2 entradas: Y = \\overline{A}B + A\\overline{B}. Es crucial en sumadores y generadores de paridad.',
      'Compuerta XNOR: Es la negación de XOR (Y = \\overline{A \\oplus B}). También se denomina compuerta de coincidencia o equivalencia.',
      'Universalidad de NAND y NOR: Cualquier circuito booleano imaginable se puede construir exclusivamente con compuertas NAND o exclusivamente con compuertas NOR.'
    ],
    formulas: [
      '\\text{XOR: } Y = A \\oplus B = \\overline{A}B + A\\overline{B}',
      '\\text{XNOR: } Y = \\overline{A \\oplus B} = AB + \\overline{A}\\,\\overline{B}',
      '\\text{NAND Universal: } \\text{NOT}(A) = \\overline{A \\cdot A} = \\overline{A}'
    ],
    truthTablePreview: {
      headers: ['A', 'B', 'AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'],
      rows: [
        ['0', '0', '0', '0', '1', '1', '0', '1'],
        ['0', '1', '0', '1', '1', '0', '1', '0'],
        ['1', '0', '0', '1', '1', '0', '1', '0'],
        ['1', '1', '1', '1', '0', '0', '0', '1']
      ]
    },
    sampleCircuitKey: 'half_adder',
    quiz: {
      question: '¿Por qué se dice que la compuerta NAND es una compuerta "universal"?',
      options: [
        'Porque funciona con cualquier voltaje sin quemarse',
        'Porque puede sintetizar cualquier función booleana sin requerir otras compuertas',
        'Porque siempre produce un resultado 1',
        'Porque tiene infinitas entradas'
      ],
      correctIndex: 1,
      explanation: 'Una compuerta es universal si permite implementar las operaciones NOT, AND y OR completas, formando un conjunto funcionalmente completo.'
    }
  },
  {
    id: 'lesson-demorgan-laws',
    title: 'Teoremas de De Morgan y Dualidad',
    category: 'Álgebra Lógica',
    duration: '12 min',
    level: 'Intermedio',
    summary: 'Transformación de productos en sumas y sumas en productos complementados para optimización de circuitos.',
    content: [
      'Augustus De Morgan formuló dos leyes esenciales que conectan la conjunción y la disyunción a través de la negación superior:',
      'Primer Teorema: El complemento de un producto lógico es igual a la suma lógica de los complementos individuales: \\overline{A \\cdot B} = \\overline{A} + \\overline{B}.',
      'Segundo Teorema: El complemento de una suma lógica es igual al producto lógico de los complementos individuales: \\overline{A + B} = \\overline{A} \\cdot \\overline{B}.',
      'Principio de Dualidad: Cualquier identidad booleana sigue siendo válida si intercambiamos los operadores AND (·) por OR (+), y las constantes 0 por 1.'
    ],
    formulas: [
      '\\overline{A \\cdot B} = \\overline{A} + \\overline{B}',
      '\\overline{A + B} = \\overline{A} \\cdot \\overline{B}',
      '\\overline{A_1 \\cdot A_2 \\cdots A_n} = \\overline{A_1} + \\overline{A_2} + \\dots + \\overline{A_n}'
    ],
    quiz: {
      question: '¿Cuál es el equivalente de De Morgan para la expresión \\overline{\\overline{A} + B \\cdot \\overline{C}}?',
      options: ['A · (\\overline{B} + C)', 'A · \\overline{B} · C', 'A + \\overline{B} + C', '\\overline{A} · B · C'],
      correctIndex: 0,
      explanation: 'Aplicando De Morgan: \\overline{\\overline{A}} · \\overline{B · \\overline{C}} = A · (\\overline{B} + \\overline{\\overline{C}}) = A · (\\overline{B} + C).'
    }
  },
  {
    id: 'lesson-truth-tables',
    title: 'Diseño y Análisis con Tablas de Verdad',
    category: 'Diseño Lógico',
    duration: '15 min',
    level: 'Intermedio',
    summary: 'Construcción sistemática de tablas de 2^n combinaciones, minterms Σm, maxterms ΠM y condiciones Don\'t Care.',
    content: [
      'Una tabla de verdad enumera exhaustivamente todas las asignaciones posibles de variables binarias de entrada junto con el valor de salida correspondiente.',
      'Para n variables de entrada existen exactamente 2^n filas o combinaciones posibles.',
      'Minterm (término mínimo, mi): Es un producto booleano estándar donde cada una de las n variables aparece exactamente una vez (complementada con barra superior si vale 0, sin complementar si vale 1).',
      'Forma Canónica SOP (Suma de Productos): Una función booleana es la suma lógica de todos los minterms en los que la función vale 1: F = \\sum m(...).',
      'Condiciones indiferentes (Don\'t Care, X): Combinaciones de entrada que nunca ocurrirán físicamente o cuyo valor de salida no altera el funcionamiento del sistema, útiles para simplificar.'
    ],
    formulas: [
      '\\text{Número de filas} = 2^n',
      'F(A,B,C) = \\sum m(1, 3, 5, 7) = \\overline{A}\\,\\overline{B}C + \\overline{A}BC + A\\overline{B}C + ABC'
    ],
    sampleCircuitKey: 'decoder_2to4_circuit',
    quiz: {
      question: '¿Cuántas combinaciones posibles tiene la tabla de verdad de un circuito con 6 variables de entrada?',
      options: ['12', '36', '64', '128'],
      correctIndex: 2,
      explanation: '2^6 = 64 combinaciones binarias.'
    }
  },
  {
    id: 'lesson-karnaugh-maps',
    title: 'Simplificación Visual con Mapas de Karnaugh',
    category: 'Optimización',
    duration: '20 min',
    level: 'Intermedio',
    summary: 'Dominio de mapas de 2, 3, 4 y 5 variables, adyacencias en Código Gray, agrupaciones potencia de 2 y envoltura toroidal.',
    content: [
      'El mapa de Karnaugh es un método gráfico de optimización creado por Maurice Karnaugh en los Laboratorios Bell en 1953.',
      'Disposición en Código Gray: Las celdas se disponen de modo que entre celdas contiguas (horizontal o verticalmente) solo varíe exactamente un bit (00, 01, 11, 10).',
      'Reglas de agrupación:',
      '1. Los grupos deben contener un número de celdas que sea potencia de dos: 1, 2, 4, 8, 16 o 32.',
      '2. Los grupos deben ser rectangulares o cuadrados continuos.',
      '3. El mapa tiene continuidad toroidal: el borde izquierdo es adyacente al borde derecho; el borde superior es adyacente al borde inferior; y las 4 esquinas forman un grupo válido de 4 celdas.',
      '4. Cuanto más grande sea el grupo, menos literales tendrá el término resultante.'
    ],
    formulas: [
      '\\text{Tamaño grupo} = 2^k \\implies \\text{Elimina } k \\text{ variables}',
      '\\text{Término resultante} = n - k \\text{ literales}'
    ],
    sampleCircuitKey: 'mux_4to1_selector',
    quiz: {
      question: 'En un mapa de Karnaugh de 4 variables, si logras formar un grupo de 8 celdas adyacentes, ¿cuántos literales tendrá el término simplificado?',
      options: ['1 literal', '2 literales', '3 literales', '4 literales'],
      correctIndex: 0,
      explanation: 'Un grupo de tamaño 2^k = 8 = 2^3 elimina k = 3 variables. De 4 variables iniciales, queda 4 - 3 = 1 solo literal.'
    }
  },
  {
    id: 'lesson-quine-mccluskey',
    title: 'Algoritmo de Quine-McCluskey y Método de Petrick',
    category: 'Optimización Exacta',
    duration: '25 min',
    level: 'Avanzado',
    summary: 'El algoritmo computacional exacto para minimización booleana de cualquier número de variables.',
    content: [
      'A diferencia de los mapas de Karnaugh (cuya visualización se vuelve compleja más allá de 5 o 6 variables), el algoritmo de Quine-McCluskey es puramente tabular y sistemático.',
      'Paso 1: Agrupar minterms y don\'t-cares según la cantidad de unos en su representación binaria.',
      'Paso 2: Comparar elementos de grupos adyacentes que difieran en exactamente 1 posición de bit y combinarlos reemplazando el bit con un guion (-).',
      'Paso 3: Repetir recursivamente hasta que ningún término pueda combinarse. Los términos resultantes no combinados son los Implicantes Primos (PI).',
      'Paso 4: Construir la tabla de implicantes primos contra los minterms requeridos. Identificar los Implicantes Primos Esenciales (EPI).',
      'Paso 5: Si quedan minterms sin cubrir, aplicar el método de Petrick para encontrar la combinación mínima de implicantes que garantice cobertura completa.'
    ],
    formulas: [
      '\\text{Término } 0101\\,(5) + 0111\\,(7) \\implies 01-1\\,(\\overline{A}BD)',
      '\\text{Función de Petrick: } P = \\prod (PI_{i1} + PI_{i2} + \\dots)'
    ],
    quiz: {
      question: '¿Qué define a un Implicante Primo Esencial (EPI)?',
      options: [
        'Es el término con más literales',
        'Es un implicante primo que cubre al menos un minterm que ningún otro implicante primo puede cubrir',
        'Es un término que solo contiene variables sin negar',
        'Es un grupo de tamaño impar'
      ],
      correctIndex: 1,
      explanation: 'Un EPI es indispensable en la función mínima porque contiene al menos una celda o minterm que no está cubierto por ningún otro implicante primo.'
    }
  },
  {
    id: 'lesson-combinational-arithmetic',
    title: 'Aritmética Digital: Sumadores y Restadores',
    category: 'Arquitectura Digital',
    duration: '20 min',
    level: 'Intermedio',
    summary: 'Diseño paso a paso de Medio Sumador, Sumador Completo, Sumador por propagación de acarreo (Ripple Carry) y Restadores.',
    content: [
      'El Medio Sumador (Half Adder) suma 2 bits A y B, generando Suma (S = A ⊕ B) y Acarreo (C = A · B). No acepta acarreo previo de etapas anteriores.',
      'El Sumador Completo (Full Adder) incorpora una tercera entrada de acarreo entrante (Cin), permitiendo conectar múltiples etapas en cascada.',
      'Ecuaciones del Sumador Completo:',
      'Suma: S = A ⊕ B ⊕ Cin',
      'Acarreo saliente: Cout = AB + Cin(A ⊕ B) = AB + ACin + BCin',
      'Sumador de n bits en paralelo (Ripple Carry Adder): Conecta n sumadores completos donde el Cout de cada etapa alimenta el Cin de la etapa siguiente.',
      'Resta binaria en complemento a 2: Un sumador se convierte en restador simplemente invirtiendo la entrada B con barra superior y fijando Cin = 1 (A - B = A + \\overline{B} + 1).'
    ],
    formulas: [
      'S = A \\oplus B \\oplus C_{in}',
      'C_{out} = A \\cdot B + C_{in} \\cdot (A \\oplus B)',
      'A - B = A + \\overline{B} + 1'
    ],
    sampleCircuitKey: 'full_adder_discrete',
    quiz: {
      question: 'En un Sumador Completo, si las entradas son A=1, B=1 y Cin=1, ¿cuáles son los valores de S y Cout?',
      options: ['S=0, Cout=1', 'S=1, Cout=0', 'S=1, Cout=1', 'S=0, Cout=0'],
      correctIndex: 2,
      explanation: '1 + 1 + 1 = 3 decimal, que en binario es 11₂ (Suma S=1 y Acarreo Cout=1).'
    }
  },
  {
    id: 'lesson-sequential-circuits',
    title: 'Circuitos Secuenciales: Flip-Flops y Contadores',
    category: 'Sistemas Secuenciales',
    duration: '25 min',
    level: 'Avanzado',
    summary: 'Lógica con memoria temporal: Biestables SR, D, JK, T, señal de reloj, detección de flancos y registros de conteo.',
    content: [
      'A diferencia de los circuitos combinacionales (donde las salidas dependen exclusivamente de las entradas actuales), los circuitos secuenciales poseen memoria interna.',
      'Latch SR: Celda biestable asíncrona. Entradas Set y Reset. La condición S=1 y R=1 es prohibida porque lleva a un estado metaestable o indefinido.',
      'Flip-Flop D (Data): Captura y almacena el valor de la entrada D exactamente en el flanco ascendente (0→1) de la señal de reloj (CLK). Elimina condiciones prohibidas.',
      'Flip-Flop JK: Flip-flop universal. Cuando J=1 y K=1, bascula (toggle) su estado en cada pulso de reloj.',
      'Flip-Flop T (Toggle): Bascula su estado cuando T=1.',
      'Contador binario de 4 bits: Conecta 4 flip-flops en cascada generando una secuencia cíclica de 0000 a 1111 (0 a 15 decimal).'
    ],
    formulas: [
      '\\text{FF D: } Q_{t+1} = D',
      '\\text{FF JK: } Q_{t+1} = J\\,\\overline{Q}_t + \\overline{K}\\,Q_t',
      '\\text{FF T: } Q_{t+1} = T \\oplus Q_t'
    ],
    sampleCircuitKey: 'sr_latch_memory',
    quiz: {
      question: '¿Qué le ocurre a la salida Q de un Flip-Flop JK cuando ambas entradas J y K están en nivel 1 y llega un flanco de reloj?',
      options: [
        'Se resetea a 0 obligatoriamente',
        'Se setea a 1 obligatoriamente',
        'Bascula (invierte su estado anterior Q = \\overline{Q})',
        'Entra en cortocircuito'
      ],
      correctIndex: 2,
      explanation: 'Cuando J=1 y K=1, el flip-flop opera en modo toggle (basculación), invirtiendo su valor anterior con cada ciclo de reloj.'
    }
  }
];
