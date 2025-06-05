import { toast } from '@/hooks/use-toast';

/**
 * Handles API errors by displaying appropriate toast messages.
 * @param {number} status - The HTTP status code of the error.
 * @param {string} [description] - An optional description for the toast message.
 */
export function handleApiError(status: number, description?: string): void {
  switch (status) {
    case 401:
      toast({
        title: "Session expired",
        description: description || "Please log in again to continue.",
        variant: "destructive",
      });
      break;
    case 403:
      toast({
        title: "Access denied",
        description: description || "You don't have permission to perform this action.",
        variant: "destructive",
      });
      break;
    case 500:
      toast({
        title: "Server error",
        description: description || "Something went wrong. Please try again later.",
        variant: "destructive",
      });
      break;
    default:
      toast({
        title: "API Error",
        description: description || `An unexpected error occurred (Status: ${status}).`,
        variant: "destructive",
      });
      break;
  }
}

/**
 * Handles network-related errors (e.g., no response from server).
 * @param {string} [description] - An optional description for the toast message.
 */
export function handleNetworkError(description?: string): void {
  toast({
    title: "Network error",
    description: description || "Unable to connect to the server. Please check your internet connection.",
    variant: "destructive",
  });
}