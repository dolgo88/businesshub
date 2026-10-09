import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useData } from '../state/DataContext';
import { navigate } from '../lib/router';
import { Icon } from './Icons';
import { moduleById } from '../modules';

// ------------------------------------------------------------------------------------------------
// Estructura de página
// ------------------------------------------------------------------------------------------------

export function AppHeader() {
  const { session, logout, api, saveStatus } = useData();
  return (
    <header className="app-header no-print">
      <a className="brand" href="#/">
        <span className="brand-mark">B</span>
        <span className="brand-text">BusinessHub</span>
      </a>
      {api.mode === 'demo' && <span className="demo-badge" title="Los datos se guardan solo en este navegador">Modo demo</span>}
      <div className="header-spacer" />
      <SaveIndicator status={saveStatus} />
      <a className="btn ghost small" href="#/ajustes" title="Ajustes">
        <Icon name="ajustes" size={17} />
      </a>
      {session && (
        <div className="header-user">
          <span className="name">{session.user.nombre}</span>
          <button className="btn small" onClick={logout} title="Cerrar sesión">
            <Icon name="logout" size={16} /> <span className="btn-text">Salir</span>
          </button>
        </div>
      )}
    </header>
  );
}

export function SaveIndicator({ status }: { status: string }) {
  const text: Record<string, string> = {
    idle: '',
    pending: 'Cambios sin guardar…',
    saving: 'Guardando…',
    saved: 'Guardado',
    error: 'Error al guardar',
  };
  if (!text[status]) return null;
  return (
    <span className={`save-indicator ${status}`} aria-live="polite">
      <span className="dot" /> {text[status]}
    </span>
  );
}

export function PageShell({
  moduleId,
  title,
  subtitle,
  actions,
  children,
}: {
  moduleId: string;
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const m = moduleById(moduleId);
  return (
    <div className="page">
      <div className="page-head">
        <button className="btn ghost small no-print" onClick={() => navigate('/')} aria-label="Volver al inicio">
          <Icon name="back" size={16} /> Inicio
        </button>
      </div>
      <div className="page-head">
        <div className="page-icon" style={{ background: m.color }}>
          <Icon name={m.id} size={24} />
        </div>
        <div className="titles">
          <h1>{title ?? m.title}</h1>
          <p>{subtitle ?? m.description}</p>
        </div>
        {actions && <div className="page-actions no-print">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Toasts() {
  const { toasts } = useData();
  return (
    <div className="toasts" role="status">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Bloques
// ------------------------------------------------------------------------------------------------

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'ok' | 'warn' | 'bad' | 'info' }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export function Alert({ tone, title, children, action }: { tone: 'ok' | 'warn' | 'bad' | 'info'; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={`alert ${tone}`}>
      <div className="alert-body">
        {title && <strong>{title}</strong>}
        {children}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className ?? ''}`}>
      {(title || actions) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs no-print" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === value} className={`tab ${t.id === value ? 'active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Pestaña recordada en la URL (para volver a la misma al recargar). */
export function useTab<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const storageKey = `businesshub.tab.${key}`;
  const [v, setV] = useState<T>(() => {
    try {
      return (sessionStorage.getItem(storageKey) as T) || initial;
    } catch {
      return initial;
    }
  });
  const set = (x: T) => {
    setV(x);
    try {
      sessionStorage.setItem(storageKey, x);
    } catch {
      // sin almacenamiento
    }
  };
  return [v, set];
}

export function ProgressBar({ value, tone }: { value: number; tone?: 'ok' | 'warn' | 'bad' }) {
  return (
    <div className="bar-track" aria-valuenow={Math.round(value)} role="progressbar">
      <div className={`bar-fill ${tone ?? ''}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Campos
// ------------------------------------------------------------------------------------------------

export function parseNumber(s: string): number | null {
  const t = s.trim().replace(/\s|€|%/g, '');
  if (!t) return 0;
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function formatEditable(n: number, decimals: number) {
  if (!Number.isFinite(n)) return '';
  const r = Math.round(n * 10 ** decimals) / 10 ** decimals;
  return r.toLocaleString('es-ES', { maximumFractionDigits: decimals, useGrouping: false });
}

/** Campo numérico que acepta coma decimal y no "salta" mientras escribes. */
export function NumberInput({
  value,
  onChange,
  decimals = 2,
  className = 'input num',
  disabled,
  ariaLabel,
  min,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  decimals?: number;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  min?: number;
  suffix?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? formatEditable(value, decimals);
  const input = (
    <input
      className={className}
      inputMode="decimal"
      value={shown}
      disabled={disabled}
      aria-label={ariaLabel}
      onFocus={(e) => {
        setDraft(formatEditable(value, decimals));
        e.currentTarget.select();
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = parseNumber(e.target.value);
        if (n !== null) onChange(min !== undefined ? Math.max(min, n) : n);
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
  if (!suffix) return input;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {input}
      <small>{suffix}</small>
    </span>
  );
}

export function TextInput({ value, onChange, placeholder, className = 'input', ariaLabel, disabled }: { value: string; onChange: (s: string) => void; placeholder?: string; className?: string; ariaLabel?: string; disabled?: boolean }) {
  return <input className={className} value={value} placeholder={placeholder} aria-label={ariaLabel} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
}

export function DateInput({ value, onChange, className = 'input', ariaLabel, disabled }: { value: string; onChange: (s: string) => void; className?: string; ariaLabel?: string; disabled?: boolean }) {
  return <input type="date" className={className} value={value || ''} aria-label={ariaLabel} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
}

export function Select({
  value,
  onChange,
  options,
  className = 'select',
  ariaLabel,
  disabled,
}: {
  value: string;
  onChange: (s: string) => void;
  options: (string | { value: string; label: string })[];
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const known = opts.some((o) => o.value === value);
  return (
    <select className={className} value={value} aria-label={ariaLabel} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {!known && <option value={value}>{value || '—'}</option>}
      {opts.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = '—',
  disabled,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const labels = value.map((v) => options.find((o) => o.value === v)?.label ?? v);
  const visible = options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="multi" ref={ref}>
      <button type="button" className="multi-btn" disabled={disabled} onClick={() => setOpen((o) => !o)} title={labels.join(', ')}>
        {labels.length ? (
          <span className="chips">
            {labels.map((l) => (
              <span key={l} className="pill">
                {l.length > 26 ? `${l.slice(0, 25)}…` : l}
              </span>
            ))}
          </span>
        ) : (
          <span className="muted">{placeholder}</span>
        )}
      </button>
      {open && (
        <div className="multi-pop">
          {options.length > 8 && (
            <input className="input" placeholder="Buscar…" value={filter} autoFocus onChange={(e) => setFilter(e.target.value)} style={{ marginBottom: 6 }} />
          )}
          {visible.map((o) => (
            <label key={o.value}>
              <input
                type="checkbox"
                checked={value.includes(o.value)}
                onChange={(e) => onChange(e.target.checked ? [...value, o.value] : value.filter((v) => v !== o.value))}
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (b: boolean) => void; label?: ReactNode; disabled?: boolean }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
