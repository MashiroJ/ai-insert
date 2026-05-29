import { completeFrontendRequestFlow, normalizeCompleteFrontendRequestArgs } from '../complete.js';
export async function completeFrontendRequestHandler(args, daemonUrl) {
    const normalized = normalizeCompleteFrontendRequestArgs((args ?? {}), Date.now());
    return await completeFrontendRequestFlow(normalized, daemonUrl);
}
//# sourceMappingURL=complete.js.map