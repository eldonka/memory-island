import React from 'react';

type P = React.SVGProps<SVGSVGElement>;
const base = (p: P): P => ({ width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', className: 'ico', ...p });

export const IcoBack = (p: P) => <svg {...base(p)}><path d="M15 5l-7 7 7 7" /></svg>;
export const IcoForward = (p: P) => <svg {...base(p)}><path d="M9 5l7 7-7 7" /></svg>;
export const IcoClose = (p: P) => <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const IcoPlus = (p: P) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const IcoCamera = (p: P) => <svg {...base(p)}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.2" /></svg>;
export const IcoQuote = (p: P) => <svg {...base(p)}><path d="M7 7h4v5H8c0 2 1 3 3 3v2c-3 0-5-2-5-5zM15 7h4v5h-3c0 2 1 3 3 3v2c-3 0-5-2-5-5z" /></svg>;
export const IcoNote = (p: P) => <svg {...base(p)}><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></svg>;
export const IcoSparkle = (p: P) => <svg {...base(p)}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></svg>;
export const IcoPlanet = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="6" /><path d="M3.5 9.5c-1.5 2 7 10 16 7 1.8-.7 2.5-2 1-3.5" /></svg>;
export const IcoFriends = (p: P) => <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><circle cx="17" cy="10" r="2.5" /><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M15 15.5c2.5 0 5 1.5 5 3.5" /></svg>;
export const IcoArchive = (p: P) => <svg {...base(p)}><path d="M4 7h16v13H4zM3 4h18v3H3zM10 11h4" /></svg>;
export const IcoSettings = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
export const IcoPlay = (p: P) => <svg {...base(p)}><path d="M7 5l12 7-12 7z" fill="currentColor" /></svg>;
export const IcoPause = (p: P) => <svg {...base(p)}><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /></svg>;
export const IcoDownload = (p: P) => <svg {...base(p)}><path d="M12 4v11m0 0l-4-4m4 4l4-4M4 19h16" /></svg>;
export const IcoTrash = (p: P) => <svg {...base(p)}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>;
export const IcoEdit = (p: P) => <svg {...base(p)}><path d="M4 20h4l10-10-4-4L4 16zM13 7l4 4" /></svg>;
export const IcoLeaf = (p: P) => <svg {...base(p)}><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l8-8" /></svg>;
export const IcoVoice = (p: P) => <svg {...base(p)}><path d="M4 10v4h3l5 4V6L7 10zM15 9c1.3 1.5 1.3 4.5 0 6M18 6c2.7 3 2.7 9 0 12" /></svg>;
export const IcoUpload = (p: P) => <svg {...base(p)}><path d="M12 16V5m0 0L8 9m4-4l4 4M4 19h16" /></svg>;
export const IcoLink = (p: P) => <svg {...base(p)}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1.5 1.5M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1.5-1.5" /></svg>;
export const IcoWhy = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.8-2.5 2-2.5 4M12 17h.01" /></svg>;
export const IcoHome = (p: P) => <svg {...base(p)}><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" /></svg>;
export const IcoCalendar = (p: P) => <svg {...base(p)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
