import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchScheduledTasks,
  updateScheduledTask,
  deleteScheduledTask,
  ScheduledTask,
  clearAiAssistantErrors,
} from '@/store/slices/aiAssistantSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Toggle } from '@/components/ui/toggle';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  MoreHorizontal,
  Loader2,
  Trash2,
  Eye,
  Play,
  Pause,
  RefreshCw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ScheduledTaskListProps {
  onViewDetails: (task: ScheduledTask) => void;
  onEditTask: (task: ScheduledTask) => void;
}

const ScheduledTaskList: React.FC<ScheduledTaskListProps> = ({ onViewDetails, onEditTask }) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { scheduledTasks, isLoadingTasks, isUpdatingTask, isDeletingTask, error } = useAppSelector(
    (state) => state.aiAssistant
  );

  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = React.useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchScheduledTasks({}));
    dispatch(clearAiAssistantErrors());
  }, [dispatch]);

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

  const handleToggleActive = async (task: ScheduledTask) => {
    try {
      await dispatch(updateScheduledTask({ taskId: task.id, updates: { isActive: !task.isActive } })).unwrap();
      toast({
        title: 'Task Updated',
        description: `Task "${task.name}" has been ${!task.isActive ? 'activated' : 'deactivated'}.`,
      });
    } catch (e) {
      // Error handled by useEffect
    }
  };

  const handleDeleteConfirmation = (taskId: string) => {
    setConfirmDeleteTaskId(taskId);
  };

  const handleDeleteTask = async () => {
    if (!confirmDeleteTaskId) return;
    try {
      await dispatch(deleteScheduledTask(confirmDeleteTaskId)).unwrap();
      toast({
        title: 'Task Deleted',
        description: 'Scheduled task has been successfully deleted.',
      });
      setConfirmDeleteTaskId(null);
    } catch (e) {
      // Error handled by useEffect
    }
  };

  const handleRefresh = () => {
    dispatch(fetchScheduledTasks({}));
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Scheduled Tasks</CardTitle>
        <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isLoadingTasks}>
          {isLoadingTasks ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Cron Expression</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Next Run</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingTasks ? (
              Array(5)
                .fill(0)
                .map((_, index) => (
                  <TableRow key={index}>
                    {Array(7)
                      .fill(0)
                      .map((_, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                  </TableRow>
                ))
            ) : scheduledTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No scheduled tasks found.
                </TableCell>
              </TableRow>
            ) : (
              scheduledTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.name}</TableCell>
                  <TableCell>{task.description}</TableCell>
                  <TableCell>{task.cronExpression}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`status-toggle-${task.id}`}
                        checked={task.isActive}
                        onCheckedChange={() => handleToggleActive(task)}
                        disabled={isUpdatingTask || isDeletingTask}
                      />
                      <Label htmlFor={`status-toggle-${task.id}`}>{task.isActive ? 'Active' : 'Inactive'}</Label>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(task.lastRun?.toISOString())}</TableCell>
                  <TableCell>{formatDate(task.nextRun?.toISOString())}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onViewDetails(task)}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditTask(task)}>
                          <Play className="mr-2 h-4 w-4" /> Edit Task
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteConfirmation(task.id)}
                          className="text-destructive"
                          disabled={isDeletingTask}
                        >
                          {isDeletingTask && confirmDeleteTaskId === task.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <AlertDialog open={!!confirmDeleteTaskId} onOpenChange={setConfirmDeleteTaskId}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your scheduled task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingTask}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} disabled={isDeletingTask}>
              {isDeletingTask ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ScheduledTaskList;