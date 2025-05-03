
import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
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
import {
  updateRoute,
  deleteRouteMethod,
  updateRouteMethod,
} from "@/store/slices/routeSlice";
import { HttpMethod, RouteHandler } from "@/types/routes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DialogDescription } from "@radix-ui/react-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface RouteDetailProps {
  onBack: () => void;
}

const RouteDetail = ({ onBack }: RouteDetailProps) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { routes, selectedRouteId } = useAppSelector((state) => state.route);
  const route = routes.find((r) => r.id === selectedRouteId);
  const [newMethodDialogOpen, setNewMethodDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<HttpMethod | null>(null);
  const [newMethod, setNewMethod] = useState<HttpMethod>("GET");
  const [newType, setNewType] = useState<"page" | "function" | "redirect">("page");
  const [newTarget, setNewTarget] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const form = useForm({
    defaultValues: {
      path: route?.path || "",
      active: route?.active || true,
      protected: route?.protected || true,
    },
  });

  if (!route) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground mb-4">No route selected</p>
        <Button onClick={onBack}>Back to Routes</Button>
      </div>
    );
  }

  const handleUpdateRoute = (data: any) => {
    dispatch(
      updateRoute({
        routeId: route.id,
        updates: data,
      })
    );
    toast({
      title: "Route updated",
      description: "The route has been updated successfully",
    });
  };

  const handleAddMethod = () => {
    if (!newMethod || !newTarget) {
      toast({
        title: "Missing information",
        description: "Please provide both a method and a target",
        variant: "destructive",
      });
      return;
    }

    dispatch(
      updateRouteMethod({
        routeId: route.id,
        method: newMethod,
        handler: {
          type: newType,
          target: newTarget,
          description: newDescription,
        },
      })
    );

    toast({
      title: "Method added",
      description: `Added ${newMethod} method to ${route.path}`,
    });

    setNewMethodDialogOpen(false);
    setNewMethod("GET");
    setNewType("page");
    setNewTarget("");
    setNewDescription("");
  };

  const handleDeleteMethod = (method: HttpMethod) => {
    if (Object.keys(route.methods).length <= 1) {
      toast({
        title: "Cannot delete",
        description: "A route must have at least one method",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to delete the ${method} method?`)) {
      dispatch(
        deleteRouteMethod({
          routeId: route.id,
          method,
        })
      );

      toast({
        title: "Method deleted",
        description: `${method} method has been removed from ${route.path}`,
      });
    }
  };

  const handleSelectMethod = (method: HttpMethod) => {
    setSelectedMethod(method);
  };

  const handleUpdateMethod = (method: HttpMethod, updates: Partial<RouteHandler>) => {
    dispatch(
      updateRouteMethod({
        routeId: route.id,
        method,
        handler: updates,
      })
    );

    toast({
      title: "Method updated",
      description: `${method} method has been updated`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-bold">{route.path}</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Route Settings</CardTitle>
            <CardDescription>
              Basic configuration for this route
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleUpdateRoute)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Path</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        The URL path for this route
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Enable or disable this route
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
                  
                  <FormField
                    control={form.control}
                    name="protected"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Protected</FormLabel>
                          <FormDescription>
                            Require authentication
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
                </div>

                <Button type="submit" className="w-full">
                  Update Route
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4 text-xs text-muted-foreground">
            <div>Created: {new Date(route.createdAt).toLocaleString()}</div>
            <div>Updated: {new Date(route.updatedAt).toLocaleString()}</div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>HTTP Methods</CardTitle>
              <CardDescription>
                Configure handlers for different HTTP methods
              </CardDescription>
            </div>
            <Dialog open={newMethodDialogOpen} onOpenChange={setNewMethodDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Method
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add HTTP Method</DialogTitle>
                  <DialogDescription>
                    Add a new HTTP method handler to this route
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>HTTP Method</Label>
                    <Select
                      value={newMethod}
                      onValueChange={(value) => setNewMethod(value as HttpMethod)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        {(["GET", "POST", "PUT", "DELETE", "PATCH"] as HttpMethod[])
                          .filter((method) => !route.methods[method])
                          .map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Handler Type</Label>
                    <Select
                      value={newType}
                      onValueChange={(value) => setNewType(value as "page" | "function" | "redirect")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="page">Page</SelectItem>
                        <SelectItem value="function">Function</SelectItem>
                        <SelectItem value="redirect">Redirect</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Target</Label>
                    <Input
                      placeholder={
                        newType === "page"
                          ? "Dashboard"
                          : newType === "function"
                          ? "handleRequest"
                          : "/redirect-path"
                      }
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      {newType === "page"
                        ? "Component name"
                        : newType === "function"
                        ? "Function name"
                        : "Redirect URL"}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Handler description"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleAddMethod}>Add Method</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {Object.entries(route.methods).map(([method, handler]) => (
                <AccordionItem key={method} value={method}>
                  <AccordionTrigger className="hover:bg-muted/50 px-4">
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">
                        {method}
                      </Badge>
                      <span className="text-sm font-medium capitalize">{handler.type}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label>Handler Type</Label>
                        <Select
                          value={handler.type}
                          onValueChange={(value) =>
                            handleUpdateMethod(method as HttpMethod, {
                              type: value as "page" | "function" | "redirect",
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="page">Page</SelectItem>
                            <SelectItem value="function">Function</SelectItem>
                            <SelectItem value="redirect">Redirect</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Target</Label>
                        <Input
                          value={handler.target}
                          onChange={(e) =>
                            handleUpdateMethod(method as HttpMethod, {
                              target: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Description</Label>
                        <Textarea
                          value={handler.description || ""}
                          onChange={(e) =>
                            handleUpdateMethod(method as HttpMethod, {
                              description: e.target.value,
                            })
                          }
                        />
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDeleteMethod(method as HttpMethod)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Method
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {Object.keys(route.methods).length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <p>No methods defined for this route</p>
                <Button
                  variant="ghost"
                  onClick={() => setNewMethodDialogOpen(true)}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Method
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RouteDetail;
