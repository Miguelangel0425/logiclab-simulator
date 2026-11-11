/**
 * Safe Recursive-Descent Boolean Expression Parser & Evaluator
 * Supports: AND, OR, NOT, XOR, NAND, NOR, XNOR, prime suffixes (A'), implicit AND (AB)
 * Zero eval() usage.
 */

import { LogicValue } from '../../types';

export type ASTNode =
  | { type: 'VAR'; name: string }
  | { type: 'CONST'; value: 0 | 1 }
  | { type: 'NOT'; child: ASTNode }
  | { type: 'AND'; left: ASTNode; right: ASTNode }
  | { type: 'OR'; left: ASTNode; right: ASTNode }
  | { type: 'XOR'; left: ASTNode; right: ASTNode }
  | { type: 'NAND'; left: ASTNode; right: ASTNode }
  | { type: 'NOR'; left: ASTNode; right: ASTNode }
  | { type: 'XNOR'; left: ASTNode; right: ASTNode };

type TokenType =
  | 'VAR'
  | 'CONST'
  | 'NOT'
  | 'AND'
  | 'OR'
  | 'XOR'
  | 'NAND'
  | 'NOR'
  | 'XNOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'PRIME'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
}

export class BooleanParser {
  private tokens: Token[] = [];
  private current = 0;

  public static tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const str = input.trim();

    while (i < str.length) {
      const char = str[i];

      // Whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Single char operators
      if (char === '(') {
        tokens.push({ type: 'LPAREN', value: '(' });
        i++;
        continue;
      }
      if (char === ')') {
        tokens.push({ type: 'RPAREN', value: ')' });
        i++;
        continue;
      }
      if (char === "'" || char === "’" || char === "`") {
        tokens.push({ type: 'PRIME', value: "'" });
        i++;
        continue;
      }
      if (char === '+' || char === '∨' || char === '|') {
        tokens.push({ type: 'OR', value: '+' });
        i++;
        continue;
      }
      if (char === '*' || char === '·' || char === '•' || char === '&' || char === '∧') {
        tokens.push({ type: 'AND', value: '*' });
        i++;
        continue;
      }
      if (char === '^' || char === '⊕') {
        tokens.push({ type: 'XOR', value: '^' });
        i++;
        continue;
      }
      if (char === '!' || char === '~' || char === '¬') {
        tokens.push({ type: 'NOT', value: '!' });
        i++;
        continue;
      }
      if (char === '0' || char === '1') {
        tokens.push({ type: 'CONST', value: char });
        i++;
        continue;
      }

      // Word operators or identifiers
      if (/[a-zA-Z_]/.test(char)) {
        let ident = '';
        while (i < str.length && /[a-zA-Z0-9_]/.test(str[i])) {
          ident += str[i];
          i++;
        }
        const upper = ident.toUpperCase();
        if (upper === 'AND') tokens.push({ type: 'AND', value: 'AND' });
        else if (upper === 'OR') tokens.push({ type: 'OR', value: 'OR' });
        else if (upper === 'NOT') tokens.push({ type: 'NOT', value: 'NOT' });
        else if (upper === 'XOR') tokens.push({ type: 'XOR', value: 'XOR' });
        else if (upper === 'NAND') tokens.push({ type: 'NAND', value: 'NAND' });
        else if (upper === 'NOR') tokens.push({ type: 'NOR', value: 'NOR' });
        else if (upper === 'XNOR') tokens.push({ type: 'XNOR', value: 'XNOR' });
        else {
          // If identifier is multi-char letters like AB, treat each letter as a variable if all uppercase single letters
          if (/^[A-Za-z]{2,}$/.test(ident) && !ident.includes('_')) {
            for (const ch of ident) {
              tokens.push({ type: 'VAR', value: ch.toUpperCase() });
            }
          } else {
            tokens.push({ type: 'VAR', value: ident.toUpperCase() });
          }
        }
        continue;
      }

      // If unrecognized, skip
      i++;
    }

    tokens.push({ type: 'EOF', value: '' });

