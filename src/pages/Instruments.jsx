import EntityCrudPage from '@/components/EntityCrudPage';

export default function Instruments() {
  return (
    <EntityCrudPage
      entityName="Instrument"
      title="Instrumentos"
      fields={[
        { name: 'marca_modelo', label: 'Marca/Modelo' },
        { name: 'numero_serie', label: 'Número de Série' },
        { name: 'data_calibracao', label: 'Data da Calibração', type: 'date' },
        { name: 'especificacoes', label: 'Especificações Técnicas', type: 'textarea', full: true },
        { name: 'certificado_calibracao_url', label: 'Certificado de Calibração (PDF)', type: 'file', full: true },
      ]}
    />
  );
}