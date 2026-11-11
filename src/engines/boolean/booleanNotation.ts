/**
 * Boolean Notation Normalizer & KaTeX LaTeX Formatter
 * Converts any boolean syntax (A', !A, ~A, NOT A, ¬A, AB, A+B, etc.)
 * into standardized, elegant KaTeX LaTeX using horizontal overline vinculum (\overline{...})
 * Strictly ensures NO apostrophes appear in visual math output.
 */

import { ASTNode, BooleanParser } from './evaluator';

/**
 * Converts an ASTNode into clean, mathematically standardized KaTeX LaTeX.
 * Negations are strictly formatted as \overline{...}.
 */
export function astToLatex(node: ASTNode): string {
  switch (node.type) {
    case 'CONST':
      return `${node.value}`;

    case 'VAR':
      return node.name;

    case 'NOT': {
      const child = node.child;
      // If child is a variable or constant, \overline{A}
      if (child.type === 'VAR' || child.type === 'CONST') {
        return `\\overline{${astToLatex(child)}}`;
      }
      // If child is already a NOT (double negation): \overline{\overline{...}}
      if (child.type === 'NOT') {
        return `\\overline{${astToLatex(child)}}`;
      }
      // For compound expressions: \overline{A + B}, \overline{A \\cdot B}, \overline{A \\oplus B}
      return `\\overline{${astToLatex(child)}}`;
    }

    case 'AND': {
      const left = astToLatex(node.left);
      const right = astToLatex(node.right);
      const leftNeedsParens = node.left.type === 'OR' || node.left.type === 'XOR';
      const rightNeedsParens = node.right.type === 'OR' || node.right.type === 'XOR';
      const l = leftNeedsParens ? `(${left})` : left;
      const r = rightNeedsParens ? `(${right})` : right;
      return `${l} \\cdot ${r}`;
    }

    case 'OR': {
      const left = astToLatex(node.left);
      const right = astToLatex(node.right);
      return `${left} + ${right}`;
    }

    case 'XOR': {
      const left = astToLatex(node.left);
      const right = astToLatex(node.right);
      return `${left} \\oplus ${right}`;
    }

    case 'NAND': {
      const left = astToLatex(node.left);
      const right = astToLatex(node.right);
      return `\\overline{${left} \\cdot ${right}}`;
    }

    case 'NOR': {
      const left = astToLatex(node.left);
      const right = astToLatex(node.right);
      return `\\overline{${left} + ${right}}`;
    }

    case 'XNOR': {
      const left = astToLatex(node.left);
      const right = astToLatex(node.right);
      return `\\overline{${left} \\oplus ${right}}`;
    }
  }
}

/**
 * Normalizes any boolean string input (e.g. A'B + !C(A+B)', ~A, NOT B)
 * into a valid KaTeX LaTeX formula with overline notation.
 */
export function booleanStringToLatex(expr: string): string {
  if (!expr || typeof expr !== 'string') return '';
  const trimmed = expr.trim();
  if (trimmed === '0' || trimmed === '1') return trimmed;

  // Try parsing into AST
  try {
    const parser = new BooleanParser(trimmed);
    const ast = parser.parse();
    return astToLatex(ast);
  } catch {
    // If exact parsing fails (e.g. partial syntax or custom text like "F = A'B"),
    // use a robust regex normalizer that translates negation tokens into \overline{...}
    return normalizeBooleanTextToLatex(trimmed);
  }
}

/**
 * Fallback regex normalizer that replaces:
 * - Parenthesized negations: (expr)' or !(expr) or ~(expr) -> \overline{(expr)}
 * - Single letter negations: A' or !A or ~A or NOT A or ¬A -> \overline{A}
 * - Operators: ·, *, • -> \cdot, ⊕, ^ -> \oplus, + -> +
 */
export function normalizeBooleanTextToLatex(input: string): string {
  let s = input;

  // Handle "NOT (expr)" or "!(expr)" or "~(expr)" or "¬(expr)"
  s = s.replace(/(?:NOT|!|~|¬)\s*\(([^)]+)\)/gi, '\\overline{($1)}');

  // Handle parenthesized primes: "(expr)'" or "(expr)’" or "(expr)`"
  s = s.replace(/\(([^)]+)\)['’`]/g, '\\overline{($1)}');

  // Handle single variable/token primes: "A'" or "A_1'" -> \overline{A}
  s = s.replace(/([A-Za-z0-9_]+)['’`]/g, '\\overline{$1}');

  // Handle prefix NOTs on single identifiers: "!A", "~A", "¬A", "NOT A"
  s = s.replace(/(?:NOT\s+|[!~¬])([A-Za-z0-9_]+)/gi, '\\overline{$1}');

  // Standardize operators for LaTeX
  s = s.replace(/[*·•&∧]/g, ' \\cdot ');
  s = s.replace(/[\^⊕]/g, ' \\oplus ');
  s = s.replace(/[∨|]/g, ' + ');

  return s;
}

/**
 * Normalizes general educational math strings (e.g. N_10, 2^i, C_out)
 * so that KaTeX renders them properly.
 */
export function normalizeGeneralMath(expr: string): string {
  if (!expr || typeof expr !== 'string') return '';
  let s = expr.trim();

  // Fix bare multi-character subscripts like N_10 -> N_{10}, C_out -> C_{out}, Q_t+1 -> Q_{t+1}
  s = s.replace(/([A-Za-z])_([A-Za-z0-9]{2,})/g, '$1_{$2}');

  // Convert any remaining single variable apostrophe like A' -> \overline{A}
  s = s.replace(/([A-Za-z])['’`]/g, '\\overline{$1}');

  // Convert (AB)' or (A+B)' -> \overline{AB} / \overline{A+B}
  s = s.replace(/\(([^)]+)\)['’`]/g, '\\overline{$1}');

  return s;
}
