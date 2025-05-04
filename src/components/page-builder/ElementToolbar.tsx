
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

// Animation variants
const toolbarVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 260,
      damping: 20,
      staggerChildren: 0.05
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2 } 
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: -5 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 }
};

// Button animation variants defined directly with proper types
const buttonHoverAnimation = { 
  scale: 1.05,
  transition: { duration: 0.2 }
};

const buttonTapAnimation = { 
  scale: 0.95 
};

// Create a motion button component that combines Button with motion capabilities
const MotionButton = motion(Button);

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
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={toolbarVariants}
      className="absolute -top-10 left-0 bg-background border shadow-md rounded-md flex items-center p-1 z-50"
    >
      <motion.div variants={itemVariants}>
        <MotionButton 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          onClick={() => onLockToggle(element)}
          title={element.props.locked ? "Unlock" : "Lock"}
          whileHover={buttonHoverAnimation}
          whileTap={buttonTapAnimation}
        >
          {element.props.locked ? 
            <Lock className="h-4 w-4" /> : 
            <Unlock className="h-4 w-4" />
          }
        </MotionButton>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <MotionButton 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          onClick={() => onDuplicate(element)}
          title="Duplicate"
          whileHover={buttonHoverAnimation}
          whileTap={buttonTapAnimation}
        >
          <Copy className="h-4 w-4" />
        </MotionButton>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <MotionButton 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          onClick={() => onBringForward(element)}
          title="Bring Forward"
          whileHover={buttonHoverAnimation}
          whileTap={buttonTapAnimation}
        >
          <ArrowUp className="h-4 w-4" />
        </MotionButton>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <MotionButton 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          onClick={() => onSendBackward(element)}
          title="Send Backward"
          whileHover={buttonHoverAnimation}
          whileTap={buttonTapAnimation}
        >
          <ArrowDown className="h-4 w-4" />
        </MotionButton>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <MotionButton 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(element.id)}
          title="Delete"
          whileHover={{ 
            ...buttonHoverAnimation, 
            color: "var(--destructive)" 
          }}
          whileTap={buttonTapAnimation}
        >
          <Trash2 className="h-4 w-4" />
        </MotionButton>
      </motion.div>
    </motion.div>
  );
};

export default ElementToolbar;
