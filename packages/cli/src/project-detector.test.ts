import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { detectProject } from './project-detector.js';

const root = resolve(new URL('../../..', import.meta.url).pathname);
const examples = join(root, 'examples');
const tempProjects: string[] = [];

describe('detectProject', () => {
  afterEach(() => {
    for (const project of tempProjects.splice(0)) {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('detects a Vite project from config and dependencies', () => {
    const project = join(examples, 'vite-vue3');
    const result = detectProject(project);

    expect(result).toMatchObject({
      project,
      packageJson: true,
      kind: 'vite',
      warnings: [],
    });
    expect(result.matchedFiles).toContain(join(project, 'vite.config.ts'));
    expect(result.dependencies.vite).toBeDefined();
    expect(result.next).toBeUndefined();
  });

  it('detects an Rspack project from config and dependencies', () => {
    const project = join(examples, 'rspack-vue3');
    const result = detectProject(project);

    expect(result.kind).toBe('rspack');
    expect(result.matchedFiles).toContain(join(project, 'rspack.config.js'));
    expect(result.dependencies['@rspack/core']).toBeDefined();
  });

  it('detects an Rsbuild project from config and dependencies', () => {
    const project = join(examples, 'rsbuild-vue3');
    const result = detectProject(project);

    expect(result.kind).toBe('rsbuild');
    expect(result.matchedFiles).toContain(join(project, 'rsbuild.config.ts'));
    expect(result.dependencies['@rsbuild/core']).toBeDefined();
  });

  it('detects a Next app router project', () => {
    const project = join(examples, 'next-app-router');
    const result = detectProject(project);

    expect(result.kind).toBe('next');
    expect(result.next?.router).toBe('app');
    expect(result.matchedFiles).toContain(join(project, 'next.config.ts'));
    expect(result.matchedFiles).toContain(join(project, 'app'));
    expect(result.dependencies.next).toBeDefined();
  });

  it('detects a Next pages router project', () => {
    const project = join(examples, 'next-pages-router');
    const result = detectProject(project);

    expect(result.kind).toBe('next');
    expect(result.next?.router).toBe('pages');
    expect(result.matchedFiles).toContain(join(project, 'next.config.ts'));
    expect(result.matchedFiles).toContain(join(project, 'pages'));
    expect(result.dependencies.next).toBeDefined();
  });

  it('detects an unknown package project', () => {
    const project = mkdtempSync(join(tmpdir(), 'ui-inspect-unknown-project-'));
    tempProjects.push(project);
    writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'unknown-project', version: '0.0.0' }));

    const result = detectProject(project);

    expect(result).toEqual({
      project,
      packageJson: true,
      kind: 'unknown',
      matchedFiles: [],
      dependencies: {},
      warnings: [],
    });
  });
});
