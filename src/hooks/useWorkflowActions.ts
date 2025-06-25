import { useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch } from '@/store/hooks';
import { useToast } from '@/hooks/use-toast';
import {
  createWorkflow,
  setSelectedWorkflowId,
  executeWorkflow,
  deleteWorkflow,
  cloneWorkflow,
} from '@/store/slices/workflowSlice';
import {
  Workflow as WorkflowType,
  CreateWorkflowRequest,
  WorkflowStatus,
  CloneWorkflowRequest
} from '@/types/workflows';
interface UseWorkflowActionsProps {
  pageController?: {
    isRegistered: boolean;
    executeAction: (actionId: string, params: Record<string, unknown>) => Promise<{ success: boolean; error?: string; data?: unknown }>;
  };
  onError: (error: string) => void;
}

export const useWorkflowActions = ({ pageController, onError }: UseWorkflowActionsProps) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const handleCreateWorkflow = useCallback(async (workflowData: CreateWorkflowRequest) => {
    try {
      if (pageController?.isRegistered) {
        const result = await pageController.executeAction('createWorkflow', workflowData as unknown as Record<string, unknown>);
        if (result.success) {
          await dispatch(createWorkflow(workflowData)).unwrap();
          toast({
            title: "Success",
            description: "Workflow created successfully",
          });
          return true;
        } else {
          throw new Error(result.error || 'Failed to create workflow');
        }
      } else {
        await dispatch(createWorkflow(workflowData)).unwrap();
        toast({
          title: "Success",
          description: "Workflow created successfully",
        });
        return true;
      }
    } catch (error) {
      console.error('Failed to create workflow:', error);
      onError(`Failed to create workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, [pageController, dispatch, toast, onError]);

  const handleToggleStatus = useCallback(async (workflowId: string, currentStatus: WorkflowStatus) => {
    const newStatus: WorkflowStatus = currentStatus === "active" ? "paused" : "active";
    
    try {
      if (pageController?.isRegistered) {
        const result = await pageController.executeAction('updateWorkflowStatus', {
          workflowId,
          status: newStatus
        });
        if (result.success) {
          toast({
            title: "Success",
            description: `Workflow ${newStatus === 'active' ? 'activated' : 'paused'}`,
          });
        } else {
          throw new Error(result.error || 'Failed to update workflow');
        }
      } else {
        toast({
          title: "Success",
          description: `Workflow ${newStatus === 'active' ? 'activated' : 'paused'}`,
        });
      }
    } catch (error) {
      console.error('Failed to toggle workflow status:', error);
      onError(`Failed to update workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [pageController, toast, onError]);

  const handleExecuteWorkflow = useCallback(async (workflowId: string, workflowName: string) => {
    try {
      if (pageController?.isRegistered) {
        const result = await pageController.executeAction('executeWorkflow', {
          workflowId,
          workflowName
        });
        if (result.success) {
          dispatch(executeWorkflow({ workflowId }));
          toast({
            title: "Success",
            description: `Workflow "${workflowName}" execution started`,
          });
        } else {
          throw new Error(result.error || 'Failed to execute workflow');
        }
      } else {
        dispatch(executeWorkflow({ workflowId }));
        toast({
          title: "Success",
          description: `Workflow "${workflowName}" execution started`,
        });
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      onError(`Failed to execute workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [pageController, dispatch, toast, onError]);

  const handleEditWorkflow = useCallback((workflowId: string) => {
    dispatch(setSelectedWorkflowId(workflowId));
    router.push(`/workflows/${workflowId}/edit`);
  }, [dispatch, router]);

  const handleViewWorkflow = useCallback((workflowId: string) => {
    dispatch(setSelectedWorkflowId(workflowId));
    router.push(`/workflows/${workflowId}`);
  }, [dispatch, router]);

  const handleDeleteWorkflow = useCallback(async (workflowId: string, workflowName: string) => {
    try {
      if (pageController?.isRegistered) {
        const result = await pageController.executeAction('deleteWorkflow', {
          workflowId,
          workflowName
        });
        if (result.success) {
          await dispatch(deleteWorkflow(workflowId)).unwrap();
          toast({
            title: "Success",
            description: "Workflow deleted successfully",
          });
        } else {
          throw new Error(result.error || 'Failed to delete workflow');
        }
      } else {
        await dispatch(deleteWorkflow(workflowId)).unwrap();
        toast({
          title: "Success",
          description: "Workflow deleted successfully",
        });
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      onError(`Failed to delete workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [pageController, dispatch, toast, onError]);

  const handleCloneWorkflow = useCallback(async (sourceWorkflow: WorkflowType, workflows: WorkflowType[]) => {
    const newName = prompt(`Enter a name for the cloned workflow:`, `${sourceWorkflow.name}_copy`);
    if (!newName) return;

    if (workflows.some(w => w.name === newName)) {
      onError('A workflow with that name already exists');
      return;
    }

    try {
      const cloneRequest: CloneWorkflowRequest = {
        sourceWorkflowId: sourceWorkflow.id,
        name: newName,
        description: `Clone of ${sourceWorkflow.description || sourceWorkflow.name}`
      };
      
      if (pageController?.isRegistered) {
        const result = await pageController.executeAction('cloneWorkflow', cloneRequest as unknown as Record<string, unknown>);
        if (result.success) {
          await dispatch(cloneWorkflow(cloneRequest)).unwrap();
          toast({
            title: "Success",
            description: `Workflow cloned successfully as "${newName}"`,
          });
        } else {
          throw new Error(result.error || 'Failed to clone workflow');
        }
      } else {
        await dispatch(cloneWorkflow(cloneRequest)).unwrap();
        toast({
          title: "Success",
          description: `Workflow cloned successfully as "${newName}"`,
        });
      }
    } catch (error) {
      console.error('Failed to clone workflow:', error);
      onError(`Failed to clone workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [pageController, dispatch, toast, onError]);

  const handleRefresh = useCallback(async () => {
    if (!pageController?.isRegistered) {
      // If controller not registered, show error instead of fallback
      onError('Page controller not registered');
      return;
    }
    
    try {
      const result = await pageController.executeAction('getWorkflows', { includeStats: true });
      if (result.success) {
        // Controller action handles data management - no need to dispatch Redux action
        toast({
          title: "Success",
          description: "Workflows refreshed successfully",
        });
      } else {
        onError(result.error || 'Failed to refresh workflows');
      }
    } catch (error) {
      console.error('Failed to refresh workflows:', error);
      onError(`Failed to refresh workflows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [pageController, toast, onError]);

  return {
    handleCreateWorkflow,
    handleToggleStatus,
    handleExecuteWorkflow,
    handleEditWorkflow,
    handleViewWorkflow,
    handleDeleteWorkflow,
    handleCloneWorkflow,
    handleRefresh,
  };
};