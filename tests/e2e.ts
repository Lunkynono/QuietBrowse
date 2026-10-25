import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium, type BrowserContext, type Page } from 'playwright';
import type { AppRequest, AppResponse } from '../src/shared/messages';

const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end('<!doctype html><html><body><h1>QuietBrowse test</h1><p id="content">Contenido normal</p><div id="quietbrowse-personal-target">Elemento opcional</div><form><label>Usuario <input name="user"></label><button>Entrar</button></form><video controls id="legitimate-video"></video></body></html>');
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('No se pudo iniciar el servidor de prueba.');
const fixtureUrl = `http://127.0.0.1:${address.port}/`;
const extensionPath = path.resolve('dist');
const profileDir = await mkdtemp(path.join(tmpdir(), 'quietbrowse-e2e-'));
let context: BrowserContext | undefined;

async function send(popup: Page, request: AppRequest): Promise<AppResponse> {
  return popup.evaluate((message) => chrome.runtime.sendMessage(message), request);
}

async function requestFailure(page: Page, url: string): Promise<string | null> {
  let failure: string | null = null;
  const listener = (request: import('playwright').Request) => {
    if (request.url().startsWith(url)) failure = request.failure()?.errorText ?? null;
  };
  page.on('requestfailed', listener);
  await page.evaluate(async (target) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try { await fetch(target, { mode: 'no-cors', signal: controller.signal }); } catch { /* Request failure is captured above. */ }
    finally { clearTimeout(timer); }
  }, url);
  page.off('requestfailed', listener);
  return failure;
}

