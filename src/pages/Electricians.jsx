import EntityCrudPage from '@/components/EntityCrudPage';

export default function Electricians() {
  return (
    <EntityCrudPage
      entityName="Electrician"
      title="Eletricistas"
      fields={[
        { name: 'nome', label: 'Nome' },
        { name: 'cpf', label: 'CPF' },
        { name: 'registro_profissional', label: 'Registro Profissional' },
      ]}
    />
  );
}