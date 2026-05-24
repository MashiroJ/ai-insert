import { describe, expect, it } from 'vitest';
import type { UiInspectSelection, UiInspectSession } from '@ui-inspect/protocol';
import { latestFrontendRequest } from './mcp.js';

describe('latestFrontendRequest', () => {
  it('returns a user message request when one exists', () => {
    const session = makeSession({
      updatedAt: 3000,
      messages: [{
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'make it wider',
        timestamp: 2000,
        selectionId: 'selection-1',
      }],
    });

    const result = latestFrontendRequest({ sessions: [session] }, 1000);

    expect(result?.session.id).toBe('session-1');
    expect(result?.message.content).toBe('make it wider');
  });

  it('treats a sent selection without a user message as a frontend request', () => {
    const session = makeSession({
      updatedAt: 3000,
      messages: [],
      selection: makeSelection({ instruction: '' }),
    });

    const result = latestFrontendRequest({ sessions: [session] }, 1000);

    expect(result?.session.id).toBe('session-1');
    expect(result?.message.content).toBe('Browser selection sent without additional user text.');
    expect(result?.message.selectionId).toBe('selection-1');
  });

  it('uses target notes for a message-free batch request', () => {
    const selection = makeSelection({ instruction: '' });
    const session = makeSession({
      updatedAt: 3000,
      messages: [],
      selection,
      targets: [{
        id: 'target-1',
        note: 'make this compact',
        selection,
      }],
    });

    const result = latestFrontendRequest({ sessions: [session] }, 1000);

    expect(result?.message.content).toContain('Target notes:');
    expect(result?.message.content).toContain('make this compact');
  });

  it('ignores stale selections', () => {
    const session = makeSession({
      updatedAt: 500,
      messages: [],
      selection: makeSelection({ timestamp: 500 }),
    });

    expect(latestFrontendRequest({ sessions: [session] }, 1000)).toBeNull();
  });
});

function makeSession(overrides: Partial<UiInspectSession> = {}): UiInspectSession {
  const selection = overrides.selection ?? makeSelection();
  return {
    id: 'session-1',
    createdAt: 1000,
    updatedAt: 2000,
    status: 'sent',
    mode: 'single',
    selection,
    targets: [{
      id: selection.id,
      note: '',
      selection,
    }],
    messages: [],
    ...overrides,
  };
}

function makeSelection(overrides: Partial<UiInspectSelection> = {}): UiInspectSelection {
  return {
    id: 'selection-1',
    sessionId: 'session-1',
    url: 'http://localhost:5173',
    title: 'Example',
    timestamp: 2000,
    instruction: 'change this',
    framework: 'dom',
    dom: {
      selector: '#app',
      tagName: 'div',
      id: 'app',
      className: '',
      text: 'hello',
      outerHtml: '<div id="app">hello</div>',
      rect: { x: 0, y: 0, width: 100, height: 100 },
      styles: {},
    },
    source: {
      root: '/project',
      file: 'src/App.vue',
      line: null,
      column: null,
    },
    ...overrides,
  };
}
