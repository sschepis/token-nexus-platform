
import React, { ReactNode } from 'react';
import { motion, Variants } from 'framer-motion';

interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade' | 'slide' | 'zoom' | 'bounce' | 'none';
  delay?: number;
  duration?: number;
  once?: boolean;
}

const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const slideVariants: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1 }
};

const zoomVariants: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { scale: 1, opacity: 1 }
};

const bounceVariants: Variants = {
  hidden: { y: -10, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 10 }
  }
};

export function AnimatedContainer({
  children,
  className = '',
  animation = 'fade',
  delay = 0,
  duration = 0.3,
  once = true
}: AnimatedContainerProps) {
  const getVariant = (): Variants => {
    switch (animation) {
      case 'slide': return slideVariants;
      case 'zoom': return zoomVariants;
      case 'bounce': return bounceVariants;
      case 'none': return { hidden: {}, visible: {} };
      case 'fade':
      default: return fadeVariants;
    }
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once }}
      variants={getVariant()}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Page transition variant
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeInOut"
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: {
      duration: 0.3
    }
  }
};

// List item staggered animation
export const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

export const listItemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

// Export a page wrapper component
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Export a list container with staggered animation
interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedList({ children, className = '' }: AnimatedListProps) {
  return (
    <motion.div
      variants={listContainerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Export a list item component for use with AnimatedList
interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedListItem({ children, className = '' }: AnimatedListItemProps) {
  return (
    <motion.div
      variants={listItemVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
