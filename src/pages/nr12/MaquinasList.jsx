import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, Pencil } from 'lucide-react';
import HrnBadge, { HRN_RANK } from '@/components/nr12/HrnBadge';

export default function MaquinasList() {
  const navigate = useNavigate();
  const [maquinas, setMaquinas] = useState([]);
  const [riscos, setRiscos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    cliente: '', empresa: 'all', setor: '', tag: '', status: 'all', dataDe: '', dataAte: ''
  });

  useEffect(() => {
    Promise.all([
      base44.entities.Maquina.list('-updated_date'),
      base44.entities.Risco.list(),
    ]).then(([m, r]) => {
      setMaquinas(m);
      setRiscos(r);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const riscosPorMaquina = useMemo(() => {
    const map = {};
    riscos.forEach(r => {
      if (!map[r.maquina_id]) map[r.maquina_id] = [];
      map[r.maquina_id].push(r);
    });
    return map;
  }, [riscos]);

  const empresas = useMemo(() => {
    return [...new Set(maquinas.map(m => m.empresa_emissora).filter(Boolean))];
  }, [maquinas]);

  const filtered = useMemo(() => {
    return maquinas.filter(m => {
      if (filters.cliente && !(m.cliente || '').toLowerCase().includes(filters.cliente.toLowerCase())) return false;
      if (filters.empresa !== 'all' && m.empresa_emissora !== filters.empresa) return false;
      if (filters.setor && !(m.setor || '').toLowerCase().includes(filters.setor.toLowerCase())) return false;
      if (filters.tag && !(m.numero_patrimonio_tag || '').toLowerCase().includes(filters.tag.toLowerCase())) return false;
      if (filters.status !== 'all' && (m.status || 'Ativo') !== filters.status) return false;
      if (filters.dataDe && m.ultima_revisao && new Date(m.ultima_revisao) < new Date(filters.dataDe)) return false;
      if (filters.dataAte && m.ultima_revisao && new Date(m.ultima_revisao) > new Date(filters.dataAte)) return false;
      return true;
    });
  }, [maquinas, filters]);

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Consulta de Máquinas</h1>
        <Button onClick={() => navigate('/nr12/maquinas/new')}>
          <Plus className="h-4 w-4 mr-2" /> Nova Máquina
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
            <div><Label className="text-xs mb-1 block">Cliente</Label><Input value={filters.cliente} onChange={e => setFilters({ ...filters, cliente: e.target.value })} /></div>
            <div>
              <Label className="text-xs mb-1 block">Empresa Emissora</Label>
              <Select value={filters.empresa} onValueChange={v => setFilters({ ...filters, empresa: v })}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {empresas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs mb-1 block">Setor</Label><Input value={filters.setor} onChange={e => setFilters({ ...filters, setor: e.target.value })} /></div>
            <div><Label className="text-xs mb-1 block">Patrimônio/Tag</Label><Input value={filters.tag} onChange={e => setFilters({ ...filters, tag: e.target.value })} /></div>
            <div>
              <Label className="text-xs mb-1 block">Status</Label>
              <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Excluído">Excluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs mb-1 block">De</Label><Input type="date" value={filters.dataDe} onChange={e => setFilters({ ...filters, dataDe: e.target.value })} /></div>
            <div><Label className="text-xs mb-1 block">Até</Label><Input type="date" value={filters.dataAte} onChange={e => setFilters({ ...filters, dataAte: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-3 px-3">ID</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Empresa</th>
                  <th className="py-3 px-3">Setor</th>
                  <th className="py-3 px-3">N° Projeto</th>
                  <th className="py-3 px-3">Última Revisão</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Riscos</th>
                  <th className="py-3 px-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma máquina encontrada.</td></tr>
                ) : filtered.map(m => {
                  const rs = riscosPorMaquina[m.id] || [];
                  const maior = [...rs].sort((a, b) => (HRN_RANK[b.hrn_classificacao] || 0) - (HRN_RANK[a.hrn_classificacao] || 0))[0];
                  return (
                    <tr key={m.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3 text-xs text-muted-foreground">{m.id_gautica || m.id.slice(-6)}</td>
                      <td className="py-2 px-3 font-medium">{m.cliente}</td>
                      <td className="py-2 px-3 text-muted-foreground">{m.empresa_emissora}</td>
                      <td className="py-2 px-3">{m.setor}</td>
                      <td className="py-2 px-3">{m.numero_projeto}</td>
                      <td className="py-2 px-3">{m.ultima_revisao ? new Date(m.ultima_revisao).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="py-2 px-3">
                        <Badge variant={m.status === 'Excluído' ? 'destructive' : 'default'} className={m.status !== 'Excluído' ? 'bg-green-600 hover:bg-green-600' : ''}>
                          {m.status || 'Ativo'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        {rs.length > 0 ? <HrnBadge valor={maior?.hrn_valor} classificacao={maior?.hrn_classificacao} /> : <span className="text-xs text-muted-foreground">0</span>}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/nr12/maquinas/${m.id}/edit`)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/nr12/maquinas/${m.id}/edit`)}><Pencil className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}