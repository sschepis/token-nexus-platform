// pages/_app.tsx
import Parse from 'parse';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from '@/store/store'; // Assuming path is correct
import { Toaster } from '@/components/ui/sonner'; // Assuming path is correct
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/ui/animated-container'; // Assuming path is correct
import AppLayout from '@/components/layout/AppLayout'; // Added AppLayout import
import '../styles/globals.css';
import { initializeApp, PlatformStatus } from '@/services/appInitService'; // Path updated
import { initializeControllers } from '@/controllers/registerControllers'; // Import controller initializer
import { useEffect, useState } from 'react'; // For initializeApp
import { useRouter } from 'next/router';
import { useTheme } from '@/hooks/useTheme';

// Create a client
const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [initStep, setInitStep] = useState<string>('Starting...');

  useEffect(() => {
    // Only attempt initialization if it hasn't been successfully completed in this session
    // and if the component instance itself hasn't already run the init cycle.
    if (sessionStorage.getItem('appInitialized') === 'true' && !hasInitialized) {
        setIsInitialized(true);
        setHasInitialized(true);
        return;
    }

    // Ensure initialization only runs once per component mount (and only if not already initialized)
    if (hasInitialized) {
      return;
    }

    async function handleInitialization() {
      setHasInitialized(true); // Mark that initialization has been attempted for this component instance
      try {
        setInitStep('Checking if initializeApp exists...');
        if (!initializeApp || typeof initializeApp !== 'function') {
          throw new Error('initializeApp is not available');
        }

        setInitStep('Calling initializeApp...');
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Initialization timeout after 30 seconds')), 30000);
        });

        const platformStatus = await Promise.race([
          initializeApp(),
          timeoutPromise
        ]) as PlatformStatus;
        
        setInitStep('Storing platform status in sessionStorage...');
        sessionStorage.setItem('platformStatus', JSON.stringify(platformStatus));
        
        // Check authentication status after initialization
        const { isAuthenticated: currentIsAuthenticated } = store.getState().auth;

        if (platformStatus.status === 'OPERATIONAL' || platformStatus.status === 'PARENT_ORG_CREATED') {
            sessionStorage.setItem('appInitialized', 'true');
            initializeControllers(); // Initialize controllers after app init and before routing
            // If platform is operational and user is authenticated, redirect to dashboard
            if (currentIsAuthenticated) {
              setInitStep('Platform operational and authenticated, redirecting to dashboard...');
              setIsInitialized(true); // Allow navigation to proceed
              router.replace('/dashboard');
              return;
            } else {
              setInitStep('Platform operational but not authenticated, redirecting to login...');
              setIsInitialized(true); // Allow navigation to proceed
              router.replace('/login');
              return;
            }
        } else if (platformStatus.status === 'ERROR') {
          setInitError('Platform is in an error state. Please check server logs.');
          setIsInitialized(true);
          // Do not redirect, show error screen
          return;
        } else {
            sessionStorage.removeItem('appInitialized'); // Explicitly remove if not fully initialized
            setInitStep('Checking for redirects (setup phase)...');
            // If platform is in a setup phase, redirect to appropriate setup page
            if (platformStatus.status === 'PRISTINE' || platformStatus.status === 'CORE_ARTIFACTS_IMPORTED') {
              setInitStep('Redirecting to bootstrap login...');
              initializeControllers(); // Also initialize here for setup paths if needed
              setIsInitialized(true); // Allow navigation to proceed
              router.replace('/setup/bootstrap-login');
              return;
            } else if (platformStatus.status === 'PARENT_ORG_CREATING') {
              setInitStep('Redirecting to create org admin...');
              initializeControllers(); // And here
              setIsInitialized(true); // Allow navigation to proceed
              router.replace('/setup/create-org-admin');
              return;
            }
        }

        setInitStep('Initialization complete!');
        // Ensure controllers are initialized if no specific redirect happened but app is proceeding
        if (!sessionStorage.getItem('appInitialized')) { // Fallback if not set earlier
            initializeControllers();
        }
        setIsInitialized(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setInitError(`Initialization failed at step "${initStep}": ${errorMessage}`);
        console.error('App initialization error:', errorMessage);
        sessionStorage.removeItem('appInitialized'); // Ensure we retry on next load if an error occurs
        setIsInitialized(true); // Allow app to render, potentially showing the error
      }
    }

    handleInitialization();
  }, []); // Empty dependency array means it runs once on mount and not again

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="flex flex-col items-center max-w-md w-full">
          {initError ? (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500"></div>
              </div>
              <h2 className="text-xl font-semibold text-red-600 mb-4">Initialization Error</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 w-full">
                <p className="text-red-800 text-sm whitespace-pre-wrap">{initError}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reload Page
              </button>
            </>
          ) : (
            <>
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-primary"></div>
                </div>
                <p className="text-muted-foreground mt-4">Loading Token Nexus Platform...</p>
                <p className="text-sm text-muted-foreground/70 mt-2">{initStep}</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const noLayoutPaths = ['/login', '/setup/bootstrap-login', '/setup/create-org-admin', '/setup/error']; // Add setup paths

  const renderWithLayout = !noLayoutPaths.includes(router.pathname);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        {renderWithLayout ? (
          <AppLayout>
            <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
              <PageTransition key={router.route}> {/* Use router.route for unique key on route changes */}
                <Component {...pageProps} />
              </PageTransition>
            </AnimatePresence>
          </AppLayout>
        ) : (
          <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
            <PageTransition key={router.route}> {/* Use router.route for unique key on route changes */}
              <Component {...pageProps} />
            </PageTransition>
          </AnimatePresence>
        )}
        <Toaster />
      </QueryClientProvider>
    </Provider>
  );
}

export default MyApp;