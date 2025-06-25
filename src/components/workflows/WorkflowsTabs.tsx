import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Workflow as WorkflowType } from '@/types/workflows';

interface WorkflowsTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  workflows: WorkflowType[];
}

export const WorkflowsTabs: React.FC<WorkflowsTabsProps> = ({
  activeTab,
  onTabChange,
  workflows
}) => {
  return (
    <div className="px-4 pt-4">
      <TabsList>
        <TabsTrigger value="all">All ({workflows.length})</TabsTrigger>
        <TabsTrigger value="active">
          Active ({workflows.filter(w => w.status === 'active').length})
        </TabsTrigger>
        <TabsTrigger value="draft">
          Draft ({workflows.filter(w => w.status === 'draft').length})
        </TabsTrigger>
        <TabsTrigger value="paused">
          Paused ({workflows.filter(w => w.status === 'paused').length})
        </TabsTrigger>
        <TabsTrigger value="error">
          Error ({workflows.filter(w => w.status === 'error').length})
        </TabsTrigger>
        <TabsTrigger value="archived">
          Archived ({workflows.filter(w => w.status === 'archived').length})
        </TabsTrigger>
      </TabsList>
    </div>
  );
};