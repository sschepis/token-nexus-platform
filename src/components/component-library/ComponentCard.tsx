
import React from 'react';
import { CustomComponent } from '@/types/component-library';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Database } from 'lucide-react';
import { motion } from 'framer-motion';

interface ComponentCardProps {
  component: CustomComponent;
  onClick: () => void;
}

const ComponentCard: React.FC<ComponentCardProps> = ({ 
  component, 
  onClick 
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 17 }}
    >
      <Card 
        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={onClick}
      >
        <motion.div 
          className="h-36 bg-gray-100 flex items-center justify-center"
          whileHover={{ 
            backgroundColor: "var(--background)",
          }}
        >
          {component.preview ? (
            <img 
              src={component.preview} 
              alt={component.name} 
              className="w-full h-full object-contain" 
            />
          ) : (
            <motion.div 
              className="flex flex-col items-center text-muted-foreground"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ 
                repeat: Infinity, 
                duration: 2,
                ease: "easeInOut"
              }}
            >
              <Database className="h-12 w-12 mb-2" />
              <span className="text-sm">No preview</span>
            </motion.div>
          )}
        </motion.div>
        <CardContent className="pt-4">
          <h3 className="font-medium text-lg">{component.name}</h3>
          <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
            {component.description}
          </p>
        </CardContent>
        <CardFooter className="border-t px-6 py-3 text-sm text-muted-foreground">
          <div className="flex justify-between w-full">
            <div>Type: {component.type}</div>
            <motion.div 
              className="font-medium text-blue-500"
              whileHover={{ scale: 1.05 }}
            >
              {component.objectBinding}
            </motion.div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default ComponentCard;
