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
declare const RUNTIME_EVENT_KINDS: readonly ["console", "window-error", "unhandledrejection"];
type RuntimeEventKind = typeof RUNTIME_EVENT_KINDS[number];
/**
 * Runtime Monitor class
 */
export declare class RuntimeMonitor {
    private options;
    private events;
    private originalConsole;
    private listeners;
    private eventLimit;
    private textLimit;
    constructor(options?: RuntimeMonitorOptions);
    /**
     * Install runtime monitoring
     */
    install(): void;
    /**
     * Uninstall runtime monitoring
     */
    uninstall(): void;
    /**
     * Record a runtime event
     */
    private recordEvent;
    /**
     * Get all captured events
     */
    getEvents(): UiInspectRuntimeEvent[];
    /**
     * Get events filtered by level
     */
    getEventsByLevel(level: 'warn' | 'error'): UiInspectRuntimeEvent[];
    /**
     * Get events filtered by kind
     */
    getEventsByKind(kind: RuntimeEventKind): UiInspectRuntimeEvent[];
    /**
     * Get diagnostics snapshot
     */
    getDiagnostics(): UiInspectDiagnostics;
    /**
     * Clear all captured events
     */
    clear(): void;
    /**
     * Get event count
     */
    getCount(): number;
    /**
     * Check if there are any error events
     */
    hasErrors(): boolean;
    /**
     * Check if there are any warning events
     */
    hasWarnings(): boolean;
    /**
     * Get recent events (last N)
     */
    getRecent(count: number): UiInspectRuntimeEvent[];
    /**
     * Get events since a timestamp
     */
    getEventsSince(timestamp: number): UiInspectRuntimeEvent[];
    /**
     * Format message from args
     */
    private formatMessage;
    /**
     * Extract stack trace from args
     */
    private extractStack;
    /**
     * Truncate text to max length
     */
    private truncateText;
    /**
     * Generate unique event ID
     */
    private generateId;
    /**
     * Format value for display
     */
    static formatValue(value: unknown): string;
    /**
     * Redact sensitive information from text
     */
    static redactSensitive(text: string): string;
    /**
     * Check if text might contain sensitive information
     */
    static mightContainSensitive(text: string): boolean;
}
export {};
