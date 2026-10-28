import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Upload, Loader2, FileText } from 'lucide-react';

const EMPTY = {
  numero: '', cliente_id: '', cliente: '', empresa_emissora: '', status: 'Em Andamento',
  engenheiro_id: '', engenheiro_responsavel: '', eletricista_id: '', instrumento_id: '',
  numero_art: '', art_documento_url: '', normas: '', objetivo: '', metodologia: '',
  limitacoes: '', recomendacoes: '', limite_ohms: 10,
  data_inicio: new Date().toISOString().split('T')[0], data_conclusao: '', observacoes: '',
};

export default function ProjectForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [electricians, setElectricians] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [uploadingArt, setUploadingArt] = useState(false);
  const [extractingArt, setExtractingArt] = useState(false);

  useEffect(() => {
    base44.entities.Client.list().then(setClients).catch(() => setClients([]));
    base44.entities.Engineer.list().then(setEngineers).catch(() => setEngineers([]));
    base44.entities.Electrician.list().then(setElectricians).catch(() => setElectricians([]));
    base44.entities.Instrument.list().then(setInstruments).catch(() => setInstruments([]));
    base44.entities.User.list().then(setUsers).catch(() => setUsers([]));
    base44.entities.Company.list()
      .then(c => { if (c[0]?.razao_social) setForm(f => f.empresa_emissora ? f : { ...f, empresa_emissora: c[0].razao_social }); })
      .catch(() => {});
    if (!isNew) {
      base44.entities.Projeto.get(id)
        .then(p => { setForm({ ...EMPTY, ...p }); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      // Projeto novo: número sequencial automático
      base44.entities.Projeto.list()
        .then(lista => {
          const sequencias = (lista || [])
            .map(p => String(p.numero || '').match(/(\d+)\s*$/))
            .filter(Boolean)
            .map(m => parseInt(m[1], 10));
          const proximo = (sequencias.length ? Math.max(...sequencias) : 0) + 1;
          const numero = `${new Date().getFullYear()}-${String(proximo).padStart(3, '0')}`;
          setForm(f => (f.numero ? f : { ...f, numero }));
        })
        .catch(() => {});
      // Projeto novo: usa os textos de um laudo já pronto como exemplo
      base44.entities.Report.filter({ workflow_status: 'concluido' }, { sort: '-updated_date', limit: 1 })
        .then(res => {
          const exemplo = (res.items || res)[0];
          if (!exemplo) return;
          setForm(f => ({
            ...f,
            normas: f.normas || exemplo.normas || '',
            objetivo: f.objetivo || exemplo.objetivo || '',
            metodologia: f.metodologia || exemplo.metodologia || '',
            limitacoes: f.limitacoes || exemplo.limitacoes || '',
            recomendacoes: f.recomendacoes || exemplo.recomendacoes || '',
          }));
        })
        .catch(() => {});
    }
  }, [id, isNew]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleArtUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { alert('Selecione um arquivo PDF.'); return; }
    setUploadingArt(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('art_documento_url', file_url);
      setExtractingArt(true);
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: "Analise este documento de ART (Anotação de Responsabilidade Técnica) do CREA e extraia o número da ART. O número geralmente aparece próximo a campos como 'Número da ART', 'ART', 'Nº' ou 'ou serviço', e costuma ter formato numérico com hífen (ex: 10647381-0). Pode haver prefixos como ano (ex: '25 2026 10647381-0') — retorne apenas o número principal com o hífen, sem o ano. Retorne apenas o número encontrado, sem texto adicional.",
          file_urls: [file_url],
          response_json_schema: { type: "object", properties: { numero_art: { type: "string" } } },
        });
        const numero = (res?.numero_art || '').trim();
        if (numero) set('numero_art', numero);
      } catch (err) {
        // Extração falhou — usuário digita manualmente
      }
      setExtractingArt(false);
    } catch (err) {
      alert('Erro ao enviar ART: ' + err.message);
    }
    setUploadingArt(false);
  };

  const handleSave = async () => {
    if (!form.numero) { alert('Informe o número do projeto.'); return; }
    setSaving(true);
    const engenheiro = [...users, ...engineers].find(u => u.id === form.engenheiro_id);
    const payload = {
      ...form,
      cliente: clients.find(c => c.id === form.cliente_id)?.razao_social || form.cliente || '',
      engenheiro_responsavel: engenheiro ? (engenheiro.full_name || engenheiro.nome || engenheiro.email || '') : (form.engenheiro_responsavel || ''),
    };
    try {
      if (isNew) {
        const created = await base44.entities.Projeto.create(payload);
        navigate(`/projects/${created.id}`);
      } else {
        await base44.entities.Projeto.update(id, payload);
        navigate(`/projects/${id}`);
      }
    } catch (err) {
      alert('Erro ao salvar projeto: ' + err.message);
    }
    setSaving(false);
  };

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">{isNew ? 'Novo Projeto' : 'Editar Projeto'}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Número do Projeto *</Label><Input value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="Ex: 2026-001" /></div>
          <div><Label>Cliente</Label>
            <Select value={form.cliente_id || 'none'} onValueChange={v => set('cliente_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Empresa Emissora</Label><Input value={form.empresa_emissora || ''} onChange={e => set('empresa_emissora', e.target.value)} /></div>
          <div><Label>Status</Label>
            <Select value={form.status || 'Em Andamento'} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                <SelectItem value="Concluído">Concluído</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Data de Início</Label><Input type="date" value={form.data_inicio || ''} onChange={e => set('data_inicio', e.target.value)} /></div>
          <div><Label>Data de Conclusão</Label><Input type="date" value={form.data_conclusao || ''} onChange={e => set('data_conclusao', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Responsáveis e Instrumento</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Engenheiro Responsável</Label>
            <Select value={form.engenheiro_id || 'none'} onValueChange={v => set('engenheiro_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                {engineers.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Responsável pela Medição</Label>
            <Select value={form.eletricista_id || 'none'} onValueChange={v => set('eletricista_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                {electricians.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Instrumento</Label>
            <Select value={form.instrumento_id || 'none'} onValueChange={v => set('instrumento_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {instruments.map(i => <SelectItem key={i.id} value={i.id}>{i.marca_modelo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Limite de Referência (Ohms)</Label><Input type="number" step="0.01" value={form.limite_ohms || 10} onChange={e => set('limite_ohms', parseFloat(e.target.value))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>ART e Textos Técnicos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Número da ART</Label><Input value={form.numero_art || ''} onChange={e => set('numero_art', e.target.value)} /></div>
          <div>
            <Label>Documento da ART (PDF)</Label>
            {form.art_documento_url ? (
              <div className="flex items-center gap-2 mt-1">
                <a href={form.art_documento_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline flex-1 truncate">
                  <FileText className="h-4 w-4 shrink-0" /> {form.art_documento_url.split('/').pop()}
                </a>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3">
                    <Upload className="h-4 w-4" /> Substituir
                  </span>
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleArtUpload} />
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={() => set('art_documento_url', '')}>Remover</Button>
              </div>
            ) : (
              <label className="cursor-pointer block mt-1">
                <div className="flex items-center justify-center gap-2 border-2 border-dashed border-input rounded-md h-16 hover:bg-accent/50 transition-colors">
                  {uploadingArt ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm text-muted-foreground">Enviando...</span></>
                  ) : extractingArt ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm text-muted-foreground">Lendo número da ART...</span></>
                  ) : (
                    <><Upload className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Clique para anexar o PDF da ART</span></>
                  )}
                </div>
                <input type="file" accept="application/pdf" className="hidden" disabled={uploadingArt} onChange={handleArtUpload} />
              </label>
            )}
          </div>
          <div><Label>Normas e Referências</Label><Textarea value={form.normas || ''} onChange={e => set('normas', e.target.value)} rows={2} placeholder="Deixe em branco para usar as normas padrão do laudo" /></div>
          <div><Label>Objetivo</Label><Textarea value={form.objetivo || ''} onChange={e => set('objetivo', e.target.value)} rows={3} placeholder="Deixe em branco para usar o texto padrão do laudo" /></div>
          <div><Label>Metodologia</Label><Textarea value={form.metodologia || ''} onChange={e => set('metodologia', e.target.value)} rows={3} placeholder="Deixe em branco para usar o texto padrão do laudo" /></div>
          <div><Label>Limitações do Ensaio</Label><Textarea value={form.limitacoes || ''} onChange={e => set('limitacoes', e.target.value)} rows={2} placeholder="Deixe em branco para preencher em cada laudo" /></div>
          <div><Label>Recomendações Finais</Label><Textarea value={form.recomendacoes || ''} onChange={e => set('recomendacoes', e.target.value)} rows={3} placeholder="Deixe em branco para usar o texto padrão do laudo" /></div>
          <div><Label>Observações</Label><Textarea value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} rows={2} /></div>
        </CardContent>
      </Card>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar Projeto'}
        </Button>
        <Button variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
      </div>
    </div>
  );
}