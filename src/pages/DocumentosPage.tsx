import { useState } from 'react';
import { useData } from '../state/DataContext';
import { PageShell, Select } from '../components/ui';
import { EditableTable, type Column } from '../components/EditableTable';
import { Icon } from '../components/Icons';
import type { Documento } from '../data/types';
import { uid } from '../lib/format';

const CATEGORIAS = ['General', 'Contratos', 'Planos y proyecto', 'Presupuestos de proveedores', 'Facturas', 'Licencias y permisos', 'Financiación', 'Normativa', 'Marca y diseño', 'Personal'];

function safeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

export function DocumentosPage() {
  const { db, setTable, readOnly } = useData();
  const [filtro, setFiltro] = useState('');
  const categorias = Array.from(new Set([...CATEGORIAS, ...db.Documentos.map((d) => d.categoria)]));
  const visibles = filtro ? db.Documentos.filter((d) => d.categoria === filtro) : db.Documentos;

  const columns: Column<Documento>[] = [
    {
      key: 'abrir', label: '', type: 'computed', width: 44,
      render: (d) => {
        const href = safeUrl(d.url);
        return href ? (
          <a className="btn small ghost" href={href} target="_blank" rel="noopener noreferrer" title="Abrir">
            <Icon name="link" size={16} />
          </a>
        ) : null;
      },
    },
    { key: 'titulo', label: 'Documento', width: 280 },
    { key: 'categoria', label: 'Categoría', options: categorias, width: 190 },
    { key: 'url', label: 'Enlace (Google Drive u otro)', width: 280, placeholder: 'https://drive.google.com/…' },
    { key: 'vinculo', label: 'Relacionado con', width: 170, placeholder: 'p. ej. Local Eixample, Obras…' },
    { key: 'fecha', label: 'Fecha', type: 'date', width: 140 },
    { key: 'notas', label: 'Notas', width: 240 },
  ];

  return (
    <PageShell moduleId="documentos" subtitle="Un índice de vuestros documentos: los archivos siguen en Google Drive, aquí solo se guardan los enlaces.">
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="muted">Filtrar:</span>
        <div style={{ width: 260 }}>
          <Select value={filtro} onChange={setFiltro} options={[{ value: '', label: 'Todas las categorías' }, ...categorias.map((c) => ({ value: c, label: c }))]} />
        </div>
      </div>
      <EditableTable<Documento>
        rows={visibles}
        columns={columns}
        onChange={(rows) => {
          const ids = new Set(visibles.map((v) => v.id));
          setTable('Documentos', [...db.Documentos.filter((x) => !ids.has(x.id)), ...rows]);
        }}
        readOnly={readOnly}
        groupBy={(d) => d.categoria || 'General'}
        newRow={() => ({ id: uid('doc'), titulo: 'Nuevo documento', categoria: filtro || 'General', url: '', vinculo: '', fecha: '', notas: '' })}
        addLabel="Añadir enlace"
      />
      <div className="tip" style={{ marginTop: 12 }}>
        Consejo: cread en Drive una carpeta compartida con subcarpetas por categoría (contratos, planos, facturas…) y pegad aquí los enlaces de lo importante.
        Asegúraos de que los archivos están compartidos solo con quien deba verlos.
      </div>
    </PageShell>
  );
}
