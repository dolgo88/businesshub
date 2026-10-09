// Simulador mínimo de Google Sheets / Apps Script para ejecutar apps-script/Code.gs fuera de Google.
// Lo usan los tests unitarios (Code.test.ts) y las pruebas end-to-end del modo Google Sheets.
import { readFileSync } from 'node:fs';
import { createHash, createHmac, randomUUID } from 'node:crypto';

type Cell = string | number | boolean | Date;

const toSigned = (buf: Buffer) => Array.from(buf).map((b) => (b > 127 ? b - 256 : b));
const toBuf = (v: string | number[]) => (typeof v === 'string' ? Buffer.from(v, 'utf8') : Buffer.from(v.map((b) => b & 0xff)));

export class FakeSheet {
  values: Cell[][] = [];
  textCols = new Set<number>();
  constructor(public name: string) {}
  getName() { return this.name; }
  private ensure(rows: number, cols: number) {
    while (this.values.length < rows) this.values.push([]);
    for (const r of this.values) while (r.length < cols) r.push('');
  }
  getDataRange() {
    const rows = this.values.length || 1;
    const cols = Math.max(1, ...this.values.map((r) => r.length));
    this.ensure(rows, cols);
    return this.getRange(1, 1, rows, cols);
  }
  getRange(a: number | string, col = 1, numRows = 1, numCols = 1) {
    if (typeof a === 'string') return { setNumberFormat: () => undefined };
    const row = a;
    const sheet = this;
    const range = {
      getValues: () => sheet.values.slice(row - 1, row - 1 + numRows).map((r) => r.slice(col - 1, col - 1 + numCols).map((v) => (v instanceof Date ? new Date(v) : v))),
      setValues: (data: Cell[][]) => {
        sheet.ensure(row - 1 + data.length, col - 1 + data[0].length);
        data.forEach((r, i) => r.forEach((v, j) => {
          const c = col - 1 + j;
          // Como Sheets: un texto con forma de fecha se convierte en fecha salvo que la columna sea texto plano.
          sheet.values[row - 1 + i][c] = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !sheet.textCols.has(c) ? new Date(`${v}T00:00:00`) : typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v;
        }));
        return range;
      },
      setValue: (v: Cell) => range.setValues([[v]]),
      setFontWeight: () => range,
      setNumberFormat: (f: string) => { if (f === '@') for (let j = 0; j < numCols; j++) sheet.textCols.add(col - 1 + j); return range; },
      clearContent: () => range,
    };
    return range;
  }
  clearContents() { this.values = []; }
  setFrozenRows() {}
  getMaxColumns() { return Math.max(1, ...this.values.map((r) => r.length)); }
  getMaxRows() { return this.values.length; }
  getLastRow() { return this.values.filter((r) => r.some((v) => v !== '')).length; }
  getLastColumn() { return Math.max(0, ...this.values.map((r) => r.length)); }
}

export function loadScript() {
  const sheets: FakeSheet[] = [];
  const cache = new Map<string, string>();
  const props = new Map<string, string>();
  const ss = {
    getSheetByName: (n: string) => sheets.find((s) => s.name === n) ?? null,
    insertSheet: (n: string) => { const s = new FakeSheet(n); sheets.push(s); return s; },
    getSheets: () => sheets,
    deleteSheet: (s: FakeSheet) => sheets.splice(sheets.indexOf(s), 1),
  };
  const globals = {
    SpreadsheetApp: { getActive: () => ss, flush: () => undefined },
    Utilities: {
      base64EncodeWebSafe: (v: string | number[]) => toBuf(v).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      base64DecodeWebSafe: (s: string) => toSigned(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
      computeHmacSha256Signature: (v: string, k: string) => toSigned(createHmac('sha256', k).update(v).digest()),
      computeDigest: (_a: unknown, v: string) => toSigned(createHash('md5').update(v, 'utf8').digest()),
      DigestAlgorithm: { MD5: 'MD5' },
      Charset: { UTF_8: 'UTF-8' },
      getUuid: () => randomUUID(),
      formatDate: (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      newBlob: (bytes: number[]) => ({ getDataAsString: () => toBuf(bytes).toString('utf8') }),
    },
    CacheService: { getScriptCache: () => ({ get: (k: string) => cache.get(k) ?? null, put: (k: string, v: string) => cache.set(k, v), remove: (k: string) => cache.delete(k) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => props.get(k) ?? null, setProperty: (k: string, v: string) => props.set(k, v), deleteProperty: (k: string) => props.delete(k) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => undefined, releaseLock: () => undefined }) },
    ContentService: { createTextOutput: (s: string) => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    Session: { getScriptTimeZone: () => 'Europe/Madrid' },
    Logger: { log: () => undefined },
  };
  const src = readFileSync(new URL('./Code.gs', import.meta.url), 'utf8');
  const names = Object.keys(globals);
  const factory = new Function(...names, `${src}\nreturn { doPost, setup, selfTest };`);
  const api = factory(...Object.values(globals)) as { doPost: (e: unknown) => { s: string }; setup: () => void; selfTest: () => Record<string, boolean> };
  const call = (payload: Record<string, unknown>) => JSON.parse(api.doPost({ postData: { contents: JSON.stringify(payload) } }).s);
  return { ...api, call, ss };
}
