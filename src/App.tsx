
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { Toaster } from './components/ui/sonner';

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
import Routes from './pages/Routes';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
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
            <Route path="/routes" element={<Routes />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </Router>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
