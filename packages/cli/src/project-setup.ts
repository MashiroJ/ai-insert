import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { inspectNextIntegration, type NextIntegrationInspection } from './next-integration.js';
import { detectProject, type NextRouterKind, type ProjectKind } from './project-detector.js';
import { getVersion } from './version.js';

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

const require = createRequire(import.meta.url);
const VITE_CONFIG_CANDIDATES = ['vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs', 'vite.config.cjs', 'vite.config.cts'];
const PACKAGE_VERSION = getVersion();
const VITE_PLUGIN_SPEC = `@ui-inspect/vite-plugin@${PACKAGE_VERSION}`;
const INTEGRATION_PACKAGES: Record<Exclude<ProjectKind, 'unknown'>, string> = {
  vite: '@ui-inspect/vite-plugin',
  next: '@ui-inspect/next',
  rsbuild: '@ui-inspect/rsbuild-plugin',
  rspack: '@ui-inspect/rspack-plugin',
  webpack: '@ui-inspect/webpack-plugin',
};

export function ensureProjectIntegration({ project }: EnsureProjectIntegrationOptions): EnsureProjectIntegrationResult {
  const detected = detectProject(project);
  const result: EnsureProjectIntegrationResult = {
    project,
    packageJson: detected.packageJson,
    projectType: detected.kind,
    router: null,
    viteConfig: null,
    installed: false,
    patched: false,
    alreadyConfigured: false,
    devOnly: true,
    packageName: null,
    missing: [],
    nextSteps: [],
    warnings: [...detected.warnings],
  };

  if (!result.packageJson) {
    result.nextSteps = manualIntegrationSteps();
    return result;
  }

  if (detected.kind === 'next') {
    return ensureNextIntegration(project, detected.next?.router ?? 'unknown', result);
  }

  const configFile = findViteConfig(project);
  result.viteConfig = configFile;
  if (detected.kind === 'vite') result.packageName = INTEGRATION_PACKAGES.vite;
  if (!configFile) {
    if (detected.kind === 'unknown') {
      result.missing.push('project-integration');
      result.nextSteps = manualIntegrationSteps();
      result.warnings.push('frontend project type not detected; add ui-inspect manually for your framework.');
      return result;
    }

    if (detected.kind !== 'vite') {
      return ensureBundlerGuidance(detected.kind, detected.dependencies, result);
    }

    if (!hasProjectDependency(project, '@ui-inspect/vite-plugin')) {
      const installed = installProjectPackages(project);
      result.installed = installed;
      if (!installed) result.warnings.push('failed to install @ui-inspect/vite-plugin into the project');
    }
    result.warnings.push('vite.config.ts/js/mts/mjs not found; add uiInspect() manually');
    result.missing.push('vite-config');
    result.nextSteps = viteManualSteps();
    return result;
  }

  const patch = patchViteConfigFile(configFile);
  result.patched = patch.patched;
  result.alreadyConfigured = patch.alreadyConfigured;
  if (patch.warning) result.warnings.push(patch.warning);

  if (!result.alreadyConfigured && !hasProjectDependency(project, '@ui-inspect/vite-plugin')) {
    const installed = installProjectPackages(project);
    result.installed = installed;
    if (!installed) result.warnings.push('failed to install @ui-inspect/vite-plugin into the project');
  }
  result.nextSteps = result.alreadyConfigured || result.patched
    ? ['Start or keep using your frontend dev server, open the target page, then select an element with ui-inspect.']
    : viteManualSteps();
  return result;
}

function ensureNextIntegration(
  project: string,
  router: NextRouterKind,
  result: EnsureProjectIntegrationResult,
): EnsureProjectIntegrationResult {
  const integration = inspectNextIntegration(project, router);
  result.projectType = 'next';
  result.router = router;
  result.packageName = INTEGRATION_PACKAGES.next;
  result.snippets = flattenNextSnippets(integration);
  result.missing = integration.missing;
  result.alreadyConfigured = integration.missing.length === 0;

  if (result.missing.length === 0) {
    result.nextSteps = ['Start or keep using your Next.js dev server, open the target page, then select an element with ui-inspect.'];
    return result;
  }

  result.nextSteps = nextIntegrationSteps(router, integration);
  result.warnings.push('Next.js projects are not patched automatically; add the ui-inspect integration manually.');
  return result;
}

