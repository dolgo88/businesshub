import { useData } from '../state/DataContext';
import { MODULES } from '../modules';
import { navigate } from '../lib/router';
import { Icon } from '../components/Icons';
import { diffDays, formatDate } from '../lib/dates';
import { eurShort, num, pct } from '../lib/format';

export function HubPage() {
  const { derived: d, db, session } = useData();
  const s = d.schedule;
  const diasKickoff = diffDays(d.settings.fechaKickoff, d.today);
  const late = s.delayDays > 0;
  const p = d.projection;
  const n = MODULES.length;

  return (
    <div className="hub">
      <div className="hub-title">
        <h1>{d.settings.nombreNegocio}</h1>
        <p>Hola, {session?.user.nombre}. Kick-off objetivo: {formatDate(d.settings.fechaKickoff)}</p>
      </div>

      <div className="hub-ring">
        <div className="hub-center">
          <div>
            <div className="countdown num">{diasKickoff >= 0 ? num(diasKickoff) : '¡Abierto!'}</div>
            <div className="countdown-label">{diasKickoff >= 0 ? 'días para el kick-off' : `desde el ${formatDate(d.settings.fechaKickoff)}`}</div>
            <div className="status">
              {late ? (
                <span className="pill bad" title="Según las duraciones y dependencias del cronograma">
                  En riesgo: +{s.delayDays} días ({formatDate(s.projectedOpening)})
                </span>
              ) : (
                <span className="pill ok">Plan a tiempo (holgura {-s.delayDays} d)</span>
              )}
            </div>
            <div className="mini">
              <div>
                <b>{eurShort(d.budget.totalNecesidades)}</b>
                <span>necesidad total</span>
              </div>
              <div>
                <b className={d.financing.diferencia < 0 ? '' : ''}>{pct(d.financing.coberturaPct, 0)}</b>
                <span>financiado</span>
              </div>
              <div>
                <b>
                  {num(p.breakEven.ticketsDia)} / {num(p.breakEven.ticketsDiaPrevistos)}
                </b>
                <span>tickets/día equilibrio</span>
              </div>
              <div>
                <b style={{ color: p.cajaMinima.valor < 0 ? 'var(--bad)' : undefined }}>{eurShort(p.cajaMinima.valor)}</b>
                <span>caja mínima</span>
              </div>
            </div>
          </div>
        </div>

        {MODULES.map((m, i) => {
          const angle = (2 * Math.PI * i) / n - Math.PI / 2;
          const r = 39;
          return (
            <button
              key={m.id}
              className="hub-node"
              style={{ left: `${50 + r * Math.cos(angle)}%`, top: `${50 + r * Math.sin(angle)}%`, ['--node-color' as string]: m.color }}
              onClick={() => navigate(m.path)}
              title={m.description}
            >
              <span>
                <span className="node-icon">
                  <Icon name={m.id} />
                </span>
                <span className="node-label">{m.title}</span>
                <span className="node-badge" style={{ display: 'block' }}>
                  {m.badge(d, db)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="hub-grid">
        {MODULES.map((m) => (
          <button key={m.id} className="hub-tile" style={{ ['--node-color' as string]: m.color }} onClick={() => navigate(m.path)}>
            <span className="node-icon">
              <Icon name={m.id} />
            </span>
            <span>
              <b>{m.title}</b>
              <small className="muted">{m.badge(d, db)}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
