import { resolve } from 'node:path';
import { ensureProjectIntegration } from './project-setup.js';
import { detectProject } from './project-detector.js';
import { resolveAgentTargets } from './setup/targets/registry.js';
export function setupUiInspect(options) {
    const project = resolve(options.project);
    const target = options.target ?? 'all';
    const dryRun = Boolean(options.dryRun);
    const result = {
        project,
        dryRun,
        target,
        projectIntegration: null,
        agents: [],
        warnings: [],
        nextSteps: [],
    };
    if (target === 'all' || target === 'project') {
        result.projectIntegration = dryRun
            ? dryRunProjectIntegration(project)
            : ensureProjectIntegration({ project });
    }
    if ((target === 'all' || target === 'agent') && options.agent !== 'none') {
        result.agents = resolveAgentTargets(project, options.agent ?? 'auto')
            .map((agent) => agent.install({
            project,
            dryRun,
            hooks: options.hooks !== false,
            mcp: options.mcp !== false,
        }));
    }
    if (result.projectIntegration?.nextSteps.length) {
        result.nextSteps.push(...result.projectIntegration.nextSteps);
    }
    for (const agent of result.agents) {
        result.warnings.push(...agent.warnings);
        result.nextSteps.push(...agent.nextSteps);
    }
    result.warnings.push(...(result.projectIntegration?.warnings ?? []));
    if (result.nextSteps.length === 0) {
        result.nextSteps.push('Start your frontend dev server, open the page, then tell your agent: start ui-inspect.');
    }
    return result;
}
function dryRunProjectIntegration(project) {
    const detected = detectProject(project);
    const planned = {
        project,
        packageJson: detected.packageJson,
        projectType: detected.kind,
        router: detected.next?.router ?? null,
        viteConfig: detected.matchedFiles.find((file) => /vite\.config\./.test(file)) ?? null,
        installed: false,
        patched: false,
        alreadyConfigured: false,
        devOnly: true,
        packageName: packageNameFor(detected.kind),
        missing: [],
        nextSteps: ['dry-run: no project files or packages were changed.'],
        warnings: [...detected.warnings],
    };
    return {
        ...planned,
        warnings: [...planned.warnings, 'dry-run: project files and packages were not changed.'],
    };
}
function packageNameFor(kind) {
    if (kind === 'vite')
        return '@ui-inspect/vite-plugin';
    if (kind === 'next')
        return '@ui-inspect/next';
    if (kind === 'rsbuild')
        return '@ui-inspect/rsbuild-plugin';
    if (kind === 'rspack')
        return '@ui-inspect/rspack-plugin';
    if (kind === 'webpack')
        return '@ui-inspect/webpack-plugin';
    return null;
}
//# sourceMappingURL=setup.js.map