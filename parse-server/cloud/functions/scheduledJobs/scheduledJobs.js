// Cloud functions for Scheduled Jobs Management

const cron = require('node-cron');

// Register scheduled jobs for an app
const registerAppScheduledJobs = async (request) => {
  const { user } = request;
  const { appId, jobs } = request.params;
  
  if (!user || !user.get('isSystemAdmin')) {
    throw new Error('Insufficient permissions to register scheduled jobs');
  }
  
  try {
    const AppScheduledJob = Parse.Object.extend('AppScheduledJob');
    const registeredJobs = [];
    
    for (const job of jobs) {
      // Validate job configuration
      validateJobConfiguration(job);
      
      // Create Parse Cloud Job
      const jobName = `${appId}_${job.id}`;
      Parse.Cloud.job(jobName, async (request) => {
        return await executeAppJob(appId, job, request.params);
      });
      
      // Store job metadata
      const jobRecord = new AppScheduledJob();
      jobRecord.set('appId', appId);
      jobRecord.set('jobId', job.id);
      jobRecord.set('name', job.name);
      jobRecord.set('description', job.description || '');
      jobRecord.set('schedule', job.schedule);
      jobRecord.set('function', job.function);
      jobRecord.set('params', job.params || {});
      jobRecord.set('enabled', job.enabled);
      jobRecord.set('timezone', job.timezone || 'UTC');
      jobRecord.set('lastRun', null);
      jobRecord.set('nextRun', calculateNextRun(job.schedule, job.timezone));
      jobRecord.set('status', 'registered');
      
      await jobRecord.save(null, { useMasterKey: true });
      
      // Schedule the job if enabled
      if (job.enabled) {
        await scheduleJob(appId, job);
      }
      
      registeredJobs.push({
        id: job.id,
        name: job.name,
        status: 'registered',
        enabled: job.enabled
      });
    }
    
    // Log the registration
    await logJobAction(appId, 'jobs_registered', { 
      jobCount: jobs.length,
      registeredJobs: registeredJobs.map(j => j.id)
    });
    
    return {
      success: true,
      message: 'Scheduled jobs registered successfully',
      jobs: registeredJobs
    };
  } catch (error) {
    console.error('Error registering scheduled jobs:', error);
    throw error;
  }
};

// Get scheduled jobs for an app
const getAppScheduledJobs = async (request) => {
  const { user } = request;
  const { appId } = request.params;
  
  if (!user) {
    throw new Error('User must be authenticated');
  }
  
  try {
    const AppScheduledJob = Parse.Object.extend('AppScheduledJob');
    const query = new Parse.Query(AppScheduledJob);
    query.equalTo('appId', appId);
    query.ascending('name');
    
    const jobs = await query.find({ useMasterKey: true });
    
    const jobData = jobs.map(job => ({
      id: job.get('jobId'),
      name: job.get('name'),
      description: job.get('description'),
      schedule: job.get('schedule'),
      function: job.get('function'),
      params: job.get('params'),
      enabled: job.get('enabled'),
      timezone: job.get('timezone'),
      lastRun: job.get('lastRun'),
      nextRun: job.get('nextRun'),
      status: job.get('status'),
      createdAt: job.get('createdAt'),
      updatedAt: job.get('updatedAt')
    }));
    
    return {
      success: true,
      jobs: jobData
    };
  } catch (error) {
    console.error('Error getting scheduled jobs:', error);
    throw error;
  }
};

