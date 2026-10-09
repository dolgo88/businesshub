// Ejecuta apps-script/Code.gs contra un simulador mínimo de Google Sheets / Apps Script,
// para comprobar el contrato completo entre la web y el Sheet (login, lectura, escritura, conflictos).
import { describe, expect, it } from 'vitest';
import { columnsOf, parseRow, serializeRow, TABLE_NAMES } from '../src/data/schema';
import { seedDatabase } from '../src/seed';
import type { Database, TableName } from '../src/data/types';
import { loadScript } from './simulator';

describe('Apps Script (Code.gs) contra un Sheet simulado', () => {
  it('selfTest pasa todas las comprobaciones', () => {
    const { selfTest } = loadScript();
    expect(Object.values(selfTest()).every(Boolean)).toBe(true);
  });

  it('login, guardar todas las tablas y leerlas de vuelta sin pérdidas', () => {
    const { setup, call } = loadScript();
    setup();
    expect(call({ action: 'login', usuario: 'socio1', password: 'mala' }).code).toBe('unauthorized');
    const login = call({ action: 'login', usuario: 'Socio1', password: 'cambia-esta-clave' });
    expect(login.ok).toBe(true);
    expect(login.user.nombre).toBe('Socio 1');
    const token = login.token;

    const empty = call({ action: 'getAll', token });
    expect(Object.keys(empty.tables)).toEqual([]); // la pestaña Usuarios nunca se envía

    const seed = seedDatabase();
    for (const t of TABLE_NAMES) {
      const rows = (seed[t] as Database[TableName]).map((r) => serializeRow(t, r as never));
      const r = call({ action: 'saveTable', token, table: t, columns: columnsOf(t), rows, baseVersion: null });
      expect(r.ok).toBe(true);
    }
    const all = call({ action: 'getAll', token });
    for (const t of TABLE_NAMES) {
      const parsed = all.tables[t].rows.map((r: Record<string, unknown>) => parseRow(t, r));
      expect(parsed).toEqual(seed[t]);
    }
  });

  it('detecta cambios simultáneos, rechaza tokens falsos y respeta el rol lector', () => {
    const { setup, call, ss } = loadScript();
    setup();
    const token = call({ action: 'login', usuario: 'socio1', password: 'cambia-esta-clave' }).token;
    const cols = columnsOf('Socios');
    const v1 = call({ action: 'saveTable', token, table: 'Socios', columns: cols, rows: [], baseVersion: null }).version;
    const v2 = call({ action: 'saveTable', token, table: 'Socios', columns: cols, rows: [{ id: 'a', nombre: 'A' }], baseVersion: v1 }).version;
    expect(v2).not.toBe(v1);
    expect(call({ action: 'saveTable', token, table: 'Socios', columns: cols, rows: [], baseVersion: v1 }).code).toBe('conflict');

    expect(call({ action: 'getAll', token: token.replace(/.$/, 'x') }).code).toBe('unauthorized');
    expect(call({ action: 'saveTable', token, table: 'Usuarios', columns: cols, rows: [], baseVersion: null }).code).toBe('bad_request');

    const users = ss.getSheetByName('Usuarios')!;
    users.values[2][3] = 'lector';
    const lector = call({ action: 'login', usuario: 'socio2', password: 'cambia-esta-clave' }).token;
    expect(call({ action: 'getAll', token: lector }).ok).toBe(true);
    expect(call({ action: 'saveTable', token: lector, table: 'Socios', columns: cols, rows: [], baseVersion: null }).code).toBe('forbidden');

    users.values[1][4] = false; // desactivar socio1
    expect(call({ action: 'getAll', token }).code).toBe('unauthorized');
  });

  it('bloquea tras muchos intentos fallidos', () => {
    const { setup, call } = loadScript();
    setup();
    for (let i = 0; i < 8; i++) call({ action: 'login', usuario: 'socio1', password: 'x' });
    const r = call({ action: 'login', usuario: 'socio1', password: 'cambia-esta-clave' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/intentos/);
  });
});
