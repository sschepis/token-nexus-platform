// parse-server/src/cloud/ai-assistant/services/toolExecutorService.ts
import { UserContext, ToolDefinition } from '../../../../../src/ai-assistant/types';
import { PermissionService } from './permissionService';

// Initialize other services this service will depend on
const permissionService = new PermissionService();

// A simple in-memory registry for tools.
// In a real application, tools might be discovered dynamically or loaded from a configuration.
const toolRegistry: Map<string, ToolDefinition> = new Map();

export class ToolExecutorService {
  constructor() {
    console.log("ToolExecutorService initialized");
    // Example: Register a few placeholder tools
    this.registerTool({
      name: "getUserDetails",
      description: "Retrieves details for a specified user or the current user if no ID is provided.",
      parametersSchema: { type: "object", properties: { userId: { type: "string", description: "Optional. The ID of the user to fetch." } } },
      execute: async (args: { userId?: string }, userContext: UserContext) => {
        const targetUserId = args.userId || userContext.userId;
        // In a real scenario, fetch from Parse.User table
        console.log(`Tool: getUserDetails called for userId: ${targetUserId} by user: ${userContext.userId}`);
        return { id: targetUserId, email: `${targetUserId}@example.com`, name: `User ${targetUserId}`, roles: userContext.roles };
      }
    });
    this.registerTool({
      name: "createObjectRecord",
      description: "Creates a new record for a specified custom object type.",
      parametersSchema: { 
        type: "object", 
        properties: { 
          objectApiName: { type: "string", description: "The API name of the custom object (e.g., 'Task', 'Project')." },
          recordData: { type: "object", description: "An object containing the field data for the new record." }
        },
        required: ["objectApiName", "recordData"]
      },
      execute: async (args: Record<string, unknown>, userContext: UserContext) => {
        // Validate and cast arguments for this specific tool
        const objectApiName = args.objectApiName as string;
        const recordData = args.recordData as Record<string, unknown>;

        if (typeof objectApiName !== 'string' || !objectApiName) {
          throw new Error("Tool 'createObjectRecord' requires 'objectApiName' string argument.");
        }
        if (typeof recordData !== 'object' || recordData === null) {
          throw new Error("Tool 'createObjectRecord' requires 'recordData' object argument.");
        }

        // In a real scenario, interact with Parse to create the object
        console.log(`Tool: createObjectRecord called for object '${objectApiName}' by user: ${userContext.userId} with data:`, recordData);
        // const NewParseObject = Parse.Object.extend(objectApiName);
        // const newRecord = new NewParseObject();
        // await newRecord.save(recordData, { sessionToken: userContext.sessionToken }); // Assuming sessionToken is part of UserContext
        return { success: true, recordId: `new_record_${Date.now()}`, objectApiName: objectApiName, data: recordData };
      }
    });
  }

  registerTool(tool: ToolDefinition): void {
    if (toolRegistry.has(tool.name)) {
      console.warn(`ToolExecutorService: Tool "${tool.name}" is being re-registered.`);
    }
    toolRegistry.set(tool.name, tool);
    console.log(`ToolExecutorService: Tool "${tool.name}" registered.`);
  }

  async executeTool(toolName: string, args: Record<string, unknown>, userContext: UserContext): Promise<unknown> {
    console.log(`ToolExecutorService: Attempting to execute tool "${toolName}" for user ${userContext.userId} with args:`, args);

    const tool = toolRegistry.get(toolName);
    if (!tool) {
      console.error(`ToolExecutorService: Tool "${toolName}" not found.`);
      throw new Error(`Tool "${toolName}" not found.`);
    }

    // 1. Check permissions BEFORE executing the tool
    // The resource identifier might be part of the args (e.g., objectApiName, recordId)
    // or derived from the toolName itself.
    const resourceIdentifier = args.objectApiName as string || args.recordId as string || toolName;
    const canExecute = await permissionService.canExecute(userContext, toolName, resourceIdentifier, args);

    if (!canExecute) {
      console.warn(`ToolExecutorService: User ${userContext.userId} denied permission to execute tool "${toolName}" on resource "${resourceIdentifier}".`);
      throw new Error(`User does not have permission to execute tool "${toolName}".`);
    }

    console.log(`ToolExecutorService: User ${userContext.userId} granted permission for tool "${toolName}". Executing...`);
    try {
      const result = await tool.execute(args, userContext);
      console.log(`ToolExecutorService: Tool "${toolName}" executed successfully. Result:`, result);
      return result;
    } catch (error: unknown) {
      console.error(`ToolExecutorService: Error executing tool "${toolName}":`, error);
      const errorMessage = (error instanceof Error) ? error.message : "Unknown error during tool execution.";
      throw new Error(`Execution of tool "${toolName}" failed: ${errorMessage}`);
    }
  }

  getRegisteredTools(): ToolDefinition[] {
    return Array.from(toolRegistry.values());
  }
}