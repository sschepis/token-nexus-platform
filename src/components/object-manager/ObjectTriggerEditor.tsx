
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ObjectTriggerEditorProps {
  objectApiName: string;
}

type TriggerEvent = "beforeInsert" | "afterInsert" | "beforeUpdate" | "afterUpdate" | "beforeDelete" | "afterDelete";

const ObjectTriggerEditor: React.FC<ObjectTriggerEditorProps> = ({ objectApiName }) => {
  const [code, setCode] = useState<string>(getInitialCode(objectApiName));
  const [currentEvent, setCurrentEvent] = useState<TriggerEvent>("beforeInsert");
  const [isSaving, setIsSaving] = useState(false);

  const triggerEvents: { value: TriggerEvent; label: string }[] = [
    { value: "beforeInsert", label: "Before Insert" },
    { value: "afterInsert", label: "After Insert" },
    { value: "beforeUpdate", label: "Before Update" },
    { value: "afterUpdate", label: "After Update" },
    { value: "beforeDelete", label: "Before Delete" },
    { value: "afterDelete", label: "After Delete" },
  ];

  const handleSave = () => {
    setIsSaving(true);
    
    // Mock API call to save the trigger
    setTimeout(() => {
      toast.success(`Trigger saved for ${objectApiName}`);
      setIsSaving(false);
    }, 500);
  };

  const handleEventChange = (event: TriggerEvent) => {
    // Confirm before changing if code has been modified
    if (code !== getInitialCode(objectApiName, currentEvent)) {
      if (window.confirm("You have unsaved changes. Do you want to continue without saving?")) {
        setCurrentEvent(event);
        setCode(getInitialCode(objectApiName, event));
      }
    } else {
      setCurrentEvent(event);
      setCode(getInitialCode(objectApiName, event));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Object Triggers for {objectApiName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <Select
                value={currentEvent}
                onValueChange={(value) => handleEventChange(value as TriggerEvent)}
              >
                <SelectTrigger className="w-full md:w-[220px]">
                  <SelectValue placeholder="Select trigger event" />
                </SelectTrigger>
                <SelectContent>
                  {triggerEvents.map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Trigger"}
              </Button>
            </div>
            
            <div className="border rounded-md p-1 bg-slate-50 dark:bg-slate-900">
              <Textarea 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                className="font-mono text-sm h-[400px] resize-y whitespace-pre overflow-auto bg-slate-50 dark:bg-slate-900 p-4 border-none focus-visible:ring-0"
                placeholder="Write your trigger code here..."
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Available context variables:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">record</code> - The current record being processed</li>
                <li><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">oldRecord</code> - Previous version of the record (in update/delete operations)</li>
                <li><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">currentUser</code> - The user performing the action</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to generate initial code template based on event type
function getInitialCode(objectName: string, event: TriggerEvent = "beforeInsert"): string {
  const templates: Record<TriggerEvent, string> = {
    beforeInsert: 
`/**
 * Before Insert Trigger for ${objectName}
 * 
 * This code runs before a new record is inserted
 * 
 * @param record - The record being inserted
 * @param context - Additional context information
 */
function beforeInsert(record, context) {
  // Example: Auto-populate a field
  if (!record.Status) {
    record.Status = 'New';
  }
  
  // Example: Validate required fields
  if (!record.Name) {
    throw new Error('Name field is required');
  }
  
  return record;
}`,
    afterInsert: 
`/**
 * After Insert Trigger for ${objectName}
 * 
 * This code runs after a new record is inserted
 * 
 * @param record - The newly inserted record
 * @param context - Additional context information
 */
function afterInsert(record, context) {
  // Example: Create related records
  // Example: Send notifications
  console.log('Record created:', record.Id);
}`,
    beforeUpdate: 
`/**
 * Before Update Trigger for ${objectName}
 * 
 * This code runs before a record is updated
 * 
 * @param record - The record with new values
 * @param oldRecord - The record before update
 * @param context - Additional context information
 */
function beforeUpdate(record, oldRecord, context) {
  // Example: Check for field changes
  if (record.Status !== oldRecord.Status) {
    record.LastStatusChange = new Date();
  }
  
  return record;
}`,
    afterUpdate: 
`/**
 * After Update Trigger for ${objectName}
 * 
 * This code runs after a record is updated
 * 
 * @param record - The updated record
 * @param oldRecord - The record before update
 * @param context - Additional context information
 */
function afterUpdate(record, oldRecord, context) {
  // Example: Propagate changes to related records
  // Example: Create audit trail entries
  if (record.Status !== oldRecord.Status) {
    console.log('Status changed from', oldRecord.Status, 'to', record.Status);
  }
}`,
    beforeDelete: 
`/**
 * Before Delete Trigger for ${objectName}
 * 
 * This code runs before a record is deleted
 * 
 * @param record - The record being deleted
 * @param context - Additional context information
 */
function beforeDelete(record, context) {
  // Example: Check if deletion is allowed
  if (record.Status === 'Active') {
    throw new Error('Cannot delete active records');
  }
  
  // Example: Archive related data before deletion
  // Return true to allow deletion, or throw an error to prevent it
  return true;
}`,
    afterDelete: 
`/**
 * After Delete Trigger for ${objectName}
 * 
 * This code runs after a record is deleted
 * 
 * @param record - The record that was deleted
 * @param context - Additional context information
 */
function afterDelete(record, context) {
  // Example: Clean up related records
  // Example: Log deletion for audit purposes
  console.log('Record deleted:', record.Id);
}`
  };
  
  return templates[event];
}

export default ObjectTriggerEditor;
