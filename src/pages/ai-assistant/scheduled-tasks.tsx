// pages/ai-assistant/scheduled-tasks.tsx
import React, { useState } from 'react';
import ScheduledTaskList from '@/components/ai-assistant/ScheduledTaskList';
import CreateScheduledTaskForm from '@/components/ai-assistant/CreateScheduledTaskForm';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScheduledTask } from '@/store/slices/aiAssistantSlice'; // Import from slice

const ScheduledTasksPage: React.FC = () => {
  const { toast } = useToast();
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | undefined>(undefined);

  const handleCreateNewTask = () => {
    setEditingTask(undefined);
    setIsCreatingTask(true);
  };

  const handleTaskFormSuccess = () => {
    setIsCreatingTask(false);
    setEditingTask(undefined);
  };

  const handleTaskFormCancel = () => {
    setIsCreatingTask(false);
    setEditingTask(undefined);
  };

  const handleViewDetails = (task: ScheduledTask) => {
    // For now, just show a toast or a simple alert
    toast({
      title: 'Task Details',
      description: `Viewing details for task: ${task.name} (ID: ${task.id})`,
    });
    // In a real application, you might open a modal or navigate to a dedicated detail page
  };

  const handleEditTask = (task: ScheduledTask) => {
    setEditingTask(task);
    setIsCreatingTask(true); // Re-use the form for editing
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scheduled AI Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage and schedule recurring tasks for your AI assistant.
          </p>
        </div>
        <Button size="sm" onClick={handleCreateNewTask}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule New Task
        </Button>
      </div>

      {isCreatingTask ? (
        <CreateScheduledTaskForm
          initialData={editingTask}
          onSuccess={handleTaskFormSuccess}
          onCancel={handleTaskFormCancel}
        />
      ) : (
        <ScheduledTaskList onViewDetails={handleViewDetails} onEditTask={handleEditTask} />
      )}
    </div>
  );
};

export default ScheduledTasksPage;