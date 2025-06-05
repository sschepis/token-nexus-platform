import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AppLayout from "@/components/layout/AppLayout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { usePageController } from "@/hooks/usePageController";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { 
  addFunction, 
  deleteFunction, 
  updateFunction, 
  setSelectedFunction 
} from "@/store/slices/cloudFunctionSlice";
import FunctionDetail from "@/components/cloud-functions/FunctionDetail";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code, Trash2, Activity, AlertCircle, Play, Settings, Plus } from "lucide-react";
import { FunctionLanguage, FunctionRuntime, CloudFunction } from "@/types/cloud-functions";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StyledCard } from "@/components/ui/styled-card";
import { toast } from "sonner";

const CloudFunctions = () => {
  const { toast } = useToast();
  const router = useRouter();
  
  // Try to use the controller, but fall back to Redux if not available
  const { executeAction, isRegistered } = usePageController({
    pageId: 'cloud-functions',
    pageName: 'Cloud Functions',
    description: 'Manage and execute cloud functions with real-time monitoring',
    category: 'development',
    permissions: ['functions:read', 'functions:write', 'functions:execute'],
    tags: ['functions', 'serverless', 'cloud', 'execution']
  });
  
  const dispatch = useAppDispatch();
  const { functions: reduxFunctions } = useAppSelector((state) => state.cloudFunction);
  
  // Local state
  const [functions, setFunctions] = useState<CloudFunction[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [newFunctionOpen, setNewFunctionOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLanguage, setNewLanguage] = useState<FunctionLanguage>("javascript");
  const [newRuntime, setNewRuntime] = useState<FunctionRuntime>("nodejs18.x");
  const [newCode, setNewCode] = useState("export default function myFunction(req, res) {\n  // Your function code here\n  return { message: 'Hello world!' };\n}");
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'controller' | 'fallback'>('fallback');
  const [executingFunction, setExecutingFunction] = useState<string | null>(null);

  // Load functions using controller when available
  useEffect(() => {
    const loadFunctionsFromController = async () => {
      if (!isRegistered) {
        setDataSource('fallback');
        setFunctions(reduxFunctions);
        return;
      }

      try {
        setLoading(true);
        setDataSource('controller');
        
        const result = await executeAction('fetchFunctions', {
          includeStats: true,
          status: activeTab === 'all' ? undefined : activeTab
        });

        if (result.success && result.data) {
          setFunctions((result.data as any).functions || []);
          console.log('✅ Functions loaded from controller registry:', (result.data as any).functions?.length || 0);
        } else {
          console.warn('⚠️ Controller action failed, falling back to Redux:', result.error);
          setDataSource('fallback');
          setFunctions(reduxFunctions);
        }
      } catch (error) {
        console.error('❌ Error loading functions from controller:', error);
        setDataSource('fallback');
        setFunctions(reduxFunctions);
      } finally {
        setLoading(false);
      }
    };

    loadFunctionsFromController();
  }, [isRegistered, executeAction, activeTab, reduxFunctions]);

  // Filter functions based on search term
  const filteredFunctions = functions.filter((func) => {
    const matchesSearch = 
      searchTerm === "" ||
      func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      func.description?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleAddFunction = async () => {
    if (!newName) {
      toast({
        title: "Missing function name",
        description: "Please provide a name for the function",
        variant: "destructive",
      });
      return;
    }

    if (!newCode || !newCode.includes("export default function")) {
      toast({
        title: "Invalid function code",
        description: "Function must export a default function",
        variant: "destructive",
      });
      return;
    }

    if (dataSource === 'controller' && isRegistered) {
      try {
        const result = await executeAction('createFunction', {
          name: newName,
          code: newCode,
          description: newDescription,
          category: 'custom',
          triggers: []
        });
        
        if (result.success) {
          toast({
            title: "Function created",
            description: `Added function ${newName}`,
          });
          
          // Reload functions
          const refreshResult = await executeAction('fetchFunctions', { includeStats: true });
          if (refreshResult.success && refreshResult.data) {
            setFunctions((refreshResult.data as any).functions || []);
          }
        } else {
          toast({
            title: "Error creating function",
            description: result.error || 'Failed to create function',
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error creating function",
          description: 'An unexpected error occurred',
          variant: "destructive",
        });
      }
    } else {
      // Fallback to Redux
      dispatch(addFunction({
        name: newName,
        description: newDescription,
        code: newCode,
        language: newLanguage,
        runtime: newRuntime,
      }));
      
      toast({
        title: "Function created",
        description: `Added function ${newName}`,
      });
    }
    
    setNewFunctionOpen(false);
    setNewName("");
    setNewDescription("");
    setNewCode("export default function myFunction(req, res) {\n  // Your function code here\n  return { message: 'Hello world!' };\n}");
  };

  const handleExecuteFunction = async (functionName: string) => {
    if (dataSource === 'controller' && isRegistered) {
      try {
        setExecutingFunction(functionName);
        
        const result = await executeAction('executeFunction', {
          functionName,
          parameters: {},
          timeout: 30
        });
        
        if (result.success) {
          toast({
            title: "Function executed successfully",
            description: `${functionName} completed in ${(result.data as any)?.executionTime}ms`,
          });
        } else {
          toast({
            title: "Function execution failed",
            description: result.error || 'Unknown error occurred',
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Execution error",
          description: 'Failed to execute function',
          variant: "destructive",
        });
      } finally {
        setExecutingFunction(null);
      }
    } else {
      toast({
        title: "Function executed",
        description: `Simulated execution of ${functionName}`,
      });
    }
  };

  const handleToggleActive = async (functionId: string, currentStatus: string) => {
    if (dataSource === 'controller' && isRegistered) {
      try {
        const result = await executeAction('updateFunction', {
          functionName: functionId,
          // In a real implementation, you'd update the status
        });
        
        if (result.success) {
          toast({
            title: `Function ${currentStatus === "active" ? "disabled" : "activated"}`,
            description: `The function has been ${currentStatus === "active" ? "disabled" : "activated"}`,
          });
          
          // Reload functions
          const refreshResult = await executeAction('fetchFunctions', { includeStats: true });
          if (refreshResult.success && refreshResult.data) {
            setFunctions((refreshResult.data as any).functions || []);
          }
        }
      } catch (error) {
        toast({
          title: "Error updating function",
          description: 'Failed to update function status',
          variant: "destructive",
        });
      }
    } else {
      // Fallback to Redux
      dispatch(updateFunction({
        id: functionId,
        updates: { 
          status: currentStatus === "active" ? "disabled" : "active" 
        }
      }));
      
      toast({
        title: `Function ${currentStatus === "active" ? "disabled" : "activated"}`,
        description: `The function has been ${currentStatus === "active" ? "disabled" : "activated"}`,
      });
    }
  };

  const handleViewFunction = (functionId: string) => {
    dispatch(setSelectedFunction(functionId));
    setActiveTab("detail");
  };

  const handleDeleteFunction = async (functionId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the function ${name}?`)) {
      return;
    }

    if (dataSource === 'controller' && isRegistered) {
      try {
        const result = await executeAction('deleteFunction', {
          functionName: functionId,
          confirmDelete: true
        });
        
        if (result.success) {
          toast({
            title: "Function deleted",
            description: `Function ${name} has been deleted`,
          });
          
          // Reload functions
          const refreshResult = await executeAction('fetchFunctions', { includeStats: true });
          if (refreshResult.success && refreshResult.data) {
            setFunctions((refreshResult.data as any).functions || []);
          }
        } else {
          toast({
            title: "Error deleting function",
            description: result.error || 'Failed to delete function',
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error deleting function",
          description: 'An unexpected error occurred',
          variant: "destructive",
        });
      }
    } else {
      // Fallback to Redux
      dispatch(deleteFunction(functionId));
      toast({
        title: "Function deleted",
        description: `Function ${name} has been deleted`,
      });
    }
  };

  const handleViewLogs = async (functionName: string) => {
    if (dataSource === 'controller' && isRegistered) {
      try {
        const result = await executeAction('getFunctionLogs', {
          functionName,
          limit: 50,
          timeRange: '24h'
        });
        
        if (result.success) {
          // In a real implementation, you'd show logs in a modal or navigate to logs page
          toast({
            title: "Logs retrieved",
            description: `Found ${(result.data as any)?.logs?.length || 0} log entries`,
          });
        }
      } catch (error) {
        toast({
          title: "Error retrieving logs",
          description: 'Failed to get function logs',
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Logs",
        description: `Viewing logs for ${functionName}`,
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cloud Functions</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage serverless functions that can be called via API or bound to routes
            </p>
          </div>
          <div className="flex gap-2">
            <Input 
              placeholder="Search functions..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-[300px]"
            />
            <Dialog open={newFunctionOpen} onOpenChange={setNewFunctionOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Function
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Function</DialogTitle>
                  <DialogDescription>
                    Create a new serverless function with custom code
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Function Name</Label>
                      <Input
                        id="name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="myFunction"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select value={newLanguage} onValueChange={(value: FunctionLanguage) => setNewLanguage(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="javascript">JavaScript</SelectItem>
                          <SelectItem value="typescript">TypeScript</SelectItem>
                          <SelectItem value="python">Python</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Function description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Function Code</Label>
                    <Textarea
                      id="code"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      className="min-h-[300px] font-mono"
                      placeholder="Enter your function code here..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setNewFunctionOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddFunction}>
                    Create Function
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Data Source Indicator */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Data Source: {' '}
            <Badge variant={dataSource === 'controller' ? 'default' : 'secondary'}>
              {dataSource === 'controller' ? 'Controller Registry' : 'Redux Store (Fallback)'}
            </Badge>
            {dataSource === 'controller' && (
              <span className="ml-2 text-green-600">✅ AI Assistant has full access to function management actions</span>
            )}
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Functions</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="disabled">Disabled</TabsTrigger>
            <TabsTrigger value="error">Error</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array(6).fill(0).map((_, i) => (
                  <Card key={i} className="w-full">
                    <CardHeader>
                      <div className="h-6 bg-gray-200 rounded animate-pulse" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFunctions.length > 0 ? (
                  filteredFunctions.map((func) => (
                    <StyledCard key={func.id || func.name} className="w-full">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{func.name}</CardTitle>
                          <Badge variant={func.status === 'active' ? 'default' : func.status === 'disabled' ? 'secondary' : 'destructive'}>
                            {func.status}
                          </Badge>
                        </div>
                        <CardDescription>{func.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Language:</span>
                            <span>{func.language || 'JavaScript'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Runtime:</span>
                            <span>{func.runtime || 'nodejs18.x'}</span>
                          </div>
                          {(func as any).executionCount && (
                            <div className="flex justify-between text-sm">
                              <span>Executions:</span>
                              <span>{(func as any).executionCount}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between gap-2">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExecuteFunction(func.name)}
                            disabled={executingFunction === func.name}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            {executingFunction === func.name ? 'Running...' : 'Run'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewLogs(func.name)}
                          >
                            <Activity className="h-3 w-3 mr-1" />
                            Logs
                          </Button>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewFunction(func.id || func.name)}
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteFunction(func.id || func.name, func.name)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardFooter>
                    </StyledCard>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-8">
                    <Code className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-lg font-semibold">No functions found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm ? 'Try adjusting your search' : 'Create your first cloud function to get started'}
                    </p>
                    {!searchTerm && (
                      <Button className="mt-4" onClick={() => setNewFunctionOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Function
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="active">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFunctions.filter(f => f.status === 'active').map((func) => (
                <StyledCard key={func.id || func.name} className="w-full">
                  <CardHeader>
                    <CardTitle className="text-lg">{func.name}</CardTitle>
                    <CardDescription>{func.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="default">Active</Badge>
                  </CardContent>
                </StyledCard>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="disabled">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFunctions.filter(f => f.status === 'disabled').map((func) => (
                <StyledCard key={func.id || func.name} className="w-full">
                  <CardHeader>
                    <CardTitle className="text-lg">{func.name}</CardTitle>
                    <CardDescription>{func.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">Disabled</Badge>
                  </CardContent>
                </StyledCard>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="error">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFunctions.filter(f => f.status === 'error').map((func) => (
                <StyledCard key={func.id || func.name} className="w-full">
                  <CardHeader>
                    <CardTitle className="text-lg">{func.name}</CardTitle>
                    <CardDescription>{func.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="destructive">Error</Badge>
                  </CardContent>
                </StyledCard>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default CloudFunctions;
