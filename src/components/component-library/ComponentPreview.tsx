
import React from 'react';
import { CustomComponent } from '@/types/component-library';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface ComponentPreviewProps {
  component: CustomComponent;
}

const ComponentPreview: React.FC<ComponentPreviewProps> = ({ component }) => {
  // A very simple renderer for the component preview
  // In a real app, this would be much more sophisticated
  
  const renderElement = (element: any) => {
    switch (element.type) {
      case 'card':
        return (
          <Card key={element.id} className="w-full">
            <CardHeader>
              <CardTitle>{element.props.title || 'Card'}</CardTitle>
            </CardHeader>
            <CardContent>
              {element.children.map((child: any) => renderElement(child))}
            </CardContent>
          </Card>
        );
      case 'form':
        return (
          <form key={element.id} className="space-y-4">
            {element.children.map((child: any) => renderElement(child))}
            <Button type="button">{element.props.submitLabel || 'Submit'}</Button>
          </form>
        );
      case 'text':
        return (
          <div key={element.id} className="flex items-center my-2">
            <div className="w-1/3 font-medium">{element.props.label || 'Label'}:</div>
            <div className="w-2/3">
              {element.props.fieldBinding ? (
                <span className="text-blue-500">
                  {`{${element.props.fieldBinding}}`}
                </span>
              ) : (
                'Sample text'
              )}
            </div>
          </div>
        );
      case 'input':
        return (
          <div key={element.id} className="space-y-2 my-4">
            <Label htmlFor={element.id}>{element.props.label || 'Input'}</Label>
            <Input 
              id={element.id} 
              placeholder={element.props.placeholder || `Enter ${element.props.label || 'value'}`}
            />
            {element.props.fieldBinding && (
              <p className="text-xs text-muted-foreground">
                Bound to: {element.props.fieldBinding}
              </p>
            )}
          </div>
        );
      case 'datepicker':
        return (
          <div key={element.id} className="space-y-2 my-4">
            <Label htmlFor={element.id}>{element.props.label || 'Date'}</Label>
            <Input 
              id={element.id} 
              type="date"
            />
            {element.props.fieldBinding && (
              <p className="text-xs text-muted-foreground">
                Bound to: {element.props.fieldBinding}
              </p>
            )}
          </div>
        );
      default:
        return (
          <div key={element.id} className="p-2 border rounded bg-muted">
            Unknown element: {element.type}
          </div>
        );
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-background">
      <div className="mb-4 pb-2 border-b">
        <span className="text-xs font-medium text-muted-foreground">
          PREVIEW - Bound to {component.objectBinding}
        </span>
      </div>
      
      <div className="min-h-[300px]">
        {component.elements.map(renderElement)}
      </div>
    </div>
  );
};

export default ComponentPreview;
