import { describe, it, expect } from 'vitest';
import { parseDaemonUrl, isLocalOrigin } from './http.js';

describe('parseDaemonUrl', () => {
  it('parses a standard http URL', () => {
    expect(parseDaemonUrl('http://127.0.0.1:17321')).toBe('http://127.0.0.1:17321');
  });

  it('strips trailing slash', () => {
    expect(parseDaemonUrl('http://127.0.0.1:17321/')).toBe('http://127.0.0.1:17321');
  });

  it('throws for non-http protocol', () => {
    expect(() => parseDaemonUrl('https://example.com')).toThrow('Invalid daemon URL');
    expect(() => parseDaemonUrl('ftp://host')).toThrow('Invalid daemon URL');
  });

  it('throws for invalid URL', () => {
    expect(() => parseDaemonUrl('not-a-url')).toThrow('Invalid daemon URL');
  });

  it('throws for empty string', () => {
    expect(() => parseDaemonUrl('')).toThrow('Invalid daemon URL');
  });
});

describe('isLocalOrigin', () => {
  it('returns true for undefined origin', () => {
    expect(isLocalOrigin(undefined)).toBe(true);
  });

  it('returns true for localhost', () => {
    expect(isLocalOrigin('http://localhost:3000')).toBe(true);
  });

  it('returns true for 127.0.0.1', () => {
    expect(isLocalOrigin('http://127.0.0.1:3000')).toBe(true);
  });

  it('returns true for ::1', () => {
    expect(isLocalOrigin('http://[::1]:3000')).toBe(true);
  });

  it('returns true for 10.x.x.x (RFC 1918)', () => {
    expect(isLocalOrigin('http://10.0.0.1:3000')).toBe(true);
    expect(isLocalOrigin('http://10.255.255.255:3000')).toBe(true);
  });

  it('returns true for 172.16-31.x.x (RFC 1918)', () => {
    expect(isLocalOrigin('http://172.16.0.1:3000')).toBe(true);
    expect(isLocalOrigin('http://172.31.255.255:3000')).toBe(true);
  });

  it('returns false for 172.15.x.x (outside RFC 1918)', () => {
    expect(isLocalOrigin('http://172.15.0.1:3000')).toBe(false);
  });

  it('returns false for 172.32.x.x (outside RFC 1918)', () => {
    expect(isLocalOrigin('http://172.32.0.1:3000')).toBe(false);
  });

  it('returns true for 192.168.x.x (RFC 1918)', () => {
    expect(isLocalOrigin('http://192.168.1.1:3000')).toBe(true);
    expect(isLocalOrigin('http://192.168.0.100:3000')).toBe(true);
  });

  it('returns false for external origin', () => {
    expect(isLocalOrigin('http://example.com')).toBe(false);
  });

  it('returns false for other public IPs', () => {
    expect(isLocalOrigin('http://8.8.8.8:3000')).toBe(false);
    expect(isLocalOrigin('http://192.169.0.1:3000')).toBe(false);
  });

  it('returns false for garbage input', () => {
    expect(isLocalOrigin('not-a-url')).toBe(false);
  });
});
