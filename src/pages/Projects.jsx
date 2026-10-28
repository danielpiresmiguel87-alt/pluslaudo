import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FolderKanban, ChevronRight } from 'lucide-react';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      base44.entities.Projeto.list('-created_date'),
      base44.entities.Report.list(),
    ]).then(([p, r]) => {
      setProjects(p);
      const c = {};
      r.forEach(rep => { if (rep.projeto_id) c[rep.projeto_id] = (c[rep.projeto_id] || 0) + 1; });
      setCounts(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Projetos</h1>
          <p className="text-sm text-muted-foreground">Agrupe vários laudos em um projeto com os dados comuns preenchidos automaticamente.</p>
        </div>
        <Button onClick={() => navigate('/projects/new')}>
          <Plus className="h-4 w-4 mr-2" /> Novo Projeto
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum projeto cadastrado. Crie o primeiro para agrupar seus laudos.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {projects.map(p => (
            <Card key={p.id} className="cursor-pointer hover:shadow-sm transition" onClick={() => navigate(`/projects/${p.id}`)}>
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FolderKanban className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{p.numero}{p.cliente ? ` — ${p.cliente}` : ''}</p>
                    <p className="text-xs text-muted-foreground">
                      {counts[p.id] || 0} laudo(s){p.engenheiro_responsavel ? ` · ${p.engenheiro_responsavel}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{p.status || 'Em Andamento'}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}