function flattenNextSnippets(integration: NextIntegrationInspection): Record<string, string> {
  const snippets: Record<string, string> = {
    install: `pnpm add -D @ui-inspect/next@${PACKAGE_VERSION}`,
  };
  if (integration.snippets.appRouter) {
    snippets.appLayout = integration.snippets.appRouter.script;
    snippets.appRoute = `${integration.snippets.appRouter.route}\n`;
  }
  if (integration.snippets.pagesRouter) {
    snippets.pagesApp = integration.snippets.pagesRouter.script;
    snippets.pagesApi = `${integration.snippets.pagesRouter.route}\n`;
  }
  return snippets;
}

function ensureBundlerGuidance(
  kind: Exclude<ProjectKind, 'vite' | 'next' | 'unknown'>,
  dependencies: Record<string, string>,
  result: EnsureProjectIntegrationResult,
): EnsureProjectIntegrationResult {
  const packageName = INTEGRATION_PACKAGES[kind];
  result.packageName = packageName;
  if (!dependencies[packageName]) result.missing.push(packageName);
  result.missing.push(`${kind}-config`);
  result.nextSteps = bundlerIntegrationSteps(kind, packageName);
  result.warnings.push(`${kind} projects are not patched automatically; add the ui-inspect plugin manually.`);
  return result;
}

interface ProjectPackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readProjectPackage(project: string): ProjectPackageJson | null {
  try {
    return JSON.parse(readFileSync(join(project, 'package.json'), 'utf8')) as ProjectPackageJson;
  } catch {
    return null;
  }
}

function hasProjectDependency(project: string, name: string): boolean {
  return hasDependency(readProjectPackage(project), name);
}

function hasDependency(packageJson: ProjectPackageJson | null, name: string): boolean {
  return Boolean(packageJson?.dependencies?.[name] || packageJson?.devDependencies?.[name]);
}

function installProjectPackages(project: string): boolean {
  const pluginSpec = process.env.UI_INSPECT_PROJECT_INSTALL_SOURCE === 'local'
    ? packageRoot('@ui-inspect/vite-plugin')
    : VITE_PLUGIN_SPEC;
  if (!pluginSpec) return false;
  const manager = detectPackageManager(project);
  const command = manager;
  const args = manager === 'pnpm'
    ? ['add', '-D', pluginSpec]
    : manager === 'yarn'
      ? yarnAddArgs(pluginSpec)
      : ['install', '--save-dev', pluginSpec];
  const result = spawnSync(command, args, {
    cwd: project,
    stdio: 'ignore',
    shell: process.platform === 'win32',
    env: packageManagerEnv(manager),
  });
  return result.status === 0;
}

function yarnAddArgs(pluginSpec: string): string[] {
  if (pluginSpec.startsWith('@mashiro39/')) {
    return ['add', '-D', pluginSpec, '--registry', 'https://registry.npmjs.org'];
  }
  return ['add', '-D', pluginSpec];
}

function packageManagerEnv(manager: 'yarn' | 'pnpm' | 'npm'): NodeJS.ProcessEnv {
  return manager === 'yarn'
    ? { ...process.env, COREPACK_ENABLE_STRICT: '0' }
    : process.env;
}

function detectPackageManager(project: string): 'yarn' | 'pnpm' | 'npm' {
  const packageManager = packageManagerField(project);
  if (packageManager?.startsWith('yarn@')) return 'yarn';
  if (existsSync(join(project, 'yarn.lock'))) return 'yarn';
  if (packageManager?.startsWith('pnpm@')) return 'pnpm';
  if (packageManager?.startsWith('npm@')) return 'npm';
  if (existsSync(join(project, 'pnpm-lock.yaml'))) return 'pnpm';
  return commandExists('yarn') ? 'yarn' : 'npm';
}

function packageManagerField(project: string): string | null {
  try {
    const packageJson = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8')) as { packageManager?: unknown };
    return typeof packageJson.packageManager === 'string' ? packageJson.packageManager : null;
  } catch {
    return null;
  }
}

