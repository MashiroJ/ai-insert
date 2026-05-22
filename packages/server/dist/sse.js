export function openSessionStream(req, res, sessionId, session, state) {
    res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
    });
    res.write(': connected\n\n');
    let streams = state.sessionStreams.get(sessionId);
    if (!streams) {
        streams = new Set();
        state.sessionStreams.set(sessionId, streams);
    }
    streams.add(res);
    writeSse(res, 'session', session);
    const heartbeat = setInterval(() => {
        if (!res.destroyed)
            res.write(': heartbeat\n\n');
    }, 25000);
    req.on('close', () => {
        clearInterval(heartbeat);
        streams?.delete(res);
        if (streams && streams.size === 0)
            state.sessionStreams.delete(sessionId);
    });
}
export function emitSession(sessionId, state) {
    const session = state.sessions.get(sessionId);
    const streams = state.sessionStreams.get(sessionId);
    if (!session || !streams)
        return;
    for (const res of Array.from(streams)) {
        if (res.destroyed) {
            streams.delete(res);
            continue;
        }
        writeSse(res, 'session', session);
    }
    if (streams.size === 0)
        state.sessionStreams.delete(sessionId);
}
export function writeSse(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}
//# sourceMappingURL=sse.js.map