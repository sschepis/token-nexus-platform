import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { usePageController } from "@/hooks/usePageController";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { WorkflowStatus, Workflow as WorkflowType } from "@/types/workflows";
import { CreateWorkflowDialog } from "@/components/workflow/CreateWorkflowDialog";

// Import our new modular components
import { WorkflowsHeader } from "@/components/workflows/WorkflowsHeader";
import { WorkflowsFilters } from "@/components/workflows/WorkflowsFilters";
import { WorkflowsTabs } from "@/components/workflows/WorkflowsTabs";
import { WorkflowsTable } from "@/components/workflows/WorkflowsTable";
import { useWorkflowActions } from "@/hooks/useWorkflowActions";

/**
 * Workflows Page Component
 *
 * This page manages visual workflows for automation and orchestration.
 * Workflows can integrate with Parse triggers, cloud functions, notifications,
 * AI assistant, and external services.
 *
 * Features:
 * - Create workflows from templates or scratch
 * - Visual workflow editor with drag-and-drop nodes
 * - Real-time execution monitoring and statistics
 * - Integration with existing platform services
 * - AI assistant integration for workflow optimization
 */
const WorkflowsPage = () => {
  const { toast } = useToast();
  const { items: workflows, isLoading, error } = useAppSelector((state) => state.workflow);

  // Initialize page controller
  const pageController = usePageController({
    pageId: 'workflows',
    pageName: 'Workflows',
    description: 'Manage visual workflows for automation and orchestration',
    category: 'automation',
    permissions: ['workflows:read', 'workflows:write', 'workflows:execute', 'workflows:manage'],
    tags: ['workflows', 'automation', 'orchestration', 'visual', 'integration']
  });

  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<WorkflowStatus | "all">("all");
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [controllerError, setControllerError] = useState<string | null>(null);

  // Initialize workflow actions hook
  const {
    handleCreateWorkflow,
    handleToggleStatus,
    handleExecuteWorkflow,
    handleEditWorkflow,
    handleViewWorkflow,
    handleDeleteWorkflow,
    handleCloneWorkflow,
    handleRefresh,
  } = useWorkflowActions({
    pageController,
    onError: setControllerError
  });

  // Load workflows on component mount
  useEffect(() => {
    if (pageController.isRegistered) {
      handleRefresh();
    }
  }, [pageController.isRegistered]);

  // Handle errors
  useEffect(() => {
    if (controllerError) {
      toast({
        title: "Error",
        description: controllerError,
        variant: "destructive",
      });
      setControllerError(null);
    }
  }, [controllerError, toast]);


  // Filter workflows based on search, tab, category, and status
  const filteredWorkflows = (workflows || []).filter((workflow) => {
    const matchesTab = 
      activeTab === "all" || 
      (activeTab === "active" && workflow.status === "active") || 
      (activeTab === "draft" && workflow.status === "draft") ||
      (activeTab === "paused" && workflow.status === "paused") ||
      (activeTab === "error" && workflow.status === "error") ||
      (activeTab === "archived" && workflow.status === "archived");

    const matchesSearch = 
      searchTerm === "" ||
      workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || workflow.metadata?.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || workflow.status === selectedStatus;

    return matchesTab && matchesSearch && matchesCategory && matchesStatus;
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(workflows.map(w => w.metadata?.category).filter(Boolean))) as string[];

  const handleCreateWorkflowWrapper = async (workflowData: any) => {
    const success = await handleCreateWorkflow(workflowData);
    if (success) {
      setCreateDialogOpen(false);
    }
  };

  const handleCloneWorkflowWrapper = (workflow: WorkflowType) => {
    handleCloneWorkflow(workflow, workflows);
  };

  const handleRefreshWrapper = async () => {
    if (isRefreshing) return; // Prevent multiple simultaneous calls
    
    setIsRefreshing(true);
    setIsLoadingWorkflows(true);
    try {
      await handleRefresh();
    } finally {
      setIsLoadingWorkflows(false);
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <div className="container mx-auto space-y-6">
        {/* Page Header */}
        <WorkflowsHeader
          onCreateWorkflow={() => setCreateDialogOpen(true)}
          onRefresh={handleRefreshWrapper}
          isLoading={isLoadingWorkflows}
        />

        {/* Error Display */}
        {controllerError && (
          <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
            {controllerError}
          </div>
        )}

        {/* Main Content Card */}
        <Card>
          {/* Filters */}
          <WorkflowsFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            categories={categories}
          />

          {/* Tabs and Table */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <WorkflowsTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              workflows={workflows}
            />

            <TabsContent value={activeTab} className="mt-0">
              <WorkflowsTable
                workflows={filteredWorkflows}
                isLoading={isLoading}
                searchTerm={searchTerm}
                selectedCategory={selectedCategory}
                selectedStatus={selectedStatus}
                onToggleStatus={handleToggleStatus}
                onExecuteWorkflow={handleExecuteWorkflow}
                onEditWorkflow={handleEditWorkflow}
                onViewWorkflow={handleViewWorkflow}
                onCloneWorkflow={handleCloneWorkflowWrapper}
                onDeleteWorkflow={handleDeleteWorkflow}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Create Workflow Dialog */}
      <CreateWorkflowDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateWorkflow={handleCreateWorkflowWrapper}
        templates={[]}
      />
    </>
  );
};

export default WorkflowsPage;