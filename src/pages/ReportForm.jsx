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
import EnvironmentConditions from '@/components/report/EnvironmentConditions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Save, Plus, Search } from 'lucide-react';
import {
  carregarRascunho,
  salvarRascunho,
  limparRascunho,
  garantirConexao,
  uploadFotosEmLote,
  useBloquearSaida,
} from '@/lib/offline';
import { formatEnvironmentConditions } from '@/utils/environment';

const DEFAULT_OBJECTIVE = "O presente laudo técnico tem por objetivo, determinar o valor Ôhmico referente ao aterramento de equipamentos juntamente ao sistema de proteção contra descargas atmosféricas instalado na empresa, conforme PPCI (projeto preventivo contra incêndio), atendendo a resolução n° 017/CAT/CCB/88 do Corpo de bombeiros da Polícia militar do Estado de Santa Catarina.";

const DEFAULT_METHODOLOGY = "A metodologia utilizada no presente laudo se baseia na medição da resistência ôhmica de aterramento da máquina/equipamento avaliado, visando verificar a eficácia da ligação de terra do equipamento e o atendimento aos requisitos de segurança estabelecidos pela NR-12 (Norma Regulamentadora nº 12 - Segurança no Trabalho em Máquinas e Equipamentos). A medição é feita com um pulso de alta corrente, eliminando a possibilidade de erros de leitura em função da distância ou quantidades de hastes e/ou ferragens de um aterramento. Para tal, foi utilizado um Terrômetro digital para coleta de dados.\n\nPara um resultado aceitável, a medição deve estar abaixo do valor máximo de referência. De acordo com a norma NSCI/94 (Norma de Segurança contra Incêndio), o valor de resistência ôhmica do sistema de aterramento não pode ser superior a 10 ohms em qualquer período do ano.\n\nConsidera-se como valor de resistência ideal ou aceitável até um limite de (10 Ohms), sendo válidos somente valor igual ou abaixo deste.";

const DEFAULT_RECOMMENDATIONS = "Conforme a NBR 5419 e a NSCI/94, o sistema de aterramento deve ser inspecionado e submetido a novas medições com periodicidade ANUAL (12 meses), considerando alterações nas condições do solo e do ambiente operacional. A NR-12 estabelece que as máquinas e equipamentos devem passar por manutenção e inspeções periódicas, devendo o aterramento ser verificado dentro desse mesmo prazo para garantir a segurança do operador. Devem ser mantidos registros atualizados das medições, bem como realizadas verificações adicionais sempre que houver intervenções elétricas, reformas, substituição de equipamentos ou identificação de anomalias no funcionamento do sistema.\n\nTambém é indicado assegurar a integridade mecânica dos condutores e conexões, mantendo-os protegidos contra corrosão, umidade, esforços mecânicos e possíveis afrouxamentos. Sempre que necessário, deve-se reapertar conexões, renovar pontos oxidados e revisar a continuidade elétrica do sistema.\n\nPor fim, recomenda-se que todas as intervenções futuras no aterramento sejam executadas por profissional habilitado, com emissão de ART correspondente.";

