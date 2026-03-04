import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './styles/theme.css';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { Role } from './types';

// ─── Lazy-loaded page components (code splitting) ───
// Each page becomes its own JS chunk, loaded on demand
const Dashboard = lazy(() => import('./pages/Dashboard'));
const POS = lazy(() => import('./pages/POS'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Customers = lazy(() => import('./pages/Customers'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Purchasing = lazy(() => import('./pages/Purchasing'));
const Accounting = lazy(() => import('./pages/Accounting'));
const HR = lazy(() => import('./pages/HR'));
const Reports = lazy(() => import('./pages/Reports'));
const Security = lazy(() => import('./pages/Security'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const StockReport = lazy(() => import('./pages/StockReport'));
const Warehouses = lazy(() => import('./pages/Warehouses'));
const Production = lazy(() => import('./pages/Production'));
const StockMovements = lazy(() => import('./pages/StockMovements'));
const WarehouseReports = lazy(() => import('./pages/WarehouseReports'));

// ─── Route loading fallback ───
const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-neutral-500 font-medium">Loading...</span>
    </div>
  </div>
);

// Protected Route Component with Role Checks
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">{t('loading')}</div>;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check Role Permissions
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  // If on login or landing page, render only routing content without Navbar padding
  if (location.pathname === '/login' || location.pathname === '/' || location.pathname === '/auth/callback') {
    return (
       <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 font-sans selection:bg-sky-500 selection:text-white transition-colors duration-300">
         <Suspense fallback={<PageLoader />}>
         <Routes>
           <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage />} />
           <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
           <Route path="/auth/callback" element={<AuthCallback />} />
         </Routes>
         </Suspense>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 font-sans selection:bg-sky-500 selection:text-white transition-colors duration-300 flex flex-col">
      {isAuthenticated && <Navbar darkMode={darkMode} toggleTheme={toggleTheme} />}
      
      <main className="flex-1 p-4 lg:p-6 max-w-screen-2xl mx-auto w-full">
        <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/login" element={<Navigate to="/dashboard" />} />
          <Route path="/unauthorized" element={<ProtectedRoute><Unauthorized /></ProtectedRoute>} />
          
          {/* Dashboard: Admin & Manager */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* POS: Everyone */}
          <Route path="/pos" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER, Role.CASHIER]}>
              <POS />
            </ProtectedRoute>
          } />

          {/* Inventory: Admin & Manager */}
          <Route path="/inventory" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
              <Inventory />
            </ProtectedRoute>
          } />

          {/* Stock Report: Admin & Manager */}
          <Route path="/stock-report" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
              <StockReport />
            </ProtectedRoute>
          } />

          {/* Customers: Everyone */}
          <Route path="/customers" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER, Role.CASHIER]}>
              <Customers />
            </ProtectedRoute>
          } />

          {/* Suppliers: Admin & Manager */}
          <Route path="/suppliers" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
              <Suppliers />
            </ProtectedRoute>
          } />

          {/* Purchasing: Admin & Manager */}
          <Route path="/purchasing" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
              <Purchasing />
            </ProtectedRoute>
          } />

          {/* Accounting: Admin Only */}
          <Route path="/accounting" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <Accounting />
            </ProtectedRoute>
          } />

          {/* HR: Admin Only */}
          <Route path="/hr" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <HR />
            </ProtectedRoute>
          } />

          {/* Reports: Admin & Manager */}
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
              <Reports />
            </ProtectedRoute>
          } />

          {/* Security: Admin Only */}
          <Route path="/security" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <Security />
            </ProtectedRoute>
          } />

          {/* Settings: Admin Only */}
          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <Settings />
            </ProtectedRoute>
          } />

          {/* Warehouses: Admin & Manager */}
          <Route path="/warehouses" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
              <Warehouses />
            </ProtectedRoute>
          } />

          {/* Production: Admin & Manager */}
          <Route path="/production" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
              <Production />
            </ProtectedRoute>
          } />

          {/* Stock Movements: Admin & Manager */}
          <Route path="/stock-movements" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
              <StockMovements />
            </ProtectedRoute>
          } />

          {/* Warehouse Reports: Admin & Manager */}
          <Route path="/warehouse-reports" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
              <WarehouseReports />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <LanguageProvider>
        <CurrencyProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </HashRouter>
  );
};

export default App;