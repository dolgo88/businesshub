import { describe, expect, it } from 'vitest';
import { amortize, cuotaFrancesa } from './loans';
import type { Prestamo } from '../data/types';

const base: Prestamo = {
  id: 'p', entidad: 'Banco', importe: 100000, tinPct: 6, plazoMeses: 60, carenciaMeses: 0,
  comisionAperturaPct: 0, fechaInicio: '2027-01-15', notas: '',
};

describe('préstamos', () => {
  it('cuota francesa conocida (100.000 € al 6 % a 5 años = 1.933,28 €)', () => {
    expect(cuotaFrancesa(100000, 6, 60)).toBeCloseTo(1933.28, 2);
  });

  it('la tabla amortiza todo el capital y empieza el mes siguiente a la firma', () => {
    const r = amortize(base);
    expect(r.filas).toHaveLength(60);
    expect(r.filas[0].month).toBe('2027-02');
    expect(r.filas[59].pendiente).toBeCloseTo(0, 6);
    const capital = r.filas.reduce((s, f) => s + f.amortizacion, 0);
    expect(capital).toBeCloseTo(100000, 4);
    expect(r.totalIntereses).toBeCloseTo(1933.28 * 60 - 100000, 0);
  });

  it('con carencia solo se pagan intereses los primeros meses', () => {
    const r = amortize({ ...base, carenciaMeses: 6 });
    expect(r.filas[0].cuota).toBeCloseTo(500, 6);
    expect(r.filas[5].amortizacion).toBe(0);
    expect(r.cuotaMensual).toBeCloseTo(cuotaFrancesa(100000, 6, 54), 6);
  });

  it('TAE: sin comisión ≈ (1 + TIN/12)^12 - 1; con comisión es mayor', () => {
    expect(amortize(base).taePct).toBeCloseTo(6.168, 2);
    expect(amortize({ ...base, comisionAperturaPct: 1 }).taePct).toBeGreaterThan(6.168);
  });

  it('préstamo sin intereses', () => {
    const r = amortize({ ...base, tinPct: 0, plazoMeses: 10, importe: 1000 });
    expect(r.cuotaMensual).toBe(100);
    expect(r.totalIntereses).toBe(0);
  });
});
