import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HRN_CLASSES } from './HrnBadge';

export default function RiscoModal({ open, onClose, onSave, risco }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (risco) {
      setForm({ ...risco, hrn_valor: risco.hrn_valor ?? '' });
    } else {
      setForm({ local: '', alvo: '', tarefa: '', hrn_valor: '', hrn_classificacao: '', descricao: '', categoria: '' });
    }
  }, [risco, open]);

  const upd = (k, v) => setForm({ ...form, [k]: v });

  const handleSave = () => {
    onSave({ ...form, hrn_valor: form.hrn_valor ? Number(form.hrn_valor) : null });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{risco ? 'Editar Risco' : 'Adicionar Risco'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Local</Label><Input value={form.local || ''} onChange={e => upd('local', e.target.value)} /></div>
            <div><Label className="text-xs">Alvo</Label><Input value={form.alvo || ''} onChange={e => upd('alvo', e.target.value)} /></div>
          </div>
          <div><Label className="text-xs">Tarefa</Label><Input value={form.tarefa || ''} onChange={e => upd('tarefa', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">HRN Valor</Label><Input type="number" value={form.hrn_valor || ''} onChange={e => upd('hrn_valor', e.target.value)} /></div>
            <div>
              <Label className="text-xs">HRN Classificação</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.hrn_classificacao || ''} onChange={e => upd('hrn_classificacao', e.target.value)}>
                <option value="">Selecione</option>
                {HRN_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><Label className="text-xs">Categoria</Label><Input value={form.categoria || ''} onChange={e => upd('categoria', e.target.value)} /></div>
          <div><Label className="text-xs">Descrição</Label><Textarea rows={3} value={form.descricao || ''} onChange={e => upd('descricao', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}