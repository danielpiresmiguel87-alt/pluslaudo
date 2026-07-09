import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, CheckCircle, XCircle } from 'lucide-react';

export default function Home() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.Report.list('-created_date').then(res => { setReports(res); setLoading(false); });
  }, []);

  const aprovados = reports.filter(r => r.status === 'aprovado').length;
  const reprovados = reports.filter(r => r.status === 'reprovado').length;

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

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : reports.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Nenhum laudo cadastrado. Clique em "Novo Laudo" para começar.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {reports.map(r => (
            <Card key={r.id} className="cursor-pointer hover:shadow-md transition" onClick={() => navigate(`/reports/${r.id}`)}>
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.equipamento || 'Sem equipamento'}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.local}{r.data ? ` - ${new Date(r.data).toLocaleDateString('pt-BR')}` : ''}
                  </p>
                </div>
                <Badge variant={r.status === 'aprovado' ? 'default' : r.status === 'reprovado' ? 'destructive' : 'secondary'}>
                  {r.status === 'aprovado' ? 'Aprovado' : r.status === 'reprovado' ? 'Reprovado' : 'Rascunho'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}