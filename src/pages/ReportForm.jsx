import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MeasurementEditor from '@/components/report/MeasurementEditor';
import { ArrowLeft, Save } from 'lucide-react';

const DEFAULT_OBJECTIVE = "O presente laudo técnico tem por objetivo, determinar o valor Ôhmico referente ao aterramento de equipamentos juntamente ao sistema de proteção contra descargas atmosféricas instalado na empresa, conforme PPCI (projeto preventivo contra incêndio), atendendo a resolução n° 017/CAT/CCB/88 do Corpo de bombeiros da Polícia militar do Estado de Santa Catarina.";

const DEFAULT_METHODOLOGY = "A metodologia utilizada no presente laudo, se baseia em diversas medições da resistência ôhmica ao longo da malha de aterramento do prédio aos equipamentos. A medição é feita com um pulso de alta corrente, eliminando a possibilidade de erros de leitura em função da distância ou quantidades de hastes e/ou ferragens de um aterramento. Para tal, foi utilizado um Terrômetro digital para coleta de dados.\n\nPara um resultado aceitável, a medição deve estar abaixo do valor máximo de referência. De acordo com a norma NSCI/94 (Norma de Segurança contra Incêndio), o valor de resistência ôhmica do sistema de aterramento para edificações em geral não pode ser superior a 10 ohms em qualquer período do ano.\n\nConsidera-se como valor de resistência ideal ou aceitável até um limite de (10 Ohms), sendo válidos somente valor igual ou abaixo deste.";

const DEFAULT_RECOMMENDATIONS = "Recomenda-se que o sistema de aterramento seja inspecionado e submetido a novas medições periodicamente, considerando alterações nas condições do solo e do ambiente operacional. Devem ser mantidos registros atualizados das medições, bem como realizadas verificações adicionais sempre que houver intervenções elétricas, reformas, substituição de equipamentos ou identificação de anomalias no funcionamento do sistema.\n\nTambém é indicado assegurar a integridade mecânica dos condutores e conexões, mantendo-os protegidos contra corrosão, umidade, esforços mecânicos e possíveis afrouxamentos. Sempre que necessário, deve-se reapertar conexões, renovar pontos oxidados e revisar a continuidade elétrica do sistema.\n\nPor fim, recomenda-se que todas as intervenções futuras no aterramento sejam executadas por profissional habilitado, com emissão de ART correspondente.";

const DEFAULT_NORMAS = "NBR 5410, NBR 5419, NBR 15749, NR-10";

export default function ReportForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [electricians, setElectricians] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [form, setForm] = useState({
    equipamento: '', local: '', data: new Date().toISOString().split('T')[0],
    cliente_id: '', engenheiro_id: '', eletricista_id: '', instrumento_id: '',
    numero_art: '', normas: DEFAULT_NORMAS, condicoes_ambiente: '',
    objetivo: DEFAULT_OBJECTIVE, metodologia: DEFAULT_METHODOLOGY,
    limitacoes: '', recomendacoes: DEFAULT_RECOMMENDATIONS,
    limite_ohms: 10, measurements: [],
  });

  useEffect(() => {
    Promise.all([
      base44.entities.Client.list(),
      base44.entities.Engineer.list(),
      base44.entities.Electrician.list(),
      base44.entities.Instrument.list(),
    ]).then(([c, e, el, i]) => {
      setClients(c); setEngineers(e); setElectricians(el); setInstruments(i);
    });
    if (!isNew) {
      base44.entities.Report.get(id).then(r => {
        setForm({
          objetivo: DEFAULT_OBJECTIVE, metodologia: DEFAULT_METHODOLOGY,
          recomendacoes: DEFAULT_RECOMMENDATIONS, normas: DEFAULT_NORMAS,
          limite_ohms: 10, measurements: [], ...r,
        });
        setLoading(false);
      });
    }
  }, [id]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    const lim = form.limite_ohms || 10;
    const measurements = form.measurements || [];
    const status = measurements.length === 0 ? 'rascunho' :
      measurements.every(m => (m.valor_medido ?? Infinity) <= lim) ? 'aprovado' : 'reprovado';
    const payload = { ...form, status };
    if (isNew) {
      const created = await base44.entities.Report.create(payload);
      navigate(`/reports/${created.id}`);
    } else {
      await base44.entities.Report.update(id, payload);
      navigate(`/reports/${id}`);
    }
    setSaving(false);
  };

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">{isNew ? 'Novo Laudo' : 'Editar Laudo'}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Equipamento</Label><Input value={form.equipamento} onChange={e => set('equipamento', e.target.value)} placeholder="Ex: MOINHO 02" /></div>
          <div><Label>Local</Label><Input value={form.local} onChange={e => set('local', e.target.value)} placeholder="Ex: Orleans / SC" /></div>
          <div><Label>Data</Label><Input type="date" value={form.data || ''} onChange={e => set('data', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Partes Envolvidas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Cliente</Label>
            <Select value={form.cliente_id || 'none'} onValueChange={v => set('cliente_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Engenheiro Responsável</Label>
            <Select value={form.engenheiro_id || 'none'} onValueChange={v => set('engenheiro_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {engineers.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Eletricista (Executor)</Label>
            <Select value={form.eletricista_id || 'none'} onValueChange={v => set('eletricista_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {electricians.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Instrumento</Label>
            <Select value={form.instrumento_id || 'none'} onValueChange={v => set('instrumento_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {instruments.map(i => <SelectItem key={i.id} value={i.id}>{i.marca_modelo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dados Técnicos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Número da ART</Label><Input value={form.numero_art || ''} onChange={e => set('numero_art', e.target.value)} /></div>
          <div><Label>Normas e Referências</Label><Textarea value={form.normas || ''} onChange={e => set('normas', e.target.value)} rows={2} /></div>
          <div><Label>Condições do Ambiente e Clima</Label><Textarea value={form.condicoes_ambiente || ''} onChange={e => set('condicoes_ambiente', e.target.value)} rows={3} placeholder="Período do dia, tempo, temperatura, umidade, condições do solo..." /></div>
          <div><Label>Limitações do Ensaio</Label><Textarea value={form.limitacoes || ''} onChange={e => set('limitacoes', e.target.value)} rows={3} placeholder="Interferências, condições que afetaram a medição..." /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Textos Técnicos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Objetivo</Label><Textarea value={form.objetivo || ''} onChange={e => set('objetivo', e.target.value)} rows={4} /></div>
          <div><Label>Metodologia</Label><Textarea value={form.metodologia || ''} onChange={e => set('metodologia', e.target.value)} rows={5} /></div>
          <div><Label>Recomendações Finais</Label><Textarea value={form.recomendacoes || ''} onChange={e => set('recomendacoes', e.target.value)} rows={5} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Medições</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>Limite de Referência (Ohms)</Label>
            <Input type="number" step="0.01" value={form.limite_ohms || 10} onChange={e => set('limite_ohms', parseFloat(e.target.value))} className="w-32" />
          </div>
          <MeasurementEditor measurements={form.measurements || []} limite={form.limite_ohms || 10} onChange={m => set('measurements', m)} />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar Laudo'}
        </Button>
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
      </div>
    </div>
  );
}