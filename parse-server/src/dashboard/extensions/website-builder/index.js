/* eslint-disable require-await */
/* global Parse */

/**
 * Website Builder Dashboard Extension
 * Integrates the visual page builder into Parse Dashboard
 */

const logger = require('../../../utils/logger');
const WebsiteBuilder = require('../../../website-builder');

// Template for the website builder UI
const builderTemplate = `
<div class="website-builder-container">
  <div class="website-builder-header">
    <div class="website-builder-breadcrumb">
      <span>Pages</span> &gt; <span class="current-page">New Page</span>
    </div>
    <div class="website-builder-actions">
      <button class="save-page">Save Page</button>
      <button class="preview-page">Preview</button>
    </div>
  </div>
  <div class="website-builder-main">
    <div id="gjs"></div>
    <div id="blocks"></div>
  </div>
</div>
`;

// Extension configuration
module.exports = {
  id: 'website-builder',
  name: 'Website Builder',
  version: '1.0.0',
  author: 'GemCMS',
  type: 'dashboard',
  description: 'Visual page builder for creating system pages',

  // Scripts that appear in the class-level toolbar
  scripts: [
    {
      id: 'create-page',
      title: 'Create New Page',
      classes: ['CMSWebPage'],
      cloudCodeFunction: 'createWebPage',
      showConfirmationDialog: false,
    },
    {
      id: 'edit-page',
      title: 'Edit Page',
      classes: ['CMSWebPage'],
      cloudCodeFunction: 'editWebPage',
      showConfirmationDialog: false,
    },
  ],

  // Info panels that appear in the object details view
  infoPanels: [
    {
      id: 'page-preview',
      title: 'Page Preview',
      classes: ['CMSWebPage'],
      cloudCodeFunction: 'getPagePreview',
    },
  ],

  // Custom routes for the website builder
  routes: [
    {
      id: 'builder',
      path: '/website-builder/:pageId?',
      method: 'GET',
      handler: async (req, res) => {
        try {
          // Get page content if editing existing page
          let pageContent = null;

          if (req.params.pageId) {
            const query = new Parse.Query('CMSWebPage');

            pageContent = await query.get(req.params.pageId, { useMasterKey: true });
          }

          // Render the website builder UI
          res.send(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Website Builder - Parse Dashboard</title>
                <link href="https://unpkg.com/grapesjs/dist/css/grapes.min.css" rel="stylesheet">
                <link href="/dashboard/static/website-builder/style.css" rel="stylesheet">
              </head>
              <body>
                ${builderTemplate}
                <script>
                  window.pageContent = ${JSON.stringify(pageContent)};
                  window.parseConfig = ${JSON.stringify({
                    serverURL: Parse.serverURL,
                    appId: Parse.applicationId,
                  })};
                </script>
                <script src="https://unpkg.com/grapesjs"></script>
                <script src="/dashboard/static/website-builder/bundle.js"></script>
              </body>
            </html>
          `);
        } catch (error) {
          logger.error('Error rendering website builder:', error);
          res.status(500).json({ error: 'Failed to render website builder' });
        }
      },
    },
    {
      id: 'save-page',
      path: '/website-builder/save/:pageId?',
      method: 'POST',
      handler: async (req, res) => {
        try {
          const { content } = req.body;
          const { pageId } = req.params;

          const CMSWebPage = Parse.Object.extend('CMSWebPage');
          const page = pageId
            ? await new Parse.Query(CMSWebPage).get(pageId, { useMasterKey: true })
            : new CMSWebPage();

          page.set('content', content);
          await page.save(null, { useMasterKey: true });

          res.json({ success: true, pageId: page.id });
        } catch (error) {
          logger.error('Error saving page:', error);
          res.status(500).json({ error: 'Failed to save page' });
        }
      },
    },
  ],

  // Initialize extension
  initialize: async () => {
    logger.info('Initializing website builder extension');

    // Register cloud functions
    Parse.Cloud.define('createWebPage', () => ({
      redirectTo: '/dashboard/website-builder',
    }));

    Parse.Cloud.define('editWebPage', req => ({
      redirectTo: `/dashboard/website-builder/${req.params.object.id}`,
    }));

    Parse.Cloud.define('getPagePreview', req => {
      const { object } = req.params;
      const content = object.get('content');

      return {
        html: `
          <div class="page-preview">
            <iframe 
              srcdoc="${content?.html || ''}"
              style="width: 100%; height: 300px; border: 1px solid #ccc;">
            </iframe>
          </div>
        `,
      };
    });

    // Initialize WebsiteBuilder
    const builder = new WebsiteBuilder({
      parseConfig: {
        serverURL: Parse.serverURL,
        appId: Parse.applicationId,
      },
    });

    // Export builder instance for use in frontend
    global.websiteBuilder = builder;

    logger.info('Website builder extension initialized successfully');
  },
};
