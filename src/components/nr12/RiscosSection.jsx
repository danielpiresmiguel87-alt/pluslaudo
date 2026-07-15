import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, LayoutGrid, Table as TableIcon } from 'lucide-react';
import HrnBadge from './HrnBadge';
import RiscoModal from './RiscoModal';

export default function RiscosSection({ riscos, onChange }) {
  const [view, setView] = useState('cards');
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const handleSave = (risco) => {
    if (editIndex !== null) {
      const updated = [...riscos];
      updated[editIndex] = risco;
      onChange(updated);
    } else {
      onChange([...riscos, risco]);
    }
  };

  const handleDelete = (idx) => {
    onChange(riscos.filter((_, i) => i !== idx));
  };

  const openNew = () => { setEditIndex(null); setModalOpen(true); };
  const openEdit = (i) => { setEditIndex(i); setModalOpen(true); };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar Risco
        </Button>
        <div className="flex gap-1">
          <Button type="button" variant={view === 'cards' ? 'default' : 'ghost'} size="icon" onClick={() => setView('cards')}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button type="button" variant={view === 'table' ? 'default' : 'ghost'} size="icon" onClick={() => setView('table')}>
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {riscos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum risco cadastrado.</p>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {riscos.map((r, i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Local:</span> {r.local || '—'}</p>
                    <p><span className="font-medium">Alvo:</span> {r.alvo || '—'}</p>
                    <p><span className="font-medium">Tarefa:</span> {r.tarefa || '—'}</p>
                  </div>
                  <HrnBadge valor={r.hrn_valor} classificacao={r.hrn_classificacao} />
                </div>
                {r.descricao && <p className="text-xs text-muted-foreground mt-2">{r.descricao}</p>}
                <div className="flex gap-1 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(i)}><Pencil className="h-3 w-3" /></Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(i)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2">Local</th>
                <th className="py-2 pr-2">Alvo</th>
                <th className="py-2 pr-2">Tarefa</th>
                <th className="py-2 pr-2">HRN</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {riscos.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2 pr-2">{r.local || '—'}</td>
                  <td className="py-2 pr-2">{r.alvo || '—'}</td>
                  <td className="py-2 pr-2">{r.tarefa || '—'}</td>
                  <td className="py-2 pr-2"><HrnBadge valor={r.hrn_valor} classificacao={r.hrn_classificacao} /></td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(i)}><Pencil className="h-3 w-3" /></Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(i)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RiscoModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} risco={editIndex !== null ? riscos[editIndex] : null} />
    </div>
  );
}