
import React from 'react';
import { PageElement } from '@/types/page-builder';
import { CustomObject } from '@/types/object-manager';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ColorPicker } from './ColorPicker';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

  const handlePositionChange = (axis: 'x' | 'y', value: string) => {
    const numValue = parseInt(value) || 0;
    onUpdateElement({
      ...element,
      position: {
        ...element.position,
        [axis]: numValue
      }
    });
  };

  const handleStyleChange = (styleName: string, value: string) => {
    onUpdateElement({
      ...element,
      style: {
        ...(element.style || {}),
        [styleName]: value
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
        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="space-y-4">
            <Accordion type="single" collapsible defaultValue="dimensions" className="w-full">
              <AccordionItem value="dimensions">
                <AccordionTrigger>Dimensions</AccordionTrigger>
                <AccordionContent className="space-y-4">
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
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="position">
                <AccordionTrigger>Position</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="x">X Position</Label>
                      <Input
                        id="x"
                        type="number"
                        value={element.position.x}
                        onChange={(e) => handlePositionChange('x', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="y">Y Position</Label>
                      <Input
                        id="y"
                        type="number"
                        value={element.position.y}
                        onChange={(e) => handlePositionChange('y', e.target.value)}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="content">
                <AccordionTrigger>Content</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  {/* Element-specific properties */}
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
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="style" className="space-y-4">
            {/* Background and appearance styling */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="backgroundColor">Background Color</Label>
                <ColorPicker
                  id="backgroundColor"
                  value={(element.style?.backgroundColor || '#ffffff')}
                  onChange={(value) => handleStyleChange('backgroundColor', value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="textColor">Text Color</Label>
                <ColorPicker
                  id="textColor"
                  value={(element.style?.color || '#000000')}
                  onChange={(value) => handleStyleChange('color', value)}
                />
              </div>
            </div>

            <Separator />

            {/* Border styling */}
            <div className="space-y-4">
              <Label>Border</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="borderWidth">Width</Label>
                  <Slider
                    id="borderWidth"
                    defaultValue={[parseInt(element.style?.borderWidth || '0')]}
                    max={10}
                    step={1}
                    onValueChange={(value) => handleStyleChange('borderWidth', `${value[0]}px`)}
                  />
                  <div className="text-right text-sm text-muted-foreground">
                    {parseInt(element.style?.borderWidth || '0')}px
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="borderColor">Color</Label>
                  <ColorPicker
                    id="borderColor"
                    value={(element.style?.borderColor || '#000000')}
                    onChange={(value) => handleStyleChange('borderColor', value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="borderStyle">Style</Label>
                <Select
                  value={element.style?.borderStyle || 'solid'}
                  onValueChange={(value) => handleStyleChange('borderStyle', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Border style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="dashed">Dashed</SelectItem>
                    <SelectItem value="dotted">Dotted</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="borderRadius">Border Radius</Label>
                <Slider
                  id="borderRadius"
                  defaultValue={[parseInt(element.style?.borderRadius || '0')]}
                  max={20}
                  step={1}
                  onValueChange={(value) => handleStyleChange('borderRadius', `${value[0]}px`)}
                />
                <div className="text-right text-sm text-muted-foreground">
                  {parseInt(element.style?.borderRadius || '0')}px
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="visible">Visible</Label>
                <Switch 
                  id="visible"
                  checked={element.props.visible !== false}
                  onCheckedChange={(checked) => handlePropertyChange('visible', checked)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Controls element visibility on the page
              </p>
            </div>

            {element.objectReference && (
              <div className="space-y-2">
                <Label>Data Binding</Label>
                <div className="text-sm font-medium text-blue-500">{element.objectReference}</div>
                <p className="text-xs text-muted-foreground">
                  This element is bound to data from your object
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="customId">Custom ID</Label>
              <Input
                id="customId"
                value={element.props.customId || ''}
                onChange={(e) => handlePropertyChange('customId', e.target.value)}
                placeholder="e.g. header-button"
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for this element
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};

export default PropertiesPanel;
