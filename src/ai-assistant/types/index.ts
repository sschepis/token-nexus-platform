// src/ai-assistant/types/index.ts

/**
 * Defines the structure for a tool that the AI assistant can use.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  // JSON schema for input parameters
  parametersSchema: Record<string, unknown>;
  // Optional: JSON schema for the expected output structure
  outputSchema?: Record<string, unknown>;
  // The function that executes the tool's logic
  execute: (args: Record<string, unknown>, userContext: UserContext) => Promise<unknown>;
}

/**
 * Represents the context of the user making the request.
 * This will be passed to tools for permission checking and context-aware actions.
 */
export interface UserContext {
  userId: string;
  orgId?: string; // If applicable
  roles: string[]; // User's roles within the organization/system
  // Add other relevant user context fields as needed
}

/**
 * Describes a single property (field) within a data schema.
 */
export interface SchemaProperty {
  apiName: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'reference' | 'enum' | 'array' | 'object';
  description?: string;
  required?: boolean;
  // For 'enum' type
  options?: Array<{ label: string; value: string | number }>;
  // For 'reference' type, the apiName of the referenced entity
  referenceTo?: string;
  // For 'array' type, specifies the type of items in the array
  itemType?: 'string' | 'number' | 'boolean' | 'object' | 'reference';
  // For 'array' of 'object' or 'reference', specifies the schema of the items
  itemSchema?: SchemaDefinition | string; // string would be apiName of referenced schema
  // For 'object' type, nested schema definition
  properties?: Record<string, SchemaProperty>;
}

/**
 * Defines the schema for a specific data entity (e.g., an object type, a table).
 */
export interface SchemaDefinition {
  apiName: string; // Unique identifier for the schema (e.g., "CustomObject_Task", "User")
  label: string; // User-friendly name (e.g., "Task", "User")
  description?: string;
  properties: Record<string, SchemaProperty>; // Keyed by property apiName
  // List of available high-level actions for this entity (e.g., "create", "read", "update", "delete", "list")
  // This can help the LLM understand what it can do with this entity type.
  availableActions?: string[];
}

/**
 * Represents the input for an API request to the AI assistant.
 */
export interface AssistantQueryRequest {
  query: string;
  userId: string; // To be populated by the API gateway/auth layer
  orgId?: string;
  conversationId?: string; // To maintain context across multiple turns
  // Any other relevant metadata
}

/**
 * Represents the response from the AI assistant.
 */
export interface AssistantQueryResponse {
  response: string; // The natural language response from the assistant
  conversationId: string;
  // Optional: Structured data if the response includes it (e.g., a list of records)
  structuredData?: unknown;
  // Optional: Suggested follow-up actions or questions
  suggestions?: string[];
  error?: string; // If an error occurred
}