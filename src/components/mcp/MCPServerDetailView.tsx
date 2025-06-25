import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { MCPServer, MCPServerConnectionTest } from '@/types/MCPServerTypes';
import { mcpServersApi } from '@/services/api/mcpServers';
import {
  Server,
  Activity,
  Clock,
  User,
  Settings,
  Zap,
  Database,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface MCPServerDetailViewProps {
  server: MCPServer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MCPServerDetailView: React.FC<MCPServerDetailViewProps> = ({
  server,
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const [connectionTest, setConnectionTest] = useState<MCPServerConnectionTest | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await mcpServersApi.testMCPServerConnection(server.id);
      if (result.success && result.data) {
        setConnectionTest(result.data);
        toast({
          title: 'Connection Test Complete',
          description: result.data.success ? 'Connection successful' : 'Connection failed',
          variant: result.data.success ? 'default' : 'destructive',
        });
      } else {
        toast({
          title: 'Test Failed',
          description: result.error || 'Failed to test connection',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: 'Test Failed',
        description: 'Failed to test connection',
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'connecting':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Server className="h-6 w-6" />
            <div>
              <DialogTitle className="text-xl">{server.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {server.description || 'No description provided'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getStatusIcon(server.status)}
                  <Badge className={getStatusColor(server.status)}>
                    {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
                  </Badge>
                </div>
                {server.errorMessage && (
                  <p className="text-sm text-red-600 mt-2">{server.errorMessage}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="text-sm">
                  {server.type.toUpperCase()}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Last Connected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {server.lastConnectedAt ? formatDate(server.lastConnectedAt) : 'Never'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Connection Test */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Connection Test</CardTitle>
                <Button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  size="sm"
                >
                  {isTestingConnection ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {connectionTest ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {connectionTest.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className={connectionTest.success ? 'text-green-700' : 'text-red-700'}>
                      {connectionTest.success ? 'Connection successful' : 'Connection failed'}
                    </span>
                  </div>
                  {connectionTest.latency && (
                    <p className="text-sm text-muted-foreground">
                      Latency: {connectionTest.latency}ms
                    </p>
                  )}
                  {connectionTest.error && (
                    <p className="text-sm text-red-600">{connectionTest.error}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click "Test Connection" to verify server connectivity
                </p>
              )}
            </CardContent>
          </Card>

          {/* Detailed Information */}
          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Server Configuration</CardTitle>
                  <CardDescription>
                    Configuration details for this {server.type.toUpperCase()} server
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {server.type === 'stdio' ? (
                    <>
                      {server.config.command && (
                        <div>
                          <Label className="text-sm font-medium">Command</Label>
                          <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                            {server.config.command}
                          </p>
                        </div>
                      )}
                      {server.config.args && server.config.args.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium">Arguments</Label>
                          <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                            {server.config.args.join(' ')}
                          </p>
                        </div>
                      )}
                      {server.config.env && Object.keys(server.config.env).length > 0 && (
                        <div>
                          <Label className="text-sm font-medium">Environment Variables</Label>
                          <div className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded space-y-1">
                            {Object.entries(server.config.env).map(([key, value]) => (
                              <div key={key}>{key}={value}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {server.config.url && (
                        <div>
                          <Label className="text-sm font-medium">URL</Label>
                          <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                            {server.config.url}
                          </p>
                        </div>
                      )}
                      {server.config.headers && Object.keys(server.config.headers).length > 0 && (
                        <div>
                          <Label className="text-sm font-medium">Headers</Label>
                          <div className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded space-y-1">
                            {Object.entries(server.config.headers).map(([key, value]) => (
                              <div key={key}>{key}: {value}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {server.config.timeout && (
                    <div>
                      <Label className="text-sm font-medium">Timeout</Label>
                      <p className="text-sm text-muted-foreground">{server.config.timeout}ms</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="capabilities" className="space-y-4">
              {server.capabilities ? (
                <div className="grid gap-4">
                  {/* Tools */}
                  {server.capabilities.tools && server.capabilities.tools.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="h-5 w-5" />
                          Tools ({server.capabilities.tools.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {server.capabilities.tools.map((tool, index) => (
                            <div key={index} className="border rounded-lg p-3">
                              <h4 className="font-medium">{tool.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Resources */}
                  {server.capabilities.resources && server.capabilities.resources.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Database className="h-5 w-5" />
                          Resources ({server.capabilities.resources.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {server.capabilities.resources.map((resource, index) => (
                            <div key={index} className="border rounded-lg p-3">
                              <h4 className="font-medium">{resource.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                              <p className="text-xs text-muted-foreground mt-1 font-mono">{resource.uri}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Prompts */}
                  {server.capabilities.prompts && server.capabilities.prompts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5" />
                          Prompts ({server.capabilities.prompts.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {server.capabilities.prompts.map((prompt, index) => (
                            <div key={index} className="border rounded-lg p-3">
                              <h4 className="font-medium">{prompt.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{prompt.description}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      No capabilities information available. Test the connection to discover server capabilities.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="metadata" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Server Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Created By
                      </Label>
                      <p className="text-sm text-muted-foreground">{server.createdBy}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Created At
                      </Label>
                      <p className="text-sm text-muted-foreground">{formatDate(server.createdAt)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Organization ID</Label>
                      <p className="text-sm text-muted-foreground font-mono">{server.organizationId}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Updated At</Label>
                      <p className="text-sm text-muted-foreground">{formatDate(server.updatedAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper component for labels
const Label: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={`text-sm font-medium ${className || ''}`}>{children}</div>
);

export default MCPServerDetailView;