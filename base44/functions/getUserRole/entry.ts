import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    console.log('auth.me() returned:', JSON.stringify({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }));
    
    let role = user.role;
    if (!role && user.id) {
      try {
        const fullUser = await base44.entities.User.get(user.id);
        console.log('User.get returned:', JSON.stringify({ role: fullUser.role }));
        role = fullUser.role;
      } catch (e) {
        console.log('User.get failed:', e.message);
      }
    }
    
    return Response.json({ role, full_name: user.full_name, email: user.email, me_role: user.role });
  } catch (error) {
    console.error('getUserRole error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});