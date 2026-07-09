import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, CheckCircle, XCircle, AlertTriangle, CalendarClock } from 'lucide-react';

const DAY = 24 * 60 * 60 * 1000;

function getValidadeInfo(r) {
  if (!r.validade || r.status !== 'aprovado') return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const val = new Date(r.validade);
  val.setHours(0, 0, 0, 0);
  const diff = Math.round((val - today) / DAY);
  if (diff < 0) return { label: 'Vencido', days: diff, variant: 'destructive', color: 'text-red-600', icon: AlertTriangle };
  if (diff <= 30) return { label: `Vence em ${diff}d`, days: diff, variant: 'destructive', color: 'text-orange-600', icon: CalendarClock };
  if (diff <= 60) return { label: `Vence em ${diff}d`, days: diff, variant: 'secondary', color: 'text-yellow-600', icon: CalendarClock };
  return null;
}

export default function Home() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.Report.list('-created_date').then(res => { setReports(res); setLoading(false); });
  }, []);

  const aprovados = reports.filter(r => r.status === 'aprovado').length;
  const reprovados = reports.filter(r => r.status === 'reprovado').length;

  const vencidos = reports.filter(r => { const v = getValidadeInfo(r); return v && v.days < 0; });
  const vencendo = reports.filter(r => { const v = getValidadeInfo(r); return v && v.days >= 0 && v.days <= 60; });
  const aVencer = [...vencidos, ...vencendo].sort((a, b) => getValidadeInfo(a).days - getValidadeInfo(b).days);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Laudos</h1>
        <Button onClick={() => navigate('/reports/new')}>
          <Plus className="h-4 w-4 mr-2" /> Novo Laudo
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-4 flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-500" />
          <div><p className="text-2xl font-bold">{reports.length}</p><p className="text-xs text-muted-foreground">Total</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-green-500" />
          <div><p className="text-2xl font-bold">{aprovados}</p><p className="text-xs text-muted-foreground">Aprovados</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 flex items-center gap-3">
          <XCircle className="h-8 w-8 text-red-500" />
          <div><p className="text-2xl font-bold">{reprovados}</p><p className="text-xs text-muted-foreground">Reprovados</p></div>
        </CardContent></Card>
      </div>

      {aVencer.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h2 className="font-semibold text-orange-800">Inspeções a vencer / vencidas</h2>
              <Badge variant="destructive" className="ml-auto">{aVencer.length}</Badge>
            </div>
            <div className="space-y-2">
              {aVencer.map(r => {
                const v = getValidadeInfo(r);
                const Icon = v.icon;
                return (
                  <div key={r.id} className="flex items-center justify-between bg-white rounded-lg border px-3 py-2 cursor-pointer hover:shadow-sm transition"
                    onClick={() => navigate(`/reports/${r.id}`)}>
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${v.color}`} />
                      <div>
                        <p className="font-medium text-sm">{r.equipamento || 'Sem equipamento'}</p>
                        <p className="text-xs text-muted-foreground">{r.local}{r.validade ? ` - Val. ${new Date(r.validade).toLocaleDateString('pt-BR')}` : ''}</p>
                      </div>
                    </div>
                    <Badge variant={v.variant}>{v.label}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : reports.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Nenhum laudo cadastrado. Clique em "Novo Laudo" para começar.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {reports.map(r => {
            const v = getValidadeInfo(r);
            return (
              <Card key={r.id} className="cursor-pointer hover:shadow-md transition" onClick={() => navigate(`/reports/${r.id}`)}>
                <CardContent className="pt-4 pb-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.equipamento || 'Sem equipamento'}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.local}{r.data ? ` - ${new Date(r.data).toLocaleDateString('pt-BR')}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {v && <Badge variant={v.variant} className={v.color}>{v.label}</Badge>}
                    <Badge variant={r.status === 'aprovado' ? 'default' : r.status === 'reprovado' ? 'destructive' : 'secondary'}>
                      {r.status === 'aprovado' ? 'Aprovado' : r.status === 'reprovado' ? 'Reprovado' : 'Rascunho'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}