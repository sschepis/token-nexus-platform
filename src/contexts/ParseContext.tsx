import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Parse from 'parse';

interface ParseContextType {
  isParseReady: boolean;
  isSessionReady: boolean;
  parseError: string | null;
  initializationStep: string;
}

const ParseContext = createContext<ParseContextType | undefined>(undefined);

interface ParseProviderProps {
  children: ReactNode;
}

export const ParseProvider: React.FC<ParseProviderProps> = ({ children }) => {
  const [isParseReady, setIsParseReady] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [initializationStep, setInitializationStep] = useState('Initializing...');

  useEffect(() => {
    // Listen for Parse ready events
    const handleParseReady = () => {
      setIsParseReady(true);
      setInitializationStep('Parse SDK ready');
      setParseError(null);
    };

    const handleSessionReady = () => {
      setIsSessionReady(true);
      setInitializationStep('Session restored');
    };

    const handleParseError = (event: CustomEvent) => {
      setParseError(event.detail.error);
      setInitializationStep('Parse initialization failed');
    };

    // Add event listeners
    window.addEventListener('parseReady', handleParseReady);
    window.addEventListener('sessionReady', handleSessionReady);
    window.addEventListener('parseError', handleParseError as EventListener);

    // Check if Parse is already ready (in case events fired before component mounted)
    if ((window as any).parseReady) {
      setIsParseReady(true);
      setInitializationStep('Parse SDK ready');
    }

    if ((window as any).sessionReady) {
      setIsSessionReady(true);
      setInitializationStep('Session restored');
    }

    return () => {
      window.removeEventListener('parseReady', handleParseReady);
      window.removeEventListener('sessionReady', handleSessionReady);
      window.removeEventListener('parseError', handleParseError as EventListener);
    };
  }, []);

  const contextValue: ParseContextType = {
    isParseReady,
    isSessionReady,
    parseError,
    initializationStep,
  };

  return (
    <ParseContext.Provider value={contextValue}>
      {children}
    </ParseContext.Provider>
  );
};

export const useParseContext = (): ParseContextType => {
  const context = useContext(ParseContext);
  if (context === undefined) {
    throw new Error('useParseContext must be used within a ParseProvider');
  }
  return context;
};

// Hook for components that need Parse to be ready
export const useParseReady = (): boolean => {
  const { isParseReady } = useParseContext();
  return isParseReady;
};

// Hook for components that need user session to be ready
export const useSessionReady = (): boolean => {
  const { isSessionReady } = useParseContext();
  return isSessionReady;
};

// Global function to check Parse readiness (for use outside React components)
export const isParseGloballyReady = (): boolean => {
  return !!(window as any).parseReady;
};

// Global function to check session readiness
export const isSessionGloballyReady = (): boolean => {
  return !!(window as any).sessionReady;
};