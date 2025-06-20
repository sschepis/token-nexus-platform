import { NextApiRequest, NextApiResponse } from 'next';
import Parse from 'parse/node';

interface SystemMetrics {
  platformHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: string;
    lastCheck: Date;
  };
  totalOrganizations: number;
  totalUsers: number;
  activeDeployments: number;
  systemResources: {
    cpu: number;
    memory: number;
    storage: number;
  };
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

    // Get total organizations
    const orgQuery = new Parse.Query('Organization');
    const totalOrganizations = await orgQuery.count({ useMasterKey: true });

    // Get total users across all organizations
    const userQuery = new Parse.Query(Parse.User);
    const totalUsers = await userQuery.count({ useMasterKey: true });

    // Get active deployments (this would depend on your deployment tracking)
    // For now, we'll use a placeholder or try to get from a deployments table
    let activeDeployments = 0;
    try {
      const deploymentQuery = new Parse.Query('Deployment');
      deploymentQuery.equalTo('status', 'active');
      activeDeployments = await deploymentQuery.count({ useMasterKey: true });
    } catch (error) {
      // Deployment table might not exist, use placeholder
      activeDeployments = 0;
    }

    // Calculate platform health based on various factors
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // Simple health check logic
    if (totalUsers === 0) {
      healthStatus = 'warning';
    }
    
    // Get system uptime (simplified - in production you'd get this from system metrics)
    const uptime = process.uptime();
    const uptimeString = formatUptime(uptime);

    // Mock system resources (in production, you'd get these from system monitoring)
    const systemResources = {
      cpu: Math.floor(Math.random() * 30) + 20, // 20-50% CPU usage
      memory: Math.floor(Math.random() * 40) + 30, // 30-70% memory usage
      storage: Math.floor(Math.random() * 20) + 40, // 40-60% storage usage
    };

    // Adjust health status based on resource usage
    if (systemResources.cpu > 80 || systemResources.memory > 85 || systemResources.storage > 90) {
      healthStatus = 'critical';
    } else if (systemResources.cpu > 60 || systemResources.memory > 70 || systemResources.storage > 80) {
      healthStatus = 'warning';
    }

    const metrics: SystemMetrics = {
      platformHealth: {
        status: healthStatus,
        uptime: uptimeString,
        lastCheck: new Date(),
      },
      totalOrganizations,
      totalUsers,
      activeDeployments,
      systemResources,
    };

    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}