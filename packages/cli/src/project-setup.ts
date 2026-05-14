import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

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

const require = createRequire(import.meta.url);
const VITE_CONFIG_CANDIDATES = ['vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs'];
const PACKAGE_VERSION = '0.2.1';
const VITE_PLUGIN_SPEC = `@mashiro39/ai-inspect-vite-plugin@${PACKAGE_VERSION}`;

export function ensureProjectIntegration({ project }: EnsureProjectIntegrationOptions): EnsureProjectIntegrationResult {
  const result: EnsureProjectIntegrationResult = {
    project,
    packageJson: existsSync(join(project, 'package.json')),
    viteConfig: null,
    installed: false,
    patched: false,
    alreadyConfigured: false,
    devOnly: true,
    warnings: [],
  };

  if (!result.packageJson) {
    result.warnings.push(`package.json not found: ${project}`);
    return result;
  }

  const configFile = findViteConfig(project);
  result.viteConfig = configFile;
  if (!configFile) {
    if (!hasProjectDependency(project, '@mashiro39/ai-inspect-vite-plugin')) {
      const installed = installProjectPackages(project);
      result.installed = installed;
      if (!installed) result.warnings.push('failed to install @mashiro39/ai-inspect-vite-plugin into the project');
    }
    result.warnings.push('vite.config.ts/js/mts/mjs not found; add aiInspect() manually');
    return result;
  }

  const patch = patchViteConfigFile(configFile);
  result.patched = patch.patched;
  result.alreadyConfigured = patch.alreadyConfigured;
  if (patch.warning) result.warnings.push(patch.warning);

  if (!result.alreadyConfigured && !hasProjectDependency(project, '@mashiro39/ai-inspect-vite-plugin')) {
    const installed = installProjectPackages(project);
    result.installed = installed;
    if (!installed) result.warnings.push('failed to install @mashiro39/ai-inspect-vite-plugin into the project');
  }
  return result;
}

function hasProjectDependency(project: string, name: string): boolean {
  try {
    const packageJson = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return Boolean(packageJson.dependencies?.[name] || packageJson.devDependencies?.[name]);
  } catch {
    return false;
  }
}

function installProjectPackages(project: string): boolean {
  const pluginSpec = process.env.AI_INSPECT_PROJECT_INSTALL_SOURCE === 'local'
    ? packageRoot('@mashiro39/ai-inspect-vite-plugin')
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

function patchViteConfigFile(file: string): { patched: boolean; alreadyConfigured: boolean; warning?: string } {
  let content = readFileSync(file, 'utf8');
  content = content.replace(/^import\s+\{\s*aiInspect\s*\}\s+from\s+['"]@ai-inspect\/vite-plugin['"];\s*\n?/gm, '');
  const hadImport = content.includes('@mashiro39/ai-inspect-vite-plugin');
  const hadCall = /\baiInspect\s*\(/.test(content);
  if (hadImport && hadCall) return { patched: false, alreadyConfigured: true };

  if (!hadImport) {
    const importLine = "import { aiInspect } from '@mashiro39/ai-inspect-vite-plugin';\n";
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
      return { patched: true, alreadyConfigured: false, warning: 'plugins array not found; import was added but aiInspect() must be added manually' };
    }
    const insertAt = pluginsMatch.index + pluginsMatch[0].length;
    content = `${content.slice(0, insertAt)}aiInspect(), ${content.slice(insertAt)}`;
  }

  writeFileSync(file, content);
  return { patched: true, alreadyConfigured: false };
}
