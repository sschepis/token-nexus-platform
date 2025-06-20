import Parse from 'parse';
import { toast } from 'sonner';
import { safeParseCloudRun, requiresUserSession } from './parseUtils';

/**
 * Generic API response wrapper for consistent error handling
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Generic wrapper for Parse Cloud function calls with consistent error handling
 */
export async function callCloudFunction<T = any>(
  functionName: string,
  params: Record<string, unknown> = {},
  options: {
    showErrorToast?: boolean;
    errorMessage?: string;
  } = {}
): Promise<ApiResponse<T>> {
  const { showErrorToast = true, errorMessage } = options;
  
  try {
    const result = await safeParseCloudRun(functionName, params, {
      requiresSession: requiresUserSession(functionName)
    });
    return {
      success: true,
      data: result,
      message: result?.message || 'Operation completed successfully'
    };
  } catch (error: any) {
    const errorMsg = errorMessage || error.message || `Failed to execute ${functionName}`;
    
    if (showErrorToast) {
      toast.error(errorMsg);
    }
    
    console.error(`[API] Error calling ${functionName}:`, error);
    
    return {
      success: false,
      error: errorMsg,
      message: errorMsg
    };
  }
}

/**
 * Generic wrapper for Parse Cloud function calls that return arrays
 */
export async function callCloudFunctionForArray<T = any>(
  functionName: string,
  params: Record<string, unknown> = {},
  options: {
    showErrorToast?: boolean;
    errorMessage?: string;
    defaultValue?: T[];
  } = {}
): Promise<ApiResponse<T[]>> {
  const { defaultValue = [] } = options;
  const result = await callCloudFunction<{ data?: T[] } | T[]>(functionName, params, options);
  
  if (!result.success) {
    return {
      ...result,
      data: defaultValue
    };
  }
  
  // Handle both direct array responses and wrapped responses
  const data = Array.isArray(result.data) ? result.data : (result.data?.data || defaultValue);
  
  return {
    ...result,
    data
  };
}

/**
 * Batch API calls with error handling
 */
export async function batchApiCalls<T>(
  calls: Array<() => Promise<ApiResponse<T>>>,
  options: {
    continueOnError?: boolean;
    showErrorToast?: boolean;
  } = {}
): Promise<{
  results: Array<ApiResponse<T>>;
  successCount: number;
  errorCount: number;
}> {
  const { continueOnError = true, showErrorToast = true } = options;
  const results: Array<ApiResponse<T>> = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const call of calls) {
    try {
      const result = await call();
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        if (!continueOnError) break;
      }
    } catch (error: any) {
      const errorResult: ApiResponse<T> = {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
      results.push(errorResult);
      errorCount++;
      
      if (showErrorToast) {
        toast.error(errorResult.error);
      }
      
      if (!continueOnError) break;
    }
  }
  
  return { results, successCount, errorCount };
}

/**
 * Retry mechanism for API calls
 */
export async function retryApiCall<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<ApiResponse<T>> {
  const { maxRetries = 3, retryDelay = 1000, backoffMultiplier = 2 } = options;
  
  let lastError: ApiResponse<T> | null = null;
  let currentDelay = retryDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();
      if (result.success) {
        return result;
      }
      lastError = result;
    } catch (error: any) {
      lastError = {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
    
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }
  
  return lastError || {
    success: false,
    error: 'Maximum retry attempts exceeded'
  };
}