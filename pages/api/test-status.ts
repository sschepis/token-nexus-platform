import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Simple test API endpoint that doesn't use Parse at all
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    return res.status(200).json({
      status: 'OK',
      message: 'This is a test endpoint that does not use Parse',
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