export interface EnsureProjectIntegrationOptions {
    project: string;
}
export interface EnsureProjectIntegrationResult {
    project: string;
    packageJson: boolean;
    viteConfig: string | null;
    installed: boolean;
    patched: boolean;
    alreadyConfigured: boolean;
    devOnly: true;
    warnings: string[];
}
export declare function ensureProjectIntegration({ project }: EnsureProjectIntegrationOptions): EnsureProjectIntegrationResult;
