import { base44 } from '@/api/base44Client';

// Aplica os dados comuns de um projeto a um laudo.
// Campos não preenchidos no projeto mantêm o que já existe no laudo.
export function applyProjectToReport(project, form) {
  const p = project || {};
  return {
    ...form,
    projeto_id: p.id || form.projeto_id,
    cliente_id: p.cliente_id || form.cliente_id,
    engenheiro_id: p.engenheiro_id || form.engenheiro_id,
    eletricista_id: p.eletricista_id || form.eletricista_id,
    instrumento_id: p.instrumento_id || form.instrumento_id,
    numero_art: p.numero_art || form.numero_art,
    art_documento_url: p.art_documento_url || form.art_documento_url,
    normas: p.normas || form.normas,
    objetivo: p.objetivo || form.objetivo,
    metodologia: p.metodologia || form.metodologia,
    limitacoes: p.limitacoes || form.limitacoes,
    recomendacoes: p.recomendacoes || form.recomendacoes,
    limite_ohms: p.limite_ohms ?? form.limite_ohms,
  };
}

// Laudo vinculado a um projeto herda a ART cadastrada no projeto quando ainda não tem a sua.
// A informação é gravada no laudo para que PDF, listagens e conclusão usem sempre os mesmos dados.
export async function syncProjectArt(report) {
  if (!report?.projeto_id) return report;
  if (report.numero_art && report.art_documento_url) return report;
  let projeto;
  try {
    projeto = await base44.entities.Projeto.get(report.projeto_id);
  } catch (e) {
    return report;
  }
  const patch = {};
  if (!report.numero_art && projeto.numero_art) patch.numero_art = projeto.numero_art;
  if (!report.art_documento_url && projeto.art_documento_url) patch.art_documento_url = projeto.art_documento_url;
  if (!Object.keys(patch).length) return report;
  await base44.entities.Report.update(report.id, patch).catch(() => {});
  return { ...report, ...patch };
}