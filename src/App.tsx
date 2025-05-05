
import React from 'react';
import { BrowserRouter as Router, Routes as RouterRoutes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { Toaster } from './components/ui/sonner';
import { AnimatePresence } from 'framer-motion';

// Pages
import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Users from './pages/Users';
import Settings from './pages/Settings';
import TokenCreate from './pages/TokenCreate';
import Tokens from './pages/Tokens';
import Reports from './pages/Reports';
import Integrations from './pages/Integrations';
import Notifications from './pages/Notifications';
import AuditLogs from './pages/AuditLogs';
import ObjectManager from './pages/ObjectManager';
import PageBuilder from './pages/PageBuilder';
import ComponentLibrary from './pages/ComponentLibrary';
import RouteManager from './pages/Routes';
import CloudFunctions from './pages/CloudFunctions';
import AppMarketplace from './pages/AppMarketplace';
import GraphQLConsole from './pages/GraphQLConsole';
import JSConsole from './pages/JSConsole';

// System Admin Pages
import SystemAdmin from './pages/SystemAdmin';
import ContractDeployment from './pages/system-admin/ContractDeployment';
import ChainConfiguration from './pages/system-admin/ChainConfiguration';
import AppBundles from './pages/system-admin/AppBundles';


// Developer Tools
import ApiTesting from './pages/dev/ApiTesting';
import DatabaseExplorer from './pages/dev/DatabaseExplorer';
import EnvManager from './pages/dev/EnvManager';
import LogsViewer from './pages/dev/LogsViewer';
import PerformanceMonitor from './pages/dev/PerformanceMonitor';
import AuthTester from './pages/dev/AuthTester';
import StorageExplorer from './pages/dev/StorageExplorer';
import NetworkInspector from './pages/dev/NetworkInspector';
import DebugSettings from './pages/dev/DebugSettings';

// Create a client
const queryClient = new QueryClient();

// AnimatedRoutes component for page transitions
const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <RouterRoutes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings/*" element={<Settings />} />
        <Route path="/tokens" element={<Tokens />} />
        <Route path="/tokens/create" element={<TokenCreate />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/object-manager" element={<ObjectManager />} />
        <Route path="/page-builder" element={<PageBuilder />} />
        <Route path="/component-library" element={<ComponentLibrary />} />
        <Route path="/routes" element={<RouteManager />} />
        <Route path="/functions" element={<CloudFunctions />} />
        <Route path="/marketplace" element={<AppMarketplace />} />
        <Route path="/graphql-console" element={<GraphQLConsole />} />
        <Route path="/js-console" element={<JSConsole />} />

        {/* System Admin Routes */}
        <Route path="/system-admin" element={<SystemAdmin />} />
        <Route path="/system-admin/deploy" element={<ContractDeployment />} />
        <Route path="/system-admin/chains" element={<ChainConfiguration />} />
        <Route path="/system-admin/bundles" element={<AppBundles />} />

        {/* Developer Tool Routes */}
        <Route path="/dev/api-testing" element={<ApiTesting />} />
        <Route path="/dev/database" element={<DatabaseExplorer />} />
        <Route path="/dev/env" element={<EnvManager />} />
        <Route path="/dev/logs" element={<LogsViewer />} />
        <Route path="/dev/performance" element={<PerformanceMonitor />} />
        <Route path="/dev/auth-testing" element={<AuthTester />} />
        <Route path="/dev/storage" element={<StorageExplorer />} />
        <Route path="/dev/network" element={<NetworkInspector />} />
        <Route path="/dev/settings" element={<DebugSettings />} />
        
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AnimatedRoutes />
          <Toaster />
        </Router>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
