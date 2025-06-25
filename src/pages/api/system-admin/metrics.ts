import { NextApiRequest, NextApiResponse } from 'next';
import { safeParseCloudRun } from '@/utils/parseUtils';

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
    // Use secure cloud function to get system metrics
    const result = await safeParseCloudRun('getSystemMetrics', {});
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to retrieve system metrics');
    }

    res.status(200).json(result.metrics);
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch system metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}