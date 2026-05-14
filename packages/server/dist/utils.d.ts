export declare function delay(ms: number): Promise<void>;
export declare function isRecord(value: unknown): value is Record<string, unknown>;
export declare function stringOr(value: unknown, fallback: string): string;
export declare function numberOr(value: unknown, fallback: number): number;
export declare function trimUrl(value: string): string;
