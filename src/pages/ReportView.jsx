import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pencil, Download, Printer, CheckCircle } from 'lucide-react';
import { generateReportPDF } from '@/utils/reportPdf';
import { formatEnvironmentConditions } from '@/utils/environment';

export default function ReportView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [data, setData] = useState({});
  const [exporting, setExporting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
    (async () => {
      const r = await base44.entities.Report.get(id);
      setReport(r);
      const [companies, clients, engineers, electricians, instruments] = await Promise.all([
        base44.entities.Company.list(),
        base44.entities.Client.list(),
        base44.entities.Engineer.list(),
        base44.entities.Electrician.list(),
        base44.entities.Instrument.list(),
      ]);
      setData({
        company: companies[0],
        client: clients.find(c => c.id === r.cliente_id),
        engineer: engineers.find(e => e.id === r.engenheiro_id),
        electrician: electricians.find(e => e.id === r.eletricista_id),
        instrument: instruments.find(i => i.id === r.instrumento_id),
      });
    })();
  }, [id]);

  const handlePdf = async () => {
    setExporting(true);
    try { await generateReportPDF(report, data); } catch (e) { console.error(e); }
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
    await base44.entities.Report.update(id, { workflow_status: 'concluido' });
    setReport({ ...report, workflow_status: 'concluido' });
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
          {canEdit && ws === 'pendente_revisao' && (
            <Button onClick={handleConcluir}><CheckCircle className="h-4 w-4 mr-2" />Concluir Laudo</Button>
          )}
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimir</Button>
          <Button onClick={handlePdf} disabled={exporting}><Download className="h-4 w-4 mr-2" />{exporting ? 'Gerando...' : 'Exportar PDF'}</Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant={report.status === 'aprovado' ? 'default' : report.status === 'reprovado' ? 'destructive' : 'secondary'} className="text-sm">
          {report.status === 'aprovado' ? 'Aprovado' : report.status === 'reprovado' ? 'Reprovado' : 'Rascunho'}
        </Badge>
        <Badge variant={workflowVariant} className="text-sm">{workflowLabel}</Badge>
        <span className="text-sm text-muted-foreground">Limite: {lim} Ω</span>
      </div>

      <Section title="Identificação">
        <InfoRow label="Equipamento" value={report.equipamento} />
        <InfoRow label="Local" value={report.local} />
        <InfoRow label="Data" value={report.data ? new Date(report.data).toLocaleDateString('pt-BR') : ''} />
      </Section>

      <Section title="Cliente">
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
        <InfoRow label="Número da ART" value={report.numero_art} />
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
                    <Badge variant={approved ? 'default' : 'destructive'}>{approved ? 'Aprovado' : 'Reprovado'}</Badge>
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

      <Section title="Objetivo"><p className="text-sm whitespace-pre-wrap">{report.objetivo}</p></Section>
      <Section title="Metodologia"><p className="text-sm whitespace-pre-wrap">{report.metodologia}</p></Section>
      <Section title="Recomendações Finais"><p className="text-sm whitespace-pre-wrap">{report.recomendacoes}</p></Section>
    </div>
  );
}