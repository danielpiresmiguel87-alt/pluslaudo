import { jsPDF } from 'jspdf';
import { formatEnvironmentConditions } from '@/utils/environment';

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve({ dataURL: canvas.toDataURL('image/jpeg', 0.85), w: img.naturalWidth, h: img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
}

export async function generateReportPDF(report, data) {
  const { company, client, engineer, electrician, instrument } = data;
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = 210, H = 297, M = 15;
  let y = M;
  const lim = report.limite_ohms || 10;
  const measurements = report.measurements || [];
  const hasMeas = measurements.length > 0;
  const allApproved = hasMeas && measurements.every(m => (m.valor_medido ?? Infinity) <= lim);
  const status = !hasMeas ? 'RASCUNHO' : allApproved ? 'APROVADO' : 'REPROVADO';

  const ensure = (h) => { if (y + h > H - M) { doc.addPage(); y = M; } };
  const section = (title) => {
    ensure(14);
    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.setFillColor(235, 235, 235);
    doc.rect(M, y - 4, W - 2 * M, 8, 'F');
    doc.text(title, M + 2, y + 1);
    y += 10;
  };
  const kv = (label, value) => {
    const val = value || '-';
    doc.setFontSize(9); doc.setFont(undefined, 'bold');
    const lines = doc.splitTextToSize(val, W - 2 * M - 45);
    ensure(5 * lines.length + 1);
    doc.text(label + ':', M, y);
    doc.setFont(undefined, 'normal');
    doc.text(lines, M + 45, y);
    y += 5 * lines.length + 1;
  };
  const para = (text) => {
    if (!text) return;
    doc.setFontSize(9); doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(text, W - 2 * M);
    for (const l of lines) { ensure(5); doc.text(l, M, y); y += 5; }
    y += 2;
  };

  if (company?.logo_url) {
    const img = await loadImage(company.logo_url);
    if (img) {
      const ratio = img.h / img.w;
      doc.addImage(img.dataURL, 'JPEG', M, y, 35, 35 * ratio);
      y += 35 * ratio + 5;
    }
  }

  doc.setFontSize(14); doc.setFont(undefined, 'bold');
  doc.text('LAUDO DE ATERRAMENTO: RESISTÊNCIA ÔHMICA', W / 2, y, { align: 'center' });
  y += 7;
  if (report.equipamento) { doc.setFontSize(11); doc.text(report.equipamento, W / 2, y, { align: 'center' }); y += 6; }
  if (report.local || report.data) {
    doc.setFontSize(10); doc.setFont(undefined, 'normal');
    doc.text(`${report.local || ''}${report.data ? ' - ' + formatDate(report.data) : ''}`, W / 2, y, { align: 'center' });
    y += 8;
  }

  section('1. DADOS DA AVALIAÇÃO');
  kv('CNPJ', client?.cnpj);
  kv('Razão Social', client?.razao_social);
  kv('Endereço', client?.endereco);
  kv('Cidade', client?.cidade);
  kv('CEP', client?.cep);
  kv('Bairro', client?.bairro);
  kv('Fone', client?.fone);

  section('1.2 EMPRESA RESPONSÁVEL');
  kv('Razão Social', company?.razao_social);
  kv('CNPJ', company?.cnpj);
  kv('Endereço', company?.endereco);
  kv('Fone', company?.fone);

  section('1.3 RESPONSÁVEL TÉCNICO');
  kv('Nome', engineer?.nome);
  kv('CPF', engineer?.cpf);
  kv('CREA SC', engineer?.crea_sc);

  section('1.4 ELETRICISTA EXECUTOR');
  kv('Nome', electrician?.nome);
  kv('CPF', electrician?.cpf);
  kv('Registro', electrician?.registro_profissional);

  section('2. NORMAS E REFERÊNCIAS');
  para(report.normas);

  section('3. CONDIÇÕES DO AMBIENTE E CLIMÁTICAS');
  para(formatEnvironmentConditions(report.condicoes_ambiente));

  section('4. OBJETIVO');
  para(report.objetivo);

  section('5. METODOLOGIA');
  para(report.metodologia);

  section('6. EQUIPAMENTO UTILIZADO');
  kv('Marca/Modelo', instrument?.marca_modelo);
  kv('Nº de Série', instrument?.numero_serie);
  kv('Última Calibração', instrument?.data_calibracao ? formatDate(instrument.data_calibracao) : '-');
  if (instrument?.especificacoes) para(instrument.especificacoes);

  section('7. ART');
  kv('Número da ART', report.numero_art);

  section('8. LEVANTAMENTO DOS DADOS');
  kv('Equipamento', report.equipamento);
  kv('Tag do Equipamento', report.tag_equipamento);
  kv('Limite de Referência', `${lim} Ohms`);

  for (let i = 0; i < measurements.length; i++) {
    const m = measurements[i];
    const approved = (m.valor_medido ?? Infinity) <= lim;
    ensure(20);
    doc.setFontSize(10); doc.setFont(undefined, 'bold');
    doc.text(`Medição ${i + 1}`, M, y);
    y += 6;
    kv('Local / Descrição', m.descricao);
    kv('Valor Medido', m.valor_medido != null ? `${m.valor_medido} Ohms` : '-');
    ensure(6);
    doc.setFont(undefined, 'bold');
    if (approved) { doc.setTextColor(0, 100, 0); doc.text('Status: APROVADO', M, y); }
    else { doc.setTextColor(200, 0, 0); doc.text('Status: REPROVADO', M, y); }
    doc.setTextColor(0, 0, 0);
    y += 8;

    if (m.fotos && m.fotos.length) {
      let x = M;
      const pw = 40;
      for (const fotoUrl of m.fotos) {
        const img = await loadImage(fotoUrl);
        if (!img) continue;
        const ratio = img.h / img.w;
        const ph = pw * ratio;
        if (x + pw > W - M) { x = M; y += 45; }
        ensure(ph + 5);
        doc.addImage(img.dataURL, 'JPEG', x, y, pw, ph);
        x += pw + 3;
      }
      y += 45;
    }
    y += 4;
  }

  section('9. PARECER TÉCNICO');
  const conclusion = allApproved
    ? `Após a coleta e análise dos dados obtidos, conclui-se que os valores de resistência ôhmica do aterramento da máquina/equipamento estão DENTRO dos padrões pré-estabelecidos na NSCI/94 (norma de segurança contra incêndio) e atendem aos requisitos de segurança da NR-12. Conforme seção IV do referido capítulo, o sistema de aterramento não poderá ser superior a ${lim} OHMS em qualquer época do ano. Para tanto, afirma-se que este equipamento, para fins de aterramento, está APTO para operação.`
    : hasMeas
    ? `Após a coleta e análise dos dados obtidos, conclui-se que uma ou mais medições apresentaram valores ACIMA do limite de ${lim} Ohms estabelecido pela NSCI/94 e NR-12. Portanto, afirma-se que o sistema de aterramento da máquina/equipamento está INAPTO para operação, sendo necessárias correções para adequação aos padrões.`
    : 'Laudo sem medições registradas.';
  para(conclusion);
  ensure(8);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text(`Status do Laudo: ${status}`, M, y);
  y += 8;

  if (report.limitacoes) {
    section('10. LIMITAÇÕES DO ENSAIO');
    para(report.limitacoes);
  }

  section('11. RECOMENDAÇÕES FINAIS');
  para(report.recomendacoes);

  ensure(30);
  y += 15;
  doc.setDrawColor(150);
  doc.line(M, y, M + 70, y);
  doc.line(W - M - 70, y, W - M, y);
  doc.setFontSize(9); doc.setFont(undefined, 'normal');
  doc.text(engineer?.nome || '___________________', M, y + 5);
  doc.text('Engenheiro Eletricista', M, y + 10);
  doc.text(`CREA SC: ${engineer?.crea_sc || '____'}`, M, y + 15);

  doc.save(`Laudo-${report.equipamento || 'Aterramento'}.pdf`);
}