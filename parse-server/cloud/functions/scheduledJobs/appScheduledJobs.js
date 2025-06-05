// App Scheduled Jobs Management
const cron = require('node-cron');
const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware'); // Import middleware

// In-memory job scheduler (in production, use a proper job queue like Bull or Agenda)
const activeJobs = new Map();

// Create or update a scheduled job
Parse.Cloud.define('createAppScheduledJob', withOrganizationContext(async (request) => {
  // `user`, `organizationId`, and `organization` are now provided by the middleware
  const { user, organizationId, organization } = request;
  const {
    appInstallationId,
    jobId,
    name,
    description,
    schedule,
    functionName,
    params = {},
    timezone = 'UTC',
    enabled = true,
    maxRetries = 3,
    timeout = 300
  } = request.params;

  // The middleware handles user authentication and basic organization access.
  // We still need to verify app-specific permissions and required parameters.

  if (!appInstallationId || !jobId || !name || !schedule || !functionName) {
    throw new Error('App installation ID, job ID, name, schedule, and function name are required');
  }

  try {
    // Get the app installation and verify it belongs to the current organization
    const OrgAppInstallation = Parse.Object.extend('OrgAppInstallation');
    const installationQuery = new Parse.Query(OrgAppInstallation);
    const installation = await installationQuery.get(appInstallationId, { useMasterKey: true });

    if (!installation) {
      throw new Error('App installation not found');
    }

    if (installation.get('organization').id !== organizationId) {
      throw new Error('Unauthorized: App installation does not belong to this organization.');
    }

    // The middleware ensures the user has access to this organization.
    // Additional role specific check for admins can be added if needed,
    // but general "organization access" is covered.
    // No need for separate OrgRole query here if middleware ensures admin/member context

    // Validate cron expression
    if (!cron.validate(schedule)) {
      throw new Error('Invalid cron schedule expression');
    }

    // Check if job already exists
    const AppScheduledJob = Parse.Object.extend('AppScheduledJob');
    const existingQuery = new Parse.Query(AppScheduledJob);
    existingQuery.equalTo('appInstallation', installation);
    existingQuery.equalTo('jobId', jobId);
    let scheduledJob = await existingQuery.first({ useMasterKey: true });

    if (scheduledJob) {
      // Update existing job
      scheduledJob.set('name', name);
      scheduledJob.set('description', description);
      scheduledJob.set('schedule', schedule);
      scheduledJob.set('functionName', functionName);
      scheduledJob.set('params', params);
      scheduledJob.set('timezone', timezone);
      scheduledJob.set('enabled', enabled);
      scheduledJob.set('maxRetries', maxRetries);
      scheduledJob.set('timeout', timeout);
      scheduledJob.set('updatedBy', user);
    } else {
      // Create new job
      scheduledJob = new AppScheduledJob();
      scheduledJob.set('appInstallation', installation);
      scheduledJob.set('organization', organization);
      scheduledJob.set('jobId', jobId);
      scheduledJob.set('name', name);
      scheduledJob.set('description', description);
      scheduledJob.set('schedule', schedule);
      scheduledJob.set('functionName', functionName);
      scheduledJob.set('params', params);
      scheduledJob.set('timezone', timezone);
      scheduledJob.set('enabled', enabled);
      scheduledJob.set('maxRetries', maxRetries);
      scheduledJob.set('timeout', timeout);
      scheduledJob.set('status', 'active');
      scheduledJob.set('errorCount', 0);
      scheduledJob.set('createdBy', user);

      // Set ACL
      const jobACL = new Parse.ACL();
      jobACL.setPublicReadAccess(false);
      jobACL.setRoleReadAccess(`org_${organizationId}_member`, true);
      jobACL.setRoleWriteAccess(`org_${organizationId}_admin`, true);
      jobACL.setRoleReadAccess('SystemAdmin', true);
      jobACL.setRoleWriteAccess('SystemAdmin', true);
      scheduledJob.setACL(jobACL);
    }

    // Calculate next run time
    const nextRun = getNextRunTime(schedule, timezone);
    scheduledJob.set('nextRun', nextRun);

    await scheduledJob.save(null, { useMasterKey: true });

    // Schedule the job in the cron system
    if (enabled) {
      await scheduleJob(scheduledJob);
    }

    return {
      success: true,
      jobId: scheduledJob.id,
      message: `Scheduled job ${scheduledJob.get('name')} ${scheduledJob.existed() ? 'updated' : 'created'} successfully`,
      nextRun: nextRun
    };

  } catch (error) {
    console.error('Create scheduled job error:', error);
    throw error;
  }
}));

