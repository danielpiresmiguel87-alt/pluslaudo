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
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Save, Plus, Search, Send, CheckCircle, Clock, Check, Upload, FileText, Loader2 } from 'lucide-react';
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
  const [users, setUsers] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [electricians, setElectricians] = useState([]);
  const [form, setForm] = useState({
    equipamento: '', tag_equipamento: '', local: '', data: new Date().toISOString().split('T')[0],
    cliente_id: '', engenheiro_id: '', eletricista_id: '', instrumento_id: '',
    numero_art: '', normas: DEFAULT_NORMAS, condicoes_ambiente: '',
    objetivo: DEFAULT_OBJECTIVE, metodologia: DEFAULT_METHODOLOGY,
    limitacoes: '', recomendacoes: DEFAULT_RECOMMENDATIONS,
    limite_ohms: 10, measurements: [], workflow_status: 'rascunho',
    mostrar_instrumento: true,
  });
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [clientForm, setClientForm] = useState({ razao_social: '', cnpj: '', endereco: '', cidade: '', cep: '', bairro: '', fone: '' });
  const [clientLookingUp, setClientLookingUp] = useState(false);
  const [showInstrumentDialog, setShowInstrumentDialog] = useState(false);
  const [instrumentForm, setInstrumentForm] = useState({ marca_modelo: '', numero_serie: '', data_calibracao: '', especificacoes: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [uploadingArt, setUploadingArt] = useState(false);

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
    base44.auth.me().then(setCurrentUser).catch(() => {});
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
      base44.entities.User.list(),
      base44.entities.Instrument.list(),
      base44.entities.Engineer.list(),
      base44.entities.Electrician.list(),
    ]).then(([c, u, i, engs, elecs]) => {
      setClients(c); setUsers(u); setInstruments(i);
      setEngineers(engs); setElectricians(elecs);
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
    if (!loading) {
      salvarRascunho(draftKey, form);
      setDraftSaved(true);
      const t = setTimeout(() => setDraftSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [form, draftKey, loading]);

  // Bloqueia saída acidental quando há dados
  useBloquearSaida(!saving && (!!form.equipamento || !!form.cliente_id || (form.measurements?.length > 0)));

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleArtUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { alert('Selecione um arquivo PDF.'); return; }
    if (!garantirConexao()) return;
    setUploadingArt(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('art_documento_url', file_url);
    } catch (err) { alert('Erro ao enviar ART: ' + err.message); }
    setUploadingArt(false);
  };

  // Salvar como rascunho no servidor e continuar editando
  const handleSaveDraft = async () => {
    if (!garantirConexao()) return;
    setSaving(true);
    try {
      const measurements = form.measurements || [];
      const updatedMeasurements = measurements.map(m => ({
        ...m,
        fotos: (m.fotos || []).map(f => typeof f === 'string' ? f : (f.url || f)),
      }));
      const lim = form.limite_ohms || 10;
      const status = updatedMeasurements.length === 0 ? 'rascunho' :
        updatedMeasurements.every(m => (m.valor_medido ?? Infinity) <= lim) ? 'aprovado' : 'reprovado';
      const validade = form.data ? new Date(new Date(form.data).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined;
      const payload = { ...form, condicoes_ambiente: formatEnvironmentConditions(form.condicoes_ambiente) || undefined, measurements: updatedMeasurements, status, validade, workflow_status: form.workflow_status || 'rascunho' };
      if (isNew) {
        const created = await base44.entities.Report.create(payload);
        limparRascunho(draftKey);
        navigate(`/reports/${created.id}/edit`);
      } else {
        await base44.entities.Report.update(id, payload);
        limparRascunho(draftKey);
      }
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
    } catch (e) {
      alert('Erro ao salvar rascunho: ' + e.message);
    }
    setSaving(false);
  };

  const userRole = currentUser?.role;
  const canEditFull = userRole === 'admin' || userRole === 'coordenador';
  const isEletricistaMode = userRole === 'eletricista' && form.workflow_status === 'pendente_medicao';

  useEffect(() => {
    if (!userRole || loading) return;
    if (userRole !== 'admin' && userRole !== 'coordenador') {
      if (isNew) { navigate('/'); return; }
      if (userRole === 'engenheiro' || (userRole === 'eletricista' && form.workflow_status !== 'pendente_medicao')) {
        navigate(`/reports/${id}`);
      }
    }
  }, [userRole, form.workflow_status, loading, isNew, id]);

  const handleSave = async (newWorkflowStatus) => {
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
      const workflow_status = newWorkflowStatus || form.workflow_status || 'rascunho';
      const payload = { ...form, condicoes_ambiente: condicoesStr || undefined, measurements: updatedMeasurements, status, validade, workflow_status };
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

  if (loading || !currentUser) return <p className="text-muted-foreground">Carregando...</p>;

  if (userRole && userRole !== 'admin' && userRole !== 'coordenador' && !isEletricistaMode) {
    return <p className="text-muted-foreground">Redirecionando...</p>;
  }

  if (isEletricistaMode) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/reports/${id}`)}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-bold">Medições - {form.equipamento}</h1>
        </div>
        <Card>
          <CardHeader><CardTitle>Informações do Laudo</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="font-medium text-muted-foreground">Equipamento:</span> {form.equipamento}</p>
            <p><span className="font-medium text-muted-foreground">Tag:</span> {form.tag_equipamento || '-'}</p>
            <p><span className="font-medium text-muted-foreground">Local:</span> {form.local || '-'}</p>
            <p><span className="font-medium text-muted-foreground">Limite:</span> {form.limite_ohms || 10} Ω</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Medições</CardTitle></CardHeader>
          <CardContent>
            <MeasurementEditor measurements={form.measurements || []} limite={form.limite_ohms || 10} onChange={m => set('measurements', m)} />
          </CardContent>
        </Card>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => handleSave('pendente_medicao')} disabled={saving} variant="outline" size="lg">
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar e Continuar Depois'}
          </Button>
          <Button onClick={() => handleSave('pendente_revisao')} disabled={saving} size="lg">
            <CheckCircle className="h-4 w-4 mr-2" /> {saving ? 'Enviando...' : 'Concluir Medições'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-bold">{isNew ? 'Novo Laudo' : 'Editar Laudo'}</h1>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> {draftSaved ? 'Salvando...' : 'Rascunho salvo automaticamente'}
        </span>
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
            <Label>Engenheiro Responsável</Label>
            <Select value={form.engenheiro_id || 'none'} onValueChange={v => set('engenheiro_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                {engineers.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Responsável pela medição</Label>
            <Select value={form.eletricista_id || 'none'} onValueChange={v => set('eletricista_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
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
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer mt-1">
              <Checkbox checked={form.mostrar_instrumento !== false} onCheckedChange={v => set('mostrar_instrumento', v)} />
              Mostrar dados do instrumento no laudo
            </label>
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
          <div>
            <Label>Documento da ART (PDF)</Label>
            {form.art_documento_url ? (
              <div className="flex items-center gap-2">
                <a href={form.art_documento_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline flex-1 truncate">
                  <FileText className="h-4 w-4 shrink-0" /> {form.art_documento_url.split('/').pop()}
                </a>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3">
                    <Upload className="h-4 w-4" /> Substituir
                  </span>
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleArtUpload} />
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={() => set('art_documento_url', '')}>
                  Remover
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <div className="flex items-center justify-center gap-2 border-2 border-dashed border-input rounded-md h-20 hover:bg-accent/50 transition-colors">
                  {uploadingArt ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> <span className="text-sm text-muted-foreground">Enviando...</span></>
                  ) : (
                    <><Upload className="h-4 w-4 text-muted-foreground" /> <span className="text-sm text-muted-foreground">Clique para anexar o PDF da ART</span></>
                  )}
                </div>
                <input type="file" accept="application/pdf" className="hidden" onChange={handleArtUpload} disabled={uploadingArt} />
              </label>
            )}
          </div>
          <div><Label>Normas e Referências</Label><Textarea value={form.normas || ''} onChange={e => set('normas', e.target.value)} rows={2} /></div>
          <div><Label className="mb-1 block">Condições do Ambiente e Clima</Label>
          <EnvironmentConditions value={form.condicoes_ambiente} onChange={obj => set('condicoes_ambiente', obj)} location={form.local} autoFetch={isNew} /></div>
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

      <div className="flex gap-3 flex-wrap items-center">
        <Button onClick={() => handleSave()} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar Laudo'}
        </Button>
        <Button onClick={handleSaveDraft} disabled={saving} variant="outline">
          <Save className="h-4 w-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar Rascunho'}
        </Button>
        {canEditFull && (
          <Button onClick={() => handleSave('pendente_medicao')} disabled={saving} variant="secondary">
            <Send className="h-4 w-4 mr-2" /> {saving ? 'Enviando...' : 'Enviar para Eletricista'}
          </Button>
        )}
        <Button variant="ghost" onClick={() => navigate(isNew ? '/' : `/reports/${id}`)}>Cancelar</Button>
        {draftSaved && (
          <span className="text-xs text-green-600 flex items-center gap-1 ml-auto">
            <Check className="h-3 w-3" /> Rascunho salvo
          </span>
        )}
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