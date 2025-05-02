
import React, { useState } from 'react';
import { CustomObject } from '@/types/object-manager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutPanelLeft, 
  Square, 
  Type, 
  Button as ButtonIcon,
  FormInput,
  Calendar,
  CheckSquare,
  CreditCard,
  Table,
  BarChart4,
  Database
} from 'lucide-react';

interface ComponentToolboxProps {
  customObjects: CustomObject[];
  isLoading: boolean;
  onAddElement: (elementType: string, objectReference?: string) => void;
}

const ComponentToolbox: React.FC<ComponentToolboxProps> = ({ 
  customObjects, 
  isLoading, 
  onAddElement 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const basicComponents = [
    { name: 'Container', icon: Square, type: 'container' },
    { name: 'Text', icon: Type, type: 'text' },
    { name: 'Button', icon: ButtonIcon, type: 'button' },
    { name: 'Input', icon: FormInput, type: 'input' },
    { name: 'Card', icon: CreditCard, type: 'card' }
  ];

  const dataComponents = [
    { name: 'Form', icon: LayoutPanelLeft, type: 'form' },
    { name: 'Table', icon: Table, type: 'table' },
    { name: 'Chart', icon: BarChart4, type: 'chart' },
    { name: 'Checkbox', icon: CheckSquare, type: 'checkbox' },
    { name: 'Date Picker', icon: Calendar, type: 'datepicker' }
  ];

  const filteredObjects = customObjects.filter(obj => 
    obj.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obj.apiName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBasicComponents = searchTerm === '' ? 
    basicComponents : 
    basicComponents.filter(comp => 
      comp.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const filteredDataComponents = searchTerm === '' ?
    dataComponents :
    dataComponents.filter(comp =>
      comp.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="h-full flex flex-col">
      <h3 className="font-medium text-lg mb-4">Components</h3>
      
      <div className="mb-4">
        <Input
          placeholder="Search components..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <Tabs defaultValue="basic" className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="objects">Objects</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="flex-1 mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredBasicComponents.map((component) => (
                <Button
                  key={component.type}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onAddElement(component.type)}
                >
                  <component.icon className="mr-2 h-4 w-4" />
                  {component.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="data" className="flex-1 mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredDataComponents.map((component) => (
                <Button
                  key={component.type}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onAddElement(component.type)}
                >
                  <component.icon className="mr-2 h-4 w-4" />
                  {component.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="objects" className="flex-1 mt-4">
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="py-4 text-center text-muted-foreground">
                Loading objects...
              </div>
            ) : filteredObjects.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                {searchTerm ? 
                  "No objects match your search" : 
                  "No objects available"
                }
              </div>
            ) : (
              <div className="space-y-4">
                {filteredObjects.map((object) => (
                  <div key={object.id} className="border rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{object.label}</h4>
                        <p className="text-xs text-muted-foreground">{object.apiName}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onAddElement('container', object.apiName)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {object.fields.slice(0, 3).map((field) => (
                        <div 
                          key={field.id}
                          className="text-xs flex items-center justify-between py-1 px-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                          onClick={() => onAddElement('text', `${object.apiName}.${field.apiName}`)}
                        >
                          <span>{field.label}</span>
                          <span className="text-muted-foreground">{field.type}</span>
                        </div>
                      ))}
                      {object.fields.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center mt-1">
                          +{object.fields.length - 3} more fields
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Fix TypeScript error - missing import
import { Plus } from 'lucide-react';

export default ComponentToolbox;