// Toggle job enabled/disabled status
const toggleAppJob = async (request) => {
  const { user } = request;
  const { appId, jobId, enabled } = request.params;
  
  if (!user || !user.get('isSystemAdmin')) {
    throw new Error('Insufficient permissions to toggle job status');
  }
  
  try {
    const AppScheduledJob = Parse.Object.extend('AppScheduledJob');
    const query = new Parse.Query(AppScheduledJob);
    query.equalTo('appId', appId);
    query.equalTo('jobId', jobId);
    
    const jobRecord = await query.first({ useMasterKey: true });
    if (!jobRecord) {
      throw new Error('Job not found');
    }
    
    jobRecord.set('enabled', enabled);
    jobRecord.set('status', enabled ? 'active' : 'disabled');
    
    if (enabled) {
      jobRecord.set('nextRun', calculateNextRun(jobRecord.get('schedule'), jobRecord.get('timezone')));
    } else {
      jobRecord.set('nextRun', null);
    }
    
    await jobRecord.save(null, { useMasterKey: true });
    
    // Update the actual scheduled job
    if (enabled) {
      await scheduleJob(appId, {
        id: jobId,
        schedule: jobRecord.get('schedule'),
        function: jobRecord.get('function'),
        params: jobRecord.get('params'),
        timezone: jobRecord.get('timezone')
      });
    } else {
      await unscheduleJob(appId, jobId);
    }
    
    await logJobAction(appId, enabled ? 'job_enabled' : 'job_disabled', { jobId });
    
    return {
      success: true,
      message: `Job ${enabled ? 'enabled' : 'disabled'} successfully`
    };
  } catch (error) {
    console.error('Error toggling job status:', error);
    throw error;
  }
};

// Run job immediately
const runAppJobNow = async (request) => {
  const { user } = request;
  const { appId, jobId } = request.params;
  
  if (!user || !user.get('isSystemAdmin')) {
    throw new Error('Insufficient permissions to run job');
  }
  
  try {
    const AppScheduledJob = Parse.Object.extend('AppScheduledJob');
    const query = new Parse.Query(AppScheduledJob);
    query.equalTo('appId', appId);
    query.equalTo('jobId', jobId);
    
    const jobRecord = await query.first({ useMasterKey: true });
    if (!jobRecord) {
      throw new Error('Job not found');
    }
    
    const job = {
      id: jobRecord.get('jobId'),
      name: jobRecord.get('name'),
      function: jobRecord.get('function'),
      params: jobRecord.get('params')
    };
    
    // Execute the job
    const result = await executeAppJob(appId, job, { manual: true });
    
    // Update last run time
    jobRecord.set('lastRun', new Date());
    await jobRecord.save(null, { useMasterKey: true });
    
    await logJobAction(appId, 'job_run_manual', { jobId, result });
    
    return {
      success: true,
      message: 'Job executed successfully',
      result: result
    };
  } catch (error) {
    console.error('Error running job:', error);
    throw error;
  }
};

// Get job execution logs
const getJobExecutionLogs = async (request) => {
  const { user } = request;
  const { appId, jobId, limit = 50 } = request.params;
  
  if (!user) {
    throw new Error('User must be authenticated');
  }
  
  try {
    const JobExecutionLog = Parse.Object.extend('JobExecutionLog');
    const query = new Parse.Query(JobExecutionLog);
    query.equalTo('appId', appId);
    
    if (jobId) {
      query.equalTo('jobId', jobId);
    }
    
    query.descending('createdAt');
    query.limit(limit);
    
    const logs = await query.find({ useMasterKey: true });
    
    const logData = logs.map(log => ({
      id: log.id,
      jobId: log.get('jobId'),
      status: log.get('status'),
      result: log.get('result'),
      error: log.get('error'),
      duration: log.get('duration'),
      executedAt: log.get('createdAt')
    }));
    
    return {
      success: true,
      logs: logData
    };
  } catch (error) {
    console.error('Error getting job logs:', error);
    throw error;
  }
};

// Helper Functions

async function executeAppJob(appId, job, params) {
  const startTime = Date.now();
  
  try {
    // Get app context
    const appContext = await getAppContext(appId);
    
    if (!appContext) {
      throw new Error(`App context not found for app: ${appId}`);
    }
    
    // Execute job function in app sandbox
    const result = await appContext.executeFunction(job.function, {
      ...job.params,
      ...params,
      jobId: job.id,
      scheduledAt: new Date(),
      appId: appId
    });
    
    const duration = Date.now() - startTime;
    
    // Log successful execution
    await logJobExecution(appId, job.id, 'success', result, null, duration);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log failed execution
    await logJobExecution(appId, job.id, 'error', null, error.message, duration);
    
    throw error;
  }
}

