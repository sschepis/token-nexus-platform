
import React from 'react';
import { CustomComponent } from '@/types/component-library';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Database } from 'lucide-react';

interface ComponentCardProps {
  component: CustomComponent;
  onClick: () => void;
}

const ComponentCard: React.FC<ComponentCardProps> = ({ 
  component, 
  onClick 
}) => {
  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="h-36 bg-gray-100 flex items-center justify-center">
        {component.preview ? (
          <img 
            src={component.preview} 
            alt={component.name} 
            className="w-full h-full object-contain" 
          />
        ) : (
          <div className="flex flex-col items-center text-muted-foreground">
            <Database className="h-12 w-12 mb-2" />
            <span className="text-sm">No preview</span>
          </div>
        )}
      </div>
      <CardContent className="pt-4">
        <h3 className="font-medium text-lg">{component.name}</h3>
        <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
          {component.description}
        </p>
      </CardContent>
      <CardFooter className="border-t px-6 py-3 text-sm text-muted-foreground">
        <div className="flex justify-between w-full">
          <div>Type: {component.type}</div>
          <div className="font-medium text-blue-500">{component.objectBinding}</div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ComponentCard;
