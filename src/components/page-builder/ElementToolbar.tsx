
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, Copy, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { PageElement } from '@/types/page-builder';

interface ElementToolbarProps {
  element: PageElement;
  onLockToggle: (element: PageElement) => void;
  onDuplicate: (element: PageElement) => void;
  onDelete: (elementId: string) => void;
  onBringForward: (element: PageElement) => void;
  onSendBackward: (element: PageElement) => void;
}

const ElementToolbar: React.FC<ElementToolbarProps> = ({
  element,
  onLockToggle,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute -top-10 left-0 bg-background border shadow-md rounded-md flex items-center p-1 z-50"
    >
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7"
        onClick={() => onLockToggle(element)}
        title={element.props.locked ? "Unlock" : "Lock"}
      >
        {element.props.locked ? 
          <Lock className="h-4 w-4" /> : 
          <Unlock className="h-4 w-4" />
        }
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7"
        onClick={() => onDuplicate(element)}
        title="Duplicate"
      >
        <Copy className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7"
        onClick={() => onBringForward(element)}
        title="Bring Forward"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7"
        onClick={() => onSendBackward(element)}
        title="Send Backward"
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={() => onDelete(element.id)}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </motion.div>
  );
};

export default ElementToolbar;
