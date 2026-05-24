import { describe, expect, it } from 'vitest';
import type { UiInspectSelection, UiInspectSession } from '@ui-inspect/protocol';
import { getMcpToolDefinition, latestFrontendRequest, normalizeCompleteFrontendRequestArgs } from './mcp.js';

describe('complete_frontend_request tool', () => {
  it('exposes the required completion-and-wait schema', () => {
    const tool = getMcpToolDefinition('complete_frontend_request') as {
      inputSchema?: unknown;
    } | undefined;
    const schema = tool?.inputSchema as {
      properties?: Record<string, unknown>;
      required?: string[];
    } | undefined;

    expect(tool).toBeTruthy();
    expect(schema?.required).toEqual(['sessionId', 'content', 'afterRequestId']);
    expect(Object.keys(schema?.properties || {})).toEqual(expect.arrayContaining([
      'sessionId',
      'content',
      'afterRequestId',
      'status',
      'timeoutMs',
      'context',
      'sinceTimestamp',
    ]));
  });

  it('defaults completion status to done', () => {
    const result = normalizeCompleteFrontendRequestArgs({
      sessionId: ' session-1 ',
      content: ' finished ',
      afterRequestId: ' message:msg-1 ',
    }, 100_000);

    expect(result).toEqual({
      sessionId: 'session-1',
      content: 'finished',
      afterRequestId: 'message:msg-1',
      status: 'done',
      context: 80,
      timeoutMs: 600_000,
      sinceTimestamp: 70_000,
    });
  });

  it('accepts failed as a completion status', () => {
    const result = normalizeCompleteFrontendRequestArgs({
      sessionId: 'session-1',
      content: 'could not apply safely',
      afterRequestId: 'selection:sel-1',
      status: 'failed',
    }, 100_000);

    expect(result.status).toBe('failed');
  });

  it('requires afterRequestId to avoid replaying the same request', () => {
    expect(() => normalizeCompleteFrontendRequestArgs({
      sessionId: 'session-1',
      content: 'finished',
    }, 100_000)).toThrow('afterRequestId is required');
  });

  it('rejects non-terminal completion statuses', () => {
    expect(() => normalizeCompleteFrontendRequestArgs({
      sessionId: 'session-1',
      content: 'finished',
      afterRequestId: 'message:msg-1',
      status: 'working',
    }, 100_000)).toThrow('status must be done or failed');
  });
});

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
    expect(result?.requestId).toBe('message:msg-1');
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
    expect(result?.requestId).toBe('selection:selection-1');
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
    expect(result?.requestId).toBe('selection:selection-1');
  });

  it('ignores stale selections', () => {
    const session = makeSession({
      updatedAt: 500,
      messages: [],
      selection: makeSelection({ timestamp: 500 }),
    });

    expect(latestFrontendRequest({ sessions: [session] }, 1000)).toBeNull();
  });

  it('returns requestId with message: prefix for real user messages', () => {
    const session = makeSession({
      updatedAt: 3000,
      messages: [{
        id: 'msg-42',
        sessionId: 'session-1',
        role: 'user',
        content: 'change the color',
        timestamp: 2500,
        selectionId: 'selection-1',
      }],
    });

    const result = latestFrontendRequest({ sessions: [session] }, 1000);

    expect(result?.requestId).toBe('message:msg-42');
    expect(result?.nextCursor).toBeUndefined();
  });

  it('returns requestId with selection: prefix for sent selection without message', () => {
    const session = makeSession({
      updatedAt: 3000,
      messages: [],
      selection: makeSelection({ id: 'sel-abc', instruction: '' }),
    });

    const result = latestFrontendRequest({ sessions: [session] }, 1000);

    expect(result?.requestId).toBe('selection:sel-abc');
  });

  it('skips already-seen request when afterRequestId matches', () => {
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

    const result = latestFrontendRequest(
      { sessions: [session] },
      1000,
      'message:msg-1',
    );

    expect(result).toBeNull();
  });

  it('returns newer request after cursor with afterRequestId', () => {
    const session = makeSession({
      updatedAt: 4000,
      messages: [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'user',
          content: 'first task',
          timestamp: 2000,
          selectionId: 'selection-1',
        },
        {
          id: 'msg-2',
          sessionId: 'session-1',
          role: 'user',
          content: 'second task',
          timestamp: 3500,
          selectionId: 'selection-1',
        },
      ],
    });

    const result = latestFrontendRequest(
      { sessions: [session] },
      1000,
      'message:msg-1',
    );

    expect(result?.requestId).toBe('message:msg-2');
    expect(result?.message.content).toBe('second task');
  });

  it('does not return same selection request when afterRequestId matches it', () => {
    const session = makeSession({
      updatedAt: 3000,
      messages: [],
      selection: makeSelection({ id: 'sel-x', instruction: '' }),
    });

    const result = latestFrontendRequest(
      { sessions: [session] },
      1000,
      'selection:sel-x',
    );

    expect(result).toBeNull();
  });

  it('returns new selection request after cursor on same session', () => {
    const session1 = makeSession({
      id: 'session-1',
      updatedAt: 2000,
      messages: [],
      selection: makeSelection({ id: 'sel-1', sessionId: 'session-1', instruction: '', timestamp: 2000 }),
    });
    const session2 = makeSession({
      id: 'session-2',
      updatedAt: 4000,
      messages: [],
      selection: makeSelection({ id: 'sel-2', sessionId: 'session-2', instruction: '', timestamp: 4000 }),
    });

    const result = latestFrontendRequest(
      { sessions: [session1, session2] },
      1000,
      'selection:sel-1',
    );

    expect(result?.requestId).toBe('selection:sel-2');
    expect(result?.session.id).toBe('session-2');
  });

  it('returns new selection in same session when current selection has no matching user message', () => {
    const session = makeSession({
      updatedAt: 4000,
      messages: [{
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'first task',
        timestamp: 2000,
        selectionId: 'selection-1',
      }],
      selection: makeSelection({ id: 'selection-2', instruction: '', timestamp: 4000 }),
    });

    const result = latestFrontendRequest(
      { sessions: [session] },
      1000,
      'message:msg-1',
    );

    expect(result?.requestId).toBe('selection:selection-2');
    expect(result?.session.id).toBe('session-1');
  });

  it('skips selection when its id already has a matching user message', () => {
    const session = makeSession({
      updatedAt: 3000,
      messages: [{
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'task for this selection',
        timestamp: 2000,
        selectionId: 'selection-1',
      }],
      selection: makeSelection({ id: 'selection-1', instruction: 'task for this selection', timestamp: 2000 }),
    });

    const result = latestFrontendRequest(
      { sessions: [session] },
      1000,
      'message:msg-1',
    );

    expect(result).toBeNull();
  });

  it('returns requests in chronological order across sessions', () => {
    const sessionA = makeSession({
      id: 'session-a',
      updatedAt: 2000,
      messages: [],
      selection: makeSelection({ id: 'sel-a', sessionId: 'session-a', instruction: '', timestamp: 2000 }),
    });
    const sessionB = makeSession({
      id: 'session-b',
      updatedAt: 4000,
      messages: [{
        id: 'msg-b1',
        sessionId: 'session-b',
        role: 'user',
        content: 'task b',
        timestamp: 4000,
        selectionId: 'sel-b',
      }],
      selection: makeSelection({ id: 'sel-b', sessionId: 'session-b', timestamp: 4000 }),
    });
    const sessionC = makeSession({
      id: 'session-c',
      updatedAt: 6000,
      messages: [],
      selection: makeSelection({ id: 'sel-c', sessionId: 'session-c', instruction: '', timestamp: 6000 }),
    });

    const first = latestFrontendRequest({ sessions: [sessionA, sessionB, sessionC] }, 1000);
    expect(first?.requestId).toBe('selection:sel-a');

    const second = latestFrontendRequest(
      { sessions: [sessionA, sessionB, sessionC] },
      1000,
      first!.requestId,
    );
    expect(second?.requestId).toBe('message:msg-b1');

    const third = latestFrontendRequest(
      { sessions: [sessionA, sessionB, sessionC] },
      1000,
      second!.requestId,
    );
    expect(third?.requestId).toBe('selection:sel-c');

    const fourth = latestFrontendRequest(
      { sessions: [sessionA, sessionB, sessionC] },
      1000,
      third!.requestId,
    );
    expect(fourth).toBeNull();
  });

  it('ignores claimed, working, done, and failed sessions without user messages', () => {
    for (const status of ['claimed', 'working', 'done', 'failed'] as const) {
      const session = makeSession({
        updatedAt: 3000,
        status,
        messages: [],
        selection: makeSelection({ instruction: '' }),
      });

      expect(latestFrontendRequest({ sessions: [session] }, 1000)).toBeNull();
    }
  });

  it('ignores assistant replies as request candidates', () => {
    const session = makeSession({
      updatedAt: 4000,
      messages: [
        {
          id: 'msg-user-1',
          sessionId: 'session-1',
          role: 'user',
          content: 'do something',
          timestamp: 2000,
          selectionId: 'selection-1',
        },
        {
          id: 'msg-assistant-1',
          sessionId: 'session-1',
          role: 'assistant',
          content: 'done!',
          timestamp: 3000,
          selectionId: 'selection-1',
        },
      ],
    });

    const result = latestFrontendRequest({ sessions: [session] }, 1000);
    expect(result?.requestId).toBe('message:msg-user-1');
  });

  it('still works with sinceTimestamp when no afterRequestId is given', () => {
    const session = makeSession({
      updatedAt: 3000,
      status: 'done',
      messages: [{
        id: 'msg-old',
        sessionId: 'session-1',
        role: 'user',
        content: 'old task',
        timestamp: 500,
        selectionId: 'selection-1',
      }],
    });

    expect(latestFrontendRequest({ sessions: [session] }, 1000)).toBeNull();
  });

  it('prefers afterRequestId cursor over sinceTimestamp', () => {
    const session = makeSession({
      updatedAt: 4000,
      messages: [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'user',
          content: 'old',
          timestamp: 500,
          selectionId: 'selection-1',
        },
        {
          id: 'msg-2',
          sessionId: 'session-1',
          role: 'user',
          content: 'new',
          timestamp: 3500,
          selectionId: 'selection-1',
        },
      ],
    });

    // sinceTimestamp would exclude msg-1, but afterRequestId=msg-1 should include msg-2
    const result = latestFrontendRequest(
      { sessions: [session] },
      3000,
      'message:msg-1',
    );

    expect(result?.requestId).toBe('message:msg-2');
  });

  it('falls back to sinceTimestamp for unknown afterRequestId cursor', () => {
    const session = makeSession({
      updatedAt: 3000,
      messages: [{
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'task',
        timestamp: 2000,
        selectionId: 'selection-1',
      }],
    });

    // Unknown cursor falls back to sinceTimestamp, so msg-1 at 2000 is excluded by sinceTimestamp=3000
    const result = latestFrontendRequest(
      { sessions: [session] },
      3000,
      'message:unknown-msg',
    );

    expect(result).toBeNull();
  });

  it('returns candidates after sinceTimestamp when cursor is unknown but sinceTimestamp allows them', () => {
    const session = makeSession({
      updatedAt: 3000,
      messages: [{
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'task',
        timestamp: 2000,
        selectionId: 'selection-1',
      }],
    });

    // Unknown cursor falls back to sinceTimestamp=1000, so msg-1 at 2000 passes
    const result = latestFrontendRequest(
      { sessions: [session] },
      1000,
      'message:unknown-msg',
    );

    expect(result?.requestId).toBe('message:msg-1');
  });

  it('returns second request when two requests share the same timestamp', () => {
    const session = makeSession({
      updatedAt: 2000,
      messages: [
        {
          id: 'msg-a',
          sessionId: 'session-1',
          role: 'user',
          content: 'first',
          timestamp: 2000,
          selectionId: 'selection-1',
        },
        {
          id: 'msg-b',
          sessionId: 'session-1',
          role: 'user',
          content: 'second',
          timestamp: 2000,
          selectionId: 'selection-1',
        },
      ],
    });

    const first = latestFrontendRequest({ sessions: [session] }, 1000);
    expect(first?.requestId).toBe('message:msg-a');

    const second = latestFrontendRequest(
      { sessions: [session] },
      1000,
      'message:msg-a',
    );
    expect(second?.requestId).toBe('message:msg-b');

    const third = latestFrontendRequest(
      { sessions: [session] },
      1000,
      'message:msg-b',
    );
    expect(third).toBeNull();
  });

  it('returns selection after message at same timestamp', () => {
    const session = makeSession({
      id: 'session-1',
      updatedAt: 2000,
      messages: [{
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'task',
        timestamp: 2000,
        selectionId: 'selection-1',
      }],
      selection: makeSelection({ id: 'selection-1', sessionId: 'session-1', instruction: 'task', timestamp: 2000 }),
    });

    // selection-1 has a matching user message, so it's not a candidate.
    // After msg-1, nothing remains.
    const result = latestFrontendRequest(
      { sessions: [session] },
      1000,
      'message:msg-1',
    );
    expect(result).toBeNull();
  });

  it('generates synthetic message for target notes as user request', () => {
    const selection = makeSelection({ instruction: '' });
    const session = makeSession({
      updatedAt: 3000,
      messages: [],
      selection,
      targets: [
        { id: 't-1', note: 'resize this', selection },
        { id: 't-2', note: 'move that', selection },
      ],
    });

    const result = latestFrontendRequest({ sessions: [session] }, 1000);

    expect(result?.requestId).toBe('selection:selection-1');
    expect(result?.message.content).toContain('resize this');
    expect(result?.message.content).toContain('move that');
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
