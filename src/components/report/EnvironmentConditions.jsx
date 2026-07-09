import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Cloud } from 'lucide-react';

const DEFAULTS = { periodo: '', tempo: '', temperatura: '', umidade: '' };

export default function EnvironmentConditions({ value, onChange, location }) {
  const v = { ...DEFAULTS, ...(typeof value === 'string' ? safeParse(value) : value) };
  const [fetching, setFetching] = useState(false);
  const [lastFetched, setLastFetched] = useState('');

  const update = (field, val) => onChange({ ...v, [field]: val });

  useEffect(() => {
    if (!location || location.trim().length < 3) return;
    const loc = location.trim();
    const timer = setTimeout(async () => {
      setFetching(true);
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `Busque as condições climáticas atuais (tempo, temperatura em °C e umidade relativa do ar em %) para a cidade de "${loc}". Retorne apenas os dados atuais.`,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              tempo: { type: 'string', description: 'Descrição do tempo, ex: Ensolarado, Nublado, Chuvoso' },
              temperatura: { type: 'number', description: 'Temperatura em graus Celsius' },
              umidade: { type: 'number', description: 'Umidade relativa do ar em porcentagem' }
            }
          }
        });
        if (res && (res.tempo || res.temperatura || res.umidade)) {
          onChange({ ...v, tempo: res.tempo || v.tempo, temperatura: res.temperatura != null ? String(res.temperatura) : v.temperatura, umidade: res.umidade != null ? String(res.umidade) : v.umidade });
          setLastFetched(loc);
        }
      } catch (e) { /* ignore */ }
      setFetching(false);
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return (
    <div className="space-y-3">
      {fetching && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Buscando condições climáticas para "{location}"...
        </div>
      )}
      {lastFetched && !fetching && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-1.5">
          <Cloud className="h-3 w-3" />
          Condições climáticas preenchidas automaticamente para "{lastFetched}".
        </div>
      )}
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
      </div>
    </div>
  );
}

function safeParse(str) {
  try { const p = JSON.parse(str); return typeof p === 'object' ? p : {}; } catch { return {}; }
}