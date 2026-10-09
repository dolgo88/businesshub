import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useData } from '../state/DataContext';
import { Alert, Card, Field, NumberInput, PageShell, ProgressBar, Stat } from '../components/ui';
import { EditableTable, type Column } from '../components/EditableTable';
import type { OtraFuente, Prestamo, Socio } from '../data/types';
import type { LoanResult } from '../domain/loans';
import { fuenteCuenta } from '../domain/budget';
import { eur, eurShort, pct, uid } from '../lib/format';
import { monthLabel } from '../lib/dates';

export function FinanciacionPage() {
  const { db, derived: d, setTable, updateSettings, readOnly, notify } = useData();
  const f = d.financing;
  const falta = f.diferencia < -1;

  const aplicarSugerencia = () => {
    if (!window.confirm('Se actualizará el importe del primer préstamo y la aportación en dinero de cada socio. ¿Continuar?')) return;
    if (db.Prestamos.length === 0) {
      setTable('Prestamos', [nuevoPrestamo(f.sugerencia.banco)]);
    } else {
      // El primer préstamo absorbe lo que falta hasta la cifra sugerida; el resto no se toca.
      const otros = db.Prestamos.slice(1).reduce((s, p) => s + (p.importe || 0), 0);
      const importe = Math.max(0, Math.round((f.sugerencia.banco - otros) / 100) * 100);
      setTable('Prestamos', db.Prestamos.map((p, i) => (i === 0 ? { ...p, importe } : p)));
    }
    setTable(
      'Socios',
      db.Socios.map((s) => ({ ...s, aportacionDinero: Math.round((f.sugerencia.porSocio.find((x) => x.id === s.id)?.importe ?? 0) / 100) * 100 })),
    );
    notify('Sugerencia aplicada. Revisa plazos e intereses del préstamo.', 'ok');
  };

  const socioColumns: Column<Socio>[] = [
    { key: 'nombre', label: 'Socio', width: 180 },
    { key: 'aportacionDinero', label: 'Aporta en dinero', type: 'money', width: 140, footer: eur(f.propiosDinero) },
    { key: 'aportacionEspecie', label: 'Aporta en especie', type: 'money', width: 140, footer: eur(f.propiosEspecie), title: 'Equipos, mobiliario, etc. que aporta un socio' },
    { key: 'participacionPct', label: '% participación', type: 'percent', decimals: 2, width: 120, footer: <span style={{ color: Math.abs(f.participacionTotal - 100) > 0.01 ? 'var(--bad)' : undefined }}>{pct(f.participacionTotal, 2)}</span> },
    {
      key: 'pctAportado', label: '% de lo aportado', type: 'computed', align: 'right', width: 120,
      render: (s) => pct(((s.aportacionDinero + s.aportacionEspecie) / Math.max(1, f.propiosDinero + f.propiosEspecie)) * 100),
    },
    { key: 'trabaja', label: 'Trabaja en el negocio', type: 'bool', width: 110 },
    { key: 'notas', label: 'Notas', width: 220 },
  ];

  const loanColumns: Column<Prestamo>[] = [
    { key: 'entidad', label: 'Entidad', width: 240 },
    { key: 'importe', label: 'Importe', type: 'money', width: 120, footer: eur(f.prestamos) },
    { key: 'tinPct', label: 'TIN %', type: 'percent', decimals: 3, width: 80 },
    { key: 'plazoMeses', label: 'Plazo (meses)', type: 'number', decimals: 0, width: 95 },
    { key: 'carenciaMeses', label: 'Carencia (meses)', type: 'number', decimals: 0, width: 100, title: 'Meses pagando solo intereses' },
    { key: 'comisionAperturaPct', label: 'Comisión %', type: 'percent', decimals: 2, width: 90 },
    { key: 'fechaInicio', label: 'Firma', type: 'date', width: 140 },
    {
      key: 'cuota', label: 'Cuota', type: 'computed', align: 'right', width: 100,
      render: (p) => eur(d.loans.find((l) => l.prestamo.id === p.id)?.cuotaMensual ?? 0, 2),
      footer: eur(f.cuotasMensuales, 2),
    },
    { key: 'notas', label: 'Notas', width: 220 },
  ];

  const otrasColumns: Column<OtraFuente>[] = [
    { key: 'tipo', label: 'Tipo', width: 160, options: ['Capitalización', 'Préstamo participativo', 'Subvención', 'Crowdfunding', 'Familia y amigos', 'Aval'] },
    { key: 'concepto', label: 'Concepto', width: 320 },
    { key: 'importe', label: 'Importe', type: 'money', width: 120, footer: eur(f.otras) },
    {
      key: 'estado', label: 'Estado', type: 'select', width: 130,
      options: [
        { value: 'idea', label: 'Idea (no cuenta)' },
        { value: 'solicitado', label: 'Solicitado' },
        { value: 'concedido', label: 'Concedido' },
        { value: 'descartado', label: 'Descartado' },
      ],
    },
    { key: 'notas', label: 'Notas', width: 260 },
  ];

  return (
    <PageShell moduleId="financiacion" subtitle="El presupuesto dice cuánto hace falta; aquí se decide de dónde sale. Todo debe cuadrar.">
      <div className="stats">
        <Stat label="Necesidad total" value={eurShort(f.necesidades)} sub="desde Presupuesto" />
        <Stat label="Fondos propios" value={eurShort(f.propiosDinero + f.propiosEspecie)} sub={`${pct(f.fondosPropiosPct, 0)} de las fuentes`} tone={f.fondosPropiosPct < 20 ? 'warn' : undefined} />
        <Stat label="Préstamos" value={eurShort(f.prestamos)} sub={`cuota total ${eur(f.cuotasMensuales)}/mes`} />
        <Stat label="Otras fuentes" value={eurShort(f.otras)} sub="solicitadas o concedidas" />
        <Stat label={falta ? 'Falta financiar' : 'Sobra'} value={eurShort(Math.abs(f.diferencia))} sub={`${pct(f.coberturaPct, 0)} cubierto`} tone={falta ? 'bad' : 'ok'} />
      </div>

      <Card title="Cuadre: necesidades frente a fuentes">
        <div className="balance">
          {[
            { label: 'Fondos propios', v: f.propiosDinero + f.propiosEspecie, tone: undefined },
            { label: 'Préstamos', v: f.prestamos, tone: undefined },
            { label: 'Otras fuentes', v: f.otras, tone: undefined },
            { label: 'Total fuentes', v: f.totalFuentes, tone: falta ? ('bad' as const) : ('ok' as const) },
          ].map((r) => (
            <div className="balance-row" key={r.label}>
              <span>{r.label}</span>
              <ProgressBar value={(r.v / Math.max(1, f.necesidades)) * 100} tone={r.tone} />
              <b className="num right" style={{ textAlign: 'right' }}>{eur(r.v)}</b>
            </div>
          ))}
        </div>
        {falta ? (
          <Alert
            tone="warn"
            title={`Faltan ${eur(-f.diferencia)} para cubrir todo.`}
            action={!readOnly && <button className="btn small primary" onClick={aplicarSugerencia}>Aplicar sugerencia</button>}
          >
            <p>
              Sugerencia (banco {d.settings.financiacionBancoPct} %): préstamo de <b>{eur(f.sugerencia.banco)}</b> y{' '}
              {f.sugerencia.porSocio.map((s) => `${s.nombre}: ${eur(s.importe)}`).join(' · ')} según su % de participación.
            </p>
          </Alert>
        ) : (
          <Alert tone="ok" title="La financiación cubre las necesidades." />
        )}
        <div className="form-grid">
          <Field label="% que pediríais al banco" hint="Los bancos suelen financiar 60–80 % y exigir el resto en fondos propios.">
            <NumberInput value={d.settings.financiacionBancoPct} decimals={0} onChange={(n) => updateSettings({ financiacionBancoPct: Math.min(100, Math.max(0, n)) })} disabled={readOnly} />
          </Field>
        </div>
      </Card>

      <Card title="Socios">
        <EditableTable<Socio>
          rows={db.Socios}
          columns={socioColumns}
          onChange={(rows) => setTable('Socios', rows)}
          readOnly={readOnly}
          showFooter
          newRow={() => ({ id: uid('socio'), nombre: 'Nuevo socio', aportacionDinero: 0, aportacionEspecie: 0, participacionPct: 0, trabaja: false, notas: '' })}
          addLabel="Añadir socio"
        />
        {Math.abs(f.participacionTotal - 100) > 0.01 && db.Socios.length > 0 && (
          <p style={{ color: 'var(--bad)', fontSize: '0.88rem' }}>Los % de participación suman {pct(f.participacionTotal, 2)}: deberían sumar 100 %.</p>
        )}
      </Card>

      <Card title="Préstamos">
        <EditableTable<Prestamo>
          rows={db.Prestamos}
          columns={loanColumns}
          onChange={(rows) => setTable('Prestamos', rows)}
          readOnly={readOnly}
          showFooter
          newRow={() => nuevoPrestamo(0)}
          addLabel="Añadir préstamo"
        />
        {d.loans.map((l) => (
          <LoanDetail key={l.prestamo.id} loan={l} />
        ))}
      </Card>

      <Card title="Otras fuentes (ayudas, capitalización del paro, ENISA…)">
        <EditableTable<OtraFuente>
          rows={db.OtrasFuentes}
          columns={otrasColumns}
          onChange={(rows) => setTable('OtrasFuentes', rows)}
          readOnly={readOnly}
          showFooter
          newRow={() => ({ id: uid('of'), tipo: 'Subvención', concepto: '', importe: 0, estado: 'idea', notas: '' })}
          addLabel="Añadir fuente"
          rowClassName={(r) => (fuenteCuenta(r) ? '' : 'done')}
        />
        <div className="tip" style={{ marginTop: 12 }}>
          <b>Ideas de financiación para hostelería en Barcelona</b>
          <ul>
            <li>Cafetera en comodato con el tostador y equipamiento de cerveceras a cambio de exclusividad.</li>
            <li>Leasing del horno o de la maquinaria grande (menos desembolso inicial).</li>
            <li>MicroBank, líneas ICO, ENISA (préstamo participativo) y Avalis de Catalunya (aval para el banco).</li>
            <li>Capitalización del paro (pago único), si algún socio la cobra: hay que pedirla antes de darse de alta.</li>
            <li>Barcelona Activa: asesoramiento gratuito para preparar el plan y la solicitud al banco.</li>
          </ul>
        </div>
      </Card>
    </PageShell>
  );
}

