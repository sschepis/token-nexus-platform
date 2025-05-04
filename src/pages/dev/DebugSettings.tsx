import React, { useState } from "react";
import { Bug, Save, Wrench, Code, FileWarning, Layers, ToggleLeft, Clock, Clipboard, Server, Database, NetworkIcon, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import AppLayout from "@/components/layout/AppLayout";

interface DebugSetting {
  id: string;
  name: string;
  key: string;
  description: string;
  value: boolean | string | number;
  type: "boolean" | "string" | "number" | "select";
  category: "general" | "logging" | "performance" | "network" | "storage" | "database";
  options?: {value: string; label: string}[];
}

const DebugSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("general");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initial settings
  const [settings, setSettings] = useState<DebugSetting[]>([
    {
      id: "setting-1",
      name: "Developer Mode",
      key: "developerMode",
      description: "Enable advanced debugging features and developer tools",
      value: true,
      type: "boolean",
      category: "general"
    },
    {
      id: "setting-2",
      name: "Verbose Logging",
      key: "verboseLogging",
      description: "Show detailed logs including stack traces and debug information",
      value: true,
      type: "boolean",
      category: "logging"
    },
    {
      id: "setting-3",
      name: "Log Level",
      key: "logLevel",
      description: "Set the minimum log level to display",
      value: "info",
      type: "select",
      category: "logging",
      options: [
        { value: "error", label: "Error" },
        { value: "warn", label: "Warning" },
        { value: "info", label: "Info" },
        { value: "debug", label: "Debug" },
        { value: "trace", label: "Trace" }
      ]
    },
    {
      id: "setting-4",
      name: "Console Logging",
      key: "consoleLogging",
      description: "Output logs to browser console",
      value: true,
      type: "boolean",
      category: "logging"
    },
    {
      id: "setting-5",
      name: "Remote Logging",
      key: "remoteLogging",
      description: "Send logs to remote server",
      value: false,
      type: "boolean",
      category: "logging"
    },
    {
      id: "setting-6",
      name: "Log Server URL",
      key: "logServerUrl",
      description: "URL of the remote logging server",
      value: "https://logs.example.com/api/logs",
      type: "string",
      category: "logging"
    },
    {
      id: "setting-7",
      name: "Performance Monitoring",
      key: "performanceMonitoring",
      description: "Track and analyze application performance",
      value: true,
      type: "boolean",
      category: "performance"
    },
    {
      id: "setting-8",
      name: "Performance Sample Rate",
      key: "performanceSampleRate",
      description: "Percentage of user sessions to monitor (1-100)",
      value: 25,
      type: "number",
      category: "performance"
    },
    {
      id: "setting-9",
      name: "Network Request Tracing",
      key: "networkRequestTracing",
      description: "Track all network requests and responses",
      value: true,
      type: "boolean",
      category: "network"
    },
    {
      id: "setting-10",
      name: "API Request Timeout",
      key: "apiRequestTimeout",
      description: "Maximum time in milliseconds for API requests",
      value: 30000,
      type: "number",
      category: "network"
    },
    {
      id: "setting-11",
      name: "Disable Cache",
      key: "disableCache",
      description: "Force fresh network requests by bypassing cache",
      value: false,
      type: "boolean",
      category: "network"
    },
    {
      id: "setting-12",
      name: "Storage Monitoring",
      key: "storageMonitoring",
      description: "Track all storage operations (LocalStorage, IndexedDB, etc.)",
      value: true,
      type: "boolean",
      category: "storage"
    },
    {
      id: "setting-13",
      name: "Database Query Logging",
      key: "databaseQueryLogging",
      description: "Log all database queries with execution times",
      value: false,
      type: "boolean",
      category: "database"
    },
    {
      id: "setting-14",
      name: "Query Timeout Warning",
      key: "queryTimeoutWarning",
      description: "Threshold in milliseconds to warn about slow queries",
      value: 200,
      type: "number",
      category: "database"
    }
  ]);

  const updateSetting = (id: string, value: boolean | string | number) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.id === id ? { ...setting, value } : setting
      )
    );
  };

  const handleSaveSettings = () => {
    setIsLoading(true);
    
    // Simulate saving settings
    setTimeout(() => {
      toast.success("Debug settings saved successfully");
      setIsLoading(false);
      
      // Log the settings object to console
      console.log("Debug Settings:", settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>));
    }, 1000);
  };

  const handleResetSettings = () => {
    // Confirm with the user
    if (window.confirm("Are you sure you want to reset all debug settings to defaults?")) {
      // Reset all settings to their default values
      setSettings(prev => 
        prev.map(setting => {
          const defaultValue = getDefaultValueForSetting(setting.key);
          return { ...setting, value: defaultValue };
        })
      );
      
      toast.info("Debug settings reset to defaults");
    }
  };

  // Helper function to get default values for settings
  const getDefaultValueForSetting = (key: string) => {
    const defaults: Record<string, any> = {
      developerMode: true,
      verboseLogging: false,
      logLevel: "info",
      consoleLogging: true,
      remoteLogging: false,
      logServerUrl: "https://logs.example.com/api/logs",
      performanceMonitoring: true,
      performanceSampleRate: 10,
      networkRequestTracing: true,
      apiRequestTimeout: 30000,
      disableCache: false,
      storageMonitoring: false,
      databaseQueryLogging: false,
      queryTimeoutWarning: 200
    };
    
    return defaults[key] ?? false;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "general": return <Wrench className="h-5 w-5" />;
      case "logging": return <FileWarning className="h-5 w-5" />;
      case "performance": return <Layers className="h-5 w-5" />;
      case "network": return <NetworkIcon className="h-5 w-5" />;
      case "storage": return <Database className="h-5 w-5" />;
      case "database": return <Server className="h-5 w-5" />;
      default: return <Bug className="h-5 w-5" />;
    }
  };

  const filteredSettings = settings.filter(setting => 
    activeTab === "all" || setting.category === activeTab
  );

  return (
    <AppLayout>
      <div className="container py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Debug Settings</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleResetSettings}>
              Reset to Defaults
            </Button>
            <Button onClick={handleSaveSettings} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bug className="h-5 w-5 mr-2" />
              Debugging Configuration
            </CardTitle>
            <CardDescription>
              Configure the debugging tools and features for your application
            </CardDescription>
          </CardHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6">
              <TabsList className="grid grid-cols-3 md:grid-cols-7">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="logging">Logging</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="network">Network</TabsTrigger>
                <TabsTrigger value="storage">Storage</TabsTrigger>
                <TabsTrigger value="database">Database</TabsTrigger>
              </TabsList>
            </div>
            
            <CardContent className="pt-6">
              <ScrollArea className="h-[60vh]">
                <div className="space-y-8 pr-4">
                  {filteredSettings.map((setting) => {
                    const categoryName = setting.category.charAt(0).toUpperCase() + setting.category.slice(1);
                    
                    return (
                      <div key={setting.id} className="space-y-2">
                        <div className="flex justify-between">
                          <div>
                            <Label 
                              htmlFor={setting.id}
                              className="text-base font-medium flex items-center"
                            >
                              {getCategoryIcon(setting.category)}
                              <span className="ml-2">{setting.name}</span>
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {setting.description}
                            </p>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <Code className="h-3 w-3 mr-1" />
                              <code>{setting.key}</code>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {categoryName}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center h-full">
                            {setting.type === "boolean" && (
                              <Switch
                                id={setting.id}
                                checked={setting.value as boolean}
                                onCheckedChange={(checked) => updateSetting(setting.id, checked)}
                              />
                            )}
                            
                            {setting.type === "string" && (
                              <Input
                                id={setting.id}
                                value={setting.value as string}
                                onChange={(e) => updateSetting(setting.id, e.target.value)}
                                className="max-w-xs"
                              />
                            )}
                            
                            {setting.type === "number" && (
                              <Input
                                id={setting.id}
                                type="number"
                                value={setting.value as number}
                                onChange={(e) => updateSetting(setting.id, Number(e.target.value))}
                                className="w-24"
                              />
                            )}
                            
                            {setting.type === "select" && setting.options && (
                              <Select
                                value={setting.value as string}
                                onValueChange={(value) => updateSetting(setting.id, value)}
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {setting.options.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                        
                        <Separator />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Tabs>
          
          <CardFooter className="flex justify-between border-t p-6">
            <div className="text-sm text-muted-foreground">
              <Eye className="h-4 w-4 inline mr-1" />
              These settings are for development purposes only
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(
                settings.reduce((acc, setting) => {
                  acc[setting.key] = setting.value;
                  return acc;
                }, {} as Record<string, any>),
                null,
                2
              ));
              toast.success("Debug settings copied to clipboard");
            }}>
              <Clipboard className="h-4 w-4 mr-2" />
              Copy as JSON
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
};

export default DebugSettings;
