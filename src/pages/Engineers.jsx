import EntityCrudPage from '@/components/EntityCrudPage';

export default function Engineers() {
  return (
    <EntityCrudPage
      entityName="Engineer"
      title="Engenheiros"
      fields={[
        { name: 'nome', label: 'Nome' },
        { name: 'cpf', label: 'CPF' },
        { name: 'crea_sc', label: 'CREA SC' },
        { name: 'email', label: 'E-mail' },
      ]}
    />
  );
}