function nuevoPrestamo(importe: number): Prestamo {
  return {
    id: uid('pr'), entidad: 'Nuevo préstamo', importe: Math.round(importe / 100) * 100, tinPct: 6.5, plazoMeses: 84,
    carenciaMeses: 6, comisionAperturaPct: 0.5, fechaInicio: '2027-01-15', notas: '',
  };
}

function LoanDetail({ loan }: { loan: LoanResult }) {
  const [open, setOpen] = useState(false);
  if (loan.prestamo.importe <= 0) return null;
  const data = loan.filas.map((f) => ({ label: monthLabel(f.month), pendiente: f.pendiente }));
  return (
    <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>{loan.prestamo.entidad}</h3>
        <button className="btn small" onClick={() => setOpen((o) => !o)}>
          {open ? 'Ocultar tabla de amortización' : 'Ver tabla de amortización'}
        </button>
      </div>
      <div className="stats" style={{ marginTop: 10 }}>
        <Stat label="Cuota mensual" value={eur(loan.cuotaMensual, 2)} sub={loan.cuotaCarencia ? `${eur(loan.cuotaCarencia, 2)} durante la carencia` : undefined} />
        <Stat label="Total intereses" value={eur(loan.totalIntereses)} />
        <Stat label="Total a devolver" value={eur(loan.totalPagado + loan.comision)} sub={`incluye comisión ${eur(loan.comision)}`} />
        <Stat label="TAE aproximada" value={pct(loan.taePct, 2)} />
      </div>
      {open && (
        <>
          <div className="chart-box small">
            <ResponsiveContainer>
              <AreaChart data={data} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} interval={11} />
                <YAxis tickFormatter={(v) => eurShort(v)} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={70} />
                <Tooltip formatter={(v: number) => eur(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8 }} />
                <Area dataKey="pendiente" name="Capital pendiente" stroke="var(--info)" fill="var(--info-soft)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="table-wrap" style={{ maxHeight: 360 }}>
            <table className="data static">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mes</th>
                  <th className="right">Cuota</th>
                  <th className="right">Intereses</th>
                  <th className="right">Capital</th>
                  <th className="right">Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {loan.filas.map((f) => (
                  <tr key={f.n}>
                    <td>{f.n}</td>
                    <td>{monthLabel(f.month)}</td>
                    <td className="right num">{eur(f.cuota, 2)}</td>
                    <td className="right num">{eur(f.interes, 2)}</td>
                    <td className="right num">{eur(f.amortizacion, 2)}</td>
                    <td className="right num">{eur(f.pendiente, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
