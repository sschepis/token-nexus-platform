
import React from 'react';
import { PageElement } from '@/types/page-builder';
import { CustomObject } from '@/types/object-manager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PropertiesPanelProps {
  element: PageElement | null;
  onUpdateElement: (element: PageElement) => void;
  customObjects: CustomObject[];
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  element, 
  onUpdateElement,
  customObjects 
}) => {
  if (!element) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <h3 className="font-medium text-lg mb-2">Properties</h3>
        <p className="text-muted-foreground">
          Select an element on the canvas to edit its properties
        </p>
      </div>
    );
  }

  const handlePropertyChange = (propertyName: string, value: any) => {
    onUpdateElement({
      ...element,
      props: {
        ...element.props,
        [propertyName]: value
      }
    });
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: string) => {
    const numValue = parseInt(value) || 0;
    onUpdateElement({
      ...element,
      size: {
        ...element.size,
        [dimension]: numValue
      }
    });
  };

  // Find object and fields if there's an objectReference
  let objectFields: { id: string, apiName: string, label: string }[] = [];
  if (element.objectReference) {
    const objectName = element.objectReference.split('.')[0];
    const object = customObjects.find(obj => obj.apiName === objectName);
    if (object) {
      objectFields = object.fields;
    }
  }

  return (
    <div className="h-full flex flex-col">
      <h3 className="font-medium text-lg mb-4">Properties: {element.type}</h3>
      
      <ScrollArea className="flex-1">
        <div className="space-y-6 pr-4">
          <div className="space-y-2">
            <Label>Element Type</Label>
            <div className="font-medium">{element.type}</div>
          </div>

          <Separator />
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Dimensions</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  type="number"
                  value={element.size.width}
                  onChange={(e) => handleSizeChange('width', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  type="number"
                  value={element.size.height}
                  onChange={(e) => handleSizeChange('height', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Element Properties</h4>
            
            {/* Label property - common for most elements */}
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={element.props.label || ''}
                onChange={(e) => handlePropertyChange('label', e.target.value)}
              />
            </div>
            
            {/* Field binding - for data-bound elements */}
            {(element.type === 'text' || element.type === 'input' || element.type === 'datepicker') && (
              <div className="space-y-2">
                <Label htmlFor="fieldBinding">Field Binding</Label>
                {objectFields.length > 0 ? (
                  <Select
                    value={element.props.fieldBinding || ''}
                    onValueChange={(value) => handlePropertyChange('fieldBinding', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a field" />
                    </SelectTrigger>
                    <SelectContent>
                      {objectFields.map(field => (
                        <SelectItem key={field.id} value={field.apiName}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="fieldBinding"
                    value={element.props.fieldBinding || ''}
                    onChange={(e) => handlePropertyChange('fieldBinding', e.target.value)}
                    placeholder="e.g. Customer__c.Name"
                  />
                )}
              </div>
            )}
            
            {/* Element-specific properties */}
            {element.type === 'input' && (
              <div className="space-y-2">
                <Label htmlFor="placeholder">Placeholder</Label>
                <Input
                  id="placeholder"
                  value={element.props.placeholder || ''}
                  onChange={(e) => handlePropertyChange('placeholder', e.target.value)}
                />
              </div>
            )}
            
            {element.type === 'button' && (
              <div className="space-y-2">
                <Label htmlFor="variant">Variant</Label>
                <Select
                  value={element.props.variant || 'default'}
                  onValueChange={(value) => handlePropertyChange('variant', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select button variant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                    <SelectItem value="destructive">Destructive</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {element.type === 'card' && (
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Input
                  id="content"
                  value={element.props.content || ''}
                  onChange={(e) => handlePropertyChange('content', e.target.value)}
                />
              </div>
            )}
          </div>
          
          {element.objectReference && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Data Binding</Label>
                <div className="text-sm font-medium text-blue-500">{element.objectReference}</div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PropertiesPanel;
