import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium, type BrowserContext, type Page } from 'playwright';
import type { AppRequest, AppResponse } from '../src/shared/messages';

const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end('<!doctype html><html><body><h1>QuietBrowse test</h1><p id="content">Contenido normal</p></body></html>');
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
    const fetches = await worker.evaluate(async () => Promise.all([0, 2, 3, 9].map(async (id) => {
      const path = `filters/declarative/ruleset_${id}/ruleset_${id}.json`;
      try { const response = await fetch(chrome.runtime.getURL(path)); return { id, ok: response.ok, status: response.status }; }
      catch (error) { return { id, error: String(error) }; }
    })));
    console.error('Filter fetches:', fetches);
  }
  assert.equal(status.engineState, 'active', status.error);
  const enabled = await worker.evaluate(() => chrome.declarativeNetRequest.getEnabledRulesets());
  assert.deepEqual(enabled.sort(), ['ruleset_2', 'ruleset_3', 'ruleset_9']);

  const adFailure = await requestFailure(page, 'https://ad.doubleclick.net/quietbrowse-test.js');
  const trackerFailure = await requestFailure(page, 'https://www.google-analytics.com/quietbrowse-test.js');
  assert.match(adFailure ?? '', /ERR_BLOCKED_BY_CLIENT/, `Ad request: ${adFailure}`);
  assert.match(trackerFailure ?? '', /ERR_BLOCKED_BY_CLIENT/, `Tracker request: ${trackerFailure}`);

  const pausedSite = await send(popup, { type: 'QUIETBROWSE_SET_SITE', host: '127.0.0.1', enabled: false });
  assert.deepEqual(pausedSite.settings.allowlistedHosts, ['127.0.0.1']);
  await page.reload();
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
  console.log('E2E OK: bloqueo de anuncios/rastreadores, excepción por sitio, pausa global y persistencia tras recarga.');
} finally {
  await context?.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  const resolved = path.resolve(profileDir);
  if (!resolved.startsWith(path.resolve(tmpdir()) + path.sep) || !path.basename(resolved).startsWith('quietbrowse-e2e-')) throw new Error('Ruta temporal inesperada.');
  await rm(resolved, { recursive: true, force: true });
}
