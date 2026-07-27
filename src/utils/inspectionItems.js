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