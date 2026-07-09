import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { FileText, Users, HardHat, Wrench, Gauge, Settings, Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout() {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    base44.entities.Company.list().then(res => { if (res[0]) setCompany(res[0]); });
  }, []);

  const userRole = user?.role;
  const isAdmin = userRole === 'admin';
  const canManage = userRole === 'admin' || userRole === 'coordenador';
  const navItems = [
    { to: '/', label: 'Laudos', icon: FileText, end: true },
  ];
  if (canManage) {
    navItems.push(
      { to: '/clients', label: 'Clientes', icon: Users },
      { to: '/engineers', label: 'Engenheiros', icon: HardHat },
      { to: '/electricians', label: 'Eletricistas', icon: Wrench },
      { to: '/instruments', label: 'Instrumentos', icon: Gauge },
    );
  }
  if (isAdmin) navItems.push({ to: '/settings', label: 'Configurações', icon: Settings });

  const handleLogout = () => base44.auth.logout();

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        {company?.logo_url ? (
          <img src={company.logo_url} alt="PLUSSEG" className="h-12 object-contain" />
        ) : (
          <span className="text-xl font-bold">PISON MEGAWATT</span>
        )}
        <p className="text-xs text-muted-foreground mt-1">Gestão de Laudos</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t">
        <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 border-r bg-sidebar">
        {sidebar}
      </aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-sidebar border-r">{sidebar}</div>
          <div className="flex-1 bg-black/50" onClick={() => setOpen(false)} />
        </div>
      )}

      <div className="lg:pl-64">
        <header className="lg:hidden flex items-center justify-between p-4 border-b bg-background sticky top-0 z-40">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
          <span className="font-bold">PISON MEGAWATT</span>
        </header>
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}