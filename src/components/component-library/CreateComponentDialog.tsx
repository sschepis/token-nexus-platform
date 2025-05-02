
import React, { useState } from 'react';
import { CustomObject } from '@/types/object-manager';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface CreateComponentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  objects: CustomObject[];
}

const CreateComponentDialog: React.FC<CreateComponentDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  objects
}) => {
  const [componentName, setComponentName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('display');
  const [selectedObject, setSelectedObject] = useState<string>('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real app, we'd actually create the component in the database
    console.log('Creating component:', {
      name: componentName,
      description,
      type,
      objectBinding: selectedObject
    });
    
    // For demo purposes, just call onSuccess
    onSuccess();
    
    // Reset form
    setComponentName('');
    setDescription('');
    setType('display');
    setSelectedObject('');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Component</DialogTitle>
          <DialogDescription>
            Create a reusable component bound to a data object.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Component Name</Label>
            <Input
              id="name"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              placeholder="e.g. Customer Profile Card"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what this component does"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Component Type</Label>
              <Select
                value={type}
                onValueChange={setType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="display">Display</SelectItem>
                  <SelectItem value="form">Form</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="chart">Chart</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="object">Data Object</Label>
              <Select
                value={selectedObject}
                onValueChange={setSelectedObject}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select object" />
                </SelectTrigger>
                <SelectContent>
                  {objects.map(obj => (
                    <SelectItem key={obj.id} value={obj.apiName}>
                      {obj.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!componentName || !selectedObject}>
              Create Component
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateComponentDialog;
