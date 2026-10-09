import { describe, expect, it } from 'vitest';
import { parseRow, serializeRow } from './schema';
import { DEFAULT_SETTINGS, settingsFromRows, settingsToRows } from './settings';

describe('conversión de filas del Sheet', () => {
  it('interpreta números, booleanos, listas y fechas tal y como llegan del Sheet', () => {
    const t = parseRow('Tareas', {
      id: 'a', duracion: '12', hecho: 'TRUE', dependencias: 'x, y', inicioFijo: '2027-01-05T00:00:00.000Z', fechaHecho: '05/01/2027',
    });
    expect(t.duracion).toBe(12);
    expect(t.hecho).toBe(true);
    expect(t.dependencias).toEqual(['x', 'y']);
    expect(t.inicioFijo).toBe('2027-01-05');
    expect(t.fechaHecho).toBe('2027-01-05');
    expect(t.nombre).toBe('');
  });

  it('admite números con formato español', () => {
    expect(parseRow('GastosFijos', { importeMensual: '1.234,5' }).importeMensual).toBe(1234.5);
  });

  it('ida y vuelta sin perder información', () => {
    const t = parseRow('Tareas', { id: 'a', nombre: 'Obra', duracion: 5, dependencias: 'b,c', hecho: false });
    expect(parseRow('Tareas', serializeRow('Tareas', t))).toEqual(t);
  });

  it('configuración clave/valor', () => {
    const rows = settingsToRows({ ...DEFAULT_SETTINGS, imprevistosPct: 15, estacionalidad: [1, 2, 3] });
    const s = settingsFromRows(rows);
    expect(s.imprevistosPct).toBe(15);
    expect(s.estacionalidad).toEqual([1, 2, 3]);
    expect(settingsFromRows([{ clave: 'fondoManiobraMeses', valor: '4,5' }]).fondoManiobraMeses).toBe(4.5);
    expect(settingsFromRows([]).fechaKickoff).toBe('2027-04-01');
  });
});
