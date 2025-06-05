import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Test API endpoint - only available in development environment
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Block access in production environment
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      error: 'Not found'
    });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    return res.status(200).json({
      status: 'OK',
      message: 'Test endpoint - development only',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      status: 'ERROR',
      error: errorMessage
    });
  }
}