
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Check } from "lucide-react";

interface JiraCredentials {
  jiraUrl: string;
  apiToken: string;
  username: string; 
  projectKey: string;
}

const JiraIntegration = () => {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<JiraCredentials>({
    jiraUrl: '',
    apiToken: '',
    username: '',
    projectKey: '',
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [syncOptions, setSyncOptions] = useState({
    syncTasks: true,
    syncAssignees: true,
    syncComments: true,
    syncAttachments: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (option: keyof typeof syncOptions) => {
    setSyncOptions(prev => ({ ...prev, [option]: !prev[option] }));
  };

  const handleConnect = async () => {
    // Validate inputs
    if (!credentials.jiraUrl || !credentials.apiToken || !credentials.username || !credentials.projectKey) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // In a real implementation, this would call an API to validate and store the JIRA connection
      // For now, we'll simulate a successful connection
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsConnected(true);
      toast({
        title: "Connected to JIRA",
        description: `Successfully connected to project ${credentials.projectKey}`,
      });
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Could not connect to JIRA. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    
    try {
      // Simulate API call to disconnect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsConnected(false);
      setCredentials({
        jiraUrl: '',
        apiToken: '',
        username: '',
        projectKey: '',
      });
      
      toast({
        title: "Disconnected from JIRA",
        description: "JIRA integration has been removed",
      });
    } catch (error) {
      toast({
        title: "Failed to disconnect",
        description: "An error occurred while disconnecting from JIRA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestScan = async () => {
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Project scan completed",
        description: "Initial scan found 47 tasks and 8 assignees in your project",
      });
    } catch (error) {
      toast({
        title: "Scan failed",
        description: "Could not complete the project scan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>JIRA Integration</CardTitle>
        <CardDescription>
          Connect to your JIRA project to synchronize tasks, timelines, and assignees
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Connected to JIRA</AlertTitle>
            <AlertDescription className="text-green-700">
              Your JIRA project {credentials.projectKey} is connected and syncing.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="jiraUrl">JIRA URL</Label>
                <Input 
                  id="jiraUrl"
                  name="jiraUrl"
                  placeholder="https://your-domain.atlassian.net"
                  value={credentials.jiraUrl}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="username">JIRA Email</Label>
                <Input 
                  id="username"
                  name="username"
                  placeholder="your-email@example.com"
                  value={credentials.username}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="apiToken">API Token</Label>
                <div className="flex space-x-2">
                  <Input 
                    id="apiToken"
                    name="apiToken"
                    type={showApiKey ? "text" : "password"}
                    placeholder="JIRA API Token"
                    value={credentials.apiToken}
                    onChange={handleInputChange}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  You can generate an API token in your Atlassian account settings
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="projectKey">Project Key</Label>
                <Input 
                  id="projectKey"
                  name="projectKey"
                  placeholder="e.g. PROJ"
                  value={credentials.projectKey}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base">Sync Options</Label>
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="syncTasks" 
                    checked={syncOptions.syncTasks}
                    onCheckedChange={() => handleCheckboxChange('syncTasks')}
                  />
                  <label htmlFor="syncTasks" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Synchronize tasks
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="syncAssignees" 
                    checked={syncOptions.syncAssignees}
                    onCheckedChange={() => handleCheckboxChange('syncAssignees')}
                  />
                  <label htmlFor="syncAssignees" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Synchronize assignees
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="syncComments" 
                    checked={syncOptions.syncComments}
                    onCheckedChange={() => handleCheckboxChange('syncComments')}
                  />
                  <label htmlFor="syncComments" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Synchronize comments
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="syncAttachments" 
                    checked={syncOptions.syncAttachments}
                    onCheckedChange={() => handleCheckboxChange('syncAttachments')}
                  />
                  <label htmlFor="syncAttachments" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Synchronize attachments
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {isConnected ? (
          <>
            <div className="flex space-x-2">
              <Button onClick={handleTestScan} disabled={isLoading}>
                Run Project Scan
              </Button>
              <Button variant="outline" onClick={() => {}} disabled={isLoading}>
                Configure AI Analysis
              </Button>
            </div>
            <Button variant="destructive" onClick={handleDisconnect} disabled={isLoading}>
              Disconnect
            </Button>
          </>
        ) : (
          <Button onClick={handleConnect} disabled={isLoading}>
            {isLoading ? "Connecting..." : "Connect to JIRA"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default JiraIntegration;