const DEFAULT_NORMAS = "NBR 5410, NBR 5419, NBR 15749, NR-10, NR-12";

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
    equipamento: '', tag_equipamento: '', local: '', data: new Date().toISOString().split('T')[0],
    cliente_id: '', engenheiro_id: '', eletricista_id: '', instrumento_id: '',
    numero_art: '', normas: DEFAULT_NORMAS, condicoes_ambiente: '',
    objetivo: DEFAULT_OBJECTIVE, metodologia: DEFAULT_METHODOLOGY,
    limitacoes: '', recomendacoes: DEFAULT_RECOMMENDATIONS,
    limite_ohms: 10, measurements: [],
  });
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [clientForm, setClientForm] = useState({ razao_social: '', cnpj: '', endereco: '', cidade: '', cep: '', bairro: '', fone: '' });
  const [clientLookingUp, setClientLookingUp] = useState(false);
  const [showEngineerDialog, setShowEngineerDialog] = useState(false);
  const [engineerForm, setEngineerForm] = useState({ nome: '', cpf: '', crea_sc: '' });
  const [showElectricianDialog, setShowElectricianDialog] = useState(false);
  const [electricianForm, setElectricianForm] = useState({ nome: '', cpf: '', registro_profissional: '' });
  const [showInstrumentDialog, setShowInstrumentDialog] = useState(false);
  const [instrumentForm, setInstrumentForm] = useState({ marca_modelo: '', numero_serie: '', data_calibracao: '', especificacoes: '' });

  const handleClientCnpjLookup = async () => {
    const cnpj = (clientForm.cnpj || '').replace(/\D/g, '');
    if (cnpj.length !== 14) { alert('CNPJ inválido. Deve conter 14 dígitos.'); return; }
    setClientLookingUp(true);
    try {
      const res = await base44.functions.invoke('consultarCnpj', { cnpj });
      if (res.data.error) { alert(res.data.error); }
      else { setClientForm(s => ({ ...s, ...res.data })); }
    } catch (e) { alert('Erro ao consultar CNPJ: ' + e.message); }
    setClientLookingUp(false);
  };

  const draftKey = isNew ? 'report_draft' : `report_draft_${id}`;

  useEffect(() => {
    const draft = carregarRascunho(draftKey);
    if (draft) {
      setForm({
        objetivo: DEFAULT_OBJECTIVE, metodologia: DEFAULT_METHODOLOGY,
        recomendacoes: DEFAULT_RECOMMENDATIONS, normas: DEFAULT_NORMAS,
        limite_ohms: 10, measurements: [], ...draft,
      });
      setLoading(false);
    }
    Promise.all([
      base44.entities.Client.list(),
      base44.entities.Engineer.list(),
      base44.entities.Electrician.list(),
      base44.entities.Instrument.list(),
    ]).then(([c, e, el, i]) => {
      setClients(c); setEngineers(e); setElectricians(el); setInstruments(i);
    });
    if (!isNew && !draft) {
      base44.entities.Report.get(id).then(r => {
        setForm({
          objetivo: DEFAULT_OBJECTIVE, metodologia: DEFAULT_METHODOLOGY,
          recomendacoes: DEFAULT_RECOMMENDATIONS, normas: DEFAULT_NORMAS,
          limite_ohms: 10, measurements: [], ...r,
        });
        setLoading(false);
      });
    }
  }, [id, draftKey]);

  // Auto-save rascunho
  useEffect(() => {
    if (!loading) salvarRascunho(draftKey, form);
  }, [form, draftKey, loading]);

  // Bloqueia saída acidental quando há dados
  useBloquearSaida(!saving && (!!form.equipamento || !!form.cliente_id || (form.measurements?.length > 0)));

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!garantirConexao()) return;
    setSaving(true);
    try {
      // Upload de todas as fotos pendentes (data URL → URL remoto)
      const measurements = form.measurements || [];
      const updatedMeasurements = [];
      for (const m of measurements) {
        const fotos = m.fotos || [];
        const pendentes = fotos.filter(f => typeof f === 'object' && (f._localFile || f.dataUrl));
        if (pendentes.length > 0) {
          const { itens, falhas } = await uploadFotosEmLote(pendentes, {
            uploadFn: (file) => base44.integrations.Core.UploadFile({ file }),
          });
          if (falhas.length > 0) {
            alert(`${falhas.length} foto(s) não puderam ser enviadas. Verifique a conexão e tente novamente.`);
            setSaving(false);
            return;
          }
          const urlsExistentes = fotos.filter(f => typeof f === 'string' || f.url).map(f => typeof f === 'string' ? f : f.url);
          updatedMeasurements.push({ ...m, fotos: [...urlsExistentes, ...itens] });
        } else {
          updatedMeasurements.push({
            ...m,
            fotos: fotos.map(f => typeof f === 'string' ? f : (f.url || f)),
          });
        }
      }

      const lim = form.limite_ohms || 10;
      const status = updatedMeasurements.length === 0 ? 'rascunho' :
        updatedMeasurements.every(m => (m.valor_medido ?? Infinity) <= lim) ? 'aprovado' : 'reprovado';
      const validade = form.data ? new Date(new Date(form.data).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined;
      const condicoesStr = formatEnvironmentConditions(form.condicoes_ambiente);
      const payload = { ...form, condicoes_ambiente: condicoesStr || undefined, measurements: updatedMeasurements, status, validade };
      if (isNew) {
        const created = await base44.entities.Report.create(payload);
        limparRascunho(draftKey);
        navigate(`/reports/${created.id}`);
      } else {
        await base44.entities.Report.update(id, payload);
        limparRascunho(draftKey);
        navigate(`/reports/${id}`);
      }
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
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
        <CardHeader><CardTitle>Partes Envolvidas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between">
              <Label>Cliente</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowClientDialog(true)}>
                <Plus className="h-3 w-3 mr-1" /> Novo
              </Button>
            </div>
            <Select value={form.cliente_id || 'none'} onValueChange={v => set('cliente_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Engenheiro Responsável</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowEngineerDialog(true)}>
                <Plus className="h-3 w-3 mr-1" /> Novo
              </Button>
            </div>
            <Select value={form.engenheiro_id || 'none'} onValueChange={v => set('engenheiro_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {engineers.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Eletricista (Executor)</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowElectricianDialog(true)}>
                <Plus className="h-3 w-3 mr-1" /> Novo
              </Button>
            </div>
            <Select value={form.eletricista_id || 'none'} onValueChange={v => set('eletricista_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {electricians.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Instrumento</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowInstrumentDialog(true)}>
                <Plus className="h-3 w-3 mr-1" /> Novo
              </Button>
            </div>
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
        <CardHeader><CardTitle>Identificação do Equipamento</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Equipamento</Label><Input value={form.equipamento} onChange={e => set('equipamento', e.target.value)} placeholder="Ex: MOINHO 02" /></div>
          <div><Label>Tag do Equipamento</Label><Input value={form.tag_equipamento || ''} onChange={e => set('tag_equipamento', e.target.value)} placeholder="Ex: MQ-001" /></div>
          <div><Label>Local</Label><Input value={form.local} onChange={e => set('local', e.target.value)} placeholder="Ex: Orleans / SC" /></div>
          <div><Label>Data</Label><Input type="date" value={form.data || ''} onChange={e => set('data', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dados Técnicos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Número da ART</Label><Input value={form.numero_art || ''} onChange={e => set('numero_art', e.target.value)} /></div>
          <div><Label>Normas e Referências</Label><Textarea value={form.normas || ''} onChange={e => set('normas', e.target.value)} rows={2} /></div>
          <div><Label className="mb-1 block">Condições do Ambiente e Clima</Label>
          <EnvironmentConditions value={form.condicoes_ambiente} onChange={obj => set('condicoes_ambiente', obj)} location={form.local} /></div>
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

      <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="md:col-span-2">
              <Label>Razão Social *</Label>
              <Input value={clientForm.razao_social} onChange={e => setClientForm(s => ({ ...s, razao_social: e.target.value }))} />
            </div>
            <div>
              <Label>CNPJ</Label>
              <div className="flex gap-2">
                <Input value={clientForm.cnpj} onChange={e => setClientForm(s => ({ ...s, cnpj: e.target.value }))} className="flex-1" placeholder="00.000.000/0000-00" />
                <Button type="button" variant="outline" size="sm" onClick={handleClientCnpjLookup} disabled={clientLookingUp}>
                  <Search className="h-4 w-4" /> {clientLookingUp ? '...' : 'Buscar'}
                </Button>
              </div>
            </div>
            <div><Label>Fone</Label><Input value={clientForm.fone} onChange={e => setClientForm(s => ({ ...s, fone: e.target.value }))} /></div>
            <div className="md:col-span-2"><Label>Endereço</Label><Input value={clientForm.endereco} onChange={e => setClientForm(s => ({ ...s, endereco: e.target.value }))} /></div>
            <div><Label>Cidade</Label><Input value={clientForm.cidade} onChange={e => setClientForm(s => ({ ...s, cidade: e.target.value }))} /></div>
            <div><Label>CEP</Label><Input value={clientForm.cep} onChange={e => setClientForm(s => ({ ...s, cep: e.target.value }))} /></div>
            <div><Label>Bairro</Label><Input value={clientForm.bairro} onChange={e => setClientForm(s => ({ ...s, bairro: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClientDialog(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!clientForm.razao_social) return;
              if (!garantirConexao()) return;
              const created = await base44.entities.Client.create(clientForm);
              setClients(s => [...s, created]);
              set('cliente_id', created.id);
              setClientForm({ razao_social: '', cnpj: '', endereco: '', cidade: '', cep: '', bairro: '', fone: '' });
              setShowClientDialog(false);
            }}>Salvar Cliente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEngineerDialog} onOpenChange={setShowEngineerDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Engenheiro</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-2">
            <div><Label>Nome *</Label><Input value={engineerForm.nome} onChange={e => setEngineerForm(s => ({ ...s, nome: e.target.value }))} /></div>
            <div><Label>CPF</Label><Input value={engineerForm.cpf} onChange={e => setEngineerForm(s => ({ ...s, cpf: e.target.value }))} /></div>
            <div><Label>CREA-SC</Label><Input value={engineerForm.crea_sc} onChange={e => setEngineerForm(s => ({ ...s, crea_sc: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEngineerDialog(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!engineerForm.nome) return;
              if (!garantirConexao()) return;
              const created = await base44.entities.Engineer.create(engineerForm);
              setEngineers(s => [...s, created]);
              set('engenheiro_id', created.id);
              setEngineerForm({ nome: '', cpf: '', crea_sc: '' });
              setShowEngineerDialog(false);
            }}>Salvar Engenheiro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showElectricianDialog} onOpenChange={setShowElectricianDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Eletricista</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-2">
            <div><Label>Nome *</Label><Input value={electricianForm.nome} onChange={e => setElectricianForm(s => ({ ...s, nome: e.target.value }))} /></div>
            <div><Label>CPF</Label><Input value={electricianForm.cpf} onChange={e => setElectricianForm(s => ({ ...s, cpf: e.target.value }))} /></div>
            <div><Label>Registro Profissional</Label><Input value={electricianForm.registro_profissional} onChange={e => setElectricianForm(s => ({ ...s, registro_profissional: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowElectricianDialog(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!electricianForm.nome) return;
              if (!garantirConexao()) return;
              const created = await base44.entities.Electrician.create(electricianForm);
              setElectricians(s => [...s, created]);
              set('eletricista_id', created.id);
              setElectricianForm({ nome: '', cpf: '', registro_profissional: '' });
              setShowElectricianDialog(false);
            }}>Salvar Eletricista</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInstrumentDialog} onOpenChange={setShowInstrumentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Instrumento</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-2">
            <div><Label>Marca / Modelo *</Label><Input value={instrumentForm.marca_modelo} onChange={e => setInstrumentForm(s => ({ ...s, marca_modelo: e.target.value }))} /></div>
            <div><Label>Número de Série</Label><Input value={instrumentForm.numero_serie} onChange={e => setInstrumentForm(s => ({ ...s, numero_serie: e.target.value }))} /></div>
            <div><Label>Data de Calibração</Label><Input type="date" value={instrumentForm.data_calibracao} onChange={e => setInstrumentForm(s => ({ ...s, data_calibracao: e.target.value }))} /></div>
            <div><Label>Especificações</Label><Textarea value={instrumentForm.especificacoes} onChange={e => setInstrumentForm(s => ({ ...s, especificacoes: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInstrumentDialog(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!instrumentForm.marca_modelo) return;
              if (!garantirConexao()) return;
              const created = await base44.entities.Instrument.create(instrumentForm);
              setInstruments(s => [...s, created]);
              set('instrumento_id', created.id);
              setInstrumentForm({ marca_modelo: '', numero_serie: '', data_calibracao: '', especificacoes: '' });
              setShowInstrumentDialog(false);
            }}>Salvar Instrumento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}