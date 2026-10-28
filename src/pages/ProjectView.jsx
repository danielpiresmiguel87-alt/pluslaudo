import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Pencil, FolderKanban, FileText, ChevronRight } from 'lucide-react';
import { WORKFLOW_LABELS } from '@/utils/workflow';

export default function ProjectView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [reports, setReports] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [electricians, setElectricians] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Projeto.get(id).then(setProject).catch(() => setProject(null));
    base44.entities.Report.filter({ projeto_id: id }, { sort: '-created_date' })
      .then(r => setReports(r.items || r))
      .catch(() => setReports([]));
    base44.entities.Instrument.list().then(setInstruments).catch(() => setInstruments([]));
    base44.entities.Electrician.list().then(setElectricians).catch(() => setElectricians([]));
    setLoading(false);
  }, [id]);

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!project) return <p className="text-muted-foreground">Projeto não encontrado.</p>;

  const instrumento = instruments.find(i => i.id === project.instrumento_id);
  const eletricista = electricians.find(e => e.id === project.eletricista_id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderKanban className="h-5 w-5" /> Projeto {project.numero}
            </h1>
            <p className="text-sm text-muted-foreground">{project.cliente || 'Sem cliente'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{project.status || 'Em Andamento'}</Badge>
          <Button variant="outline" onClick={() => navigate(`/projects/${id}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" /> Editar
          </Button>
          <Button onClick={() => navigate(`/reports/new?projeto=${id}`)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Laudo
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados Comuns</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <p><span className="font-medium text-muted-foreground">Cliente:</span> {project.cliente || '-'}</p>
          <p><span className="font-medium text-muted-foreground">Empresa emissora:</span> {project.empresa_emissora || '-'}</p>
          <p><span className="font-medium text-muted-foreground">Engenheiro responsável:</span> {project.engenheiro_responsavel || '-'}</p>
          <p><span className="font-medium text-muted-foreground">Responsável pela medição:</span> {eletricista?.nome || '-'}</p>
          <p><span className="font-medium text-muted-foreground">Instrumento:</span> {instrumento?.marca_modelo || '-'}</p>
          <p>
            <span className="font-medium text-muted-foreground">ART:</span>{' '}
            {project.numero_art || '-'}
            {project.art_documento_url && (
              <a href={project.art_documento_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> documento
              </a>
            )}
          </p>
          {project.observacoes && (
            <p className="md:col-span-2"><span className="font-medium text-muted-foreground">Observações:</span> {project.observacoes}</p>
          )}
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Laudos do projeto</h2>
          <span className="text-sm text-muted-foreground">{reports.length}</span>
        </div>
        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum laudo neste projeto ainda. Clique em "Novo Laudo" para começar.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {reports.map(r => (
              <Card key={r.id} className="cursor-pointer hover:shadow-sm transition" onClick={() => navigate(`/reports/${r.id}`)}>
                <CardContent className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{r.equipamento || 'Sem equipamento'}</p>
                      {r.tag_equipamento && <Badge variant="outline" className="text-xs font-mono">{r.tag_equipamento}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.local || '-'}{r.data ? ` · ${new Date(r.data).toLocaleDateString('pt-BR')}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={r.workflow_status === 'concluido' ? 'bg-green-600 text-white' : ''}>
                      {WORKFLOW_LABELS[r.workflow_status || 'rascunho'] || 'Rascunho'}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}