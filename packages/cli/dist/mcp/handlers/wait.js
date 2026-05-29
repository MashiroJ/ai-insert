import { waitForFrontendRequest } from '../wait.js';
export async function waitForFrontendRequestHandler(args, daemonUrl) {
    return await waitForFrontendRequest((args ?? {}), daemonUrl, undefined);
}
//# sourceMappingURL=wait.js.map