import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const fullUser = await base44.entities.User.get(user.id);
    return Response.json({ role: fullUser.role, full_name: fullUser.full_name, email: fullUser.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});