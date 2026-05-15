import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PrivateRoute } from './components/layout/PrivateRoute';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Contactos } from './pages/Contactos';
import { Ventas } from './pages/Ventas';
import { Inventario } from './pages/Inventario';
import { Finanzas } from './pages/Finanzas';
import { AI } from './pages/AI';
import { Settings } from './pages/Settings';
import { Recordatorios } from './pages/Recordatorios';
import { AdminPanel } from './pages/AdminPanel';
import { Login } from './pages/Login';
import { Landing } from './pages/Landing';
import { CatalogoPublico } from './pages/CatalogoPublico';
import { OtrosIngresos } from './pages/OtrosIngresos';
import { Presupuesto } from './pages/Presupuesto';
import { Compras } from './pages/Compras';
import { Gastos } from './pages/Gastos';
import { WelcomePremium } from './pages/WelcomePremium';
import { Contacto } from './pages/Contacto';
import { DataProvider } from './contexts/DataContext';
import { Toaster } from 'react-hot-toast';
import { AdminRoute } from './components/layout/AdminRoute';
import { useAuth } from './contexts/AuthContext';

import { TrialGuard } from './components/layout/TrialGuard';
import { PremiumWelcomeModal } from './components/layout/PremiumWelcomeModal';

function AppIndex() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.email?.toLowerCase() === 'guananjacarlosenrique@gmail.com';
  return isAdmin ? <Navigate to="/admin" replace /> : <Dashboard />;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="bottom-right" 
        containerStyle={{ zIndex: 10000 }}
        toastOptions={{ 
          duration: 4000,
          style: { 
            background: 'var(--surface-color)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: 'var(--text-main)', 
            border: '1px solid var(--panel-border)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-lg)',
            padding: '16px 20px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: 'var(--success)',
              secondary: 'white',
            },
            style: {
              borderLeft: '4px solid var(--success)'
            }
          },
          error: {
            iconTheme: {
              primary: 'var(--danger)',
              secondary: 'white',
            },
            style: {
              borderLeft: '4px solid var(--danger)'
            }
          },
        }} 
      />
      <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <PremiumWelcomeModal />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login />} />
            <Route path="/bienvenida-premium" element={<WelcomePremium />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="/catalogo/:userId" element={<CatalogoPublico />} />
            
            <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />

            <Route path="/app" element={<PrivateRoute><TrialGuard><MainLayout /></TrialGuard></PrivateRoute>}>
              <Route index element={<AppIndex />} />
              <Route path="contactos/:type" element={<Contactos />} />
              <Route path="ventas" element={<Ventas />} />
              <Route path="ingresos/otros" element={<OtrosIngresos />} />
              <Route path="ingresos/presupuesto" element={<Presupuesto />} />
              <Route path="egresos/compras" element={<Compras />} />
              <Route path="egresos/gastos" element={<Gastos />} />
              <Route path="inventario" element={<Inventario />} />
              <Route path="finanzas" element={<Finanzas />} />
              <Route path="ai" element={<AI />} />
              <Route path="settings" element={<Settings />} />
              <Route path="recordatorios" element={<Recordatorios />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}


export default App;

