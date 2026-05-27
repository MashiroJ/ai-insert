import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';
export function resolveProjectRoot(input, env = process.env, cwd = process.cwd(), pathDelimiter = delimiter) {
    if (typeof input === 'string' && input.trim())
        return input.trim();
    const raw = env.WORKSPACE_FOLDER_PATHS;
    if (raw) {
        const splitters = ['\n', ',', pathDelimiter];
        let paths = [raw];
        for (const splitter of splitters) {
            paths = paths.flatMap((p) => p.split(splitter));
        }
        paths = paths.map((p) => p.trim()).filter(Boolean);
        const withPackageJson = paths.find((p) => existsSync(join(p, 'package.json')));
        if (withPackageJson)
            return withPackageJson;
        if (paths.length > 0)
            return paths[0];
    }
    return cwd;
}
//# sourceMappingURL=project-root.js.map