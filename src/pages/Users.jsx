import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { UserPlus, Pencil } from 'lucide-react';

const ROLE_LABELS = {
  admin: 'Administrador',
  coordenador: 'Coordenador',
  engenheiro: 'Engenheiro',
  eletricista: 'Responsável pela Medição',
  user: 'Usuário',
};

const ROLE_VARIANTS = {
  admin: 'default',
  coordenador: 'secondary',
  engenheiro: 'secondary',
  eletricista: 'secondary',
  user: 'outline',
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [engineers, setEngineers] = useState([]);
  const [electricians, setElectricians] = useState([]);
  const [showEngDialog, setShowEngDialog] = useState(false);
  const [engForm, setEngForm] = useState({ nome: '', cpf: '', crea_sc: '', email: '' });
  const [showRespDialog, setShowRespDialog] = useState(false);
  const [respForm, setRespForm] = useState({ nome: '', cpf: '', registro_profissional: '' });
  const [savingEng, setSavingEng] = useState(false);
  const [savingResp, setSavingResp] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [res, engs, elecs] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Engineer.list(),
        base44.entities.Electrician.list(),
      ]);
      setUsers(res);
      setEngineers(engs);
      setElectricians(elecs);
    } catch (e) {
      alert('Erro ao carregar: ' + e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      setInviteEmail('');
      setShowInvite(false);
      load();
    } catch (e) {
      alert('Erro ao convidar: ' + (e?.response?.data?.detail || e.message));
    }
    setInviting(false);
  };

  const startEdit = (u) => {
    setEditingUser(u);
    setEditForm({
      role: u.role || 'user',
      cpf: u.cpf || '',
      crea_sc: u.crea_sc || '',
      registro_profissional: u.registro_profissional || '',
    });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await base44.entities.User.update(editingUser.id, editForm);
      setEditingUser(null);
      load();
    } catch (e) {
      alert('Erro ao atualizar: ' + e.message);
    }
    setSaving(false);
  };

  const handleSaveEng = async () => {
    if (!engForm.nome) return;
    setSavingEng(true);
    try {
      await base44.entities.Engineer.create(engForm);
      setEngForm({ nome: '', cpf: '', crea_sc: '', email: '' });
      setShowEngDialog(false);
      load();
    } catch (e) { alert('Erro ao cadastrar: ' + e.message); }
    setSavingEng(false);
  };

  const handleSaveResp = async () => {
    if (!respForm.nome) return;
    setSavingResp(true);
    try {
      await base44.entities.Electrician.create(respForm);
      setRespForm({ nome: '', cpf: '', registro_profissional: '' });
      setShowRespDialog(false);
      load();
    } catch (e) { alert('Erro ao cadastrar: ' + e.message); }
    setSavingResp(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowEngDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Cadastrar Engenheiro
          </Button>
          <Button variant="outline" onClick={() => setShowRespDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Cadastrar Responsável
          </Button>
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Convidar Usuário
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum usuário cadastrado.</p>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Função</th>
                  <th className="px-4 py-3 font-medium">CPF</th>
                  <th className="px-4 py-3 font-medium">CREA-SC / Registro</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{u.full_name || u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3"><Badge variant={ROLE_VARIANTS[u.role] || 'outline'}>{ROLE_LABELS[u.role] || u.role}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{u.cpf || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.crea_sc || u.registro_profissional || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Engenheiros</h2>
        {engineers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum engenheiro cadastrado.</p>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">CPF</th>
                    <th className="px-4 py-3 font-medium">CREA-SC</th>
                    <th className="px-4 py-3 font-medium">E-mail</th>
                  </tr>
                </thead>
                <tbody>
                  {engineers.map(e => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{e.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.cpf || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.crea_sc || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.email || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Responsáveis pela Medição</h2>
        {electricians.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum responsável cadastrado.</p>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">CPF</th>
                    <th className="px-4 py-3 font-medium">Registro Profissional</th>
                  </tr>
                </thead>
                <tbody>
                  {electricians.map(e => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{e.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.cpf || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.registro_profissional || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showEngDialog} onOpenChange={setShowEngDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Engenheiro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nome *</Label><Input value={engForm.nome} onChange={e => setEngForm(s => ({ ...s, nome: e.target.value }))} /></div>
            <div><Label>CPF</Label><Input value={engForm.cpf} onChange={e => setEngForm(s => ({ ...s, cpf: e.target.value }))} /></div>
            <div><Label>CREA-SC</Label><Input value={engForm.crea_sc} onChange={e => setEngForm(s => ({ ...s, crea_sc: e.target.value }))} /></div>
            <div><Label>E-mail</Label><Input type="email" value={engForm.email} onChange={e => setEngForm(s => ({ ...s, email: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEngDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveEng} disabled={savingEng || !engForm.nome}>{savingEng ? 'Salvando...' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRespDialog} onOpenChange={setShowRespDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Responsável pela Medição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nome *</Label><Input value={respForm.nome} onChange={e => setRespForm(s => ({ ...s, nome: e.target.value }))} /></div>
            <div><Label>CPF</Label><Input value={respForm.cpf} onChange={e => setRespForm(s => ({ ...s, cpf: e.target.value }))} /></div>
            <div><Label>Registro Profissional</Label><Input value={respForm.registro_profissional} onChange={e => setRespForm(s => ({ ...s, registro_profissional: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRespDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveResp} disabled={savingResp || !respForm.nome}>{savingResp ? 'Salvando...' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Função</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
              {inviting ? 'Enviando...' : 'Convidar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingUser} onOpenChange={v => !v && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome</Label>
              <Input value={editingUser?.full_name || ''} disabled className="bg-muted" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={editingUser?.email || ''} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Função</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(s => ({ ...s, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>CPF</Label><Input value={editForm.cpf || ''} onChange={e => setEditForm(s => ({ ...s, cpf: e.target.value }))} /></div>
            <div><Label>CREA-SC</Label><Input value={editForm.crea_sc || ''} onChange={e => setEditForm(s => ({ ...s, crea_sc: e.target.value }))} /></div>
            <div><Label>Registro Profissional</Label><Input value={editForm.registro_profissional || ''} onChange={e => setEditForm(s => ({ ...s, registro_profissional: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}