try {
  context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker', { timeout: 20000 });
  const extensionId = new URL(worker.url()).host;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  const page = await context.newPage();
  await page.goto(fixtureUrl);
  assert.equal(await page.locator('#content').textContent(), 'Contenido normal');

  const status = await send(popup, { type: 'QUIETBROWSE_STATUS' });
  if (status.engineState === 'error') {
    const fetches = await worker.evaluate(async () => Promise.all([0, 2, 3, 9, 18, 19].map(async (id) => {
      const path = `filters/declarative/ruleset_${id}/ruleset_${id}.json`;
      try { const response = await fetch(chrome.runtime.getURL(path)); return { id, ok: response.ok, status: response.status }; }
      catch (error) { return { id, error: String(error) }; }
    })));
    console.error('Filter fetches:', fetches);
  }
  assert.equal(status.engineState, 'active', status.error);
  const enabled = await worker.evaluate(() => chrome.declarativeNetRequest.getEnabledRulesets());
  assert.deepEqual(enabled.sort(), ['ruleset_18', 'ruleset_19', 'ruleset_2', 'ruleset_3', 'ruleset_9']);
  const fixtureTabId = await popup.evaluate(async (url) => (await chrome.tabs.query({})).find((tab) => tab.url === url)?.id, fixtureUrl);
  assert.ok(fixtureTabId, 'Fixture tab ID');

  const adFailure = await requestFailure(page, 'https://ad.doubleclick.net/quietbrowse-test.js');
  const trackerFailure = await requestFailure(page, 'https://www.google-analytics.com/quietbrowse-test.js');
  assert.match(adFailure ?? '', /ERR_BLOCKED_BY_CLIENT/, `Ad request: ${adFailure}`);
  assert.match(trackerFailure ?? '', /ERR_BLOCKED_BY_CLIENT/, `Tracker request: ${trackerFailure}`);
  await popup.waitForFunction(async (tabId) => {
    const result = await chrome.runtime.sendMessage({ type: 'QUIETBROWSE_STATUS', tabId }) as AppResponse;
    return (result.counts?.page ?? 0) >= 2 && (result.counts?.total ?? 0) >= 2;
  }, fixtureTabId, { timeout: 10000 });

  const noCookies = await send(popup, { type: 'QUIETBROWSE_SAVE_SETTINGS', settings: { ...status.settings, hideCookieNotices: false } });
  assert.equal(noCookies.settings.hideCookieNotices, false);
  assert.equal((await worker.evaluate(() => chrome.declarativeNetRequest.getEnabledRulesets())).includes('ruleset_18'), false);
  await send(popup, { type: 'QUIETBROWSE_SAVE_SETTINGS', settings: { ...noCookies.settings, hideCookieNotices: true } });
  assert.equal((await worker.evaluate(() => chrome.declarativeNetRequest.getEnabledRulesets())).includes('ruleset_18'), true);
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  if (process.env.QUIETBROWSE_SCREENSHOTS === '1') {
    await options.setViewportSize({ width: 1200, height: 850 });
    await options.screenshot({ path: path.resolve('dist/options-preview.png'), fullPage: true });
    await popup.setViewportSize({ width: 390, height: 800 });
    await popup.screenshot({ path: path.resolve('dist/popup-preview.png'), fullPage: true });
  }
  await options.getByRole('button', { name: 'Mis webs' }).click();
  assert.equal(await options.getByRole('heading', { name: 'Webs donde no actuamos' }).count(), 1);
  await options.getByRole('button', { name: 'Qué bloquear' }).click();
  await options.getByRole('checkbox', { name: /Rastreadores/ }).uncheck();
  await options.getByRole('status').waitFor();
  assert.equal((await worker.evaluate(() => chrome.declarativeNetRequest.getEnabledRulesets())).includes('ruleset_3'), false);
  await options.getByRole('checkbox', { name: /Rastreadores/ }).check();
  await options.waitForFunction(async () => ((await chrome.storage.local.get('settings')).settings as { blockTrackers: boolean }).blockTrackers === true);
  await popup.waitForFunction(async () => ((await chrome.runtime.sendMessage({ type: 'QUIETBROWSE_STATUS' })) as AppResponse).settings.blockTrackers === true);
  await options.getByRole('button', { name: 'Inicio' }).click();
  await options.getByRole('radio', { name: /Intensivo/ }).check();
  await options.waitForFunction(async () => ((await chrome.storage.local.get('settings')).settings as { profile: string }).profile === 'aggressive');
  assert.equal((await worker.evaluate(() => chrome.declarativeNetRequest.getEnabledRulesets())).includes('ruleset_21'), true);
  await options.getByRole('radio', { name: /Equilibrado/ }).check();
  await options.waitForFunction(async () => ((await chrome.storage.local.get('settings')).settings as { profile: string }).profile === 'balanced');
  assert.equal((await worker.evaluate(() => chrome.declarativeNetRequest.getEnabledRulesets())).includes('ruleset_21'), false);
  await options.getByRole('button', { name: 'Apariencia' }).click();
  await options.getByRole('radio', { name: 'Oscuro' }).check();
  await options.waitForFunction(() => document.querySelector('main')?.getAttribute('data-theme') === 'dark');
  await options.getByRole('radio', { name: 'Azul' }).check();
  await options.waitForFunction(() => document.querySelector('main')?.getAttribute('data-accent') === 'blue');
  await options.getByRole('radio', { name: 'Sistema' }).check();
  await options.getByRole('radio', { name: 'Verde' }).check();

  await popup.evaluate((tabId) => chrome.tabs.sendMessage(tabId, { type: 'QUIETBROWSE_START_PICKER' }), fixtureTabId);
  page.once('dialog', (dialog) => void dialog.accept());
  await page.locator('#quietbrowse-personal-target').click();
  await page.waitForFunction(() => getComputedStyle(document.getElementById('quietbrowse-personal-target')!).display === 'none');
  assert.equal(await page.locator('form input').count(), 1);
  assert.equal(await page.locator('#legitimate-video').count(), 1);
  assert.equal((await send(popup, { type: 'QUIETBROWSE_STATUS' })).settings.customRules.length, 1);

  await context.route('https://www.youtube.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><ytd-display-ad-renderer>Publicidad</ytd-display-ad-renderer><video controls id="player"></video><button id="play">Reproducir</button></body></html>' }));
  const youtubePage = await context.newPage();
  await youtubePage.goto('https://www.youtube.com/watch?v=quietbrowsefixture');
  await youtubePage.waitForFunction(() => getComputedStyle(document.querySelector('ytd-display-ad-renderer')!).display === 'none');
  assert.notEqual(await youtubePage.locator('#player').evaluate((element) => getComputedStyle(element).display), 'none');
  const withRule = await send(popup, { type: 'QUIETBROWSE_STATUS' });
  const youtubePaused = await send(popup, { type: 'QUIETBROWSE_SAVE_SETTINGS', settings: { ...withRule.settings, youtubeFiltering: false } });
  await youtubePage.reload();
  assert.notEqual(await youtubePage.locator('ytd-display-ad-renderer').evaluate((element) => getComputedStyle(element).display), 'none');
  await send(popup, { type: 'QUIETBROWSE_SAVE_SETTINGS', settings: { ...youtubePaused.settings, youtubeFiltering: true } });

  const pausedSite = await send(popup, { type: 'QUIETBROWSE_SET_SITE', host: '127.0.0.1', enabled: false });
  assert.deepEqual(pausedSite.settings.allowlistedHosts, ['127.0.0.1']);
  await page.reload();
  const afterReload = await send(popup, { type: 'QUIETBROWSE_STATUS', tabId: fixtureTabId });
  assert.equal(afterReload.counts?.page, 0);
  assert.ok((afterReload.counts?.total ?? 0) >= 2);
  assert.notEqual(await page.locator('#quietbrowse-personal-target').evaluate((element) => getComputedStyle(element).display), 'none');
  const pausedFailure = await requestFailure(page, 'https://ad.doubleclick.net/quietbrowse-site-paused.js');
  assert.doesNotMatch(pausedFailure ?? '', /ERR_BLOCKED_BY_CLIENT/, `Site pause: ${pausedFailure}`);

  const pausedGlobal = await send(popup, { type: 'QUIETBROWSE_SET_ENABLED', enabled: false });
  assert.equal(pausedGlobal.engineState, 'disabled');
  assert.deepEqual(await worker.evaluate(() => chrome.declarativeNetRequest.getEnabledRulesets()), []);
  await context.close();
  context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  const restartedPopup = await context.newPage();
  await restartedPopup.goto(`chrome-extension://${extensionId}/popup.html`);
  const restartedStatus = await send(restartedPopup, { type: 'QUIETBROWSE_STATUS' });
  assert.equal(restartedStatus.engineState, 'disabled');
  assert.deepEqual(restartedStatus.settings.allowlistedHosts, ['127.0.0.1']);
  assert.ok((restartedStatus.counts?.total ?? 0) >= 2);
  assert.equal((await send(restartedPopup, { type: 'QUIETBROWSE_RESET_COUNTS' })).counts?.total, 0);
  console.log('E2E OK: red, contador y reinicio, listas de cookies, perfil intensivo, ajustes, selector personal, recuperación de YouTube en fixture, excepción por sitio, pausa global y persistencia.');
} finally {
  await context?.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  const resolved = path.resolve(profileDir);
  if (!resolved.startsWith(path.resolve(tmpdir()) + path.sep) || !path.basename(resolved).startsWith('quietbrowse-e2e-')) throw new Error('Ruta temporal inesperada.');
  await rm(resolved, { recursive: true, force: true });
}
