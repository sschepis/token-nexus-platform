const winston = require('winston');
const { createLogger, format, transports } = winston;
const DailyRotateFile = require('winston-daily-rotate-file');
const Parse = require('parse/node');
const AWS = require('aws-sdk');

class AuditLogService {
  constructor() {
    this.logger = createLogger({
      format: format.combine(format.timestamp(), format.json()),
      transports: [
        // Console transport for development
        new transports.Console({
          level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
        }),
        // File transport with daily rotation
        new DailyRotateFile({
          filename: 'logs/audit-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info',
        }),
        // Separate file for security events
        new DailyRotateFile({
          filename: 'logs/security-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          level: 'warn',
        }),
      ],
    });

    // Initialize AWS services
    this.cloudwatch = new AWS.CloudWatch();
    this.sns = new AWS.SNS();
  }

  // Log user authentication events
  async logAuth(event) {
    const { action, userId, ip, userAgent, success, reason } = event;

    await this.log('auth', {
      action,
      userId,
      ip,
      userAgent,
      success,
      reason,
    });
  }

  // Log data access events
  async logDataAccess(event) {
    const { action, userId, resource, resourceId, changes } = event;

    await this.log('data', {
      action,
      userId,
      resource,
      resourceId,
      changes,
    });
  }

  // Log security events
  async logSecurity(event) {
    const { action, userId, ip, severity, details } = event;

    await this.log(
      'security',
      {
        action,
        userId,
        ip,
        severity,
        details,
      },
      'warn'
    );
  }

  // Log admin actions
  async logAdmin(event) {
    const { action, adminId, targetId, changes, reason } = event;

    await this.log('admin', {
      action,
      adminId,
      targetId,
      changes,
      reason,
    });
  }

  // Log system events
  async logSystem(event) {
    const { action, component, details, success } = event;

    await this.log('system', {
      action,
      component,
      details,
      success,
    });
  }

  // Base logging function
  async log(category, data, level = 'info') {
    try {
      const logEntry = {
        category,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        ...data,
      };

      // Log to Winston
      this.logger.log(level, logEntry);

      // Store in database for querying
      await this.storeLogEntry(logEntry);

      // Forward security events to monitoring service
      if (category === 'security' || level === 'warn' || level === 'error') {
        await this.forwardToMonitoring(logEntry);
      }
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Ensure logging errors don't break the application
      this.logger.error('Audit logging error', { error: error.message });
    }
  }

  // Store log entry in database
  async storeLogEntry(entry) {
    try {
      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();

      await log.save({
        ...entry,
        retention: this.getRetentionPeriod(entry.category),
      });
    } catch (error) {
      console.error('Error storing audit log:', error);
      throw error;
    }
  }

  // Forward security events to monitoring service
  async forwardToMonitoring(entry) {
    try {
      // Convert log entry to CloudWatch metric
      const metric = this.convertToMetric(entry);

      // Send to CloudWatch
      await this.sendToCloudWatch(metric);

      // Send critical security events to SNS
      if (entry.severity === 'high' || entry.severity === 'critical') {
        await this.sendToSNS(entry);
      }
    } catch (error) {
      console.error('Error forwarding to monitoring:', error);
      this.logger.error('Monitoring forward error', { error: error.message });
    }
  }

  // Convert log entry to CloudWatch metric
  convertToMetric(entry) {
    return {
      MetricData: [
        {
          MetricName: `AuditEvent_${entry.category}`,
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            {
              Name: 'Environment',
              Value: process.env.NODE_ENV,
            },
            {
              Name: 'Severity',
              Value: entry.severity || 'info',
            },
          ],
          Timestamp: new Date(),
        },
      ],
      Namespace: 'GemCMS/Security',
    };
  }

  // Send metric to CloudWatch
  async sendToCloudWatch(metric) {
    await this.cloudwatch.putMetricData(metric).promise();
  }

  // Send critical events to SNS
  async sendToSNS(entry) {
    await this.sns
      .publish({
        TopicArn: process.env.SECURITY_ALERTS_TOPIC_ARN,
        Message: JSON.stringify(entry),
        Subject: `Security Alert: ${entry.action}`,
      })
      .promise();
  }

  // Determine retention period based on category
  getRetentionPeriod(category) {
    const retentionPeriods = {
      security: 365, // 1 year
      auth: 90, // 90 days
      admin: 180, // 6 months
      data: 30, // 30 days
      system: 14, // 14 days
    };

    return retentionPeriods[category] || 30;
  }

  // Clean up old logs
  async cleanupOldLogs() {
    try {
      const AuditLog = Parse.Object.extend('AuditLog');
      const query = new Parse.Query(AuditLog);

      // Find logs past retention period
      query.lessThan('createdAt', this.getExpirationDate());

      // Delete in batches
      const batchSize = 100;
      let hasMore = true;

      while (hasMore) {
        const logs = await query.limit(batchSize).find();

        if (logs.length > 0) {
          await Parse.Object.destroyAll(logs);
        } else {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
      this.logger.error('Log cleanup error', { error: error.message });
    }
  }

  // Calculate expiration date based on retention period
  getExpirationDate() {
    const date = new Date();
    date.setDate(date.getDate() - 365); // Maximum retention period
    return date;
  }
}

module.exports = new AuditLogService();
