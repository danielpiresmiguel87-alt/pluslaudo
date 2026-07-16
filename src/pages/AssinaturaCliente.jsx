import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import SignaturePad from '@/components/report/SignaturePad';
import MeasurementEditor from '@/components/report/MeasurementEditor';
import EnvironmentConditions from '@/components/report/EnvironmentConditions';
import { formatEnvironmentConditions } from '@/utils/environment';
import { CheckCircle, PenLine, AlertCircle, ShieldCheck, FileCheck, Save } from 'lucide-react';

const C = {
  primary: '#1E3A5F',
  accent: '#2D74A3',
  light: '#E6EEF5',
  gray: '#6E6E6E',
  green: '#006400',
  red: '#B40000',
};

const formatDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
};

export default function AssinaturaCliente() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const sigRef = useRef(null);
  const [editableMeasurements, setEditableMeasurements] = useState([]);
  const [savingMeas, setSavingMeas] = useState(false);
  const [measSaved, setMeasSaved] = useState(false);
  const [condicoes, setCondicoes] = useState('');

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

  useEffect(() => {
    if (data?.report?.measurements) {
      setEditableMeasurements(data.report.measurements);
    }
    if (data?.report?.condicoes_ambiente) {
      setCondicoes(data.report.condicoes_ambiente);
    }
  }, [data]);

  const handleSaveMeasurements = async () => {
    const confirmed = window.confirm('Você tem certeza que deseja concluir? Após a conclusão não será mais possível fazer alterações.');
    if (!confirmed) return;
    setSavingMeas(true);
    try {
      const measurementsToSend = editableMeasurements.map(m => ({
        ...m,
        fotos: (m.fotos || []).map(f => {
          if (typeof f === 'string') return f;
          return f.dataUrl || f.url || '';
        }).filter(Boolean),
      }));
      await base44.functions.invoke('assinarLaudo', { token, action: 'save_measurements', measurements: measurementsToSend, condicoes_ambiente: condicoes });
      setMeasSaved(true);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.data?.error || e.message || 'Erro ao salvar medições';
      alert(msg);
    }
    setSavingMeas(false);
  };

  const handleSaveDraft = async () => {
    setSavingMeas(true);
    try {
      const measurementsToSend = editableMeasurements.map(m => ({
        ...m,
        fotos: (m.fotos || []).map(f => {
          if (typeof f === 'string') return f;
          return f.dataUrl || f.url || '';
        }).filter(Boolean),
      }));
      await base44.functions.invoke('assinarLaudo', { token, action: 'save_draft', measurements: measurementsToSend, condicoes_ambiente: condicoes });
      alert('Medições salvas! Você pode continuar mais tarde usando o mesmo link.');
    } catch (e) {
      const msg = e?.response?.data?.error || e?.data?.error || e.message || 'Erro ao salvar medições';
      alert(msg);
    }
    setSavingMeas(false);
  };

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
        <div className="max-w-md w-full text-center bg-white rounded-lg shadow-lg p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Link indisponível</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full text-center bg-white rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileCheck className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Assinatura Registrada!</h2>
          <p className="text-slate-500 text-sm">Sua assinatura foi registrada com sucesso no laudo técnico. Este link não está mais disponível.</p>
        </div>
      </div>
    );
  }

  if (measSaved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full text-center bg-white rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileCheck className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Medições Enviadas!</h2>
          <p className="text-slate-500 text-sm">Suas medições foram registradas com sucesso. O laudo será revisado pela equipe técnica.</p>
        </div>
      </div>
    );
  }

  if (data?.report?.workflow_status === 'pendente_medicao' || data?.report?.workflow_status === 'pendente_revisao') {
    const r = data.report;
    return (
      <div className="min-h-screen bg-slate-200 py-8 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-xl p-6 space-y-4">
          <div className="h-1.5 rounded-t" style={{ background: C.primary }} />
          <div>
            <h1 className="text-xl font-bold" style={{ color: C.primary }}>Medições de Aterramento</h1>
            <p className="text-sm mt-1" style={{ color: C.gray }}>Registre as medições de resistência ôhmica realizadas no local.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm rounded-lg p-4" style={{ background: C.light }}>
            <div><span className="font-bold" style={{ color: C.primary }}>Equipamento:</span> {r.equipamento || '-'}</div>
            <div><span className="font-bold" style={{ color: C.primary }}>Tag:</span> {r.tag_equipamento || '-'}</div>
            <div><span className="font-bold" style={{ color: C.primary }}>Local:</span> {r.local || '-'}</div>
            <div><span className="font-bold" style={{ color: C.primary }}>Limite:</span> {r.limite_ohms || 10} Ω</div>
          </div>
          <div>
            <h2 className="text-sm font-bold mb-2" style={{ color: C.primary }}>Condições do Ambiente e Clima</h2>
            <EnvironmentConditions value={condicoes} onChange={(v) => setCondicoes(v)} location={r.local} />
          </div>
          <MeasurementEditor measurements={editableMeasurements} limite={r.limite_ohms || 10} onChange={setEditableMeasurements} />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleSaveDraft} disabled={savingMeas} variant="outline" size="lg" className="flex-1 w-full sm:w-auto">
              <Save className="h-4 w-4 mr-2" />
              {savingMeas ? 'Salvando...' : 'Salvar e Continuar Depois'}
            </Button>
            <Button onClick={handleSaveMeasurements} disabled={savingMeas} size="lg" className="flex-1 w-full sm:w-auto">
              <CheckCircle className="h-4 w-4 mr-2" />
              {savingMeas ? 'Enviando...' : 'Concluir Medições'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { report, client, company, engineer, electrician, instrument } = data;
  const lim = report.limite_ohms || 10;
  const measurements = report.measurements || [];
  const hasMeas = measurements.length > 0;
  const allApproved = hasMeas && measurements.every(m => (m.valor_medido ?? Infinity) <= lim);
  const status = !hasMeas ? 'RASCUNHO' : allApproved ? 'APROVADO' : 'REPROVADO';
  const statusColor = status === 'APROVADO' ? C.green : status === 'REPROVADO' ? C.red : C.gray;

  let sectionNum = 0;
  const Section = ({ title, children }) => {
    sectionNum++;
    return (
      <div className="mb-1">
        <div className="px-3 py-2 text-white text-sm font-bold" style={{ background: C.primary }}>
          {sectionNum}. {title}
        </div>
        <div className="px-4 py-3 border border-t-0" style={{ borderColor: C.accent }}>
          {children}
        </div>
      </div>
    );
  };

  const KV = ({ label, value }) => (
    <div className="flex gap-2 text-sm py-0.5">
      <span className="font-bold min-w-[140px]" style={{ color: C.primary }}>{label}:</span>
      <span className="text-black">{value || '-'}</span>
    </div>
  );

  const para = (text) => (
    <p className="text-sm text-black whitespace-pre-wrap text-justify leading-relaxed">{text}</p>
  );

  const metodologiaImgs = [
    'https://media.base44.com/images/public/6a4f95ae9ed008261810a9f7/01e2c4023_image.png',
    'https://media.base44.com/images/public/6a4f95ae9ed008261810a9f7/eee8ea9b2_image.png',
  ];

  const conclusion = allApproved
    ? `Após a coleta e análise dos dados obtidos mediante medição realizada com instrumento calibrado, conclui-se que os valores de resistência ôhmica do aterramento da máquina/equipamento avaliado estão DENTRO dos padrões pré-estabelecidos pela NSCI/94 (Norma de Segurança contra Incêndio) e atendem aos requisitos de segurança estabelecidos pela NR-12 (Segurança no Trabalho em Máquinas e Equipamentos).\n\nConforme a referida norma, o sistema de aterramento não poderá apresentar resistência superior a ${lim} Ohms em qualquer época do ano. Todos os pontos medidos apresentaram valores iguais ou inferiores ao limite estabelecido.\n\nPortanto, atesta-se que este equipamento, para fins de aterramento elétrico e proteção contra descargas atmosféricas, está APTO para operação contínua, estando em conformidade com as exigências do Corpo de Bombeiros da Polícia Militar do Estado de Santa Catarina (Resolução nº 017/CAT/CCB/88) e do PPCI da empresa.`
    : hasMeas
    ? `Após a coleta e análise dos dados obtidos mediante medição realizada com instrumento calibrado, conclui-se que uma ou mais medições apresentaram valores de resistência ôhmica ACIMA do limite máximo de ${lim} Ohms estabelecido pela NSCI/94 e NR-12.\n\nPortanto, atesta-se que o sistema de aterramento da máquina/equipamento avaliado está INAPTO para operação, sendo necessárias intervenções corretivas no sistema de aterramento para adequação aos padrões de segurança exigidos.\n\nRecomenda-se a execução imediata de medidas corretivas, seguida de nova medição de verificação para confirmação da conformidade.`
    : 'Laudo sem medições registradas. O parecer técnico será emitido após a realização das medições de resistência ôhmica de aterramento.';

  const approvedCount = measurements.filter(m => (m.valor_medido ?? Infinity) <= lim).length;
  const reprovadoCount = measurements.length - approvedCount;

  return (
    <div className="min-h-screen bg-slate-200 py-8 px-4 print:bg-white print:py-0 print:px-0">
      {/* A4-width container */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none">
        {/* Top decorative bars */}
        <div className="h-1.5" style={{ background: C.primary }} />
        <div className="h-0.5" style={{ background: C.accent }} />

        <div className="p-8">
          {/* Logos + company/client info */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {company?.logo_url && (
                <img src={company.logo_url} alt="Logo da empresa" className="h-20 object-contain mb-2" />
              )}
              <p className="text-sm font-bold" style={{ color: C.primary }}>{company?.razao_social}</p>
              {company?.cnpj && <p className="text-xs" style={{ color: C.gray }}>CNPJ: {company.cnpj}</p>}
              {company?.fone && <p className="text-xs" style={{ color: C.gray }}>Fone: {company.fone}</p>}
            </div>
            <div className="flex-1 text-right">
              {client?.logo_url && (
                <img src={client.logo_url} alt="Logo do cliente" className="h-20 object-contain mb-2 ml-auto" />
              )}
              <p className="text-sm font-bold" style={{ color: C.primary }}>{client?.razao_social}</p>
              {client?.cnpj && <p className="text-xs" style={{ color: C.gray }}>CNPJ: {client.cnpj}</p>}
              {client?.cidade && <p className="text-xs" style={{ color: C.gray }}>{client.cidade}{client?.cep ? ' - CEP ' + client.cep : ''}</p>}
            </div>
          </div>

          {/* Separator */}
          <div className="border-t mb-6" style={{ borderColor: C.accent }} />

          {/* Title */}
          <h1 className="text-center text-xl font-bold mb-1" style={{ color: C.primary }}>LAUDO TÉCNICO DE ATERRAMENTO</h1>
          <h2 className="text-center text-sm font-medium mb-4" style={{ color: C.accent }}>MEDIÇÃO DE RESISTÊNCIA ÔHMICA</h2>

          {/* ID box */}
          <div className="rounded border p-3 mb-4" style={{ background: C.light, borderColor: C.accent }}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div><span className="font-bold" style={{ color: C.primary }}>Equipamento:</span> <span className="text-black">{report.equipamento || '-'}</span></div>
              <div><span className="font-bold" style={{ color: C.primary }}>Tag:</span> <span className="text-black">{report.tag_equipamento || '-'}</span></div>
              <div className="col-span-2"><span className="font-bold" style={{ color: C.primary }}>Local / Data:</span> <span className="text-black">{report.local || '-'}{report.data ? ' - ' + formatDate(report.data) : ''}</span></div>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex justify-center mb-6">
            <span className="px-6 py-1.5 rounded text-white text-sm font-bold" style={{ background: statusColor }}>
              STATUS: {status}
            </span>
          </div>

          {/* Sections */}
          <Section title="IDENTIFICAÇÃO DO CLIENTE / CONTRATANTE">
            <KV label="Razão Social" value={client?.razao_social} />
            <KV label="CNPJ" value={client?.cnpj} />
            <KV label="Endereço" value={client?.endereco} />
            <KV label="Cidade" value={client?.cidade} />
            <KV label="Bairro" value={client?.bairro} />
            <KV label="CEP" value={client?.cep} />
            <KV label="Telefone" value={client?.fone} />
          </Section>

          <Section title="EMPRESA RESPONSÁVEL">
            <KV label="Razão Social" value={company?.razao_social} />
            <KV label="CNPJ" value={company?.cnpj} />
            <KV label="Endereço" value={company?.endereco} />
            <KV label="Telefone" value={company?.fone} />
            <KV label="E-mail" value={company?.email} />
          </Section>

          <Section title="RESPONSÁVEL TÉCNICO">
            <KV label="Nome" value={engineer?.nome} />
            <KV label="CPF" value={engineer?.cpf} />
            <KV label="CREA-SC" value={engineer?.crea_sc} />
          </Section>

          <Section title="ELETRICISTA EXECUTOR">
            <KV label="Nome" value={electrician?.nome} />
            <KV label="CPF" value={electrician?.cpf} />
            <KV label="Registro Profissional" value={electrician?.registro_profissional} />
          </Section>

          <Section title="INSTRUMENTO DE MEDIÇÃO UTILIZADO">
            <KV label="Marca / Modelo" value={instrument?.marca_modelo} />
            <KV label="Número de Série" value={instrument?.numero_serie} />
            <KV label="Data de Calibração" value={instrument?.data_calibracao ? formatDate(instrument.data_calibracao) : '-'} />
            {instrument?.especificacoes && (
              <div className="mt-2">
                <span className="font-bold text-sm" style={{ color: C.primary }}>Especificações Técnicas:</span>
                <p className="text-sm text-black whitespace-pre-wrap mt-1">{instrument.especificacoes}</p>
              </div>
            )}
          </Section>

          <Section title="NORMAS E REFERÊNCIAS">
            {para(report.normas)}
          </Section>

          <Section title="CONDIÇÕES DO AMBIENTE E CLIMÁTICAS">
            {para(formatEnvironmentConditions(report.condicoes_ambiente))}
          </Section>

          <Section title="OBJETIVO">
            {para(report.objetivo)}
          </Section>

          <Section title="METODOLOGIA APLICADA">
            {para(report.metodologia)}
            <div className="flex flex-col items-center gap-4 mt-4">
              {metodologiaImgs.map((url, i) => (
                <div key={i} className="border p-1" style={{ borderColor: C.accent }}>
                  <img src={url} alt={`Diagrama ${i + 1}`} className="max-w-[280px]" />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Anotação de Responsabilidade Técnica (ART)">
            <KV label="Número da ART" value={report.numero_art} />
          </Section>

          <Section title="LEVANTAMENTO DE DADOS">
            <KV label="Equipamento Avaliado" value={report.equipamento} />
            <KV label="Tag de Identificação" value={report.tag_equipamento} />
            <KV label="Limite de Referência" value={`${lim} Ohms`} />
            <KV label="Norma de Referência" value="NSCI/94 - Máximo 10 Ohms" />
            <p className="text-xs italic mt-2" style={{ color: C.gray }}>
              Conforme NSCI/94, o valor de resistência ôhmica do sistema de aterramento não pode ser superior a 10 Ohms em qualquer período do ano.
            </p>
          </Section>

          <Section title="RESULTADOS DAS MEDIÇÕES">
            {!hasMeas ? (
              <p className="text-sm text-black">Nenhuma medição foi registrada neste laudo.</p>
            ) : (
              <>
                {/* Table */}
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ background: C.primary }}>
                      <th className="text-white font-bold px-1 py-1.5 text-center border" style={{ borderColor: C.accent, width: '8%' }}>Nº</th>
                      <th className="text-white font-bold px-2 py-1.5 text-left border" style={{ borderColor: C.accent }}>Descrição / Local</th>
                      <th className="text-white font-bold px-1 py-1.5 text-center border" style={{ borderColor: C.accent, width: '16%' }}>Valor (Ohms)</th>
                      <th className="text-white font-bold px-1 py-1.5 text-center border" style={{ borderColor: C.accent, width: '16%' }}>Limite (Ohms)</th>
                      <th className="text-white font-bold px-1 py-1.5 text-center border" style={{ borderColor: C.accent, width: '18%' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.map((m, i) => {
                      const approved = (m.valor_medido ?? Infinity) <= lim;
                      return (
                        <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : ''}>
                          <td className="font-bold text-center border px-1 py-1" style={{ borderColor: C.accent, color: C.primary }}>{i + 1}</td>
                          <td className="text-left border px-2 py-1 text-black" style={{ borderColor: C.accent }}>{m.descricao || '-'}</td>
                          <td className="font-bold text-center border px-1 py-1 text-black" style={{ borderColor: C.accent }}>{m.valor_medido != null ? m.valor_medido : '-'}</td>
                          <td className="text-center border px-1 py-1 text-black" style={{ borderColor: C.accent }}>{lim}</td>
                          <td className="font-bold text-center border px-1 py-1 text-xs" style={{ borderColor: C.accent, color: approved ? C.green : C.red }}>{approved ? 'APROVADO' : 'REPROVADO'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Summary */}
                <div className="mt-3 text-sm">
                  <p className="font-bold" style={{ color: C.primary }}>Total de medições realizadas: {measurements.length}</p>
                  <p style={{ color: C.green }}>Aprovadas: {approvedCount}</p>
                  {reprovadoCount > 0 && <p style={{ color: C.red }}>Reprovadas: {reprovadoCount}</p>}
                </div>
              </>
            )}
          </Section>

          {/* Photo grid */}
          {hasMeas && measurements.some(m => m.fotos?.length > 0) && (
            <Section title="REGISTROS FOTOGRÁFICOS">
              <div className="space-y-4">
                {measurements.map((m, i) => {
                  if (!m.fotos || m.fotos.length === 0) return null;
                  const approved = (m.valor_medido ?? Infinity) <= lim;
                  return (
                    <div key={i}>
                      {/* Measurement header */}
                      <div className="flex items-center gap-4 p-2 rounded mb-2 relative" style={{ background: C.light }}>
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l" style={{ background: approved ? C.green : C.red }} />
                        <div className="pl-2">
                          <p className="text-sm font-bold" style={{ color: C.primary }}>Medição {i + 1}</p>
                          <div className="flex gap-4 text-xs mt-0.5">
                            <span><span className="font-bold" style={{ color: C.primary }}>LOCAL:</span> <span style={{ color: C.gray }}>{m.descricao || '-'}</span></span>
                            <span><span className="font-bold" style={{ color: C.primary }}>VALOR:</span> <span style={{ color: C.gray }}>{m.valor_medido != null ? `${m.valor_medido} Ohms` : '-'}</span></span>
                            <span><span className="font-bold" style={{ color: C.primary }}>STATUS:</span> <span className="font-bold" style={{ color: approved ? C.green : C.red }}>{approved ? 'APROVADO' : 'REPROVADO'}</span></span>
                          </div>
                        </div>
                      </div>
                      {/* Photos */}
                      <div className="grid grid-cols-2 gap-2">
                        {m.fotos.map((foto, fi) => (
                          <div key={fi} className="border p-1 text-center" style={{ borderColor: C.accent }}>
                            <a href={foto} target="_blank" rel="noreferrer">
                              <img src={foto} alt={`Foto ${fi + 1}`} className="w-full max-h-40 object-contain" />
                            </a>
                            <p className="text-xs italic mt-1" style={{ color: C.primary }}>
                              Foto {fi + 1}{m.descricao ? ` — ${m.descricao}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title="PARECER TÉCNICO">
            {para(conclusion)}
          </Section>

          {/* Final status banner */}
          <div className="rounded px-4 py-2.5 text-center text-white font-bold text-sm mt-4" style={{ background: statusColor }}>
            RESULTADO FINAL: {status === 'APROVADO' ? 'EQUIPAMENTO APTO PARA OPERAÇÃO' : status === 'REPROVADO' ? 'EQUIPAMENTO INAPTO - CORREÇÕES NECESSÁRIAS' : 'AGUARDANDO MEDIÇÕES'}
          </div>

          {report.limitacoes && (
            <Section title="LIMITAÇÕES DO ENSAIO">
              {para(report.limitacoes)}
            </Section>
          )}

          <Section title="RECOMENDAÇÕES FINAIS">
            {para(report.recomendacoes)}
          </Section>

          {/* Signatures */}
          <div className="mt-8">
            <div className="grid grid-cols-2 gap-8 mb-6">
              {/* Engineer signature */}
              <div className="text-center">
                {report.assinatura_engenheiro_url ? (
                  <img src={report.assinatura_engenheiro_url} alt="Assinatura do engenheiro" className="h-16 mx-auto" />
                ) : null}
                <div className="border-t mt-1 pt-1" style={{ borderColor: '#555' }} />
                <p className="text-sm font-bold mt-1" style={{ color: C.primary }}>{engineer?.nome || '_______________________________'}</p>
                <p className="text-xs" style={{ color: C.gray }}>Engenheiro Eletricista Responsável</p>
                {engineer?.crea_sc && <p className="text-xs" style={{ color: C.gray }}>CREA-SC: {engineer.crea_sc}</p>}
              </div>
              {/* Client signature */}
              <div className="text-center">
                {report.assinatura_cliente_url ? (
                  <img src={report.assinatura_cliente_url} alt="Assinatura do cliente" className="h-16 mx-auto" />
                ) : (
                  <div className="h-16 flex items-center justify-center">
                    <span className="text-xs" style={{ color: C.gray }}>Assinatura pendente</span>
                  </div>
                )}
                <div className="border-t mt-1 pt-1" style={{ borderColor: '#555' }} />
                <p className="text-sm font-bold mt-1" style={{ color: C.primary }}>{client?.razao_social || '_______________________________'}</p>
                <p className="text-xs" style={{ color: C.gray }}>Cliente / Contratante</p>
                {client?.cnpj && <p className="text-xs" style={{ color: C.gray }}>CNPJ: {client.cnpj}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t mx-8 py-2 flex justify-between text-xs" style={{ borderColor: C.accent, color: C.gray }}>
          <span>{company?.razao_social || 'PISON MEGAWATT'}</span>
          <span>Página 1</span>
        </div>

        {/* Signature pad section */}
        <div className="p-8 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-5 w-5" style={{ color: C.accent }} />
            <h3 className="font-bold" style={{ color: C.primary }}>Assinatura Digital do Cliente</h3>
          </div>
          <div className="rounded-lg p-3 text-sm mb-4" style={{ background: C.light, color: C.primary }}>
            <p className="font-medium mb-1">Atenção</p>
            <p>Ao assinar, você confirma que recebeu e revisou o laudo técnico acima na sua totalidade. Após confirmar, este link será invalidado e não poderá ser acessado novamente.</p>
          </div>
          <div className="bg-white rounded-lg border p-4 mb-4">
            <SignaturePad ref={sigRef} label="Assinatura do representante do cliente" />
          </div>
          <Button onClick={handleSign} disabled={signing} size="lg" className="w-full">
            <CheckCircle className="h-4 w-4 mr-2" />
            {signing ? 'Registrando...' : 'Confirmar Assinatura'}
          </Button>
          <p className="text-xs text-center mt-3" style={{ color: C.gray }}>
            Assinando como: <strong>{client?.razao_social || 'Cliente'}</strong> — CNPJ: {client?.cnpj || '-'}
          </p>
        </div>
      </div>
    </div>
  );
}