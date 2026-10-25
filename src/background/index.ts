import browser from 'webextension-polyfill';
import { AdguardApi, MESSAGE_HANDLER_NAME, type Configuration } from '@adguard/api-mv3';
import { DEFAULT_SETTINGS, isAllowlisted, normalizeHost, parseBackup, parseSettings, validSelector, type Settings } from '../shared/settings';
import type { AppRequest, AppResponse } from '../shared/messages';
import { selectedFilters } from '../shared/filters';

const STORAGE_KEY = 'settings';
type CookieBridge = {
  remove: (details: unknown) => Promise<null>;
  set: (details: unknown) => Promise<null>;
  getAll: (details: unknown) => Promise<never[]>;
};

function installSafeCookieBridge(): void {
  const browserApi = browser as unknown as { cookies?: Partial<CookieBridge> };
  if (browserApi.cookies?.remove && browserApi.cookies?.set && browserApi.cookies?.getAll) return;
  // Cookie rules remain available for header/cosmetic processing, but direct browser
  // cookie mutation is intentionally disabled when Chrome does not expose the API.
  Object.defineProperty(browserApi, 'cookies', {
    configurable: true,
    value: {
      remove: async () => null,
      set: async () => null,
      getAll: async () => [],
    } satisfies CookieBridge,
  });
}

let api: AdguardApi | null = null;
let initialization: Promise<void> | null = null;
let state: AppResponse['engineState'] = 'loading';
let lastError: string | undefined;
let currentSettings = DEFAULT_SETTINGS;
let mutation = Promise.resolve();

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.cause ? `${error.message}: ${describeError(error.cause)}` : error.message;
}

function configuration(settings: Settings): Configuration {
  return {
    filters: selectedFilters(settings),
    filteringEnabled: settings.enabled,
    allowlist: settings.youtubeFiltering ? settings.allowlistedHosts : [...new Set([...settings.allowlistedHosts, 'youtube.com'])],
    assetsPath: 'filters',
    rules: [],
  };
}

async function readSettings(): Promise<Settings> {
  const saved = await chrome.storage.local.get(STORAGE_KEY);
  return parseSettings(saved[STORAGE_KEY]);
}

async function ensureEngine(): Promise<void> {
  if (initialization) return initialization;
  initialization = (async () => {
    state = 'loading';
    try {
      installSafeCookieBridge();
      currentSettings = await readSettings();
      api = await AdguardApi.create();
      await api.start(configuration(currentSettings));
      state = currentSettings.enabled ? 'active' : 'disabled';
      lastError = undefined;
    } catch (error) {
      state = 'error';
      lastError = describeError(error);
      api = null;
      initialization = null;
      throw error;
    }
  })();
  return initialization;
}

async function updateSettings(next: Settings): Promise<void> {
  await ensureEngine();
  if (!api) throw new Error('El motor de filtros no está disponible.');
  try {
    await api.configure(configuration(next));
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    currentSettings = next;
    state = next.enabled ? 'active' : 'disabled';
    lastError = undefined;
  } catch (error) {
    state = 'error';
    lastError = describeError(error);
    throw error;
  }
}

async function serializeUpdate(createNext: () => Settings): Promise<void> {
  const task = mutation.then(() => updateSettings(createNext()));
  mutation = task.then(() => undefined, () => undefined);
  await task;
}

function response(): AppResponse {
  return { settings: currentSettings, engineState: state, ...(lastError ? { error: lastError } : {}) };
}

async function handleAppMessage(message: AppRequest, sender: browser.Runtime.MessageSender): Promise<AppResponse> {
  if (message.type === 'QUIETBROWSE_STATUS') {
    try { await ensureEngine(); } catch { /* Error is reflected in the status. */ }
    return response();
  }
  await ensureEngine();
  if (message.type === 'QUIETBROWSE_SET_ENABLED' && typeof message.enabled === 'boolean') {
    await serializeUpdate(() => ({ ...currentSettings, enabled: message.enabled }));
    return response();
  }
  if (message.type === 'QUIETBROWSE_SET_SITE' && typeof message.enabled === 'boolean') {
    const host = normalizeHost(message.host);
    if (!host) throw new Error('Dominio no válido.');
    const allowlistedHosts = message.enabled
      ? currentSettings.allowlistedHosts.filter((entry) => !isAllowlisted(host, [entry]))
      : [...new Set([...currentSettings.allowlistedHosts, host])];
    await serializeUpdate(() => ({ ...currentSettings, allowlistedHosts }));
    return response();
  }
  if (message.type === 'QUIETBROWSE_SAVE_SETTINGS') {
    if (!sender.url?.startsWith(browser.runtime.getURL(''))) throw new Error('Origen de solicitud no permitido.');
    const next = parseBackup(message.settings);
    await serializeUpdate(() => next);
    return response();
  }
  if (message.type === 'QUIETBROWSE_ADD_RULE') {
    const senderHost = sender.tab?.url ? normalizeHost(new URL(sender.tab.url).hostname) : null;
    const host = normalizeHost(message.host);
    if (!senderHost || host !== senderHost || !validSelector(message.selector)) throw new Error('Regla o página no válida.');
    await serializeUpdate(() => ({ ...currentSettings, customRules: [...currentSettings.customRules, {
      id: crypto.randomUUID(), host, selector: message.selector, enabled: true,
    }].slice(-200) }));
    return response();
  }
  throw new Error('Solicitud desconocida.');
}

browser.runtime.onMessage.addListener(async (message: unknown, sender: browser.Runtime.MessageSender) => {
  if (!message || typeof message !== 'object') return undefined;
  const candidate = message as Record<string, unknown>;
  if (candidate.handlerName === MESSAGE_HANDLER_NAME) {
    await ensureEngine();
    return api?.getMessageHandler()(message as Parameters<ReturnType<AdguardApi['getMessageHandler']>>[0], sender);
  }
  if (typeof candidate.type !== 'string' || !candidate.type.startsWith('QUIETBROWSE_')) return undefined;
  if (!sender.url?.startsWith(browser.runtime.getURL('')) && candidate.type !== 'QUIETBROWSE_ADD_RULE') throw new Error('Origen de solicitud no permitido.');
  return handleAppMessage(candidate as AppRequest, sender);
});

void ensureEngine().catch((error) => console.error('QuietBrowse: no se pudo iniciar el motor.', error));
