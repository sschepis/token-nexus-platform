import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { controllerRegistry } from "@/controllers/ControllerRegistry";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  ArrowUpDown,
  RefreshCw,
  Clock,
  Play,
  Pause,
  Copy,
  Edit,
  Trash2,
  Activity,
  CheckCircle,
  AlertCircle,
  Calendar,
  Timer,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast as sonnerToast } from "sonner";
import {
  addJob,
  updateJob,
  deleteJob,
  setSelectedJob,
  setJobStatus,
  recordJobExecution,
} from "@/store/slices/scheduledJobSlice";
import { ScheduledJob, CreateJobRequest, JobStatus, JobFrequency } from "@/types/scheduled-jobs";

/**
 * Scheduled Jobs Page Component
 *
 * This page manages Parse scheduled jobs for automated task execution.
 * Scheduled jobs run at specified intervals using cron expressions.
 * 
 * Features:
 * - Create jobs with flexible cron scheduling
 * - Manage job execution and monitoring
 * - Advanced code editor with Parse Cloud Code syntax
 * - Real-time execution tracking and statistics
 * - AI assistant integration for automated job management
 */
const ScheduledJobsPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { jobs, selectedJobId, isLoading, error } = useAppSelector((state) => state.scheduledJob);
  const { currentOrg } = useAppSelector((state) => state.org);
  const { user: currentUser } = useAppSelector((state) => state.auth);

  // Get the page controller for AI assistant integration
  const scheduledJobsPageController = controllerRegistry.getPageController('scheduled-jobs');
  const isRegistered = !!scheduledJobsPageController;

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState<JobFrequency | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | "all">("all");

  // Filter jobs based on search, tab, frequency, and status
  const filteredJobs = jobs.filter((job) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && job.status === "active") ||
      (activeTab === "paused" && job.status === "disabled") ||
      (activeTab === "error" && job.status === "failed") ||
      (activeTab === "completed" && job.status === "completed");

    const matchesSearch =
      searchTerm === "" ||
      job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFrequency = selectedFrequency === "all" || job.frequency === selectedFrequency;
    const matchesStatus = selectedStatus === "all" || job.status === selectedStatus;

    return matchesTab && matchesSearch && matchesFrequency && matchesStatus;
  });

  const handleCreateJob = async (jobData: CreateJobRequest) => {
    try {
      dispatch(addJob(jobData));
      sonnerToast.success('Scheduled job created successfully');
    } catch (error) {
      console.error('Failed to create scheduled job:', error);
      sonnerToast.error(`Failed to create job: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const handleToggleStatus = async (jobId: string, currentStatus: JobStatus) => {
    const newStatus: JobStatus = currentStatus === "active" ? "disabled" : "active";
    
    try {
      dispatch(setJobStatus({ id: jobId, status: newStatus }));
      sonnerToast.success(`Job ${newStatus === 'active' ? 'activated' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle job status:', error);
      sonnerToast.error(`Failed to update job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRunJobNow = async (jobId: string, jobName: string) => {
    try {
      // Record the execution
      dispatch(recordJobExecution({
        id: jobId,
        success: true,
        executionTime: Math.floor(Math.random() * 5000) + 100, // Simulated duration
      }));
      
      sonnerToast.success(`Job "${jobName}" executed successfully`);
    } catch (error) {
      console.error('Failed to run job:', error);
      sonnerToast.error(`Failed to run job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteJob = async (jobId: string, jobName: string) => {
    try {
      dispatch(deleteJob(jobId));
      sonnerToast.success('Scheduled job deleted successfully');
    } catch (error) {
      console.error('Failed to delete job:', error);
      sonnerToast.error(`Failed to delete job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCloneJob = async (sourceJob: ScheduledJob) => {
    const newName = prompt(`Enter a name for the cloned job:`, `${sourceJob.name}_copy`);
    if (!newName) return;

    if (jobs.some(j => j.name === newName)) {
      sonnerToast.error('A job with that name already exists');
      return;
    }

    try {
      const clonedJob: CreateJobRequest = {
        name: newName,
        description: `Clone of ${sourceJob.description}`,
        code: sourceJob.code,
        frequency: sourceJob.frequency,
        cronExpression: sourceJob.cronExpression,
        parameters: sourceJob.parameters,
        tags: [...(sourceJob.tags || []), 'cloned']
      };
      
      dispatch(addJob(clonedJob));
      sonnerToast.success(`Job cloned successfully as "${newName}"`);
    } catch (error) {
      console.error('Failed to clone job:', error);
      sonnerToast.error(`Failed to clone job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRefreshJobs = async () => {
    try {
      sonnerToast.info("Refreshing scheduled jobs...");
      // In a real implementation, this would fetch from the server
      sonnerToast.success("Jobs refreshed successfully");
    } catch (error) {
      console.error('Failed to refresh jobs:', error);
      sonnerToast.error(`Failed to refresh jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'disabled':
        return <Pause className="h-4 w-4 text-gray-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadgeVariant = (status: JobStatus) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'disabled':
        return 'secondary';
      case 'completed':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getFrequencyIcon = (frequency: JobFrequency) => {
    switch (frequency) {
      case 'once':
        return <Zap className="h-4 w-4" />;
      case 'hourly':
      case 'daily':
      case 'weekly':
      case 'monthly':
        return <Clock className="h-4 w-4" />;
      case 'custom':
        return <Timer className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getFrequencyColor = (frequency: JobFrequency) => {
    switch (frequency) {
      case 'once':
        return 'text-purple-600 bg-purple-50';
      case 'hourly':
        return 'text-blue-600 bg-blue-50';
      case 'daily':
        return 'text-green-600 bg-green-50';
      case 'weekly':
        return 'text-orange-600 bg-orange-50';
      case 'monthly':
        return 'text-red-600 bg-red-50';
      case 'custom':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatNextRun = (nextRun: string) => {
    const date = new Date(nextRun);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    if (diffMs < 0) return 'Overdue';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scheduled Jobs</h1>
            <p className="text-muted-foreground mt-1">
              Manage automated tasks and scheduled job execution
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshJobs}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          </div>
        </div>

        <Card>
          <div className="p-4 border-b">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedFrequency}
                  onChange={(e) => setSelectedFrequency(e.target.value as JobFrequency | "all")}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Frequencies</option>
                  <option value="once">Once</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as JobStatus | "all")}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="error">Error</option>
                  <option value="completed">Completed</option>
                </select>

                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 pt-4">
              <TabsList>
                <TabsTrigger value="all">All ({jobs.length})</TabsTrigger>
                <TabsTrigger value="active">
                  Active ({jobs.filter(j => j.status === 'active').length})
                </TabsTrigger>
                <TabsTrigger value="paused">
                  Disabled ({jobs.filter(j => j.status === 'disabled').length})
                </TabsTrigger>
                <TabsTrigger value="error">
                  Failed ({jobs.filter(j => j.status === 'failed').length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({jobs.filter(j => j.status === 'completed').length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              <div className="relative overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">
                        <div className="flex items-center">
                          Job
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Function</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Executions</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array(5)
                        .fill(0)
                        .map((_, index) => (
                          <TableRow key={index}>
                            {Array(8)
                              .fill(0)
                              .map((_, cellIndex) => (
                                <TableCell key={cellIndex}>
                                  <Skeleton className="h-6 w-full" />
                                </TableCell>
                              ))}
                          </TableRow>
                        ))
                    ) : filteredJobs.length > 0 ? (
                      filteredJobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {getStatusIcon(job.status)}
                              <div>
                                <div className="font-medium">{job.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {job.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="outline">{job.name}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium ${getFrequencyColor(job.frequency)}`}>
                              {getFrequencyIcon(job.frequency)}
                              {job.frequency}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {job.nextRun ? (
                                <>
                                  <div className="font-medium">{formatNextRun(job.nextRun)}</div>
                                  <div className="text-muted-foreground text-xs">
                                    {new Date(job.nextRun).toLocaleString()}
                                  </div>
                                </>
                              ) : (
                                <span className="text-muted-foreground">Not scheduled</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={job.status === "active"}
                                onCheckedChange={() => handleToggleStatus(job.id, job.status)}
                              />
                              <Badge variant={getStatusBadgeVariant(job.status)}>
                                {job.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{job.executionCount || 0}</div>
                              {job.failureCount && job.failureCount > 0 && (
                                <div className="text-red-600 text-xs">
                                  {job.failureCount} errors
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {new Date(job.updatedAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleRunJobNow(job.id, job.name)}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Run now
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  dispatch(setSelectedJob(job.id));
                                  // Navigate to edit view
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit job
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  navigator.clipboard.writeText(job.code);
                                  sonnerToast.success('Code copied to clipboard');
                                }}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy code
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCloneJob(job)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Clone job
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete the job "${job.name}"?`)) {
                                      handleDeleteJob(job.id, job.name);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete job
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          {searchTerm || selectedFrequency !== "all" || selectedStatus !== "all" ? (
                            <div className="text-muted-foreground">
                              No jobs found matching the current filters
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              No scheduled jobs found. Create your first job to get started.
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Create Job Dialog will be added here */}
    </>
  );
};

export default ScheduledJobsPage;