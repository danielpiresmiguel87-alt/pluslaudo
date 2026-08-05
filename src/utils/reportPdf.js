import { jsPDF } from 'jspdf';
import { formatEnvironmentConditions } from '@/utils/environment';
import { INSPECTION_ITEMS } from '@/utils/inspectionItems';

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
        resolve({ img, w: img.naturalWidth, h: img.naturalHeight });
      }
    };
    img.onerror = () => {
      // Retry without crossOrigin (allows load but canvas will be tainted)
      const img2 = new Image();
      img2.onload = () => resolve({ img: img2, w: img2.naturalWidth, h: img2.naturalHeight });
      img2.onerror = () => resolve(null);
      img2.src = url;
    };
    img.src = url;
  });
}

async function loadPdfjs() {
  if (window._pdfjsPromise) return window._pdfjsPromise;
  window._pdfjsPromise = (async () => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    return pdfjs;
  })();
  return window._pdfjsPromise;
}

async function renderPdfPagesToImages(url) {
  const pdfjs = await loadPdfjs();
  const pdf = await pdfjs.getDocument(url).promise;
  const images = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push({ dataURL: canvas.toDataURL('image/jpeg', 0.92), w: viewport.width, h: viewport.height });
  }
  return images;
}

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
}

function addImg(doc, imgData, x, y, w, h) {
  if (imgData.img) {
    doc.addImage(imgData.img, x, y, w, h);
  } else if (imgData.dataURL) {
    doc.addImage(imgData.dataURL, 'JPEG', x, y, w, h);
  }
}

// Quebra o texto em linhas que cabem em maxW; se passar de maxLines, trunca com "…".
function fitLines(doc, text, maxW, maxLines = 2) {
  if (!text) return [];
  const lines = doc.splitTextToSize(text, maxW);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  // Trunca a última linha para incluir reticências
  let last = kept[maxLines - 1];
  while (doc.getTextWidth(last + '…') > maxW && last.length > 0) last = last.slice(0, -1);
  kept[maxLines - 1] = last + '…';
  return kept;
}

