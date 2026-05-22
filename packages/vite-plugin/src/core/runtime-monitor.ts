/**
 * Runtime Monitor
 *
 * Captures runtime errors, warnings, and console events for troubleshooting.
 */

import type { UiInspectRuntimeEvent, UiInspectDiagnostics } from '@ui-inspect/protocol';

export interface RuntimeMonitorOptions {
  eventLimit?: number;
  textLimit?: number;
  onError?: (event: UiInspectRuntimeEvent) => void;
}

export interface RuntimeMonitorClientSourceOptions {
  eventLimit?: number;
  textLimit?: number;
}

const RUNTIME_EVENT_KINDS = ['console', 'window-error', 'unhandledrejection'] as const;
type RuntimeEventKind = typeof RUNTIME_EVENT_KINDS[number];

/**
 * Browser client runtime capture source.
 *
 * The Vite plugin injects client-source.ts as a generated browser script, so
 * runtime monitoring must be emitted as source text instead of imported as a
 * normal module at runtime.
 */
export function runtimeMonitorClientSource(options: RuntimeMonitorClientSourceOptions = {}): string {
  const eventLimit = options.eventLimit ?? 20;
  const textLimit = options.textLimit ?? 2000;

  return `
  const RUNTIME_EVENT_LIMIT = ${JSON.stringify(eventLimit)};
  const RUNTIME_EVENT_TEXT_LIMIT = ${JSON.stringify(textLimit)};
  const runtimeEvents = [];

  function installRuntimeCapture() {
    if (window.__UI_INSPECT_RUNTIME_CAPTURED__) return;
    window.__UI_INSPECT_RUNTIME_CAPTURED__ = true;
    const originalError = console.error;
    const originalWarn = console.warn;
    console.error = function(...args) {
      recordRuntimeEvent('console', 'error', args);
      return originalError.apply(this, args);
    };
    console.warn = function(...args) {
      recordRuntimeEvent('console', 'warn', args);
      return originalWarn.apply(this, args);
    };
    window.addEventListener('error', (event) => {
      recordRuntimeEvent('window-error', 'error', [event.message, event.error?.stack || '']);
    });
    window.addEventListener('unhandledrejection', (event) => {
      recordRuntimeEvent('unhandledrejection', 'error', [event.reason]);
    });
  }

  function recordRuntimeEvent(kind, level, args) {
    const text = args.map(formatRuntimeValue).filter(Boolean).join(' ');
    const stack = args.map((item) => item && item.stack ? String(item.stack) : '').find(Boolean) || '';
    runtimeEvents.push({
      id: 'runtime-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      kind,
      level,
      message: truncateText(redactRuntimeText(text || kind), RUNTIME_EVENT_TEXT_LIMIT),
      stack: truncateText(redactRuntimeText(stack), RUNTIME_EVENT_TEXT_LIMIT),
      timestamp: Date.now(),
      url: window.location.href
    });
    while (runtimeEvents.length > RUNTIME_EVENT_LIMIT) runtimeEvents.shift();
    const panel = document.getElementById(PANEL_ID);
    if (panel && activeTaskMode === 'troubleshoot') {
      syncTroubleshootSnapshot();
      renderTroubleshootLogs(panel);
      updateTroubleshootSendState(panel);
    }
  }

  function formatRuntimeValue(value) {
    if (value == null) return String(value);
    if (value instanceof Error) return value.message || String(value);
    if (typeof value === 'string') return value;
    if (['number','boolean','bigint'].includes(typeof value)) return String(value);
    try {
      return JSON.stringify(value, (_key, item) => typeof item === 'function' ? '[Function]' : item);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }

  function redactRuntimeText(value) {
    return String(value || '')
      .replace(/(token|authorization|password|secret|cookie)(["'\\s:=]+)([^\\s"',;&]+)/ig, '$1$2[redacted]')
      .replace(/Bearer\\s+[A-Za-z0-9._~+/-]+=*/g, 'Bearer [redacted]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/ig, '[email]');
  }

  function truncateText(value, max) {
    const text = String(value || '');
    return text.length > max ? text.slice(0, max) + '... [truncated]' : text;
  }
`;
}

/**
 * Runtime Monitor class
 */
export class RuntimeMonitor {
  private events: UiInspectRuntimeEvent[] = [];
  private originalConsole: {
    log?: typeof console.log;
    warn?: typeof console.warn;
    error?: typeof console.error;
  } = {};
  private listeners: Array<() => void> = [];
  private eventLimit: number;
  private textLimit: number;

  constructor(private options: RuntimeMonitorOptions = {}) {
    this.eventLimit = options.eventLimit ?? 50;
    this.textLimit = options.textLimit ?? 2000;
  }

  /**
   * Install runtime monitoring
   */
  install(): void {
    // Capture console methods
    this.originalConsole.warn = console.warn;
    this.originalConsole.error = console.error;

    console.warn = (...args: unknown[]) => {
      this.recordEvent('console', 'warn', args);
      this.originalConsole.warn?.(...args);
    };

    console.error = (...args: unknown[]) => {
      this.recordEvent('console', 'error', args);
      this.originalConsole.error?.(...args);
    };

    // Capture window errors
    const windowErrorHandler = (event: ErrorEvent) => {
      this.recordEvent('window-error', 'error', [event.message, event.error]);
    };

    // Capture unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      this.recordEvent('unhandledrejection', 'error', [event.reason]);
    };

