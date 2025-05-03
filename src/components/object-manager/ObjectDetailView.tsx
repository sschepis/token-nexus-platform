
import React, { useState } from "react";
import { CustomObject, CustomField } from "@/types/object-manager";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Database, Settings } from "lucide-react";
import FieldModal from "@/components/object-manager/FieldModal";
import { toast } from "@/components/ui/sonner";
import ObjectTriggerEditor from "@/components/object-manager/ObjectTriggerEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ObjectSettings from "@/components/object-manager/ObjectSettings";

interface ObjectDetailViewProps {
  object: CustomObject;
  onUpdate: () => void;
}

const ObjectDetailView: React.FC<ObjectDetailViewProps> = ({ 
  object,
  onUpdate
}) => {
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomField | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomField | null>(null);
  const [activeTab, setActiveTab] = useState("fields");
  
  const handleAddField = () => {
    setSelectedField(null);
    setIsFieldModalOpen(true);
  };
  
  const handleEditField = (field: CustomField) => {
    setSelectedField(field);
    setIsFieldModalOpen(true);
  };
  
  const handleDeleteField = (field: CustomField) => {
    setFieldToDelete(field);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeleteField = () => {
    if (!fieldToDelete) return;
    
    // Mock API call
    toast.success(`Field "${fieldToDelete.label}" deleted`);
    setIsDeleteDialogOpen(false);
    onUpdate();
  };
  
  const getFieldTypeBadge = (type: string) => {
    const typeColors: Record<string, string> = {
      text: "bg-blue-100 text-blue-800",
      email: "bg-purple-100 text-purple-800",
      phone: "bg-green-100 text-green-800",
      picklist: "bg-amber-100 text-amber-800",
      date: "bg-pink-100 text-pink-800",
      lookup: "bg-indigo-100 text-indigo-800",
      number: "bg-cyan-100 text-cyan-800",
      checkbox: "bg-gray-100 text-gray-800",
      url: "bg-red-100 text-red-800",
      default: "bg-gray-100 text-gray-800"
    };
    
    return typeColors[type] || typeColors.default;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">{object.label}</h2>
          <p className="text-sm text-muted-foreground">
            API Name: {object.apiName} | Fields: {object.fields?.length || 0}
          </p>
          {object.description && (
            <p className="mt-2 text-sm text-muted-foreground">{object.description}</p>
          )}
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="fields" className="flex gap-2 items-center">
            <Database className="h-4 w-4" />
            Fields
          </TabsTrigger>
          <TabsTrigger value="triggers" className="flex gap-2 items-center">
            <Edit className="h-4 w-4" />
            Triggers
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex gap-2 items-center">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="fields">
          <div className="flex justify-end mb-4">
            <Button onClick={handleAddField}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>API Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {object.fields?.length ? (
                  object.fields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{field.label}</TableCell>
                      <TableCell>{field.apiName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getFieldTypeBadge(field.type)}>
                          {field.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{field.required ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mr-2"
                          onClick={() => handleEditField(field)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {field.apiName !== "Name" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteField(field)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No fields defined. Add fields to this object.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="triggers">
          <ObjectTriggerEditor objectApiName={object.apiName} />
        </TabsContent>
        
        <TabsContent value="settings">
          <ObjectSettings object={object} onUpdate={onUpdate} />
        </TabsContent>
      </Tabs>
      
      <FieldModal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        objectApiName={object.apiName}
        field={selectedField}
        onSuccess={() => {
          setIsFieldModalOpen(false);
          onUpdate();
        }}
      />
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete the field "{fieldToDelete?.label}" permanently.
              Any data stored in this field will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteField} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ObjectDetailView;
