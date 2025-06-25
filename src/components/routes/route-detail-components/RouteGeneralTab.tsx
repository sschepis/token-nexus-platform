import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";

interface RouteGeneralTabProps {
  path: string;
  setPath: (path: string) => void;
  active: boolean;
  setActive: (active: boolean) => void;
  isProtected: boolean;
  setIsProtected: (isProtected: boolean) => void;
  isEditing: boolean;
}

const RouteGeneralTab: React.FC<RouteGeneralTabProps> = ({
  path,
  setPath,
  active,
  setActive,
  isProtected,
  setIsProtected,
  isEditing,
}) => {
  return (
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
  );
};

export default RouteGeneralTab;