
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tokens from "./pages/Tokens";
import TokenCreate from "./pages/TokenCreate";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import AuditLogs from "./pages/AuditLogs";
import Notifications from "./pages/Notifications";
import Integrations from "./pages/Integrations";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import ObjectManager from "./pages/ObjectManager";
import PageBuilder from "./pages/PageBuilder";
import ComponentLibrary from "./pages/ComponentLibrary";

const queryClient = new QueryClient();

const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tokens" element={<Tokens />} />
            <Route path="/tokens/create" element={<TokenCreate />} />
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/object-manager" element={<ObjectManager />} />
            <Route path="/page-builder" element={<PageBuilder />} />
            <Route path="/component-library" element={<ComponentLibrary />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </Provider>
);

export default App;
