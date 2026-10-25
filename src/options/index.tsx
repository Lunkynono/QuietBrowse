import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import browser from 'webextension-polyfill';
import { DEFAULT_SETTINGS, normalizeHost, parseBackup, type Settings } from '../shared/settings';
import type { AppResponse } from '../shared/messages';
import './style.css';

type FilterMetadata = { generatedAt: string; packageVersion: string; filters: Array<{ id: number; name: string; rules: number }> };

function App() {
  const [status, setStatus] = useState<AppResponse | null>(null);
  const [metadata, setMetadata] = useState<FilterMetadata | null>(null);
  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void browser.runtime.sendMessage({ type: 'QUIETBROWSE_STATUS' }).then((value) => setStatus(value as AppResponse)).catch((cause) => setError(String(cause)));
    void fetch(browser.runtime.getURL('filters/filters-manifest.json')).then((response) => response.json()).then(setMetadata).catch(() => setError('No se han podido leer los datos de los filtros.'));
  }, []);

  async function save(next: Settings): Promise<void> {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await browser.runtime.sendMessage({ type: 'QUIETBROWSE_SAVE_SETTINGS', settings: next }) as AppResponse;
      setStatus(result); setNotice('Guardado. Recarga las pestañas abiertas para aplicar todos los cambios.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }

  function change(patch: Partial<Settings>): void {
    if (status) void save({ ...status.settings, ...patch });
  }

  function addDomain(event: React.FormEvent): void {
    event.preventDefault();
    const host = normalizeHost(domain);
    if (!host) { setError('Introduce un dominio válido, sin https:// ni rutas.'); return; }
    if (status) void save({ ...status.settings, allowlistedHosts: [...new Set([...status.settings.allowlistedHosts, host])] });
    setDomain('');
  }

  function exportBackup(): void {
    if (!status) return;
    const blob = new Blob([JSON.stringify(status.settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'quietbrowse-ajustes.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importBackup(file: File | undefined): Promise<void> {
    if (!file) return;
    try {
      if (file.size > 200_000) throw new Error('El archivo es demasiado grande.');
      const imported = parseBackup(JSON.parse(await file.text()));
      if (confirm(`¿Sustituir los ajustes actuales?\n${imported.allowlistedHosts.length} excepciones y ${imported.customRules.length} reglas personales.`)) await save(imported);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  const settings = status?.settings;
  const theme = settings?.theme ?? 'system';
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const Toggle = ({ field, label, note }: { field: keyof Settings; label: string; note?: string }) => <label className="toggle"><span><strong>{label}</strong>{note && <small>{note}</small>}</span><input type="checkbox" checked={Boolean(settings?.[field])} disabled={!settings || busy} onChange={(event) => change({ [field]: event.target.checked })} /></label>;
  return <main data-theme={dark ? 'dark' : 'light'}>
    <div className="container"><header><div className="brand"><span className="mark">Q</span><div><h1>QuietBrowse</h1><p>Ajustes de protección</p></div></div><span className={`badge ${status?.engineState ?? 'loading'}`}>{status?.engineState === 'active' ? 'Activa' : status?.engineState === 'disabled' ? 'Pausada' : status?.engineState === 'error' ? 'Error del motor' : 'Cargando…'}</span></header>
      {(error || status?.error) && <p className="alert" role="alert">{error || status?.error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {!settings ? <p>Cargando ajustes…</p> : <>
        <section><h2>General</h2>
          <Toggle field="enabled" label="Protección general" />
          <label className="select-row"><span>Perfil <small>Equilibrado para el día a día; intensivo añade la lista de otras molestias.</small></span><select value={settings.profile} disabled={busy} onChange={(event) => change({ profile: event.target.value as Settings['profile'] })}><option value="balanced">Equilibrado</option><option value="aggressive">Intensivo</option></select></label>
          <label className="select-row"><span>Tema</span><select value={settings.theme} disabled={busy} onChange={(event) => change({ theme: event.target.value as Settings['theme'] })}><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Oscuro</option></select></label>
        </section>
        <section><h2>Filtros y privacidad</h2>
          <Toggle field="blockAds" label="Anuncios" note="AdGuard Base y lista para páginas en español." />
          <Toggle field="blockTrackers" label="Rastreadores" note="AdGuard Tracking Protection." />
          <Toggle field="hideCookieNotices" label="Ocultar avisos de cookies" note="Solo oculta avisos; no rechaza cookies ni cambia el consentimiento." />
          <p className="muted">El rechazo automático de cookies opcionales no está disponible: no queremos pulsar una opción equivocada.</p>
        </section>
        <section><h2>Molestias</h2>
          <Toggle field="blockDistractions" label="Pop-ups y avisos molestos" note="Usa la lista mantenida de pop-ups; algunas webs pueden requerir una excepción." />
          <p className="muted">La limpieza general de vídeos flotantes aún no está disponible: muchas webs usan el mismo reproductor para contenido legítimo.</p>
        </section>
        <section><h2>YouTube</h2>
          <Toggle field="youtubeFiltering" label="Filtrar YouTube" note="Desactívalo y recarga YouTube si el reproductor falla." />
          <Toggle field="youtubeCosmeticCleanup" label="Ocultar tarjetas publicitarias conocidas" note="No modifica el reproductor, los controles ni los flujos de vídeo." />
          <p className="muted">El bloqueo de anuncios antes o durante un vídeo es aproximado. YouTube cambia con frecuencia y no se garantiza que desaparezcan todos.</p>
        </section>
        <section><h2>Webs excluidas</h2><form onSubmit={addDomain} className="inline"><input aria-label="Dominio para excluir" placeholder="ejemplo.com" value={domain} onChange={(event) => setDomain(event.target.value)} /><button disabled={busy}>Añadir</button></form>
          {settings.allowlistedHosts.length === 0 ? <p className="muted">No hay excepciones.</p> : <ul>{settings.allowlistedHosts.map((host) => <li key={host}><span>{host}</span><button type="button" disabled={busy} onClick={() => change({ allowlistedHosts: settings.allowlistedHosts.filter((entry) => entry !== host) })}>Quitar</button></li>)}</ul>}
        </section>
        <section><h2>Elementos bloqueados por ti</h2><p className="muted">Usa «Bloquear elemento» desde el popup de una web. Las reglas se guardan solo para su dominio.</p>
          {settings.customRules.length === 0 ? <p className="muted">No hay reglas personales.</p> : <ul>{settings.customRules.map((rule) => <li key={rule.id}><label><input type="checkbox" checked={rule.enabled} disabled={busy} onChange={(event) => change({ customRules: settings.customRules.map((entry) => entry.id === rule.id ? { ...entry, enabled: event.target.checked } : entry) })} /> {rule.host}: <code>{rule.selector}</code></label><button type="button" disabled={busy} onClick={() => change({ customRules: settings.customRules.filter((entry) => entry.id !== rule.id) })}>Borrar</button></li>)}</ul>}
        </section>
        <section><h2>Copia y diagnóstico</h2><div className="actions"><button type="button" onClick={exportBackup}>Exportar ajustes</button><label className="file-button">Importar ajustes<input type="file" accept="application/json,.json" onChange={(event) => void importBackup(event.target.files?.[0])} /></label><button type="button" disabled={busy} onClick={() => { if (confirm('¿Restaurar todos los ajustes por defecto?')) void save(structuredClone(DEFAULT_SETTINGS)); }}>Restaurar valores</button></div>
          <p className="muted">Motor: {status?.engineState}. Filtros empaquetados: {metadata?.filters.length ?? '—'}. Versión de listas: {metadata?.packageVersion ?? '—'}. Compilación: {metadata ? new Date(metadata.generatedAt).toLocaleString('es-ES') : '—'}.</p>
          <p className="muted">No se registran visitas ni se envía telemetría. Actualiza las listas desde el proyecto con <code>npm run filters:update</code>, recompila y recarga la extensión.</p>
        </section>
      </>}
      <footer>QuietBrowse funciona solo en páginas web compatibles; no modifica otras aplicaciones ni páginas internas de Chrome.</footer>
    </div>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
