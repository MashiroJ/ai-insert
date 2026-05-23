import { describe, expect, it, vi } from 'vitest';

vi.mock('react', () => ({
  createElement: (type: unknown, props: Record<string, unknown>) => ({
    type,
    props,
    key: null,
  }),
}));

vi.mock('next/script', () => ({
  default: function MockScript() {
    return null;
  },
}));

describe('UiInspectScript', () => {
  it('injects an afterInteractive inline script in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { UiInspectScript } = await import('./script.js');

    const element = UiInspectScript() as { props: Record<string, unknown> };

    expect(element.props).toMatchObject({
      id: 'ui-inspect-client',
      strategy: 'afterInteractive',
    });
    expect(element.props.dangerouslySetInnerHTML).toMatchObject({
      __html: expect.stringContaining('http://127.0.0.1:17321'),
    });
    expect(element.props.dangerouslySetInnerHTML).toMatchObject({
      __html: expect.stringContaining('/api/ui-inspect/diana'),
    });
  });

  it('does not inject when disabled', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { UiInspectScript } = await import('./script.js');

    expect(UiInspectScript({ enabled: false })).toBeNull();
  });

  it('does not inject in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { UiInspectScript } = await import('./script.js');

    expect(UiInspectScript()).toBeNull();
  });

  it('passes custom daemon, root, and Diana URL into the client source', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { UiInspectScript } = await import('./script.js');

    const element = UiInspectScript({
      daemonUrl: 'http://localhost:9999',
      root: '/custom/root',
      dianaSpriteUrl: '/custom/diana.webp',
    }) as { props: { dangerouslySetInnerHTML: { __html: string } } };

    expect(element.props.dangerouslySetInnerHTML.__html).toContain('http://localhost:9999');
    expect(element.props.dangerouslySetInnerHTML.__html).toContain('/custom/root');
    expect(element.props.dangerouslySetInnerHTML.__html).toContain('/custom/diana.webp');
  });
});
