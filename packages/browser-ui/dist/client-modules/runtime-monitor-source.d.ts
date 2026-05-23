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
export declare function runtimeMonitorClientSource(options?: RuntimeMonitorClientSourceOptions): string;
//# sourceMappingURL=runtime-monitor-source.d.ts.map