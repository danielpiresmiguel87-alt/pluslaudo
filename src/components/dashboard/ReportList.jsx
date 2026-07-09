import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, CheckCircle, ClipboardList, AlertTriangle, CalendarClock } from 'lucide-react';

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

export default function ReportList({ reports, clients, onNavigate }) {
  const clientMap = React.useMemo(() => {
    const m = {};
    clients.forEach(c => { m[c.id] = c; });
    return m;
  }, [clients]);

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
                  <p className="font-medium truncate">{r.equipamento || 'Sem equipamento'}</p>
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
                  <Badge
                    variant={r.status === 'aprovado' ? 'default' : r.status === 'reprovado' ? 'destructive' : 'secondary'}
                    className={r.status === 'aprovado' ? 'bg-green-600 hover:bg-green-600' : ''}
                  >
                    {r.status === 'aprovado' ? 'Aprovado' : r.status === 'reprovado' ? 'Reprovado' : 'Rascunho'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}