const express = require('express');
const Parse = require('parse/node');

/**
 * Middleware for serving built pages from CMSWebPage class
 */
function pageServerMiddleware() {
  const router = express.Router();

  router.get('/:pageId', async (req, res) => {
    try {
      const { pageId } = req.params;

      // Query the page
      const query = new Parse.Query('CMSWebPage');
      const page = await query.get(pageId, { useMasterKey: true });

      if (!page) {
        return res.status(404).send('Page not found');
      }

      const content = page.get('content');

      if (!content) {
        return res.status(404).send('Page content not found');
      }

      // Construct the HTML document
      const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${page.get('title') || 'Built with GemCMS'}</title>
    <style>${content.css || ''}</style>
  </head>
  <body>${content.html || ''}</body>
</html>`;

      res.send(html);
    } catch (error) {
      console.error('Error serving page:', error);
      res.status(500).send('Error serving page');
    }
  });

  return router;
}

module.exports = pageServerMiddleware;
