import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { FileText, Clock, CheckCircle, ClipboardList, AlertTriangle, CalendarClock, Loader2, Trash2, Copy } from 'lucide-react';

const DAY = 24 * 60 * 60 * 1000;

const WORKFLOW_LABELS = {
  rascunho: 'Rascunho',
  pendente_medicao: 'Pendente Medição',
  pendente_revisao: 'Pendente Revisão',
  concluido: 'Concluído',
};
const WORKFLOW_ICONS = {
  rascunho: FileText,
  pendente_medicao: ClipboardList,
  pendente_revisao: Clock,
  concluido: CheckCircle,
};

function getValidadeInfo(r) {
  if (!r.validade || r.status !== 'aprovado') return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const val = new Date(r.validade);
  val.setHours(0, 0, 0, 0);
  const diff = Math.round((val - today) / DAY);
  if (diff < 0) return { label: 'Vencido', days: diff, color: 'text-red-600' };
  if (diff <= 30) return { label: `Vence em ${diff}d`, days: diff, color: 'text-orange-600' };
  if (diff <= 60) return { label: `Vence em ${diff}d`, days: diff, color: 'text-yellow-600' };
  return null;
}

export default function ReportList({ reports, clients, onNavigate, onDeleted, onDuplicated, userRole }) {
  const clientMap = React.useMemo(() => {
    const m = {};
    clients.forEach(c => { m[c.id] = c; });
    return m;
  }, [clients]);

  const [deletingId, setDeletingId] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const canDelete = userRole === 'admin' || userRole === 'coordenador';

  // Cria um novo laudo em rascunho a partir de um existente:
  // copia dados de identificação e textos técnicos, mas não medições, fotos, ART nem assinaturas
  const handleDuplicate = async (e, report) => {
    e.stopPropagation();
    setDuplicatingId(report.id);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const copia = await base44.entities.Report.create({
        equipamento: report.equipamento,
        tag_equipamento: report.tag_equipamento,
        local: report.local,
        cliente_id: report.cliente_id,
        engenheiro_id: report.engenheiro_id,
        eletricista_id: report.eletricista_id,
        instrumento_id: report.instrumento_id,
        mostrar_data_calibracao: report.mostrar_data_calibracao,
        normas: report.normas,
        objetivo: report.objetivo,
        metodologia: report.metodologia,
        limitacoes: report.limitacoes,
        recomendacoes: report.recomendacoes,
        limite_ohms: report.limite_ohms,
        itens_verificados: report.itens_verificados,
        data: hoje,
        status: 'rascunho',
        workflow_status: 'rascunho',
        measurements: [],
      });
      if (onDuplicated) onDuplicated(copia.id);
    } catch (err) {
      alert('Erro ao duplicar laudo: ' + (err?.message || ''));
    }
    setDuplicatingId(null);
  };

  const handleDelete = async (e, reportId) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir este laudo? Esta ação não pode ser desfeita.')) return;
    setDeletingId(reportId);
    try {
      await base44.entities.Report.delete(reportId);
      if (onDeleted) onDeleted(reportId);
    } catch (err) {
      alert('Erro ao excluir laudo: ' + (err?.message || ''));
    }
    setDeletingId(null);
  };

  if (reports.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        Nenhum laudo encontrado com os filtros selecionados.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map(r => {
        const ws = r.workflow_status || 'rascunho';
        const WfIcon = WORKFLOW_ICONS[ws] || FileText;
        const v = getValidadeInfo(r);
        const client = clientMap[r.cliente_id];
        return (
          <Card key={r.id} className="cursor-pointer hover:shadow-md transition" onClick={() => onNavigate(r.id)}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{r.equipamento || 'Sem equipamento'}</p>
                    {r.tag_equipamento && (
                      <Badge variant="outline" className="text-xs font-mono shrink-0">
                        TAG: {r.tag_equipamento}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {r.local}{r.data ? ` - ${new Date(r.data).toLocaleDateString('pt-BR')}` : ''}
                  </p>
                  {client && (
                    <p className="text-xs text-muted-foreground mt-0.5">Cliente: {client.razao_social}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {v && (
                    <Badge variant={v.days < 0 ? 'destructive' : 'secondary'} className={v.color}>
                      {v.days < 0 ? <AlertTriangle className="h-3 w-3 mr-1" /> : <CalendarClock className="h-3 w-3 mr-1" />}
                      {v.label}
                    </Badge>
                  )}
                  <Badge
                    variant={ws === 'concluido' ? 'default' : 'secondary'}
                    className={`text-xs ${ws === 'concluido' ? 'bg-green-600 hover:bg-green-600' : ''}`}
                  >
                    <WfIcon className="h-3 w-3 mr-1" />
                    {WORKFLOW_LABELS[ws]}
                  </Badge>
                  <Badge
                    variant={r.status === 'aprovado' ? 'default' : r.status === 'reprovado' ? 'destructive' : 'secondary'}
                  >
                    {r.status === 'aprovado' ? 'Aprovado' : r.status === 'reprovado' ? 'Reprovado' : 'Rascunho'}
                  </Badge>
                  {canDelete && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={(e) => handleDuplicate(e, r)}
                      disabled={duplicatingId === r.id}
                      title="Criar um novo laudo a partir deste"
                    >
                      {duplicatingId === r.id ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Duplicar
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                      onClick={(e) => handleDelete(e, r.id)}
                      disabled={deletingId === r.id}
                    >
                      {deletingId === r.id ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3 mr-1" />
                      )}
                      Excluir
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}