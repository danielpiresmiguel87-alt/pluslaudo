import EntityCrudPage from '@/components/EntityCrudPage';

export default function Clients() {
  return (
    <EntityCrudPage
      entityName="Client"
      title="Clientes"
      fields={[
        { name: 'razao_social', label: 'Razão Social' },
        { name: 'cnpj', label: 'CNPJ', lookup: 'cnpj' },
        { name: 'endereco', label: 'Endereço' },
        { name: 'cidade', label: 'Cidade' },
        { name: 'cep', label: 'CEP' },
        { name: 'bairro', label: 'Bairro' },
        { name: 'fone', label: 'Fone' },
      ]}
    />
  );
}