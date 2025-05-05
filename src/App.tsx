
import React from 'react';
import { BrowserRouter as Router, Routes as RouterRoutes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { Toaster } from './components/ui/sonner';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/ui/animated-container';

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
import SystemAdmin from './pages/SystemAdmin';
import ProjectIntegrations from './pages/system-admin/ProjectIntegrations';

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

// AnimatedRoutes component for page transitions with enhanced animation
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <RouterRoutes location={location} key={location.pathname}>
        {/* Keep the incoming changes with PageTransition */}
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/users" element={<PageTransition><Users /></PageTransition>} />
        <Route path="/settings/*" element={<PageTransition><Settings /></PageTransition>} />
        <Route path="/tokens" element={<PageTransition><Tokens /></PageTransition>} />
        <Route path="/tokens/create" element={<PageTransition><TokenCreate /></PageTransition>} />
        <Route path="/reports" element={<PageTransition><Reports /></PageTransition>} />
        <Route path="/integrations" element={<PageTransition><Integrations /></PageTransition>} />
        <Route path="/notifications" element={<PageTransition><Notifications /></PageTransition>} />
        <Route path="/audit-logs" element={<PageTransition><AuditLogs /></PageTransition>} />
        <Route path="/object-manager" element={<PageTransition><ObjectManager /></PageTransition>} />
        <Route path="/page-builder" element={<PageTransition><PageBuilder /></PageTransition>} />
        <Route path="/component-library" element={<PageTransition><ComponentLibrary /></PageTransition>} />
        <Route path="/routes" element={<PageTransition><RouteManager /></PageTransition>} />
        <Route path="/functions" element={<PageTransition><CloudFunctions /></PageTransition>} />
        <Route path="/marketplace" element={<PageTransition><AppMarketplace /></PageTransition>} />
        <Route path="/graphql-console" element={<PageTransition><GraphQLConsole /></PageTransition>} />
        <Route path="/js-console" element={<PageTransition><JSConsole /></PageTransition>} />
        <Route path="/system-admin/*" element={<PageTransition><SystemAdmin /></PageTransition>} />

        {/* Developer Tool Routes */}
        <Route path="/dev/api-testing" element={<PageTransition><ApiTesting /></PageTransition>} />
        <Route path="/dev/database" element={<PageTransition><DatabaseExplorer /></PageTransition>} />
        <Route path="/dev/env" element={<PageTransition><EnvManager /></PageTransition>} />
        <Route path="/dev/logs" element={<PageTransition><LogsViewer /></PageTransition>} />
        <Route path="/dev/performance" element={<PageTransition><PerformanceMonitor /></PageTransition>} />
        <Route path="/dev/auth-testing" element={<PageTransition><AuthTester /></PageTransition>} />
        <Route path="/dev/storage" element={<PageTransition><StorageExplorer /></PageTransition>} />
        <Route path="/dev/network" element={<PageTransition><NetworkInspector /></PageTransition>} />
        <Route path="/dev/settings" element={<PageTransition><DebugSettings /></PageTransition>} />

        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
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
