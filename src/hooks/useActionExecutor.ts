import { useState } from 'react';
import { apiService } from '../services/api';

interface ActionExecutorResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime: number;
    timestamp: Date;
    actionId: string;
    userId: string;
  };
}

export const useActionExecutor = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeAction = async (
    controllerId: string,
    actionId: string,
    params: Record<string, any> = {}
  ): Promise<ActionExecutorResult> => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the existing API service to execute actions
      const response = await apiService.post('/actions/execute', {
        controllerId,
        actionId,
        params
      });

      if (response.success) {
        return response;
      } else {
        throw new Error(response.error || 'Action execution failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    executeAction,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};