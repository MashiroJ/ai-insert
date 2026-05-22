import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DAEMON_PORT,
  DEFAULT_DAEMON_URL,
} from './index.js';

describe('protocol constants', () => {
  it('DEFAULT_DAEMON_PORT is 17321', () => {
    expect(DEFAULT_DAEMON_PORT).toBe(17321);
  });

  it('DEFAULT_DAEMON_URL includes the port', () => {
    expect(DEFAULT_DAEMON_URL).toBe('http://127.0.0.1:17321');
  });
});
