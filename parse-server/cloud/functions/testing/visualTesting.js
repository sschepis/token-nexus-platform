module.exports = Parse => {
  /* eslint-disable require-await */

  const VisualBaseline = Parse.Object.extend('VisualBaseline');
  const VisualTestRun = Parse.Object.extend('VisualTestRun');

  const puppeteer = require('puppeteer');
  const pixelmatch = require('pixelmatch');
  const { PNG } = require('pngjs');

  // Helper functions
  async function captureComponentScreenshot(html, viewport = { width: 1024, height: 768 }) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport(viewport);
      await page.setContent(html);
      await page.waitForTimeout(1000); // Wait for animations
      return await page.screenshot({ type: 'png' });
    } finally {
      await browser.close();
    }
  }

  async function hasBaseline(componentId, state, organization) {
    const query = new Parse.Query(VisualBaseline)
      .equalTo('componentId', componentId)
      .equalTo('state', state)
      .equalTo('organization', organization);
    return (await query.first({ useMasterKey: true })) !== null;
  }

  async function saveBaseline(componentId, screenshot, state, organization) {
    const file = new Parse.File(`${componentId}-${state}.png`, {
      base64: screenshot.toString('base64'),
    });
    await file.save(null, { useMasterKey: true });

    const baseline = new VisualBaseline();
    baseline.set('componentId', componentId);
    baseline.set('state', state);
    baseline.set('organization', organization);
    baseline.set('screenshot', file);

    const acl = new Parse.ACL();
    acl.setRoleReadAccess(`org_${organization.id}`, true);
    acl.setRoleWriteAccess(`org_${organization.id}_admin`, true);
    baseline.setACL(acl);

    await baseline.save(null, { useMasterKey: true });
    return baseline;
  }

  async function compareWithBaseline(componentId, screenshot, state, organization) {
    const query = new Parse.Query(VisualBaseline)
      .equalTo('componentId', componentId)
      .equalTo('state', state)
      .equalTo('organization', organization);

    const baseline = await query.first({ useMasterKey: true });

    if (!baseline) {
      throw new Error(`No baseline found for component ${componentId} in state ${state}`);
    }

    const baselineFile = baseline.get('screenshot');
    const baselineResponse = await fetch(baselineFile.url());
    const baselineBuffer = Buffer.from(await baselineResponse.arrayBuffer());

    const img1 = PNG.sync.read(baselineBuffer);
    const img2 = PNG.sync.read(screenshot);

    if (img1.width !== img2.width || img1.height !== img2.height) {
      throw new Error('Screenshots have different dimensions');
    }

    const { width, height } = img1;
    const diffImage = new PNG({ width, height });
    const differences = pixelmatch(img1.data, img2.data, diffImage.data, width, height, {
      threshold: 0.1,
    });

    let diffFile = null;
    if (differences > 0) {
      diffFile = new Parse.File(`${componentId}-${state}-diff.png`, {
        base64: PNG.sync.write(diffImage).toString('base64'),
      });
      await diffFile.save(null, { useMasterKey: true });
    }

    return {
      matches: differences === 0,
      differences,
      diffImage: diffFile,
    };
  }

  async function getOrganization(user) {
    const query = new Parse.Query('Organization').equalTo('users', user);
    return query.first({ useMasterKey: true });
  }

  async function checkTestingQuota(org) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const query = new Parse.Query(VisualTestRun)
      .equalTo('organization', org)
      .greaterThanOrEqualTo('createdAt', startOfMonth);

    const testsThisMonth = await query.count({ useMasterKey: true });
    const quota = org.get('visualTestingQuota') || 1000;

    if (testsThisMonth >= quota) {
      throw new Parse.Error(
        Parse.Error.QUOTA_EXCEEDED,
        'Visual testing quota exceeded for this month'
      );
    }
  }

  /**
   * Run a visual regression test for a component
   */
  Parse.Cloud.define('runVisualTest', async request => {
    const { componentId, html, viewport, state } = request.params;

    if (!request.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const org = await getOrganization(request.user);

    if (!org) {
      throw new Parse.Error(
        Parse.Error.OBJECT_NOT_FOUND,
        'User not associated with any organization'
      );
    }

    await checkTestingQuota(org);

    const testRun = new VisualTestRun();
    testRun.set('componentId', componentId);
    testRun.set('state', state);
    testRun.set('organization', org);
    testRun.set('createdBy', request.user);
    testRun.set('status', 'running');

    try {
      await testRun.save(null, { useMasterKey: true });

      const screenshot = await captureComponentScreenshot(html, viewport);

      const baselineExists = await hasBaseline(componentId, state, org);
      let result;

      if (baselineExists) {
        result = await compareWithBaseline(componentId, screenshot, state, org);
        testRun.set('status', result.matches ? 'passed' : 'failed');
        testRun.set('differences', result.differences);
        if (result.diffImage) {
          testRun.set('diffImage', result.diffImage);
        }
      } else {
        await saveBaseline(componentId, screenshot, state, org);
        testRun.set('status', 'baseline_created');
      }

      await testRun.save(null, { useMasterKey: true });

      org.increment('visualTestingUsage');
      await org.save(null, { useMasterKey: true });

      return {
        testRunId: testRun.id,
        status: testRun.get('status'),
        ...result,
      };
    } catch (error) {
      testRun.set('status', 'error');
      testRun.set('error', error.message);
      await testRun.save(null, { useMasterKey: true });

      throw new Parse.Error(
        Parse.Error.INTERNAL_SERVER_ERROR,
        `Visual test failed: ${error.message}`
      );
    }
  });

  /**
   * Update baseline for a component
   * Requires admin role
   */
  Parse.Cloud.define('updateBaseline', async request => {
    const { componentId, html, viewport, state } = request.params;

    if (!request.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    // Use canonical checkUserRole
    const userRoleInfo = await Parse.Cloud.run('checkUserRole', { user: request.user });
    if (!userRoleInfo.isAdmin) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only admins can update baselines');
    }

    const org = await getOrganization(request.user);

    if (!org) {
      throw new Parse.Error(
        Parse.Error.OBJECT_NOT_FOUND,
        'User not associated with any organization'
      );
    }

    try {
      const screenshot = await captureComponentScreenshot(html, viewport);
      await saveBaseline(componentId, screenshot, state, org);
      return {
        status: 'success',
        message: 'Baseline updated successfully',
      };
    } catch (error) {
      throw new Parse.Error(
        Parse.Error.INTERNAL_SERVER_ERROR,
        `Failed to update baseline: ${error.message}`
      );
    }
  });

  /**
   * Get test history for a component
   */
  Parse.Cloud.define('getVisualTestHistory', async request => {
    const { componentId, state, limit = 10 } = request.params;

    if (!request.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const org = await getOrganization(request.user);

    if (!org) {
      throw new Parse.Error(
        Parse.Error.OBJECT_NOT_FOUND,
        'User not associated with any organization'
      );
    }

    const query = new Parse.Query(VisualTestRun)
      .equalTo('componentId', componentId)
      .equalTo('organization', org)
      .include('diffImage')
      .descending('createdAt')
      .limit(limit);

    if (state) {
      query.equalTo('state', state);
    }

    const testRuns = await query.find({ useMasterKey: true });

    return testRuns.map(run => ({
      id: run.id,
      status: run.get('status'),
      differences: run.get('differences'),
      createdAt: run.get('createdAt'),
      state: run.get('state'),
      error: run.get('error'),
      diffImageUrl: run.get('diffImage') ? run.get('diffImage').url() : null,
    }));
  });

  // Register hooks
  Parse.Cloud.beforeSave(VisualBaseline, async request => {
    if (!request.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const baseline = request.object;

    if (!baseline.isNew()) return;

    const acl = new Parse.ACL();
    const org = await getOrganization(request.user);

    acl.setRoleReadAccess(`org_${org.id}`, true);
    acl.setRoleWriteAccess(`org_${org.id}_admin`, true);
    baseline.setACL(acl);
  });

  Parse.Cloud.beforeSave(VisualTestRun, async request => {
    if (!request.user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const testRun = request.object;

    if (!testRun.isNew()) return;

    const acl = new Parse.ACL();
    const org = await getOrganization(request.user);

    acl.setRoleReadAccess(`org_${org.id}`, true);
    acl.setRoleWriteAccess(`org_${org.id}`, true);
    testRun.setACL(acl);
  });
};
