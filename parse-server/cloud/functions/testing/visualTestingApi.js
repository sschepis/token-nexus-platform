/* global Parse */
/**
 * API endpoints for visual testing
 */

const express = require('express');
const router = express.Router();

// Middleware to check authentication
const requireAuth = async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-parse-session-token'];

    if (!sessionToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { user } = await Parse.Session.current(sessionToken);

    if (!user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get diff image
router.get('/visual-testing/diff/:componentId/:state', requireAuth, async (req, res) => {
  try {
    const { componentId, state } = req.params;

    // Find the most recent diff image
    const query = new Parse.Query('VisualDiff');

    query.equalTo('componentId', componentId);
    query.equalTo('state', state);
    query.descending('createdAt');

    const diff = await query.first({ useMasterKey: true });

    if (!diff) {
      return res.status(404).json({ error: 'Diff image not found' });
    }

    // Check organization access
    const userOrg = await getUserOrganization(req.user);
    const diffOrg = diff.get('organization');

    if (diffOrg.id !== userOrg.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get the image file
    const image = diff.get('image');
    const response = await fetch(image.url());
    const buffer = await response.arrayBuffer();

    // Set appropriate headers
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get baseline image
router.get('/visual-testing/baseline/:componentId/:state', requireAuth, async (req, res) => {
  try {
    const { componentId, state } = req.params;

    // Find the baseline image
    const query = new Parse.Query('VisualBaseline');

    query.equalTo('componentId', componentId);
    query.equalTo('state', state);

    const baseline = await query.first({ useMasterKey: true });

    if (!baseline) {
      return res.status(404).json({ error: 'Baseline image not found' });
    }

    // Check organization access
    const userOrg = await getUserOrganization(req.user);
    const baselineOrg = baseline.get('organization');

    if (baselineOrg.id !== userOrg.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get the image file
    const image = baseline.get('screenshot');
    const response = await fetch(image.url());
    const buffer = await response.arrayBuffer();

    // Set appropriate headers
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get test history
router.get('/visual-testing/history/:componentId', requireAuth, async (req, res) => {
  try {
    const { componentId } = req.params;
    const { state, limit = 10, skip = 0 } = req.query;

    // Get user's organization
    const org = await getUserOrganization(req.user);

    // Query test runs
    const query = new Parse.Query('VisualTestRun');

    query.equalTo('componentId', componentId);
    query.equalTo('organization', org);
    if (state) {
      query.equalTo('state', state);
    }
    query.descending('createdAt');
    query.limit(parseInt(limit));
    query.skip(parseInt(skip));

    const results = await query.find({ useMasterKey: true });

    res.json({
      results: results.map(run => ({
        id: run.id,
        componentId: run.get('componentId'),
        state: run.get('state'),
        status: run.get('status'),
        differences: run.get('differences'),
        createdAt: run.get('createdAt'),
        diffImageUrl: run.get('diffImage')
          ? `/api/visual-testing/diff/${componentId}/${run.get('state')}`
          : null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to get user's organization
async function getUserOrganization(user) {
  const query = new Parse.Query('Organization');

  query.equalTo('users', user);
  const org = await query.first({ useMasterKey: true });

  if (!org) {
    throw new Error('User not associated with any organization');
  }

  return org;
}

module.exports = router;
