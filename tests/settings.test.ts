import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, isAllowlisted, normalizeHost, parseBackup, parseSettings } from '../src/shared/settings';
import { selectedFilters } from '../src/shared/filters';

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
      ...DEFAULT_SETTINGS, enabled: false, allowlistedHosts: ['example.com'],
    });
  });

  it('selects functional filter lists and keeps a global pause empty', () => {
    expect(selectedFilters(DEFAULT_SETTINGS)).toEqual([2, 9, 3, 18, 19]);
    expect(selectedFilters({ ...DEFAULT_SETTINGS, profile: 'aggressive' })).toContain(21);
    expect(selectedFilters({ ...DEFAULT_SETTINGS, enabled: false })).toEqual([]);
    expect(selectedFilters({ ...DEFAULT_SETTINGS, hideCookieNotices: false })).not.toContain(18);
  });

  it('validates backup versions and custom selectors', () => {
    expect(parseBackup(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
    expect(() => parseBackup({ ...DEFAULT_SETTINGS, schemaVersion: 99 })).toThrow();
    expect(() => parseBackup({ ...DEFAULT_SETTINGS, allowlistedHosts: ['http://bad'] })).toThrow();
    expect(parseSettings({ ...DEFAULT_SETTINGS, customRules: [{ id: 'deadbeef', host: 'example.com', selector: 'div.advert', enabled: true }] }).customRules).toHaveLength(1);
  });
});
