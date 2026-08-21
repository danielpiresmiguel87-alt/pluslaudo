import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Cloud, RefreshCw } from 'lucide-react';

const DEFAULTS = { periodo: '', tempo: '', temperatura: '', umidade: '' };

export default function EnvironmentConditions({ value, onChange, location, autoFetch = true }) {
  const v = { ...DEFAULTS, ...parseConditions(value) };
  const [fetching, setFetching] = useState(false);
  const [lastFetched, setLastFetched] = useState('');
  const fetchedRef = useRef(false);

  const update = (field, val) => onChange({ ...v, [field]: val });

  // Já possui dados (de relatório salvo ou de fetch anterior)
  const hasData = !!(v.tempo || v.temperatura || v.umidade);

  const fetchWeather = async (loc) => {
    if (!loc || loc.trim().length < 3) return;
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
        const hour = new Date().getHours();
        const autoPeriodo = hour >= 5 && hour < 12 ? 'Manhã' : hour >= 12 && hour < 18 ? 'Tarde' : 'Noite';
        onChange({ ...v, tempo: res.tempo || v.tempo, temperatura: res.temperatura != null ? String(res.temperatura) : v.temperatura, umidade: res.umidade != null ? String(res.umidade) : v.umidade, periodo: v.periodo || autoPeriodo });
        setLastFetched(loc);
        fetchedRef.current = true;
      }
    } catch (e) { /* ignore */ }
    setFetching(false);
  };

  useEffect(() => {
    if (!autoFetch) return;
    // Só busca automaticamente se ainda não há dados (primeira vez)
    if (hasData) { fetchedRef.current = true; return; }
    if (!location || location.trim().length < 3) return;
    if (fetchedRef.current) return;
    const loc = location.trim();
    const timer = setTimeout(() => fetchWeather(loc), 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, autoFetch, hasData]);

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
          Condições climáticas preenchidas para "{lastFetched}".
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => fetchWeather(location?.trim())} disabled={fetching || !location || location.trim().length < 3}>
        <RefreshCw className={`h-3 w-3 mr-1 ${fetching ? 'animate-spin' : ''}`} />
        {fetching ? 'Buscando...' : hasData ? 'Atualizar Condições Climáticas' : 'Carregar Condições Climáticas'}
      </Button>
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

function parseConditions(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return {};
  // Formato novo: JSON
  try {
    const p = JSON.parse(value);
    if (typeof p === 'object' && p !== null) return p;
  } catch { /* formato legado — cai abaixo */ }
  // Formato legado: "Período: X | Tempo: Y | Temperatura: Z°C | Umidade: W%"
  const out = {};
  value.split('|').forEach(part => {
    const m = part.match(/^\s*(Período|Tempo|Temperatura|Umidade)\s*:\s*(.+?)\s*$/i);
    if (!m) return;
    const key = m[1].toLowerCase();
    const raw = m[2];
    if (key === 'periodo') out.periodo = raw;
    else if (key === 'tempo') out.tempo = raw;
    else if (key === 'temperatura') out.temperatura = raw.replace(/[°c\s]/gi, '');
    else if (key === 'umidade') out.umidade = raw.replace(/[%\s]/g, '');
  });
  return out;
}