    window.addEventListener('error', windowErrorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    this.listeners.push(
      () => window.removeEventListener('error', windowErrorHandler),
      () => window.removeEventListener('unhandledrejection', rejectionHandler)
    );
  }

  /**
   * Uninstall runtime monitoring
   */
  uninstall(): void {
    // Restore console methods
    if (this.originalConsole.warn) {
      console.warn = this.originalConsole.warn;
    }
    if (this.originalConsole.error) {
      console.error = this.originalConsole.error;
    }

    // Remove event listeners
    for (const cleanup of this.listeners) {
      cleanup();
    }
    this.listeners = [];
  }

  /**
   * Record a runtime event
   */
  private recordEvent(kind: RuntimeEventKind, level: 'warn' | 'error', args: unknown[]): void {
    const message = this.formatMessage(args);
    const stack = this.extractStack(args);

    const event: UiInspectRuntimeEvent = {
      id: this.generateId(),
      kind,
      level,
      message: this.truncateText(message, this.textLimit),
      stack: stack ? this.truncateText(stack, this.textLimit) : undefined,
      timestamp: Date.now(),
      url: window.location.href,
    };

    this.events.push(event);

    // Enforce event limit
    if (this.events.length > this.eventLimit) {
      this.events.shift();
    }

    this.options.onError?.(event);
  }

  /**
   * Get all captured events
   */
  getEvents(): UiInspectRuntimeEvent[] {
    return [...this.events];
  }

  /**
   * Get events filtered by level
   */
  getEventsByLevel(level: 'warn' | 'error'): UiInspectRuntimeEvent[] {
    return this.events.filter((e) => e.level === level);
  }

  /**
   * Get events filtered by kind
   */
  getEventsByKind(kind: RuntimeEventKind): UiInspectRuntimeEvent[] {
    return this.events.filter((e) => e.kind === kind);
  }

  /**
   * Get diagnostics snapshot
   */
  getDiagnostics(): UiInspectDiagnostics {
    return {
      runtimeEvents: [...this.events],
      capturedAt: Date.now(),
      truncated: this.events.length >= this.eventLimit,
    };
  }

  /**
   * Clear all captured events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get event count
   */
  getCount(): number {
    return this.events.length;
  }

  /**
   * Check if there are any error events
   */
  hasErrors(): boolean {
    return this.events.some((e) => e.level === 'error');
  }

  /**
   * Check if there are any warning events
   */
  hasWarnings(): boolean {
    return this.events.some((e) => e.level === 'warn');
  }

  /**
   * Get recent events (last N)
   */
  getRecent(count: number): UiInspectRuntimeEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get events since a timestamp
   */
  getEventsSince(timestamp: number): UiInspectRuntimeEvent[] {
    return this.events.filter((e) => e.timestamp >= timestamp);
  }

  /**
   * Format message from args
   */
  private formatMessage(args: unknown[]): string {
    return args
      .map((arg) => {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'string') return arg;
        if (typeof arg === 'number') return String(arg);
        if (typeof arg === 'boolean') return String(arg);

        // Objects
        try {
          if (arg instanceof Error) {
            return arg.message || arg.toString();
          }
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      })
      .join(' ');
  }

  /**
   * Extract stack trace from args
   */
  private extractStack(args: unknown[]): string | undefined {
    for (const arg of args) {
      if (arg && typeof arg === 'object' && 'stack' in arg) {
        return String(arg.stack);
      }
    }
    return undefined;
  }

  /**
   * Truncate text to max length
   */
  private truncateText(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.slice(0, max - 3) + '...';
  }

  /**
   * Generate unique event ID
   */
  private generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Format value for display
   */
  static formatValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (value instanceof Error) return `Error: ${value.message}`;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') return 'Object';
    return String(value);
  }

  /**
   * Redact sensitive information from text
   */
  static redactSensitive(text: string): string {
    // Redact common sensitive patterns
    const patterns = [
      /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
      /"[^"]*api[_-]?key[^"]*"\s*:\s*"[^"]+"/gi,
      /"[^"]*token[^"]*"\s*:\s*"[^"]+"/gi,
      /"[^"]*password[^"]*"\s*:\s*"[^"]+"/gi,
      /"[^"]*secret[^"]*"\s*:\s*"[^"]+"/gi,
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    ];

    let redacted = text;
    for (const pattern of patterns) {
      redacted = redacted.replace(pattern, '[REDACTED]');
    }

    return redacted;
  }

  /**
   * Check if text might contain sensitive information
   */
  static mightContainSensitive(text: string): boolean {
    const sensitiveKeywords = [
      'password', 'token', 'secret', 'api_key', 'apikey',
      'authorization', 'bearer', 'session', 'cookie',
    ];

    const lower = text.toLowerCase();
    return sensitiveKeywords.some((keyword) => lower.includes(keyword));
  }
}
