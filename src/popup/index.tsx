import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import browser from 'webextension-polyfill';
import { isAllowlisted } from '../shared/settings';
import type { AppRequest, AppResponse } from '../shared/messages';
import { Icon } from '../shared/Icon';
import '../styles/theme.css';
import './style.css';

async function send(request: AppRequest): Promise<AppResponse> {
  return browser.runtime.sendMessage(request) as Promise<AppResponse>;
}

function App() {
  const [status, setStatus] = useState<AppResponse | null>(null);
  const [host, setHost] = useState<string | null>(null);
  const [tabId, setTabId] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const url = tab?.url ? new URL(tab.url) : null;
        const currentHost = url && ['http:', 'https:'].includes(url.protocol) ? url.hostname.toLowerCase() : null;
        setHost(currentHost);
        setTabId(tab?.id);
        setStatus(await send({ type: 'QUIETBROWSE_STATUS', tabId: currentHost ? tab?.id : undefined }));
      } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    })();
  }, []);

  useEffect(() => {
    const onChange = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (!('blockedRequestsTotal' in changes) && !('blockedRequestsByTab' in changes)) return;
      void send({ type: 'QUIETBROWSE_STATUS', tabId: host ? tabId : undefined })
        .then((next) => setStatus((previous) => previous ? { ...previous, counts: next.counts } : next))
        .catch(() => undefined);
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, [host, tabId]);

  async function change(request: AppRequest, needsReload = false) {
    setBusy(true); setError(null);
    try {
      await send(request);
      setStatus(await send({ type: 'QUIETBROWSE_STATUS', tabId: host ? tabId : undefined }));
      if (needsReload) setReload(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }

  async function startPicker() {
    setError(null);
    try {
      if (tabId === undefined) throw new Error('No se ha encontrado la pestaña.');
      await browser.tabs.sendMessage(tabId, { type: 'QUIETBROWSE_START_PICKER' });
      window.close();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  const settings = status?.settings;
  const youtube = host === 'youtube.com' || host?.endsWith('.youtube.com');
  const excluded = Boolean(host && settings && isAllowlisted(host, settings.allowlistedHosts));
  const siteActive = Boolean(host && settings && !excluded && (!youtube || settings.youtubeFiltering));
  const active = status?.engineState === 'active' && siteActive;
  const theme = settings?.theme ?? 'system';
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const number = new Intl.NumberFormat('es-ES');
  const stateLabel = !status ? 'Comprobando protección…' : status.engineState === 'error' ? 'Hay un problema con la protección'
    : status.engineState === 'disabled' ? 'Protección en pausa' : !host ? 'Página fuera de alcance'
      : !siteActive ? 'Protección pausada aquí' : 'Protección activa en esta web';

  return <main data-theme={dark ? 'dark' : 'light'} data-accent={settings?.accent ?? 'mint'}>
    <header className="topbar">
      <div className="brand"><span className="brand-mark" aria-hidden="true">Q</span><div><h1>QuietBrowse</h1><span>Navega con calma</span></div></div>
      <button className="icon-button" type="button" aria-label="Abrir ajustes" title="Abrir ajustes" onClick={() => void browser.runtime.openOptionsPage()}><Icon name="settings"/></button>
    </header>

    <section className={`hero ${active ? 'hero-active' : 'hero-quiet'}`} aria-live="polite">
      <div className="hero-icon"><Icon name="shield" size={25}/></div>
      <div className="hero-copy"><span className="kicker">ESTADO ACTUAL</span><h2>{stateLabel}</h2><p>{active ? 'Seguimos limpiando esta página mientras navegas.' : status?.engineState === 'error' ? 'Abre ajustes para ver qué ocurre.' : !host ? 'Chrome no permite actuar en esta página.' : 'Puedes volver a activarla cuando quieras.'}</p></div>
    </section>

    {settings && <>
      <div className="master-row"><div><strong>Protección general</strong><small>Para todas tus webs</small></div><input aria-label="Protección general" className="switch" type="checkbox" checked={settings.enabled} disabled={busy || status?.engineState === 'error'} onChange={(event) => void change({ type: 'QUIETBROWSE_SET_ENABLED', enabled: event.target.checked }, true)}/></div>

      <section className="site-card">
        <div className="section-heading"><span className="soft-icon"><Icon name="globe" size={18}/></span><div><span className="kicker">ESTA WEB</span><h2>{host ?? 'Página no compatible'}</h2></div></div>
        {host && <><div className="site-action"><span>{siteActive && settings.enabled ? 'Protección encendida' : 'Protección apagada'}</span><button type="button" disabled={busy || !settings.enabled || status?.engineState === 'error' || (youtube && !settings.youtubeFiltering)} onClick={() => void change({ type: 'QUIETBROWSE_SET_SITE', host, enabled: !siteActive }, true)}>{siteActive ? 'Pausar aquí' : 'Volver a proteger'}</button></div>
          {youtube && !settings.youtubeFiltering && <p className="context-note">Activa YouTube abajo para proteger esta página.</p>}</>}
      </section>

      <section className="counter-card" aria-label="Bloqueos registrados"><div className="counter-heading"><Icon name="filter" size={18}/><strong>Bloqueos registrados</strong></div><div className="counter-grid"><div><strong>{status?.counts?.page === null || status?.counts?.page === undefined ? '—' : number.format(status.counts.page)}</strong><span>En esta página</span></div><div><strong>{status?.counts ? number.format(status.counts.total) : '—'}</strong><span>Total guardado</span></div></div><p>Incluye anuncios y rastreadores detectados. Algunos bloqueos pueden no aparecer aquí.</p></section>

      {youtube && <button className="youtube-row" type="button" disabled={busy} onClick={() => void change({ type: 'QUIETBROWSE_SAVE_SETTINGS', settings: { ...settings, youtubeFiltering: !settings.youtubeFiltering } }, true)}><span className="soft-icon"><Icon name="video" size={18}/></span><span><strong>YouTube</strong><small>{settings.youtubeFiltering ? 'Protección encendida' : 'Protección apagada'}</small></span><span className={`mini-status ${settings.youtubeFiltering ? 'on' : ''}`}>{settings.youtubeFiltering ? 'Sí' : 'No'}</span></button>}

      <div className="actions"><button type="button" className="primary-action" disabled={!siteActive || busy || !settings.enabled} onClick={() => void startPicker()}><Icon name="target" size={18}/> Bloquear un elemento</button><button type="button" className="secondary-action" onClick={() => void browser.runtime.openOptionsPage()}>Ver ajustes <Icon name="arrow" size={18}/></button></div>
    </>}

    {reload && <p className="feedback" role="status"><Icon name="info" size={17}/> Recarga la página para aplicar todos los cambios.</p>}
    {(error || status?.error) && <p className="error" role="alert">{error ?? status?.error}</p>}
  </main>;
}

createRoot(document.getElementById('root')!).render(<App/>);
