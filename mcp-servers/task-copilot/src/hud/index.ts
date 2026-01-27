/**
 * Progress HUD - Heads-Up Display for Real-Time Progress
 *
 * Provides real-time status updates for tasks, streams, and agent work.
 * Combines statusline rendering, WebSocket/polling updates, and terminal compatibility.
 *
 * @see PRD-omc-learnings (Stream C: Progress HUD)
 * @module hud
 */

// Statusline exports
export {
  renderStatusline,
  calculateProgress,
  StatuslineUpdater,
  createStatusline,
  type StatuslineOptions,
  type RenderedStatusline,
} from './statusline.js';

// WebSocket client exports
export {
  ProgressWebSocketClient,
  HttpProgressFetcher,
  createProgressClient,
  createProgressClientWithFetcher,
  type ConnectionState,
  type WebSocketClientOptions,
  type ProgressDataFetcher,
} from './websocket-client.js';

// Terminal compatibility exports
export {
  detectTerminalCapabilities,
  getProgressBarStyle,
  renderProgressBar,
  stripAnsi,
  getVisibleWidth,
  safeAnsi,
  colorize,
  TerminalWriter,
  createTerminalWriter,
  fitToWidth,
  UNICODE_PROGRESS_BAR,
  ASCII_PROGRESS_BAR,
  ANSI,
  type TerminalCapabilities,
  type ProgressBarStyle,
} from './terminal-compat.js';

// Re-export types from omc-features
export type {
  StatuslineState,
  ProgressEvent,
  KeyboardShortcut,
  HudConfig,
} from '../types/omc-features.js';
