import React from 'react';

type Name = 'shield' | 'settings' | 'target' | 'arrow' | 'info' | 'pause' | 'play' | 'check' | 'globe' | 'palette' | 'filter' | 'video' | 'database' | 'download' | 'upload' | 'trash' | 'chevron';

export function Icon({ name, size = 20 }: { name: Name; size?: number }) {
  const shape: Record<Name, React.ReactNode> = {
    shield: <><path d="M12 2 3.5 5.4v5.8c0 5.2 3.5 8.6 8.5 10.8 5-2.2 8.5-5.6 8.5-10.8V5.4L12 2Z"/><path d="m8.8 12 2.2 2.2 4.4-4.5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l-1.8 1.8a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6h-2.6a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-1.8-1.8A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H5v-2.6a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l1.8-1.8a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6h2.6a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l1.8 1.8a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1V14a1.7 1.7 0 0 0-1.6 1Z"/></>,
    target: <><circle cx="11" cy="11" r="7"/><circle cx="11" cy="11" r="2"/><path d="M17 17 21 21"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></>,
    pause: <><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></>,
    play: <path d="m8 5 11 7-11 7V5Z"/>,
    check: <path d="m4 12 5 5L20 6"/>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3 3-3 15 0 18m0-18c3 3 3 15 0 18"/></>,
    palette: <><path d="M12 3a9 9 0 1 0 0 18h1.3a1.7 1.7 0 0 0 1.2-2.9 1.7 1.7 0 0 1 1.2-2.9H17A4 4 0 0 0 21 11 8 8 0 0 0 12 3Z"/><path d="M7 11h.01M9 7h.01M14 7h.01M17 11h.01"/></>,
    filter: <><path d="M4 6h16M7 12h10m-7 6h4"/></>,
    video: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3V9Z"/></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/></>,
    upload: <><path d="M12 16V4m-4 4 4-4 4 4M4 18v3h16v-3"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14M10 11v6m4-6v6"/></>,
    chevron: <path d="m9 5 7 7-7 7"/>,
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{shape[name]}</svg>;
}
