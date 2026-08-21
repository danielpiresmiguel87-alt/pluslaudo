// Script de importação de dados — rode no outro app via exec_tool
// Cole o conteúdo abaixo em uma chamada do exec_tool do app de destino.
import { base44 } from "@/api/base44Client";

export async function importarDados() {
  // === USUÁRIOS (via convite — não é possível criar diretamente) ===
  const usuarios = [
    { email: "giorgi.canever@gmail.com", role: "user" },
    { email: "alexandre.warmeling@pisonengenharia.com", role: "admin" },
    { email: "alexandredellajustina533@gmail.com", role: "admin" },
    { email: "danielpiresmiguel87@gmail.com", role: "admin" }
  ];
  for (const u of usuarios) {
    try { await base44.users.inviteUser(u.email, u.role); } catch (e) { console.log("Falha convite " + u.email, e.message); }
  }

  // === ENGENHEIROS ===
  await base44.entities.Engineer.bulkCreate([
    { nome: "Rafael Veronezi Salvador", cpf: "063.338.259-05", crea_sc: "166137-0", email: "rafael.verones@gmail.com" },
    { nome: "Giorgi Canever", cpf: "053.202.619-50", crea_sc: "147830-9" }
  ]);

  // === ELETRICISTAS ===
  await base44.entities.Electrician.bulkCreate([
    { nome: "MARIO CESAR SOARES HENRIQUE", cpf: "566.730.609-30", registro_profissional: "" },
    { nome: "Giorgi Canever", cpf: "053.202.619-50", registro_profissional: "147830-9" },
    { nome: "LUCIANO PIAZZOLO MOTA", cpf: "025.771.309-37", registro_profissional: "" }
  ]);

  return { usuarios: usuarios.length, engenheiros: 2, eletricistas: 3 };
}