import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DEFAULTS = { periodo: '', tempo: '', temperatura: '', umidade: '', solo: '' };

export default function EnvironmentConditions({ value, onChange }) {
  const v = { ...DEFAULTS, ...(typeof value === 'string' ? safeParse(value) : value) };

  const update = (field, val) => onChange({ ...v, [field]: val });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>Período</Label>
        <Select value={v.periodo || 'none'} onValueChange={val => update('periodo', val === 'none' ? '' : val)}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            <SelectItem value="Manhã">Manhã</SelectItem>
            <SelectItem value="Tarde">Tarde</SelectItem>
            <SelectItem value="Noite">Noite</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Tempo</Label>
        <Input value={v.tempo || ''} onChange={e => update('tempo', e.target.value)} placeholder="Ensolarado, nublado, chuvoso..." />
      </div>
      <div>
        <Label>Temperatura (°C)</Label>
        <Input type="number" value={v.temperatura || ''} onChange={e => update('temperatura', e.target.value)} placeholder="Ex: 25" />
      </div>
      <div>
        <Label>Umidade (%)</Label>
        <Input type="number" value={v.umidade || ''} onChange={e => update('umidade', e.target.value)} placeholder="Ex: 65" />
      </div>
      <div className="md:col-span-2">
        <Label>Condições do Solo</Label>
        <Input value={v.solo || ''} onChange={e => update('solo', e.target.value)} placeholder="Úmido, seco, resistivo..." />
      </div>
    </div>
  );
}

function safeParse(str) {
  try { const p = JSON.parse(str); return typeof p === 'object' ? p : {}; } catch { return {}; }
}