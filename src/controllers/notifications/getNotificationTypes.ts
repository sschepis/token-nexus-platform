import { ActionContext } from '../types/ActionTypes';

export async function getNotificationTypes(params: Record<string, unknown>, context: ActionContext) {
  const orgId = context.user.organizationId || context.organization?.id;

  if (!orgId) {
    throw new Error('Organization ID is required to get notification types');
  }

  try {
    // Query for distinct notification types used in this organization
    const query = new Parse.Query('Notification');
    query.equalTo('organizationId', orgId);
    query.select('type');
    query.limit(1000); // Get a large sample to find all types
    
    const notifications = await query.find();
    const usedTypes = Array.from(new Set(notifications.map(n => n.get('type')).filter(Boolean)));

    // Also get system-defined notification types from a configuration object
    let systemTypes: string[] = [];
    try {
      const configQuery = new Parse.Query('NotificationConfig');
      configQuery.equalTo('configType', 'notification_types');
      configQuery.equalTo('organizationId', orgId);
      
      const config = await configQuery.first();
      if (config) {
        systemTypes = config.get('types') || [];
      }
    } catch (error) {
      // If no config exists, fall back to default types
      console.warn('No notification config found, using defaults');
    }

    // Combine used types with system types, removing duplicates
    const allTypes = Array.from(new Set([...usedTypes, ...systemTypes]));
    
    // If no types found, provide sensible defaults
    if (allTypes.length === 0) {
      allTypes.push(
        'system',
        'security',
        'user_action',
        'integration',
        'workflow',
        'reminder',
        'alert',
        'announcement',
        'update',
        'error'
      );
    }

    // Sort types alphabetically
    allTypes.sort();

    return {
      types: allTypes,
      usedTypes: usedTypes.sort(),
      systemTypes: systemTypes.sort(),
      totalCount: allTypes.length
    };
  } catch (error) {
    console.error('Error fetching notification types:', error);
    throw new Error('Failed to fetch notification types');
  }
}