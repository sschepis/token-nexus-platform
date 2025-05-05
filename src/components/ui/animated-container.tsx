
import React, { ReactNode } from 'react';
import { motion, Variants, useAnimation, useInView } from 'framer-motion';

// Enhanced animation variants
interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade' | 'slide' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'zoom' | 'bounce' | 'rotate' | 'flip' | 'none';
  delay?: number;
  duration?: number;
  once?: boolean;
  threshold?: number;
  amount?: 'some' | 'all' | number;
}

// Enhanced variants with more options
const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const slideVariants: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1 }
};

const slideUpVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

const slideDownVariants: Variants = {
  hidden: { y: -20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

const slideLeftVariants: Variants = {
  hidden: { x: 20, opacity: 0 },
  visible: { x: 0, opacity: 1 }
};

const slideRightVariants: Variants = {
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

const rotateVariants: Variants = {
  hidden: { rotate: -10, opacity: 0 },
  visible: { 
    rotate: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
};

const flipVariants: Variants = {
  hidden: { rotateX: 90, opacity: 0 },
  visible: { 
    rotateX: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
};

// Custom hook for scroll-triggered animations
export function useScrollAnimation(threshold = 0.1) {
  const controls = useAnimation();
  const [ref, inView] = React.useState<any>(null);
  const isInView = useInView(ref, { once: true, amount: threshold });
  
  React.useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [controls, isInView]);
  
  return { ref, controls, isInView };
}

export function AnimatedContainer({
  children,
  className = '',
  animation = 'fade',
  delay = 0,
  duration = 0.3,
  once = true,
  threshold = 0.1,
  amount = 'some'
}: AnimatedContainerProps) {
  const getVariant = (): Variants => {
    switch (animation) {
      case 'slide': return slideVariants;
      case 'slide-up': return slideUpVariants;
      case 'slide-down': return slideDownVariants;
      case 'slide-left': return slideLeftVariants;
      case 'slide-right': return slideRightVariants;
      case 'zoom': return zoomVariants;
      case 'bounce': return bounceVariants;
      case 'rotate': return rotateVariants;
      case 'flip': return flipVariants;
      case 'none': return { hidden: {}, visible: {} };
      case 'fade':
      default: return fadeVariants;
    }
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={getVariant()}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Page transition variant with enhanced animations
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeInOut",
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: {
      duration: 0.3,
      when: "afterChildren",
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

// Staggered animations for lists
export const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    transition: {
      when: "afterChildren",
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

export const listItemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  },
  exit: {
    y: -10,
    opacity: 0
  }
};

// Card animation variants
export const cardVariants: Variants = {
  hover: { 
    scale: 1.03,
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
    transition: { duration: 0.2 }
  },
  tap: { 
    scale: 0.97 
  }
};

// Button animation variants
export const buttonVariants: Variants = {
  hover: { 
    scale: 1.05,
    transition: { duration: 0.2 }
  },
  tap: { 
    scale: 0.95 
  }
};

// Export a page wrapper component with enhanced transitions
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
  staggerDelay?: number;
}

export function AnimatedList({ children, className = '', staggerDelay = 0.1 }: AnimatedListProps) {
  const customVariants = {
    ...listContainerVariants,
    visible: {
      ...listContainerVariants.visible,
      transition: {
        ...listContainerVariants.visible.transition,
        staggerChildren: staggerDelay
      }
    }
  };

  return (
    <motion.div
      variants={customVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
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
  variants?: Variants;
}

export function AnimatedListItem({ 
  children, 
  className = '',
  variants = listItemVariants
}: AnimatedListItemProps) {
  return (
    <motion.div
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animate presence wrapper for layout transitions
interface AnimatedLayoutProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedLayout({ children, className = '' }: AnimatedLayoutProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
