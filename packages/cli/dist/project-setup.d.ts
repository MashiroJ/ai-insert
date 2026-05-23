import { type NextRouterKind, type ProjectKind } from './project-detector.js';
export interface EnsureProjectIntegrationOptions {
    project: string;
}
export interface EnsureProjectIntegrationResult {
    project: string;
    packageJson: boolean;
    projectType: ProjectKind;
    router: NextRouterKind | null;
    viteConfig: string | null;
    installed: boolean;
    patched: boolean;
    alreadyConfigured: boolean;
    devOnly: true;
    packageName: string | null;
    missing: string[];
    nextSteps: string[];
    snippets?: Record<string, string>;
    warnings: string[];
}
export declare function ensureProjectIntegration({ project }: EnsureProjectIntegrationOptions): EnsureProjectIntegrationResult;
