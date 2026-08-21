# Correções e Melhorias — App PlusLaudo (Laudos de Aterramento)

> Documento completo para replicar no outro app. Inclui textos reais, lógicas e decisões.

---

## 1. Textos Padrão do Laudo (substituir placeholders)

### DEFAULT_OBJECTIVE
```
O presente laudo técnico tem por objetivo avaliar as condições físicas e atestar a conformidade do sistema de aterramento de equipamentos, juntamente com o sistema de aterramento elétrico principal da instalação da empresa.

As inspeções e ensaios instrumentais realizados visam comprovar a eficácia da continuidade elétrica e da equipotencialização das massas, em estrito atendimento às exigências legais do Ministério do Trabalho e normativas técnicas vigentes, com destaque para a NR-10, ABNT NBR 5410, ABNT NBR 15749 e a Instrução Normativa nº 19 (IN 19) do Corpo de Bombeiros Militar de Santa Catarina (CBMSC).
```

### DEFAULT_METHODOLOGY
```
A metodologia utilizada no presente laudo baseia-se em inspeções visuais em todos os componentes acessíveis do sistema de aterramento do equipamento e em medições da impedância e continuidade elétrica em diversos pontos da estrutura com relação ao aterramento elétrico da empresa.

A medição instrumental é realizada por meio da injeção de pulso de alta corrente, metodologia que mitiga potenciais erros de leitura em função da distância ou da quantidade de hastes e ferragens paralelas presentes na malha. Para a execução dos ensaios, utilizou-se um Terrômetro Digital Allnec TPA 2000.

Para a obtenção de um resultado aceitável, foram adotados os seguintes critérios:

• Inspeção Visual: Deve comprovar a efetiva equipotencialização das partes metálicas não destinadas a conduzir corrente (massas), bem como a integridade física de todos os condutores de proteção, conexões, soldas e terminais.

• Ensaios Instrumentais: A conformidade do sistema atestada neste documento baseia-se na comprovação da baixa impedância aferida nos testes de continuidade elétrica e na garantia de equalização de potenciais entre o equipamento e a malha de aterramento principal da edificação.
```

### DEFAULT_RECOMMENDATIONS
```
Considerando que o sistema de aterramento do equipamento inspecionado encontra-se em conformidade, recomenda-se à contratante a manutenção rigorosa das rotinas de inspeção visual/manutenção. É crucial garantir que as conexões mecânicas e os condutores de proteção (PE) não sofram desgastes, afrouxamentos ou oxidações decorrentes da dinâmica da operação industrial, prevenindo assim o risco de choque elétrico aos colaboradores.

Para a manutenção desta conformidade e em estrito atendimento às diretrizes da NR-10 e da NR-12, uma nova bateria de ensaios instrumentais deverá ser programada anualmente. Ensaios e inspeções adicionais deverão ser realizados, obrigatoriamente, sempre que houver intervenções elétricas, reformas estruturais, substituição ou remanejamento físico do equipamento, bem como perante a identificação de qualquer anomalia no funcionamento do sistema.

Ressalta-se que a contratante deve manter os registros atualizados de todas as medições e rotinas de manutenção, preferencialmente integrados ao Prontuário de Instalações Elétricas (PIE) e ao manual/registro de manutenção da máquina. Por fim, conforme exigência legal, todas as intervenções futuras no sistema de aterramento deverão ser executadas exclusivamente por Profissional Legalmente Habilitado, com a respectiva emissão da Anotação de Responsabilidade Técnica (ART).
```

### DEFAULT_NORMAS
```
NR-10
NR-12
ABNT NBR 5410
ABNT NBR 15749
IN nº 19 (CBMSC)
```

> ⚠️ Remover quaisquer referências a normas revogadas: `017/CAT/CCB/88` e `NSCI/94`.

---

## 2. Itens Verificados (Checklist dinâmico)

Criar utilitário `src/utils/inspectionItems.js`:

```js
export const INSPECTION_ITEMS = [
  {
    label: 'Equipotencialização das Massas',
    description: 'Verificação da correta interligação das partes metálicas não destinadas a conduzir corrente elétrica (carcaças e chassi) ao sistema de proteção.',
  },
  {
    label: 'Integridade das Conexões',
    description: 'Inspeção visual e mecânica do estado de conservação, aperto e ausência de oxidação nos terminais do condutor de proteção (PE) junto ao barramento de terra no painel elétrico do equipamento.',
  },
  {
    label: 'Ensaio Instrumental no Painel Elétrico',
    description: 'Medição da impedância e atestação da continuidade elétrica no ponto de conexão principal do aterramento dentro do painel de comando.',
  },
  {
    label: 'Ensaios Instrumentais na Estrutura da Máquina',
    description: 'Aferição da continuidade elétrica em partes distintas e extremidades do equipamento (motores, zonas de aquecimento e estruturas metálicas periféricas) para garantir a ausência de seccionamentos no laço de proteção e a eficácia contra tensões de toque.',
  },
];

export function getDefaultInspectionStatus() {
  return INSPECTION_ITEMS.map(() => true);
}
```

- Entidade `Report`: campo `itens_verificados` = array de booleans (default: todos `true`).
- Renderizar checkboxes dinâmicos no `ReportForm.jsx` (checkbox shadcn).
- Representar visualmente no PDF (checklist com ✓/✗).

---

