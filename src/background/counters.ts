import type { RequestBlockingEvent } from '@adguard/api-mv3';

const TOTAL_KEY = 'blockedRequestsTotal';
const PAGE_KEY = 'blockedRequestsByTab';
type Pages = Record<string, number>;

let initialized: Promise<void> | null = null;
let pending = Promise.resolve();
let total = 0;
const pages: Pages = {};
const recentRequests = new Map<number, Set<string>>();

function safeCount(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function load(): Promise<void> {
  if (!initialized) initialized = (async () => {
    const [local, session] = await Promise.all([
      chrome.storage.local.get(TOTAL_KEY),
      chrome.storage.session.get(PAGE_KEY),
    ]);
    total = safeCount(local[TOTAL_KEY]);
    const stored = session[PAGE_KEY];
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      for (const [tabId, value] of Object.entries(stored)) {
        if (/^\d+$/.test(tabId)) pages[tabId] = safeCount(value);
      }
    }
  })();
  return initialized;
}

function enqueue(task: () => Promise<void>): Promise<void> {
  const next = pending.then(async () => { await load(); await task(); });
  pending = next.catch((error) => { console.error('QuietBrowse: no se pudo guardar el contador.', error); });
  return next;
}

export function recordBlocked(event: RequestBlockingEvent): Promise<void> {
  if (!Number.isInteger(event.tabId) || event.tabId < 0 || !event.requestId) return Promise.resolve();
  return enqueue(async () => {
    let seen = recentRequests.get(event.tabId);
    if (!seen) { seen = new Set(); recentRequests.set(event.tabId, seen); }
    if (seen.has(event.requestId)) return;
    if (seen.size >= 300) seen.clear();
    seen.add(event.requestId);
    total += 1;
    const key = String(event.tabId);
    pages[key] = (pages[key] ?? 0) + 1;
    await Promise.all([
      chrome.storage.local.set({ [TOTAL_KEY]: total }),
      chrome.storage.session.set({ [PAGE_KEY]: pages }),
    ]);
  });
}

export function resetPage(tabId: number): Promise<void> {
  if (tabId < 0) return Promise.resolve();
  return enqueue(async () => {
    recentRequests.delete(tabId);
    delete pages[String(tabId)];
    await chrome.storage.session.set({ [PAGE_KEY]: pages });
  });
}

export async function getCounts(tabId?: number): Promise<{ page: number | null; total: number }> {
  await pending;
  await load();
  return { page: typeof tabId === 'number' && tabId >= 0 ? pages[String(tabId)] ?? 0 : null, total };
}

export function resetTotal(): Promise<void> {
  return enqueue(async () => {
    total = 0;
    await chrome.storage.local.set({ [TOTAL_KEY]: total });
  });
}