function commandExists(command: string): boolean {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

function packageRoot(name: string): string | null {
  try {
    return require.resolve(`${name}/package.json`).replace(/[/\\]package\.json$/, '');
  } catch {
    return null;
  }
}

function findViteConfig(project: string): string | null {
  for (const name of VITE_CONFIG_CANDIDATES) {
    const file = join(project, name);
    if (existsSync(file)) return file;
  }
  return null;
}

function nextIntegrationSteps(router: NextRouterKind, integration: NextIntegrationInspection): string[] {
  const install = `Install package ${INTEGRATION_PACKAGES.next}: pnpm add -D @ui-inspect/next@${PACKAGE_VERSION}`;
  const missing = `Missing: ${integration.missing.join(', ')}`;
  if (router === 'app') {
    return [
      missing,
      install,
      'In app/layout.tsx or src/app/layout.tsx, render <UiInspectScript /> in the root layout body. Copy snippet "appLayout" if you need a starting point.',
      'Create app/api/ui-inspect/diana/route.ts or src/app/api/ui-inspect/diana/route.ts for Diana. Copy snippet "appRoute".',
    ];
  }
  if (router === 'pages') {
    return [
      missing,
      install,
      'In pages/_app.tsx or src/pages/_app.tsx, render <UiInspectScript /> alongside the page component. Copy snippet "pagesApp" if you need a starting point.',
      'Create pages/api/ui-inspect/diana.ts or src/pages/api/ui-inspect/diana.ts for Diana. Copy snippet "pagesApi".',
    ];
  }
  return [
    missing,
    install,
    'For App Router, add <UiInspectScript /> to the root layout and add the Diana route handler from "@ui-inspect/next/app". Copy snippets "appLayout" and "appRoute".',
    'For Pages Router, add <UiInspectScript /> to _app and add the Diana API handler from "@ui-inspect/next/pages". Copy snippets "pagesApp" and "pagesApi".',
  ];
}

function bundlerIntegrationSteps(kind: Exclude<ProjectKind, 'vite' | 'next' | 'unknown'>, packageName: string): string[] {
  if (kind === 'rsbuild') {
    return [
      `Install ${packageName}@${PACKAGE_VERSION} as a dev dependency.`,
      'Import { pluginUiInspect } from "@ui-inspect/rsbuild-plugin" in rsbuild.config and add pluginUiInspect() to the plugins array.',
    ];
  }
  return [
    `Install ${packageName}@${PACKAGE_VERSION} as a dev dependency.`,
    `Import { uiInspect } from "${packageName}" in ${kind}.config and add uiInspect() to the plugins array.`,
  ];
}

function viteManualSteps(): string[] {
  return [
    `Install @ui-inspect/vite-plugin@${PACKAGE_VERSION} as a dev dependency.`,
    'Import { uiInspect } from "@ui-inspect/vite-plugin" in vite.config and add uiInspect() to the plugins array.',
  ];
}

function manualIntegrationSteps(): string[] {
  return [
    'Add the ui-inspect package for your frontend framework.',
    'Mount the ui-inspect client script in development only.',
    'Expose the Diana asset route expected by the client integration.',
  ];
}

function patchViteConfigFile(file: string): { patched: boolean; alreadyConfigured: boolean; warning?: string } {
  let content = readFileSync(file, 'utf8');
  content = content.replace(/^import\s+\{\s*uiInspect\s*\}\s+from\s+['"]@ui-inspect\/vite-plugin['"];\s*\n?/gm, '');
  const hadImport = content.includes('@ui-inspect/vite-plugin');
  const hadCall = /\buiInspect\s*\(/.test(content);
  if (hadImport && hadCall) return { patched: false, alreadyConfigured: true };

  if (!hadImport) {
    const importLine = "import { uiInspect } from '@ui-inspect/vite-plugin';\n";
    const imports = [...content.matchAll(/^import\s.+?;\s*$/gm)];
    if (imports.length > 0) {
      const last = imports[imports.length - 1];
      const insertAt = (last.index || 0) + last[0].length;
      content = `${content.slice(0, insertAt)}\n${importLine.trimEnd()}${content.slice(insertAt)}`;
    } else {
      content = importLine + content;
    }
  }

  if (!hadCall) {
    const pluginsMatch = content.match(/plugins\s*:\s*\[/);
    if (!pluginsMatch || pluginsMatch.index === undefined) {
      writeFileSync(file, content);
      return { patched: true, alreadyConfigured: false, warning: 'plugins array not found; import was added but uiInspect() must be added manually' };
    }
    const insertAt = pluginsMatch.index + pluginsMatch[0].length;
    content = `${content.slice(0, insertAt)}uiInspect(), ${content.slice(insertAt)}`;
  }

  writeFileSync(file, content);
  return { patched: true, alreadyConfigured: false };
}
