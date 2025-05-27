// pages/_app.tsx
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from '@/store/store'; // Assuming path is correct
import { Toaster } from '@/components/ui/sonner'; // Assuming path is correct
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/ui/animated-container'; // Assuming path is correct
import AppLayout from '@/components/layout/AppLayout'; // Added AppLayout import
import '../src/index.css';
import { initializeApp } from '@/services/appInitService'; // Path updated
import { useEffect, useState } from 'react'; // For initializeApp
import { useRouter } from 'next/router';

// Create a client
const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function handleInitialization() {
      try {
        console.log('Initializing app from _app.tsx...');
        const platformStatus = await initializeApp();
        
        // Store platform status in sessionStorage for other components to access
        sessionStorage.setItem('platformStatus', JSON.stringify(platformStatus));

        // Handle immediate redirects based on platform status
        if (platformStatus.status === 'PRISTINE' || platformStatus.status === 'CORE_ARTIFACTS_IMPORTED' || platformStatus.status === 'PARENT_ORG_CREATING') {
          console.log('Redirecting to create org admin...');
          setIsInitialized(true); // Set initialized before redirect
          router.replace('/setup/create-org-admin');
          return;
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize app from _app.tsx:", error);
        setIsInitialized(true); // Still allow the app to render with error state
      }
    }

    // Only initialize once when the component mounts
    handleInitialization();
  }, []); // Empty dependency array to run only once

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-primary"></div>
          </div>
          <p className="text-muted-foreground mt-4">Loading Token Nexus Platform...</p>
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