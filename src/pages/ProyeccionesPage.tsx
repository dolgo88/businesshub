import { useMemo } from 'react';
import { Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, AreaChart, Legend } from 'recharts';
import { useData } from '../state/DataContext';
import { Alert, Card, Field, NumberInput, PageShell, Stat, Tabs, useTab } from '../components/ui';
import { EditableTable, type Column } from '../components/EditableTable';
import type { Franja } from '../data/types';
import type { Escenario } from '../data/settings';
import { computeProjection } from '../state/derived';
import { MESES_LARGOS, monthLabel } from '../lib/dates';
import { eur, eurShort, num, pct, uid } from '../lib/format';
import type { ProjectionResult, YearSummary } from '../domain/projections';

type TabId = 'resultados' | 'tesoreria' | 'supuestos' | 'socios' | 'mensual';

const ESCENARIOS: { id: Escenario; label: string }[] = [
  { id: 'pesimista', label: 'Pesimista' },
  { id: 'realista', label: 'Realista' },
  { id: 'optimista', label: 'Optimista' },
];

const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8 };

export function ProyeccionesPage() {
  const { db, derived: d, updateSettings, readOnly } = useData();
  const [tab, setTab] = useTab<TabId>('proyecciones', 'resultados');
  const p = d.projection;
  const y1 = p.years[0];
  const escenarios = useMemo(() => ESCENARIOS.map((e) => ({ ...e, r: computeProjection(db, d, e.id) })), [db, d]);
  const negativo = p.cajaMinima.valor < 0;
  const beMal = p.breakEven.pctVentasPrevistas > 100;
  const socio1 = p.socios[0]?.porAnio[0];

  return (
    <PageShell
      moduleId="proyecciones"
      actions={
        <div className="row" role="radiogroup" aria-label="Escenario">
          {ESCENARIOS.map((e) => (
            <button
              key={e.id}
              role="radio"
              aria-checked={d.settings.escenario === e.id}
              className={`btn small ${d.settings.escenario === e.id ? 'primary' : ''}`}
              disabled={readOnly}
              onClick={() => updateSettings({ escenario: e.id })}
            >
              {e.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="stats">
        <Stat label="Ventas año 1 (sin IVA)" value={eurShort(y1.ventasNetas)} sub={`escenario ${d.settings.escenario} (${num(p.escenarioPct)} %)`} />
        <Stat label="EBITDA año 1" value={eurShort(y1.ebitda)} sub={`${pct(p.ratiosAnio1.ebitdaPct, 0)} de las ventas`} tone={y1.ebitda > 0 ? 'ok' : 'bad'} />
        <Stat label="Beneficio año 1" value={eurShort(y1.resultado)} sub={`neto tras IRPF ${eurShort(y1.beneficioNeto)}`} tone={y1.resultado > 0 ? 'ok' : 'bad'} />
        <Stat
          label="Punto de equilibrio"
          value={`${num(p.breakEven.ticketsDia)} tickets/día`}
          sub={`previstos ${num(p.breakEven.ticketsDiaPrevistos)} (${pct(p.breakEven.pctVentasPrevistas, 0)})`}
          tone={beMal ? 'bad' : p.breakEven.pctVentasPrevistas > 85 ? 'warn' : 'ok'}
        />
        <Stat label="Caja mínima" value={eurShort(p.cajaMinima.valor)} sub={p.cajaMinima.idx ? monthLabel(p.cajaMinima.month) : 'en la apertura'} tone={negativo ? 'bad' : 'ok'} />
        <Stat label="Recuperación de la inversión" value={p.paybackMeses ? `${p.paybackMeses} meses` : `> ${p.months.length} meses`} tone={p.paybackMeses && p.paybackMeses <= 48 ? 'ok' : 'warn'} />
        {socio1 && <Stat label={`Neto ${p.socios[0].nombre} (año 1)`} value={`${eur(socio1.netoMensual)}/mes`} sub="tras IRPF; cuota de autónomo ya restada" tone="info" />}
      </div>

      {negativo && (
        <Alert tone="bad" title={`La caja se queda en negativo: mínimo de ${eur(p.cajaMinima.valor)} en ${p.cajaMinima.idx ? monthLabel(p.cajaMinima.month) : 'la apertura'}.`}>
          <p>
            Opciones: aumentar la financiación en al menos {eur(-p.cajaMinima.valor)}, reducir las retiradas de los socios los primeros meses, negociar
            carencia de alquiler o del préstamo, o retrasar inversiones no imprescindibles.
          </p>
        </Alert>
      )}
      {beMal && (
        <Alert tone="bad" title="Con las ventas previstas no se cubren los costes fijos.">
          <p>Necesitaríais {num(p.breakEven.ticketsDia)} tickets al día y prevéis {num(p.breakEven.ticketsDiaPrevistos)}.</p>
        </Alert>
      )}

      <Tabs
        tabs={[
          { id: 'resultados', label: 'Resultados' },
          { id: 'tesoreria', label: 'Tesorería' },
          { id: 'supuestos', label: 'Supuestos de ventas' },
          { id: 'socios', label: 'Socios e impuestos' },
          { id: 'mensual', label: 'Detalle mensual' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'resultados' && (
        <div className="stack">
          <Card title="Ventas, costes y resultado por mes">
            <div className="chart-box">
              <ResponsiveContainer>
                <ComposedChart data={p.months.map((m) => ({ label: monthLabel(m.month), ventas: m.ventasNetas, costes: m.ventasNetas - m.resultado, resultado: m.resultado }))} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} interval={2} />
                  <YAxis tickFormatter={(v) => eurShort(v)} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={70} />
                  <Tooltip formatter={(v: number) => eur(v)} contentStyle={tooltipStyle} />
                  <Legend />
                  <ReferenceLine y={0} stroke="var(--muted)" />
                  <Bar dataKey="ventas" name="Ventas (sin IVA)" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                  <Line dataKey="costes" name="Costes totales" stroke="var(--info)" strokeWidth={2} dot={false} />
                  <Line dataKey="resultado" name="Resultado" stroke="var(--ok)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Cuenta de resultados">
            <PnlTable years={p.years} />
          </Card>
          <div className="grid cols-2">
            <Card title="Ratios del año 1">
              <table className="data static">
                <thead>
                  <tr>
                    <th>Ratio (sobre ventas sin IVA)</th>
                    <th className="right">Vosotros</th>
                    <th className="right">Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  <RatioRow label="Materia prima (food cost real)" v={p.ratiosAnio1.foodCostPct} ok={[0, 32]} reference="25–32 %" />
                  <RatioRow label="Personal (incl. autónomos)" v={p.ratiosAnio1.personalPct} ok={[0, 35]} reference="30–35 %" />
                  <RatioRow label="Prime cost (materia prima + personal)" v={p.ratiosAnio1.primeCostPct} ok={[0, 65]} reference="< 60–65 %" />
                  <RatioRow label="Alquiler" v={p.ratiosAnio1.alquilerPct} ok={[0, 12]} reference="< 10–12 %" />
                  <RatioRow label="EBITDA" v={p.ratiosAnio1.ebitdaPct} ok={[12, 100]} reference="> 12–15 %" />
                </tbody>
              </table>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                Ojo: el personal no incluye el trabajo de los socios (cobran del beneficio). Si quisierais compararos con un negocio con todo el equipo asalariado,
                restad vuestro sueldo «de mercado» al EBITDA.
              </p>
            </Card>
            <Card title="Comparativa de escenarios">
              <table className="data static">
                <thead>
                  <tr>
                    <th />
                    {escenarios.map((e) => (
                      <th key={e.id} className="right">{e.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <ScenarioRow label="Ventas año 1" values={escenarios.map((e) => e.r.years[0].ventasNetas)} />
                  <ScenarioRow label="Resultado año 1" values={escenarios.map((e) => e.r.years[0].resultado)} />
                  <ScenarioRow label="Resultado año 3" values={escenarios.map((e) => e.r.years[2]?.resultado ?? 0)} />
                  <ScenarioRow label="Caja mínima" values={escenarios.map((e) => e.r.cajaMinima.valor)} />
                  <tr>
                    <td>Recuperación</td>
                    {escenarios.map((e) => (
                      <td key={e.id} className="right num">{e.r.paybackMeses ? `${e.r.paybackMeses} m` : '—'}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                Pesimista = {d.settings.escenarioPesimistaPct} % y optimista = {d.settings.escenarioOptimistaPct} % de los tickets previstos (ajustable en Supuestos).
              </p>
            </Card>
          </div>
        </div>
      )}

      {tab === 'tesoreria' && <Tesoreria p={p} />}
      {tab === 'supuestos' && <Supuestos />}
      {tab === 'socios' && <Socios p={p} />}
      {tab === 'mensual' && <Mensual p={p} />}
    </PageShell>
  );
}

function RatioRow({ label, v, ok, reference }: { label: string; v: number; ok: [number, number]; reference: string }) {
  const good = v >= ok[0] && v <= ok[1];
  return (
    <tr>
      <td>{label}</td>
      <td className="right">
        <span className={`pill ${good ? 'ok' : 'warn'}`}>{pct(v)}</span>
      </td>
      <td className="right muted">{reference}</td>
    </tr>
  );
}

function ScenarioRow({ label, values }: { label: string; values: number[] }) {
  return (
    <tr>
      <td>{label}</td>
      {values.map((v, i) => (
        <td key={i} className="right num" style={{ color: v < 0 ? 'var(--bad)' : undefined }}>
          {eurShort(v)}
        </td>
      ))}
    </tr>
  );
}

export function PnlTable({ years }: { years: YearSummary[] }) {
  const rows: [string, (y: YearSummary) => number, boolean?][] = [
    ['Ventas (sin IVA)', (y) => y.ventasNetas, true],
    ['− Materia prima', (y) => -y.materiaPrima],
    ['− Comisiones (TPV, delivery)', (y) => -y.comisiones],
    ['− Personal', (y) => -y.personal],
    ['− Cuotas de autónomos', (y) => -y.autonomos],
    ['− Gastos fijos', (y) => -y.fijos],
    ['− Leasing / renting', (y) => -y.leasing],
    ['= EBITDA', (y) => y.ebitda, true],
    ['− Amortizaciones', (y) => -y.amortizacion],
    ['− Intereses', (y) => -y.intereses],
    ['= Resultado (rendimiento neto)', (y) => y.resultado, true],
    ['− IRPF estimado de los socios', (y) => -y.irpf],
    ['= Beneficio neto para los socios', (y) => y.beneficioNeto, true],
  ];
  return (
    <div className="table-wrap">
      <table className="data static">
        <thead>
          <tr>
            <th />
            {years.map((y) => (
              <th key={y.year} className="right">{y.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, f, strong]) => (
            <tr key={label}>
              <td style={{ fontWeight: strong ? 600 : 400 }}>{label}</td>
              {years.map((y) => (
                <td key={y.year} className="right num" style={{ fontWeight: strong ? 600 : 400, color: f(y) < 0 && strong ? 'var(--bad)' : undefined }}>
                  {eur(f(y))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tesoreria({ p }: { p: ProjectionResult }) {
  const { derived: d } = useData();
  return (
    <div className="stack">
      <Card title="Caja acumulada (saldo en el banco a final de mes)">
        <div className="chart-box">
          <ResponsiveContainer>
            <AreaChart data={[{ label: 'Apertura', caja: p.cajaInicial }, ...p.months.map((m) => ({ label: monthLabel(m.month), caja: m.caja }))]} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} interval={2} />
              <YAxis tickFormatter={(v) => eurShort(v)} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={70} />
              <Tooltip formatter={(v: number) => eur(v)} contentStyle={tooltipStyle} />
              <ReferenceLine y={0} stroke="var(--bad)" strokeDasharray="4 4" />
              <Area dataKey="caja" name="Caja" stroke="var(--info)" fill="var(--info-soft)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid cols-2">
        <Card title="Caja en la apertura">
          <table className="data static">
            <tbody>
              <tr><td>Aportaciones en dinero, préstamos (netos de comisión) y otras fuentes</td><td className="right num">{eur(p.fuentesIniciales)}</td></tr>
              <tr><td>− Inversión con IVA, imprevistos y cuotas antes de abrir</td><td className="right num">{eur(-p.desembolsoInicial)}</td></tr>
            </tbody>
            <tfoot>
              <tr><td>Caja al abrir</td><td className="right num">{eur(p.cajaInicial)}</td></tr>
            </tfoot>
          </table>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Debería parecerse al fondo de maniobra del presupuesto ({eur(d.budget.fondoManiobra)}). El IVA de la inversión se recupera en las primeras
            declaraciones trimestrales.
          </p>
        </Card>
        <Card title="Flujo de caja por año">
          <table className="data static">
            <thead>
              <tr><th /><th className="right">Flujo del año</th><th className="right">Caja final</th></tr>
            </thead>
            <tbody>
              {p.years.map((y) => (
                <tr key={y.year}>
                  <td>{y.label}</td>
                  <td className="right num">{eur(y.flujo)}</td>
                  <td className="right num" style={{ color: y.cajaFinal < 0 ? 'var(--bad)' : undefined }}>{eur(y.cajaFinal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            La caja incluye cobros con IVA, pagos a proveedores, nóminas, cuotas del préstamo, IVA trimestral (modelo 303), pagos fraccionados de IRPF
            (modelo 130), la declaración de la renta de junio y las retiradas de los socios.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Supuestos() {
  const { db, derived: d, setTable, updateSettings, readOnly } = useData();
  const s = d.settings;
  const lineas = Array.from(new Set([...db.Platos.filter((p) => p.tipo === 'plato').map((p) => p.linea), ...db.Franjas.map((f) => f.linea)].filter(Boolean)));
  const fcLinea = (l: string) => d.menu.porLinea.get(l)?.foodCostPct;
  const columns: Column<Franja>[] = [
    { key: 'nombre', label: 'Franja / canal', width: 230 },
    { key: 'linea', label: 'Línea (menú)', options: lineas, width: 120 },
    { key: 'ticketsDia', label: 'Tickets/día', type: 'number', decimals: 0, width: 90 },
    { key: 'ticketMedio', label: 'Ticket medio (con IVA)', type: 'money', width: 130 },
    { key: 'ivaPct', label: 'IVA %', type: 'select', options: ['4', '10', '21'], width: 75 },
    { key: 'diasMes', label: 'Días/mes', type: 'number', decimals: 0, width: 80 },
    { key: 'mesInicio', label: 'Desde el mes', type: 'number', decimals: 0, width: 95, title: '1 = desde la apertura; 4 = a partir del cuarto mes…' },
    { key: 'comisionPct', label: 'Comisión %', type: 'percent', decimals: 1, width: 90, title: 'TPV ~0,5 %; plataformas de delivery 25–35 %' },
    {
      key: 'fc', label: 'Food cost (menú)', type: 'computed', align: 'right', width: 110,
      render: (f) => {
        const v = fcLinea(f.linea);
        return v ? pct(v * (1 + s.mermaFoodCostPct / 100), 0) : <span className="muted" title="Sin platos en esa línea: se usa el objetivo">{pct(s.objetivoFoodCostPct * (1 + s.mermaFoodCostPct / 100), 0)}*</span>;
      },
    },
    { key: 'ventas', label: 'Ventas/mes al 100 %', type: 'computed', align: 'right', width: 130, render: (f) => eur(f.ticketsDia * f.ticketMedio * f.diasMes) },
    { key: 'notas', label: 'Notas', width: 220 },
  ];
  const totalMes = db.Franjas.reduce((a, f) => a + f.ticketsDia * f.ticketMedio * f.diasMes, 0);
  const setArr = (key: 'estacionalidad' | 'rampUp', i: number, v: number) => {
    const arr = [...s[key]];
    while (arr.length <= i) arr.push(100);
    arr[i] = v;
    updateSettings({ [key]: arr });
  };
  return (
    <div className="stack">
      <Card title="Ventas por franja horaria y canal">
        <EditableTable<Franja>
          rows={db.Franjas}
          columns={columns}
          onChange={(rows) => setTable('Franjas', rows.map((r) => ({ ...r, ivaPct: Number(r.ivaPct) || 0 })))}
          readOnly={readOnly}
          newRow={() => ({ id: uid('fr'), nombre: 'Nueva franja', linea: lineas[0] ?? '', ticketsDia: 0, ticketMedio: 0, ivaPct: 10, diasMes: 26, mesInicio: 1, comisionPct: 0.6, notas: '' })}
          addLabel="Añadir franja"
        />
        <p className="muted" style={{ fontSize: '0.88rem' }}>
          Ventas de un mes «tipo» al 100 %: <b>{eur(totalMes)}</b> con IVA ({num(db.Franjas.reduce((a, f) => a + f.ticketsDia, 0))} tickets/día). Cada franja usa el food cost
          de su línea del Menú más la merma. * = sin platos en esa línea.
        </p>
      </Card>
      <div className="grid cols-2">
        <Card title="Arranque (ramp-up)">
          <p className="muted" style={{ fontSize: '0.88rem', marginTop: 0 }}>% de las ventas previstas en los primeros meses. A partir del último, 100 %.</p>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
            {s.rampUp.map((v, i) => (
              <Field key={i} label={`Mes ${i + 1}`}>
                <NumberInput value={v} decimals={0} onChange={(n) => setArr('rampUp', i, n)} disabled={readOnly} />
              </Field>
            ))}
          </div>
          {!readOnly && (
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn small" onClick={() => updateSettings({ rampUp: [...s.rampUp, 100] })}>+ mes</button>
              {s.rampUp.length > 1 && <button className="btn small" onClick={() => updateSettings({ rampUp: s.rampUp.slice(0, -1) })}>− mes</button>}
            </div>
          )}
        </Card>
        <Card title="Estacionalidad (% sobre un mes normal)">
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
            {MESES_LARGOS.map((m, i) => (
              <Field key={m} label={m}>
                <NumberInput value={s.estacionalidad[i] ?? 100} decimals={0} onChange={(n) => setArr('estacionalidad', i, n)} disabled={readOnly} />
              </Field>
            ))}
          </div>
          <p className="muted" style={{ fontSize: '0.85rem' }}>En zonas de oficinas agosto cae mucho; en zonas turísticas, al revés.</p>
        </Card>
      </div>
      <Card title="Otros supuestos">
        <div className="form-grid">
          <Field label="Escenario pesimista (% de tickets)">
            <NumberInput value={s.escenarioPesimistaPct} decimals={0} onChange={(n) => updateSettings({ escenarioPesimistaPct: n })} disabled={readOnly} />
          </Field>
          <Field label="Escenario optimista (% de tickets)">
            <NumberInput value={s.escenarioOptimistaPct} decimals={0} onChange={(n) => updateSettings({ escenarioOptimistaPct: n })} disabled={readOnly} />
          </Field>
          <Field label="Crecimiento anual de ventas (%)" hint="Desde el año 2">
            <NumberInput value={s.crecimientoAnualPct} decimals={1} onChange={(n) => updateSettings({ crecimientoAnualPct: n })} disabled={readOnly} />
          </Field>
          <Field label="Merma y consumo interno (% sobre food cost)" hint="Pan no vendido, roturas, comidas del equipo, invitaciones">
            <NumberInput value={s.mermaFoodCostPct} decimals={1} onChange={(n) => updateSettings({ mermaFoodCostPct: n })} disabled={readOnly} />
          </Field>
          <Field label="IVA medio de las compras (%)">
            <NumberInput value={s.ivaComprasPct} decimals={1} onChange={(n) => updateSettings({ ivaComprasPct: n })} disabled={readOnly} />
          </Field>
          <Field label="Horizonte (meses)">
            <NumberInput value={s.horizonteMeses} decimals={0} onChange={(n) => updateSettings({ horizonteMeses: Math.min(120, Math.max(12, Math.round(n))) })} disabled={readOnly} />
          </Field>
        </div>
      </Card>
    </div>
  );
}

function Socios({ p }: { p: ProjectionResult }) {
  const { derived: d } = useData();
  return (
    <div className="stack">
      <Card title="Lo que le queda a cada socio">
        <div className="table-wrap">
          <table className="data static">
            <thead>
              <tr>
                <th>Socio</th>
                <th>Año</th>
                <th className="right">Participación</th>
                <th className="right">Rendimiento</th>
                <th className="right">IRPF estimado</th>
                <th className="right">Neto anual</th>
                <th className="right">Neto al mes</th>
                <th className="right">Retiradas previstas</th>
              </tr>
            </thead>
            <tbody>
              {p.socios.flatMap((s) =>
                s.porAnio.map((a) => (
                  <tr key={`${s.socioId}-${a.year}`}>
                    <td>{a.year === 1 ? <b>{s.nombre}</b> : ''}</td>
                    <td>Año {a.year}</td>
                    <td className="right num">{pct(s.participacionPct, 0)}</td>
                    <td className="right num">{eur(a.rendimiento)}</td>
                    <td className="right num">{eur(a.irpf)}</td>
                    <td className="right num">{eur(a.neto)}</td>
                    <td className="right num"><b>{eur(a.netoMensual)}</b></td>
                    <td className="right num" style={{ color: a.retiradas > a.neto ? 'var(--bad)' : undefined }}>{eur(a.retiradas)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="tip">
        <b>Cómo se calcula (comunidad de bienes).</b> El rendimiento neto de la actividad (ventas − gastos, incluida la cuota de autónomos) se reparte
        según el % de cada socio. Cada uno tributa en su IRPF con la escala estatal y la catalana, con un 5 % de gastos de difícil justificación
        (máx. 2.000 €) y el mínimo personal; durante el año se adelanta un 20 % trimestral (modelo 130) y en junio se regulariza. No incluye otras
        rentas ni deducciones personales. Cuota de autónomos: {eur(d.settings.cuotaTarifaPlana, 2)}/mes durante {d.settings.mesesTarifaPlana} meses y
        después según tramos de rendimiento (tablas 2026). <b>Estimación orientativa: confirmadla con la gestoría.</b>
      </div>
    </div>
  );
}

function Mensual({ p }: { p: ProjectionResult }) {
  const cols: [string, (m: ProjectionResult['months'][number]) => number][] = [
    ['Tickets', (m) => m.tickets],
    ['Ventas (con IVA)', (m) => m.ventasBrutas],
    ['Ventas (sin IVA)', (m) => m.ventasNetas],
    ['Materia prima', (m) => m.materiaPrima],
    ['Comisiones', (m) => m.comisiones],
    ['Personal', (m) => m.personal],
    ['Autónomos', (m) => m.autonomos],
    ['Gastos fijos', (m) => m.fijos],
    ['Leasing', (m) => m.leasing],
    ['EBITDA', (m) => m.ebitda],
    ['Amortización', (m) => m.amortizacion],
    ['Intereses', (m) => m.intereses],
    ['Resultado', (m) => m.resultado],
    ['Capital préstamo', (m) => m.capitalPrestamos],
    ['IVA pagado', (m) => m.ivaPagado],
    ['IRPF pagado', (m) => m.irpfPagado],
    ['Retiradas socios', (m) => m.retiradas],
    ['Flujo de caja', (m) => m.flujo],
    ['Caja', (m) => m.caja],
  ];
  return (
    <div className="table-wrap" style={{ maxHeight: '70vh' }}>
      <table className="data static">
        <thead>
          <tr>
            <th>Mes</th>
            {cols.map(([l]) => (
              <th key={l} className="right">{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {p.months.map((m) => (
            <tr key={m.month}>
              <td className="nowrap">{monthLabel(m.month)}</td>
              {cols.map(([l, f]) => (
                <td key={l} className="right num nowrap" style={{ color: f(m) < 0 ? 'var(--bad)' : undefined }}>
                  {l === 'Tickets' ? num(f(m)) : eur(f(m))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
