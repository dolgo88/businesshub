import { describe, expect, it } from 'vitest';
import { cobertura, costePersona, horasTurno, minimoConvenioAnual } from './payroll';
import type { Persona, PuestoConvenio } from '../data/types';

const puesto: PuestoConvenio = { id: 'c', puesto: 'Camarero/a', nivel: 'III', salarioMensual: 1607.25, pagas: 14, fuente: '' };
const persona: Persona = {
  id: 'p', nombre: 'Ana', tipo: 'empleado', puestoId: 'c', horasSemana: 40, salarioBrutoAnual: 22501.5, pagas: 14,
  fechaAlta: '2027-03-15', retiradaMensual: 0, socioId: '', notas: '',
};

describe('personal', () => {
  it('coste de empresa = bruto + Seguridad Social a cargo de la empresa', () => {
    const c = costePersona(persona, [puesto], 32);
    expect(c.costeEmpresaAnual).toBeCloseTo(22501.5 * 1.32, 2);
    expect(c.costeEmpresaMensual).toBeCloseTo((22501.5 * 1.32) / 12, 2);
    expect(c.bajoConvenio).toBe(false);
  });

  it('el mínimo de convenio es proporcional a la jornada y avisa si se paga menos', () => {
    expect(minimoConvenioAnual(puesto, 20)).toBeCloseTo(22501.5 / 2, 2);
    expect(costePersona({ ...persona, salarioBrutoAnual: 20000 }, [puesto], 32).bajoConvenio).toBe(true);
  });

  it('los socios no tienen coste de nómina', () => {
    expect(costePersona({ ...persona, tipo: 'socio' }, [puesto], 32).costeEmpresaAnual).toBe(0);
  });

  it('turnos que cruzan medianoche y cobertura semanal', () => {
    expect(horasTurno({ id: 't', nombre: '', horaInicio: '19:00', horaFin: '24:00', diasSemana: 5, personas: 2 })).toBe(5);
    expect(horasTurno({ id: 't', nombre: '', horaInicio: '22:00', horaFin: '02:00', diasSemana: 5, personas: 2 })).toBe(4);
    const c = cobertura([{ id: 't', nombre: '', horaInicio: '08:00', horaFin: '16:00', diasSemana: 5, personas: 2 }], [persona]);
    expect(c.horasNecesarias).toBe(80);
    expect(c.diferencia).toBe(-40);
    expect(c.personasJornadaCompletaFaltan).toBe(1);
  });
});
