
import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Play, Trash2 } from "lucide-react";
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

interface FunctionDetailProps {
  onBack: () => void;
}

const FunctionDetail = ({ onBack }: FunctionDetailProps) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { functions, selectedFunctionId } = useAppSelector((state) => state.cloudFunction);
  const cloudFunction = functions.find((f) => f.id === selectedFunctionId);
  const [code, setCode] = useState(cloudFunction?.code || "");

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

  const handleTestFunction = () => {
    // In a real app, this would send the function to be executed in a serverless environment
    toast({
      title: "Function test initiated",
      description: "Check the console for test results",
    });
    console.log(`Testing function ${cloudFunction.name}...`);
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
              Write your function code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative min-h-[300px] rounded-md border">
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="export default function myFunction(req, res) {
  // Your code here
  return { message: 'Hello World!' };
}"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Functions should export a default function that takes request and response parameters.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FunctionDetail;
