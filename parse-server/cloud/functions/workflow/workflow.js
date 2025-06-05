module.exports = Parse => {
  const Workflow = Parse.Object.extend('CMSWorkflow');

  Parse.Cloud.define('createWorkflow', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { name, description, organization, definition, status, version } = request.params;
  
  const workflow = new Workflow();
  workflow.set({
    name,
    description,
    organization: organization && new Parse.Object('Organization', { id: organization }),
    definition: definition || {},
    status: status || 'draft',
    version: version || '1.0.0',
    createdBy: request.user,
    updatedBy: request.user
  });

  await workflow.save(null, { useMasterKey: true });
  return workflow;
  });

  Parse.Cloud.define('updateWorkflow', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { workflowId, updates } = request.params;
  
  const workflow = await new Parse.Query(Workflow)
    .equalTo('objectId', workflowId)
    .first({ useMasterKey: true });

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  // Update workflow fields
  Object.keys(updates).forEach(key => {
    workflow.set(key, updates[key]);
  });
  workflow.set('updatedBy', request.user);

  await workflow.save(null, { useMasterKey: true });
  return workflow;
  });

  Parse.Cloud.define('deleteWorkflow', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { workflowId } = request.params;
  
  const workflow = await new Parse.Query(Workflow)
    .equalTo('objectId', workflowId)
    .first({ useMasterKey: true });

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  await workflow.destroy({ useMasterKey: true });
  return { success: true };
  });

  Parse.Cloud.define('executeWorkflow', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { workflowId, context } = request.params;
  
  const workflow = await new Parse.Query(Workflow)
    .equalTo('objectId', workflowId)
    .first({ useMasterKey: true });

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  const definition = workflow.get('definition');
  if (!definition || !definition.stages || !definition.transitions) {
    throw new Error('Invalid workflow definition');
  }

  // Create workflow instance
  const instance = new Parse.Object('CMSWorkflowInstance');
  instance.set({
    workflow,
    status: 'running',
    currentStage: definition.stages[0].id,
    context: context || {},
    history: [{
      stage: definition.stages[0].id,
      timestamp: new Date(),
      actor: request.user
    }],
    createdBy: request.user,
    updatedBy: request.user
  });

  await instance.save(null, { useMasterKey: true });
  return instance;
  });

  Parse.Cloud.define('transitionWorkflow', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { instanceId, toStage, data } = request.params;
  
  const instance = await new Parse.Query('CMSWorkflowInstance')
    .equalTo('objectId', instanceId)
    .include('workflow')
    .first({ useMasterKey: true });

  if (!instance) {
    throw new Error('Workflow instance not found');
  }

  const workflow = instance.get('workflow');
  const definition = workflow.get('definition');
  
  // Validate transition
  const currentStage = instance.get('currentStage');
  const transition = definition.transitions.find(
    t => t.from === currentStage && t.to === toStage
  );

  if (!transition) {
    throw new Error('Invalid workflow transition');
  }

  // Update instance
  const history = instance.get('history') || [];
  history.push({
    stage: toStage,
    timestamp: new Date(),
    actor: request.user,
    data
  });

  instance.set({
    currentStage: toStage,
    history,
    updatedBy: request.user
  });

  // Check if this is the end stage
  const stage = definition.stages.find(s => s.id === toStage);
  if (stage && stage.type === 'end') {
    instance.set('status', 'completed');
  }

  await instance.save(null, { useMasterKey: true });
  return instance;
  });

  Parse.Cloud.define('getWorkflowHistory', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { instanceId } = request.params;
    
    const instance = await new Parse.Query('CMSWorkflowInstance')
      .equalTo('objectId', instanceId)
      .include('workflow')
      .first({ useMasterKey: true });

    if (!instance) {
      throw new Error('Workflow instance not found');
    }

    return {
      workflow: instance.get('workflow'),
      currentStage: instance.get('currentStage'),
      status: instance.get('status'),
      history: instance.get('history') || []
    };
  });
};
