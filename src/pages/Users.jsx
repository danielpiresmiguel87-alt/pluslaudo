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

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.User.list();
      setUsers(res);
    } catch (e) {
      alert('Erro ao carregar usuários: ' + e.message);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Convidar Usuário
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum usuário cadastrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map(u => (
            <Card key={u.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{u.full_name || u.email}</p>
                      <Badge variant={ROLE_VARIANTS[u.role] || 'outline'}>{ROLE_LABELS[u.role] || u.role}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    {u.cpf && <p className="text-xs text-muted-foreground">CPF: {u.cpf}</p>}
                    {u.crea_sc && <p className="text-xs text-muted-foreground">CREA-SC: {u.crea_sc}</p>}
                    {u.registro_profissional && <p className="text-xs text-muted-foreground">Registro: {u.registro_profissional}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(u)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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