export async function generateReportPDF(report, data) {
  const { company, client, engineer, electrician, instrument } = data;
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = 210, H = 297, M = 18;
  let y = M;
  let pageNum = 1;
  let secNum = 0;
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

  const section = (title) => {
    secNum++;
    // ensure header + at least some body text fit together (keep-with-next)
    ensure(36);
    if (y > M) y += 4;
    doc.setFillColor(...COLOR_PRIMARY);
    doc.rect(M, y - 5, W - 2 * M, 10, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${secNum}. ${title}`, M + 3, y + 1);
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
    const size = opts.size || 11.5;
    const justify = opts.justify !== false;
    doc.setFontSize(size);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(text, W - 2 * M);
    for (const l of lines) {
      ensure(size * 0.42 + 3.5);
      // ensure() pode chamar drawFooter() que altera fonte/tamanho — redefinir
      doc.setFontSize(size);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(l, M, y, { align: justify ? 'justify' : 'left' });
      y += size * 0.42 + 3.5;
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
      addImg(doc, img, M, y, iw, Math.min(ih, 30));
      companyLogoH = Math.min(ih, 30);
    }
  }

  if (client?.logo_url) {
    const clientImg = await loadImage(client.logo_url);
    if (clientImg) {
      const ratio = clientImg.h / clientImg.w;
      const iw = 38;
      const ih = iw * ratio;
      addImg(doc, clientImg, W - M - iw, y, iw, Math.min(ih, 30));
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
  section('IDENTIFICAÇÃO DO CLIENTE / CONTRATANTE');
  kv('Razão Social', client?.razao_social);
  kv('CNPJ', client?.cnpj);
  kv('Endereço', client?.endereco);
  kv('Cidade', client?.cidade);
  kv('Bairro', client?.bairro);
  kv('CEP', client?.cep);
  kv('Telefone', client?.fone);

  // ── 2. EMPRESA RESPONSÁVEL ──
  section('EMPRESA RESPONSÁVEL');
  kv('Razão Social', company?.razao_social);
  kv('CNPJ', company?.cnpj);
  kv('Endereço', company?.endereco);
  kv('Telefone', company?.fone);
  kv('E-mail', company?.email);

  // ── 3. RESPONSÁVEL TÉCNICO ──
  section('RESPONSÁVEL TÉCNICO');
  kv('Nome', engineer?.nome);
  kv('CPF', engineer?.cpf);
  kv('CREA-SC', engineer?.crea_sc);

  // ── 4. ELETRICISTA EXECUTOR ──
  section('ELETRICISTA EXECUTOR');
  kv('Nome', electrician?.nome);
  kv('CPF', electrician?.cpf);
  kv('Registro Profissional', electrician?.registro_profissional);

  // ── INSTRUMENTO UTILIZADO ──
  section('INSTRUMENTO DE MEDIÇÃO UTILIZADO');
  kv('Marca / Modelo', instrument?.marca_modelo);
  kv('Número de Série', instrument?.numero_serie);
  if (report.mostrar_data_calibracao !== false) {
    kv('Data de Calibração', instrument?.data_calibracao ? formatDate(instrument.data_calibracao) : '-');
  }
  if (instrument?.especificacoes) {
    y += 2;
    doc.setFontSize(10.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text('Especificações Técnicas:', M, y);
    y += 6;
    para(instrument.especificacoes);
  }

  // Certificado de Calibração (anexo ao item 5)
  if (instrument?.certificado_calibracao_url) {
    ensure(10);
    doc.setFontSize(10.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text('Certificado de Calibração/Aferição:', M, y);
    y += 6;
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...COLOR_ACCENT);
    doc.setFontSize(9.5);
    doc.text('(Anexado ao final deste documento)', M, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  }

  // ── 6. NORMAS E REFERÊNCIAS ──
  section('NORMAS E REFERÊNCIAS');
  para(report.normas);

  // ── 7. CONDIÇÕES DO AMBIENTE ──
  section('CONDIÇÕES DO AMBIENTE E CLIMÁTICAS');
  para(formatEnvironmentConditions(report.condicoes_ambiente));

  // ── 8. OBJETIVO ──
  section('OBJETIVO');
  para(report.objetivo || '');

  // ── 9. METODOLOGIA ──
  section('METODOLOGIA APLICADA');
  para(report.metodologia || '');

  // Diagramas ilustrativos da metodologia
  const metodologiaImgs = [
    'https://media.base44.com/images/public/6a4f95ae9ed008261810a9f7/01e2c4023_image.png',
    'https://media.base44.com/images/public/6a4f95ae9ed008261810a9f7/eee8ea9b2_image.png',
  ];
  for (const diagramUrl of metodologiaImgs) {
    const img = await loadImage(diagramUrl);
    if (!img) continue;
    const maxW = 110;
    const ratio = img.h / img.w;
    let iw = maxW;
    let ih = iw * ratio;
    const maxH = 75;
    if (ih > maxH) { ih = maxH; iw = ih / ratio; }
    ensure(ih + 12);
    const ix = (W - iw) / 2;
    doc.setDrawColor(...COLOR_ACCENT);
    doc.setLineWidth(0.3);
    doc.rect(ix - 1, y - 1, iw + 2, ih + 2);
    addImg(doc, img, ix, y, iw, ih);
    y += ih + 8;
  }

  // ── 10. ART ──
  section('ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA (ART)');
  kv('Número da ART', report.numero_art);

  // ── 11. LEVANTAMENTO DOS DADOS ──
  section('LEVANTAMENTO DE DADOS');
  kv('Equipamento Avaliado', report.equipamento);
  kv('Tag de Identificação', report.tag_equipamento);
  kv('Limite de Referência', `${lim} Ohms`);
  kv('Norma de Referência', 'NSCI/94 - Máximo 10 Ohms');
  y += 2;
  doc.setFontSize(10);
  doc.setFont(undefined, 'italic');
  doc.setTextColor(...COLOR_GRAY);
  doc.text('Conforme NSCI/94, o valor de resistência ôhmica do sistema de aterramento não pode ser superior a 10 Ohms em qualquer período do ano.', M, y, { maxWidth: W - 2 * M });
  y += 8;
  doc.setTextColor(0, 0, 0);

  // ── ITENS VERIFICADOS NO EQUIPAMENTO ──
  section('ITENS VERIFICADOS NO EQUIPAMENTO');
  const itensVerificados = report.itens_verificados || INSPECTION_ITEMS.map(() => true);
  const checkboxSize = 4;
  const checkboxGap = 3;
  const textIndent = checkboxSize + checkboxGap + 2;

  INSPECTION_ITEMS.forEach((item, idx) => {
    const ok = itensVerificados[idx] !== false;
    const fullText = `${item.label}: ${item.description}`;
    const textW = W - 2 * M - textIndent - 12;

    doc.setFontSize(11.5);
    doc.setFont(undefined, 'bold');
    const lines = doc.splitTextToSize(fullText, textW);
    const blockH = Math.max(checkboxSize, lines.length * (11.5 * 0.42 + 3.5)) + 4;
    ensure(blockH);

    // Checkbox
    const cbX = M + 2;
    const cbY = y - checkboxSize + 1;
    doc.setDrawColor(...COLOR_PRIMARY);
    doc.setLineWidth(0.5);
    doc.rect(cbX, cbY, checkboxSize, checkboxSize);
    if (ok) {
      doc.setDrawColor(...COLOR_GREEN);
      doc.setLineWidth(1);
      doc.line(cbX + 0.8, cbY + checkboxSize / 2, cbX + checkboxSize / 2 - 0.3, cbY + checkboxSize - 1.2);
      doc.line(cbX + checkboxSize / 2 - 0.3, cbY + checkboxSize - 1.2, cbX + checkboxSize - 0.8, cbY + 1);
      doc.setDrawColor(...COLOR_PRIMARY);
      doc.setLineWidth(0.5);
    }

    // Label (bold) + description (normal)
    doc.setFontSize(11.5);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text(lines[0], M + textIndent, y);

    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    for (let i = 1; i < lines.length; i++) {
      y += 11.5 * 0.42 + 3.5;
      doc.text(lines[i], M + textIndent, y);
    }

    // Status label (OK / Pendente) à direita da primeira linha
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...(ok ? COLOR_GREEN : COLOR_RED));
    doc.text(ok ? 'OK' : 'PENDENTE', W - M - 2, y - (lines.length - 1) * (11.5 * 0.42 + 3.5), { align: 'right' });
    doc.setTextColor(0, 0, 0);

    y += 11.5 * 0.42 + 3.5 + 4;
  });

  // ── 12. RESULTADOS DAS MEDIÇÕES ──
  section('RESULTADOS DAS MEDIÇÕES');

  if (!hasMeas) {
    para('Nenhuma medição foi registrada neste laudo.', { justify: false });
  } else {
    // Tabela de resultados — larguras somam W - 2*M (174mm)
    const colW = [8, 78, 28, 28, 32];
    const colX = [M, M + 8, M + 86, M + 114, M + 142];
    const colLabels = ['Nº', 'Descrição / Local', 'Valor (Ohms)', 'Limite (Ohms)', 'Status'];

    // Função para desenhar bordas de uma seção da tabela (linha por linha, evita travessia de página)
    const drawTableBorders = (top, bottom) => {
      doc.setDrawColor(...COLOR_ACCENT);
      doc.setLineWidth(0.3);
      doc.rect(M, top, W - 2 * M, bottom - top);
      doc.setLineWidth(0.2);
      for (let c = 1; c < colX.length; c++) {
        doc.line(colX[c], top, colX[c], bottom);
      }
    };

    // Função para desenhar o cabeçalho da tabela (reutilizada em quebras de página)
    const drawTableHeader = () => {
      doc.setFillColor(...COLOR_PRIMARY);
      doc.rect(M, y - 5, W - 2 * M, 9, 'F');
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(colLabels[0], colX[0] + colW[0] / 2, y + 1, { align: 'center' });
      doc.text(colLabels[1], colX[1] + 2, y + 1);
      doc.text(colLabels[2], colX[2] + colW[2] / 2, y + 1, { align: 'center' });
      doc.text(colLabels[3], colX[3] + colW[3] / 2, y + 1, { align: 'center' });
      doc.text(colLabels[4], colX[4] + colW[4] / 2, y + 1, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 9;
    };

    // Header da tabela (primeira página)
    drawTableHeader();

    let pageTop = y - 5;  // topo da tabela na página atual
    for (let i = 0; i < measurements.length; i++) {
      const m = measurements[i];
      const approved = (m.valor_medido ?? Infinity) <= lim;

      doc.setFontSize(9.5);
      doc.setFont(undefined, 'normal');
      const descLines = doc.splitTextToSize(m.descricao || '-', colW[1] - 4);
      const rowH = Math.max(8, 5.5 * descLines.length + 3);

      // Se a linha não couber, fecha a borda da página atual e repete o cabeçalho na nova
      if (y + rowH > H - 20) {
        drawTableBorders(pageTop, y);
        drawFooter();
        doc.addPage();
        pageNum++;
        y = M;
        drawTableHeader();
        pageTop = y - 5;
      }

      // Zebra striping PRIMEIRO (antes do texto)
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(M, y - 5, W - 2 * M, rowH, 'F');
      }

      // Agora o texto
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLOR_PRIMARY);
      doc.text(`${i + 1}`, colX[0] + colW[0] / 2, y + 1, { align: 'center' });

      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(descLines, colX[1] + 2, y + 1);

      doc.setFont(undefined, 'bold');
      doc.text(m.valor_medido != null ? `${m.valor_medido}` : '-', colX[2] + colW[2] / 2, y + 1, { align: 'center' });
      doc.setFont(undefined, 'normal');
      doc.text(`${lim}`, colX[3] + colW[3] / 2, y + 1, { align: 'center' });

      doc.setFont(undefined, 'bold');
      doc.setTextColor(...(approved ? COLOR_GREEN : COLOR_RED));
      doc.setFontSize(8.5);
      doc.text(approved ? 'APROVADO' : 'REPROVADO', colX[4] + colW[4] / 2, y + 1, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9.5);

      y += rowH;
    }

    // Fecha a borda da última página da tabela
    drawTableBorders(pageTop, y);

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
    section('REGISTROS FOTOGRÁFICOS');
    for (let i = 0; i < measurements.length; i++) {
      const m = measurements[i];
      if (!m.fotos || m.fotos.length === 0) continue;

      const approved = (m.valor_medido ?? Infinity) <= lim;

      // ── Box de cabeçalho da medição ──
      // Barra lateral colorida (verde/vermelho conforme status)
      const headerH = 20;
      ensure(headerH + 6);
      doc.setFillColor(...COLOR_LIGHT);
      doc.rect(M, y - 4, W - 2 * M, headerH, 'F');
      doc.setFillColor(...(approved ? COLOR_GREEN : COLOR_RED));
      doc.rect(M, y - 4, 3, headerH, 'F');

      // Linha 1: "Medição N"
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLOR_PRIMARY);
      doc.text(`Medição ${i + 1}`, M + 7, y + 1);

      // Linha 2: LOCAL / VALOR MEDIDO / STATUS com labels
      doc.setFontSize(9.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLOR_GRAY);
      const valStr = m.valor_medido != null ? `${m.valor_medido} Ohms` : '-';
      const statusStr = approved ? 'APROVADO' : 'REPROVADO';

      const labelX = M + 7;
      const localX = labelX + 17;
      const valorLabelX = localX + 42;
      const valorX = valorLabelX + 30;
      const statusLabelX = valorX + 22;

      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLOR_PRIMARY);
      doc.text('LOCAL:', labelX, y + 9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLOR_GRAY);
      doc.text(m.descricao || '-', localX, y + 9);

      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLOR_PRIMARY);
      doc.text('VALOR:', valorLabelX, y + 9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...COLOR_GRAY);
      doc.text(valStr, valorX, y + 9);

      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLOR_PRIMARY);
      doc.text('STATUS:', statusLabelX, y + 9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...(approved ? COLOR_GREEN : COLOR_RED));
      doc.text(statusStr, statusLabelX + 16, y + 9);

      doc.setTextColor(0, 0, 0);
      y += headerH + 2;

      // ── Fotos em grid 3 colunas ──
      const gap = 4;
      const cellW = (W - 2 * M - 2 * gap) / 3;
      const maxPhotoH = 65;
      let col = 0;
      let rowStartY = y;
      let rowMaxH = 0;
      let fotoNum = 0;

      for (const fotoUrl of m.fotos) {
        const img = await loadImage(fotoUrl);
        if (!img) continue;
        fotoNum++;
        const ratio = img.h / img.w;
        let iw = cellW;
        let ih = iw * ratio;
        if (ih > maxPhotoH) { ih = maxPhotoH; iw = ih / ratio; }
        const captionH = 8;
        const cellH = ih + captionH;
        if (cellH > rowMaxH) rowMaxH = cellH;

        if (col === 0) {
          ensure(rowMaxH + 4);
          rowStartY = y;
        } else {
          ensure(cellH + 4);
        }

        const cx = M + col * (cellW + gap) + (cellW - iw) / 2;
        const cy = y;

        // Moldura
        doc.setDrawColor(...COLOR_ACCENT);
        doc.setLineWidth(0.3);
        doc.setFillColor(255, 255, 255);
        doc.rect(cx - 1, cy - 1, iw + 2, ih + 2, 'FD');
        addImg(doc, img, cx, cy, iw, ih);

        // Legenda
        doc.setFontSize(8.5);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(...COLOR_PRIMARY);
        const legenda = m.descricao
          ? `Foto ${fotoNum} — ${m.descricao}`
          : `Foto ${fotoNum}`;
        const capLines = doc.splitTextToSize(legenda, cellW - 2);
        doc.text(capLines[0] || legenda, cx + iw / 2, cy + ih + 4.5, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        col++;
        if (col >= 3) {
          y = rowStartY + rowMaxH + 6;
          col = 0;
          rowMaxH = 0;
        }
      }
      // Linha final parcial
      if (col > 0) {
        y = rowStartY + rowMaxH + 6;
      }
      y += 4;
    }
  }

  // ── PARECER TÉCNICO ──
  section('PARECER TÉCNICO');
  const conclusion = allApproved
    ? `Após a inspeção visual, a coleta e a análise instrumental dos dados, conclui-se que o sistema de aterramento e a equipotencialização dos equipamentos avaliados encontram-se em plenas condições de funcionamento e segurança. Os valores de impedância aferidos demonstram a efetiva continuidade elétrica da malha e a correta interligação das massas, garantindo o escoamento seguro de correntes de falta. Os resultados atendem integralmente aos parâmetros de segurança estabelecidos pelas normativas vigentes.\n\nNa data da inspeção, com base nas inspeções visuais e medições registradas neste documento, atesta-se que o sistema de aterramento do equipamento encontra-se CONFORME, estando os equipamentos APTOS PARA OPERAÇÃO.`
    : hasMeas
    ? `Após a inspeção visual, a coleta e a análise instrumental dos dados, conclui-se que o sistema de aterramento e a equipotencialização dos equipamentos avaliados NÃO atendem integralmente aos parâmetros de segurança estabelecidos pelas normativas vigentes. Os valores de impedância aferidos demonstram que uma ou mais medições apresentaram valores ACIMA do limite máximo de ${lim} Ohms estabelecido pela NR-10, ABNT NBR 5410, ABNT NBR 15749 e IN nº 19 do CBMSC.\n\nNa data da inspeção, atesta-se que o sistema de aterramento do equipamento encontra-se NÃO CONFORME, sendo necessárias intervenções corretivas imediatas no sistema de aterramento para adequação aos padrões de segurança exigidos. Recomenda-se a execução imediata de medidas corretivas, seguida de nova medição de verificação para confirmação da conformidade.`
    : 'Laudo sem medições registradas. O parecer técnico será emitido após a realização das medições de impedância e continuidade elétrica do sistema de aterramento.';
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
    section('LIMITAÇÕES DO ENSAIO');
    para(report.limitacoes);
  }

  // ── RECOMENDAÇÕES ──
  section('RECOMENDAÇÕES FINAIS');
  para(report.recomendacoes);

  // ── ASSINATURAS ── (engenheiro e cliente lado a lado)
  let engSigImg = null;
  let cliSigImg = null;
  if (report.assinatura_engenheiro_url) engSigImg = await loadImage(report.assinatura_engenheiro_url);
  if (report.assinatura_cliente_url) cliSigImg = await loadImage(report.assinatura_cliente_url);

  const sigImgH = 22;
  ensure(sigImgH + 40);
  y += 8;
  doc.setDrawColor(80);
  doc.setLineWidth(0.4);
  const sigY = y + sigImgH;
  const sigW = (W - 2 * M - 20) / 2;
  const engX = M;
  const cliX = M + sigW + 20;

  // Assinatura do engenheiro (imagem acima da linha)
  if (engSigImg) {
    const ratio = engSigImg.h / engSigImg.w;
    let iw = sigW * 0.8;
    let ih = iw * ratio;
    if (ih > sigImgH) { ih = sigImgH; iw = ih / ratio; }
    addImg(doc, engSigImg, engX + (sigW - iw) / 2, sigY - ih, iw, ih);
  }
  // Linha de assinatura do engenheiro
  doc.line(engX, sigY, engX + sigW, sigY);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLOR_PRIMARY);
  const engLines = fitLines(doc, engineer?.nome || '_______________________________', sigW, 2);
  const engLabelOff = 5 + engLines.length * 4.5;
  engLines.forEach((l, i) => doc.text(l, engX, sigY + 5 + i * 4.5));
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_GRAY);
  doc.text('Engenheiro Eletricista Responsável', engX, sigY + engLabelOff);
  if (engineer?.crea_sc) {
    doc.text(`CREA-SC: ${engineer.crea_sc}`, engX, sigY + engLabelOff + 5);
  }
  doc.setTextColor(0, 0, 0);

  // Assinatura do cliente (imagem acima da linha)
  if (cliSigImg) {
    const ratio = cliSigImg.h / cliSigImg.w;
    let iw = sigW * 0.8;
    let ih = iw * ratio;
    if (ih > sigImgH) { ih = sigImgH; iw = ih / ratio; }
    addImg(doc, cliSigImg, cliX + (sigW - iw) / 2, sigY - ih, iw, ih);
  }
  // Linha de assinatura do cliente
  doc.line(cliX, sigY, cliX + sigW, sigY);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...COLOR_PRIMARY);
  const cliLines = fitLines(doc, client?.razao_social || '_______________________________', sigW, 2);
  const cliLabelOff = 5 + cliLines.length * 4.5;
  cliLines.forEach((l, i) => doc.text(l, cliX, sigY + 5 + i * 4.5));
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_GRAY);
  doc.text('Cliente / Contratante', cliX, sigY + cliLabelOff);
  if (client?.cnpj) {
    doc.text(`CNPJ: ${client.cnpj}`, cliX, sigY + cliLabelOff + 5);
  }
  doc.setTextColor(0, 0, 0);

  y = sigY + 24;

  // Rodapé final
  drawFooter();

  // ── ANEXO: CERTIFICADO DE CALIBRAÇÃO ──
  if (instrument?.certificado_calibracao_url) {
    const certUrl = instrument.certificado_calibracao_url;
    const isCertPdf = certUrl.toLowerCase().includes('.pdf');
    if (isCertPdf) {
      try {
        const pages = await renderPdfPagesToImages(certUrl);
        for (const pageImg of pages) {
          doc.addPage();
          pageNum++;
          // Título da seção de anexo
          doc.setFillColor(...COLOR_PRIMARY);
          doc.rect(0, 0, W, 6, 'F');
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(...COLOR_PRIMARY);
          doc.text('ANEXO — CERTIFICADO DE CALIBRAÇÃO/AFERIÇÃO DO INSTRUMENTO DE MEDIÇÃO', W / 2, 16, { align: 'center' });
          doc.setTextColor(0, 0, 0);
          const maxW = W - 2 * M;
          const maxH = H - 40;
          const ratio = pageImg.h / pageImg.w;
          let iw = maxW;
          let ih = iw * ratio;
          if (ih > maxH) { ih = maxH; iw = ih / ratio; }
          addImg(doc, pageImg, (W - iw) / 2, 24, iw, ih);
          drawFooter();
        }
      } catch {
        doc.addPage();
        pageNum++;
        drawFooter();
        para('Certificado de Calibração/Aferição anexado digitalmente. Consulte o sistema para acesso ao arquivo completo.');
      }
    } else {
      doc.addPage();
      pageNum++;
      doc.setFillColor(...COLOR_PRIMARY);
      doc.rect(0, 0, W, 6, 'F');
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLOR_PRIMARY);
      doc.text('ANEXO — CERTIFICADO DE CALIBRAÇÃO/AFERIÇÃO DO INSTRUMENTO DE MEDIÇÃO', W / 2, 16, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      const img = await loadImage(certUrl);
      if (img) {
        const maxW = W - 2 * M;
        const maxH = H - 40;
        let iw = img.w; let ih = img.h;
        const ratio = ih / iw;
        if (iw > maxW) { iw = maxW; ih = iw * ratio; }
        if (ih > maxH) { ih = maxH; iw = ih / ratio; }
        addImg(doc, img, (W - iw) / 2, 24, iw, ih);
      }
      drawFooter();
    }
  }

  // ── ANEXO: DOCUMENTO DA ART ──
  if (report.art_documento_url) {
    const isPdf = report.art_documento_url.toLowerCase().includes('.pdf');
    if (isPdf) {
      try {
        const pages = await renderPdfPagesToImages(report.art_documento_url);
        for (const pageImg of pages) {
          doc.addPage();
          pageNum++;
          drawFooter();
          const maxW = W - 2 * M;
          const maxH = H - 2 * M;
          const ratio = pageImg.h / pageImg.w;
          let iw = maxW;
          let ih = iw * ratio;
          if (ih > maxH) { ih = maxH; iw = ih / ratio; }
          addImg(doc, pageImg, (W - iw) / 2, (H - ih) / 2, iw, ih);
        }
      } catch {
        doc.addPage();
        pageNum++;
        drawFooter();
        para('Documento da ART anexado digitalmente. Consulte o sistema para acesso ao arquivo completo.');
      }
    } else {
      doc.addPage();
      pageNum++;
      drawFooter();
      const img = await loadImage(report.art_documento_url);
      if (img) {
        const maxW = W - 2 * M;
        const maxH = H - 2 * M;
        let iw = img.w;
        let ih = img.h;
        const ratio = ih / iw;
        if (iw > maxW) { iw = maxW; ih = iw * ratio; }
        if (ih > maxH) { ih = maxH; iw = ih / ratio; }
        addImg(doc, img, (W - iw) / 2, (H - ih) / 2, iw, ih);
      }
    }
  }

  return doc;
}