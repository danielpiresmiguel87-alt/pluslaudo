import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SignaturePad from '@/components/report/SignaturePad';
import { formatEnvironmentConditions } from '@/utils/environment';
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

  const { report, client, company, engineer, electrician, instrument } = data;
  const lim = report.limite_ohms || 10;
  const measurements = report.measurements || [];
  const hasMeas = measurements.length > 0;
  const allApproved = hasMeas && measurements.every(m => (m.valor_medido ?? Infinity) <= lim);
  const statusLabel = !hasMeas ? 'Rascunho' : allApproved ? 'Aprovado' : 'Reprovado';

  const InfoRow = ({ label, value }) => (
    <div className="flex gap-2 text-sm py-1">
      <span className="font-medium text-muted-foreground min-w-[140px]">{label}:</span>
      <span>{value || '-'}</span>
    </div>
  );

  const Section = ({ title, children }) => (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-3">
            <ShieldCheck className="h-4 w-4" />
            Assinatura Digital Segura
          </div>
          <h1 className="text-2xl font-bold">Laudo Técnico de Aterramento</h1>
          <p className="text-muted-foreground text-sm mt-1">Revise o documento completo abaixo e assine para confirmar</p>
        </div>

        {/* Logos */}
        {(company?.logo_url || client?.logo_url) && (
          <Card>
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              {company?.logo_url && (
                <img src={company.logo_url} alt="Logo da empresa" className="h-20 object-contain" />
              )}
              {client?.logo_url && (
                <img src={client.logo_url} alt="Logo do cliente" className="h-20 object-contain" />
              )}
            </CardContent>
          </Card>
        )}

        {/* Status */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={report.status === 'aprovado' ? 'default' : report.status === 'reprovado' ? 'destructive' : 'secondary'}
            className={`text-sm ${report.status === 'aprovado' ? 'bg-green-600 hover:bg-green-600' : ''}`}>
            {statusLabel}
          </Badge>
          <span className="text-sm text-muted-foreground">Limite de referência: {lim} Ω</span>
        </div>

        {/* Identificação */}
        <Section title="Identificação">
          <InfoRow label="Equipamento" value={report.equipamento} />
          <InfoRow label="Tag do Equipamento" value={report.tag_equipamento} />
          <InfoRow label="Local" value={report.local} />
          <InfoRow label="Data" value={report.data ? new Date(report.data).toLocaleDateString('pt-BR') : ''} />
          {report.validade && <InfoRow label="Validade" value={new Date(report.validade).toLocaleDateString('pt-BR')} />}
        </Section>

        {/* Cliente */}
        <Section title="Cliente / Contratante">
          <InfoRow label="Razão Social" value={client?.razao_social} />
          <InfoRow label="CNPJ" value={client?.cnpj} />
          <InfoRow label="Endereço" value={client?.endereco} />
          <InfoRow label="Bairro" value={client?.bairro} />
          <InfoRow label="Cidade" value={client?.cidade} />
          <InfoRow label="CEP" value={client?.cep} />
          <InfoRow label="Fone" value={client?.fone} />
        </Section>

        {/* Empresa Responsável */}
        <Section title="Empresa Responsável">
          <InfoRow label="Razão Social" value={company?.razao_social} />
          <InfoRow label="CNPJ" value={company?.cnpj} />
          <InfoRow label="Endereço" value={company?.endereco} />
          <InfoRow label="Bairro" value={company?.bairro} />
          <InfoRow label="Cidade" value={company?.cidade} />
          <InfoRow label="CEP" value={company?.cep} />
          <InfoRow label="Fone" value={company?.fone} />
          <InfoRow label="E-mail" value={company?.email} />
        </Section>

        {/* Responsável Técnico */}
        <Section title="Responsável Técnico">
          <InfoRow label="Nome" value={engineer?.nome} />
          <InfoRow label="CPF" value={engineer?.cpf} />
          <InfoRow label="CREA-SC" value={engineer?.crea_sc} />
        </Section>

        {/* Eletricista Executor */}
        <Section title="Eletricista Executor">
          <InfoRow label="Nome" value={electrician?.nome} />
          <InfoRow label="CPF" value={electrician?.cpf} />
          <InfoRow label="Registro Profissional" value={electrician?.registro_profissional} />
        </Section>

        {/* Instrumento */}
        <Section title="Instrumento de Medição Utilizado">
          <InfoRow label="Marca / Modelo" value={instrument?.marca_modelo} />
          <InfoRow label="Número de Série" value={instrument?.numero_serie} />
          <InfoRow label="Data de Calibração" value={instrument?.data_calibracao ? new Date(instrument.data_calibracao).toLocaleDateString('pt-BR') : ''} />
          {instrument?.especificacoes && (
            <div className="mt-2">
              <span className="font-medium text-muted-foreground text-sm">Especificações Técnicas:</span>
              <p className="text-sm whitespace-pre-wrap mt-1">{instrument.especificacoes}</p>
            </div>
          )}
        </Section>

        {/* Normas */}
        <Section title="Normas e Referências">
          <p className="text-sm whitespace-pre-wrap">{report.normas}</p>
        </Section>

        {/* Condições do Ambiente */}
        <Section title="Condições do Ambiente e Climáticas">
          <p className="text-sm whitespace-pre-wrap">{formatEnvironmentConditions(report.condicoes_ambiente)}</p>
        </Section>

        {/* Objetivo */}
        <Section title="Objetivo">
          <p className="text-sm whitespace-pre-wrap">{report.objetivo}</p>
        </Section>

        {/* Metodologia */}
        <Section title="Metodologia Aplicada">
          <p className="text-sm whitespace-pre-wrap">{report.metodologia}</p>
        </Section>

        {/* ART */}
        <Section title="Anotação de Responsabilidade Técnica (ART)">
          <InfoRow label="Número da ART" value={report.numero_art} />
        </Section>

        {/* Medições */}
        <Section title="Resultados das Medições">
          {!hasMeas ? (
            <p className="text-muted-foreground text-sm">Nenhuma medição registrada.</p>
          ) : (
            <div className="space-y-4">
              {measurements.map((m, i) => {
                const approved = (m.valor_medido ?? Infinity) <= lim;
                return (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Medição {i + 1}</h4>
                      <Badge variant={approved ? 'default' : 'destructive'} className={approved ? 'bg-green-600 hover:bg-green-600' : ''}>
                        {approved ? 'Aprovado' : 'Reprovado'}
                      </Badge>
                    </div>
                    <InfoRow label="Local / Descrição" value={m.descricao} />
                    <InfoRow label="Valor Medido" value={m.valor_medido != null ? `${m.valor_medido} Ω` : '-'} />
                    <InfoRow label="Limite de Referência" value={`${lim} Ω`} />
                    {m.fotos?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {m.fotos.map((foto, fi) => (
                          <a key={fi} href={foto} target="_blank" rel="noreferrer">
                            <img src={foto} alt={`Foto ${fi + 1}`} className="h-24 w-24 object-cover rounded border" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="border-t pt-3 text-sm">
                <p className="font-medium">Total de medições: {measurements.length}</p>
                <p className="text-green-600">Aprovadas: {measurements.filter(m => (m.valor_medido ?? Infinity) <= lim).length}</p>
                {measurements.filter(m => (m.valor_medido ?? Infinity) > lim).length > 0 && (
                  <p className="text-red-600">Reprovadas: {measurements.filter(m => (m.valor_medido ?? Infinity) > lim).length}</p>
                )}
              </div>
            </div>
          )}
        </Section>

        {/* Limitações */}
        {report.limitacoes && (
          <Section title="Limitações do Ensaio">
            <p className="text-sm whitespace-pre-wrap">{report.limitacoes}</p>
          </Section>
        )}

        {/* Recomendações */}
        {report.recomendacoes && (
          <Section title="Recomendações Finais">
            <p className="text-sm whitespace-pre-wrap">{report.recomendacoes}</p>
          </Section>
        )}

        {/* Assinatura do engenheiro (já coletada) */}
        {report.assinatura_engenheiro_url && (
          <Section title="Assinatura do Responsável Técnico">
            <img src={report.assinatura_engenheiro_url} alt="Assinatura do engenheiro" className="max-h-20" />
            <p className="text-sm font-medium mt-2">{engineer?.nome}</p>
            <p className="text-xs text-muted-foreground">CREA-SC: {engineer?.crea_sc || '-'}</p>
          </Section>
        )}

        {/* Assinatura do cliente */}
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
              <p>Ao assinar, você confirma que recebeu e revisou o laudo técnico acima na sua totalidade. Após confirmar, este link será invalidado e não poderá ser acessado novamente.</p>
            </div>
            <SignaturePad ref={sigRef} label="Assinatura do representante do cliente" />
            <Button onClick={handleSign} disabled={signing} size="lg" className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              {signing ? 'Registrando...' : 'Confirmar Assinatura'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Assinando como: <strong>{client?.razao_social || 'Cliente'}</strong> — CNPJ: {client?.cnpj || '-'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}