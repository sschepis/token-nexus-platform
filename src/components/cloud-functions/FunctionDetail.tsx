
import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Play, Trash2, Copy, Download } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { updateFunction } from "@/store/slices/cloudFunctionSlice";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CloudFunction, FunctionLanguage, FunctionRuntime } from "@/types/cloud-functions";
import CodeEditor from "./CodeEditor";
import ExecuteFunctionDialog from "./ExecuteFunctionDialog";
import { toast as sonnerToast } from "sonner";

interface FunctionDetailProps {
  onBack: () => void;
}

const FunctionDetail = ({ onBack }: FunctionDetailProps) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { functions, selectedFunctionId } = useAppSelector((state) => state.cloudFunction);
  const cloudFunction = functions.find((f) => f.id === selectedFunctionId);
  const [code, setCode] = useState(cloudFunction?.code || "");
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      name: cloudFunction?.name || "",
      description: cloudFunction?.description || "",
      language: cloudFunction?.language || "javascript",
      runtime: cloudFunction?.runtime || "nodejs18.x",
      status: cloudFunction?.status === "active",
    },
  });

  if (!cloudFunction) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground mb-4">No function selected</p>
        <Button onClick={onBack}>Back to Functions</Button>
      </div>
    );
  }

  const handleUpdateFunction = (data: any) => {
    dispatch(
      updateFunction({
        id: cloudFunction.id,
        updates: {
          name: data.name,
          description: data.description,
          language: data.language as FunctionLanguage,
          runtime: data.runtime as FunctionRuntime,
          status: data.status ? "active" : "disabled",
          code: code,
        },
      })
    );
    toast({
      title: "Function updated",
      description: "The function has been updated successfully",
    });
  };

  const validateCode = (code: string) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!code.trim()) {
      errors.push('Function code cannot be empty');
      return { isValid: false, errors, warnings };
    }

    // Basic Parse Cloud Code validation
    if (!code.includes('Parse.Cloud.define')) {
      errors.push('Function must use Parse.Cloud.define()');
    }

    // Security checks
    if (code.includes('eval(')) {
      errors.push('Use of eval() is not allowed for security reasons');
    }

    if (code.includes('require(') && !code.includes('// @allow-require')) {
      warnings.push('Use of require() should be carefully reviewed');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const handleTestFunction = () => {
    setExecuteDialogOpen(true);
  };

  const handleExecuteFunction = async (request: any) => {
    // Mock execution for now - in real app this would call the actual cloud function
    return new Promise<any>((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          result: {
            message: "Function executed successfully",
            timestamp: new Date().toISOString(),
            mockData: "This is a mock response"
          },
          executionTime: Math.floor(Math.random() * 500) + 50,
          timestamp: new Date().toISOString()
        });
      }, 1000);
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    sonnerToast.success('Code copied to clipboard');
  };

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cloudFunction?.name || 'function'}.${cloudFunction?.language || 'js'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    sonnerToast.success('Code downloaded');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-bold">{cloudFunction.name}</h2>
        <Badge 
          variant={cloudFunction.status === "active" ? "default" : 
                 cloudFunction.status === "error" ? "destructive" : "secondary"}
          className="ml-2"
        >
          {cloudFunction.status}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Function Settings</CardTitle>
            <CardDescription>
              Configure your cloud function
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleUpdateFunction)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Function Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        The name of your function (alphanumeric, no spaces)
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormDescription>
                        A brief description of what this function does
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="javascript">JavaScript</SelectItem>
                            <SelectItem value="typescript">TypeScript</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Programming language
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="runtime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Runtime</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select runtime" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="nodejs18.x">Node.js 18.x</SelectItem>
                            <SelectItem value="nodejs20.x">Node.js 20.x</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Execution environment
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Enable or disable this function
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1">
                    <Save className="mr-2 h-4 w-4" />
                    Save Function
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={handleTestFunction}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Test Function
                  </Button>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={copyCode}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Code
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={downloadCode}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4 text-xs text-muted-foreground">
            <div>Created: {new Date(cloudFunction.createdAt).toLocaleString()}</div>
            <div>Updated: {new Date(cloudFunction.updatedAt).toLocaleString()}</div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Function Code</CardTitle>
            <CardDescription>
              Write your function code using the advanced code editor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeEditor
              value={code}
              onChange={setCode}
              language={cloudFunction.language}
              onValidate={validateCode}
              placeholder={`Parse.Cloud.define("${cloudFunction.name}", async (request) => {
  const { params, user } = request;
  
  // Your function logic here
  try {
    return {
      success: true,
      message: "Function executed successfully"
    };
  } catch (error) {
    throw new Error(\`Function execution failed: \${error.message}\`);
  }
});`}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Functions should use Parse.Cloud.define() and follow Parse Cloud Code conventions.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Execute Function Dialog */}
      <ExecuteFunctionDialog
        open={executeDialogOpen}
        onOpenChange={setExecuteDialogOpen}
        cloudFunction={cloudFunction}
        onExecuteFunction={handleExecuteFunction}
      />
    </div>
  );
};

export default FunctionDetail;
