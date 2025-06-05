import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Copy, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { CloudFunction, ExecuteFunctionRequest, ExecuteFunctionResponse } from '@/types/cloud-functions';

interface ExecuteFunctionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cloudFunction: CloudFunction | null;
  onExecuteFunction: (request: ExecuteFunctionRequest) => Promise<ExecuteFunctionResponse>;
}

const ExecuteFunctionDialog: React.FC<ExecuteFunctionDialogProps> = ({
  open,
  onOpenChange,
  cloudFunction,
  onExecuteFunction
}) => {
  const [parameters, setParameters] = useState('{}');
  const [timeout, setTimeout] = useState('30');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecuteFunctionResponse | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecuteFunctionResponse[]>([]);

  const validateJSON = (jsonString: string): { isValid: boolean; error?: string } => {
    try {
      JSON.parse(jsonString);
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Invalid JSON' 
      };
    }
  };

  const handleExecute = async () => {
    if (!cloudFunction) return;

    const validation = validateJSON(parameters);
    if (!validation.isValid) {
      toast.error(`Invalid JSON parameters: ${validation.error}`);
      return;
    }

    setIsExecuting(true);
    try {
      const parsedParameters = JSON.parse(parameters);
      const request: ExecuteFunctionRequest = {
        functionName: cloudFunction.name,
        parameters: parsedParameters,
        timeout: parseInt(timeout)
      };

      const result = await onExecuteFunction(request);
      setExecutionResult(result);
      setExecutionHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 executions

      if (result.success) {
        toast.success(`Function executed successfully in ${result.executionTime}ms`);
      } else {
        toast.error(`Function execution failed: ${result.error}`);
      }
    } catch (error) {
      const errorResult: ExecuteFunctionResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: 0,
        timestamp: new Date().toISOString()
      };
      setExecutionResult(errorResult);
      toast.error('Function execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const copyResult = () => {
    if (executionResult) {
      navigator.clipboard.writeText(JSON.stringify(executionResult, null, 2));
      toast.success('Result copied to clipboard');
    }
  };

  const downloadResult = () => {
    if (executionResult && cloudFunction) {
      const blob = new Blob([JSON.stringify(executionResult, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cloudFunction.name}_execution_${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Result downloaded');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500" />
    );
  };

  if (!cloudFunction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Execute Function: {cloudFunction.name}
            <Badge variant={cloudFunction.status === 'active' ? 'default' : 'secondary'}>
              {cloudFunction.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Test your cloud function with custom parameters and view the results.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="execute" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="execute">Execute</TabsTrigger>
            <TabsTrigger value="result">Result</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="execute" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Function Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="parameters">Parameters (JSON)</Label>
                  <Textarea
                    id="parameters"
                    value={parameters}
                    onChange={(e) => setParameters(e.target.value)}
                    placeholder='{"key": "value", "number": 123}'
                    className="font-mono text-sm min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter function parameters as valid JSON
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timeout">Timeout (seconds)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={timeout}
                      onChange={(e) => setTimeout(e.target.value)}
                      min="1"
                      max="300"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleExecute} 
                      disabled={isExecuting || cloudFunction.status !== 'active'}
                      className="w-full"
                    >
                      {isExecuting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Execute Function
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Function Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Description:</span>
                    <p className="text-muted-foreground">{cloudFunction.description}</p>
                  </div>
                  <div>
                    <span className="font-medium">Language:</span>
                    <p className="text-muted-foreground">{cloudFunction.language}</p>
                  </div>
                  <div>
                    <span className="font-medium">Runtime:</span>
                    <p className="text-muted-foreground">{cloudFunction.runtime}</p>
                  </div>
                  <div>
                    <span className="font-medium">Category:</span>
                    <p className="text-muted-foreground">{cloudFunction.category || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="result" className="space-y-4">
            {executionResult ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(executionResult.success)}
                      Execution Result
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={copyResult}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={downloadResult}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{executionResult.executionTime}ms</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {formatTimestamp(executionResult.timestamp)}
                        </span>
                      </div>
                    </div>

                    {executionResult.success ? (
                      <div>
                        <Label>Result:</Label>
                        <ScrollArea className="h-[300px] w-full border rounded-md p-4">
                          <pre className="text-sm font-mono">
                            {JSON.stringify(executionResult.result, null, 2)}
                          </pre>
                        </ScrollArea>
                      </div>
                    ) : (
                      <div>
                        <Label>Error:</Label>
                        <div className="border rounded-md p-4 bg-red-50 text-red-700">
                          <pre className="text-sm font-mono whitespace-pre-wrap">
                            {executionResult.error}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No execution result yet. Execute the function to see results.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Execution History</CardTitle>
              </CardHeader>
              <CardContent>
                {executionHistory.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {executionHistory.map((execution, index) => (
                        <div 
                          key={index}
                          className="border rounded-md p-3 hover:bg-muted/50 cursor-pointer"
                          onClick={() => setExecutionResult(execution)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(execution.success)}
                              <span className="text-sm font-medium">
                                {execution.success ? 'Success' : 'Failed'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {execution.executionTime}ms
                              <span>{formatTimestamp(execution.timestamp)}</span>
                            </div>
                          </div>
                          {execution.error && (
                            <p className="text-xs text-red-600 mt-1 truncate">
                              {execution.error}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">No execution history yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExecuteFunctionDialog;