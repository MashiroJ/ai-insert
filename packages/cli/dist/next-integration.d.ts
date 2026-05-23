import type { NextRouterKind } from './project-detector.js';
export type NextIntegrationMissing = '@ui-inspect/next' | 'UiInspectScript' | 'diana-route';
export interface NextIntegrationSnippetSet {
    script: string;
    route: string;
}
export interface NextIntegrationSnippets {
    appRouter?: NextIntegrationSnippetSet;
    pagesRouter?: NextIntegrationSnippetSet;
}
export interface NextIntegrationInspection {
    project: string;
    router: NextRouterKind;
    scriptFiles: string[];
    routeFiles: string[];
    hasPackage: boolean;
    hasScript: boolean;
    hasRoute: boolean;
    missing: NextIntegrationMissing[];
    snippets: NextIntegrationSnippets;
}
export declare function inspectNextIntegration(project: string, router: NextRouterKind): NextIntegrationInspection;
