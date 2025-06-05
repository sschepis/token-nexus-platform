import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  FileText,
  AlertCircle,
  CheckCircle,
  Calendar,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import Parse from 'parse';

interface JobManagerProps {
  appId: string;
}

interface ScheduledJob {
  id: string;
  name: string;
  description?: string;
  schedule: string;
  function: string;
  params?: Record<string, unknown>;
  enabled: boolean;
  timezone: string;
  lastRun?: Date;
  nextRun?: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface JobLog {
  id: string;
  jobId: string;
  status: 'success' | 'error';
  result?: Record<string, unknown>;
  error?: string;
  duration: number;
  executedAt: Date;
}

export const JobManager: React.FC<JobManagerProps> = ({ appId }) => {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadAppJobs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await Parse.Cloud.run('getAppScheduledJobs', { appId });
      setJobs(result.jobs || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error('Failed to load scheduled jobs');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    loadAppJobs();
  }, [loadAppJobs]);

  const loadJobLogs = async (jobId?: string) => {
    try {
      setLogsLoading(true);
      const result = await Parse.Cloud.run('getJobExecutionLogs', {
        appId,
        jobId,
        limit: 100
      });
      setLogs(result.logs || []);
    } catch (error) {
      console.error('Error loading job logs:', error);
      toast.error('Failed to load job logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const toggleJob = async (jobId: string, enabled: boolean) => {
    try {
      await Parse.Cloud.run('toggleAppJob', { appId, jobId, enabled });
      toast.success(`Job ${enabled ? 'enabled' : 'disabled'} successfully`);
      await loadAppJobs();
    } catch (error) {
      console.error('Error toggling job:', error);
      toast.error(`Failed to ${enabled ? 'enable' : 'disable'} job`);
    }
  };

  const runJobNow = async (jobId: string) => {
    try {
      const result = await Parse.Cloud.run('runAppJobNow', { appId, jobId });
      toast.success('Job executed successfully');
      await loadAppJobs();
      if (selectedJob === jobId) {
        await loadJobLogs(jobId);
      }
    } catch (error) {
      console.error('Error running job:', error);
      toast.error('Failed to execute job');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'disabled': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDuration = (duration: number) => {
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const formatCronExpression = (schedule: string) => {
    // Simple cron expression formatter
    const parts = schedule.split(' ');
    if (parts.length === 5) {
      const [minute, hour, day, month, weekday] = parts;

      if (schedule === '0 0 * * *') return 'Daily at midnight';
      if (schedule === '0 9 * * *') return 'Daily at 9:00 AM';
      if (schedule === '0 0 * * 0') return 'Weekly on Sunday';
      if (schedule === '0 0 1 * *') return 'Monthly on 1st';

      return `${minute} ${hour} ${day} ${month} ${weekday}`;
    }
    return schedule;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading scheduled jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Jobs
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage automated tasks and scheduled operations
          </p>
        </div>
        <Button onClick={loadAppJobs} variant="outline" size="sm">
          <RotateCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Scheduled Jobs</h3>
            <p className="text-muted-foreground text-center">
              This app doesn't have any scheduled jobs configured.
              Jobs are defined in the app manifest during development.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
            <TabsTrigger value="logs" onClick={() => loadJobLogs()}>
              Execution Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {job.name}
                        <Badge variant={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                      </CardTitle>
                      {job.description && (
                        <p className="text-sm text-muted-foreground">
                          {job.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={job.enabled}
                        onCheckedChange={(enabled) => toggleJob(job.id, enabled)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Schedule
                      </label>
                      <p className="text-sm font-mono">
                        {formatCronExpression(job.schedule)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Function
                      </label>
                      <p className="text-sm font-mono">{job.function}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Last Run
                      </label>
                      <p className="text-sm">
                        {job.lastRun
                          ? new Date(job.lastRun).toLocaleString()
                          : 'Never'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Next Run
                      </label>
                      <p className="text-sm">
                        {job.nextRun && job.enabled
                          ? new Date(job.nextRun).toLocaleString()
                          : 'Not scheduled'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runJobNow(job.id)}
                      disabled={!job.enabled}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Run Now
                    </Button>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedJob(job.id);
                            loadJobLogs(job.id);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Logs
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle>Job Execution Logs: {job.name}</DialogTitle>
                          <DialogDescription>
                            Recent execution history for this scheduled job
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-96">
                          {logsLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Clock className="h-6 w-6 animate-spin" />
                            </div>
                          ) : (
                            <JobLogsTable
                              logs={logs.filter(log => log.jobId === job.id)}
                            />
                          )}
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>

                    {job.params && Object.keys(job.params).length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Settings className="h-4 w-4 mr-2" />
                            Parameters
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Job Parameters</DialogTitle>
                            <DialogDescription>
                              Configuration parameters for {job.name}
                            </DialogDescription>
                          </DialogHeader>
                          <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                            {JSON.stringify(job.params, null, 2)}
                          </pre>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>All Job Execution Logs</CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Clock className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <JobLogsTable logs={logs} showJobName />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

interface JobLogsTableProps {
  logs: JobLog[];
  showJobName?: boolean;
}

const JobLogsTable: React.FC<JobLogsTableProps> = ({ logs, showJobName = false }) => {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No execution logs found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          {showJobName && <TableHead>Job</TableHead>}
          <TableHead>Executed At</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {log.status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="capitalize">{log.status}</span>
              </div>
            </TableCell>
            {showJobName && (
              <TableCell className="font-mono text-sm">
                {log.jobId}
              </TableCell>
            )}
            <TableCell>
              {new Date(log.executedAt).toLocaleString()}
            </TableCell>
            <TableCell>
              {formatDuration(log.duration)}
            </TableCell>
            <TableCell>
              {log.status === 'success' ? (
                <span className="text-green-600">Success</span>
              ) : (
                <span className="text-red-600 text-sm">
                  {log.error || 'Unknown error'}
                </span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  function formatDuration(duration: number) {
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  }
};

export default JobManager;