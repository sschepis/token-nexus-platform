import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Settings, 
  Play, 
  Pause, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Clock, 
  Zap, 
  Globe, 
  Code,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import Parse from 'parse';
import { toast } from 'sonner';

interface AppFrameworkStatus {
  schemas: {
    available: number;
    existing: number;
    missing: number;
  };
  apps: {
    total: number;
    active: number;
  };
  installations: {
    total: number;
    active: number;
  };
  scheduledJobs: {
    total: number;
    enabled: number;
  };
  triggers: {
    total: number;
    enabled: number;
  };
  apis: {
    total: number;
    enabled: number;
  };
  executionLogs: {
    last24h: number;
    successful: number;
  };
}

interface ScheduledJob {
  id: string;
  jobId: string;
  name: string;
  description?: string;
  schedule: string;
  timezone: string;
  functionName: string;
  enabled: boolean;
  status: string;
  lastRun?: string;
  nextRun?: string;
  errorCount: number;
  lastError?: string;
}

interface AppTrigger {
  id: string;
  triggerId: string;
  name: string;
  description?: string;
  eventType: string;
  className?: string;
  customEvent?: string;
  functionName: string;
  enabled: boolean;
  status: string;
  executionCount: number;
  lastExecuted?: string;
  errorCount: number;
  lastError?: string;
}

interface AppAPI {
  id: string;
  apiId: string;
  name: string;
  description?: string;
  path: string;
  method: string;
  functionName: string;
  isPublic: boolean;
  enabled: boolean;
  status: string;
  callCount: number;
  lastCalled?: string;
  errorCount: number;
  lastError?: string;
}

