import { NextApiRequest, NextApiResponse } from 'next';
import { safeParseCloudRun } from '@/utils/parseUtils';

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
    // Use secure cloud function to get system activity
    const result = await safeParseCloudRun('getSystemActivity', {});
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to retrieve system activity');
    }

    res.status(200).json(result.activities);
  } catch (error) {
    console.error('Error fetching system activity:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system activity',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}