    // Handle implicit AND insertion:
    // e.g. VAR VAR -> VAR AND VAR
    // VAR ( -> VAR AND (
    // ) VAR -> ) AND VAR
    // ) ( -> ) AND (
    // ' VAR -> ' AND VAR
    // CONST VAR -> CONST AND VAR
    const normalized: Token[] = [];
    for (let k = 0; k < tokens.length; k++) {
      const curr = tokens[k];
      normalized.push(curr);
      if (k < tokens.length - 1) {
        const next = tokens[k + 1];
        const canLeft =
          curr.type === 'VAR' ||
          curr.type === 'CONST' ||
          curr.type === 'RPAREN' ||
          curr.type === 'PRIME';
        const canRight =
          next.type === 'VAR' ||
          next.type === 'CONST' ||
          next.type === 'LPAREN' ||
          next.type === 'NOT';

        if (canLeft && canRight) {
          normalized.push({ type: 'AND', value: '*' });
        }
      }
    }

    return normalized;
  }

  constructor(expression: string) {
    this.tokens = BooleanParser.tokenize(expression);
    this.current = 0;
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '' };
  }

  private match(...types: TokenType[]): boolean {
    for (const t of types) {
      if (this.check(t)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  public static parse(input: string): ASTNode {
    const parser = new BooleanParser(input);
    return parser.parse();
  }

  public parse(): ASTNode {
    if (this.tokens.length <= 1) {
      return { type: 'CONST', value: 0 };
    }
    const node = this.expression();
    return node;
  }

  // Precedence levels:
  // expression -> orExpr
  // orExpr -> xorExpr (('OR' | 'NOR') xorExpr)*
  // xorExpr -> andExpr (('XOR' | 'XNOR') andExpr)*
  // andExpr -> unary (('AND' | 'NAND') unary)*
  // unary -> ('NOT')* postfix
  // postfix -> primary ('PRIME')*
  // primary -> CONST | VAR | '(' expression ')'

  private expression(): ASTNode {
    return this.orExpr();
  }

  private orExpr(): ASTNode {
    let expr = this.xorExpr();
    while (this.match('OR', 'NOR')) {
      const op = this.previous().type;
      const right = this.xorExpr();
      if (op === 'OR') {
        expr = { type: 'OR', left: expr, right };
      } else {
        expr = { type: 'NOR', left: expr, right };
      }
    }
    return expr;
  }

  private xorExpr(): ASTNode {
    let expr = this.andExpr();
    while (this.match('XOR', 'XNOR')) {
      const op = this.previous().type;
      const right = this.andExpr();
      if (op === 'XOR') {
        expr = { type: 'XOR', left: expr, right };
      } else {
        expr = { type: 'XNOR', left: expr, right };
      }
    }
    return expr;
  }

  private andExpr(): ASTNode {
    let expr = this.unary();
    while (this.match('AND', 'NAND')) {
      const op = this.previous().type;
      const right = this.unary();
      if (op === 'AND') {
        expr = { type: 'AND', left: expr, right };
      } else {
        expr = { type: 'NAND', left: expr, right };
      }
    }
    return expr;
  }

  private unary(): ASTNode {
    if (this.match('NOT')) {
      const child = this.unary();
      return { type: 'NOT', child };
    }
    return this.postfix();
  }

  private postfix(): ASTNode {
    let expr = this.primary();
    while (this.match('PRIME')) {
      expr = { type: 'NOT', child: expr };
    }
    return expr;
  }

  private primary(): ASTNode {
    if (this.match('CONST')) {
      const val = parseInt(this.previous().value, 10) as 0 | 1;
      return { type: 'CONST', value: val };
    }

    if (this.match('VAR')) {
      return { type: 'VAR', name: this.previous().value };
    }

    if (this.match('LPAREN')) {
      const expr = this.expression();
      if (!this.match('RPAREN')) {
        // missing closing paren, soft handle
      }
      return expr;
    }

    // fallback
    return { type: 'CONST', value: 0 };
  }
}

/**
 * Evaluates an AST with variable assignments
 */
export function evaluateAST(node: ASTNode, values: Record<string, LogicValue>): 0 | 1 {
  switch (node.type) {
    case 'CONST':
      return node.value;
    case 'VAR': {
      const v = values[node.name];
      return v === 1 ? 1 : 0;
    }
    case 'NOT':
      return evaluateAST(node.child, values) === 1 ? 0 : 1;
    case 'AND': {
      const l = evaluateAST(node.left, values);
      const r = evaluateAST(node.right, values);
      return (l === 1 && r === 1) ? 1 : 0;
    }
    case 'OR': {
      const l = evaluateAST(node.left, values);
      const r = evaluateAST(node.right, values);
      return (l === 1 || r === 1) ? 1 : 0;
    }
    case 'XOR': {
      const l = evaluateAST(node.left, values);
      const r = evaluateAST(node.right, values);
      return (l !== r) ? 1 : 0;
    }
    case 'NAND': {
      const l = evaluateAST(node.left, values);
      const r = evaluateAST(node.right, values);
      return !(l === 1 && r === 1) ? 1 : 0;
    }
    case 'NOR': {
      const l = evaluateAST(node.left, values);
      const r = evaluateAST(node.right, values);
      return !(l === 1 || r === 1) ? 1 : 0;
    }
    case 'XNOR': {
      const l = evaluateAST(node.left, values);
      const r = evaluateAST(node.right, values);
      return (l === r) ? 1 : 0;
    }
  }
}

/**
 * Extracts all unique variable names from an AST
 */
export function extractVariables(node: ASTNode): string[] {
  const vars = new Set<string>();

  function traverse(n: ASTNode) {
    if (n.type === 'VAR') {
      vars.add(n.name);
    } else if (n.type === 'NOT') {
      traverse(n.child);
    } else if ('left' in n && 'right' in n) {
      traverse(n.left);
      traverse(n.right);
    }
  }

  traverse(node);
  return Array.from(vars).sort();
}

/**
 * Evaluates an expression string directly with input values
 */
export function evaluateBooleanExpression(
  expression: string,
  values: Record<string, LogicValue>
): 0 | 1 {
  try {
    const parser = new BooleanParser(expression);
    const ast = parser.parse();
    return evaluateAST(ast, values);
  } catch {
    return 0;
  }
}

/**
 * Formats AST to readable string with selected notation
 */
export function formatExpression(
  node: ASTNode,
  notation: 'prime' | 'bar' | 'symbol' = 'prime'
): string {
  switch (node.type) {
    case 'CONST':
      return `${node.value}`;
    case 'VAR':
      return node.name;
    case 'NOT': {
      const inner = formatExpression(node.child, notation);
      const needsParens = node.child.type !== 'VAR' && node.child.type !== 'CONST';
      const target = needsParens ? `(${inner})` : inner;
      if (notation === 'prime') return `${target}'`;
      if (notation === 'bar') return `\\overline{${target}}`;
      return `¬${target}`;
    }
    case 'AND': {
      const l = formatExpression(node.left, notation);
      const r = formatExpression(node.right, notation);
      return `${l} · ${r}`;
    }
    case 'OR': {
      const l = formatExpression(node.left, notation);
      const r = formatExpression(node.right, notation);
      return `${l} + ${r}`;
    }
    case 'XOR': {
      const l = formatExpression(node.left, notation);
      const r = formatExpression(node.right, notation);
      return `${l} ⊕ ${r}`;
    }
    case 'NAND': {
      const l = formatExpression(node.left, notation);
      const r = formatExpression(node.right, notation);
      return notation === 'bar' ? `\\overline{${l} · ${r}}` : `(${l} · ${r})'`;
    }
    case 'NOR': {
      const l = formatExpression(node.left, notation);
      const r = formatExpression(node.right, notation);
      return notation === 'bar' ? `\\overline{${l} + ${r}}` : `(${l} + ${r})'`;
    }
    case 'XNOR': {
      const l = formatExpression(node.left, notation);
      const r = formatExpression(node.right, notation);
      return notation === 'bar' ? `\\overline{${l} ⊕ ${r}}` : `(${l} ⊕ ${r})'`;
    }
  }
}
