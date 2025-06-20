// parse-server/src/cloud/ai-assistant/main.ts
import Parse from 'parse-server'; // This will be the parse-server module itself
// Adjust path to shared types. Assuming tsconfig paths allow this, or use relative paths.
import { AssistantQueryRequest, AssistantQueryResponse, UserContext } from '../../../../src/ai-assistant/types';
import { OrgAssistantService } from './services/orgAssistantService'; // Will create this next

// Import middleware system for proper organization context injection
const { defineFunction, stacks } = require('../middleware');

// Initialize services
// In a more complex setup, consider dependency injection.
const orgAssistantService = new OrgAssistantService();

/**
 * Main Cloud Function for handling AI Assistant queries.
 * Uses standard middleware stack which includes:
 * - Error handling
 * - Authentication
 * - Organization context injection (security-compliant)
 */
const aiAssistantQueryHandler = async (request: any) => {
  // Type assertion for request.params
  const params = request.params as AssistantQueryRequest;
  const user = request.user as Parse.User;
  
  // Organization ID is automatically injected by middleware - no client input needed
  const organizationId = request.organizationId;

  if (!params.query || params.query.trim() === "") {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Query cannot be empty.");
  }

  // Construct UserContext using server-injected organization context
  const userContext: UserContext = {
    userId: user.id,
    // Use server-injected organization ID (schema-separated security)
    orgId: organizationId,
    // Get roles from user object or query roles table
    roles: (user.get("roles") as string[] | undefined) || [],
  };

  console.log(`AI Assistant Query from user ${userContext.userId} (Org: ${userContext.orgId}): "${params.query}"`);

  try {
    // Delegate to the OrgAssistantService
    const response = await orgAssistantService.handleQuery(params, userContext);
    return response;
  } catch (error: unknown) {
    console.error("Error in aiAssistantQuery:", error);
    // Ensure a Parse.Error is thrown for client-side handling
    if (error instanceof Parse.Error) {
      throw error;
    }
    // Try to get a message from the error object, or provide a generic one
    const message = (typeof error === 'object' && error !== null && 'message' in error)
                    ? String((error as {message: unknown}).message)
                    : "An unexpected error occurred in the AI assistant.";
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, message);
  }
};

// Define the cloud function with standard middleware stack
// This automatically handles auth and organization context injection
defineFunction("aiAssistantQuery", stacks.standard, aiAssistantQueryHandler);

console.log("AI Assistant Cloud Code (main.ts) initialized with proper middleware.");