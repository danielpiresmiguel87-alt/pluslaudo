import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'engenheiro') {
      return Response.json({ error: 'Acesso restrito a administradores e engenheiros' }, { status: 403 });
    }

    const body = await req.json();
    const { report_id, app_url } = body;
    if (!report_id) return Response.json({ error: 'ID do laudo obrigatório' }, { status: 400 });

    const report = await base44.asServiceRole.entities.Report.get(report_id);
    if (!report) return Response.json({ error: 'Laudo não encontrado' }, { status: 404 });

    const clients = await base44.asServiceRole.entities.Client.list();
    const client = clients.find(c => c.id === report.cliente_id);
    if (!client?.email) {
      return Response.json({ error: 'Cliente sem e-mail cadastrado. Cadastre o e-mail do cliente antes de enviar.' }, { status: 400 });
    }

    // Gera token único
    const token = crypto.randomUUID();

    // Armazena token no laudo (invalida qualquer token anterior)
    await base44.asServiceRole.entities.Report.update(report_id, {
      assinatura_token: token
    });

    const base = app_url || 'https://app.base44.com';
    const signingUrl = `${base}/assinatura/${token}`;

    const equipamento = report.equipamento || 'Não informado';
    const local = report.local || 'Não informado';
    const data = report.data || 'Não informada';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: client.email,
      subject: `Assinatura - Laudo Técnico de Aterramento - ${equipamento}`,
      body: `Prezado(a) ${client.razao_social},

Você recebeu um Laudo Técnico de Aterramento para assinatura.

Equipamento: ${equipamento}
Local: ${local}
Data: ${data}

Para visualizar e assinar o laudo, acesse o link abaixo:

${signingUrl}

Importante:
- Este link é exclusivo para você.
- Após assinar, o link perderá a validade automaticamente.
- Se você não esperava este e-mail, por favor desconsidere.

Atenciosamente,
Equipe Técnica`
    });

    return Response.json({ success: true, email: client.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});