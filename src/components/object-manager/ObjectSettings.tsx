
import React, { useState } from "react";
import { CustomObject } from "@/types/object-manager";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Separator } from "@/components/ui/separator";

interface ObjectSettingsProps {
  object: CustomObject;
  onUpdate: () => void;
}

const ObjectSettings: React.FC<ObjectSettingsProps> = ({ object, onUpdate }) => {
  const [formState, setFormState] = useState({
    label: object.label,
    description: object.description || "",
    trackHistory: true,
    allowReports: true,
    searchable: true,
    allowSharing: true,
    allowBulkEdit: true,
    allowMassDelete: false
  });
  
  const [isSaving, setIsSaving] = useState(false);
  
  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormState({
      ...formState,
      [field]: e.target.value
    });
  };
  
  const handleSwitchChange = (field: string) => (checked: boolean) => {
    setFormState({
      ...formState,
      [field]: checked
    });
  };
  
  const handleSave = () => {
    setIsSaving(true);
    
    // Mock API call
    setTimeout(() => {
      toast.success("Object settings saved successfully");
      setIsSaving(false);
      onUpdate();
    }, 500);
  };
  
  const handleDeleteObject = () => {
    if (window.confirm(`Are you sure you want to delete "${object.label}"? This action cannot be undone.`)) {
      // Mock API call
      toast.success(`Object "${object.label}" deleted successfully`);
      // In a real app, this would redirect to the objects list
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Settings</CardTitle>
          <CardDescription>
            Configure the basic settings for this object
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={formState.label}
                onChange={handleChange("label")}
              />
              <p className="text-sm text-muted-foreground">
                Display name for this object
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-name">API Name</Label>
              <Input
                id="api-name"
                value={object.apiName}
                disabled
              />
              <p className="text-sm text-muted-foreground">
                API name cannot be changed after creation
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formState.description}
              onChange={handleChange("description")}
              placeholder="Describe the purpose of this object"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Object Behavior</CardTitle>
          <CardDescription>
            Configure how the object behaves in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="track-history">Track Field History</Label>
              <p className="text-sm text-muted-foreground">
                Track changes to fields in this object
              </p>
            </div>
            <Switch
              id="track-history"
              checked={formState.trackHistory}
              onCheckedChange={handleSwitchChange("trackHistory")}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-reports">Allow in Reports</Label>
              <p className="text-sm text-muted-foreground">
                Allow this object to be used in reports
              </p>
            </div>
            <Switch
              id="allow-reports"
              checked={formState.allowReports}
              onCheckedChange={handleSwitchChange("allowReports")}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="searchable">Searchable</Label>
              <p className="text-sm text-muted-foreground">
                Include this object in global search results
              </p>
            </div>
            <Switch
              id="searchable"
              checked={formState.searchable}
              onCheckedChange={handleSwitchChange("searchable")}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Sharing Settings</CardTitle>
          <CardDescription>
            Control how records in this object can be shared
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-sharing">Allow Sharing</Label>
              <p className="text-sm text-muted-foreground">
                Allow records to be shared with other users
              </p>
            </div>
            <Switch
              id="allow-sharing"
              checked={formState.allowSharing}
              onCheckedChange={handleSwitchChange("allowSharing")}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-bulk-edit">Allow Bulk Edit</Label>
              <p className="text-sm text-muted-foreground">
                Allow multiple records to be edited at once
              </p>
            </div>
            <Switch
              id="allow-bulk-edit"
              checked={formState.allowBulkEdit}
              onCheckedChange={handleSwitchChange("allowBulkEdit")}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-mass-delete">Allow Mass Delete</Label>
              <p className="text-sm text-muted-foreground">
                Allow multiple records to be deleted at once
              </p>
            </div>
            <Switch
              id="allow-mass-delete"
              checked={formState.allowMassDelete}
              onCheckedChange={handleSwitchChange("allowMassDelete")}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="destructive" onClick={handleDeleteObject}>
            Delete Object
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ObjectSettings;
