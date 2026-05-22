/**
 * Browser runtime monitor client source.
 *
 * This function generates a JavaScript string that is injected into the
 * browser client at build time. It captures console errors/warnings and
 * window error events for the troubleshoot workflow.
 */

export interface RuntimeMonitorClientSourceOptions {
  eventLimit?: number;
  textLimit?: number;
}

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
    const message = truncateText(redactRuntimeText(text || kind), RUNTIME_EVENT_TEXT_LIMIT);
    const normalizedStack = truncateText(redactRuntimeText(stack), RUNTIME_EVENT_TEXT_LIMIT);
    const url = window.location.href;
    const timestamp = Date.now();
    const existing = runtimeEvents.find((event) =>
      event.kind === kind &&
      event.level === level &&
      event.message === message &&
      event.stack === normalizedStack &&
      event.url === url
    );
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      existing.timestamp = timestamp;
      existing.lastSeenAt = timestamp;
      const index = runtimeEvents.indexOf(existing);
      if (index >= 0) {
        runtimeEvents.splice(index, 1);
        runtimeEvents.push(existing);
      }
    } else {
      runtimeEvents.push({
      id: 'runtime-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      kind,
      level,
      message,
      stack: normalizedStack,
      timestamp,
      lastSeenAt: timestamp,
      count: 1,
      url
      });
    }
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