async function getAppContext(appId) {
  // TODO: Integrate with the app sandbox system
  throw new Error('App sandbox system not yet implemented. Please implement actual app context and function execution.');
}

async function scheduleJob(appId, job) {
  // This would integrate with a job scheduler like node-cron or a more robust solution
  const jobName = `${appId}_${job.id}`;
  
  if (cron.validate(job.schedule)) {
    // Schedule the job
    const task = cron.schedule(job.schedule, async () => {
      try {
        await executeAppJob(appId, job, { scheduled: true });
      } catch (error) {
        console.error(`Scheduled job ${jobName} failed:`, error);
      }
    }, {
      scheduled: false,
      timezone: job.timezone || 'UTC'
    });
    
    // Store the task reference for later management
    global.scheduledTasks = global.scheduledTasks || new Map();
    global.scheduledTasks.set(jobName, task);
    
    task.start();
    
    console.log(`Scheduled job ${jobName} with schedule ${job.schedule}`);
  } else {
    throw new Error(`Invalid cron expression: ${job.schedule}`);
  }
}

async function unscheduleJob(appId, jobId) {
  const jobName = `${appId}_${jobId}`;
  
  if (global.scheduledTasks && global.scheduledTasks.has(jobName)) {
    const task = global.scheduledTasks.get(jobName);
    task.stop();
    global.scheduledTasks.delete(jobName);
    
    console.log(`Unscheduled job ${jobName}`);
  }
}

function validateJobConfiguration(job) {
  if (!job.id || !job.name || !job.schedule || !job.function) {
    throw new Error('Job must have id, name, schedule, and function');
  }
  
  // Validate cron expression
  if (!cron.validate(job.schedule)) {
    throw new Error(`Invalid cron expression: ${job.schedule}`);
  }
  
  // Validate job ID format
  if (!/^[a-zA-Z0-9_-]+$/.test(job.id)) {
    throw new Error('Job ID must contain only alphanumeric characters, hyphens, and underscores');
  }
  
  // Validate function name
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(job.function)) {
    throw new Error('Function name must be a valid identifier');
  }
}

function calculateNextRun(schedule, timezone = 'UTC') {
  try {
    // This is a simplified calculation
    // In a real implementation, you'd use a proper cron parser
    const now = new Date();
    const nextRun = new Date(now.getTime() + 60000); // Add 1 minute as placeholder
    return nextRun;
  } catch (error) {
    console.error('Error calculating next run:', error);
    return null;
  }
}

async function logJobExecution(appId, jobId, status, result, error, duration) {
  try {
    const JobExecutionLog = Parse.Object.extend('JobExecutionLog');
    const log = new JobExecutionLog();
    
    log.set('appId', appId);
    log.set('jobId', jobId);
    log.set('status', status);
    log.set('duration', duration);
    
    if (result) {
      log.set('result', result);
    }
    
    if (error) {
      log.set('error', error);
    }
    
    await log.save(null, { useMasterKey: true });
  } catch (logError) {
    console.error('Error logging job execution:', logError);
  }
}

async function logJobAction(appId, action, details) {
  try {
    const AuditLog = Parse.Object.extend('AuditLog');
    const log = new AuditLog();
    
    log.set('action', action);
    log.set('targetType', 'ScheduledJob');
    log.set('targetId', appId);
    log.set('details', details);
    
    await log.save(null, { useMasterKey: true });
  } catch (logError) {
    console.error('Error logging job action:', logError);
  }
}

module.exports = {
  registerAppScheduledJobs,
  getAppScheduledJobs,
  toggleAppJob,
  runAppJobNow,
  getJobExecutionLogs,
  executeAppJob,
  scheduleJob,
  unscheduleJob,
  validateJobConfiguration
};