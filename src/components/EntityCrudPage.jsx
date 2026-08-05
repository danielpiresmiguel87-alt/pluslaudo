import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, X, Search, Upload, FileText } from 'lucide-react';

export default function EntityCrudPage({ entityName, title, fields }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [lookingUp, setLookingUp] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);

  const handleFileUpload = async (field, file) => {
    if (!file) return;
    setUploadingField(field);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(s => ({ ...s, [field]: file_url }));
    } catch (e) {
      alert('Erro ao enviar arquivo: ' + e.message);
    }
    setUploadingField(null);
  };

  const handleImageUpload = async (field, file) => {
    if (!file) return;
    setUploadingField(field);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(s => ({ ...s, [field]: file_url }));
    } catch (e) {
      alert('Erro ao enviar imagem: ' + e.message);
    }
    setUploadingField(null);
  };

  const emptyForm = () => fields.reduce((acc, f) => ({ ...acc, [f.name]: '' }), {});

  useEffect(() => {
    setForm(emptyForm());
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await base44.entities[entityName].list();
    setItems(res);
    setLoading(false);
  };

  const save = async () => {
    if (editingId) await base44.entities[entityName].update(editingId, form);
    else await base44.entities[entityName].create(form);
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(false);
    load();
  };

  const edit = (item) => {
    setForm(fields.reduce((acc, f) => ({ ...acc, [f.name]: item[f.name] || '' }), {}));
    setEditingId(item.id);
    setShowForm(true);
  };

  const remove = async (id) => {
    await base44.entities[entityName].delete(id);
    load();
  };

  const handleCnpjLookup = async () => {
    const cnpj = (form.cnpj || '').replace(/\D/g, '');
    if (cnpj.length !== 14) { alert('CNPJ inválido. Deve conter 14 dígitos.'); return; }
    setLookingUp(true);
    try {
      const res = await base44.functions.invoke('consultarCnpj', { cnpj });
      if (res.data.error) { alert(res.data.error); }
      else { setForm(s => ({ ...s, ...res.data })); }
    } catch (e) { alert('Erro ao consultar CNPJ: ' + e.message); }
    setLookingUp(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Button onClick={() => { setForm(emptyForm()); setEditingId(null); setShowForm(!showForm); }}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? 'Fechar' : 'Adicionar'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.name} className={f.full ? 'md:col-span-2' : ''}>
                <Label>{f.label}</Label>
                {f.type === 'image' ? (
                  <div className="space-y-2">
                    {form[f.name] && (
                      <img src={form[f.name]} alt="Preview" className="h-20 object-contain rounded border" />
                    )}
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" disabled={uploadingField === f.name}
                        onClick={() => document.getElementById(`upload-${f.name}`).click()}>
                        <Upload className="h-4 w-4 mr-1" /> {uploadingField === f.name ? 'Enviando...' : 'Enviar Logo'}
                      </Button>
                      {form[f.name] && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setForm(s => ({ ...s, [f.name]: '' }))}>
                          Remover
                        </Button>
                      )}
                      <input id={`upload-${f.name}`} type="file" accept="image/*" className="hidden"
                        onChange={e => { const file = e.target.files?.[0]; if (file) handleImageUpload(f.name, file); e.target.value = ''; }} />
                    </div>
                  </div>
                ) : f.type === 'file' ? (
                  <div className="space-y-2">
                    {form[f.name] && (
                      <div className="flex items-center gap-2">
                        <a href={form[f.name]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline truncate flex-1">
                          <FileText className="h-4 w-4 shrink-0" /> Arquivo anexado
                        </a>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setForm(s => ({ ...s, [f.name]: '' }))}>
                          Remover
                        </Button>
                      </div>
                    )}
                    {!form[f.name] && (
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" disabled={uploadingField === f.name}
                          onClick={() => document.getElementById(`upload-${f.name}`).click()}>
                          <Upload className="h-4 w-4 mr-1" /> {uploadingField === f.name ? 'Enviando...' : 'Enviar Arquivo'}
                        </Button>
                        <input id={`upload-${f.name}`} type="file" accept="application/pdf" className="hidden"
                          onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(f.name, file); e.target.value = ''; }} />
                      </div>
                    )}
                  </div>
                ) : f.type === 'textarea' ? (
                  <Textarea value={form[f.name] || ''} onChange={e => setForm(s => ({ ...s, [f.name]: e.target.value }))} rows={3} />
                ) : f.lookup === 'cnpj' ? (
                  <div className="flex gap-2">
                    <Input type={f.type || 'text'} value={form[f.name] || ''} onChange={e => setForm(s => ({ ...s, [f.name]: e.target.value }))} className="flex-1" placeholder="00.000.000/0000-00" />
                    <Button type="button" variant="outline" size="sm" onClick={handleCnpjLookup} disabled={lookingUp}>
                      <Search className="h-4 w-4" /> {lookingUp ? '...' : 'Buscar'}
                    </Button>
                  </div>
                ) : (
                  <Input type={f.type || 'text'} value={form[f.name] || ''} onChange={e => setForm(s => ({ ...s, [f.name]: e.target.value }))} />
                )}
              </div>
            ))}
            <div className="md:col-span-2">
              <Button onClick={save}>{editingId ? 'Atualizar' : 'Salvar'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum registro cadastrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(item => (
            <Card key={item.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 min-w-0 flex-1">
                    {fields.filter(f => f.type !== 'image' && f.type !== 'file').map(f => (
                      <div key={f.name} className="text-sm break-words">
                        <span className="text-xs text-muted-foreground">{f.label}: </span>
                        <span className="font-medium">{item[f.name] || '-'}</span>
                      </div>
                    ))}
                    {fields.filter(f => f.type === 'file').map(f => (
                      <div key={f.name} className="text-sm">
                        <span className="text-xs text-muted-foreground">{f.label}: </span>
                        {item[f.name] ? (
                          <a href={item[f.name]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium align-middle">
                            <FileText className="h-3.5 w-3.5 shrink-0" /> Ver arquivo
                          </a>
                        ) : (
                          <span className="font-medium">-</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1 items-start">
                    {fields.filter(f => f.type === 'image').map(f => item[f.name] ? (
                      <img key={f.name} src={item[f.name]} alt="Logo" className="h-12 object-contain rounded" />
                    ) : null)}
                    <Button variant="ghost" size="icon" onClick={() => edit(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}