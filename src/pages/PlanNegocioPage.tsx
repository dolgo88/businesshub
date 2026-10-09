import { useData } from '../state/DataContext';
import { PageShell } from '../components/ui';
import { Icon } from '../components/Icons';
import { PnlTable } from './ProyeccionesPage';
import { formatDate, formatDateLong, monthLabel } from '../lib/dates';
import { eur, num, pct } from '../lib/format';

export function PlanNegocioPage() {
  const { db, derived: d } = useData();
  const s = d.settings;
  const p = d.projection;
  const f = d.financing;
  const b = d.budget;
  const empleados = d.costes.filter((c) => c.persona.tipo === 'empleado');
  const socios = db.Personal.filter((x) => x.tipo === 'socio');
  const lineas = [...d.menu.porLinea.values()];

  return (
    <PageShell
      moduleId="plan"
      subtitle="Resumen del proyecto para el banco o inversores. Se genera con los datos actuales; usa «Imprimir / PDF» y elige «Guardar como PDF»."
      actions={
        <button className="btn primary" onClick={() => window.print()}>
          <Icon name="print" size={16} /> Imprimir / PDF
        </button>
      }
    >
      <article className="card report">
        <div className="cover">
          <p className="muted">Plan de negocio · {formatDateLong(d.today)}</p>
          <h1>{s.nombreNegocio}</h1>
          <p>Barcelona · apertura prevista: {formatDateLong(s.fechaKickoff)}</p>
        </div>

        <section>
          <h2>1. Resumen</h2>
          <p>{s.concepto}</p>
          <table>
            <tbody>
              <tr><td>Forma jurídica</td><td>{s.formaJuridica}</td></tr>
              <tr><td>Socios</td><td>{db.Socios.map((x) => `${x.nombre} (${pct(x.participacionPct, 0)})`).join(', ')}</td></tr>
              <tr><td>Inversión total necesaria</td><td className="right">{eur(b.totalNecesidades)}</td></tr>
              <tr><td>Fondos propios / préstamos / otras</td><td className="right">{eur(f.propiosDinero + f.propiosEspecie)} / {eur(f.prestamos)} / {eur(f.otras)}</td></tr>
              <tr><td>Ventas previstas año 1 (sin IVA)</td><td className="right">{eur(p.years[0].ventasNetas)}</td></tr>
              <tr><td>Resultado año 1 / año 3</td><td className="right">{eur(p.years[0].resultado)} / {eur(p.years[p.years.length - 1].resultado)}</td></tr>
              <tr><td>Punto de equilibrio</td><td className="right">{num(p.breakEven.ticketsDia)} tickets/día ({pct(p.breakEven.pctVentasPrevistas, 0)} de lo previsto)</td></tr>
              <tr><td>Recuperación de la inversión</td><td className="right">{p.paybackMeses ? `${p.paybackMeses} meses` : `más de ${p.months.length} meses`}</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>2. Oferta y precios</h2>
          <table>
            <thead>
              <tr><th>Producto</th><th>Categoría</th><th className="right">PVP</th><th className="right">Food cost</th><th>Alérgenos</th></tr>
            </thead>
            <tbody>
              {d.menu.platos.filter((x) => x.plato.activo).map((x) => (
                <tr key={x.plato.id}>
                  <td>{x.plato.nombre}</td>
                  <td>{x.plato.categoria}</td>
                  <td className="right">{eur(x.pvpEfectivo, 2)}</td>
                  <td className="right">{pct(x.foodCostPct, 0)}</td>
                  <td>{x.alergenos.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">Food cost teórico por línea: {lineas.map((l) => `${l.linea} ${pct(l.foodCostPct, 0)}`).join(' · ')}.</p>
        </section>

        <section className="page-break">
          <h2>3. Inversión</h2>
          <table>
            <tbody>
              {b.porCategoria.map((c) => (
                <tr key={c.categoria}><td>{c.categoria}</td><td className="right">{eur(c.sinIva)}</td></tr>
              ))}
              <tr><td><b>Inversión (sin IVA)</b></td><td className="right"><b>{eur(b.inversionSinIva)}</b></td></tr>
              <tr><td>IVA a adelantar</td><td className="right">{eur(b.ivaInversion)}</td></tr>
              <tr><td>Imprevistos ({s.imprevistosPct} %)</td><td className="right">{eur(b.imprevistos)}</td></tr>
              <tr><td>Fondo de maniobra ({s.fondoManiobraMeses} meses)</td><td className="right">{eur(b.fondoManiobra)}</td></tr>
              <tr><td><b>Necesidad total</b></td><td className="right"><b>{eur(b.totalNecesidades)}</b></td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>4. Financiación</h2>
          <table>
            <thead>
              <tr><th>Fuente</th><th className="right">Importe</th><th className="right">%</th></tr>
            </thead>
            <tbody>
              {db.Socios.map((x) => (
                <tr key={x.id}><td>Aportación {x.nombre}</td><td className="right">{eur(x.aportacionDinero + x.aportacionEspecie)}</td><td className="right">{pct(((x.aportacionDinero + x.aportacionEspecie) / Math.max(1, f.totalFuentes)) * 100, 0)}</td></tr>
              ))}
              {d.loans.map((l) => (
                <tr key={l.prestamo.id}>
                  <td>{l.prestamo.entidad} · {pct(l.prestamo.tinPct, 2)} TIN · {l.prestamo.plazoMeses} meses{l.prestamo.carenciaMeses ? ` (${l.prestamo.carenciaMeses} de carencia)` : ''} · cuota {eur(l.cuotaMensual, 2)}</td>
                  <td className="right">{eur(l.prestamo.importe)}</td>
                  <td className="right">{pct((l.prestamo.importe / Math.max(1, f.totalFuentes)) * 100, 0)}</td>
                </tr>
              ))}
              {db.OtrasFuentes.filter((x) => x.importe > 0 && x.estado !== 'descartado' && x.estado !== 'idea').map((x) => (
                <tr key={x.id}><td>{x.concepto}</td><td className="right">{eur(x.importe)}</td><td className="right">{pct((x.importe / Math.max(1, f.totalFuentes)) * 100, 0)}</td></tr>
              ))}
              <tr><td><b>Total</b></td><td className="right"><b>{eur(f.totalFuentes)}</b></td><td className="right">{pct(f.coberturaPct, 0)} de las necesidades</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>5. Equipo</h2>
          <p>
            {socios.length} socios trabajando en el negocio ({socios.map((x) => x.nombre).join(', ')}), dados de alta como autónomos.{' '}
            {empleados.length} personas contratadas según el convenio de hostelería de Cataluña.
          </p>
          <table>
            <thead><tr><th>Puesto</th><th className="right">Horas/sem</th><th className="right">Bruto anual</th><th className="right">Coste empresa/año</th></tr></thead>
            <tbody>
              {empleados.map((c) => (
                <tr key={c.persona.id}>
                  <td>{c.persona.nombre}</td>
                  <td className="right">{num(c.persona.horasSemana)}</td>
                  <td className="right">{eur(c.brutoAnual)}</td>
                  <td className="right">{eur(c.costeEmpresaAnual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="page-break">
          <h2>6. Previsión de ventas</h2>
          <table>
            <thead><tr><th>Franja</th><th className="right">Tickets/día</th><th className="right">Ticket medio</th><th className="right">Días/mes</th><th className="right">Desde mes</th></tr></thead>
            <tbody>
              {db.Franjas.map((x) => (
                <tr key={x.id}><td>{x.nombre}</td><td className="right">{num(x.ticketsDia)}</td><td className="right">{eur(x.ticketMedio, 2)}</td><td className="right">{num(x.diasMes)}</td><td className="right">{x.mesInicio}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="muted">
            Escenario {s.escenario} ({num(p.escenarioPct)} %). Arranque: {s.rampUp.map((v) => `${v} %`).join(', ')}. Estacionalidad con agosto al {s.estacionalidad[7]} %.
            Crecimiento anual {s.crecimientoAnualPct} %.
          </p>
        </section>

        <section>
          <h2>7. Cuenta de resultados prevista</h2>
          <PnlTable years={p.years} />
        </section>

        <section>
          <h2>8. Tesorería</h2>
          <p>
            Caja al abrir: <b>{eur(p.cajaInicial)}</b>. Caja mínima prevista: <b>{eur(p.cajaMinima.valor)}</b>
            {p.cajaMinima.idx ? ` (${monthLabel(p.cajaMinima.month)})` : ''}. Caja al final del año {p.years.length}: <b>{eur(p.years[p.years.length - 1].cajaFinal)}</b>.
          </p>
          <table>
            <thead><tr><th>Año</th><th className="right">Ventas</th><th className="right">EBITDA</th><th className="right">Flujo de caja</th><th className="right">Caja final</th></tr></thead>
            <tbody>
              {p.years.map((y) => (
                <tr key={y.year}><td>{y.label}</td><td className="right">{eur(y.ventasNetas)}</td><td className="right">{eur(y.ebitda)}</td><td className="right">{eur(y.flujo)}</td><td className="right">{eur(y.cajaFinal)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        {d.loans.filter((l) => l.prestamo.importe > 0).map((l) => (
          <section key={l.prestamo.id} className="page-break">
            <h2>Anexo: cuadro de amortización · {l.prestamo.entidad}</h2>
            <p>
              Importe {eur(l.prestamo.importe)} · TIN {pct(l.prestamo.tinPct, 2)} · TAE aprox. {pct(l.taePct, 2)} · firma {formatDate(l.prestamo.fechaInicio)} · total intereses {eur(l.totalIntereses)}
            </p>
            <table>
              <thead><tr><th>Año</th><th className="right">Cuotas</th><th className="right">Intereses</th><th className="right">Capital</th><th className="right">Pendiente final</th></tr></thead>
              <tbody>
                {Array.from({ length: Math.ceil(l.filas.length / 12) }, (_, i) => l.filas.slice(i * 12, i * 12 + 12)).map((g, i) => (
                  <tr key={i}>
                    <td>{i + 1} ({monthLabel(g[0].month)} – {monthLabel(g[g.length - 1].month)})</td>
                    <td className="right">{eur(g.reduce((a, x) => a + x.cuota, 0))}</td>
                    <td className="right">{eur(g.reduce((a, x) => a + x.interes, 0))}</td>
                    <td className="right">{eur(g.reduce((a, x) => a + x.amortizacion, 0))}</td>
                    <td className="right">{eur(g[g.length - 1].pendiente)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        <p className="muted" style={{ fontSize: '0.8rem' }}>
          Documento generado con BusinessHub. Las cifras son estimaciones de planificación; los importes fiscales y laborales deben validarse con la gestoría.
        </p>
      </article>
    </PageShell>
  );
}
