/* global Parse */

const { capabilities, getUserTierAndOrganization, getCapabilitiesForTier } = require('./shared');
const AIService = require('../../services/aiService');
const configService = require('../../services/configService');

/**
 * Execute assistant action
 */
Parse.Cloud.define('assistant_execute_action', async request => {
  const { action, context } = request.params;
  const { user } = request;

  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Get user's assistant tier and organization
    const { tier, organization } = await getUserTierAndOrganization(user);

    // Check if action is allowed for user's tier
    if (action.metadata?.tier_required && tier !== action.metadata.tier_required) {
      throw new Parse.Error(
        Parse.Error.OPERATION_FORBIDDEN,
        'This action requires a higher tier subscription'
      );
    }

    const config = await configService.getOrganizationConfig(organization.id);

    try {
      // Get capabilities for user's tier
      const userCapabilities = getCapabilitiesForTier(tier);
      
      // Build system message for action execution
      const systemMessage = {
        role: 'system',
        content: `You are executing the following action: ${action.name}.
                 Context: ${JSON.stringify(context)}
                 Tier: ${tier}
                 Capabilities: ${userCapabilities
                   .map(cap => cap.name + ': ' + cap.description)
                   .join(', ')}`,
      };

      // Process action with AI service
      const response = await AIService.processMessage(
        config.ai.provider || 'openai',
        [
          systemMessage,
          {
            role: 'user',
            content: `Execute action: ${action.name}
Parameters: ${JSON.stringify(action.parameters || {})}`,
          },
        ],
        {
          temperature: 0.3, // Lower temperature for more deterministic action execution
          maxTokens: config.ai.maxTokens,
        },
        organization.id
      );

      // Parse AI response for structured data
      const responseLines = response.content.split('\n');
      const result = {
        success: true,
        message: responseLines.filter(line => !line.startsWith('DATA:')).join('\n'),
        data: null,
      };

      // Extract structured data if present
      const dataLine = responseLines.find(line => line.startsWith('DATA:'));

      if (dataLine) {
        try {
          result.data = JSON.parse(dataLine.replace('DATA:', '').trim());
        } catch (e) {
          console.error('Failed to parse action data:', e);
        }
      }

      return result;
    } catch (aiError) {
      console.error('AI service error:', aiError);
      throw new Parse.Error(
        Parse.Error.INTERNAL_SERVER_ERROR,
        'AI service is not properly configured or unavailable: ' + aiError.message
      );
    }
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.INTERNAL_SERVER_ERROR,
      'Error executing assistant action: ' + error.message
    );
  }
});