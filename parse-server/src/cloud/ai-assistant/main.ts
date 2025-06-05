// parse-server/src/cloud/ai-assistant/main.ts
import Parse from 'parse-server'; // This will be the parse-server module itself
// Adjust path to shared types. Assuming tsconfig paths allow this, or use relative paths.
import { AssistantQueryRequest, AssistantQueryResponse, UserContext } from '../../../../src/ai-assistant/types';
import { OrgAssistantService } from './services/orgAssistantService'; // Will create this next

// Initialize services
// In a more complex setup, consider dependency injection.
const orgAssistantService = new OrgAssistantService();

/**
 * Main Cloud Function for handling AI Assistant queries.
 */
Parse.Cloud.define("aiAssistantQuery", async (request) => {
  // Type assertion for request.params
  const params = request.params as AssistantQueryRequest;
  
  // Ensure request.user is valid and of a type that has an 'id' property
  if (!request.user || typeof request.user.id !== 'string') {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User not authenticated or user ID is invalid.");
  }
  const user = request.user as Parse.User; // Cast to Parse.User for Parse-specific methods if needed

  if (!params.query || params.query.trim() === "") {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Query cannot be empty.");
  }

  // Construct UserContext from the Parse User and request parameters
  const userContext: UserContext = {
    userId: user.id,
    // Example: Fetch orgId. This might come from a user's session, a pointer on the User object, or params.
    // Adjust based on your actual User and Organization model.
    orgId: params.orgId || (user.get("currentOrganization") as Parse.Object)?.id, 
    // Example: Fetch roles. This might be an array directly on the User object or require a query to a Role table.
    // Ensure 'roles' is always an array of strings.
    roles: (user.get("roles") as string[] | undefined) || [], 
  };

  console.log(`AI Assistant Query from user ${userContext.userId} (Org: ${userContext.orgId || 'N/A'}): "${params.query}"`);

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
});

console.log("AI Assistant Cloud Code (main.ts) initialized.");