// Recalcula o workflow_status com base no estado real do laudo,
// evitando status travado em "pendente_medicao" quando já há medições.
export function computeWorkflowStatus(report, currentWs, explicitWs) {
  if (explicitWs) return explicitWs;
  const measurements = report.measurements || [];
  const status = report.status;
  const hasArt = !!report.art_documento_url;
  const cur = currentWs || report.workflow_status || 'rascunho';
  if (measurements.length > 0 && status === 'aprovado' && hasArt) return 'concluido';
  if (measurements.length > 0 && (cur === 'rascunho' || cur === 'pendente_medicao')) return 'pendente_revisao';
  return cur;
}

export const WORKFLOW_LABELS = {
  rascunho: 'Rascunho',
  pendente_medicao: 'Aguardando Medição',
  pendente_revisao: 'Aguardando Revisão',
  concluido: 'Concluído',
};