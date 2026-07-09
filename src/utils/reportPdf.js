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
  const W = 210, H = 297, M = 18;
  let y = M;
  let pageNum = 1;
  const lim = report.limite_ohms || 10;
  const measurements = report.measurements || [];
  const hasMeas = measurements.length > 0;
  const allApproved = hasMeas && measurements.every(m => (m.valor_medido ?? Infinity) <= lim);
  const status = !hasMeas ? 'RASCUNHO' : allApproved ? 'APROVADO' : 'REPROVADO';

  // Colors
  const COLOR_PRIMARY = [30, 58, 95];      // dark blue
  const COLOR_ACCENT = [45, 116, 163];    // medium blue
  const COLOR_LIGHT = [230, 238, 245];    // light blue bg
  const COLOR_GRAY = [110, 110, 110];
  const COLOR_GREEN = [0, 100, 0];
  const COLOR_RED = [180, 0, 0];

  const drawFooter = () => {
    const fy = H - 12;
    doc.setDrawColor(...COLOR_ACCENT);
    doc.setLineWidth(0.3);
    doc.line(M, fy, W - M, fy);
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_GRAY);
    doc.setFont(undefined, 'normal');
    const companyName = company?.razao_social || 'PISON MEGAWATT';
    doc.text(companyName, M, fy + 5);
    doc.text(`Página ${pageNum}`, W - M, fy + 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  };

  const ensure = (h) => {
    if (y + h > H - 20) {
      drawFooter();
      doc.addPage();
      pageNum++;
      y = M;
    }
  };

  const section = (num, title) => {
    ensure(16);
    if (y > M) y += 4;
    doc.setFillColor(...COLOR_PRIMARY);
    doc.rect(M, y - 5, W - 2 * M, 10, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${num}. ${title}`, M + 3, y + 1);
    doc.setTextColor(0, 0, 0);
    y += 12;
  };

  const kv = (label, value, labelW = 50) => {
    const val = value || '-';
    doc.setFontSize(10.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...COLOR_PRIMARY);
    const labelLines = doc.splitTextToSize(label + ':', labelW - 3);
    const valLines = doc.splitTextToSize(val, W - 2 * M - labelW);
    const maxLines = Math.max(labelLines.length, valLines.length);
    ensure(6 * maxLines + 2);
    doc.text(labelLines, M, y);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(valLines, M + labelW, y);
    y += 6 * maxLines + 2;
  };

  const para = (text, opts = {}) => {
    if (!text) return;
    const size = opts.size || 10.5;
    const justify = opts.justify !== false;
    doc.setFontSize(size);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(text, W - 2 * M);
    for (const l of lines) {
      ensure(size * 0.45 + 3);
      doc.text(l, M, y, { maxWidth: W - 2 * M, align: justify ? 'justify' : 'left' });
      y += size * 0.45 + 3;
    }
    y += 3;
  };

  // ── CAPA / CABEÇALHO ──
  // Borda decorativa topo
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(0, 0, W, 6, 'F');
  doc.setFillColor(...COLOR_ACCENT);
  doc.rect(0, 6, W, 2, 'F');

  y = 16;

  // Logos lado a lado (empresa à esquerda, cliente à direita)
  let companyLogoH = 0;
  if (company?.logo_url) {
    const img = await loadImage(company.logo_url);
    if (img) {
      const ratio = img.h / img.w;
      const iw = 38;
      const ih = iw * ratio;
      doc.addImage(img.dataURL, 'JPEG', M, y, iw, Math.min(ih, 30));
      companyLogoH = Math.min(ih, 30);
    }
  }

  if (client?.logo_url) {
    const clientImg = await loadImage(client.logo_url);
    if (clientImg) {
      const ratio = clientImg.h / clientImg.w;
      const iw = 38;
      const ih = iw * ratio;
      doc.addImage(clientImg.dataURL, 'JPEG', W - M - iw, y, iw, Math.min(ih, 30));
    }
  }
  y += Math.max(companyLogoH, 30) + 6;

  // Empresa info (abaixo do logo esquerdo)
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text(company?.razao_social || '', M, y);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLOR_GRAY);
  if (company?.cnpj) doc.text(`CNPJ: ${company.cnpj}`, M, y + 4.5);
  if (company?.fone) doc.text(`Fone: ${company.fone}`, M, y + 9);
  doc.setTextColor(0, 0, 0);

  // Cliente info (abaixo do logo direito)
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text(client?.razao_social || '', W - M, y, { align: 'right' });
  doc.setFont(undefined, 'normal');
  doc.setTextColor(...COLOR_GRAY);
  if (client?.cnpj) doc.text(`CNPJ: ${client.cnpj}`, W - M, y + 4.5, { align: 'right' });
  if (client?.cidade) doc.text(`${client.cidade}${client?.cep ? ' - CEP ' + client.cep : ''}`, W - M, y + 9, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 18;

  // Linha separadora
  doc.setDrawColor(...COLOR_ACCENT);
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 10;

  // Título principal
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('LAUDO TÉCNICO DE ATERRAMENTO', W / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(13);
  doc.setTextColor(...COLOR_ACCENT);
  doc.text('MEDIÇÃO DE RESISTÊNCIA ÔHMICA', W / 2, y, { align: 'center' });
  y += 10;

  // Box de identificação
  doc.setFillColor(...COLOR_LIGHT);
  doc.setDrawColor(...COLOR_ACCENT);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, W - 2 * M, 22, 2, 2, 'FD');
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('Equipamento:', M + 4, y + 7);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(report.equipamento || '-', M + 38, y + 7);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('Tag:', M + 4, y + 13);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(report.tag_equipamento || '-', M + 38, y + 13);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('Local / Data:', M + 4, y + 19);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${report.local || '-'}${report.data ? ' - ' + formatDate(report.data) : ''}`, M + 38, y + 19);
  doc.setTextColor(0, 0, 0);
  y += 30;

  // Status badge
  const statusColor = status === 'APROVADO' ? COLOR_GREEN : status === 'REPROVADO' ? COLOR_RED : COLOR_GRAY;
  doc.setFillColor(...statusColor);
  doc.roundedRect(W / 2 - 35, y, 70, 9, 1.5, 1.5, 'F');
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`STATUS: ${status}`, W / 2, y + 6, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 16;

  // ── 1. DADOS DO CLIENTE ──
  section(1, 'IDENTIFICAÇÃO DO CLIENTE / CONTRATANTE');
  kv('Razão Social', client?.razao_social);
  kv('CNPJ', client?.cnpj);
  kv('Endereço', client?.endereco);
  kv('Cidade', client?.cidade);
  kv('Bairro', client?.bairro);
  kv('CEP', client?.cep);
  kv('Telefone', client?.fone);

  // ── 2. EMPRESA RESPONSÁVEL ──
  section(2, 'EMPRESA RESPONSÁVEL');
  kv('Razão Social', company?.razao_social);
  kv('CNPJ', company?.cnpj);
  kv('Endereço', company?.endereco);
  kv('Telefone', company?.fone);
  kv('E-mail', company?.email);

  // ── 3. RESPONSÁVEL TÉCNICO ──
  section(3, 'RESPONSÁVEL TÉCNICO');
  kv('Nome', engineer?.nome);
  kv('CPF', engineer?.cpf);
  kv('CREA-SC', engineer?.crea_sc);

  // ── 4. ELETRICISTA EXECUTOR ──
  section(4, 'ELETRICISTA EXECUTOR');
  kv('Nome', electrician?.nome);
  kv('CPF', electrician?.cpf);
  kv('Registro Profissional', electrician?.registro_profissional);

  // ── 5. INSTRUMENTO UTILIZADO ──
  section(5, 'INSTRUMENTO DE MEDIÇÃO UTILIZADO');
  kv('Marca / Modelo', instrument?.marca_modelo);
  kv('Número de Série', instrument?.numero_serie);
  kv('Data de Calibração', instrument?.data_calibracao ? formatDate(instrument.data_calibracao) : '-');
  if (instrument?.especificacoes) {
    y += 2;
    doc.setFontSize(10.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text('Especificações Técnicas:', M, y);
    y += 6;
    para(instrument.especificacoes);
  }

  // ── 6. NORMAS E REFERÊNCIAS ──
  section(6, 'NORMAS E REFERÊNCIAS');
  para(report.normas);

  // ── 7. CONDIÇÕES DO AMBIENTE ──
  section(7, 'CONDIÇÕES DO AMBIENTE E CLIMÁTICAS');
  para(formatEnvironmentConditions(report.condicoes_ambiente));

  // ── 8. OBJETIVO ──
  section(8, 'OBJETIVO');
  para(report.objetivo);

  // ── 9. METODOLOGIA ──
  section(9, 'METODOLOGIA APLICADA');
  para(report.metodologia);

  // ── 10. ART ──
  section(10, 'Anotação de Responsabilidade Técnica (ART)');
  kv('Número da ART', report.numero_art);

  // ── 11. LEVANTAMENTO DOS DADOS ──
  section(11, 'LEVANTAMENTO DE DADOS');
  kv('Equipamento Avaliado', report.equipamento);
  kv('Tag de Identificação', report.tag_equipamento);
  kv('Limite de Referência', `${lim} Ω (Ohms)`);
  kv('Norma de Referência', 'NSCI/94 - Máximo 10 Ω');
  y += 2;
  doc.setFontSize(10);
  doc.setFont(undefined, 'italic');
  doc.setTextColor(...COLOR_GRAY);
  doc.text('Conforme NSCI/94, o valor de resistência ôhmica do sistema de aterramento não pode ser superior a 10 Ω em qualquer período do ano.', M, y, { maxWidth: W - 2 * M });
  y += 8;
  doc.setTextColor(0, 0, 0);

  // ── 12. RESULTADOS DAS MEDIÇÕES ──
  section(12, 'RESULTADOS DAS MEDIÇÕES');

  if (!hasMeas) {
    para('Nenhuma medição foi registrada neste laudo.', { justify: false });
  } else {
    // Tabela de resultados
    const colX = [M, M + 12, W - M - 55, W - M - 25, W - M];
    const colLabels = ['#', 'Descrição / Local', 'Valor Medido (Ω)', 'Limite (Ω)', 'Status'];

    // Header da tabela
    doc.setFillColor(...COLOR_PRIMARY);
    doc.rect(M, y - 5, W - 2 * M, 9, 'F');
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(colLabels[0], colX[0] + 2, y + 1);
    doc.text(colLabels[1], colX[1] + 2, y + 1);
    doc.text(colLabels[2], colX[2] + 2, y + 1, { align: 'center' });
    doc.text(colLabels[3], colX[3] + 2, y + 1, { align: 'center' });
    doc.text(colLabels[4], colX[4] - 2, y + 1, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 9;

    for (let i = 0; i < measurements.length; i++) {
      const m = measurements[i];
      const approved = (m.valor_medido ?? Infinity) <= lim;
      const rowH = 8;

      ensure(rowH);
      // Zebra striping
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(M, y - 5, W - 2 * M, rowH, 'F');
      }

      doc.setFontSize(9.5);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLOR_PRIMARY);
      doc.text(`${i + 1}`, colX[0] + 2, y + 1);

      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      const descLines = doc.splitTextToSize(m.descricao || '-', colX[2] - colX[1] - 6);
      const actualRowH = Math.max(rowH, 5.5 * descLines.length + 3);
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(M, y - 5, W - 2 * M, actualRowH, 'F');
      }
      doc.text(descLines, colX[1] + 2, y + 1);

      doc.setFont(undefined, 'bold');
      doc.text(m.valor_medido != null ? `${m.valor_medido}` : '-', colX[2] + 2, y + 1, { align: 'center' });
      doc.setFont(undefined, 'normal');
      doc.text(`${lim}`, colX[3] + 2, y + 1, { align: 'center' });

      doc.setFont(undefined, 'bold');
      doc.setTextColor(...(approved ? COLOR_GREEN : COLOR_RED));
      doc.text(approved ? 'APROVADO' : 'REPROVADO', colX[4] - 2, y + 1, { align: 'right' });
      doc.setTextColor(0, 0, 0);

      y += actualRowH;
    }

    // Borda da tabela
    doc.setDrawColor(...COLOR_ACCENT);
    doc.setLineWidth(0.3);
    doc.rect(M, y - 5 - (measurements.length * 8 + 9) + 9, W - 2 * M, y - (y - 5 - (measurements.length * 8 + 9) + 9));

    y += 4;

    // Resumo
    ensure(12);
    doc.setFontSize(10.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text(`Total de medições realizadas: ${measurements.length}`, M, y);
    y += 6;
    const approvedCount = measurements.filter(m => (m.valor_medido ?? Infinity) <= lim).length;
    const reprovadoCount = measurements.length - approvedCount;
    doc.setTextColor(...COLOR_GREEN);
    doc.text(`Aprovadas: ${approvedCount}`, M, y);
    if (reprovadoCount > 0) {
      doc.setTextColor(...COLOR_RED);
      doc.text(`Reprovadas: ${reprovadoCount}`, M + 50, y);
    }
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  // Fotos das medições
  if (hasMeas) {
    section(13, 'REGISTROS FOTOGRÁFICOS');
    for (let i = 0; i < measurements.length; i++) {
      const m = measurements[i];
      if (!m.fotos || m.fotos.length === 0) continue;
      ensure(14);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLOR_PRIMARY);
      doc.text(`Medição ${i + 1}${m.descricao ? ' - ' + m.descricao : ''}`, M, y);
      doc.setTextColor(0, 0, 0);
      y += 6;

      let x = M;
      const pw = 50;
      let rowMaxH = 0;
      for (const fotoUrl of m.fotos) {
        const img = await loadImage(fotoUrl);
        if (!img) continue;
        const ratio = img.h / img.w;
        const ph = pw * ratio;
        if (x + pw > W - M) {
          x = M;
          y += rowMaxH + 5;
          rowMaxH = 0;
        }
        ensure(ph + 8);
        doc.setDrawColor(...COLOR_ACCENT);
        doc.setLineWidth(0.2);
        doc.rect(x - 1, y - 4, pw + 2, ph + 2);
        doc.addImage(img.dataURL, 'JPEG', x, y - 3, pw, ph);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...COLOR_GRAY);
        doc.text(`Foto ${m.fotos.indexOf(fotoUrl) + 1}`, x + pw / 2, y + ph, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        x += pw + 4;
        rowMaxH = Math.max(rowMaxH, ph);
      }
      y += rowMaxH + 8;
    }
  }

  // ── PARECER TÉCNICO ──
  section(hasMeas ? 14 : 13, 'PARECER TÉCNICO');
  const conclusion = allApproved
    ? `Após a coleta e análise dos dados obtidos mediante medição realizada com instrumento calibrado, conclui-se que os valores de resistência ôhmica do aterramento da máquina/equipamento avaliado estão DENTRO dos padrões pré-estabelecidos pela NSCI/94 (Norma de Segurança contra Incêndio) e atendem aos requisitos de segurança estabelecidos pela NR-12 (Segurança no Trabalho em Máquinas e Equipamentos).\n\nConforme a referida norma, o sistema de aterramento não poderá apresentar resistência superior a ${lim} Ω (Ohms) em qualquer época do ano. Todos os pontos medidos apresentaram valores iguais ou inferiores ao limite estabelecido.\n\nPortanto, atesta-se que este equipamento, para fins de aterramento elétrico e proteção contra descargas atmosféricas, está APTO para operação contínua, estando em conformidade com as exigências do Corpo de Bombeiros da Polícia Militar do Estado de Santa Catarina (Resolução nº 017/CAT/CCB/88) e do PPCI da empresa.`
    : hasMeas
    ? `Após a coleta e análise dos dados obtidos mediante medição realizada com instrumento calibrado, conclui-se que uma ou mais medições apresentaram valores de resistência ôhmica ACIMA do limite máximo de ${lim} Ω (Ohms) estabelecido pela NSCI/94 e NR-12.\n\nPortanto, atesta-se que o sistema de aterramento da máquina/equipamento avaliado está INAPTO para operação, sendo necessárias intervenções corretivas no sistema de aterramento para adequação aos padrões de segurança exigidos.\n\nRecomenda-se a execução imediata de medidas corretivas, seguida de nova medição de verificação para confirmação da conformidade.`
    : 'Laudo sem medições registradas. O parecer técnico será emitido após a realização das medições de resistência ôhmica de aterramento.';
  para(conclusion);

  // Status final
  ensure(12);
  y += 2;
  doc.setFillColor(...statusColor);
  doc.roundedRect(M, y - 5, W - 2 * M, 10, 1.5, 1.5, 'F');
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`RESULTADO FINAL: ${status === 'APROVADO' ? 'EQUIPAMENTO APTO PARA OPERAÇÃO' : status === 'REPROVADO' ? 'EQUIPAMENTO INAPTO - CORREÇÕES NECESSÁRIAS' : 'AGUARDANDO MEDIÇÕES'}`, W / 2, y + 1.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 14;

  // ── LIMITAÇÕES ──
  if (report.limitacoes) {
    section(hasMeas ? 15 : 14, 'LIMITAÇÕES DO ENSAIO');
    para(report.limitacoes);
  }

  // ── RECOMENDAÇÕES ──
  section(hasMeas ? (report.limitacoes ? 16 : 15) : (report.limitacoes ? 15 : 14), 'RECOMENDAÇÕES FINAIS');
  para(report.recomendacoes);

  // ── ASSINATURAS ──
  ensure(45);
  y += 12;
  doc.setDrawColor(80);
  doc.setLineWidth(0.4);
  const sigY = y + 20;
  doc.line(M, sigY, M + 75, sigY);
  doc.line(W - M - 75, sigY, W - M, sigY);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text(engineer?.nome || '_______________________________', M, sigY + 5);
  doc.text(company?.razao_social || '', W - M - 75, sigY + 5, { maxWidth: 75 });
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_GRAY);
  doc.text('Engenheiro Eletricista Responsável', M, sigY + 10);
  doc.text('Representante Legal', W - M - 75, sigY + 10);
  if (engineer?.crea_sc) {
    doc.text(`CREA-SC: ${engineer.crea_sc}`, M, sigY + 15);
  }
  doc.setTextColor(0, 0, 0);

  // Rodapé final
  drawFooter();

  doc.save(`Laudo-${report.equipamento || 'Aterramento'}.pdf`);
}