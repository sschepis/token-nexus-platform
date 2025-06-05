import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createScheduledTask, updateScheduledTask, ScheduledTask, clearAiAssistantErrors } from '@/store/slices/aiAssistantSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import CronExpressionBuilder from './CronExpressionBuilder'; // Will be created next

interface CreateScheduledTaskFormProps {
  initialData?: ScheduledTask;
  onSuccess: () => void;
  onCancel: () => void;
}

const CreateScheduledTaskForm: React.FC<CreateScheduledTaskFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { isCreatingTask, isUpdatingTask, error } = useAppSelector((state) => state.aiAssistant);

  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [cronExpression, setCronExpression] = useState(initialData?.cronExpression || '');
  const [actionDetails, setActionDetails] = useState<string>(
    JSON.stringify(initialData?.actionDetails || {}, null, 2)
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  const isSubmitting = initialData ? isUpdatingTask : isCreatingTask;

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      dispatch(clearAiAssistantErrors());
    }
  }, [error, toast, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedActionDetails = JSON.parse(actionDetails);
      const taskData = {
        name,
        description,
        cronExpression,
        actionDetails: parsedActionDetails,
      };

      if (initialData) {
        // Update existing task
        await dispatch(updateScheduledTask({ taskId: initialData.id, updates: { ...taskData, isActive } })).unwrap();
        toast({
          title: 'Task Updated',
          description: `Scheduled task "${name}" has been updated.`,
        });
      } else {
        // Create new task
        await dispatch(createScheduledTask(taskData)).unwrap();
        toast({
          title: 'Task Scheduled',
          description: `Scheduled task "${name}" has been created.`,
        });
      }
      onSuccess();
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        toast({
          title: 'Invalid JSON',
          description: 'Action Details must be a valid JSON object.',
          variant: 'destructive',
        });
      }
      // Other errors are handled by useEffect
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Scheduled Task' : 'Schedule New AI Task'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Task Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Daily Report Generation"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this task does"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cronExpression">Cron Expression</Label>
            <Input
              id="cronExpression"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="e.g., 0 0 * * * (daily at midnight)"
              required
              disabled={isSubmitting}
            />
            {/* <CronExpressionBuilder value={cronExpression} onChange={setCronExpression} /> */}
            <p className="text-sm text-gray-500">
              Need help with Cron? Use a tool like <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">crontab.guru</a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="actionDetails">Action Details (JSON)</Label>
            <Textarea
              id="actionDetails"
              value={actionDetails}
              onChange={(e) => setActionDetails(e.target.value)}
              placeholder={`{\n  "query": "Summarize daily audit logs",\n  "tool": "report-generator"\n}`}
              rows={8}
              spellCheck="false"
              className="font-mono"
              required
              disabled={isSubmitting}
            />
            <p className="text-sm text-gray-500">
              Define the AI action to perform. Must be valid JSON.
            </p>
          </div>
          
          {initialData && (
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={isSubmitting}
              />
              <Label htmlFor="isActive">Task is Active</Label>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Update Task' : 'Schedule Task'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateScheduledTaskForm;