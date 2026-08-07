import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { FileText, Clock, CheckCircle, ClipboardList, AlertTriangle, CalendarClock, Copy, Check, Loader2, Trash2 } from 'lucide-react';

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

export default function ReportList({ reports, clients, onNavigate, onDeleted, userRole }) {
  const clientMap = React.useMemo(() => {
    const m = {};
    clients.forEach(c => { m[c.id] = c; });
    return m;
  }, [clients]);

  const [copiedId, setCopiedId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const canCopyLink = userRole === 'admin' || userRole === 'coordenador' || userRole === 'engenheiro';
  const canDelete = userRole === 'admin' || userRole === 'coordenador';

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

  const handleCopyLink = async (e, reportId) => {
    e.stopPropagation();
    setLoadingId(reportId);
    try {
      const res = await base44.functions.invoke('enviarAssinatura', {
        report_id: reportId,
        app_url: window.location.origin,
        reopen: false,
      });
      const url = res.data?.signing_url;
      if (url) {
        await navigator.clipboard.writeText(url);
        setCopiedId(reportId);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      alert('Erro ao gerar link: ' + (err?.response?.data?.error || err?.data?.error || err.message));
    }
    setLoadingId(null);
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
                  <Badge variant="secondary" className="text-xs">
                    <WfIcon className="h-3 w-3 mr-1" />
                    {WORKFLOW_LABELS[ws]}
                  </Badge>
                  {(() => {
                    const isConcluido = ws === 'concluido';
                    return (
                      <Badge
                        variant={isConcluido ? 'default' : r.status === 'reprovado' ? 'destructive' : 'secondary'}
                        className={isConcluido ? 'bg-green-600 hover:bg-green-600' : ''}
                      >
                        {isConcluido ? 'Concluído' : r.status === 'aprovado' ? 'Aprovado' : r.status === 'reprovado' ? 'Reprovado' : 'Rascunho'}
                      </Badge>
                    );
                  })()}
                  {canCopyLink && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={(e) => handleCopyLink(e, r.id)}
                      disabled={loadingId === r.id}
                    >
                      {loadingId === r.id ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : copiedId === r.id ? (
                        <Check className="h-3 w-3 mr-1 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedId === r.id ? 'Copiado!' : 'Copiar Link'}
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