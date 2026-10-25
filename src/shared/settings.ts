export interface Settings {
  schemaVersion: 1;
  enabled: boolean;
  allowlistedHosts: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  enabled: true,
  allowlistedHosts: [],
};

export function normalizeHost(value: string): string | null {
  const host = value.trim().toLowerCase().replace(/\.$/, '');
  if (host.length > 253 || !/^[a-z0-9.-]+$/.test(host) || host.includes('..')) return null;
  const labels = host.split('.');
  if (labels.length < 2 || labels.some((label) => !label || label.length > 63 || label.startsWith('-') || label.endsWith('-'))) return null;
  return host;
}

export function isAllowlisted(host: string, allowlist: string[]): boolean {
  return allowlist.some((entry) => host === entry || host.endsWith(`.${entry}`));
}

export function parseSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object') return DEFAULT_SETTINGS;
  const input = value as Record<string, unknown>;
  const hosts = Array.isArray(input.allowlistedHosts)
    ? input.allowlistedHosts.filter((host): host is string => typeof host === 'string').map(normalizeHost).filter((host): host is string => host !== null)
    : [];
  return {
    schemaVersion: 1,
    enabled: typeof input.enabled === 'boolean' ? input.enabled : true,
    allowlistedHosts: [...new Set(hosts)],
  };
}
