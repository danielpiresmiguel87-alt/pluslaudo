import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ENERGIAS = [
  { key: 'eletrica', label: 'Elétrica', field: 'tensao', valorLabel: 'Tensão' },
  { key: 'pneumatica', label: 'Pneumática', field: 'pressao', valorLabel: 'Pressão' },
  { key: 'mecanica', label: 'Mecânica', field: 'forca', valorLabel: 'Força' },
  { key: 'hidraulica', label: 'Hidráulica', field: 'pressao', valorLabel: 'Pressão' },
  { key: 'radioativa', label: 'Radioativa', field: 'radiacao', valorLabel: 'Radiação' },
  { key: 'quimica', label: 'Química', field: 'volume', valorLabel: 'Volume' },
  { key: 'termica', label: 'Térmica', field: 'valor', valorLabel: 'Valor' },
];

export default function EnergyGrid({ form, setForm }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ENERGIAS.map(e => {
        const checkKey = `energia_${e.key}`;
        const valorKey = `${checkKey}_${e.field}`;
        const checked = form[checkKey] || false;
        return (
          <div key={e.key} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id={checkKey} checked={checked} onCheckedChange={(v) => setForm({ ...form, [checkKey]: !!v })} />
              <Label htmlFor={checkKey} className="text-sm font-medium cursor-pointer">{e.label}</Label>
            </div>
            {checked && (
              <div>
                <Label className="text-xs text-muted-foreground">{e.valorLabel}</Label>
                <Input value={form[valorKey] || ''} onChange={(ev) => setForm({ ...form, [valorKey]: ev.target.value })} placeholder={e.valorLabel} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}