import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pencil, Download, Printer, CheckCircle, Upload, FileText, Save, PenLine, Mail, CheckCheck, Copy, Share2, RotateCcw } from 'lucide-react';
import { generateReportPDF } from '@/utils/reportPdf';
import SignaturePad from '@/components/report/SignaturePad';
import PdfViewer from '@/components/report/PdfViewer';
import { formatEnvironmentConditions } from '@/utils/environment';

export default function ReportView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [data, setData] = useState({});
  const [exporting, setExporting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [artEditing, setArtEditing] = useState(false);
  const [artNumero, setArtNumero] = useState('');
  const [artDocUrl, setArtDocUrl] = useState('');
  const [savingArt, setSavingArt] = useState(false);
  const [uploadingArt, setUploadingArt] = useState(false);
  const [signing, setSigning] = useState(false);
  const [savingSignatures, setSavingSignatures] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [signingUrl, setSigningUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const engSigRef = useRef(null);
  const cliSigRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
    (async () => {
      const r = await base44.entities.Report.get(id);
      setReport(r);
      const [companies, clients, engineers, electricians, instruments, users] = await Promise.all([
        base44.entities.Company.list(),
        base44.entities.Client.list(),
        base44.entities.Engineer.list(),
        base44.entities.Electrician.list(),
        base44.entities.Instrument.list(),
        base44.entities.User.list(),
      ]);
      const engUser = users.find(u => u.id === r.engenheiro_id);
      const eleUser = users.find(u => u.id === r.eletricista_id);
      setData({
        company: companies[0],
        client: clients.find(c => c.id === r.cliente_id),
        engineer: engUser
          ? { nome: engUser.full_name || engUser.email, cpf: engUser.cpf, crea_sc: engUser.crea_sc }
          : engineers.find(e => e.id === r.engenheiro_id),
        electrician: eleUser
          ? { nome: eleUser.full_name || eleUser.email, cpf: eleUser.cpf, registro_profissional: eleUser.registro_profissional }
          : electricians.find(e => e.id === r.eletricista_id),
        instrument: instruments.find(i => i.id === r.instrumento_id),
      });
      })();
      }, [id]);

      useEffect(() => {
      if (!report || !data.company) return;
      let revoked = false;
      let blobUrl = null;
      setPdfLoading(true);
      (async () => {
      try {
       const doc = await generateReportPDF(report, data);
       const blob = doc.output('blob');
       blobUrl = URL.createObjectURL(blob);
       if (!revoked) setPdfPreviewUrl(blobUrl);
      } catch (e) {
       console.error('Erro ao gerar prévia do PDF:', e);
      } finally {
       if (!revoked) setPdfLoading(false);
      }
      })();
      return () => {
      revoked = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      };
      }, [report, data]);

  const handleSendForSignature = async (reopen = false) => {
    setSendingLink(true);
    try {
      const res = await base44.functions.invoke('enviarAssinatura', {
        report_id: id,
        app_url: window.location.origin,
        reopen,
      });
      setSigningUrl(res.data.signing_url);
      setLinkSent(true);
      if (reopen) {
        const updated = await base44.entities.Report.get(id);
        setReport(updated);
      }
    } catch (e) {
      alert('Erro ao gerar link: ' + (e?.response?.data?.error || e?.data?.error || e.message));
    }
    setSendingLink(false);
  };

  const handleCopyLink = () => {
    if (signingUrl) {
      navigator.clipboard.writeText(signingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    if (signingUrl && data.client?.fone) {
      const phone = data.client.fone.replace(/\D/g, '');
      const msg = encodeURIComponent(`Olá! Você recebeu um Laudo Técnico para assinatura. Acesse o link: ${signingUrl}`);
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    } else if (signingUrl) {
      const msg = encodeURIComponent(`Laudo Técnico para assinatura. Acesse: ${signingUrl}`);
      window.open(`https://wa.me/?text=${msg}`, '_blank');
    }
  };

  const handlePdf = async () => {
    setExporting(true);
    try {
      const doc = await generateReportPDF(report, data);
      doc.save(`LAUDO DE ATERRAMENTO ${report.tag_equipamento || ''}`.trim() + '.pdf');
    } catch (e) { console.error(e); }
    setExporting(false);
  };

  const handlePrint = async () => {
    setExporting(true);
    try {
      const doc = await generateReportPDF(report, data);
      doc.autoPrint();
      const blobUrl = doc.output('bloburl');
      const win = window.open(blobUrl, '_blank');
      if (!win) window.location.href = blobUrl;
    } catch (e) { console.error(e); }
    setExporting(false);
  };

  if (!report) return <p className="text-muted-foreground">Carregando...</p>;

  const lim = report.limite_ohms || 10;
  const measurements = report.measurements || [];
  const userRole = currentUser?.role;
  const canEdit = userRole === 'admin' || userRole === 'coordenador';
  const isEletricista = userRole === 'eletricista';
  const ws = report.workflow_status || 'rascunho';

  const workflowLabel = {
    rascunho: 'Rascunho',
    pendente_medicao: 'Pendente Medição',
    pendente_revisao: 'Pendente Revisão',
    concluido: 'Concluído',
  }[ws];
  const workflowVariant = {
    rascunho: 'secondary',
    pendente_medicao: 'secondary',
    pendente_revisao: 'default',
    concluido: 'default',
  }[ws];

  const handleConcluir = async () => {
    if (!report.art_documento_url) {
      alert('É obrigatório anexar o documento da ART antes de concluir o laudo.');
      return;
    }
    await base44.entities.Report.update(id, { workflow_status: 'concluido' });
    setReport({ ...report, workflow_status: 'concluido' });
  };

  const startArtEdit = () => {
    setArtNumero(report.numero_art || '');
    setArtDocUrl(report.art_documento_url || '');
    setArtEditing(true);
  };

  const handleArtUpload = async (file) => {
    if (!file) return;
    setUploadingArt(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setArtDocUrl(file_url);
    } catch (e) {
      alert('Erro ao enviar documento: ' + e.message);
    }
    setUploadingArt(false);
  };

  const handleArtSave = async () => {
    setSavingArt(true);
    try {
      await base44.entities.Report.update(id, { numero_art: artNumero, art_documento_url: artDocUrl });
      setReport({ ...report, numero_art: artNumero, art_documento_url: artDocUrl });
      setArtEditing(false);
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    }
    setSavingArt(false);
  };

  const isEngenheiro = userRole === 'engenheiro';
  const canManageArt = isEngenheiro || canEdit;
  const canSign = canEdit || isEngenheiro || isEletricista;

  const handleSaveSignatures = async () => {
    setSavingSignatures(true);
    try {
      const updates = {};
      const engSig = engSigRef.current?.toDataURL();
      const cliSig = cliSigRef.current?.toDataURL();
      if (!engSig && !cliSig) {
        alert('Desenhe pelo menos uma assinatura.');
        setSavingSignatures(false);
        return;
      }
      if (engSig) {
        const blob = await (await fetch(engSig)).blob();
        const file = new File([blob], 'assinatura-engenheiro.png', { type: 'image/png' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        updates.assinatura_engenheiro_url = file_url;
      }
      if (cliSig) {
        const blob = await (await fetch(cliSig)).blob();
        const file = new File([blob], 'assinatura-cliente.png', { type: 'image/png' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        updates.assinatura_cliente_url = file_url;
      }
      await base44.entities.Report.update(id, updates);
      setReport({ ...report, ...updates });
      setSigning(false);
    } catch (e) {
      alert('Erro ao salvar assinaturas: ' + e.message);
    }
    setSavingSignatures(false);
  };

  const InfoRow = ({ label, value }) => (
    <div className="flex gap-2 text-sm py-1">
      <span className="font-medium text-muted-foreground min-w-[120px]">{label}:</span>
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-bold">Laudo - {report.equipamento}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canEdit && (
            <Button variant="outline" onClick={() => navigate(`/reports/${id}/edit`)}><Pencil className="h-4 w-4 mr-2" />Editar</Button>
          )}
          {isEletricista && ws === 'pendente_medicao' && (
            <Button onClick={() => navigate(`/reports/${id}/edit`)}><Pencil className="h-4 w-4 mr-2" />Adicionar Medições</Button>
          )}
          {(canEdit || isEngenheiro) && ws === 'pendente_revisao' && (
            <Button onClick={handleConcluir}><CheckCircle className="h-4 w-4 mr-2" />Concluir Revisão</Button>
          )}
          {canEdit && ws === 'pendente_revisao' && !signingUrl && (
            <Button variant="outline" onClick={() => handleSendForSignature(true)} disabled={sendingLink}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {sendingLink ? 'Reabrindo...' : 'Reabrir Medições'}
            </Button>
          )}
          {canEdit && !signingUrl && (
            <Button variant="outline" onClick={() => handleSendForSignature()} disabled={sendingLink}>
              <Mail className="h-4 w-4 mr-2" />
              {sendingLink ? 'Gerando...' : 'Gerar Link'}
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint} disabled={exporting}><Printer className="h-4 w-4 mr-2" />{exporting ? 'Gerando...' : 'Imprimir'}</Button>
          <Button onClick={handlePdf} disabled={exporting}><Download className="h-4 w-4 mr-2" />{exporting ? 'Gerando...' : 'Exportar PDF'}</Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant={report.status === 'aprovado' ? 'default' : report.status === 'reprovado' ? 'destructive' : 'secondary'} className={`text-sm ${report.status === 'aprovado' ? 'bg-green-600 hover:bg-green-600' : ''}`}>
          {report.status === 'aprovado' ? 'Aprovado' : report.status === 'reprovado' ? 'Reprovado' : 'Rascunho'}
        </Badge>
        <Badge variant={workflowVariant} className="text-sm">{workflowLabel}</Badge>
        <span className="text-sm text-muted-foreground">Limite: {lim} Ω</span>
      </div>

      {signingUrl && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Link gerado</h3>
            </div>
            <p className="text-sm text-blue-700">Envie o link ao eletricista para registrar as medições, ou ao cliente para assinatura do laudo.</p>
            <div className="flex items-center gap-2 bg-white rounded-lg border p-2">
              <Input readOnly value={signingUrl} className="flex-1 text-sm border-0 focus-visible:ring-0" />
              <Button size="sm" variant="outline" onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-1" /> {copied ? 'Copiado!' : 'Copiar'}
              </Button>
              <Button size="sm" onClick={handleWhatsAppShare}>
                <Share2 className="h-4 w-4 mr-1" /> WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Section title="Identificação">
        <InfoRow label="Equipamento" value={report.equipamento} />
        <InfoRow label="TAG" value={report.tag_equipamento} />
        <InfoRow label="Local" value={report.local} />
        <InfoRow label="Data" value={report.data ? new Date(report.data).toLocaleDateString('pt-BR') : ''} />
      </Section>

      <Section title="Cliente">
        {data.client?.logo_url && (
          <img src={data.client.logo_url} alt="Logo do cliente" className="h-20 object-contain mb-4" />
        )}
        <InfoRow label="Razão Social" value={data.client?.razao_social} />
        <InfoRow label="CNPJ" value={data.client?.cnpj} />
        <InfoRow label="Endereço" value={data.client?.endereco} />
        <InfoRow label="Cidade" value={data.client?.cidade} />
        <InfoRow label="CEP" value={data.client?.cep} />
        <InfoRow label="Bairro" value={data.client?.bairro} />
        <InfoRow label="Fone" value={data.client?.fone} />
      </Section>

      <Section title="Empresa Responsável">
        <InfoRow label="Razão Social" value={data.company?.razao_social} />
        <InfoRow label="CNPJ" value={data.company?.cnpj} />
        <InfoRow label="Endereço" value={data.company?.endereco} />
        <InfoRow label="Fone" value={data.company?.fone} />
      </Section>

      <Section title="Responsável Técnico">
        <InfoRow label="Nome" value={data.engineer?.nome} />
        <InfoRow label="CPF" value={data.engineer?.cpf} />
        <InfoRow label="CREA SC" value={data.engineer?.crea_sc} />
      </Section>

      <Section title="Eletricista Executor">
        <InfoRow label="Nome" value={data.electrician?.nome} />
        <InfoRow label="CPF" value={data.electrician?.cpf} />
        <InfoRow label="Registro" value={data.electrician?.registro_profissional} />
      </Section>

      <Section title="Instrumento Utilizado">
        <InfoRow label="Marca/Modelo" value={data.instrument?.marca_modelo} />
        <InfoRow label="Nº de Série" value={data.instrument?.numero_serie} />
        <InfoRow label="Calibração" value={data.instrument?.data_calibracao ? new Date(data.instrument.data_calibracao).toLocaleDateString('pt-BR') : ''} />
        {data.instrument?.especificacoes && (
          <div className="mt-2">
            <span className="font-medium text-muted-foreground text-sm">Especificações:</span>
            <p className="text-sm whitespace-pre-wrap mt-1">{data.instrument.especificacoes}</p>
          </div>
        )}
      </Section>

      <Section title="Dados Técnicos">
        <InfoRow label="Equipamento" value={report.equipamento} />
        <InfoRow label="Tag do Equipamento" value={report.tag_equipamento} />

        <div className="border-t my-3 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-muted-foreground text-sm">Anotação de Responsabilidade Técnica (ART)</span>
            {canManageArt && !artEditing && (
              <Button variant="outline" size="sm" onClick={startArtEdit}>
                <Pencil className="h-3 w-3 mr-1" /> {report.numero_art || report.art_documento_url ? 'Editar' : 'Preencher'}
              </Button>
            )}
          </div>
          {!artEditing ? (
            <>
              <InfoRow label="Número da ART" value={report.numero_art} />
              {report.art_documento_url ? (
                <div className="mt-3">
                  <PdfViewer url={report.art_documento_url} />
                </div>
              ) : (
                <InfoRow label="Documento" value="Não anexado" />
              )}
            </>
          ) : (
            <div className="space-y-3 mt-2">
              <div>
                <span className="text-xs text-muted-foreground">Número da ART</span>
                <Input value={artNumero} onChange={e => setArtNumero(e.target.value)} placeholder="Ex: 2024/123456" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Documento da ART (PDF)</span>
                {artDocUrl ? (
                  <div className="flex items-center gap-2 mt-1">
                    <FileText className="h-4 w-4 text-green-600" />
                    <a href={artDocUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">Documento anexado</a>
                    <Button variant="ghost" size="sm" onClick={() => setArtDocUrl('')}>Remover</Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" disabled={uploadingArt} onClick={() => document.getElementById('art-upload').click()}>
                    <Upload className="h-4 w-4 mr-1" /> {uploadingArt ? 'Enviando...' : 'Anexar ART'}
                  </Button>
                )}
                <input id="art-upload" type="file" accept="application/pdf,image/*" className="hidden"
                  onChange={e => { const file = e.target.files?.[0]; if (file) handleArtUpload(file); e.target.value = ''; }} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleArtSave} disabled={savingArt}>
                  <Save className="h-3 w-3 mr-1" /> {savingArt ? 'Salvando...' : 'Salvar ART'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setArtEditing(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
        <div className="mt-2">
          <span className="font-medium text-muted-foreground text-sm">Normas e Referências:</span>
          <p className="text-sm whitespace-pre-wrap mt-1">{report.normas}</p>
        </div>
        <div className="mt-2">
          <span className="font-medium text-muted-foreground text-sm">Condições do Ambiente:</span>
          <p className="text-sm whitespace-pre-wrap mt-1">{formatEnvironmentConditions(report.condicoes_ambiente)}</p>
        </div>
        {report.limitacoes && (
          <div className="mt-2">
            <span className="font-medium text-muted-foreground text-sm">Limitações do Ensaio:</span>
            <p className="text-sm whitespace-pre-wrap mt-1">{report.limitacoes}</p>
          </div>
        )}
      </Section>

      <Section title="Medições">
        {measurements.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma medição registrada.</p>
        ) : (
          <div className="space-y-4">
            {measurements.map((m, i) => {
              const approved = (m.valor_medido ?? Infinity) <= lim;
              return (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Medição {i + 1}</h4>
                    <Badge variant={approved ? 'default' : 'destructive'} className={approved ? 'bg-green-600 hover:bg-green-600' : ''}>{approved ? 'Aprovado' : 'Reprovado'}</Badge>
                  </div>
                  <InfoRow label="Local / Descrição" value={m.descricao} />
                  <InfoRow label="Valor Medido" value={m.valor_medido != null ? `${m.valor_medido} Ω` : '-'} />
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
          </div>
        )}
      </Section>

      <Section title="Documento do Laudo (PDF)">
        <div className="flex gap-2 flex-wrap mb-3 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={exporting || pdfLoading}>
            <Printer className="h-4 w-4 mr-2" />{exporting ? 'Gerando...' : 'Imprimir'}
          </Button>
          <Button size="sm" onClick={handlePdf} disabled={exporting || pdfLoading}>
            <Download className="h-4 w-4 mr-2" />{exporting ? 'Gerando...' : 'Exportar PDF'}
          </Button>
        </div>
        {pdfLoading ? (
          <div className="flex items-center justify-center text-sm text-muted-foreground py-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin mr-3" />
            Gerando documento...
          </div>
        ) : pdfPreviewUrl ? (
          <PdfViewer url={pdfPreviewUrl} />
        ) : (
          <p className="text-sm text-muted-foreground">Não foi possível gerar a prévia do documento.</p>
        )}
      </Section>

      <Section title="Objetivo"><p className="text-sm whitespace-pre-wrap">{report.objetivo}</p></Section>
      <Section title="Metodologia"><p className="text-sm whitespace-pre-wrap">{report.metodologia}</p></Section>
      <Section title="Recomendações Finais"><p className="text-sm whitespace-pre-wrap">{report.recomendacoes}</p></Section>

      <Section title="Assinaturas">
        {!signing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Engenheiro Responsável</span>
                {report.assinatura_engenheiro_url ? (
                  <img src={report.assinatura_engenheiro_url} alt="Assinatura do engenheiro" className="mt-2 max-h-20 border-b border-gray-400 pb-1" />
                ) : (
                  <div className="mt-2 h-20 border-b border-gray-300 flex items-end pb-1">
                    <span className="text-xs text-muted-foreground/50">Sem assinatura</span>
                  </div>
                )}
                <p className="text-sm font-medium mt-1">{data.engineer?.nome || '-'}</p>
                <p className="text-xs text-muted-foreground">CREA-SC: {data.engineer?.crea_sc || '-'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Cliente / Contratante</span>
                {report.assinatura_cliente_url ? (
                  <img src={report.assinatura_cliente_url} alt="Assinatura do cliente" className="mt-2 max-h-20 border-b border-gray-400 pb-1" />
                ) : (
                  <div className="mt-2 h-20 border-b border-gray-300 flex items-end pb-1">
                    <span className="text-xs text-muted-foreground/50">Sem assinatura</span>
                  </div>
                )}
                <p className="text-sm font-medium mt-1">{data.client?.razao_social || '-'}</p>
                <p className="text-xs text-muted-foreground">CNPJ: {data.client?.cnpj || '-'}</p>
              </div>
            </div>
            {canSign && (
              <Button variant="outline" onClick={() => setSigning(true)}>
                <PenLine className="h-4 w-4 mr-2" />
                {report.assinatura_engenheiro_url || report.assinatura_cliente_url ? 'Refazer Assinaturas' : 'Coletar Assinaturas'}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SignaturePad ref={engSigRef} label="Assinatura do Engenheiro" />
              <SignaturePad ref={cliSigRef} label="Assinatura do Cliente" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveSignatures} disabled={savingSignatures}>
                <Save className="h-4 w-4 mr-2" /> {savingSignatures ? 'Salvando...' : 'Salvar Assinaturas'}
              </Button>
              <Button variant="outline" onClick={() => setSigning(false)}>Cancelar</Button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}