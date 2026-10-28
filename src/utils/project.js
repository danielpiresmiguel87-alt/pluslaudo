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