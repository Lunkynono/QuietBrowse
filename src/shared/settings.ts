export type Profile = 'balanced' | 'aggressive';
export type Theme = 'system' | 'light' | 'dark';
export interface CustomRule { id: string; host: string; selector: string; enabled: boolean }
export interface Settings {
  schemaVersion: 2;
  enabled: boolean;
  profile: Profile;
  blockAds: boolean;
  blockTrackers: boolean;
  hideCookieNotices: boolean;
  blockDistractions: boolean;
  youtubeFiltering: boolean;
  youtubeCosmeticCleanup: boolean;
  theme: Theme;
  allowlistedHosts: string[];
  customRules: CustomRule[];
}

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 2, enabled: true, profile: 'balanced', blockAds: true,
  blockTrackers: true, hideCookieNotices: true, blockDistractions: true,
  youtubeFiltering: true,
  youtubeCosmeticCleanup: true, theme: 'system', allowlistedHosts: [], customRules: [],
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

export function validSelector(value: string): boolean {
  return value.length <= 240 && (/^#[a-zA-Z_][\w-]{1,100}$/.test(value)
    || /^[a-z][a-z0-9-]*(?:\.[a-zA-Z_][\w-]{2,50}){1,2}$/.test(value));
}

function boolean(input: Record<string, unknown>, key: keyof Settings): boolean {
  return typeof input[key] === 'boolean' ? input[key] as boolean : DEFAULT_SETTINGS[key] as boolean;
}

export function parseSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return structuredClone(DEFAULT_SETTINGS);
  const input = value as Record<string, unknown>;
  const hosts = Array.isArray(input.allowlistedHosts)
    ? input.allowlistedHosts.filter((host): host is string => typeof host === 'string').map(normalizeHost).filter((host): host is string => host !== null)
    : [];
  const customRules: CustomRule[] = [];
  if (Array.isArray(input.customRules)) for (const raw of input.customRules.slice(0, 200)) {
    if (!raw || typeof raw !== 'object') continue;
    const rule = raw as Record<string, unknown>;
    const host = typeof rule.host === 'string' ? normalizeHost(rule.host) : null;
    if (host && typeof rule.id === 'string' && /^[a-f0-9-]{8,64}$/i.test(rule.id)
      && typeof rule.selector === 'string' && validSelector(rule.selector)
      && typeof rule.enabled === 'boolean' && !customRules.some((entry) => entry.id === rule.id)) {
      customRules.push({ id: rule.id, host, selector: rule.selector, enabled: rule.enabled });
    }
  }
  return {
    schemaVersion: 2,
    enabled: boolean(input, 'enabled'),
    profile: input.profile === 'aggressive' ? 'aggressive' : 'balanced',
    blockAds: boolean(input, 'blockAds'),
    blockTrackers: boolean(input, 'blockTrackers'),
    hideCookieNotices: boolean(input, 'hideCookieNotices'),
    blockDistractions: boolean(input, 'blockDistractions'),
    youtubeFiltering: boolean(input, 'youtubeFiltering'),
    youtubeCosmeticCleanup: boolean(input, 'youtubeCosmeticCleanup'),
    theme: input.theme === 'light' || input.theme === 'dark' ? input.theme : 'system',
    allowlistedHosts: [...new Set(hosts)].slice(0, 500),
    customRules,
  };
}

export function parseBackup(value: unknown): Settings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('El archivo no contiene ajustes válidos.');
  const input = value as Record<string, unknown>;
  if (input.schemaVersion !== 2) throw new Error('Versión de copia no compatible.');
  for (const key of ['enabled', 'blockAds', 'blockTrackers', 'hideCookieNotices', 'blockDistractions', 'youtubeFiltering', 'youtubeCosmeticCleanup']) {
    if (typeof input[key] !== 'boolean') throw new Error(`Falta el ajuste ${key}.`);
  }
  if (!['balanced', 'aggressive'].includes(String(input.profile)) || !['system', 'light', 'dark'].includes(String(input.theme))
    || !Array.isArray(input.allowlistedHosts) || !Array.isArray(input.customRules)) throw new Error('La estructura de la copia no es válida.');
  const parsed = parseSettings(value);
  if (parsed.allowlistedHosts.length !== input.allowlistedHosts.length || parsed.customRules.length !== input.customRules.length) throw new Error('La copia contiene dominios o reglas no válidos.');
  return parsed;
}
