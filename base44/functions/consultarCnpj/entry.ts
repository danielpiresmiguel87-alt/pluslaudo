import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cnpj } = await req.json();
    const cleanCnpj = (cnpj || '').replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      return Response.json({ error: 'CNPJ inválido. Deve conter 14 dígitos.' }, { status: 400 });
    }

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    if (!response.ok) {
      return Response.json({ error: `CNPJ não encontrado (status ${response.status}).` }, { status: 404 });
    }

    const data = await response.json();

    const endereco = [data.logradouro, data.numero, data.complemento].filter(Boolean).join(', ');

    return Response.json({
      razao_social: data.razao_social || '',
      cnpj: data.cnpj || cnpj,
      endereco,
      cidade: data.municipio || '',
      cep: data.cep || '',
      bairro: data.bairro || '',
      fone: data.ddd_telefone_1 || '',
      email: data.email || ''
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});