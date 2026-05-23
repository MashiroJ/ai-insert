import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

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

interface PackageJsonLike {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const CONFIG_CANDIDATES: Record<Exclude<ProjectKind, 'unknown'>, string[]> = {
  vite: ['vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs', 'vite.config.cjs', 'vite.config.cts'],
  next: ['next.config.ts', 'next.config.mts', 'next.config.js', 'next.config.mjs', 'next.config.cjs'],
  rsbuild: ['rsbuild.config.ts', 'rsbuild.config.mts', 'rsbuild.config.js', 'rsbuild.config.mjs', 'rsbuild.config.cjs'],
  rspack: ['rspack.config.ts', 'rspack.config.mts', 'rspack.config.js', 'rspack.config.mjs', 'rspack.config.cjs'],
  webpack: ['webpack.config.ts', 'webpack.config.mts', 'webpack.config.js', 'webpack.config.mjs', 'webpack.config.cjs'],
};

const DEPENDENCY_CANDIDATES: Record<Exclude<ProjectKind, 'unknown'>, string[]> = {
  vite: ['vite'],
  next: ['next'],
  rsbuild: ['@rsbuild/core', 'rsbuild'],
  rspack: ['@rspack/core', '@rspack/cli', 'rspack'],
  webpack: ['webpack', 'webpack-cli', 'webpack-dev-server'],
};

const KIND_PRIORITY: Exclude<ProjectKind, 'unknown'>[] = ['next', 'rsbuild', 'rspack', 'vite', 'webpack'];
const APP_ROUTER_ROOTS = ['app', 'src/app'];
const PAGES_ROUTER_ROOTS = ['pages', 'src/pages'];
const APP_ROUTER_FILES = ['layout', 'page', 'route', 'default', 'template', 'not-found', 'loading', 'error', 'global-error'];
const PAGES_ROUTER_FILES = ['index', '_app', '_document', '_error'];
const ROUTER_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'mdx'];

export function detectProject(project: string): DetectProjectResult {
  const result: DetectProjectResult = {
    project,
    packageJson: existsSync(join(project, 'package.json')),
    kind: 'unknown',
    matchedFiles: [],
    dependencies: {},
    warnings: [],
  };

  const configMatches = detectConfigFiles(project);
  result.matchedFiles.push(...Object.values(configMatches).flat());

  if (result.packageJson) {
    const packageJson = readPackageJson(project, result.warnings);
    result.dependencies = packageJson ? mergeDependencies(packageJson) : {};
  } else {
    result.warnings.push(`package.json not found: ${project}`);
  }

  result.kind = chooseProjectKind(configMatches, result.dependencies);

  const matchedKinds = KIND_PRIORITY.filter((kind) => configMatches[kind].length > 0);
  if (matchedKinds.length > 1) {
    result.warnings.push(`multiple project config types found: ${matchedKinds.join(', ')}`);
  }

  if (result.kind === 'next') {
    const router = detectNextRouter(project, result.matchedFiles);
    result.next = { router };
    if (router === 'unknown') result.warnings.push('Next project detected, but no app/ or pages/ router entry files were found');
  }

  return result;
}

function detectConfigFiles(project: string): Record<Exclude<ProjectKind, 'unknown'>, string[]> {
  const matches = {} as Record<Exclude<ProjectKind, 'unknown'>, string[]>;
  for (const kind of KIND_PRIORITY) {
    matches[kind] = CONFIG_CANDIDATES[kind].map((name) => join(project, name)).filter((file) => existsSync(file));
  }
  return matches;
}

function readPackageJson(project: string, warnings: string[]): PackageJsonLike | null {
  try {
    return JSON.parse(readFileSync(join(project, 'package.json'), 'utf8')) as PackageJsonLike;
  } catch (error) {
    warnings.push(`failed to read package.json: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function mergeDependencies(packageJson: PackageJsonLike): Record<string, string> {
  return {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  };
}

function chooseProjectKind(
  configMatches: Record<Exclude<ProjectKind, 'unknown'>, string[]>,
  dependencies: Record<string, string>,
): ProjectKind {
  for (const kind of KIND_PRIORITY) {
    if (configMatches[kind].length > 0) return kind;
  }
  for (const kind of KIND_PRIORITY) {
    if (DEPENDENCY_CANDIDATES[kind].some((name) => dependencies[name])) return kind;
  }
  return 'unknown';
}

function detectNextRouter(project: string, matchedFiles: string[]): NextRouterKind {
  const app = findRouterRoot(project, APP_ROUTER_ROOTS, APP_ROUTER_FILES);
  const pages = findRouterRoot(project, PAGES_ROUTER_ROOTS, PAGES_ROUTER_FILES);
  if (app) matchedFiles.push(app);
  if (pages) matchedFiles.push(pages);
  if (app && pages) return 'both';
  if (app) return 'app';
  if (pages) return 'pages';
  return 'unknown';
}

function findRouterRoot(project: string, roots: string[], fileNames: string[]): string | null {
  for (const root of roots) {
    const directory = join(project, root);
    if (!isDirectory(directory)) continue;
    if (hasAnyRouterFile(directory, fileNames)) return directory;
  }
  return null;
}

function hasAnyRouterFile(directory: string, fileNames: string[]): boolean {
  for (const fileName of fileNames) {
    for (const extension of ROUTER_EXTENSIONS) {
      if (existsSync(join(directory, `${fileName}.${extension}`))) return true;
    }
  }
  return false;
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
