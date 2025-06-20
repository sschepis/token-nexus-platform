// parse-server/src/cloud/ai-assistant/services/orgAssistantService.js
const { LLMProxyService } = require('./llmProxyService');
const { SchemaRegistryService } = require('./schemaRegistryService');
const { ToolExecutorService } = require('./toolExecutorService');

// Initialize other services this service will depend on
const llmProxyService = new LLMProxyService();
const schemaRegistryService = new SchemaRegistryService();
const toolExecutorService = new ToolExecutorService();

const MAX_TOOL_ITERATIONS = 5; // Prevent infinite loops

class OrgAssistantService {
  constructor() {
    console.log("OrgAssistantService initialized");
  }

  async handleQuery(queryRequest, userContext) {
    console.log(`OrgAssistantService: Handling query for user ${userContext.userId}: "${queryRequest.query}"`);
    const conversationId = queryRequest.conversationId || new Date().toISOString();

    // 1. Fetch relevant schemas
    const availableEntities = await schemaRegistryService.listAvailableEntities();
    const schemas = [];
    for (const entityName of availableEntities) {
      const schema = await schemaRegistryService.getSchema(entityName);
      if (schema) {
        schemas.push(schema);
      }
    }
    
    // 2. Fetch available tools from ToolExecutorService
    const tools = toolExecutorService.getRegisteredTools();

    // 3. Initialize conversation history
    // For a stateful conversation, this history would be retrieved or passed in.
    const conversationHistory = [{role: "user", content: queryRequest.query}];
    
    // The initial "prompt" sent to the LLM might just be the user's query,
    // with tools and schemas provided separately to the LLM API.
    // For this iteration, we'll pass the full constructed prompt string for the first call,
    // and then use conversation history for subsequent calls.
    let initialPrompt = `User query: "${queryRequest.query}"\n\n`;
    initialPrompt += `Available data schemas:\n${JSON.stringify(schemas, null, 2)}\n\n`;
    initialPrompt += `Available tools:\n${JSON.stringify(tools.map(t => ({name: t.name, description: t.description, parameters: t.parametersSchema})), null, 2)}`;

    let iterationCount = 0;

    try {
      while (iterationCount < MAX_TOOL_ITERATIONS) {
        iterationCount++;
        console.log(`OrgAssistantService: Iteration ${iterationCount}, calling LLM.`);

        // Use conversation history for subsequent calls if the LLM service supports it,
        // otherwise, adapt the prompt string.
        // The current llmProxyService.getLLMCompletion takes a 'prompt' string.
        // Conversation history handling will be refined in LLMProxyService.
        const llmResponse = await llmProxyService.getLLMCompletion(
          iterationCount === 1 ? initialPrompt : JSON.stringify(conversationHistory), // Pass history as string for now
          userContext,
          tools,
          schemas
        );

        if (typeof llmResponse === 'string') {
          conversationHistory.push({role: "assistant", content: llmResponse});
          return {
            response: llmResponse,
            conversationId,
          };
        } else if (llmResponse && 'toolCall' in llmResponse && llmResponse.toolCall) {
          const toolCall = llmResponse.toolCall;
          console.log(`OrgAssistantService: LLM requested tool call: ${toolCall.name} with args: ${JSON.stringify(toolCall.args)}`);
          
          conversationHistory.push({
            role: "assistant",
            content: null, // No direct text content from assistant, only tool call
            tool_calls: [{
              id: `call_${iterationCount}_${Date.now()}`, // Unique ID for the tool call
              type: "function",
              function: {
                name: toolCall.name,
                arguments: JSON.stringify(toolCall.args)
              }
            }]
          });

          let toolResultData;
          try {
            toolResultData = await toolExecutorService.executeTool(toolCall.name, toolCall.args, userContext);
            console.log(`OrgAssistantService: Tool ${toolCall.name} executed successfully. Result:`, toolResultData);
          } catch (toolError) {
            const errorMessage = toolError instanceof Error ? toolError.message : "Unknown error during tool execution.";
            console.error(`OrgAssistantService: Error executing tool ${toolCall.name}:`, errorMessage);
            toolResultData = { error: `Tool execution failed: ${errorMessage}` };
          }
          
          const lastAssistantMessage = conversationHistory[conversationHistory.length - 1];
          if(lastAssistantMessage.role !== "assistant" || !lastAssistantMessage.tool_calls) {
            // This should not happen if logic is correct
            throw new Error("Error in conversation history: Expected last message to be assistant tool call.");
          }
          const toolCallId = lastAssistantMessage.tool_calls[0].id;

          conversationHistory.push({
            role: "tool",
            tool_call_id: toolCallId,
            name: toolCall.name,
            content: JSON.stringify(toolResultData)
          });
          
          const finalLlmResponse = await llmProxyService.getLLMResponseAfterToolExecution(
            JSON.stringify(conversationHistory), // Pass history as string for now
            toolCall, // Pass the specific tool call that was made
            toolResultData, // Pass the result of that tool call
            userContext,
            tools
          );

          if (typeof finalLlmResponse === 'string') {
            conversationHistory.push({role: "assistant", content: finalLlmResponse});
            return {
              response: finalLlmResponse,
              conversationId,
            };
          } else if (finalLlmResponse && 'error' in finalLlmResponse) {
             console.error("OrgAssistantService: Error from LLM after tool execution:", finalLlmResponse.error);
             return {
                response: "The assistant encountered an error after processing your request with a tool.",
                conversationId,
                error: finalLlmResponse.error,
             };
          } else {
            console.error("OrgAssistantService: Unexpected response from LLM after tool execution:", finalLlmResponse);
            return {
                response: "The assistant received an unexpected response after tool processing.",
                conversationId,
                error: "Unexpected LLM response format after tool execution.",
            };
          }

        } else if (llmResponse && 'error' in llmResponse) {
          console.error("OrgAssistantService: Error from LLM:", llmResponse.error);
          return {
            response: "The assistant encountered an error.",
            conversationId,
            error: llmResponse.error,
          };
        } else {
          console.error("OrgAssistantService: Unexpected response from LLMProxyService:", llmResponse);
          return {
            response: "The assistant received an unexpected response.",
            conversationId,
            error: "Unexpected LLM response format.",
          };
        }
      }

      if (iterationCount >= MAX_TOOL_ITERATIONS) {
        console.warn("OrgAssistantService: Max tool iterations reached.");
        return {
          response: "The assistant reached the maximum number of steps to process your request. Please try rephrasing.",
          conversationId,
          error: "Max tool iterations reached.",
        };
      }
    } catch (error) {
      console.error("OrgAssistantService: Unhandled error in handleQuery:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred in the OrgAssistantService.";
      return {
        response: "The assistant encountered an unexpected error.",
        conversationId,
        error: message,
      };
    }
    
    return {
      response: "OrgAssistantService: Could not complete the request.",
      conversationId,
      error: "Request processing incomplete after iterations.",
    };
  }
}

module.exports = { OrgAssistantService };