export const AppFrameworkManager: React.FC = () => {
  const { currentOrg } = useAppSelector((state) => state.org);
  const [status, setStatus] = useState<AppFrameworkStatus | null>(null);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [triggers, setTriggers] = useState<AppTrigger[]>([]);
  const [apis, setApis] = useState<AppAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadFrameworkStatus();
  }, [currentOrg]);

  const loadFrameworkStatus = async () => {
    try {
      setLoading(true);
      
      // Load framework status
      const statusResult = await Parse.Cloud.run('getAppFrameworkStatus');
      setStatus(statusResult.status);

      // Load components for current organization
      if (currentOrg?.id) {
        const [jobsResult, triggersResult, apisResult] = await Promise.all([
          Parse.Cloud.run('getAppScheduledJobs', { organizationId: currentOrg.id }),
          Parse.Cloud.run('getAppTriggers', { organizationId: currentOrg.id }),
          Parse.Cloud.run('getAppAPIs', { organizationId: currentOrg.id })
        ]);

        setScheduledJobs(jobsResult.jobs || []);
        setTriggers(triggersResult.triggers || []);
        setApis(apisResult.apis || []);
      }
    } catch (error) {
      console.error('Failed to load framework status:', error);
      toast.error('Failed to load app framework status');
    } finally {
      setLoading(false);
    }
  };

  const initializeFramework = async () => {
    try {
      setLoading(true);
      const result = await Parse.Cloud.run('initializeAppFramework');
      
      if (result.success) {
        toast.success('App framework initialized successfully');
        await loadFrameworkStatus();
      } else {
        toast.error(`Initialization completed with ${result.results.errors.length} errors`);
      }
    } catch (error) {
      console.error('Framework initialization failed:', error);
      toast.error('Failed to initialize app framework');
    } finally {
      setLoading(false);
    }
  };

  const toggleScheduledJob = async (jobId: string, enabled: boolean) => {
    try {
      await Parse.Cloud.run('toggleAppScheduledJob', { jobObjectId: jobId, enabled });
      toast.success(`Job ${enabled ? 'enabled' : 'disabled'} successfully`);
      await loadFrameworkStatus();
    } catch (error) {
      console.error('Failed to toggle job:', error);
      toast.error('Failed to update job status');
    }
  };

  const toggleTrigger = async (triggerId: string, enabled: boolean) => {
    try {
      await Parse.Cloud.run('toggleAppTrigger', { triggerObjectId: triggerId, enabled });
      toast.success(`Trigger ${enabled ? 'enabled' : 'disabled'} successfully`);
      await loadFrameworkStatus();
    } catch (error) {
      console.error('Failed to toggle trigger:', error);
      toast.error('Failed to update trigger status');
    }
  };

  const toggleAPI = async (apiId: string, enabled: boolean) => {
    try {
      await Parse.Cloud.run('toggleAppAPI', { apiObjectId: apiId, enabled });
      toast.success(`API ${enabled ? 'enabled' : 'disabled'} successfully`);
      await loadFrameworkStatus();
    } catch (error) {
      console.error('Failed to toggle API:', error);
      toast.error('Failed to update API status');
    }
  };

  const executeJob = async (jobId: string) => {
    try {
      await Parse.Cloud.run('executeAppScheduledJob', { jobObjectId: jobId });
      toast.success('Job executed successfully');
      await loadFrameworkStatus();
    } catch (error) {
      console.error('Failed to execute job:', error);
      toast.error('Failed to execute job');
    }
  };

  const getStatusIcon = (status: string, enabled?: boolean) => {
    if (enabled === false) return <Pause className="h-4 w-4 text-muted-foreground" />;
    
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string, enabled?: boolean) => {
    if (enabled === false) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">App Framework Manager</h1>
          <p className="text-muted-foreground">
            Manage scheduled jobs, triggers, APIs, and monitor app framework health
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadFrameworkStatus} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={initializeFramework} size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Initialize Framework
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">
            <Clock className="h-4 w-4 mr-2" />
            Jobs ({scheduledJobs.length})
          </TabsTrigger>
          <TabsTrigger value="triggers">
            <Zap className="h-4 w-4 mr-2" />
            Triggers ({triggers.length})
          </TabsTrigger>
          <TabsTrigger value="apis">
            <Globe className="h-4 w-4 mr-2" />
            APIs ({apis.length})
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Activity className="h-4 w-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {status && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Database Schemas</CardTitle>
                  <Code className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{status.schemas.existing}/{status.schemas.available}</div>
                  <p className="text-xs text-muted-foreground">
                    {status.schemas.missing > 0 ? `${status.schemas.missing} missing` : 'All schemas ready'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Scheduled Jobs</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{status.scheduledJobs.enabled}/{status.scheduledJobs.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {status.scheduledJobs.enabled} enabled
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Triggers</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{status.triggers.enabled}/{status.triggers.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {status.triggers.enabled} enabled
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">APIs</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{status.apis.enabled}/{status.apis.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {status.apis.enabled} enabled
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Execution Statistics (Last 24h)</CardTitle>
              <CardDescription>
                App framework execution activity and success rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{status.executionLogs.last24h}</div>
                    <p className="text-sm text-muted-foreground">Total Executions</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{status.executionLogs.successful}</div>
                    <p className="text-sm text-muted-foreground">Successful</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Scheduled Jobs</h2>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Job
            </Button>
          </div>

          <div className="grid gap-4">
            {scheduledJobs.map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status, job.enabled)}
                      <CardTitle className="text-lg">{job.name}</CardTitle>
                      {getStatusBadge(job.status, job.enabled)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeJob(job.id)}
                        disabled={!job.enabled}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleScheduledJob(job.id, !job.enabled)}
                      >
                        {job.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{job.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Schedule</p>
                      <p className="text-muted-foreground">{job.schedule}</p>
                    </div>
                    <div>
                      <p className="font-medium">Function</p>
                      <p className="text-muted-foreground">{job.functionName}</p>
                    </div>
                    <div>
                      <p className="font-medium">Last Run</p>
                      <p className="text-muted-foreground">
                        {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Next Run</p>
                      <p className="text-muted-foreground">
                        {job.nextRun ? new Date(job.nextRun).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {job.lastError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm font-medium text-red-800">Last Error:</p>
                      <p className="text-sm text-red-600">{job.lastError}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Event Triggers</h2>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Trigger
            </Button>
          </div>

          <div className="grid gap-4">
            {triggers.map((trigger) => (
              <Card key={trigger.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(trigger.status, trigger.enabled)}
                      <CardTitle className="text-lg">{trigger.name}</CardTitle>
                      {getStatusBadge(trigger.status, trigger.enabled)}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleTrigger(trigger.id, !trigger.enabled)}
                    >
                      {trigger.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                  <CardDescription>{trigger.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Event Type</p>
                      <p className="text-muted-foreground">{trigger.eventType}</p>
                    </div>
                    <div>
                      <p className="font-medium">Class/Event</p>
                      <p className="text-muted-foreground">{trigger.className || trigger.customEvent}</p>
                    </div>
                    <div>
                      <p className="font-medium">Function</p>
                      <p className="text-muted-foreground">{trigger.functionName}</p>
                    </div>
                    <div>
                      <p className="font-medium">Executions</p>
                      <p className="text-muted-foreground">{trigger.executionCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="apis" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">API Endpoints</h2>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add API
            </Button>
          </div>

          <div className="grid gap-4">
            {apis.map((api) => (
              <Card key={api.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(api.status, api.enabled)}
                      <CardTitle className="text-lg">{api.name}</CardTitle>
                      {getStatusBadge(api.status, api.enabled)}
                      {api.isPublic && <Badge variant="outline">Public</Badge>}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleAPI(api.id, !api.enabled)}
                    >
                      {api.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                  <CardDescription>{api.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Endpoint</p>
                      <p className="text-muted-foreground font-mono">{api.method} {api.path}</p>
                    </div>
                    <div>
                      <p className="font-medium">Function</p>
                      <p className="text-muted-foreground">{api.functionName}</p>
                    </div>
                    <div>
                      <p className="font-medium">Calls</p>
                      <p className="text-muted-foreground">{api.callCount}</p>
                    </div>
                    <div>
                      <p className="font-medium">Last Called</p>
                      <p className="text-muted-foreground">
                        {api.lastCalled ? new Date(api.lastCalled).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution Logs</CardTitle>
              <CardDescription>
                Recent app framework execution logs and monitoring data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Execution logs component would be implemented here, showing recent job executions,
                trigger fires, API calls, and their results.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};