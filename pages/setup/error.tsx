import React from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function SetupError() {
  const router = useRouter();
  const { message, details } = router.query;
  const error = (typeof message === 'string' ? message : '') || 'An unknown error occurred during platform setup.';

  const handleRetry = () => {
    // Force a page reload to retry the initialization
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Platform Setup Error</CardTitle>
          <CardDescription>
            A critical error occurred during the initial setup of the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          
          {details && (
            <div className="rounded-lg bg-muted p-4">
              <h3 className="text-sm font-semibold mb-2">Error Details</h3>
              <pre className="text-xs whitespace-pre-wrap break-words">
                {details}
              </pre>
            </div>
          )}
          
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">What you can do:</h3>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Check the server logs for more detailed error information</li>
              <li>Verify that all environment variables are correctly configured</li>
              <li>Ensure the Parse Server is running and accessible</li>
              <li>Check that deployment artifacts exist in the expected directories</li>
              <li>Contact your system administrator or support team</li>
            </ul>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button onClick={handleRetry} variant="outline" className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Setup
            </Button>
            <Button
              onClick={() => window.open('/parse-server/logs', '_blank')}
              variant="secondary"
              className="flex-1"
            >
              View Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}