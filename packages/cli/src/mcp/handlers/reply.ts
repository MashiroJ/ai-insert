import { postMessage } from '@ui-inspect/server';

export async function replyToUserHandler(args: unknown, daemonUrl: string): Promise<unknown> {
  const input = args && typeof args === 'object' ? args as { content?: unknown } : {};
  const content = typeof input.content === 'string' ? input.content.trim() : '';
  if (!content) throw new Error('content is required');
  const message = await postMessage(content, 'assistant', daemonUrl);
  return { ok: true, message };
}
