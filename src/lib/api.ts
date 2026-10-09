import type { ColumnSpec } from '../data/schema';

export interface User {
  usuario: string;
  nombre: string;
  rol: 'editor' | 'lector' | string;
}

export interface Session {
  token: string;
  user: User;
}

export interface RemoteTable {
  version: string;
  rows: Record<string, unknown>[];
}

export interface Api {
  mode: 'demo' | 'sheets';
  login(usuario: string, password: string): Promise<Session>;
  getAll(token: string): Promise<Record<string, RemoteTable>>;
  saveTable(
    token: string,
    table: string,
    columns: ColumnSpec[],
    rows: Record<string, unknown>[],
    baseVersion: string | null,
  ): Promise<{ version: string }>;
}

export class ApiError extends Error {
  constructor(
    public code: 'unauthorized' | 'forbidden' | 'conflict' | 'network' | 'bad_request' | 'error' | string,
    message: string,
  ) {
    super(message);
  }
}

// ------------------------------------------------------------------------------------------------
// Google Apps Script (Google Sheets como base de datos)
// ------------------------------------------------------------------------------------------------

export class AppsScriptApi implements Api {
  mode = 'sheets' as const;
  constructor(private url: string) {}

  private async call<T>(payload: Record<string, unknown>): Promise<T> {
    let res: Response;
    try {
      // text/plain evita la petición previa (preflight) de CORS, que Apps Script no admite.
      res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });
    } catch {
      throw new ApiError('network', 'No se ha podido conectar con Google Sheets. Revisa la conexión y la URL del Apps Script.');
    }
    let data: { ok: boolean; code?: string; message?: string } & Record<string, unknown>;
    try {
      data = await res.json();
    } catch {
      throw new ApiError('network', 'Respuesta no válida del Apps Script. ¿Está desplegado como aplicación web con acceso "Cualquier usuario"?');
    }
    if (!data.ok) throw new ApiError(data.code ?? 'error', data.message ?? 'Error desconocido');
    return data as unknown as T;
  }

  async login(usuario: string, password: string): Promise<Session> {
    const r = await this.call<{ token: string; user: User }>({ action: 'login', usuario, password });
    return { token: r.token, user: r.user };
  }

  async getAll(token: string): Promise<Record<string, RemoteTable>> {
    const r = await this.call<{ tables: Record<string, RemoteTable> }>({ action: 'getAll', token });
    return r.tables;
  }

  async saveTable(token: string, table: string, columns: ColumnSpec[], rows: Record<string, unknown>[], baseVersion: string | null) {
    return this.call<{ version: string }>({ action: 'saveTable', token, table, columns, rows, baseVersion });
  }
}

// ------------------------------------------------------------------------------------------------
// Modo demo: todo se guarda en este navegador (localStorage). Usuario: demo / demo
// ------------------------------------------------------------------------------------------------

const DEMO_KEY = 'businesshub.demo.v1';

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export class LocalDemoApi implements Api {
  mode = 'demo' as const;
  private memory: Record<string, Record<string, unknown>[]> = {};

  private read(): Record<string, Record<string, unknown>[]> {
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      return raw ? JSON.parse(raw) : this.memory;
    } catch {
      return this.memory;
    }
  }

  private write(data: Record<string, Record<string, unknown>[]>) {
    this.memory = data;
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(data));
    } catch {
      // sin almacenamiento: los cambios se quedan en memoria mientras la pestaña esté abierta
    }
  }

  async login(usuario: string, password: string): Promise<Session> {
    if (usuario.trim().toLowerCase() !== 'demo' || password !== 'demo') {
      throw new ApiError('unauthorized', 'En modo demo el usuario es "demo" y la contraseña "demo".');
    }
    return { token: 'demo', user: { usuario: 'demo', nombre: 'Demo', rol: 'editor' } };
  }

  async getAll(): Promise<Record<string, RemoteTable>> {
    const data = this.read();
    const out: Record<string, RemoteTable> = {};
    for (const [k, rows] of Object.entries(data)) out[k] = { version: hash(JSON.stringify(rows)), rows };
    return out;
  }

  async saveTable(_token: string, table: string, _columns: ColumnSpec[], rows: Record<string, unknown>[], baseVersion: string | null) {
    const data = this.read();
    if (baseVersion !== null && data[table] && hash(JSON.stringify(data[table])) !== baseVersion) {
      throw new ApiError('conflict', 'Los datos han cambiado en otra pestaña.');
    }
    data[table] = rows;
    this.write(data);
    return { version: hash(JSON.stringify(rows)) };
  }

  static reset() {
    try {
      localStorage.removeItem(DEMO_KEY);
    } catch {
      // nada que borrar
    }
  }
}

// ------------------------------------------------------------------------------------------------
// Elección del backend
// ------------------------------------------------------------------------------------------------

const URL_KEY = 'businesshub.apiUrl';

export function getConfiguredUrl(): string {
  try {
    const stored = localStorage.getItem(URL_KEY);
    if (stored) return stored;
  } catch {
    // sin localStorage
  }
  return (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '';
}

export function setConfiguredUrl(url: string) {
  try {
    if (url) localStorage.setItem(URL_KEY, url.trim());
    else localStorage.removeItem(URL_KEY);
  } catch {
    // sin localStorage
  }
}

export function isDemoForced(): boolean {
  return typeof window !== 'undefined' && /[?&]demo=1\b/.test(window.location.search);
}

export function createApi(): Api {
  const url = getConfiguredUrl();
  if (url && !isDemoForced()) return new AppsScriptApi(url);
  return new LocalDemoApi();
}
