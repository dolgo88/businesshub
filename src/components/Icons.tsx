import type { ReactElement } from 'react';

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const paths: Record<string, ReactElement> = {
  cronograma: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" {...P} />
      <path d="M3 10h18M8 3v4M16 3v4M7 14h4M7 17h7" {...P} />
    </>
  ),
  presupuesto: (
    <>
      <path d="M5 3h10l4 4v14H5z" {...P} />
      <path d="M15 3v4h4M8 12h8M8 16h5M8 8h4" {...P} />
    </>
  ),
  financiacion: (
    <>
      <path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18" {...P} />
    </>
  ),
  rrhh: (
    <>
      <circle cx="9" cy="8" r="3.2" {...P} />
      <path d="M3 20c.6-3.6 3-5.5 6-5.5s5.4 1.9 6 5.5" {...P} />
      <circle cx="17" cy="9" r="2.4" {...P} />
      <path d="M16 14.6c2.6 0 4.4 1.6 5 4.4" {...P} />
    </>
  ),
  menu: (
    <>
      <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1-3 3.5-3 7h3v11" {...P} />
    </>
  ),
  proyecciones: (
    <>
      <path d="M3 20h18M5 16l4-5 4 3 6-8" {...P} />
      <path d="M15 6h4v4" {...P} />
    </>
  ),
  locales: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z" {...P} />
      <circle cx="12" cy="10" r="2.4" {...P} />
    </>
  ),
  tramites: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" {...P} />
      <path d="M9 3.5h6v3H9zM8.5 12l2 2 4-4M8.5 17.5h7" {...P} />
    </>
  ),
  documentos: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...P} />
    </>
  ),
  plan: (
    <>
      <path d="M6 3h9l4 4v14H6z" {...P} />
      <path d="M9 17v-3M12 17v-6M15 17v-4" {...P} />
    </>
  ),
  ajustes: (
    <>
      <circle cx="12" cy="12" r="3" {...P} />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" {...P} />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" {...P} />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" {...P} />,
  plus: <path d="M12 5v14M5 12h14" {...P} />,
  logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" {...P} />,
  print: (
    <>
      <path d="M7 9V3h10v6M7 17H4v-7h16v7h-3" {...P} />
      <rect x="7" y="14" width="10" height="7" {...P} />
    </>
  ),
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" {...P} />,
};

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {paths[name] ?? paths.plan}
    </svg>
  );
}
