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
export interface UpdateProjectIntegrationOptions {
    project: string;
    dryRun?: boolean;
    tag?: string;
    silent?: boolean;
}
export interface UpdateProjectPackageResult {
    name: string;
    current: string | null;
    dependencyType: 'dependencies' | 'devDependencies' | null;
    target: string;
    command: string;
    args: string[];
    dryRun: boolean;
    updated: boolean;
    error: string | null;
}
export interface UpdateProjectIntegrationResult {
    project: string;
    packageJson: boolean;
    projectType: ProjectKind;
    packageManager: 'yarn' | 'pnpm' | 'npm' | null;
    packages: UpdateProjectPackageResult[];
    warnings: string[];
    nextSteps: string[];
}
export declare function ensureProjectIntegration({ project }: EnsureProjectIntegrationOptions): EnsureProjectIntegrationResult;
export declare function updateProjectIntegrationPackages({ project, dryRun, tag, silent, }: UpdateProjectIntegrationOptions): UpdateProjectIntegrationResult;
