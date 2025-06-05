/**
 * Database Function Loader
 * Loads cloud functions and triggers from the database
 */

class DBFunctionLoader {
  constructor(parseServer) {
    this.Parse = parseServer;
  }

  /**
   * Load all functions and triggers from database
   */
  async loadAll() {
    await Promise.all([this.loadCloudFunctions(), this.loadTriggers()]);
  }

  /**
   * Load cloud functions from database
   */
  async loadCloudFunctions() {
    const query = new this.Parse.Query('CMSCloudFunction');
    query.equalTo('status', 'active');

    const functions = await query.find({ useMasterKey: true });

    for (const func of functions) {
      const name = func.get('name');
      const code = func.get('code');
      const config = func.get('config');

      try {
        // Create function wrapper with proper context and configuration
        const wrapper = async request => {
          const startTime = Date.now();
          const context = {
            params: request.params,
            user: request.user,
            master: request.master,
            application: func.get('application'),
            function: func,
          };

          try {
            // Check permissions
            if (config.requireMaster && !request.master) {
              throw new this.Parse.Error(
                this.Parse.Error.OPERATION_FORBIDDEN,
                'Master key is required'
              );
            }

            if (config.requireUser && !request.user) {
              throw new this.Parse.Error(
                this.Parse.Error.OPERATION_FORBIDDEN,
                'User authentication is required'
              );
            }

            // Execute function
            const execFunc = new Function('Parse', 'context', code);
            const result = await execFunc(this.Parse, context);

            // Update statistics
            await this.updateFunctionStats(func, {
              success: true,
              latency: Date.now() - startTime,
            });

            return result;
          } catch (error) {
            // Update statistics
            await this.updateFunctionStats(func, {
              success: false,
              latency: Date.now() - startTime,
            });

            // Log error
            await this.logFunctionError(func, error, request);

            throw error;
          }
        };

        // Register cloud function
        this.Parse.Cloud.define(name, wrapper);
        console.log(`Loaded cloud function: ${name}`);
      } catch (error) {
        console.error(`Error loading cloud function ${name}:`, error);

        // Update function status to error
        func.set('status', 'error');
        await func.save(null, { useMasterKey: true });
      }
    }
  }

  /**
   * Load triggers from database
   */
  async loadTriggers() {
    const query = new this.Parse.Query('CMSTrigger');
    query.equalTo('status', 'active');

    const triggers = await query.find({ useMasterKey: true });

    for (const trigger of triggers) {
      const name = trigger.get('name');
      const type = trigger.get('type');
      const config = trigger.get('config')[type];
      const actions = trigger.get('actions');

      try {
        switch (type) {
          case 'event':
            this.registerEventTrigger(trigger, config, actions);
            break;

          case 'schedule':
            this.registerScheduleTrigger(trigger, config, actions);
            break;

          case 'webhook':
            this.registerWebhookTrigger(trigger, config, actions);
            break;

          case 'condition':
            this.registerConditionTrigger(trigger, config, actions);
            break;
        }

        console.log(`Loaded trigger: ${name} (${type})`);
      } catch (error) {
        console.error(`Error loading trigger ${name}:`, error);

        // Update trigger status to error
        trigger.set('status', 'error');
        await trigger.save(null, { useMasterKey: true });
      }
    }
  }

  /**
   * Register event trigger
   */
  registerEventTrigger(trigger, config, actions) {
    const { event, class: className } = config;

    const handler = async request => {
      try {
        await trigger.execute(request);
      } catch (error) {
        console.error(`Error executing trigger ${trigger.get('name')}:`, error);
      }
    };

    switch (event) {
      case 'beforeSave':
        this.Parse.Cloud.beforeSave(className, handler);
        break;
      case 'afterSave':
        this.Parse.Cloud.afterSave(className, handler);
        break;
      case 'beforeDelete':
        this.Parse.Cloud.beforeDelete(className, handler);
        break;
      case 'afterDelete':
        this.Parse.Cloud.afterDelete(className, handler);
        break;
    }
  }

  /**
   * Register schedule trigger
   */
  registerScheduleTrigger(trigger, config, actions) {
    const { expression, timezone } = config;

    // Register job
    this.Parse.Cloud.job(trigger.get('name'), async request => {
      try {
        await trigger.execute(request);
      } catch (error) {
        console.error(`Error executing trigger ${trigger.get('name')}:`, error);
      }
    });

    // Schedule job using expression
    this.Parse.Cloud.schedule(trigger.get('name'), expression, {
      timezone,
    });
  }

  /**
   * Register webhook trigger
   */
  registerWebhookTrigger(trigger, config, actions) {
    const { method, path } = config;

    this.Parse.Cloud.define(trigger.get('name'), async request => {
      try {
        return await trigger.execute(request);
      } catch (error) {
        console.error(`Error executing trigger ${trigger.get('name')}:`, error);
        throw error;
      }
    });
  }

  /**
   * Register condition trigger
   */
  registerConditionTrigger(trigger, config, actions) {
    const { interval } = config;

    // Register job
    this.Parse.Cloud.job(trigger.get('name'), async request => {
      try {
        await trigger.execute(request);
      } catch (error) {
        console.error(`Error executing trigger ${trigger.get('name')}:`, error);
      }
    });

    // Schedule periodic check
    this.Parse.Cloud.schedule(trigger.get('name'), `*/${interval} * * * * *`);
  }

  /**
   * Update function statistics
   */
  async updateFunctionStats(func, { success, latency }) {
    const stats = func.get('stats');

    stats.totalExecutions++;
    if (success) {
      stats.successfulExecutions++;
    } else {
      stats.failedExecutions++;
    }

    stats.lastExecution = new Date();
    stats.averageLatency =
      (stats.averageLatency * (stats.totalExecutions - 1) + latency) / stats.totalExecutions;

    func.set('stats', stats);
    func.set('lastExecuted', new Date());

    await func.save(null, { useMasterKey: true });
  }

  /**
   * Log function error
   */
  async logFunctionError(func, error, request) {
    const log = new this.Parse.Object('CMSCloudFunctionLog');
    log.set('function', func);
    log.set('error', error.message);
    log.set('stack', error.stack);
    log.set('params', request.params);
    log.set('user', request.user);
    await log.save(null, { useMasterKey: true });
  }
}

module.exports = DBFunctionLoader;
