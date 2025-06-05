module.exports = Parse => {
  const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');

  /**
   * Fetches a list of scheduled AI tasks.
   * Requires 'ai-assistant:read' permission.
   */
  Parse.Cloud.define('getScheduledTasks', withOrganizationContext(async (request) => {
    const { organization, organizationId } = request;
    const currentUser = request.user;

    const { limit, skip, isActive } = request.params;
    const query = new Parse.Query('ScheduledTask');

    if (typeof isActive === 'boolean') {
      query.equalTo('isActive', isActive);
    }

    if (organizationId) {
      query.equalTo('organization', organization);
    }
    
    if (limit) query.limit(limit);
    if (skip) query.skip(skip);

    query.descending('createdAt');

    try {
      const tasks = await query.find({ useMasterKey: true });
      return { tasks: tasks.map(task => task.toJSON()) };
    } catch (error) {
      console.error('Error in getScheduledTasks:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch scheduled tasks');
    }
  }));
  
  /**
   * Creates a new scheduled AI task.
   * Requires 'ai-assistant:write' permission.
   */
  Parse.Cloud.define('createScheduledTask', withOrganizationContext(async (request) => {
    const { organization, organizationId } = request;
    const currentUser = request.user;

    const { name, description, cronExpression, actionDetails } = request.params;

    if (!name || !cronExpression || !actionDetails) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Name, cron expression, and action details are required.');
    }

    const ScheduledTask = Parse.Object.extend('ScheduledTask');
    const newTask = new ScheduledTask();

    newTask.set('name', name);
    newTask.set('description', description || '');
    newTask.set('cronExpression', cronExpression);
    newTask.set('actionDetails', actionDetails);
    newTask.set('isActive', true);
    newTask.set('createdBy', currentUser);
    newTask.set('organization', organization);

    try {
      const savedTask = await newTask.save(null, { useMasterKey: true });
      return { task: savedTask.toJSON() };
    } catch (error) {
      console.error('Error in createScheduledTask:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message || 'Failed to create scheduled task');
    }
  }));
  
  /**
   * Updates an existing scheduled AI task.
   * Requires 'ai-assistant:write' permission.
   */
  Parse.Cloud.define('updateScheduledTask', withOrganizationContext(async (request) => {
    const { organization, organizationId } = request;
    const currentUser = request.user;

    const { taskId, updates } = request.params;

    if (!taskId || !updates) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Task ID and updates are required.');
    }

    const query = new Parse.Query('ScheduledTask');
    query.equalTo('organization', organization);
    
    try {
      const task = await query.get(taskId, { useMasterKey: true });

      if (updates.name !== undefined) task.set('name', updates.name);
      if (updates.description !== undefined) task.set('description', updates.description);
      if (updates.cronExpression !== undefined) task.set('cronExpression', updates.cronExpression);
      if (updates.actionDetails !== undefined) task.set('actionDetails', updates.actionDetails);
      if (updates.isActive !== undefined) task.set('isActive', updates.isActive);

      const updatedTask = await task.save(null, { useMasterKey: true });
      return { task: updatedTask.toJSON() };
    } catch (error) {
      console.error('Error in updateScheduledTask:', error);
      if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Scheduled task not found or does not belong to your organization.');
      }
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message || 'Failed to update scheduled task');
    }
  }));
  
  /**
   * Deletes a scheduled AI task by its ID.
   * Requires 'ai-assistant:delete' permission.
   */
  Parse.Cloud.define('deleteScheduledTask', withOrganizationContext(async (request) => {
    const { organization, organizationId } = request;
    const currentUser = request.user;

    const { taskId } = request.params;

    if (!taskId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Task ID is required.');
    }

    const query = new Parse.Query('ScheduledTask');
    query.equalTo('organization', organization);
    
    try {
      const task = await query.get(taskId, { useMasterKey: true });
      await task.destroy({ useMasterKey: true });
      return { success: true, message: 'Scheduled task deleted successfully.' };
    } catch (error) {
      console.error('Error in deleteScheduledTask:', error);
      if (error.code === Parse.Error.OBJECT_NOT_FOUND) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Scheduled task not found or does not belong to your organization.');
      }
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message || 'Failed to delete scheduled task');
    }
  }));
};