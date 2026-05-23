import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureProjectIntegration } from './project-setup.js';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('ensureProjectIntegration', () => {
  it('keeps the Vite auto-patch path and legacy fields', () => {
    const project = tempProject({
      dependencies: { vite: '^6.0.0' },
      devDependencies: { '@ui-inspect/vite-plugin': '0.1.16' },
    });
    writeFileSync(join(project, 'vite.config.ts'), [
      "import { defineConfig } from 'vite';",
      '',
      'export default defineConfig({',
      '  plugins: [],',
      '});',
      '',
    ].join('\n'));

    const result = ensureProjectIntegration({ project });

    expect(result.packageJson).toBe(true);
    expect(result.viteConfig).toBe(join(project, 'vite.config.ts'));
    expect(result.installed).toBe(false);
    expect(result.patched).toBe(true);
    expect(result.alreadyConfigured).toBe(false);
    expect(result.devOnly).toBe(true);
    expect(result.projectType).toBe('vite');
    expect(result.packageName).toBe('@ui-inspect/vite-plugin');
    expect(result.snippets).toBeUndefined();
    expect(readFileSync(join(project, 'vite.config.ts'), 'utf8')).toContain('uiInspect(),');
  });

  it('returns complete App Router status for an integrated Next.js project', () => {
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
    ].join('\n'));
    writeFile(project, 'app/api/ui-inspect/diana/route.ts', "export { GET } from '@ui-inspect/next/app';\n");

    const result = ensureProjectIntegration({ project });

    expect(result.projectType).toBe('next');
    expect(result.router).toBe('app');
    expect(result.packageName).toBe('@ui-inspect/next');
    expect(result.missing).toEqual([]);
    expect(result.alreadyConfigured).toBe(true);
    expect(result.nextSteps).toEqual(['Start or keep using your Next.js dev server, open the target page, then select an element with ui-inspect.']);
    expect(result.snippets).toEqual({
      install: expect.stringContaining('pnpm add -D @ui-inspect/next@'),
      appLayout: expect.stringContaining('<UiInspectScript />'),
      appRoute: "export { GET } from '@ui-inspect/next/app';\n",
    });
  });

  it('returns complete Pages Router status for an integrated Next.js project', () => {
    const project = tempProject({
      dependencies: { next: '^16.0.0', '@ui-inspect/next': '0.1.16' },
    });
    writeFile(project, 'pages/_app.tsx', [
      "import { UiInspectScript } from '@ui-inspect/next';",
      '',
      'export default function App({ Component, pageProps }) {',
      '  return <><Component {...pageProps} /><UiInspectScript /></>;',
      '}',
    ].join('\n'));
    writeFile(project, 'pages/api/ui-inspect/diana.ts', "export { dianaHandler as default } from '@ui-inspect/next/pages';\n");

    const result = ensureProjectIntegration({ project });

    expect(result.projectType).toBe('next');
    expect(result.router).toBe('pages');
    expect(result.packageName).toBe('@ui-inspect/next');
    expect(result.missing).toEqual([]);
    expect(result.alreadyConfigured).toBe(true);
    expect(result.nextSteps).toEqual(['Start or keep using your Next.js dev server, open the target page, then select an element with ui-inspect.']);
    expect(result.snippets).toEqual({
      install: expect.stringContaining('pnpm add -D @ui-inspect/next@'),
      pagesApp: expect.stringContaining('<UiInspectScript />'),
      pagesApi: "export { dianaHandler as default } from '@ui-inspect/next/pages';\n",
    });
  });

  it('returns App Router guidance for Next.js without patching user files', () => {
    const project = tempProject({ dependencies: { next: '^16.0.0' } });
    writeFile(project, 'app/layout.tsx', 'export default function RootLayout({ children }) { return <html><body>{children}</body></html>; }');

    const result = ensureProjectIntegration({ project });

    expect(result.projectType).toBe('next');
    expect(result.router).toBe('app');
    expect(result.installed).toBe(false);
    expect(result.patched).toBe(false);
    expect(result.alreadyConfigured).toBe(false);
    expect(result.missing).toEqual(['@ui-inspect/next', 'UiInspectScript', 'diana-route']);
    expect(result.nextSteps.join('\n')).toContain('app/layout.tsx');
    expect(result.nextSteps.join('\n')).toContain('snippet "appRoute"');
    expect(result.snippets).toEqual({
      install: expect.stringContaining('pnpm add -D @ui-inspect/next@'),
      appLayout: expect.stringContaining("import { UiInspectScript } from '@ui-inspect/next';"),
      appRoute: "export { GET } from '@ui-inspect/next/app';\n",
    });
    expect(readFileSync(join(project, 'app/layout.tsx'), 'utf8')).not.toContain('UiInspectScript');
  });

  it('returns Pages Router guidance for Next.js without patching user files', () => {
    const project = tempProject({ dependencies: { next: '^16.0.0' } });
    writeFile(project, 'pages/_app.tsx', 'export default function App({ Component, pageProps }) { return <Component {...pageProps} />; }');

    const result = ensureProjectIntegration({ project });

    expect(result.projectType).toBe('next');
    expect(result.router).toBe('pages');
    expect(result.installed).toBe(false);
    expect(result.patched).toBe(false);
    expect(result.alreadyConfigured).toBe(false);
    expect(result.missing).toEqual(['@ui-inspect/next', 'UiInspectScript', 'diana-route']);
    expect(result.nextSteps.join('\n')).toContain('pages/_app.tsx');
    expect(result.nextSteps.join('\n')).toContain('snippet "pagesApi"');
    expect(result.snippets).toEqual({
      install: expect.stringContaining('pnpm add -D @ui-inspect/next@'),
      pagesApp: expect.stringContaining("import { UiInspectScript } from '@ui-inspect/next';"),
      pagesApi: "export { dianaHandler as default } from '@ui-inspect/next/pages';\n",
    });
    expect(readFileSync(join(project, 'pages/_app.tsx'), 'utf8')).not.toContain('UiInspectScript');
  });

  it('returns manual guidance for unknown projects', () => {
    const project = tempProject({ dependencies: { react: '^19.0.0' } });

    const result = ensureProjectIntegration({ project });

    expect(result.projectType).toBe('unknown');
    expect(result.viteConfig).toBe(null);
    expect(result.installed).toBe(false);
    expect(result.patched).toBe(false);
    expect(result.missing).toEqual(['project-integration']);
    expect(result.nextSteps.join('\n')).toContain('Mount the ui-inspect client script');
  });

  it('returns Rsbuild plugin guidance without patching config', () => {
    const project = tempProject({
      devDependencies: { '@rsbuild/core': '^1.0.0' },
    });
    writeFile(project, 'rsbuild.config.ts', 'export default { plugins: [] };');

    const result = ensureProjectIntegration({ project });

    expect(result.projectType).toBe('rsbuild');
    expect(result.packageName).toBe('@ui-inspect/rsbuild-plugin');
    expect(result.installed).toBe(false);
    expect(result.patched).toBe(false);
    expect(result.missing).toEqual(['@ui-inspect/rsbuild-plugin', 'rsbuild-config']);
    expect(result.nextSteps.join('\n')).toContain('pluginUiInspect');
  });

  it('returns Rspack plugin guidance without patching config', () => {
    const project = tempProject({
      devDependencies: { '@rspack/core': '^1.0.0' },
    });
    writeFile(project, 'rspack.config.js', 'module.exports = { plugins: [] };');

    const result = ensureProjectIntegration({ project });

    expect(result.projectType).toBe('rspack');
    expect(result.packageName).toBe('@ui-inspect/rspack-plugin');
    expect(result.installed).toBe(false);
    expect(result.patched).toBe(false);
    expect(result.missing).toEqual(['@ui-inspect/rspack-plugin', 'rspack-config']);
    expect(result.nextSteps.join('\n')).toContain('uiInspect');
  });
});

function tempProject(packageJson: Record<string, unknown>): string {
  const project = mkdtempSync(join(tmpdir(), 'ui-inspect-cli-test-'));
  roots.push(project);
  writeFileSync(join(project, 'package.json'), JSON.stringify(packageJson, null, 2));
  return project;
}

function writeFile(project: string, name: string, content: string): void {
  mkdirSync(join(project, name, '..'), { recursive: true });
  writeFileSync(join(project, name), content);
}
