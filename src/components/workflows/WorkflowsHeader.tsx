import React from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, BarChart3 } from 'lucide-react';

interface WorkflowsHeaderProps {
  onCreateWorkflow: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const WorkflowsHeader: React.FC<WorkflowsHeaderProps> = ({
  onCreateWorkflow,
  onRefresh,
  isLoading = false
}) => {
  const router = useRouter();

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visual Workflows</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage automated workflows that integrate with your platform services
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push('/workflows/statistics')}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Statistics
        </Button>
        <Button onClick={onCreateWorkflow} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>
    </div>
  );
};