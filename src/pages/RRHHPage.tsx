import { useData } from '../state/DataContext';
import { Alert, Card, PageShell, ProgressBar, Stat, Tabs, useTab } from '../components/ui';
import { EditableTable, type Column } from '../components/EditableTable';
import type { Persona, PuestoConvenio, Turno } from '../data/types';
import { horasTurno, JORNADA_COMPLETA, minimoConvenioAnual } from '../domain/payroll';
import { cuotaAutonomoPorTramo } from '../domain/taxes';
import { eur, num, uid } from '../lib/format';

type TabId = 'equipo' | 'cobertura' | 'convenio';

export function RRHHPage() {
  const { db, derived: d, setTable, readOnly } = useData();
  const [tab, setTab] = useTab<TabId>('rrhh', 'equipo');
  const costes = new Map(d.costes.map((c) => [c.persona.id, c]));
  const empleados = db.Personal.filter((p) => p.tipo === 'empleado');
  const socios = db.Personal.filter((p) => p.tipo === 'socio');
  const bajoConvenio = d.costes.filter((c) => c.bajoConvenio);
  const cob = d.cobertura;
  const puestoOptions = db.Convenio.map((c) => ({ value: c.id, label: `${c.puesto} (${c.nivel})` }));
  const socioOptions = [{ value: '', label: '—' }, ...db.Socios.map((s) => ({ value: s.id, label: s.nombre }))];

  const ajustarAConvenio = () => {
    setTable(
      'Personal',
      db.Personal.map((p) => {
        if (p.tipo !== 'empleado') return p;
        const puesto = db.Convenio.find((c) => c.id === p.puestoId);
        const min = minimoConvenioAnual(puesto, p.horasSemana);
        return min > p.salarioBrutoAnual ? { ...p, salarioBrutoAnual: Math.ceil(min) } : p;
      }),
    );
  };

  const columns: Column<Persona>[] = [
    { key: 'nombre', label: 'Nombre / puesto', width: 190 },
    { key: 'tipo', label: 'Tipo', type: 'select', width: 110, options: [{ value: 'empleado', label: 'Empleado/a' }, { value: 'socio', label: 'Socio/a' }] },
    { key: 'puestoId', label: 'Categoría (convenio)', type: 'select', width: 220, options: [{ value: '', label: '—' }, ...puestoOptions] },
    { key: 'horasSemana', label: 'Horas/sem', type: 'number', decimals: 1, width: 85 },
    { key: 'salarioBrutoAnual', label: 'Bruto anual', type: 'money', width: 120, readOnly: (p) => p.tipo === 'socio' },
    {
      key: 'minimo', label: 'Mínimo convenio', type: 'computed', align: 'right', width: 120,
      render: (p) => {
        const c = costes.get(p.id);
        if (!c || !c.minimoConvenioAnual || p.tipo === 'socio') return <span className="muted">—</span>;
        return <span style={{ color: c.bajoConvenio ? 'var(--bad)' : 'var(--muted)' }}>{eur(c.minimoConvenioAnual)}</span>;
      },
    },
    {
      key: 'coste', label: 'Coste empresa/mes', type: 'computed', align: 'right', width: 130,
      render: (p) => (p.tipo === 'socio' ? <span className="muted">cuota autónomo</span> : eur(costes.get(p.id)?.costeEmpresaMensual ?? 0)),
    },
    { key: 'retiradaMensual', label: 'Retirada/mes (socios)', type: 'money', width: 130, readOnly: (p) => p.tipo !== 'socio', title: 'Lo que cada socio prevé sacar al mes del negocio' },
    { key: 'fechaAlta', label: 'Alta', type: 'date', width: 140 },
    { key: 'socioId', label: 'Socio (financiación)', type: 'select', width: 150, options: socioOptions, readOnly: (p) => p.tipo !== 'socio' },
    { key: 'notas', label: 'Notas', width: 200 },
  ];

  return (
    <PageShell moduleId="rrhh" title="Equipo (RRHH)">
      <div className="stats">
        <Stat label="Personas" value={`${db.Personal.length}`} sub={`${socios.length} socios · ${empleados.length} empleados`} />
        <Stat label="Coste de personal / mes" value={eur(d.personalMensual)} sub={`${eur(d.personalMensual * 12)} al año (con Seg. Social)`} />
        <Stat label="Cuotas de autónomos / mes" value={eur(d.autonomosMensual)} sub={`tarifa plana ${eur(d.settings.cuotaTarifaPlana, 2)} × ${socios.length}`} />
        <Stat
          label="Cobertura de horarios"
          value={cob.diferencia >= 0 ? 'Cubierta' : `Faltan ${num(-cob.diferencia)} h/sem`}
          sub={`${num(cob.horasDisponibles)} h disponibles de ${num(cob.horasNecesarias)} h`}
          tone={cob.diferencia >= 0 ? 'ok' : 'bad'}
        />
      </div>

      {bajoConvenio.length > 0 && (
        <Alert tone="bad" title="Hay salarios por debajo del convenio" action={!readOnly && <button className="btn small" onClick={ajustarAConvenio}>Ajustar al mínimo</button>}>
          <p>{bajoConvenio.map((c) => c.persona.nombre).join(', ')}.</p>
        </Alert>
      )}

      <Tabs
        tabs={[
          { id: 'equipo', label: 'Equipo y costes' },
          { id: 'cobertura', label: 'Turnos y cobertura' },
          { id: 'convenio', label: 'Tabla de convenio' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'equipo' && (
        <>
          <EditableTable<Persona>
            rows={db.Personal}
            columns={columns}
            onChange={(rows) => setTable('Personal', rows)}
            readOnly={readOnly}
            newRow={() => {
              const puesto = db.Convenio.find((c) => c.id === 'conv-camarero') ?? db.Convenio[0];
              return {
                id: uid('per'), nombre: 'Nueva persona', tipo: 'empleado', puestoId: puesto?.id ?? '', horasSemana: 40,
                salarioBrutoAnual: Math.ceil(minimoConvenioAnual(puesto, 40)), pagas: 14, fechaAlta: d.settings.fechaKickoff,
                retiradaMensual: 0, socioId: '', notas: '',
              };
            }}
            addLabel="Añadir persona"
          />
          <div className="grid cols-2" style={{ marginTop: 16 }}>
            <div className="tip">
              <b>Socios que trabajan.</b> En una comunidad de bienes los socios son autónomos: no cobran nómina, sino del beneficio. Pagan la
              cuota de autónomos (tarifa plana de {eur(d.settings.cuotaTarifaPlana, 2)}/mes el primer año; después según rendimiento, p. ej.{' '}
              {eur(cuotaAutonomoPorTramo(2000))}/mes con 2.000 € netos). La «retirada mensual» es lo que pensáis sacar para vivir: en
              Proyecciones se comprueba si la caja lo aguanta.
            </div>
            <div className="tip">
              <b>Coste de empresa.</b> Bruto anual + Seguridad Social a cargo de la empresa ({d.settings.ssEmpresaPct} %, ajustable en Ajustes).
              El mínimo de convenio es proporcional a la jornada ({JORNADA_COMPLETA} h = completa). Los importes son orientativos: confirmadlos con la gestoría.
            </div>
          </div>
        </>
      )}

      {tab === 'cobertura' && (
        <div className="stack">
          <Card title="Horario de apertura y personas necesarias">
            <EditableTable<Turno>
              rows={db.Turnos}
              columns={[
                { key: 'nombre', label: 'Turno', width: 280 },
                { key: 'horaInicio', label: 'Desde', width: 90, placeholder: '07:00' },
                { key: 'horaFin', label: 'Hasta', width: 90, placeholder: '16:00' },
                { key: 'diasSemana', label: 'Días/sem', type: 'number', decimals: 0, width: 85 },
                { key: 'personas', label: 'Personas', type: 'number', decimals: 0, width: 85 },
                { key: 'horas', label: 'Persona-horas/sem', type: 'computed', align: 'right', width: 140, render: (t) => num(horasTurno(t) * t.diasSemana * t.personas) },
              ]}
              onChange={(rows) => setTable('Turnos', rows)}
              readOnly={readOnly}
              newRow={() => ({ id: uid('tu'), nombre: 'Nuevo turno', horaInicio: '09:00', horaFin: '17:00', diasSemana: 5, personas: 1 })}
              addLabel="Añadir turno"
            />
          </Card>
          <Card title="¿Llegáis con el equipo actual?">
            <div className="balance">
              <div className="balance-row">
                <span>Horas necesarias</span>
                <ProgressBar value={100} />
                <b className="num" style={{ textAlign: 'right' }}>{num(cob.horasNecesarias)} h</b>
              </div>
              <div className="balance-row">
                <span>Horas disponibles</span>
                <ProgressBar value={(cob.horasDisponibles / Math.max(1, cob.horasNecesarias)) * 100} tone={cob.diferencia >= 0 ? 'ok' : 'bad'} />
                <b className="num" style={{ textAlign: 'right' }}>{num(cob.horasDisponibles)} h</b>
              </div>
            </div>
            {cob.diferencia < 0 ? (
              <Alert tone="bad" title={`Faltan ${num(-cob.diferencia)} horas a la semana (≈ ${num(cob.personasJornadaCompletaFaltan, 1)} personas a jornada completa).`}>
                <p className="muted">Opciones: contratar, reducir horario o abrir por fases (p. ej. sin cenas los primeros meses).</p>
              </Alert>
            ) : (
              <Alert tone="ok" title={`Sobran ${num(cob.diferencia)} horas a la semana para vacaciones, bajas y descansos.`} />
            )}
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              No se cuentan vacaciones (30 días naturales), festivos ni bajas: conviene tener un 10–15 % de margen.
            </p>
          </Card>
        </div>
      )}

      {tab === 'convenio' && (
        <>
          <EditableTable<PuestoConvenio>
            rows={db.Convenio}
            columns={[
              { key: 'puesto', label: 'Categoría', width: 300 },
              { key: 'nivel', label: 'Nivel', width: 70 },
              { key: 'salarioMensual', label: 'Salario base/mes', type: 'money', width: 130 },
              { key: 'pagas', label: 'Pagas', type: 'number', decimals: 0, width: 70 },
              { key: 'anual', label: 'Anual (jornada completa)', type: 'computed', align: 'right', width: 160, render: (c) => eur(c.salarioMensual * c.pagas) },
              { key: 'costeEmpresa', label: 'Coste empresa/año', type: 'computed', align: 'right', width: 140, render: (c) => eur(c.salarioMensual * c.pagas * (1 + d.settings.ssEmpresaPct / 100)) },
              { key: 'fuente', label: 'Fuente', width: 320 },
            ]}
            onChange={(rows) => setTable('Convenio', rows)}
            readOnly={readOnly}
            newRow={() => ({ id: uid('conv'), puesto: 'Nueva categoría', nivel: '', salarioMensual: 0, pagas: 14, fuente: '' })}
            addLabel="Añadir categoría"
          />
          <div className="tip" style={{ marginTop: 12 }}>
            Tablas del <b>Conveni col·lectiu d'hostaleria de Catalunya 2025–2028</b> (DOGC 9630, 23/03/2026), grupo D (bares, cafeterías y
            restaurantes), provincia de Barcelona, año 2026. Son salarios base mínimos: no incluyen antigüedad ni pluses (nocturnidad,
            transporte…). Cada año se actualizan (+4 % previsto en el convenio): revisadlas con vuestra gestoría.
          </div>
        </>
      )}
    </PageShell>
  );
}
