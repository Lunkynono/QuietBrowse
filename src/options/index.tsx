import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import browser from 'webextension-polyfill';
import { DEFAULT_SETTINGS, normalizeHost, parseBackup, type Accent, type Settings, type Theme } from '../shared/settings';
import type { AppResponse } from '../shared/messages';
import { Icon } from '../shared/Icon';
import '../styles/theme.css';
import './style.css';

type Section = 'protection' | 'filters' | 'youtube' | 'exceptions' | 'appearance' | 'data';
type FilterMetadata = { generatedAt: string; filters: unknown[] };

const sections: Array<{ id: Section; label: string; icon: Parameters<typeof Icon>[0]['name'] }> = [
  { id: 'protection', label: 'Inicio', icon: 'shield' },
  { id: 'filters', label: 'Qué bloquear', icon: 'filter' },
  { id: 'youtube', label: 'YouTube', icon: 'video' },
  { id: 'exceptions', label: 'Mis webs', icon: 'globe' },
  { id: 'appearance', label: 'Apariencia', icon: 'palette' },
  { id: 'data', label: 'Mis datos', icon: 'database' },
];

function SwitchRow({ label, description, checked, disabled, onChange }: { label: string; description?: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  return <label className="setting-row"><span><strong>{label}</strong>{description && <small>{description}</small>}</span><input className="switch" type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)}/></label>;
}

