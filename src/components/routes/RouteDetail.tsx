import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Route, HttpMethod, RouteHandler } from "@/types/routes";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, Code as FunctionIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { updateRoute, deleteRoute } from "@/store/slices/routeSlice";
import { CloudFunction } from "@/types/cloud-functions";

interface RouteDetailProps {
  route: Route;
  onClose: () => void;
}

const RouteDetail: React.FC<RouteDetailProps> = ({ route, onClose }) => {
  const dispatch = useAppDispatch();
  const cloudFunctions = useAppSelector(
    (state) => state.cloudFunction.functions
  );
  const [isEditing, setIsEditing] = useState(false);
  const [path, setPath] = useState(route.path);
  const [active, setActive] = useState(route.active);
  const [isProtected, setIsProtected] = useState(route.protected);
  const [selectedMethod, setSelectedMethod] = useState<HttpMethod>("GET");
  const [selectedHandlerType, setSelectedHandlerType] = useState<
    "page" | "function" | "redirect"
  >("page");
  const [target, setTarget] = useState("");
  const [description, setDescription] = useState("");
  const [functionId, setFunctionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setPath(route.path);
    setActive(route.active);
    setIsProtected(route.protected);

    // Initialize handler state based on existing route configuration
    if (route.methods && route.methods[selectedMethod]) {
      const handler = route.methods[selectedMethod] as RouteHandler;
      setSelectedHandlerType(handler.type);
      setTarget(handler.target);
      setDescription(handler.description || "");
      setFunctionId(handler.functionId);
    } else {
      // Reset form if no handler exists for the selected method
      setSelectedHandlerType("page");
      setTarget("");
      setDescription("");
      setFunctionId(undefined);
    }
  }, [route, selectedMethod]);

  const handleSave = () => {
    const updatedRoute: Partial<Route> = {
      id: route.id,
      path: path,
      active: active,
      protected: isProtected,
      methods: {
        [selectedMethod]: {
          id: route.methods?.[selectedMethod]?.id || generateId(),
          type: selectedHandlerType,
          target: target,
          description: description,
          functionId: selectedHandlerType === "function" ? functionId : undefined,
        } as RouteHandler,
      },
    };

    dispatch(updateRoute(updatedRoute));
    setIsEditing(false);
    toast.success("Route updated successfully!");
  };

  const handleDelete = () => {
    dispatch(deleteRoute(route.id));
    toast.success("Route deleted successfully!");
    onClose();
  };

  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 15);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>
          {isEditing ? "Edit Route" : "Route"} : {route.path}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/routes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="handler">Handler</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="path">Path</Label>
              <Input
                id="path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                checked={active}
                onCheckedChange={(checked) => setActive(checked)}
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="protected">Protected</Label>
              <Switch
                id="protected"
                checked={isProtected}
                onCheckedChange={(checked) => setIsProtected(checked)}
                disabled={!isEditing}
              />
            </div>
          </TabsContent>
          <TabsContent value="handler" className="space-y-4">
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={selectedMethod}
                onValueChange={(method) => setSelectedMethod(method as HttpMethod)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Handler Type</Label>
              <Select
                value={selectedHandlerType}
                onValueChange={(type) => setSelectedHandlerType(type as "page" | "function" | "redirect")}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a handler type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="page">Page</SelectItem>
                  <SelectItem value="function">Function</SelectItem>
                  <SelectItem value="redirect">Redirect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedHandlerType === "function" && (
              <div className="space-y-2">
                <Label>Function</Label>
                <Select
                  value={functionId || ""}
                  onValueChange={(id) => setFunctionId(id === "" ? undefined : id)}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a function" />
                  </SelectTrigger>
                  <SelectContent>
                    {cloudFunctions.map((func) => (
                      <SelectItem key={func.id} value={func.id}>
                        {func.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="target">Target</Label>
              <Input
                id="target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        {isEditing ? (
          <div className="space-x-2">
            <Button onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>
              Save
            </Button>
          </div>
        ) : (
          <Button variant="primary" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        )}
        <Button variant="destructive" onClick={handleDelete}>
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RouteDetail;
