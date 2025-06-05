/* eslint-disable require-await */
const configService = require('./configService');

module.exports = Parse => {
  class MonitoringService {
    constructor() {
      this.alertCache = new Map();
      this.startMonitoring();
    }

    startMonitoring() {
      this.interval = setInterval(() => this.checkMetrics(), 60000); // Check every minute
    }

    stopMonitoring() {
      clearInterval(this.interval);
    }

    async checkMetrics() {
      try {
        const organizations = await this.getActiveOrganizations();

        for (const org of organizations) {
          const config = await configService(Parse).getOrganizationConfig(org.id);

          if (!config.monitoring.enabled) continue;

          await Promise.all([
            this.checkUsage(org, config),
            this.checkErrors(org, config),
            this.checkLatency(org, config),
            this.checkCosts(org, config),
          ]);
        }
      } catch (error) {
        console.error('Monitoring Error:', error);
      }
    }

    async getActiveOrganizations() {
      const query = new Parse.Query('Organization');

      return query.find({ useMasterKey: true });
    }

    async checkUsage(org, config) {
      const Usage = Parse.Object.extend('AIUsage');
      const query = new Parse.Query(Usage);

      query.equalTo('organization', org);
      query.greaterThanOrEqual('date', new Date(Date.now() - 3600000)); // Last hour

      const usage = await query.find({ useMasterKey: true });
      const totalTokens = usage.reduce((sum, u) => sum + (u.get('tokens') || 0), 0);

      if (totalTokens > config.organization.defaultTokenLimit * 0.9) {
        await this.createAlert(org, 'usage', {
          message: `Token usage approaching limit: ${totalTokens} tokens`,
          level: 'warning',
        });
      }
    }

    async checkErrors(org, config) {
      const Usage = Parse.Object.extend('AIUsage');
      const query = new Parse.Query(Usage);

      query.equalTo('organization', org);
      query.equalTo('success', false);
      query.greaterThanOrEqual('date', new Date(Date.now() - 3600000));

      const errors = await query.find({ useMasterKey: true });
      const errorRate = errors.length / (await query.count({ useMasterKey: true }));

      if (errorRate > config.monitoring.errorThreshold) {
        await this.createAlert(org, 'error', {
          message: `High error rate detected: ${(errorRate * 100).toFixed(2)}%`,
          level: 'error',
        });
      }
    }

    async checkLatency(org, config) {
      const Usage = Parse.Object.extend('AIUsage');
      const query = new Parse.Query(Usage);

      query.equalTo('organization', org);
      query.greaterThanOrEqual('date', new Date(Date.now() - 3600000));
      query.descending('latency');

      const slowRequests = await query.find({ useMasterKey: true });
      const highLatencyCount = slowRequests.filter(
        u => u.get('latency') > config.monitoring.latencyThreshold
      ).length;

      if (highLatencyCount > 5) {
        await this.createAlert(org, 'latency', {
          message: `High latency detected in ${highLatencyCount} requests`,
          level: 'warning',
        });
      }
    }

    async checkCosts(org, config) {
      const Usage = Parse.Object.extend('AIUsage');
      const query = new Parse.Query(Usage);

      query.equalTo('organization', org);
      query.greaterThanOrEqual('date', new Date(Date.now() - 86400000)); // Last 24 hours

      const usage = await query.find({ useMasterKey: true });
      const totalCost = usage.reduce((sum, u) => sum + (u.get('cost') || 0), 0);

      if (totalCost > config.cost.alertThreshold) {
        await this.createAlert(org, 'cost', {
          message: `Daily cost threshold exceeded: $${totalCost.toFixed(2)}`,
          level: 'warning',
        });
      }
    }

    async createAlert(org, type, { message, level }) {
      const cacheKey = `${org.id}:${type}`;
      const lastAlert = this.alertCache.get(cacheKey);

      // Prevent alert spam - only alert once per hour
      if (lastAlert && Date.now() - lastAlert < 3600000) {
        return;
      }

      const Alert = Parse.Object.extend('AIAlert');
      const alert = new Alert();

      alert.set('organization', org);
      alert.set('type', type);
      alert.set('message', message);
      alert.set('level', level);
      alert.set('status', 'new');

      await alert.save(null, { useMasterKey: true });
      this.alertCache.set(cacheKey, Date.now());

      // Send notification if enabled
      const config = await configService(Parse).getOrganizationConfig(org.id);

      if (config.monitoring.notifications) {
        await this.sendNotification(org, alert);
      }
    }

    async sendNotification(org, alert) {
      // Get organization admins
      const adminRole = await new Parse.Query(Parse.Role)
        .equalTo('name', `org_${org.id}_admin`)
        .first({ useMasterKey: true });

      if (!adminRole) return;

      const adminUsers = await adminRole.getUsers().query().find({ useMasterKey: true });

      // Create notifications for each admin
      const Notification = Parse.Object.extend('Notification');
      const notifications = adminUsers.map(user => {
        const notification = new Notification();

        notification.set('user', user);
        notification.set('type', 'ai_alert');
        notification.set('message', alert.get('message'));
        notification.set('level', alert.get('level'));
        notification.set('status', 'unread');
        notification.set('alert', alert);

        return notification.save(null, { useMasterKey: true });
      });

      await Promise.all(notifications);
    }
  }

  return new MonitoringService();
};
