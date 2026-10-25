import '@adguard/api-mv3/content-script';
import { isAllowlisted, normalizeHost, parseSettings, type Settings } from '../shared/settings';

const host = normalizeHost(location.hostname);
const youtube = host === 'youtube.com' || host?.endsWith('.youtube.com');
const style = document.createElement('style');
style.id = 'quietbrowse-personal-rules';
let settings: Settings | null = null;
let picking = false;

function apply(): void {
  if (!document.documentElement || !settings || !host) return;
  if (!style.isConnected) document.documentElement.append(style);
  if (!settings.enabled || isAllowlisted(host, settings.allowlistedHosts) || (youtube && !settings.youtubeFiltering)) {
    style.textContent = '';
    return;
  }
  const selectors = settings.customRules.filter((rule) => rule.enabled && isAllowlisted(host, [rule.host])).map((rule) => rule.selector);
  if (youtube && settings.youtubeCosmeticCleanup) selectors.push(
    'ytd-display-ad-renderer', 'ytd-promoted-sparkles-web-renderer',
    'ytd-ad-slot-renderer', 'ytd-in-feed-ad-layout-renderer', 'ytd-companion-slot-renderer',
  );
  style.textContent = selectors.map((selector) => `${selector} { display: none !important; }`).join('\n');
}

function selectable(target: Element): target is HTMLElement {
  return target instanceof HTMLElement && !target.closest('a, button, form, input, textarea, select, video, audio, [contenteditable="true"], #quietbrowse-picker-banner')
    && !['HTML', 'BODY', 'MAIN', 'ARTICLE', 'HEADER', 'NAV'].includes(target.tagName);
}

export function selectorForElement(element: Element): string | null {
  if (!selectable(element)) return null;
  if (/^[a-zA-Z_][\w-]{1,100}$/.test(element.id)) return `#${element.id}`;
  const classes = Array.from(element.classList).filter((name) => /^[a-z][a-z0-9_-]{2,50}$/i.test(name) && !/^(active|selected|open|hidden|visible)$/i.test(name)).slice(0, 2);
  if (!classes.length) return null;
  return `${element.tagName.toLowerCase()}${classes.map((name) => `.${name}`).join('')}`;
}

function startPicker(): void {
  if (picking || !host || !settings?.enabled || isAllowlisted(host, settings.allowlistedHosts)) return;
  picking = true;
  const banner = document.createElement('div');
  banner.id = 'quietbrowse-picker-banner';
  banner.textContent = 'QuietBrowse: elige un elemento. Pulsa Esc para cancelar.';
  Object.assign(banner.style, { position: 'fixed', top: '12px', left: '12px', zIndex: '2147483647', padding: '12px 16px', borderRadius: '8px', color: 'white', background: '#07594f', font: '14px sans-serif' });
  document.documentElement.append(banner);
  let hovered: HTMLElement | null = null;
  const previous = new Map<HTMLElement, string>();
  function cleanup(): void {
    picking = false;
    banner.remove();
    for (const [element, outline] of previous) element.style.outline = outline;
    document.removeEventListener('pointermove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
  }
  function onMove(event: PointerEvent): void {
    const target = event.target;
    if (!(target instanceof Element) || !selectable(target)) return;
    if (hovered && previous.has(hovered)) hovered.style.outline = previous.get(hovered)!;
    hovered = target;
    if (!previous.has(target)) previous.set(target, (target as HTMLElement).style.outline);
    (target as HTMLElement).style.outline = '3px solid #0ca78f';
  }
  function onKey(event: KeyboardEvent): void { if (event.key === 'Escape') cleanup(); }
  async function onClick(event: MouseEvent): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element) || !selectable(target)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const selector = selectorForElement(target);
    cleanup();
    if (!selector || document.querySelectorAll(selector).length > 3) {
      alert('No hemos encontrado un selector suficientemente concreto. Prueba con otro elemento.');
      return;
    }
    if (!confirm(`¿Ocultar este elemento en ${host}?\n${selector}`)) return;
    try { await chrome.runtime.sendMessage({ type: 'QUIETBROWSE_ADD_RULE', host, selector }); }
    catch (error) { alert(`No se ha podido guardar la regla: ${String(error)}`); }
  }
  document.addEventListener('pointermove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey, true);
}

void chrome.storage.local.get('settings').then((saved) => { settings = parseSettings(saved.settings); apply(); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) { settings = parseSettings(changes.settings.newValue); apply(); }
});
chrome.runtime.onMessage.addListener((message: unknown) => {
  if (window !== window.top || !message || typeof message !== 'object') return;
  if ((message as { type?: string }).type === 'QUIETBROWSE_START_PICKER') startPicker();
});
if (!document.documentElement) document.addEventListener('DOMContentLoaded', apply, { once: true });