// Get scheduled jobs for an app installation
Parse.Cloud.define('getAppScheduledJobs', withOrganizationContext(async (request) => {
  const { user, organizationId, organization } = request; // organizationId and organization are now from middleware
  const { appInstallationId } = request.params; // organizationId parameter is redundant

  // User authentication handled by middleware

  try {
    const AppScheduledJob = Parse.Object.extend('AppScheduledJob');
    const query = new Parse.Query(AppScheduledJob);

    if (appInstallationId) {
      const OrgAppInstallation = Parse.Object.extend('OrgAppInstallation');
      const installation = await OrgAppInstallation.createWithoutData(appInstallationId);
      query.equalTo('appInstallation', installation);
      // Ensure installation belongs to this organization
      const fetchedInstallation = await installation.fetch({ useMasterKey: true });
      if (fetchedInstallation.get('organization').id !== organizationId) {
        throw new Error('Unauthorized: App installation does not belong to this organization.');
      }
    } else {
      // If no appInstallationId, default to organization context
      query.equalTo('organization', organization);
    }

    query.include('appInstallation');
    query.include('createdBy');
    query.include('updatedBy');
    query.descending('createdAt');

    const jobs = await query.find({ useMasterKey: true });

    const results = jobs.map(job => ({
      id: job.id,
      jobId: job.get('jobId'),
      name: job.get('name'),
      description: job.get('description'),
      schedule: job.get('schedule'),
      timezone: job.get('timezone'),
      functionName: job.get('functionName'),
      params: job.get('params'),
      enabled: job.get('enabled'),
      status: job.get('status'),
      lastRun: job.get('lastRun'),
      nextRun: job.get('nextRun'),
      errorCount: job.get('errorCount'),
      lastError: job.get('lastError'),
      maxRetries: job.get('maxRetries'),
      timeout: job.get('timeout'),
      createdAt: job.get('createdAt'),
      updatedAt: job.get('updatedAt'),
      createdBy: job.get('createdBy') ? {
        id: job.get('createdBy').id,
        email: job.get('createdBy').get('email')
      } : null
    }));

    return {
      success: true,
      jobs: results
    };

  } catch (error) {
    console.error('Get scheduled jobs error:', error);
    throw error;
  }
}));

// Enable/disable a scheduled job
Parse.Cloud.define('toggleAppScheduledJob', async (request) => {
  const { user } = request;
  const { jobObjectId, enabled } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!jobObjectId || enabled === undefined) {
    throw new Error('Job object ID and enabled status are required');
  }

  try {
    const AppScheduledJob = Parse.Object.extend('AppScheduledJob');
    const query = new Parse.Query(AppScheduledJob);
    query.include('organization');
    const job = await query.get(jobObjectId, { useMasterKey: true });

    if (!job) {
      throw new Error('Scheduled job not found');
    }

    // Verify user has admin access
    const organization = job.get('organization');
    const OrgRole = Parse.Object.extend('OrgRole');
    const roleQuery = new Parse.Query(OrgRole);
    roleQuery.equalTo('user', user);
    roleQuery.equalTo('organization', organization);
    roleQuery.equalTo('role', 'admin');
    roleQuery.equalTo('isActive', true);
    const isOrgAdmin = await roleQuery.first({ useMasterKey: true });

    if (!isOrgAdmin && !user.get('isSystemAdmin')) {
      throw new Error('Only organization administrators can manage scheduled jobs');
    }

    // Update job status
    job.set('enabled', enabled);
    job.set('updatedBy', user);
    
    if (enabled) {
      job.set('status', 'active');
      const nextRun = getNextRunTime(job.get('schedule'), job.get('timezone'));
      job.set('nextRun', nextRun);
    } else {
      job.set('status', 'paused');
    }

    await job.save(null, { useMasterKey: true });

    // Update cron scheduler
    if (enabled) {
      await scheduleJob(job);
    } else {
      await unscheduleJob(job.id);
    }

    return {
      success: true,
      message: `Job ${enabled ? 'enabled' : 'disabled'} successfully`
    };

  } catch (error) {
    console.error('Toggle scheduled job error:', error);
    throw error;
  }
});

