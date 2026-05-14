export async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function isRecord(value) {
    return value !== null && !Array.isArray(value) && typeof value === 'object';
}
export function stringOr(value, fallback) {
    return typeof value === 'string' ? value : fallback;
}
export function numberOr(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
export function trimUrl(value) {
    return value.replace(/\/$/, '');
}
//# sourceMappingURL=utils.js.map