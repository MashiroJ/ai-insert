export declare function detectEditor(requestedEditor?: string): string;
export declare function detectEditors(): Array<{
    id: string;
    label: string;
    available: boolean;
    fallback?: boolean;
}>;
export declare function commandExists(command: string): boolean;
