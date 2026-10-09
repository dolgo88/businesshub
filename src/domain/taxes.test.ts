import { describe, expect, it } from 'vitest';
import { cuotaAutonomo, cuotaAutonomoPorTramo, cuotaEscala, ESCALA_IRPF_ESTATAL, irpfAnual } from './taxes';

describe('IRPF', () => {
  it('escala estatal por tramos', () => {
    expect(cuotaEscala(12450, ESCALA_IRPF_ESTATAL)).toBeCloseTo(1182.75, 2);
    expect(cuotaEscala(20200, ESCALA_IRPF_ESTATAL)).toBeCloseTo(1182.75 + 930, 2);
  });

  it('sin rendimiento no hay IRPF y con poco rendimiento casi nada (mínimo personal)', () => {
    expect(irpfAnual(0).total).toBe(0);
    expect(irpfAnual(5000).total).toBe(0);
  });

  it('30.000 € de rendimiento tributan alrededor del 20-25 % efectivo', () => {
    const r = irpfAnual(30000);
    expect(r.gastosDificilJustificacion).toBe(1500);
    expect(r.tipoMedioPct).toBeGreaterThan(15);
    expect(r.tipoMedioPct).toBeLessThan(25);
  });
});

describe('cuota de autónomos', () => {
  const opts = { cuotaTarifaPlana: 88.6, mesesTarifaPlana: 12 };
  it('tarifa plana los primeros 12 meses', () => {
    expect(cuotaAutonomo(3000, 0, opts)).toBe(88.6);
    expect(cuotaAutonomo(3000, 11, opts)).toBe(88.6);
  });
  it('después, por tramo de rendimiento', () => {
    expect(cuotaAutonomo(3000, 12, opts)).toBeCloseTo(cuotaAutonomoPorTramo(3000), 6);
    expect(cuotaAutonomoPorTramo(500)).toBeLessThan(cuotaAutonomoPorTramo(3000));
    expect(cuotaAutonomoPorTramo(10000)).toBeCloseTo(1928.1 * 0.315, 2);
  });
});
