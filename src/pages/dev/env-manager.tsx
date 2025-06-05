import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PlusCircle, Trash2, Save, Copy, Eye, EyeOff, Wrench } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DevToolsWrapper } from "@/components/dev/DevToolsWrapper";

// Mock environment variables for demonstration
const mockEnvVars = {
  development: [
    { key: "API_BASE_URL", value: "https://dev-api.example.com", isSecret: false },
    { key: "DATABASE_URL", value: "postgres://user:pass@localhost:5432/db", isSecret: true },
    { key: "APP_DEBUG", value: "true", isSecret: false },
  ],
  production: [
    { key: "API_BASE_URL", value: "https://api.example.com", isSecret: false },
    { key: "DATABASE_URL", value: "postgres://user:pass@prod-db:5432/db", isSecret: true },
    { key: "APP_DEBUG", value: "false", isSecret: false },
  ],
  staging: [
    { key: "API_BASE_URL", value: "https://staging-api.example.com", isSecret: false },
    { key: "DATABASE_URL", value: "postgres://user:pass@staging-db:5432/db", isSecret: true },
    { key: "APP_DEBUG", value: "true", isSecret: false },
  ]
};

interface EnvVar {
  key: string;
  value: string;
  isSecret: boolean;
}

const EnvManagerPage = () => {
  const [activeTab, setActiveTab] = useState<"development" | "staging" | "production">("development");
  const [envVars, setEnvVars] = useState<Record<string, EnvVar[]>>(mockEnvVars);
  const [newVar, setNewVar] = useState({ key: "", value: "", isSecret: false });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const handleAddEnvVar = () => {
    if (!newVar.key) {
      toast.error("Environment variable name is required");
      return;
    }
    
    if (envVars[activeTab].some(v => v.key === newVar.key)) {
      toast.error(`Environment variable ${newVar.key} already exists`);
      return;
    }
    
    setEnvVars({
      ...envVars,
      [activeTab]: [...envVars[activeTab], newVar]
    });
    
    setNewVar({ key: "", value: "", isSecret: false });
    toast.success("Environment variable added");
  };

  const handleDeleteEnvVar = (key: string) => {
    setEnvVars({
      ...envVars,
      [activeTab]: envVars[activeTab].filter(v => v.key !== key)
    });
    toast.success(`Environment variable ${key} deleted`);
  };

  const handleCopyValue = (value: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(value);
      toast.success("Value copied to clipboard");
    } else {
      toast.error("Clipboard API not available.");
    }
  };

  const handleToggleSecret = (key: string) => {
    setShowSecrets({
      ...showSecrets,
      [key]: !showSecrets[key]
    });
  };

  const handleSaveEnvironment = () => {
    // In a real app, this would save to the backend
    toast.success(`${activeTab} environment variables saved`);
  };
  
  return (
    <DevToolsWrapper toolName="Environment Manager">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Wrench className="h-7 w-7" />
              Environment Variables
            </h1>
            <p className="text-muted-foreground">
              Manage environment variables for different environments
            </p>
          </div>
          <Button onClick={handleSaveEnvironment}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "development" | "staging" | "production")}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="development">Development</TabsTrigger>
            <TabsTrigger value="staging">Staging</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
          </TabsList>

          {(["development", "staging", "production"] as const).map((env) => (
            <TabsContent key={env} value={env} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {env.charAt(0).toUpperCase() + env.slice(1)} Environment
                    <Badge variant={env === "production" ? "destructive" : env === "staging" ? "outline" : "default"}>
                      {env}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Configure environment variables for {env} environment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <Label htmlFor={`new-key-${env}`}>Variable Name</Label>
                        <Input
                          id={`new-key-${env}`}
                          value={newVar.key}
                          onChange={(e) => setNewVar({ ...newVar, key: e.target.value })}
                          placeholder="API_KEY"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor={`new-value-${env}`}>Value</Label>
                        <Input
                          id={`new-value-${env}`}
                          value={newVar.value}
                          onChange={(e) => setNewVar({ ...newVar, value: e.target.value })}
                          placeholder="value"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-6"> {/* Adjusted padding for alignment */}
                        <Switch
                          id={`new-secret-${env}`}
                          checked={newVar.isSecret}
                          onCheckedChange={(checked) => setNewVar({ ...newVar, isSecret: checked })}
                        />
                        <Label htmlFor={`new-secret-${env}`}>Secret</Label>
                      </div>
                      <Button onClick={handleAddEnvVar} className="self-end"> {/* Align button */}
                        <PlusCircle className="mr-2 h-4 w-4" /> Add
                      </Button>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {envVars[env].map((variable) => (
                          <TableRow key={variable.key}>
                            <TableCell className="font-mono">{variable.key}</TableCell>
                            <TableCell>
                              {variable.isSecret && !showSecrets[variable.key] ? (
                                <span className="flex items-center">
                                  ••••••••••••••••
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleToggleSecret(variable.key)}
                                    className="ml-2" /* Added margin */
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </span>
                              ) : (
                                <span className="flex items-center font-mono">
                                  {variable.value}
                                  {variable.isSecret && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleToggleSecret(variable.key)}
                                      className="ml-2" /* Added margin */
                                    >
                                      <EyeOff className="h-4 w-4" />
                                    </Button>
                                  )}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {variable.isSecret ? (
                                <Badge variant="outline">Secret</Badge>
                              ) : (
                                <Badge variant="secondary">Plain</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCopyValue(variable.value)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteEnvVar(variable.key)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {envVars[env].length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                              No environment variables defined for {env}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DevToolsWrapper>
  );
};

export default EnvManagerPage;