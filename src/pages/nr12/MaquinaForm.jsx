import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Camera, Settings2, Zap, Users, Shield, ListChecks, AlertTriangle, FileText, Save, Trash2, Loader2 } from 'lucide-react';
import FotoUpload from '@/components/nr12/FotoUpload';
import EnergyGrid from '@/components/nr12/EnergyGrid';
import RiscosSection from '@/components/nr12/RiscosSection';

const AUTOMACAO = ['AUTOMÁTICO', 'MANUAL', 'SEMI-AUTOMÁTICO'];
const LIMITES = [
  { key: 'limite_transporte', label: 'Transporte' },
  { key: 'limite_montagem', label: 'Montagem' },
  { key: 'limite_instalacao', label: 'Instalação' },
  { key: 'limite_producao', label: 'Produção' },
  { key: 'limite_manutencao', label: 'Manutenção' },
  { key: 'limite_desmontagem', label: 'Desmontagem' },
  { key: 'limite_sucateamento', label: 'Sucateamento' },
  { key: 'limite_higienizacao', label: 'Higienização' },
];
const CHECKLISTS = ['CHECKLIST NR10', 'CHECKLIST NR12', 'CHECKLIST DIAGNÓSTICO', 'CHECKLIST DINÂMICA NR-12', 'CHECKLIST DINÂMICA NR-17'];

const EMPTY = {
  id_gautica: '', cliente: '', empresa_emissora: 'PISON ENGENHARIA', setor: '',
  numero_projeto: '', ultima_revisao: '', tipo_equipamento: '', capacidade: '', peso: '',
  fabricante: '', grupo: '', numero_serie: '', numero_patrimonio_tag: '',
  ano_fabricacao: null, data_fabricacao: '', ano_fabricacao_desconhecido: false,
  abastecimento: '', processo: '', descarga: '',
  energia_eletrica: false, energia_eletrica_tensao: '',
  energia_pneumatica: false, energia_pneumatica_pressao: '',
  energia_mecanica: false, energia_mecanica_forca: '',
  energia_hidraulica: false, energia_hidraulica_pressao: '',
  energia_radioativa: false, energia_radioativa_radiacao: '',
  energia_quimica: false, energia_quimica_volume: '',
  energia_termica: false, energia_termica_valor: '',
  principais_sistemas_dispositivos: '', utilizacao_equipamento: '',
  manutencao_mecanica: '', habilidades_manutencao_mecanica: '',
  manutencao_eletrica: '', habilidades_manutencao_eletrica: '',
  operadores: '', habilidades_operadores: '', pessoas_acompanharam: '',
  limite_transporte: false, limite_montagem: false, limite_instalacao: false,
  limite_producao: false, limite_manutencao: false, limite_desmontagem: false,
  limite_sucateamento: false, limite_higienizacao: false,
  conclusao_analise: '', status: 'Ativo',
  foto_geral: '', foto_frontal: '', foto_esquerda: '', foto_direita: '', foto_traseira: '', foto_placa: '',
};

const SectionTitle = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-2 mb-3"><Icon className="h-5 w-5 text-primary" /><h2 className="font-semibold">{children}</h2></div>
);

