/* global websiteBuilder, pageContent, parseConfig, document, window, WebsiteBuilder */

// Initialize website builder when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Configure website builder
  const builder =
    websiteBuilder ||
    new WebsiteBuilder({
      container: '#gjs',
      height: 'calc(100vh - 50px)',
      storageManager: {
        type: 'parse',
        autosave: true,
        autoload: true,
        stepsBeforeSave: 1,
      },
      assetManager: {
        upload: '/parse/files',
        uploadName: 'files',
        multiUpload: true,
        credentials: 'include',
        headers: {
          'X-Parse-Application-Id': parseConfig.appId,
        },
      },
      canvas: {
        styles: ['https://unpkg.com/tailwindcss@2.2.19/dist/tailwind.min.css'],
      },
    });

  // Initialize editor
  const editor = builder.initialize();

  // Load existing content if available
  if (pageContent) {
    editor.loadProjectData(pageContent);
  }

  // Handle save button click
  document.querySelector('.save-page').addEventListener('click', async () => {
    try {
      const content = builder.getContent();
      const response = await fetch(`/dashboard/website-builder/save/${pageContent?.id || ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Parse-Application-Id': parseConfig.appId,
        },
        body: JSON.stringify({ content }),
      });

      const result = await response.json();

      if (result.success) {
        editor.Notifications.add('Page saved successfully!', {
          type: 'success',
        });

        // Update URL if this was a new page
        if (!pageContent?.id) {
          window.history.replaceState({}, '', `/dashboard/website-builder/${result.pageId}`);
        }
      } else {
        throw new Error('Failed to save page');
      }
    } catch (error) {
      editor.Notifications.add(`Error saving page: ${error.message}`, {
        type: 'error',
      });
    }
  });

  // Handle preview button click
  document.querySelector('.preview-page').addEventListener('click', () => {
    const content = builder.getContent();
    const previewWindow = window.open('', '_blank');

    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Page Preview</title>
          <link href="https://unpkg.com/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>${content.css}</style>
        </head>
        <body>
          ${content.html}
        </body>
      </html>
    `);
    previewWindow.document.close();
  });
});
