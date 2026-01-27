/**
 * Terminal Compatibility Layer for Progress HUD
 *
 * Detects terminal capabilities and provides fallback rendering options.
 * Handles color support, unicode, ANSI escape sequences, and terminal width.
 *
 * @see PRD-omc-learnings (Stream C: Progress HUD)
 * @module hud/terminal-compat
 */

/**
 * Terminal capability detection result
 */
export interface TerminalCapabilities {
  /** Supports ANSI color codes */
  supportsColor: boolean;

  /** Supports unicode characters */
  supportsUnicode: boolean;

  /** Terminal width in columns */
  width: number;

  /** Terminal height in rows */
  height: number;

  /** Color depth (0, 4, 8, 24) */
  colorDepth: number;

  /** Terminal type (xterm, vt100, etc.) */
  termType: string;

  /** Whether running in CI environment */
  isCI: boolean;

  /** Whether stdout is a TTY */
  isTTY: boolean;
}

/**
 * Progress bar rendering style
 */
export interface ProgressBarStyle {
  /** Character for filled portion */
  filled: string;

  /** Character for empty portion */
  empty: string;

  /** Start cap character */
  start: string;

  /** End cap character */
  end: string;

  /** Width in characters */
  width: number;
}

/**
 * Default unicode progress bar style
 */
export const UNICODE_PROGRESS_BAR: ProgressBarStyle = {
  filled: '█',
  empty: '░',
  start: '[',
  end: ']',
  width: 20,
};

/**
 * ASCII fallback progress bar style
 */
export const ASCII_PROGRESS_BAR: ProgressBarStyle = {
  filled: '#',
  empty: '-',
  start: '[',
  end: ']',
  width: 20,
};

/**
 * Detect terminal capabilities
 */
export function detectTerminalCapabilities(): TerminalCapabilities {
  const isTTY = process.stdout.isTTY || false;
  const termType = process.env.TERM || 'dumb';
  const isCI = detectCI();

  // Detect color support
  const supportsColor = detectColorSupport(isTTY, termType, isCI);

  // Detect unicode support
  const supportsUnicode = detectUnicodeSupport(termType);

  // Detect color depth
  const colorDepth = detectColorDepth(termType, supportsColor);

  // Get terminal dimensions
  const width = process.stdout.columns || 80;
  const height = process.stdout.rows || 24;

  return {
    supportsColor,
    supportsUnicode,
    width,
    height,
    colorDepth,
    termType,
    isCI,
    isTTY,
  };
}

/**
 * Detect if running in CI environment
 */
function detectCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.GITHUB_ACTIONS ||
    process.env.TRAVIS ||
    process.env.CIRCLECI ||
    process.env.JENKINS_URL
  );
}

/**
 * Detect color support
 */
function detectColorSupport(isTTY: boolean, termType: string, isCI: boolean): boolean {
  // No color in non-TTY or CI environments (unless explicitly enabled)
  if (!isTTY && !process.env.FORCE_COLOR) {
    return false;
  }

  if (isCI && !process.env.FORCE_COLOR) {
    return false;
  }

  // Explicit force/disable
  if (process.env.FORCE_COLOR === '0' || process.env.NO_COLOR) {
    return false;
  }

  if (process.env.FORCE_COLOR) {
    return true;
  }

  // Check TERM value
  if (termType === 'dumb') {
    return false;
  }

  if (
    termType.includes('color') ||
    termType.includes('xterm') ||
    termType.includes('screen') ||
    termType === 'vt100'
  ) {
    return true;
  }

  return false;
}

/**
 * Detect unicode support
 */
function detectUnicodeSupport(termType: string): boolean {
  // Check LANG environment variable
  const lang = process.env.LANG || process.env.LC_ALL || '';

  if (lang.toLowerCase().includes('utf-8') || lang.toLowerCase().includes('utf8')) {
    return true;
  }

  // Check terminal type
  if (termType.includes('xterm') || termType.includes('screen')) {
    return true;
  }

  // Default to false for safety
  return false;
}

/**
 * Detect color depth
 */
function detectColorDepth(termType: string, supportsColor: boolean): number {
  if (!supportsColor) {
    return 0;
  }

  // Check for explicit color depth
  if (process.env.COLORTERM === 'truecolor' || process.env.COLORTERM === '24bit') {
    return 24;
  }

  // Check TERM value
  if (termType.includes('256color')) {
    return 8;
  }

  if (termType.includes('color')) {
    return 4;
  }

  return 0;
}

/**
 * Get appropriate progress bar style based on capabilities
 */
export function getProgressBarStyle(capabilities: TerminalCapabilities): ProgressBarStyle {
  if (capabilities.supportsUnicode) {
    return UNICODE_PROGRESS_BAR;
  }

  return ASCII_PROGRESS_BAR;
}

/**
 * Render a progress bar
 */
