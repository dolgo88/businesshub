import { Fragment, type ReactNode } from 'react';
import { DateInput, MultiSelect, NumberInput, Select, TextInput } from './ui';
import { Icon } from './Icons';

type Option = string | { value: string; label: string };

export interface Column<T> {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'money' | 'percent' | 'date' | 'select' | 'bool' | 'multi' | 'computed';
  options?: Option[] | ((row: T) => Option[]);
  width?: number | string;
  decimals?: number;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  placeholder?: string;
  footer?: ReactNode;
  readOnly?: boolean | ((row: T) => boolean);
  title?: string;
}

interface Props<T extends { id: string }> {
  rows: T[];
  columns: Column<T>[];
  onChange: (rows: T[]) => void;
  newRow?: () => T;
  addLabel?: string;
  readOnly?: boolean;
  rowClassName?: (row: T) => string;
  emptyText?: string;
  groupBy?: (row: T) => string;
  groupFooter?: (group: string, rows: T[]) => ReactNode;
  onAddToGroup?: (group: string) => void;
  extraActions?: ReactNode;
  rowActions?: (row: T) => ReactNode;
  showFooter?: boolean;
  confirmDelete?: (row: T) => string | null;
}

const NUMERIC = new Set(['number', 'money', 'percent']);

/** Tabla editable genérica: cada celda guarda al momento (con autoguardado en el Sheet). */
export function EditableTable<T extends { id: string }>({
  rows,
  columns,
  onChange,
  newRow,
  addLabel = 'Añadir fila',
  readOnly,
  rowClassName,
  emptyText = 'No hay filas todavía.',
  groupBy,
  groupFooter,
  onAddToGroup,
  extraActions,
  rowActions,
  showFooter,
  confirmDelete,
}: Props<T>) {
  const update = (id: string, key: string, value: unknown) => {
    onChange(rows.map((r) => (r.id === id ? ({ ...r, [key]: value } as T) : r)));
  };
  const remove = (row: T) => {
    const msg = confirmDelete ? confirmDelete(row) : '¿Eliminar esta fila?';
    if (msg && !window.confirm(msg)) return;
    onChange(rows.filter((r) => r.id !== row.id));
  };

  const cell = (row: T, c: Column<T>) => {
    const value = (row as Record<string, unknown>)[c.key];
    const ro = readOnly || (typeof c.readOnly === 'function' ? c.readOnly(row) : c.readOnly);
    if (c.type === 'computed' || c.render) return <span className={`computed ${c.align === 'right' ? 'num' : ''}`}>{c.render ? c.render(row) : String(value ?? '')}</span>;
    switch (c.type) {
      case 'number':
      case 'money':
      case 'percent':
        return (
          <NumberInput
            className="cell-input num"
            value={Number(value) || 0}
            decimals={c.decimals ?? (c.type === 'money' ? 2 : 2)}
            onChange={(n) => update(row.id, c.key, n)}
            disabled={ro}
            ariaLabel={c.label}
          />
        );
      case 'date':
        return <DateInput className="cell-input" value={String(value ?? '')} onChange={(v) => update(row.id, c.key, v)} disabled={ro} ariaLabel={c.label} />;
      case 'select': {
        const opts = typeof c.options === 'function' ? c.options(row) : c.options ?? [];
        return <Select className="cell-input" value={String(value ?? '')} options={opts} onChange={(v) => update(row.id, c.key, v)} disabled={ro} ariaLabel={c.label} />;
      }
      case 'bool':
        return (
          <input
            type="checkbox"
            checked={Boolean(value)}
            disabled={ro}
            aria-label={c.label}
            style={{ width: 18, height: 18, accentColor: 'var(--sage)' }}
            onChange={(e) => update(row.id, c.key, e.target.checked)}
          />
        );
      case 'multi': {
        const opts = (typeof c.options === 'function' ? c.options(row) : c.options ?? []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
        return <MultiSelect value={(value as string[]) ?? []} options={opts} onChange={(v) => update(row.id, c.key, v)} disabled={ro} />;
      }
      default: {
        if (c.options) {
          // Texto libre con sugerencias (p. ej. categorías existentes).
          const opts = (typeof c.options === 'function' ? c.options(row) : c.options).map((o) => (typeof o === 'string' ? o : o.value));
          const listId = `dl-${c.key}`;
          return (
            <>
              <input
                className="cell-input"
                list={listId}
                value={String(value ?? '')}
                placeholder={c.placeholder}
                disabled={ro}
                aria-label={c.label}
                onChange={(e) => update(row.id, c.key, e.target.value)}
              />
              <datalist id={listId}>
                {opts.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </>
          );
        }
        return <TextInput className="cell-input" value={String(value ?? '')} placeholder={c.placeholder} onChange={(v) => update(row.id, c.key, v)} disabled={ro} ariaLabel={c.label} />;
      }
    }
  };

  const groups: [string, T[]][] = groupBy
    ? Array.from(
        rows.reduce((m, r) => {
          const g = groupBy(r);
          m.set(g, [...(m.get(g) ?? []), r]);
          return m;
        }, new Map<string, T[]>()),
      )
    : [['', rows]];

  const colSpan = columns.length + (readOnly ? 0 : 1);

  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width, minWidth: c.width }} className={c.align ?? (NUMERIC.has(c.type ?? '') ? 'right' : '')} title={c.title}>
                {c.label}
              </th>
            ))}
            {!readOnly && <th className="row-actions" style={{ width: rowActions ? 80 : 36 }} />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="muted" style={{ padding: 16 }}>
                {emptyText}
              </td>
            </tr>
          )}
          {groups.map(([g, list]) => (
            <Fragment key={g || 'all'}>
              {groupBy && (
                <tr className="group">
                  <td colSpan={colSpan}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span>{g || 'Sin categoría'}</span>
                      <span className="row" style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: '0.85rem' }}>
                        {groupFooter?.(g, list)}
                        {onAddToGroup && !readOnly && (
                          <button className="btn small ghost" onClick={() => onAddToGroup(g)}>
                            <Icon name="plus" size={14} /> Añadir
                          </button>
                        )}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
              {list.map((row) => (
                <tr key={row.id} className={rowClassName?.(row) ?? ''}>
                  {columns.map((c) => (
                    <td key={c.key} className={c.align ?? (NUMERIC.has(c.type ?? '') ? 'right' : c.type === 'bool' ? 'center' : '')}>
                      {cell(row, c)}
                    </td>
                  ))}
                  {!readOnly && (
                    <td className="right nowrap row-actions">
                      {rowActions?.(row)}
                      <button className="icon-btn" title="Eliminar" aria-label="Eliminar fila" onClick={() => remove(row)}>
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
        {showFooter && (
          <tfoot>
            <tr>
              {columns.map((c) => (
                <td key={c.key} className={c.align ?? (NUMERIC.has(c.type ?? '') ? 'right' : '')}>
                  {c.footer}
                </td>
              ))}
              {!readOnly && <td className="row-actions" />}
            </tr>
          </tfoot>
        )}
      </table>
      {(newRow || extraActions) && !readOnly && (
        <div className="table-actions no-print">
          {newRow && (
            <button className="btn small" onClick={() => onChange([...rows, newRow()])}>
              <Icon name="plus" size={14} /> {addLabel}
            </button>
          )}
          {extraActions}
        </div>
      )}
    </div>
  );
}