// Delete a scheduled job
Parse.Cloud.define('deleteAppScheduledJob', async (request) => {
  const { user } = request;
  const { jobObjectId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!jobObjectId) {
    throw new Error('Job object ID is required');
  }

  try {
    const AppScheduledJob = Parse.Object.extend('AppScheduledJob');
    const query = new Parse.Query(AppScheduledJob);
    query.include('organization');
    const job = await query.get(jobObjectId, { useMasterKey: true });

    if (!job) {
      throw new Error('Scheduled job not found');
    }

    // Verify user has admin access
    const organization = job.get('organization');
    const OrgRole = Parse.Object.extend('OrgRole');
    const roleQuery = new Parse.Query(OrgRole);
    roleQuery.equalTo('user', user);
    roleQuery.equalTo('organization', organization);
    roleQuery.equalTo('role', 'admin');
    roleQuery.equalTo('isActive', true);
    const isOrgAdmin = await roleQuery.first({ useMasterKey: true });

    if (!isOrgAdmin && !user.get('isSystemAdmin')) {
      throw new Error('Only organization administrators can delete scheduled jobs');
    }

    const jobName = job.get('name');

    // Remove from cron scheduler
    await unscheduleJob(job.id);

    // Delete the job
    await job.destroy({ useMasterKey: true });

    return {
      success: true,
      message: `Scheduled job "${jobName}" deleted successfully`
    };

  } catch (error) {
    console.error('Delete scheduled job error:', error);
    throw error;
  }
});

// Execute a scheduled job manually
Parse.Cloud.define('executeAppScheduledJob', async (request) => {
  const { user } = request;
  const { jobObjectId } = request.params;

  if (!user) {
    throw new Error('User must be authenticated');
  }

  if (!jobObjectId) {
    throw new Error('Job object ID is required');
  }

  try {
    const AppScheduledJob = Parse.Object.extend('AppScheduledJob');
    const query = new Parse.Query(AppScheduledJob);
    query.include('organization');
    query.include('appInstallation');
    const job = await query.get(jobObjectId, { useMasterKey: true });

    if (!job) {
      throw new Error('Scheduled job not found');
    }

    // Verify user has admin access
    const organization = job.get('organization');
    const OrgRole = Parse.Object.extend('OrgRole');
    const roleQuery = new Parse.Query(OrgRole);
    roleQuery.equalTo('user', user);
    roleQuery.equalTo('organization', organization);
    roleQuery.equalTo('role', 'admin');
    roleQuery.equalTo('isActive', true);
    const isOrgAdmin = await roleQuery.first({ useMasterKey: true });

    if (!isOrgAdmin && !user.get('isSystemAdmin')) {
      throw new Error('Only organization administrators can execute scheduled jobs');
    }

    // Execute the job
    const result = await executeScheduledJob(job, 'manual', user.id);

    return {
      success: true,
      message: 'Job executed successfully',
      result: result
    };

  } catch (error) {
    console.error('Execute scheduled job error:', error);
    throw error;
  }
});

// Helper function to calculate next run time
function getNextRunTime(schedule, timezone = 'UTC') {
  try {
    // This is a simplified implementation
    // In production, use a proper cron library like node-cron or cron-parser
    const now = new Date();
    const nextRun = new Date(now.getTime() + 60000); // Default to 1 minute from now
    return nextRun;
  } catch (error) {
    console.error('Error calculating next run time:', error);
    return new Date(Date.now() + 3600000); // Default to 1 hour from now
  }
}

// Helper function to schedule a job in the cron system
async function scheduleJob(job) {
  try {
    const jobId = job.id;
    const schedule = job.get('schedule');
    
    // Remove existing job if it exists
    if (activeJobs.has(jobId)) {
      activeJobs.get(jobId).destroy();
    }
    
    // Create new cron job
    const cronJob = cron.schedule(schedule, async () => {
      await executeScheduledJob(job, 'scheduled');
    }, {
      scheduled: false,
      timezone: job.get('timezone') || 'UTC'
    });
    
    // Start the job
    cronJob.start();
    activeJobs.set(jobId, cronJob);
    
    console.log(`Scheduled job ${job.get('name')} (${jobId}) with schedule: ${schedule}`);
  } catch (error) {
    console.error('Error scheduling job:', error);
  }
}