export function renderProgressBar(
  percent: number,
  style?: ProgressBarStyle
): string {
  // Guard against undefined/null style being explicitly passed
  const effectiveStyle = style ?? ASCII_PROGRESS_BAR;

  const clampedPercent = Math.max(0, Math.min(100, percent));
  const filledWidth = Math.round((clampedPercent / 100) * effectiveStyle.width);
  const emptyWidth = effectiveStyle.width - filledWidth;

  const filled = effectiveStyle.filled.repeat(filledWidth);
  const empty = effectiveStyle.empty.repeat(emptyWidth);

  return `${effectiveStyle.start}${filled}${empty}${effectiveStyle.end}`;
}

/**
 * ANSI escape code utilities
 */
export const ANSI = {
  /** Clear entire line */
  clearLine: '\x1b[2K',

  /** Move cursor to start of line */
  cursorStart: '\x1b[0G',

  /** Move cursor up N lines */
  cursorUp: (n: number) => `\x1b[${n}A`,

  /** Move cursor down N lines */
  cursorDown: (n: number) => `\x1b[${n}B`,

  /** Hide cursor */
  hideCursor: '\x1b[?25l',

  /** Show cursor */
  showCursor: '\x1b[?25h',

  /** Reset all formatting */
  reset: '\x1b[0m',

  /** Color codes */
  colors: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
  },

  /** Background color codes */
  bgColors: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
  },
} as const;

/**
 * Strip ANSI escape codes from text
 */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Get visible width of text (excluding ANSI codes)
 */
export function getVisibleWidth(text: string): number {
  return stripAnsi(text).length;
}

/**
 * Safely apply ANSI codes based on capabilities
 */
export function safeAnsi(
  code: string,
  capabilities: TerminalCapabilities
): string {
  if (!capabilities.supportsColor) {
    return '';
  }

  return code;
}

/**
 * Colorize text with fallback
 */
export function colorize(
  text: string,
  color: keyof typeof ANSI.colors,
  capabilities: TerminalCapabilities
): string {
  if (!capabilities.supportsColor) {
    return text;
  }

  return `${ANSI.colors[color]}${text}${ANSI.reset}`;
}

/**
 * Create a terminal writer with capability awareness
 */
export class TerminalWriter {
  private capabilities: TerminalCapabilities;
  private progressBarStyle: ProgressBarStyle;

  constructor(capabilities?: TerminalCapabilities) {
    this.capabilities = capabilities || detectTerminalCapabilities();
    this.progressBarStyle = getProgressBarStyle(this.capabilities);
  }

  /**
   * Write text to stdout
   */
  write(text: string): void {
    process.stdout.write(text);
  }

  /**
   * Write line to stdout
   */
  writeLine(text: string = ''): void {
    process.stdout.write(text + '\n');
  }

  /**
   * Clear current line
   */
  clearLine(): void {
    if (this.capabilities.isTTY) {
      this.write(ANSI.clearLine + ANSI.cursorStart);
    }
  }

  /**
   * Update line (clear and rewrite)
   */
  updateLine(text: string): void {
    this.clearLine();
    this.write(text);
  }

  /**
   * Render progress bar
   */
  renderProgress(percent: number): string {
    return renderProgressBar(percent, this.progressBarStyle);
  }

  /**
   * Colorize text
   */
  colorize(text: string, color: keyof typeof ANSI.colors): string {
    return colorize(text, color, this.capabilities);
  }

  /**
   * Get capabilities
   */
  getCapabilities(): TerminalCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Check if terminal supports feature
   */
  supports(feature: 'color' | 'unicode' | 'tty'): boolean {
    switch (feature) {
      case 'color':
        return this.capabilities.supportsColor;
      case 'unicode':
        return this.capabilities.supportsUnicode;
      case 'tty':
        return this.capabilities.isTTY;
      default:
        return false;
    }
  }
}

/**
 * Create a terminal writer instance
 */
export function createTerminalWriter(
  capabilities?: TerminalCapabilities
): TerminalWriter {
  return new TerminalWriter(capabilities);
}

/**
 * Format text to fit terminal width with ellipsis
 */
export function fitToWidth(
  text: string,
  maxWidth: number,
  ellipsis: string = '...'
): string {
  const visibleWidth = getVisibleWidth(text);

  if (visibleWidth <= maxWidth) {
    return text;
  }

  // Calculate how much to keep (accounting for ellipsis)
  const keepWidth = maxWidth - ellipsis.length;

  // Strip ANSI, truncate, then re-apply if needed
  const stripped = stripAnsi(text);
  const truncated = stripped.slice(0, keepWidth);

  // Check if original had color codes at start
  const colorMatch = text.match(/^(\x1b\[[0-9;]*m)/);
  if (colorMatch) {
    return colorMatch[1] + truncated + ellipsis + ANSI.reset;
  }

  return truncated + ellipsis;
}
