import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertTriangle, FolderOpen, FileWarning, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [maquinas, setMaquinas] = useState([]);
  const [riscos, setRiscos] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Maquina.list(),
      base44.entities.Risco.list(),
      base44.entities.Projeto.list(),
    ]).then(([m, r, p]) => {
      setMaquinas(m);
      setRiscos(r);
      setProjetos(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const ativas = maquinas.filter(m => m.status !== 'Excluído');
    const semLaudo = ativas.filter(m => !m.ultima_revisao).length;
    const projetosAtivos = projetos.filter(p => p.status === 'Em Andamento').length;
    return { totalMaquinas: ativas.length, totalRiscos: riscos.length, projetosAtivos, semLaudo };
  }, [maquinas, riscos, projetos]);

  const chartData = useMemo(() => [
    { name: 'Ativo', total: maquinas.filter(m => m.status !== 'Excluído').length },
    { name: 'Excluído', total: maquinas.filter(m => m.status === 'Excluído').length },
  ], [maquinas]);

  const ultimosProjetos = useMemo(() => {
    return [...projetos].sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date)).slice(0, 5);
  }, [projetos]);

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;

  const cards = [
    { label: 'Total de Máquinas', value: stats.totalMaquinas, icon: ShieldCheck, color: 'text-blue-600' },
    { label: 'Total de Riscos', value: stats.totalRiscos, icon: AlertTriangle, color: 'text-orange-600' },
    { label: 'Projetos Ativos', value: stats.projetosAtivos, icon: FolderOpen, color: 'text-green-600' },
    { label: 'Máquinas sem Laudo', value: stats.semLaudo, icon: FileWarning, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Dashboard NR-12</h1>
          <p className="text-sm text-muted-foreground">Segurança em Máquinas e Equipamentos</p>
        </div>
        <Button onClick={() => navigate('/nr12/maquinas/new')}>
          <Plus className="h-4 w-4 mr-2" /> Nova Máquina
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Card key={i}>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className={`p-3 rounded-lg bg-muted/50 ${c.color}`}>
                <c.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold mb-4">Máquinas por Status</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold mb-4">Últimos Projetos Revisados</h2>
            {ultimosProjetos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum projeto encontrado.</p>
            ) : (
              <div className="space-y-2">
                {ultimosProjetos.map(p => (
                  <div key={p.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{p.numero}</p>
                      <p className="text-xs text-muted-foreground">{p.cliente}</p>
                    </div>
                    <Badge variant={p.status === 'Em Andamento' ? 'secondary' : p.status === 'Concluído' ? 'default' : 'destructive'}>
                      {p.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}