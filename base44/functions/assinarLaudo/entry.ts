import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, action, signature_data_url, measurements: incomingMeasurements, condicoes_ambiente } = body;

    if (!token) return Response.json({ error: 'Token obrigatório' }, { status: 400 });

    const reports = await base44.asServiceRole.entities.Report.filter({ assinatura_token: token });
    if (!reports || reports.length === 0) {
      return Response.json({ error: 'Link inválido ou expirado. Solicite um novo link.' }, { status: 404 });
    }

    const report = reports[0];

    // Ação: salvar assinatura do engenheiro (NÃO invalida o link — cliente ainda pode assinar)
    if (action === 'sign_engineer') {
      if (!signature_data_url) return Response.json({ error: 'Assinatura obrigatória' }, { status: 400 });

      const base64 = signature_data_url.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'image/png' });
      const file = new File([blob], 'assinatura-engenheiro.png', { type: 'image/png' });

      const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

      await base44.asServiceRole.entities.Report.update(report.id, {
        assinatura_engenheiro_url: file_url,
      });

      return Response.json({ success: true });
    }

    // Ação: salvar medições (rascunho ou conclusão)
    if (action === 'save_draft' || action === 'save_measurements') {
      const processedMeasurements = [];
      for (const m of (incomingMeasurements || [])) {
        const fotos = m.fotos || [];
        const uploadedFotos = [];
        for (const foto of fotos) {
          if (typeof foto === 'string' && foto.startsWith('data:')) {
            const base64 = foto.split(',')[1];
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: 'image/jpeg' });
            const file = new File([blob], 'medicao-foto.jpg', { type: 'image/jpeg' });
            const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
            uploadedFotos.push(file_url);
          } else if (typeof foto === 'string') {
            uploadedFotos.push(foto);
          }
        }
        processedMeasurements.push({ ...m, fotos: uploadedFotos });
      }

      const lim = report.limite_ohms || 10;
      const hasMeas = processedMeasurements.length > 0;
      const allApproved = hasMeas && processedMeasurements.every(m => (m.valor_medido ?? Infinity) <= lim);
      const status = !hasMeas ? 'rascunho' : allApproved ? 'aprovado' : 'reprovado';

      const updateData = { measurements: processedMeasurements, status };
      if (condicoes_ambiente) updateData.condicoes_ambiente = condicoes_ambiente;
      if (action === 'save_measurements') {
        updateData.workflow_status = 'pendente_revisao';
      }
      await base44.asServiceRole.entities.Report.update(report.id, updateData);

      return Response.json({ success: true });
    }

    // Ação: salvar assinatura do cliente (invalida o link)
    if (action === 'sign') {
      if (report.assinatura_cliente_url) {
        return Response.json({ error: 'Este laudo já foi assinado pelo cliente. O link não está mais disponível.', already_signed: true }, { status: 403 });
      }
      if (!signature_data_url) return Response.json({ error: 'Assinatura obrigatória' }, { status: 400 });

      const base64 = signature_data_url.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'image/png' });
      const file = new File([blob], 'assinatura-cliente.png', { type: 'image/png' });

      const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

      await base44.asServiceRole.entities.Report.update(report.id, {
        assinatura_cliente_url: file_url,
        assinatura_token: null
      });

      return Response.json({ success: true });
    }

    // Ação: obter dados do laudo (default)
    const [companies, clients, engineers, electricians, instruments, users] = await Promise.all([
      base44.asServiceRole.entities.Company.list(),
      base44.asServiceRole.entities.Client.list(),
      base44.asServiceRole.entities.Engineer.list(),
      base44.asServiceRole.entities.Electrician.list(),
      base44.asServiceRole.entities.Instrument.list(),
      base44.asServiceRole.entities.User.list(),
    ]);

    const client = clients.find(c => c.id === report.cliente_id);
    const company = companies[0];
    const engUser = users.find(u => u.id === report.engenheiro_id);
    const eleUser = users.find(u => u.id === report.eletricista_id);
    const engineer = engUser
      ? { nome: engUser.full_name || engUser.email, cpf: engUser.cpf, crea_sc: engUser.crea_sc }
      : engineers.find(e => e.id === report.engenheiro_id);
    const electrician = eleUser
      ? { nome: eleUser.full_name || eleUser.email, cpf: eleUser.cpf, registro_profissional: eleUser.registro_profissional }
      : electricians.find(e => e.id === report.eletricista_id);
    const instrument = instruments.find(i => i.id === report.instrumento_id);

    return Response.json({
      report: {
        equipamento: report.equipamento,
        tag_equipamento: report.tag_equipamento,
        local: report.local,
        data: report.data,
        validade: report.validade,
        limite_ohms: report.limite_ohms,
        measurements: report.measurements || [],
        status: report.status,
        workflow_status: report.workflow_status,
        normas: report.normas,
        condicoes_ambiente: report.condicoes_ambiente,
        objetivo: report.objetivo,
        metodologia: report.metodologia,
        limitacoes: report.limitacoes,
        recomendacoes: report.recomendacoes,
        numero_art: report.numero_art,
        assinatura_engenheiro_url: report.assinatura_engenheiro_url,
      },
      client: client ? {
        razao_social: client.razao_social,
        cnpj: client.cnpj,
        endereco: client.endereco,
        cidade: client.cidade,
        cep: client.cep,
        bairro: client.bairro,
        fone: client.fone,
        logo_url: client.logo_url,
      } : null,
      company: company ? {
        razao_social: company.razao_social,
        cnpj: company.cnpj,
        endereco: company.endereco,
        cidade: company.cidade,
        cep: company.cep,
        bairro: company.bairro,
        fone: company.fone,
        email: company.email,
        logo_url: company.logo_url,
      } : null,
      engineer: engineer ? {
        nome: engineer.nome,
        cpf: engineer.cpf,
        crea_sc: engineer.crea_sc,
      } : null,
      electrician: electrician ? {
        nome: electrician.nome,
        cpf: electrician.cpf,
        registro_profissional: electrician.registro_profissional,
      } : null,
      instrument: instrument ? {
        marca_modelo: instrument.marca_modelo,
        numero_serie: instrument.numero_serie,
        data_calibracao: instrument.data_calibracao,
        especificacoes: instrument.especificacoes,
      } : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});