function App() {
  const [status, setStatus] = useState<AppResponse | null>(null);
  const [section, setSection] = useState<Section>('protection');
  const [metadata, setMetadata] = useState<FilterMetadata | null>(null);
  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [pendingBackup, setPendingBackup] = useState<Settings | null>(null);
  const [confirmReset, setConfirmReset] = useState<'settings' | 'counts' | null>(null);
  const [systemDark, setSystemDark] = useState(matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    void browser.runtime.sendMessage({ type: 'QUIETBROWSE_STATUS' }).then((value) => setStatus(value as AppResponse)).catch((cause) => setError(String(cause)));
    void fetch(browser.runtime.getURL('filters/filters-manifest.json')).then((response) => response.json()).then(setMetadata).catch(() => undefined);
    const media = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  async function save(next: Settings, needsReload = false): Promise<void> {
    const previous = status;
    if (previous) setStatus({ ...previous, settings: next });
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await browser.runtime.sendMessage({ type: 'QUIETBROWSE_SAVE_SETTINGS', settings: next }) as AppResponse;
      setStatus(result);
      setNotice(needsReload ? 'Guardado. Recarga las webs abiertas para aplicar todos los cambios.' : 'Guardado.');
    } catch (cause) { setStatus(previous); setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }

  function change(patch: Partial<Settings>, needsReload = false): void {
    if (status) void save({ ...status.settings, ...patch }, needsReload);
  }

  function addDomain(event: React.FormEvent): void {
    event.preventDefault();
    const host = normalizeHost(domain);
    if (!host) { setError('Escribe solo el dominio, por ejemplo: ejemplo.com'); return; }
    if (status) void save({ ...status.settings, allowlistedHosts: [...new Set([...status.settings.allowlistedHosts, host])] }, true);
    setDomain('');
  }

  function exportBackup(): void {
    if (!status) return;
    const blob = new Blob([JSON.stringify(status.settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'quietbrowse-ajustes.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function readBackup(file: File | undefined): Promise<void> {
    if (!file) return;
    try {
      if (file.size > 200_000) throw new Error('El archivo es demasiado grande.');
      setPendingBackup(parseBackup(JSON.parse(await file.text())));
      setError('');
    } catch { setError('No hemos podido leer esta copia. Comprueba que sea un archivo de QuietBrowse.'); }
  }

  async function resetCounts(): Promise<void> {
    setBusy(true); setError('');
    try {
      setStatus(await browser.runtime.sendMessage({ type: 'QUIETBROWSE_RESET_COUNTS' }) as AppResponse);
      setNotice('Contador reiniciado.'); setConfirmReset(null);
    } catch (cause) { setError(String(cause)); }
    finally { setBusy(false); }
  }

  const settings = status?.settings;
  const theme = settings?.theme ?? 'system';
  const dark = theme === 'dark' || (theme === 'system' && systemDark);
  const accent = settings?.accent ?? 'mint';
  const active = status?.engineState === 'active';
  const number = new Intl.NumberFormat('es-ES');

  return <main data-theme={dark ? 'dark' : 'light'} data-accent={accent}>
    <div className="app-shell"><aside className="sidebar">
      <div className="brand"><span className="brand-mark" aria-hidden="true">Q</span><div><h1>QuietBrowse</h1><span>Tu espacio tranquilo</span></div></div>
      <nav aria-label="Ajustes">{sections.map((item) => <button key={item.id} type="button" className={`nav-item ${section === item.id ? 'selected' : ''}`} aria-current={section === item.id ? 'page' : undefined} onClick={() => { setSection(item.id); setNotice(''); setError(''); }}><Icon name={item.icon} size={19}/>{item.label}<Icon name="chevron" size={15}/></button>)}</nav>
      <div className="sidebar-foot"><span className={`status-dot ${active ? 'active' : ''}`}/>{active ? 'Protección encendida' : status?.engineState === 'error' ? 'Revisa la protección' : 'Protección en pausa'}</div>
    </aside>

    <div className="content"><header className="page-header"><span className="eyebrow">AJUSTES</span><h2>{sections.find((item) => item.id === section)?.label}</h2><p>{section === 'protection' ? 'Lo importante de un vistazo.' : section === 'filters' ? 'Elige qué quieres quitar de las páginas.' : section === 'youtube' ? 'Ajusta la protección de tus vídeos.' : section === 'exceptions' ? 'Decide dónde actúa QuietBrowse.' : section === 'appearance' ? 'Haz que QuietBrowse se sienta tuyo.' : 'Guarda tus preferencias y consulta los bloqueos.'}</p></header>
      {(error || status?.error) && <p className="alert error" role="alert">{error || status?.error}</p>}
      {notice && <p className="alert notice" role="status"><Icon name="check" size={17}/>{notice}</p>}
      {!settings ? <div className="card">Cargando ajustes…</div> : <>
        {section === 'protection' && <>
          <div className={`feature-card ${active ? 'feature-active' : ''}`}><span className="feature-icon"><Icon name="shield" size={27}/></span><div><span className="eyebrow">ESTADO GENERAL</span><h3>{status?.engineState === 'error' ? 'Necesita atención' : active ? 'Todo en marcha' : 'Protección en pausa'}</h3><p>{active ? 'QuietBrowse está limpiando las webs que visitas.' : 'Puedes volver a activarla cuando quieras.'}</p></div></div>
          <div className="card"><h3>Protección</h3><SwitchRow label="Proteger todas mis webs" description="Puedes hacer excepciones para sitios concretos." checked={settings.enabled} disabled={busy || status?.engineState === 'error'} onChange={(value) => change({ enabled: value }, true)}/></div>
          <div className="card"><h3>Intensidad</h3><p className="card-intro">Empieza con Equilibrado. Usa Intensivo si quieres ocultar más molestias.</p><div className="choice-grid">{(['balanced', 'aggressive'] as const).map((profile) => <label key={profile} className={`choice-card ${settings.profile === profile ? 'chosen' : ''}`}><input type="radio" name="profile" value={profile} checked={settings.profile === profile} disabled={busy} onChange={() => change({ profile }, true)}/><strong>{profile === 'balanced' ? 'Equilibrado' : 'Intensivo'}</strong><small>{profile === 'balanced' ? 'Menos interrupciones, con cuidado.' : 'Quita más avisos; alguna web podría necesitar una excepción.'}</small></label>)}</div></div>
        </>}

        {section === 'filters' && <>
          <div className="card"><h3>Lo que quitamos</h3><p className="card-intro">Puedes cambiar cada opción cuando quieras.</p>
            <SwitchRow label="Anuncios" description="Publicidad en las páginas y espacios promocionales conocidos." checked={settings.blockAds} disabled={busy} onChange={(value) => change({ blockAds: value }, true)}/>
            <SwitchRow label="Rastreadores" description="Conexiones que intentan seguir tu actividad entre webs." checked={settings.blockTrackers} disabled={busy} onChange={(value) => change({ blockTrackers: value }, true)}/>
            <SwitchRow label="Avisos de cookies" description="Oculta algunos avisos. No rechaza ni acepta cookies por ti." checked={settings.hideCookieNotices} disabled={busy} onChange={(value) => change({ hideCookieNotices: value }, true)}/>
            <SwitchRow label="Ventanas molestas" description="Reduce ventanas y avisos que interrumpen la lectura." checked={settings.blockDistractions} disabled={busy} onChange={(value) => change({ blockDistractions: value }, true)}/>
          </div><div className="tip"><Icon name="info" size={20}/><p>Si una web deja de funcionar, puedes pausarla desde el botón de QuietBrowse y recargar la página.</p></div>
        </>}

        {section === 'youtube' && <>
          <div className="card"><h3>Protección en YouTube</h3><SwitchRow label="Proteger YouTube" description="Si el vídeo falla, apágalo y recarga YouTube." checked={settings.youtubeFiltering} disabled={busy} onChange={(value) => change({ youtubeFiltering: value }, true)}/><SwitchRow label="Ocultar tarjetas publicitarias" description="Quita algunos anuncios visibles fuera del reproductor." checked={settings.youtubeCosmeticCleanup} disabled={busy || !settings.youtubeFiltering} onChange={(value) => change({ youtubeCosmeticCleanup: value }, true)}/></div>
          <div className="tip"><Icon name="info" size={20}/><p>Los anuncios dentro del vídeo pueden seguir apareciendo. YouTube cambia a menudo y priorizamos que el reproductor siga funcionando.</p></div>
        </>}

        {section === 'exceptions' && <>
          <div className="card"><h3>Webs donde no actuamos</h3><p className="card-intro">Añade una web si QuietBrowse interfiere con algo que quieres usar.</p><form className="add-domain" onSubmit={addDomain}><input aria-label="Dominio de la web" placeholder="ejemplo.com" value={domain} onChange={(event) => setDomain(event.target.value)}/><button className="button-primary" disabled={busy}>Añadir web</button></form>
            {settings.allowlistedHosts.length === 0 ? <p className="empty">Todavía no has añadido ninguna web.</p> : <ul className="item-list">{settings.allowlistedHosts.map((host) => <li key={host}><span>{host}</span><button type="button" disabled={busy} onClick={() => change({ allowlistedHosts: settings.allowlistedHosts.filter((entry) => entry !== host) }, true)} aria-label={`Quitar ${host}`}>Quitar</button></li>)}</ul>}
          </div>
          <div className="card"><h3>Elementos que has ocultado</h3><p className="card-intro">Puedes elegirlos desde el botón «Bloquear un elemento» de QuietBrowse.</p>{settings.customRules.length === 0 ? <p className="empty">No hay elementos guardados.</p> : <ul className="item-list">{settings.customRules.map((rule) => <li key={rule.id}><label className="rule-label"><input type="checkbox" checked={rule.enabled} disabled={busy} onChange={(event) => change({ customRules: settings.customRules.map((entry) => entry.id === rule.id ? { ...entry, enabled: event.target.checked } : entry) }, true)}/><span>{rule.host}<small>Elemento oculto</small></span></label><button type="button" disabled={busy} onClick={() => change({ customRules: settings.customRules.filter((entry) => entry.id !== rule.id) }, true)} aria-label={`Borrar regla de ${rule.host}`}>Borrar</button></li>)}</ul>}</div>
        </>}

        {section === 'appearance' && <>
          <div className="card"><h3>Aspecto</h3><p className="card-intro">QuietBrowse puede seguir el aspecto de tu ordenador.</p><div className="choice-grid three">{([{ value: 'system', label: 'Sistema' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }] as Array<{ value: Theme; label: string }>).map((choice) => <label key={choice.value} className={`choice-card theme-choice ${settings.theme === choice.value ? 'chosen' : ''}`}><input type="radio" name="theme" checked={settings.theme === choice.value} disabled={busy} onChange={() => change({ theme: choice.value })}/><span className={`theme-preview ${choice.value}`}/><strong>{choice.label}</strong></label>)}</div></div>
          <div className="card"><h3>Color principal</h3><p className="card-intro">Elige el tono que más te guste.</p><div className="accent-grid">{([{ value: 'mint', label: 'Verde' }, { value: 'blue', label: 'Azul' }, { value: 'violet', label: 'Violeta' }, { value: 'coral', label: 'Coral' }] as Array<{ value: Accent; label: string }>).map((choice) => <label key={choice.value} className={`accent-choice ${settings.accent === choice.value ? 'chosen' : ''}`}><input type="radio" name="accent" checked={settings.accent === choice.value} disabled={busy} onChange={() => change({ accent: choice.value })}/><span className={`color-dot ${choice.value}`}/>{choice.label}</label>)}</div></div>
        </>}

        {section === 'data' && <>
          <div className="card"><h3>Bloqueos registrados</h3><p className="big-number">{number.format(status?.counts?.total ?? 0)}</p><p className="card-intro">Incluye anuncios y rastreadores detectados desde que empezamos a contarlos. Puede faltar algún bloqueo.</p>{confirmReset === 'counts' ? <div className="confirm-row"><span>¿Poner el contador a cero?</span><button className="button-danger" disabled={busy} onClick={() => void resetCounts()}>Sí, reiniciar</button><button onClick={() => setConfirmReset(null)}>Cancelar</button></div> : <button className="button-subtle" onClick={() => setConfirmReset('counts')}>Reiniciar contador</button>}</div>
          <div className="card"><h3>Guardar mis ajustes</h3><p className="card-intro">Crea un archivo para recuperar tus preferencias más adelante o llevarlas a otro Chrome.</p><div className="action-row"><button className="button-subtle" onClick={exportBackup}><Icon name="download" size={18}/> Guardar una copia</button><label className="file-button"><Icon name="upload" size={18}/> Recuperar una copia<input type="file" accept="application/json,.json" onChange={(event) => void readBackup(event.target.files?.[0])}/></label></div>{pendingBackup && <div className="preview"><strong>Copia lista para recuperar</strong><p>{pendingBackup.allowlistedHosts.length} webs excluidas y {pendingBackup.customRules.length} elementos guardados. Sustituirá tus ajustes actuales.</p><button className="button-primary" disabled={busy} onClick={() => { void save(pendingBackup, true); setPendingBackup(null); }}>Aplicar copia</button><button className="button-subtle" onClick={() => setPendingBackup(null)}>Cancelar</button></div>}</div>
          <div className="card"><h3>Empezar de nuevo</h3><p className="card-intro">Restaura las opciones iniciales. Tus bloqueos registrados se conservan.</p>{confirmReset === 'settings' ? <div className="confirm-row"><span>¿Borrar tus ajustes?</span><button className="button-danger" disabled={busy} onClick={() => { void save(structuredClone(DEFAULT_SETTINGS), true); setConfirmReset(null); }}>Sí, restaurar</button><button onClick={() => setConfirmReset(null)}>Cancelar</button></div> : <button className="button-subtle" onClick={() => setConfirmReset('settings')}>Restaurar ajustes</button>}</div>
          <p className="data-note">Tus preferencias y el contador se guardan en este navegador. QuietBrowse no los envía a ningún servidor. {metadata && `Filtros preparados el ${new Date(metadata.generatedAt).toLocaleDateString('es-ES')}.`}</p>
        </>}
      </>}
    </div></div>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App/>);
