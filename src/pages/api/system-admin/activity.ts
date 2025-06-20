import { NextApiRequest, NextApiResponse } from 'next';
import Parse from 'parse/node';

interface ActivityItem {
  id: string;
  type: 'deployment' | 'organization' | 'user' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'success' | 'warning' | 'error';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Parse if not already done
    if (!Parse.applicationId) {
      Parse.initialize(
        process.env.PARSE_APPLICATION_ID || '',
        process.env.PARSE_JAVASCRIPT_KEY || '',
        process.env.PARSE_MASTER_KEY || ''
      );
      Parse.serverURL = process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse';
    }

    const activities: ActivityItem[] = [];

    // Get recent organizations
    try {
      const orgQuery = new Parse.Query('Organization');
      orgQuery.descending('createdAt');
      orgQuery.limit(5);
      const recentOrgs = await orgQuery.find({ useMasterKey: true });

      recentOrgs.forEach((org) => {
        activities.push({
          id: `org-${org.id}`,
          type: 'organization',
          title: 'New Organization Created',
          description: `Organization "${org.get('name') || 'Unknown'}" was created`,
          timestamp: org.get('createdAt'),
          status: 'success'
        });
      });
    } catch (error) {
      console.warn('Could not fetch recent organizations:', error);
    }

    // Get recent users
    try {
      const userQuery = new Parse.Query(Parse.User);
      userQuery.descending('createdAt');
      userQuery.limit(5);
      const recentUsers = await userQuery.find({ useMasterKey: true });

      recentUsers.forEach((user) => {
        activities.push({
          id: `user-${user.id}`,
          type: 'user',
          title: 'New User Registered',
          description: `User "${user.get('firstName') || user.get('email') || 'Unknown'}" joined the platform`,
          timestamp: user.get('createdAt'),
          status: 'success'
        });
      });
    } catch (error) {
      console.warn('Could not fetch recent users:', error);
    }

    // Get recent deployments (if deployment tracking exists)
    try {
      const deploymentQuery = new Parse.Query('Deployment');
      deploymentQuery.descending('createdAt');
      deploymentQuery.limit(5);
      const recentDeployments = await deploymentQuery.find({ useMasterKey: true });

      recentDeployments.forEach((deployment) => {
        const status = deployment.get('status');
        let activityStatus: 'success' | 'warning' | 'error' = 'success';
        
        if (status === 'failed' || status === 'error') {
          activityStatus = 'error';
        } else if (status === 'pending' || status === 'deploying') {
          activityStatus = 'warning';
        }

        activities.push({
          id: `deployment-${deployment.id}`,
          type: 'deployment',
          title: 'Contract Deployment',
          description: `Contract "${deployment.get('contractName') || 'Unknown'}" deployment ${status}`,
          timestamp: deployment.get('createdAt'),
          status: activityStatus
        });
      });
    } catch (error) {
      console.warn('Could not fetch recent deployments:', error);
    }

    // Add some system activities (mock data for now)
    const now = new Date();
    const systemActivities: ActivityItem[] = [
      {
        id: 'system-1',
        type: 'system',
        title: 'System Health Check',
        description: 'Automated system health check completed successfully',
        timestamp: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
        status: 'success'
      },
      {
        id: 'system-2',
        type: 'system',
        title: 'Database Backup',
        description: 'Scheduled database backup completed',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        status: 'success'
      }
    ];

    activities.push(...systemActivities);

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit to most recent 20 activities
    const limitedActivities = activities.slice(0, 20);

    res.status(200).json(limitedActivities);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recent activity',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}