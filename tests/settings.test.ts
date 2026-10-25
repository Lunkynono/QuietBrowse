import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, isAllowlisted, normalizeHost, parseSettings } from '../src/shared/settings';

describe('settings', () => {
  it('normalizes valid hosts and rejects invalid ones', () => {
    expect(normalizeHost(' Example.COM. ')).toBe('example.com');
    expect(normalizeHost('https://example.com')).toBeNull();
    expect(normalizeHost('bad..example.com')).toBeNull();
  });

  it('matches allowlisted subdomains without matching lookalikes', () => {
    expect(isAllowlisted('news.example.com', ['example.com'])).toBe(true);
    expect(isAllowlisted('fakeexample.com', ['example.com'])).toBe(false);
  });

  it('loads safe defaults and sanitizes stored hosts', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ enabled: false, allowlistedHosts: [' EXAMPLE.com ', 'not/a/host'] })).toEqual({
      schemaVersion: 1, enabled: false, allowlistedHosts: ['example.com'],
    });
  });
});
