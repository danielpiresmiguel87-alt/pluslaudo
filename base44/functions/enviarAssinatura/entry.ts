import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'engenheiro' && user.role !== 'coordenador') {
      return Response.json({ error: 'Acesso restrito a administradores e engenheiros' }, { status: 403 });
    }

    const body = await req.json();
    const { report_id, app_url } = body;
    if (!report_id) return Response.json({ error: 'ID do laudo obrigatório' }, { status: 400 });

    const report = await base44.asServiceRole.entities.Report.get(report_id);
    if (!report) return Response.json({ error: 'Laudo não encontrado' }, { status: 404 });

    const token = crypto.randomUUID();
    const updates = { assinatura_token: token };
    if (!report.workflow_status || report.workflow_status === 'rascunho') {
      updates.workflow_status = 'pendente_medicao';
    }
    await base44.asServiceRole.entities.Report.update(report_id, updates);

    const base = app_url || 'https://app.base44.com';
    const signingUrl = `${base}/assinatura/${token}`;

    return Response.json({ success: true, signing_url: signingUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});