// Helper function to unschedule a job
async function unscheduleJob(jobId) {
  try {
    if (activeJobs.has(jobId)) {
      activeJobs.get(jobId).destroy();
      activeJobs.delete(jobId);
      console.log(`Unscheduled job: ${jobId}`);
    }
  } catch (error) {
    console.error('Error unscheduling job:', error);
  }
}

// Helper function to execute a scheduled job
async function executeScheduledJob(job, triggeredBy = 'scheduled', userId = null) {
  const startTime = new Date();
  let result = null;
  let status = 'success';
  let errorMessage = null;

  try {
    const functionName = job.get('functionName');
    const params = job.get('params') || {};
    const timeout = job.get('timeout') || 300;

    // Add execution context to params
    const executionParams = {
      ...params,
      _appFramework: {
        appInstallationId: job.get('appInstallation').id,
        organizationId: job.get('organization').id,
        jobId: job.get('jobId'),
        triggeredBy: triggeredBy,
        userId: userId
      }
    };

    // Execute the cloud function with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Job execution timeout')), timeout * 1000);
    });

    const executionPromise = Parse.Cloud.run(functionName, executionParams, { useMasterKey: true });
    
    result = await Promise.race([executionPromise, timeoutPromise]);

    // Update job with successful execution
    job.set('lastRun', startTime);
    job.set('lastResult', result);
    job.set('errorCount', 0);
    job.set('lastError', null);
    job.set('status', 'active');
    
    // Calculate next run
    const nextRun = getNextRunTime(job.get('schedule'), job.get('timezone'));
    job.set('nextRun', nextRun);

  } catch (error) {
    console.error(`Scheduled job execution error (${job.get('name')}):`, error);
    
    status = 'error';
    errorMessage = error.message;
    
    // Update job with error
    const errorCount = (job.get('errorCount') || 0) + 1;
    job.set('errorCount', errorCount);
    job.set('lastError', errorMessage);
    
    // Disable job if too many errors
    const maxRetries = job.get('maxRetries') || 3;
    if (errorCount >= maxRetries) {
      job.set('status', 'error');
      job.set('enabled', false);
      await unscheduleJob(job.id);
    }
  }

  // Save job updates
  await job.save(null, { useMasterKey: true });

  // Log execution
  await logJobExecution(job, startTime, new Date(), status, result, errorMessage, triggeredBy, userId);

  return result;
}

// Helper function to log job execution
async function logJobExecution(job, startTime, endTime, status, result, errorMessage, triggeredBy, userId) {
  try {
    const AppExecutionLog = Parse.Object.extend('AppExecutionLog');
    const log = new AppExecutionLog();
    
    log.set('appInstallation', job.get('appInstallation'));
    log.set('organization', job.get('organization'));
    log.set('executionType', 'job');
    log.set('executionId', job.get('jobId'));
    log.set('functionName', job.get('functionName'));
    log.set('triggeredBy', triggeredBy);
    log.set('input', job.get('params'));
    log.set('output', result);
    log.set('status', status);
    log.set('startTime', startTime);
    log.set('endTime', endTime);
    log.set('duration', endTime.getTime() - startTime.getTime());
    
    if (errorMessage) {
      log.set('errorMessage', errorMessage);
    }
    
    await log.save(null, { useMasterKey: true });
  } catch (error) {
    console.error('Error logging job execution:', error);
  }
}

// Initialize scheduled jobs on server startup
Parse.Cloud.define('initializeScheduledJobs', async (request) => {
  const { user } = request;
  
  if (!user || !user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can initialize scheduled jobs');
  }

  try {
    const AppScheduledJob = Parse.Object.extend('AppScheduledJob');
    const query = new Parse.Query(AppScheduledJob);
    query.equalTo('enabled', true);
    query.equalTo('status', 'active');
    
    const jobs = await query.find({ useMasterKey: true });
    
    for (const job of jobs) {
      await scheduleJob(job);
    }
    
    return {
      success: true,
      message: `Initialized ${jobs.length} scheduled jobs`,
      jobCount: jobs.length
    };
    
  } catch (error) {
    console.error('Initialize scheduled jobs error:', error);
    throw error;
  }
});

module.exports = {};