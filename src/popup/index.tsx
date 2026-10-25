import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import browser from 'webextension-polyfill';
import { isAllowlisted } from '../shared/settings';
import type { AppRequest, AppResponse } from '../shared/messages';
import './style.css';

async function send(request: AppRequest): Promise<AppResponse> {
  return browser.runtime.sendMessage(request) as Promise<AppResponse>;
}

function App() {
  const [status, setStatus] = useState<AppResponse | null>(null);
  const [host, setHost] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const url = tab?.url ? new URL(tab.url) : null;
        const currentHost = url && ['http:', 'https:'].includes(url.protocol) ? url.hostname.toLowerCase() : null;
        setHost(currentHost);
        setStatus(await send({ type: 'QUIETBROWSE_STATUS' }));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    })();
  }, []);

  async function change(request: AppRequest) {
    setBusy(true);
    setError(null);
    try {
      setStatus(await send(request));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  const youtube = host === 'youtube.com' || host?.endsWith('.youtube.com');
  const siteEnabled = Boolean(host && status && !isAllowlisted(host, status.settings.allowlistedHosts) && (!youtube || status.settings.youtubeFiltering));
  const preference = status?.settings.theme ?? 'system';
  const dark = preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  async function picker() {
    setError(null);
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No se ha encontrado la pestaña.');
      await browser.tabs.sendMessage(tab.id, { type: 'QUIETBROWSE_START_PICKER' });
      window.close();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }
  function save(partial: Partial<AppResponse['settings']>) {
    if (status) void change({ type: 'QUIETBROWSE_SAVE_SETTINGS', settings: { ...status.settings, ...partial } });
  }
  return <main data-theme={dark ? 'dark' : 'light'}>
    <header><span className="mark">Q</span><div><h1>QuietBrowse</h1><p>Protección sencilla para navegar</p></div></header>
    <div className={`state ${status?.engineState ?? 'loading'}`}>
      {status?.engineState === 'active' ? 'Protección activa' : status?.engineState === 'disabled' ? 'Protección pausada' : status?.engineState === 'error' ? 'Error en el motor de filtros' : 'Iniciando filtros…'}
    </div>
    {status && <>
      <label className="switch-row"><span>Protección general</span><input type="checkbox" checked={status.settings.enabled} disabled={busy || status.engineState === 'error'} onChange={(event) => void change({ type: 'QUIETBROWSE_SET_ENABLED', enabled: event.target.checked })} /></label>
      <section><p className="eyebrow">WEB ACTUAL</p><strong>{host ?? 'Página no compatible'}</strong>
        {host && <label className="switch-row"><span>Protección en esta web</span><input type="checkbox" checked={siteEnabled} disabled={busy || status.engineState === 'error' || (youtube && !status.settings.youtubeFiltering)} onChange={(event) => void change({ type: 'QUIETBROWSE_SET_SITE', host, enabled: event.target.checked })} /></label>}
        {host && <button className="text-button" type="button" disabled={busy || !siteEnabled} onClick={() => void change({ type: 'QUIETBROWSE_SET_SITE', host, enabled: false })}>Restaurar esta web</button>}
        {host && !siteEnabled && <p className="hint">{youtube && !status.settings.youtubeFiltering ? 'YouTube está desactivado en los ajustes.' : 'Esta web no tiene protección. Recárgala para aplicar el cambio.'}</p>}
      </section>
      <section>
        <label className="switch-row"><span>Reducir pop-ups</span><input type="checkbox" checked={status.settings.blockDistractions} disabled={busy} onChange={(event) => save({ blockDistractions: event.target.checked })} /></label>
        {youtube && <label className="switch-row"><span>Protección en YouTube</span><input type="checkbox" checked={status.settings.youtubeFiltering} disabled={busy} onChange={(event) => save({ youtubeFiltering: event.target.checked })} /></label>}
        {host && siteEnabled && <button className="text-button" type="button" onClick={() => void picker()}>Bloquear elemento</button>}
      </section>
      <button className="primary-button" type="button" onClick={() => void browser.runtime.openOptionsPage()}>Abrir ajustes</button>
    </>}
    {(error || status?.error) && <p role="alert" className="error">{error ?? status?.error}</p>}
    <footer>Los cambios en la web actual pueden requerir recargar la página.</footer>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
