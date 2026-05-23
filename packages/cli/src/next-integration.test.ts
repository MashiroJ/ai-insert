import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { inspectNextIntegration } from './next-integration.js';

const projects: string[] = [];

afterEach(() => {
  for (const project of projects.splice(0)) {
    rmSync(project, { recursive: true, force: true });
  }
});

describe('inspectNextIntegration', () => {
  it('reports no missing items for a complete App Router integration', () => {
    const project = tempProject({
      dependencies: { next: '^16.0.0' },
      devDependencies: { '@ui-inspect/next': '0.1.16' },
    });
    writeFile(project, 'app/layout.tsx', [
      "import { UiInspectScript } from '@ui-inspect/next';",
      '',
      'export default function RootLayout({ children }) {',
      '  return <html><body>{children}<UiInspectScript /></body></html>;',
      '}',
      '',
    ].join('\n'));
    writeFile(project, 'app/api/ui-inspect/diana/route.ts', "export { GET } from '@ui-inspect/next/app';\n");

    const result = inspectNextIntegration(project, 'app');

    expect(result.router).toBe('app');
    expect(result.hasPackage).toBe(true);
    expect(result.hasScript).toBe(true);
    expect(result.hasRoute).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.scriptFiles).toEqual([join(project, 'app/layout.tsx')]);
    expect(result.routeFiles).toEqual([join(project, 'app/api/ui-inspect/diana/route.ts')]);
    expect(result.snippets.appRouter?.route).toContain('@ui-inspect/next/app');
    expect(result.snippets.pagesRouter).toBeUndefined();
  });

  it('reports missing package, script, and route for an incomplete App Router integration', () => {
    const project = tempProject({ dependencies: { next: '^16.0.0' } });
    writeFile(project, 'src/app/layout.tsx', 'export default function RootLayout({ children }) { return <>{children}</>; }\n');
    writeFile(project, 'src/app/api/ui-inspect/diana/route.ts', "export const dynamic = 'force-dynamic';\n");

    const result = inspectNextIntegration(project, 'app');

    expect(result.hasPackage).toBe(false);
    expect(result.hasScript).toBe(false);
    expect(result.hasRoute).toBe(false);
    expect(result.missing).toEqual(['@ui-inspect/next', 'UiInspectScript', 'diana-route']);
    expect(result.scriptFiles).toEqual([join(project, 'src/app/layout.tsx')]);
    expect(result.routeFiles).toEqual([join(project, 'src/app/api/ui-inspect/diana/route.ts')]);
  });

  it('reports no missing items for a complete Pages Router integration', () => {
    const project = tempProject({
      dependencies: {
        next: '^16.0.0',
        '@ui-inspect/next': '0.1.16',
      },
    });
    writeFile(project, 'pages/_app.tsx', [
      "import { UiInspectScript } from '@ui-inspect/next';",
      '',
      'export default function App({ Component, pageProps }) {',
      '  return <><Component {...pageProps} /><UiInspectScript /></>;',
      '}',
      '',
    ].join('\n'));
    writeFile(project, 'pages/api/ui-inspect/diana.ts', "export { dianaHandler as default } from '@ui-inspect/next/pages';\n");

    const result = inspectNextIntegration(project, 'pages');

    expect(result.router).toBe('pages');
    expect(result.hasPackage).toBe(true);
    expect(result.hasScript).toBe(true);
    expect(result.hasRoute).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.scriptFiles).toEqual([join(project, 'pages/_app.tsx')]);
    expect(result.routeFiles).toEqual([join(project, 'pages/api/ui-inspect/diana.ts')]);
    expect(result.snippets.pagesRouter?.route).toContain('@ui-inspect/next/pages');
    expect(result.snippets.appRouter).toBeUndefined();
  });

  it('reports missing package, script, and route for an incomplete Pages Router integration', () => {
    const project = tempProject({ dependencies: { next: '^16.0.0' } });
    writeFile(project, 'src/pages/_app.tsx', 'export default function App({ Component, pageProps }) { return <Component {...pageProps} />; }\n');
    writeFile(project, 'src/pages/api/ui-inspect/diana.js', "export default function handler() {}\n");

    const result = inspectNextIntegration(project, 'pages');

    expect(result.hasPackage).toBe(false);
    expect(result.hasScript).toBe(false);
    expect(result.hasRoute).toBe(false);
    expect(result.missing).toEqual(['@ui-inspect/next', 'UiInspectScript', 'diana-route']);
    expect(result.scriptFiles).toEqual([join(project, 'src/pages/_app.tsx')]);
    expect(result.routeFiles).toEqual([join(project, 'src/pages/api/ui-inspect/diana.js')]);
  });

  it('returns App and Pages snippets for projects using both routers', () => {
    const project = tempProject({
      dependencies: { next: '^16.0.0', '@ui-inspect/next': '0.1.16' },
    });

    const result = inspectNextIntegration(project, 'both');

    expect(result.snippets.appRouter?.script).toContain('RootLayout');
    expect(result.snippets.appRouter?.route).toContain('@ui-inspect/next/app');
    expect(result.snippets.pagesRouter?.script).toContain('AppProps');
    expect(result.snippets.pagesRouter?.route).toContain('@ui-inspect/next/pages');
  });

  it('returns App and Pages snippets when the Next router is unknown', () => {
    const project = tempProject({ dependencies: { next: '^16.0.0' } });

    const result = inspectNextIntegration(project, 'unknown');

    expect(result.router).toBe('unknown');
    expect(result.snippets.appRouter?.script).toContain('UiInspectScript');
    expect(result.snippets.pagesRouter?.script).toContain('UiInspectScript');
  });
});

function tempProject(packageJson: Record<string, unknown>): string {
  const project = mkdtempSync(join(tmpdir(), 'ui-inspect-next-integration-test-'));
  projects.push(project);
  writeFileSync(join(project, 'package.json'), JSON.stringify(packageJson, null, 2));
  return project;
}

function writeFile(project: string, name: string, content: string): void {
  mkdirSync(join(project, name, '..'), { recursive: true });
  writeFileSync(join(project, name), content);
}
