import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import ReportForm from '@/pages/ReportForm';
import ReportView from '@/pages/ReportView';
import Clients from '@/pages/Clients';
import Engineers from '@/pages/Engineers';
import Electricians from '@/pages/Electricians';
import Instruments from '@/pages/Instruments';
import Settings from '@/pages/Settings';
import AssinaturaCliente from '@/pages/AssinaturaCliente';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Página pública de assinatura — não requer login
  if (location.pathname.startsWith('/assinatura/')) {
    return (
      <Routes>
        <Route path="/assinatura/:token" element={<AssinaturaCliente />} />
      </Routes>
    );
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/reports/new" element={<ReportForm />} />
        <Route path="/reports/:id/edit" element={<ReportForm />} />
        <Route path="/reports/:id" element={<ReportView />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/engineers" element={<Engineers />} />
        <Route path="/electricians" element={<Electricians />} />
        <Route path="/instruments" element={<Instruments />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App