## 3. Entidade Instrument — Certificado de Calibração

Adicionar campo na entidade `Instrument`:
```jsonc
"certificado_calibracao_url": { "type": "string" }
```
- Expor campo na interface de cadastro/edição de instrumentos (upload de arquivo).
- Anexar **automaticamente** o certificado de calibração (PDF) ao final dos laudos técnicos gerados.

---

## 4. Workflow de Status

Adicionar campo na entidade `Report`:
```jsonc
"workflow_status": {
  "type": "string",
  "enum": ["rascunho", "pendente_medicao", "pendente_revisao", "concluido"],
  "default": "rascunho"
}
```

Criar utilitário `src/utils/workflow.js`:
```js
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
```

### Regras
- Um laudo só é `concluido` se **aprovado** E contiver **medições** E **ART** anexada.
- Migrar laudos aprovados existentes para `concluido` via `bulkUpdate`:
```js
await base44.entities.Report.updateMany(
  { status: "aprovado", workflow_status: { $ne: "concluido" } },
  { $set: { workflow_status: "concluido" } }
);
```
- Centralizar a transição de status no utilitário (não duplicar lógica no form).

---

## 5. Dashboard (Home) — Status e Pendências

- Amarrar indicadores de sucesso (cor verde / label "Concluído") **exclusivamente** ao `workflow_status: concluido`.
- Remover formatação verde do status "Aprovado" no dashboard (padronizar com os demais estados).
- Aplicar cor verde (`bg-green-600`) **apenas** no badge de status "Concluído" (workflow).
- Exibir o motivo **"Falta ART"** em vermelho no dashboard de pendências para laudos aprovados sem ART anexada.
- Validade: laudos aprovados têm validade de 1 ano a partir da `data` — alertar próximos do vencimento.

---

## 6. ReportForm — Isolamento de Carregamento de Entidades

- Isolar o carregamento de `Client`, `Instrument`, `Engineer`, `Electrician` para que a falha de **uma não bloqueie** a exibição das outras.
- Cada entidade com seu próprio `try/catch` e estado de erro independente (Promise.allSettled ou buscas separadas).

---

## 7. Assinatura Digital (REMOVER do app)

- Remover **toda** a funcionalidade de assinatura digital pelo app:
  - Remover `SignaturePad` da visualização do laudo (`ReportView.jsx`).
  - Remover botões "Gerar Link", "Reabrir Medições" e "Copiar Link".
  - Remover o card de compartilhamento de link.
  - Remover a página pública de assinatura (`AssinaturaCliente.jsx`) e sua rota no `App.jsx`.
  - Remover os backends `assinarLaudo` e `enviarAssinatura`.
  - Limpar imports de ícones/componentes obsoletos de assinatura (Copy, Check, Share2, etc.).
- Manter apenas os **campos de assinatura como linhas em branco no PDF final** (assinatura manual depois).
- Campos `assinatura_engenheiro_url`, `assinatura_cliente_url`, `assinatura_token` podem permanecer na entidade mas não são usados pelo app.

---

## 8. PDF / Renderização

- Usar componente `PdfToImage` com renderização via `<canvas>` para exibir PDFs no browser — **não usar `<iframe>`** (falha na impressão).
- Ao imprimir, garantir que o contêiner principal **não** tenha `page-break-inside: avoid` (causa erro de layout em múltiplas páginas).

### CSS de impressão (em `src/index.css`, bloco `@media print`)
```css
@media print {
  @page { margin: 10mm; size: A4; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { background: #ffffff !important; }
  aside, header, button, .print\:hidden { display: none !important; }
  iframe { display: none !important; }
  .lg\:pl-64 { padding-left: 0 !important; }
  main { padding: 0 !important; }
  canvas { max-width: 100% !important; page-break-inside: avoid; break-inside: avoid; }
  .pdf-viewer-container { page-break-inside: auto; break-inside: auto; }
  .pdf-page-container { page-break-inside: avoid; break-inside: avoid; }
  footer { page-break-before: avoid; }
  img { max-width: 100% !important; }
}
```

---

## 9. Dados para Importação

### Usuários (via convite)
```js
const usuarios = [
  { email: "giorgi.canever@gmail.com", role: "user" },
  { email: "alexandre.warmeling@pisonengenharia.com", role: "admin" },
  { email: "alexandredellajustina533@gmail.com", role: "admin" },
  { email: "danielpiresmiguel87@gmail.com", role: "admin" }
];
for (const u of usuarios) {
  try { await base44.users.inviteUser(u.email, u.role); } catch (e) { console.log("Falha", u.email, e.message); }
}
```

### Engenheiros
```js
await base44.entities.Engineer.bulkCreate([
  { nome: "Rafael Veronezi Salvador", cpf: "063.338.259-05", crea_sc: "166137-0", email: "rafael.verones@gmail.com" },
  { nome: "Giorgi Canever", cpf: "053.202.619-50", crea_sc: "147830-9" }
]);
```

### Eletricistas
```js
await base44.entities.Electrician.bulkCreate([
  { nome: "MARIO CESAR SOARES HENRIQUE", cpf: "566.730.609-30", registro_profissional: "" },
  { nome: "Giorgi Canever", cpf: "053.202.619-50", registro_profissional: "147830-9" },
  { nome: "LUCIANO PIAZZOLO MOTA", cpf: "025.771.309-37", registro_profissional: "" }
]);
``