export default function MaquinaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [riscos, setRiscos] = useState([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      base44.entities.Maquina.get(id),
      base44.entities.Risco.filter({ maquina_id: id }),
    ]).then(([m, r]) => {
      setForm({ ...EMPTY, ...m });
      setRiscos(r || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const upd = (k, v) => setForm({ ...form, [k]: v });

  const handleSave = async () => {
    if (!form.cliente) { alert('Cliente é obrigatório'); return; }
    setSaving(true);
    try {
      const data = { ...form, ultima_revisao: new Date().toISOString().split('T')[0] };
      let maquinaId = id;
      if (id) {
        await base44.entities.Maquina.update(id, data);
      } else {
        const created = await base44.entities.Maquina.create(data);
        maquinaId = created.id;
      }
      // Sync riscos: delete all existing, create fresh
      if (id) {
        await base44.entities.Risco.deleteMany({ maquina_id: id });
      }
      if (riscos.length > 0) {
        await base44.entities.Risco.bulkCreate(
          riscos.map(r => {
            const { id: _rId, maquina_id: _mId, ...rest } = r;
            return { ...rest, maquina_id: maquinaId };
          })
        );
      }
      navigate('/nr12/maquinas');
    } catch (err) {
      alert('Erro ao salvar: ' + (err?.response?.data?.error || err?.data?.error || err.message));
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!id || !confirm('Marcar esta máquina como excluída?')) return;
    setSaving(true);
    try {
      await base44.entities.Maquina.update(id, { status: 'Excluído' });
      navigate('/nr12/maquinas');
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
    setSaving(false);
  };

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;
  const anoDisabled = form.ano_fabricacao_desconhecido;

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{id ? 'Editar Máquina' : 'Nova Máquina'}</h1>
        <Button variant="outline" onClick={() => navigate('/nr12/maquinas')}>Cancelar</Button>
      </div>

      {/* Seção 1 — Fotos */}
      <Card><CardContent className="pt-6">
        <SectionTitle icon={Camera}>Fotos</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <FotoUpload label="Geral" value={form.foto_geral} onChange={v => upd('foto_geral', v)} />
          <FotoUpload label="Frontal" value={form.foto_frontal} onChange={v => upd('foto_frontal', v)} />
          <FotoUpload label="Esquerda" value={form.foto_esquerda} onChange={v => upd('foto_esquerda', v)} />
          <FotoUpload label="Direita" value={form.foto_direita} onChange={v => upd('foto_direita', v)} />
          <FotoUpload label="Traseira" value={form.foto_traseira} onChange={v => upd('foto_traseira', v)} />
          <FotoUpload label="Placa" value={form.foto_placa} onChange={v => upd('foto_placa', v)} />
        </div>
      </CardContent></Card>

      {/* Seção 2 — Dados Gerais */}
      <Card><CardContent className="pt-6">
        <SectionTitle icon={Settings2}>Dados Gerais</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label className="text-xs">Tipo de Equipamento</Label><Input value={form.tipo_equipamento || ''} onChange={e => upd('tipo_equipamento', e.target.value)} /></div>
          <div><Label className="text-xs">Capacidade</Label><Input value={form.capacidade || ''} onChange={e => upd('capacidade', e.target.value)} /></div>
          <div><Label className="text-xs">Peso</Label><Input value={form.peso || ''} onChange={e => upd('peso', e.target.value)} /></div>
          <div><Label className="text-xs">Fabricante</Label><Input value={form.fabricante || ''} onChange={e => upd('fabricante', e.target.value)} /></div>
          <div><Label className="text-xs">Grupo</Label><Input value={form.grupo || ''} onChange={e => upd('grupo', e.target.value)} /></div>
          <div><Label className="text-xs">Número de Série</Label><Input value={form.numero_serie || ''} onChange={e => upd('numero_serie', e.target.value)} /></div>
          <div><Label className="text-xs">Patrimônio/Tag</Label><Input value={form.numero_patrimonio_tag || ''} onChange={e => upd('numero_patrimonio_tag', e.target.value)} /></div>
          <div><Label className="text-xs">Setor</Label><Input value={form.setor || ''} onChange={e => upd('setor', e.target.value)} /></div>
          <div><Label className="text-xs">Cliente</Label><Input value={form.cliente || ''} onChange={e => upd('cliente', e.target.value)} /></div>
          <div>
            <Label className="text-xs">Ano Fabricação</Label>
            <Input type="number" value={form.ano_fabricacao ?? ''} disabled={anoDisabled} onChange={e => upd('ano_fabricacao', e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div>
            <Label className="text-xs">Data Fabricação</Label>
            <Input type="date" value={form.data_fabricacao || ''} disabled={anoDisabled} onChange={e => upd('data_fabricacao', e.target.value)} />
          </div>
          <div className="flex items-end gap-2 pb-2">
            <Checkbox id="ano_desc" checked={form.ano_fabricacao_desconhecido || false} onCheckedChange={v => upd('ano_fabricacao_desconhecido', !!v)} />
            <Label htmlFor="ano_desc" className="text-xs cursor-pointer">Ano Fabricação Desconhecido</Label>
          </div>
        </div>
      </CardContent></Card>

      {/* Seção 3 — Nível de Automação */}
      <Card><CardContent className="pt-6">
        <SectionTitle icon={Settings2}>Nível de Automação</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['abastecimento', 'processo', 'descarga'].map(field => (
            <div key={field} className="rounded-lg border p-3">
              <p className="text-sm font-medium mb-2 capitalize">{field}</p>
              <RadioGroup value={form[field] || ''} onValueChange={v => upd(field, v)}>
                <div className="flex flex-col gap-2">
                  {AUTOMACAO.map(opt => (
                    <div key={opt} className="flex items-center gap-2">
                      <RadioGroupItem value={opt} id={`${field}-${opt}`} />
                      <Label htmlFor={`${field}-${opt}`} className="text-xs cursor-pointer">{opt}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          ))}
        </div>
      </CardContent></Card>

      {/* Seção 4 — Fontes de Energia */}
      <Card><CardContent className="pt-6">
        <SectionTitle icon={Zap}>Fontes de Energia</SectionTitle>
        <EnergyGrid form={form} setForm={setForm} />
      </CardContent></Card>

      {/* Seção 5 — Equipes e Uso */}
      <Card><CardContent className="pt-6">
        <SectionTitle icon={Users}>Equipes e Uso</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ['principais_sistemas_dispositivos', 'Principais Sistemas e Dispositivos'],
            ['utilizacao_equipamento', 'Utilização do Equipamento'],
            ['manutencao_mecanica', 'Manutenção Mecânica'],
            ['habilidades_manutencao_mecanica', 'Habilidades Manutenção Mecânica'],
            ['manutencao_eletrica', 'Manutenção Elétrica'],
            ['habilidades_manutencao_eletrica', 'Habilidades Manutenção Elétrica'],
            ['operadores', 'Operadores'],
            ['habilidades_operadores', 'Habilidades Operadores'],
            ['pessoas_acompanharam', 'Pessoas que Acompanharam'],
          ].map(([k, label]) => (
            <div key={k}><Label className="text-xs">{label}</Label><Textarea rows={3} value={form[k] || ''} onChange={e => upd(k, e.target.value)} /></div>
          ))}
        </div>
      </CardContent></Card>

      {/* Seção 6 — Limites */}
      <Card><CardContent className="pt-6">
        <SectionTitle icon={Shield}>Limites da Análise de Riscos</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {LIMITES.map(l => (
            <div key={l.key} className="flex items-center gap-2 rounded-lg border p-3">
              <Checkbox id={l.key} checked={form[l.key] || false} onCheckedChange={v => upd(l.key, !!v)} />
              <Label htmlFor={l.key} className="text-sm cursor-pointer">{l.label}</Label>
            </div>
          ))}
        </div>
      </CardContent></Card>

      {/* Seção 7 — Checklists */}
      <Card><CardContent className="pt-6">
        <SectionTitle icon={ListChecks}>Checklists</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {CHECKLISTS.map(c => (
            <div key={c} className="rounded-lg border p-4 text-center">
              <p className="text-xs font-medium text-muted-foreground mb-1">{c}</p>
              <p className="text-3xl font-bold">0</p>
            </div>
          ))}
        </div>
      </CardContent></Card>

      {/* Seção 8 — Riscos */}
      <Card><CardContent className="pt-6">
        <SectionTitle icon={AlertTriangle}>Riscos e Perigos</SectionTitle>
        <RiscosSection riscos={riscos} onChange={setRiscos} />
      </CardContent></Card>

      {/* Seção 9 — Conclusão */}
      <Card><CardContent className="pt-6">
        <SectionTitle icon={FileText}>Conclusão</SectionTitle>
        <Textarea rows={4} value={form.conclusao_analise || ''} onChange={e => upd('conclusao_analise', e.target.value)} placeholder="Conclusão da Análise" />
      </CardContent></Card>

      {/* Rodapé fixo */}
      <div className="fixed bottom-0 left-0 right-0 lg:pl-64 bg-background border-t p-4 flex items-center justify-end gap-2 z-40">
        {id && (
          <Button variant="destructive" onClick={handleDelete} disabled={saving}>
            <Trash2 className="h-4 w-4 mr-2" /> Excluir
          </Button>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}