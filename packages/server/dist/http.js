import { trimUrl } from './utils.js';
export function sendJson(res, status, data) {
    const body = JSON.stringify(data);
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
    });
    res.end(body);
}
export async function readJson(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw.trim())
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new Error('invalid JSON body');
    }
}
export function applyCors(req, res) {
    const origin = req.headers.origin;
    if (isLocalOrigin(origin)) {
        res.setHeader('access-control-allow-origin', origin ?? '*');
        res.setHeader('vary', 'origin');
    }
    res.setHeader('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');
    res.setHeader('access-control-allow-private-network', 'true');
}
export function isLocalOrigin(origin) {
    if (!origin)
        return true;
    try {
        const url = new URL(origin);
        return isLocalHostname(url.hostname);
    }
    catch {
        return false;
    }
}
function isLocalHostname(hostname) {
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]')
        return true;
    const parts = hostname.split('.').map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
        return false;
    }
    const [first, second] = parts;
    return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}
export function parseDaemonUrl(daemonUrl) {
    const parsed = trimUrl(daemonUrl);
    try {
        const url = new URL(parsed);
        if (url.protocol !== 'http:') {
            throw new Error(`Invalid daemon URL protocol: ${url.protocol}. Only http:// is supported.`);
        }
        return parsed;
    }
    catch (err) {
        throw new Error(`Invalid daemon URL: ${daemonUrl}`);
    }
}
//# sourceMappingURL=http.js.map