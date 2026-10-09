import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Database, TableName } from '../data/types';
import { columnsOf, emptyDatabase, parseRow, serializeRow, TABLE_NAMES } from '../data/schema';
import { DEFAULT_SETTINGS, settingsFromRows, settingsToRows, type Settings } from '../data/settings';
import { seedDatabase } from '../seed';
import { ApiError, createApi, type Api, type Session } from '../lib/api';
import { computeAll, type Derived } from './derived';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';
export type LoadState = 'anonymous' | 'loading' | 'empty' | 'ready' | 'error';

interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'ok';
}

interface DataContextValue {
  api: Api;
  session: Session | null;
  loadState: LoadState;
  loadError: string;
  db: Database;
  derived: Derived;
  saveStatus: SaveStatus;
  readOnly: boolean;
  toasts: Toast[];
  login(usuario: string, password: string): Promise<void>;
  logout(): void;
  reload(): Promise<void>;
  initialize(kind: 'ejemplo' | 'vacio'): Promise<void>;
  setTable<T extends TableName>(table: T, rows: Database[T] | ((prev: Database[T]) => Database[T])): void;
  updateSettings(patch: Partial<Settings>): void;
  notify(text: string, kind?: Toast['kind']): void;
}

const Ctx = createContext<DataContextValue | null>(null);

const SESSION_KEY = 'businesshub.session';
const SAVE_DELAY = 900;

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function storeSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // sin localStorage: la sesión dura lo que la pestaña
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => createApi(), []);
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [loadState, setLoadState] = useState<LoadState>(session ? 'loading' : 'anonymous');
  const [loadError, setLoadError] = useState('');
  const [db, setDb] = useState<Database>(() => emptyDatabase());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dbRef = useRef(db);
  dbRef.current = db;
  const versions = useRef<Partial<Record<TableName, string | null>>>({});
  const dirty = useRef(new Set<TableName>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const readOnly = session?.user.rol === 'lector';

  const notify = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 3500);
  }, []);

  const logout = useCallback(() => {
    storeSession(null);
    setSession(null);
    setDb(emptyDatabase());
    versions.current = {};
    dirty.current.clear();
    setLoadState('anonymous');
  }, []);

  const handleAuthError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.code === 'unauthorized') {
        notify('La sesión ha caducado. Vuelve a entrar.', 'error');
        logout();
        return true;
      }
      return false;
    },
    [logout, notify],
  );

  const saveTableNow = useCallback(
    async (table: TableName, rows: Record<string, unknown>[]) => {
      const s = sessionRef.current;
      if (!s) return;
      const base = versions.current[table] ?? null;
      const r = await api.saveTable(s.token, table, columnsOf(table), rows, base);
      versions.current[table] = r.version;
    },
    [api],
  );

  const load = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    setLoadState('loading');
    setLoadError('');
    try {
      const remote = await api.getAll(s.token);
      const present = TABLE_NAMES.filter((t) => remote[t]);
      if (present.length === 0) {
        setLoadState('empty');
        return;
      }
      const next = emptyDatabase() as unknown as Record<TableName, unknown[]>;
      for (const t of TABLE_NAMES) {
        if (remote[t]) {
          next[t] = remote[t].rows.filter((r) => Object.values(r).some((v) => v !== '' && v !== null)).map((r) => parseRow(t, r));
          versions.current[t] = remote[t].version;
        }
      }
      // Pestañas que faltan (una inicialización que se cortó, o tablas nuevas tras una actualización):
      // se crean vacías, nunca con datos de ejemplo, para no mezclar datos.
      const missing = TABLE_NAMES.filter((t) => !remote[t]);
      for (const t of missing) {
        const rows = t === 'Config' ? settingsToRows(DEFAULT_SETTINGS) : [];
        next[t] = rows;
        versions.current[t] = null;
        if (s.user.rol !== 'lector') {
          await saveTableNow(t, (rows as Database[typeof t]).map((r) => serializeRow(t, r as never)));
        }
      }
      setDb(next as unknown as Database);
      setLoadState('ready');
    } catch (e) {
      if (handleAuthError(e)) return;
      setLoadError(e instanceof Error ? e.message : String(e));
      setLoadState('error');
    }
  }, [api, handleAuthError, saveTableNow]);

  const flush = useCallback(async () => {
    if (saving.current || dirty.current.size === 0) return;
    saving.current = true;
    setSaveStatus('saving');
    try {
      while (dirty.current.size) {
        const table = dirty.current.values().next().value as TableName;
        dirty.current.delete(table);
        const rows = (dbRef.current[table] as Database[typeof table]).map((r) => serializeRow(table, r as never));
        await saveTableNow(table, rows);
      }
      setSaveStatus('saved');
    } catch (e) {
      if (handleAuthError(e)) return;
      if (e instanceof ApiError && e.code === 'conflict') {
        notify('Alguien ha guardado cambios a la vez que tú. Se han recargado los datos más recientes.', 'error');
        dirty.current.clear();
        await load();
        setSaveStatus('idle');
      } else {
        notify(`No se ha podido guardar: ${e instanceof Error ? e.message : e}`, 'error');
        setSaveStatus('error');
      }
    } finally {
      saving.current = false;
      if (dirty.current.size) {
        timer.current = setTimeout(() => void flush(), SAVE_DELAY);
      }
    }
  }, [handleAuthError, load, notify, saveTableNow]);

  const setTable = useCallback(
    <T extends TableName>(table: T, rows: Database[T] | ((prev: Database[T]) => Database[T])) => {
      if (readOnly) {
        notify('Tu usuario es de solo lectura.', 'error');
        return;
      }
      setDb((prev) => {
        const nextRows = typeof rows === 'function' ? (rows as (p: Database[T]) => Database[T])(prev[table]) : rows;
        const next = { ...prev, [table]: nextRows };
        dbRef.current = next;
        return next;
      });
      dirty.current.add(table);
      setSaveStatus('pending');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY);
    },
    [flush, notify, readOnly],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setTable('Config', (prev) => settingsToRows({ ...settingsFromRows(prev), ...patch }));
    },
    [setTable],
  );

  const login = useCallback(
    async (usuario: string, password: string) => {
      const s = await api.login(usuario, password);
      storeSession(s);
      sessionRef.current = s;
      setSession(s);
    },
    [api],
  );

  const initialize = useCallback(
    async (kind: 'ejemplo' | 'vacio') => {
      const seed = kind === 'ejemplo' ? seedDatabase() : { ...emptyDatabase(), Config: settingsToRows(DEFAULT_SETTINGS) };
      setLoadState('loading');
      try {
        for (const t of TABLE_NAMES) {
          versions.current[t] = null;
          await saveTableNow(t, (seed[t] as Database[typeof t]).map((r) => serializeRow(t, r as never)));
        }
        await load();
      } catch (e) {
        if (handleAuthError(e)) return;
        setLoadError(e instanceof Error ? e.message : String(e));
        setLoadState('error');
      }
    },
    [handleAuthError, load, saveTableNow],
  );

  useEffect(() => {
    if (session) void load();
  }, [session, load]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current.size || saving.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const derived = useMemo(() => computeAll(db), [db]);

  const value: DataContextValue = {
    api,
    session,
    loadState,
    loadError,
    db,
    derived,
    saveStatus,
    readOnly,
    toasts,
    login,
    logout,
    reload: load,
    initialize,
    setTable,
    updateSettings,
    notify,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData fuera de DataProvider');
  return v;
}
