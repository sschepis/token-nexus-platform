/* global Parse */

const { getUserTierAndOrganization, getCapabilitiesForTier } = require('./shared');
const aiServiceFactory = require('../../services/aiService');
const configServiceFactory = require('../../services/configService');

// Initialize services with Parse object
const AIService = aiServiceFactory(Parse);
const configService = configServiceFactory(Parse);

/**
 * Process assistant message
 */
Parse.Cloud.define('assistant_process_message', async request => {
  const { context, message: userMessage } = request.params;
  const { user } = request;

  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Get user's assistant tier and organization
    const { tier, organization } = await getUserTierAndOrganization(user);
    const config = await configService.getOrganizationConfig(organization.id);

    // No fallback responses - AI service must be properly configured

    // Build system message based on tier
    const capabilities = getCapabilitiesForTier(tier);
    const systemMessage = {
      role: 'system',
      content: `You are a ${tier}-tier AI assistant with the following capabilities: ${capabilities
        .map(cap => cap.name + ': ' + cap.description)
        .join(', ')}. Current context: ${JSON.stringify(context)}`,
    };

    // Process message with AI service
    try {
      // Process message with AI service
      const response = await AIService.processMessage(
        config.ai.provider || 'openai',
        [systemMessage, { role: 'user', content: userMessage }],
        {
          temperature: 0.7,
          maxTokens: config.ai.maxTokens,
        },
        organization.id
      );

      // Parse AI response for actions and suggestions
      const responseLines = response.content.split('\n');
      const actions = [];
      const suggestions = [];

      responseLines.forEach(line => {
        if (line.startsWith('ACTION:')) {
          actions.push(line.replace('ACTION:', '').trim());
        } else if (line.startsWith('SUGGEST:')) {
          suggestions.push(line.replace('SUGGEST:', '').trim());
        }
      });

      const message = responseLines
        .filter(line => !line.startsWith('ACTION:') && !line.startsWith('SUGGEST:'))
        .join('\n');

      return {
        message,
        actions,
        suggestions,
        context: {
          confidence_score: 0.85,
          requires_clarification: false,
        },
      };
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
      'Error processing assistant message: ' + error.message
    );
  }
});