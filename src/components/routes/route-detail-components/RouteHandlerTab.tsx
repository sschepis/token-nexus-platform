import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { HttpMethod, RouteHandler } from "@/types/routes";
import { CloudFunction } from "@/types/cloud-functions";

interface RouteHandlerTabProps {
  selectedMethod: HttpMethod;
  setSelectedMethod: (method: HttpMethod) => void;
  selectedHandlerType: RouteHandler['type'];
  setSelectedHandlerType: (type: RouteHandler['type']) => void;
  target: string;
  setTarget: (target: string) => void;
  description: string;
  setDescription: (description: string) => void;
  functionId: string | undefined;
  setFunctionId: (id: string | undefined) => void;
  cloudFunctions: CloudFunction[];
  isEditing: boolean;
}

const RouteHandlerTab: React.FC<RouteHandlerTabProps> = ({
  selectedMethod,
  setSelectedMethod,
  selectedHandlerType,
  setSelectedHandlerType,
  target,
  setTarget,
  description,
  setDescription,
  functionId,
  setFunctionId,
  cloudFunctions,
  isEditing,
}) => {
  return (
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
          onValueChange={(type) => setSelectedHandlerType(type as RouteHandler['type'])}
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
  );
};

export default RouteHandlerTab;