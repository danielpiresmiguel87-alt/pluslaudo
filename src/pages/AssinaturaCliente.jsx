import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SignaturePad from '@/components/report/SignaturePad';
import { CheckCircle, PenLine, AlertCircle, ShieldCheck, FileCheck } from 'lucide-react';

export default function AssinaturaCliente() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const sigRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('assinarLaudo', { token, action: 'get' });
        setData(res.data);
      } catch (e) {
        const msg = e?.response?.data?.error || e?.data?.error || e.message || 'Erro ao carregar laudo';
        setError(msg);
      }
      setLoading(false);
    })();
  }, [token]);

  const handleSign = async () => {
    const sigDataUrl = sigRef.current?.toDataURL();
    if (!sigDataUrl) {
      alert('Desenhe sua assinatura antes de confirmar.');
      return;
    }
    setSigning(true);
    try {
      await base44.functions.invoke('assinarLaudo', { token, action: 'sign', signature_data_url: sigDataUrl });
      setSigned(true);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.data?.error || e.message || 'Erro ao salvar assinatura';
      alert(msg);
    }
    setSigning(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Link indisponível</h2>
            <p className="text-muted-foreground text-sm">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileCheck className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Assinatura Registrada!</h2>
            <p className="text-muted-foreground text-sm">Sua assinatura foi registrada com sucesso no laudo técnico. Este link não está mais disponível.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { report, client, company, engineer } = data;
  const lim = report.limite_ohms || 10;
  const measurements = report.measurements || [];
  const allApproved = measurements.length > 0 && measurements.every(m => (m.valor_medido ?? Infinity) <= lim);
  const statusLabel = measurements.length === 0 ? 'Rascunho' : allApproved ? 'Aprovado' : 'Reprovado';

  const InfoRow = ({ label, value }) => (
    <div className="flex gap-2 text-sm py-1">
      <span className="font-medium text-muted-foreground min-w-[120px]">{label}:</span>
      <span>{value || '-'}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-3">
            <ShieldCheck className="h-4 w-4" />
            Assinatura Digital Segura
          </div>
          <h1 className="text-2xl font-bold">Laudo Técnico de Aterramento</h1>
          <p className="text-muted-foreground text-sm mt-1">Revise os dados abaixo e assine para confirmar</p>
        </div>

        {/* Identificação */}
        <Card>
          <CardHeader><CardTitle>Identificação do Laudo</CardTitle></CardHeader>
          <CardContent>
            <InfoRow label="Equipamento" value={report.equipamento} />
            <InfoRow label="Tag" value={report.tag_equipamento} />
            <InfoRow label="Local" value={report.local} />
            <InfoRow label="Data" value={report.data ? new Date(report.data).toLocaleDateString('pt-BR') : '-'} />
            <div className="flex items-center gap-2 mt-3">
              <span className="font-medium text-muted-foreground text-sm">Status:</span>
              <Badge variant={allApproved ? 'default' : measurements.length === 0 ? 'secondary' : 'destructive'}
                className={allApproved ? 'bg-green-600 hover:bg-green-600' : ''}>
                {statusLabel}
              </Badge>
              <span className="text-sm text-muted-foreground">Limite: {lim} Ω</span>
            </div>
          </CardContent>
        </Card>

        {/* Empresa e Cliente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Empresa Responsável</CardTitle></CardHeader>
            <CardContent>
              <InfoRow label="Razão Social" value={company?.razao_social} />
              <InfoRow label="CNPJ" value={company?.cnpj} />
              <InfoRow label="Fone" value={company?.fone} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
            <CardContent>
              <InfoRow label="Razão Social" value={client?.razao_social} />
              <InfoRow label="CNPJ" value={client?.cnpj} />
              <InfoRow label="Cidade" value={client?.cidade} />
            </CardContent>
          </Card>
        </div>

        {/* Responsável Técnico */}
        <Card>
          <CardHeader><CardTitle>Responsável Técnico</CardTitle></CardHeader>
          <CardContent>
            <InfoRow label="Engenheiro" value={engineer?.nome} />
            <InfoRow label="CREA-SC" value={engineer?.crea_sc} />
            {report.numero_art && <InfoRow label="Número da ART" value={report.numero_art} />}
          </CardContent>
        </Card>

        {/* Medições */}
        {measurements.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Resultados das Medições</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {measurements.map((m, i) => {
                  const approved = (m.valor_medido ?? Infinity) <= lim;
                  return (
                    <div key={i} className="flex items-center justify-between border-b last:border-0 pb-2">
                      <div className="text-sm">
                        <span className="font-medium">Medição {i + 1}:</span> {m.descricao || '-'}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{m.valor_medido != null ? `${m.valor_medido} Ω` : '-'}</span>
                        <Badge variant={approved ? 'default' : 'destructive'} className={approved ? 'bg-green-600 hover:bg-green-600' : ''}>
                          {approved ? 'Aprovado' : 'Reprovado'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assinatura */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5" />
              Assinatura do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">Atenção</p>
              <p>Ao assinar, você confirma que recebeu e revisou o laudo técnico acima. Após confirmar, este link será invalidado e não poderá ser acessado novamente.</p>
            </div>
            <SignaturePad ref={sigRef} label="Assinatura do representante do cliente" />
            <div className="flex items-center gap-3">
              <Button onClick={handleSign} disabled={signing} size="lg" className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                {signing ? 'Registrando...' : 'Confirmar Assinatura'}
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Assinando como: <strong>{client?.razao_social || 'Cliente'}</strong> — CNPJ: {client?.cnpj || '-'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}