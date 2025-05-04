
import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContractDeployWizard } from "@/components/system-admin/ContractDeployWizard";
import { ChainConfigurator } from "@/components/system-admin/ChainConfigurator";
import { AppBundleManager } from "@/components/system-admin/AppBundleManager";
import { DeploymentDashboard } from "@/components/system-admin/DeploymentDashboard";

const SystemAdmin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { permissions } = useAppSelector((state) => state.auth);
  
  // RBAC check - redirect if user doesn't have system admin permission
  if (!permissions.includes("system:admin")) {
    return <Navigate to="/dashboard" replace />;
  }

  const currentTab = location.pathname.split('/')[2] || "deploy";

  const handleTabChange = (value: string) => {
    navigate(`/system-admin/${value}`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
          <p className="text-muted-foreground">
            Manage system deployment and configuration
          </p>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="deploy">Contract Deployment</TabsTrigger>
            <TabsTrigger value="chains">Chain Configuration</TabsTrigger>
            <TabsTrigger value="bundles">App Bundles</TabsTrigger>
            <TabsTrigger value="status">Deployment Status</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-6">
          <Routes>
            <Route path="/" element={<Navigate to="/system-admin/deploy" replace />} />
            <Route path="/deploy" element={<ContractDeployWizard />} />
            <Route path="/chains" element={<ChainConfigurator />} />
            <Route path="/bundles" element={<AppBundleManager />} />
            <Route path="/status" element={<DeploymentDashboard />} />
          </Routes>
        </div>
      </div>
    </AppLayout>
  );
};

export default SystemAdmin;
