import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, Trash2, Plus, X } from 'lucide-react';
import { capturarFoto } from '@/lib/offline';

const getFotoSrc = (foto) => {
  if (typeof foto === 'string') return foto;
  return foto.dataUrl || foto.url || '';
};

export default function MeasurementEditor({ measurements, limite, onChange }) {
  const [uploading, setUploading] = useState(null);

  const update = (index, field, value) => {
    const next = [...measurements];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const addMeasurement = () => {
    onChange([...measurements, { fotos: [], descricao: '', valor_medido: null }]);
  };

  const removeMeasurement = (index) => {
    onChange(measurements.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = async (index, files) => {
    setUploading(index);
    try {
      const novasFotos = [];
      for (const file of files) {
      const { dataUrl, file: compressedFile } = await capturarFoto(file);
        novasFotos.push({ dataUrl, _localFile: compressedFile });
      }
      const next = [...measurements];
      next[index] = { ...next[index], fotos: [...(next[index].fotos || []), ...novasFotos] };
      onChange(next);
    } catch (e) {
      alert('Erro ao processar imagem: ' + e.message);
    }
    setUploading(null);
  };

  const removePhoto = (mIndex, pIndex) => {
    const next = [...measurements];
    next[mIndex] = { ...next[mIndex], fotos: next[mIndex].fotos.filter((_, i) => i !== pIndex) };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {measurements.map((m, i) => {
        const approved = (m.valor_medido ?? Infinity) <= limite;
        return (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Medição {i + 1}</h4>
              <div className="flex items-center gap-2">
                {m.valor_medido != null && (
                  <Badge variant={approved ? 'default' : 'destructive'}>
                    {approved ? 'Aprovado' : 'Reprovado'}
                  </Badge>
                )}
                <Button variant="destructive" size="sm" onClick={() => removeMeasurement(i)}>
                  <Trash2 className="h-4 w-4" /> Remover
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {m.fotos?.map((foto, fi) => (
                <div key={fi} className="relative">
                  <img src={getFotoSrc(foto)} alt={`Foto ${fi + 1}`} className="h-20 w-20 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i, fi)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="h-20 w-20 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:bg-muted">
                {uploading === i ? (
                  <span className="text-xs text-muted-foreground">Enviando...</span>
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground" />
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={e => handlePhotoUpload(i, Array.from(e.target.files))}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Local / Descrição</label>
                <Textarea
                  value={m.descricao || ''}
                  onChange={e => update(i, 'descricao', e.target.value)}
                  rows={2}
                  placeholder="Ex: Painel elétrico"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Valor (Ω)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={m.valor_medido ?? ''}
                  onChange={e => update(i, 'valor_medido', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0,0"
                />
              </div>
            </div>
          </div>
        );
      })}
      <Button variant="outline" onClick={addMeasurement}>
        <Plus className="h-4 w-4 mr-2" /> Adicionar Medição
      </Button>
    </div>
  );
}