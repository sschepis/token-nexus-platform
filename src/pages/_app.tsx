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
import { initializeApp, PlatformStatus } from '@/services/appInitService';
import { initializeControllers } from '@/controllers/registerControllers'; // Import controller initializer
import { useEffect, useState, useRef } from 'react'; // For initializeApp
import { useRouter } from 'next/router';
import { useTheme } from '@/hooks/useTheme';
import { AlertCircle, Loader2 } from 'lucide-react';

// Create a client
const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  // Use a ref to ensure initialization logic runs only once
  const initRef = useRef(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [initStep, setInitStep] = useState<string>('Starting application initialization...');

  useEffect(() => {
    // Ensure this initialization logic runs only once
    if (initRef.current) {
      return;
    }
    initRef.current = true;

    async function handleAppStartup() {
      try {
        setInitStep('Initializing Parse and core services...');
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Core initialization timed out (30 seconds)')), 30000);
        });

        const platformStatus = await Promise.race([
          initializeApp(),
          timeoutPromise
        ]) as PlatformStatus;

        console.log('[App] Core application initialized. Platform status:', platformStatus);
        
        setInitStep('Registering page controllers...');
        initializeControllers();
        console.log('[App] All page controllers registered.');

        // Determine next path based on platform status and authentication
        const { isAuthenticated: currentIsAuthenticated } = store.getState().auth;
        let redirectPath: string | null = null;

        if (platformStatus.status === 'OPERATIONAL' || platformStatus.status === 'PARENT_ORG_CREATED') {
          if (!currentIsAuthenticated) {
            redirectPath = '/login';
          }
        } else if (platformStatus.status === 'ERROR') {
          setInitError('Platform is in an error state. Please check server logs.');
          return; // Stay on error screen
        } else if (platformStatus.status === 'PRISTINE' || platformStatus.status === 'CORE_ARTIFACTS_IMPORTED') {
          redirectPath = '/setup/bootstrap-login';
        } else if (platformStatus.status === 'PARENT_ORG_CREATING') {
          redirectPath = '/setup/create-org-admin';
        }

        if (redirectPath) {
          router.replace(redirectPath);
        }

        setIsAppReady(true); // Mark application as fully ready
        setInitStep('Application ready.');

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setInitError(`Application startup failed: ${errorMessage}. Current step: "${initStep}".`);
        console.error('Application startup error:', errorMessage);
        setIsAppReady(false); // Application not ready due to error
      }
    }

    handleAppStartup();
  }, [router, initStep]);


  // Show loading/error screen while not ready
  if (!isAppReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
        <div className="flex flex-col items-center max-w-md w-full">
          {initError ? (
            <div className="text-red-500">
              <AlertCircle className="h-16 w-16 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-3">Startup Error</h2>
              <p className="text-sm font-mono whitespace-pre-wrap px-4 py-2 bg-red-50/50 rounded-md border border-red-200">
                {initError}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors"
              >
                Reload Application
              </button>
            </div>
          ) : (
            <div className="text-primary-foreground">
              <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-semibold mb-3">Initializing Application</h2>
              <p className="text-muted-foreground">{initStep}</p>
            </div>
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