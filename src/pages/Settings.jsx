import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Save } from 'lucide-react';

export default function Settings() {
  const [form, setForm] = useState({ logo_url: '', razao_social: '', cnpj: '', endereco: '', cidade: '', cep: '', bairro: '', fone: '', email: '' });
  const [companyId, setCompanyId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.Company.list().then(res => {
      if (res[0]) { setForm(res[0]); setCompanyId(res[0].id); }
    });
  }, []);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleLogo = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('logo_url', file_url);
    setUploading(false);
  };

  const save = async () => {
    setSaving(true);
    if (companyId) await base44.entities.Company.update(companyId, form);
    else { const created = await base44.entities.Company.create(form); setCompanyId(created.id); }
    setSaving(false);
  };

  if (user && user.role !== 'admin') {
    return <p className="text-muted-foreground">Acesso restrito a administradores.</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Configurações da Empresa</h1>

      <Card>
        <CardHeader><CardTitle>Logo</CardTitle></CardHeader>
        <CardContent>
          {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-20 object-contain mb-4" />}
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <span className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground h-9 px-4 rounded-md text-sm font-medium">
              {uploading ? 'Enviando...' : <><Upload className="h-4 w-4" /> Upload Logo</>}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleLogo(e.target.files[0])} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dados da Empresa</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Label>Razão Social</Label><Input value={form.razao_social || ''} onChange={e => set('razao_social', e.target.value)} /></div>
          <div><Label>CNPJ</Label><Input value={form.cnpj || ''} onChange={e => set('cnpj', e.target.value)} /></div>
          <div><Label>Fone</Label><Input value={form.fone || ''} onChange={e => set('fone', e.target.value)} /></div>
          <div><Label>Email</Label><Input value={form.email || ''} onChange={e => set('email', e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Endereço</Label><Input value={form.endereco || ''} onChange={e => set('endereco', e.target.value)} /></div>
          <div><Label>Cidade</Label><Input value={form.cidade || ''} onChange={e => set('cidade', e.target.value)} /></div>
          <div><Label>CEP</Label><Input value={form.cep || ''} onChange={e => set('cep', e.target.value)} /></div>
          <div><Label>Bairro</Label><Input value={form.bairro || ''} onChange={e => set('bairro', e.target.value)} /></div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Salvando...' : 'Salvar'}</Button>
    </div>
  );
}