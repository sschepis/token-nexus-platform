import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { 
  Code, 
  Play, 
  Square, 
  Terminal, 
  FileText, 
  Clock, 
  Cpu, 
  MemoryStick,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
  Settings
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { appFrameworkApi } from '@/services/api/appFramework';
import { toast } from 'sonner';

interface ExecutionEnvironment {
  id: string;
  name: string;
  runtime: 'nodejs' | 'python' | 'javascript' | 'typescript';
  version: string;
  memoryLimit: number; // MB
  timeoutLimit: number; // seconds
  networkAccess: boolean;
  fileSystemAccess: boolean;
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  updatedAt: string;
}

interface CodeExecution {
  id: string;
  environmentId: string;
  appId: string;
  functionName: string;
  code: string;
  input?: any;
  output?: any;
  error?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  startTime: string;
  endTime?: string;
  duration?: number;
  memoryUsed?: number;
  cpuUsed?: number;
  logs: string[];
}

interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  averageMemoryUsage: number;
  last24h: {
    executions: number;
    errors: number;
  };
}

export const AppCodeExecutor: React.FC = () => {
  const { currentOrg } = useAppSelector((state) => state.org);
  const [environments, setEnvironments] = useState<ExecutionEnvironment[]>([]);
  const [executions, setExecutions] = useState<CodeExecution[]>([]);
  const [stats, setStats] = useState<ExecutionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('environments');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');
  
  // Code execution form
  const [executionForm, setExecutionForm] = useState({
    environmentId: '',
    appId: '',
    functionName: '',
    code: '',
    input: '{}',
    timeout: 30,
    memoryLimit: 128
  });
  
  // Real-time execution monitoring
  const [runningExecution, setRunningExecution] = useState<CodeExecution | null>(null);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadExecutorData();
  }, [currentOrg]);

  useEffect(() => {
    // Auto-scroll logs to bottom
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [executionLogs]);

  const loadExecutorData = async () => {
    try {
      setLoading(true);
      
      const [environmentsResponse, executionsResponse, statsResponse] = await Promise.all([
        appFrameworkApi.getExecutionEnvironments(currentOrg?.id || ''),
        appFrameworkApi.getCodeExecutions({
          organizationId: currentOrg?.id || '',
          limit: 50,
          skip: 0
        }),
        appFrameworkApi.getExecutionStats(currentOrg?.id || '')
      ]);

      setEnvironments(environmentsResponse.success ? environmentsResponse.data : []);
      setExecutions(executionsResponse.success ? executionsResponse.data : []);
      setStats(statsResponse.success ? statsResponse.data : null);
      
      // Set default environment
      if (environmentsResponse.success && environmentsResponse.data?.length > 0 && !selectedEnvironment) {
        setSelectedEnvironment(environmentsResponse.data[0].id);
        setExecutionForm(prev => ({
          ...prev,
          environmentId: environmentsResponse.data[0].id
        }));
      }
    } catch (error) {
      console.error('Failed to load executor data:', error);
      toast.error('Failed to load code execution data');
    } finally {
      setLoading(false);
    }
  };

  const createEnvironment = async (envData: Partial<ExecutionEnvironment>) => {
    try {
      const response = await appFrameworkApi.createExecutionEnvironment({
        organizationId: currentOrg?.id || '',
        name: envData.name || '',
        type: (envData as any).type || '',
        configuration: (envData as any).configuration || {}
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create execution environment');
      }
      
      toast.success('Execution environment created successfully');
      await loadExecutorData();
    } catch (error) {
      console.error('Failed to create environment:', error);
      toast.error('Failed to create execution environment');
    }
  };

  const executeCode = async () => {
    try {
      if (!executionForm.code.trim()) {
        toast.error('Please enter code to execute');
        return;
      }

      setRunningExecution({
        id: 'temp-' + Date.now(),
        environmentId: executionForm.environmentId,
        appId: executionForm.appId,
        functionName: executionForm.functionName,
        code: executionForm.code,
        input: JSON.parse(executionForm.input || '{}'),
        status: 'pending',
        startTime: new Date().toISOString(),
        logs: []
      });
      setExecutionLogs([]);

      const response = await appFrameworkApi.executeCustomCode({
        organizationId: currentOrg?.id || '',
        environmentId: executionForm.environmentId,
        code: executionForm.code
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to execute code');
      }

      const result = response.data;

      setRunningExecution(result.execution);
      setExecutionLogs(result.execution.logs || []);
      
      if (result.execution.status === 'completed') {
        toast.success('Code executed successfully');
      } else if (result.execution.status === 'failed') {
        toast.error('Code execution failed');
      }

      await loadExecutorData();
    } catch (error) {
      console.error('Failed to execute code:', error);
      toast.error('Failed to execute code');
      setRunningExecution(null);
    }
  };

  const stopExecution = async (executionId: string) => {
    try {
      const response = await appFrameworkApi.stopCodeExecution(executionId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to stop execution');
      }
      toast.success('Execution stopped');
      setRunningExecution(null);
      await loadExecutorData();
    } catch (error) {
      console.error('Failed to stop execution:', error);
      toast.error('Failed to stop execution');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'timeout':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'timeout':
        return <Badge variant="destructive">Timeout</Badge>;
      case 'running':
        return <Badge className="bg-blue-500">Running</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRuntimeIcon = (runtime: string) => {
    switch (runtime) {
      case 'nodejs':
        return '🟢';
      case 'python':
        return '🐍';
      case 'javascript':
        return '🟨';
      case 'typescript':
        return '🔷';
      default:
        return '📄';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Code className="h-8 w-8 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">App Code Executor</h1>
          <p className="text-muted-foreground">
            Execute custom code in secure, isolated environments
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadExecutorData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
              <Terminal className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalExecutions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.last24h.executions} in last 24h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalExecutions > 0 
                  ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.successfulExecutions} successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageDuration}ms</div>
              <p className="text-xs text-muted-foreground">
                Average execution time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Memory</CardTitle>
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageMemoryUsage}MB</div>
              <p className="text-xs text-muted-foreground">
                Average memory usage
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="environments">
            <Settings className="h-4 w-4 mr-2" />
            Environments ({environments.length})
          </TabsTrigger>
          <TabsTrigger value="executor">
            <Play className="h-4 w-4 mr-2" />
            Code Executor
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="h-4 w-4 mr-2" />
            Execution History ({executions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="environments" className="space-y-4">
          <div className="grid gap-4">
            {environments.map((env) => (
              <Card key={env.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getRuntimeIcon(env.runtime)}</span>
                      <CardTitle className="text-lg">{env.name}</CardTitle>
                      <Badge variant="outline">{env.runtime} {env.version}</Badge>
                      <Badge className={env.status === 'active' ? 'bg-green-500' : 'bg-red-500'}>
                        {env.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Memory Limit</p>
                      <p className="text-muted-foreground">{env.memoryLimit} MB</p>
                    </div>
                    <div>
                      <p className="font-medium">Timeout</p>
                      <p className="text-muted-foreground">{env.timeoutLimit}s</p>
                    </div>
                    <div>
                      <p className="font-medium">Network Access</p>
                      <p className="text-muted-foreground">{env.networkAccess ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <div>
                      <p className="font-medium">File System</p>
                      <p className="text-muted-foreground">{env.fileSystemAccess ? 'Enabled' : 'Disabled'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="executor" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Code Input */}
            <Card>
              <CardHeader>
                <CardTitle>Code Execution</CardTitle>
                <CardDescription>
                  Write and execute custom code in a secure environment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="environment">Environment</Label>
                  <select
                    id="environment"
                    value={executionForm.environmentId}
                    onChange={(e) => setExecutionForm({ ...executionForm, environmentId: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    {environments.map((env) => (
                      <option key={env.id} value={env.id}>
                        {env.name} ({env.runtime} {env.version})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="function-name">Function Name</Label>
                  <Input
                    id="function-name"
                    value={executionForm.functionName}
                    onChange={(e) => setExecutionForm({ ...executionForm, functionName: e.target.value })}
                    placeholder="e.g., processData"
                  />
                </div>

                <div>
                  <Label htmlFor="code">Code</Label>
                  <Textarea
                    id="code"
                    value={executionForm.code}
                    onChange={(e) => setExecutionForm({ ...executionForm, code: e.target.value })}
                    placeholder="// Enter your code here..."
                    className="font-mono text-sm min-h-[200px]"
                  />
                </div>

                <div>
                  <Label htmlFor="input">Input (JSON)</Label>
                  <Textarea
                    id="input"
                    value={executionForm.input}
                    onChange={(e) => setExecutionForm({ ...executionForm, input: e.target.value })}
                    placeholder='{"key": "value"}'
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="timeout">Timeout (seconds)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={executionForm.timeout}
                      onChange={(e) => setExecutionForm({ ...executionForm, timeout: parseInt(e.target.value) })}
                      min="1"
                      max="300"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="memory">Memory Limit (MB)</Label>
                    <Input
                      id="memory"
                      type="number"
                      value={executionForm.memoryLimit}
                      onChange={(e) => setExecutionForm({ ...executionForm, memoryLimit: parseInt(e.target.value) })}
                      min="64"
                      max="1024"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={executeCode} 
                    disabled={runningExecution?.status === 'running'}
                    className="flex-1"
                  >
                    {runningExecution?.status === 'running' ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Execute
                      </>
                    )}
                  </Button>
                  {runningExecution?.status === 'running' && (
                    <Button 
                      variant="outline" 
                      onClick={() => stopExecution(runningExecution.id)}
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Execution Output */}
            <Card>
              <CardHeader>
                <CardTitle>Execution Output</CardTitle>
                {runningExecution && (
                  <div className="flex items-center gap-2">
                    {getStatusIcon(runningExecution.status)}
                    {getStatusBadge(runningExecution.status)}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {runningExecution ? (
                  <div className="space-y-4">
                    {/* Execution Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Duration</p>
                        <p className="text-muted-foreground">
                          {runningExecution.duration ? `${runningExecution.duration}ms` : 'Running...'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Memory Used</p>
                        <p className="text-muted-foreground">
                          {runningExecution.memoryUsed ? `${runningExecution.memoryUsed}MB` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Output */}
                    {runningExecution.output && (
                      <div>
                        <p className="font-medium mb-2">Output:</p>
                        <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                          {JSON.stringify(runningExecution.output, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Error */}
                    {runningExecution.error && (
                      <div>
                        <p className="font-medium mb-2 text-red-600">Error:</p>
                        <pre className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-600 overflow-x-auto">
                          {runningExecution.error}
                        </pre>
                      </div>
                    )}

                    {/* Logs */}
                    <div>
                      <p className="font-medium mb-2">Logs:</p>
                      <div className="bg-black text-green-400 p-3 rounded text-sm font-mono max-h-64 overflow-y-auto">
                        {executionLogs.map((log, index) => (
                          <div key={index}>{log}</div>
                        ))}
                        <div ref={logsEndRef} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Execute code to see output here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="grid gap-4">
            {executions.map((execution) => (
              <Card key={execution.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(execution.status)}
                      <CardTitle className="text-lg">{execution.functionName}</CardTitle>
                      {getStatusBadge(execution.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(execution.startTime).toLocaleString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Duration</p>
                      <p className="text-muted-foreground">
                        {execution.duration ? `${execution.duration}ms` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Memory Used</p>
                      <p className="text-muted-foreground">
                        {execution.memoryUsed ? `${execution.memoryUsed}MB` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Environment</p>
                      <p className="text-muted-foreground">
                        {environments.find(env => env.id === execution.environmentId)?.name || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">App</p>
                      <p className="text-muted-foreground">{execution.appId || 'Manual'}</p>
                    </div>
                  </div>

                  {execution.error && (
                    <div className="mt-4">
                      <p className="font-medium mb-2 text-red-600">Error:</p>
                      <pre className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-600 overflow-x-auto">
                        {execution.error}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};