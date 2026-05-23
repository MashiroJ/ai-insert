import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const NEXT_PACKAGE = '@ui-inspect/next';
const APP_SCRIPT_CANDIDATES = ['app/layout.tsx', 'app/layout.jsx', 'src/app/layout.tsx', 'src/app/layout.jsx'];
const PAGES_SCRIPT_CANDIDATES = ['pages/_app.tsx', 'pages/_app.jsx', 'src/pages/_app.tsx', 'src/pages/_app.jsx'];
const APP_ROUTE_CANDIDATES = [
    'app/api/ui-inspect/diana/route.ts',
    'app/api/ui-inspect/diana/route.js',
    'src/app/api/ui-inspect/diana/route.ts',
    'src/app/api/ui-inspect/diana/route.js',
];
const PAGES_ROUTE_CANDIDATES = [
    'pages/api/ui-inspect/diana.ts',
    'pages/api/ui-inspect/diana.js',
    'src/pages/api/ui-inspect/diana.ts',
    'src/pages/api/ui-inspect/diana.js',
];
export function inspectNextIntegration(project, router) {
    const families = routerFamilies(router);
    const scriptFiles = existingFiles(project, scriptCandidates(families));
    const routeFiles = existingFiles(project, routeCandidates(families));
    const hasPackage = hasDependency(readPackageJson(project), NEXT_PACKAGE);
    const hasScript = scriptFiles.some((file) => hasUiInspectScript(file));
    const hasRoute = routeFiles.some((file) => hasDianaRoute(file, families));
    const missing = [];
    if (!hasPackage)
        missing.push(NEXT_PACKAGE);
    if (!hasScript)
        missing.push('UiInspectScript');
    if (!hasRoute)
        missing.push('diana-route');
    return {
        project,
        router,
        scriptFiles,
        routeFiles,
        hasPackage,
        hasScript,
        hasRoute,
        missing,
        snippets: snippetsForRouter(router),
    };
}
function routerFamilies(router) {
    if (router === 'app')
        return ['app'];
    if (router === 'pages')
        return ['pages'];
    return ['app', 'pages'];
}
function scriptCandidates(families) {
    return families.flatMap((family) => family === 'app' ? APP_SCRIPT_CANDIDATES : PAGES_SCRIPT_CANDIDATES);
}
function routeCandidates(families) {
    return families.flatMap((family) => family === 'app' ? APP_ROUTE_CANDIDATES : PAGES_ROUTE_CANDIDATES);
}
function existingFiles(project, candidates) {
    return candidates.map((name) => join(project, name)).filter((file) => existsSync(file));
}
function readPackageJson(project) {
    try {
        return JSON.parse(readFileSync(join(project, 'package.json'), 'utf8'));
    }
    catch {
        return null;
    }
}
function hasDependency(packageJson, name) {
    return Boolean(packageJson?.dependencies?.[name] || packageJson?.devDependencies?.[name]);
}
function hasUiInspectScript(file) {
    const content = readFile(file);
    return content.includes('UiInspectScript') && content.includes(NEXT_PACKAGE);
}
function hasDianaRoute(file, families) {
    const content = readFile(file);
    return families.some((family) => family === 'app' ? hasAppDianaRoute(content) : hasPagesDianaRoute(content));
}
function hasAppDianaRoute(content) {
    return /\bexport\s*\{[^}]*\bGET\b[^}]*\}\s*from\s*['"]@ui-inspect\/next\/app['"]/.test(content);
}
function hasPagesDianaRoute(content) {
    return /\bexport\s*\{[^}]*\bdianaHandler\b[^}]*\}\s*from\s*['"]@ui-inspect\/next\/pages['"]/.test(content);
}
function readFile(file) {
    try {
        return readFileSync(file, 'utf8');
    }
    catch {
        return '';
    }
}
function snippetsForRouter(router) {
    if (router === 'app')
        return { appRouter: APP_ROUTER_SNIPPETS };
    if (router === 'pages')
        return { pagesRouter: PAGES_ROUTER_SNIPPETS };
    return {
        appRouter: APP_ROUTER_SNIPPETS,
        pagesRouter: PAGES_ROUTER_SNIPPETS,
    };
}
const APP_ROUTER_SNIPPETS = {
    script: `import { UiInspectScript } from '@ui-inspect/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <UiInspectScript />
      </body>
    </html>
  );
}`,
    route: `export { GET } from '@ui-inspect/next/app';`,
};
const PAGES_ROUTER_SNIPPETS = {
    script: `import { UiInspectScript } from '@ui-inspect/next';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <UiInspectScript />
    </>
  );
}`,
    route: `export { dianaHandler as default } from '@ui-inspect/next/pages';`,
};
//# sourceMappingURL=next-integration.js.map