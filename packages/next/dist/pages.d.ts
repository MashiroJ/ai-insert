/**
 * Pages Router API handler for Diana sprite.
 */
export interface UiInspectPagesResponse {
    statusCode?: number;
    setHeader(name: string, value: string): void;
    end(body?: Buffer): void;
}
export declare function dianaHandler(_req: unknown, res: UiInspectPagesResponse): void;
//# sourceMappingURL=pages.d.ts.map