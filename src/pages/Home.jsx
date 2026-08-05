import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, AlertTriangle, CalendarClock, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SummaryCards from '@/components/dashboard/SummaryCards';
import ReportList from '@/components/dashboard/ReportList';

const DAY = 24 * 60 * 60 * 1000;

function getValidadeInfo(r) {
  if (!r.validade || r.status !== 'aprovado') return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const val = new Date(r.validade);
  val.setHours(0, 0, 0, 0);
  const diff = Math.round((val - today) / DAY);
  if (diff < 0) return { label: 'Vencido', days: diff, variant: 'destructive', color: 'text-red-600' };
  if (diff <= 30) return { label: `Vence em ${diff}d`, days: diff, variant: 'destructive', color: 'text-orange-600' };
  if (diff <= 60) return { label: `Vence em ${diff}d`, days: diff, variant: 'secondary', color: 'text-yellow-600' };
  return null;
}

export default function Home() {
  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [filterClient, setFilterClient] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWorkflow, setFilterWorkflow] = useState('all');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Report.list('-created_date'),
      base44.entities.Client.list(),
    ]).then(([r, c]) => {
      setReports(r);
      setClients(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const userRole = currentUser?.role;
  const canCreate = userRole === 'admin' || userRole === 'coordenador';
  const isEletricista = userRole === 'eletricista';
  const isEngenheiro = userRole === 'engenheiro';

  const visibleReports = useMemo(() => {
    return reports.filter(r => {
      if (!userRole) return false;
      if (userRole === 'admin' || userRole === 'coordenador') return true;
      if (userRole === 'eletricista') return r.workflow_status === 'pendente_medicao';
      if (userRole === 'engenheiro') return r.workflow_status === 'pendente_revisao' || r.workflow_status === 'concluido';
      return false;
    });
  }, [reports, userRole]);

  const filteredReports = useMemo(() => {
    return visibleReports.filter(r => {
      if (filterClient !== 'all' && r.cliente_id !== filterClient) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterWorkflow !== 'all' && (r.workflow_status || 'rascunho') !== filterWorkflow) return false;
      if (search) {
        const s = search.toLowerCase();
        const eq = (r.equipamento || '').toLowerCase();
        const loc = (r.local || '').toLowerCase();
        if (!eq.includes(s) && !loc.includes(s)) return false;
      }
      return true;
    });
  }, [visibleReports, filterClient, filterStatus, filterWorkflow, search]);

  const stats = useMemo(() => {
    const aprovados = visibleReports.filter(r => r.status === 'aprovado').length;
    const reprovados = visibleReports.filter(r => r.status === 'reprovado').length;
    const pendentes = visibleReports.filter(r => {
      const ws = r.workflow_status || 'rascunho';
      return ws === 'pendente_medicao' || ws === 'pendente_revisao';
    }).length;
    const vencendo = visibleReports.filter(r => {
      const v = getValidadeInfo(r);
      return v && v.days >= 0 && v.days <= 60;
    }).length;
    const vencidos = visibleReports.filter(r => {
      const v = getValidadeInfo(r);
      return v && v.days < 0;
    }).length;
    return { total: visibleReports.length, aprovados, reprovados, pendentes, vencendo, vencidos };
  }, [visibleReports]);

  const aVencer = useMemo(() => {
    return visibleReports
      .map(r => ({ r, v: getValidadeInfo(r) }))
      .filter(x => x.v && x.v.days <= 60)
      .sort((a, b) => a.v.days - b.v.days);
  }, [visibleReports]);

  const clientMap = useMemo(() => {
    const m = {};
    clients.forEach(c => { m[c.id] = c; });
    return m;
  }, [clients]);

  const pendentes = useMemo(() => {
    return visibleReports.filter(r => {
      const ws = r.workflow_status || 'rascunho';
      return ws === 'pendente_medicao' || ws === 'pendente_revisao';
    });
  }, [visibleReports]);

  const handleDeletePendente = async (id) => {
    if (!window.confirm('Excluir este laudo definitivamente?')) return;
    setDeletingId(id);
    try {
      await base44.entities.Report.delete(id);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      alert('Erro ao excluir laudo.');
    } finally {
      setDeletingId(null);
    }
  };

  const title = isEletricista ? 'Medições Pendentes' : isEngenheiro ? 'Laudos para Revisão' : 'Dashboard de Laudos';

  if (loading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        {canCreate && (
          <Button onClick={() => navigate('/reports/new')}>
            <Plus className="h-4 w-4 mr-2" /> Novo Laudo
          </Button>
        )}
      </div>

      <SummaryCards {...stats} onFilter={(f) => {
        setSearch('');
        setFilterClient('all');
        if (!f) { setFilterStatus('all'); setFilterWorkflow('all'); }
        else if (f === 'aprovado' || f === 'reprovado') { setFilterStatus(f); setFilterWorkflow('all'); }
        else if (f === 'pendente') { setFilterStatus('all'); setFilterWorkflow('pendente_medicao'); }
        else { setFilterStatus('all'); setFilterWorkflow('all'); }
      }} />

      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h2 className="font-semibold text-orange-800">Laudos a vencer / vencidos</h2>
            <Badge variant="destructive" className="ml-auto">{aVencer.length}</Badge>
          </div>
          {aVencer.length === 0 ? (
            <p className="text-sm text-orange-700">Nenhum laudo vencendo no momento.</p>
          ) : (
            <div className="space-y-2">
              {aVencer.map(({ r, v }) => (
                <div key={r.id} className="flex items-center justify-between bg-white rounded-lg border px-3 py-2 cursor-pointer hover:shadow-sm transition"
                  onClick={() => navigate(`/reports/${r.id}`)}>
                  <div className="flex items-center gap-3">
                    <CalendarClock className={`h-4 w-4 ${v.color}`} />
                    <div>
                      <p className="font-medium text-sm">{r.equipamento || 'Sem equipamento'}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.local}{r.validade ? ` - Val. ${new Date(r.validade).toLocaleDateString('pt-BR')}` : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant={v.variant} className={v.color}>{v.label}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canCreate && pendentes.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="h-5 w-5 text-amber-600" />
              <h2 className="font-semibold text-amber-800">Pendências de Workflow</h2>
              <Badge variant="secondary" className="ml-auto">{pendentes.length}</Badge>
            </div>
            <div className="space-y-2">
              {pendentes.map(r => {
                const ws = r.workflow_status || 'rascunho';
                const label = ws === 'pendente_medicao' ? 'Aguardando Medição' : 'Aguardando Revisão';
                return (
                  <div key={r.id} className="flex items-center justify-between bg-white rounded-lg border px-3 py-2 cursor-pointer hover:shadow-sm transition"
                    onClick={() => navigate(`/reports/${r.id}`)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{r.equipamento || 'Sem equipamento'}</p>
                        {r.tag_equipamento && (
                          <Badge variant="outline" className="text-xs font-mono">{r.tag_equipamento}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{r.local}</p>
                      {clientMap[r.cliente_id] && (
                        <p className="text-xs text-muted-foreground">Empresa: {clientMap[r.cliente_id].razao_social}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-amber-700 bg-amber-100">{label}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        disabled={deletingId === r.id}
                        onClick={(e) => { e.stopPropagation(); handleDeletePendente(r.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Todos os Laudos</h2>
          <span className="text-sm text-muted-foreground">{filteredReports.length} de {visibleReports.length}</span>
        </div>

        <Card className="mb-4">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Buscar</Label>
                <Input placeholder="Equipamento ou local..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Cliente</Label>
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger><SelectValue placeholder="Todos os clientes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="reprovado">Reprovado</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Workflow</Label>
                <Select value={filterWorkflow} onValueChange={setFilterWorkflow}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="pendente_medicao">Pendente Medição</SelectItem>
                    <SelectItem value="pendente_revisao">Pendente Revisão</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <ReportList reports={filteredReports} clients={clients} userRole={userRole} onNavigate={(id) => navigate(`/reports/${id}`)} onDeleted={(id) => setReports(prev => prev.filter(r => r.id !== id))} />
      </div>
    </div>
  );
}