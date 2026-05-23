export type ProjectKind = 'vite' | 'next' | 'rsbuild' | 'rspack' | 'webpack' | 'unknown';
export type NextRouterKind = 'app' | 'pages' | 'both' | 'unknown';
export interface DetectProjectResult {
    project: string;
    packageJson: boolean;
    kind: ProjectKind;
    matchedFiles: string[];
    dependencies: Record<string, string>;
    warnings: string[];
    next?: {
        router: NextRouterKind;
    };
}
export declare function detectProject(project: string): DetectProjectResult;
