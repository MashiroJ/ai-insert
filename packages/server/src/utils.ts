export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && !Array.isArray(value) && typeof value === 'object';
}

export function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function trimUrl(value: string): string {
  return value.replace(/\/$/, '');
}
