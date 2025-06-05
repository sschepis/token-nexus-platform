# Parse Dashboard Extensions

This directory contains extensions that enhance the Parse Dashboard functionality. Extensions can
add custom scripts, info panels, and routes to the dashboard.

## Creating an Extension

A dashboard extension is a module that exports an object with the following structure:

```javascript
module.exports = {
  // Required fields
  id: 'your-extension-id',
  name: 'Your Extension Name',
  version: '1.0.0',
  author: 'Your Name',
  type: 'dashboard',
  description: 'Description of your extension',

  // Optional fields
  scripts: [
    {
      id: 'script-id',
      title: 'Script Title',
      classes: ['ClassName'], // Parse classes this script applies to
      cloudCodeFunction: 'cloudFunctionName',
      showConfirmationDialog: true,
      confirmationDialogStyle: 'info', // or 'critical'
    },
  ],

  infoPanels: [
    {
      id: 'panel-id',
      title: 'Panel Title',
      classes: ['ClassName'], // Parse classes this panel appears for
      cloudCodeFunction: 'cloudFunctionName',
    },
  ],

  routes: [
    {
      id: 'route-id',
      path: '/your/route/path',
      method: 'GET', // HTTP method
      handler: async (req, res) => {
        // Route handler implementation
      },
    },
  ],

  // Optional initialization function
  initialize: async () => {
    // Setup code (e.g., registering cloud functions)
  },
};
```

## Extension Types

### Scripts

Scripts appear in the class-level toolbar and can perform actions on the selected class. They can:

- Execute cloud functions
- Show confirmation dialogs
- Process data
- Export data

### Info Panels

Info panels appear in the object details view and can display additional information about an
object. They can:

- Show custom metrics
- Display related data
- Provide insights
- Show visualizations

### Custom Routes

Routes allow you to add custom API endpoints to your dashboard. They can:

- Serve data
- Handle webhooks
- Process requests
- Integrate with external services

## Example Extension

See the [analytics](./analytics/index.js) extension for a complete example that demonstrates:

- Custom scripts for exporting statistics
- Info panels for displaying analytics
- Custom routes for fetching analytics data
- Cloud function integration
- Proper error handling
- Async operation handling

## Best Practices

1. **Naming**

   - Use clear, descriptive names for your extension and its components
   - Follow the `extension-name` format for extension IDs
   - Use camelCase for function names

2. **Error Handling**

   - Always catch and log errors
   - Provide meaningful error messages
   - Return appropriate HTTP status codes

3. **Cloud Functions**

   - Register cloud functions in the initialize method
   - Use descriptive function names
   - Implement proper validation
   - Use the master key when needed

4. **Performance**

   - Optimize database queries
   - Cache results when possible
   - Use batch operations
   - Handle pagination

5. **Security**
   - Validate input data
   - Check user permissions
   - Use the master key judiciously
   - Sanitize output data

## Installation

1. Create your extension in a new directory under `src/dashboard/extensions/`
2. Export your extension configuration
3. The extension will be automatically loaded when the server starts

## Testing

1. Start the Parse Server in development mode
2. Access the Parse Dashboard
3. Your extension's scripts and panels should appear in their designated locations
4. Test all functionality thoroughly
5. Check error cases and edge conditions

## Troubleshooting

If your extension isn't working:

1. Check the server logs for initialization errors
2. Verify all required fields are present
3. Test cloud functions independently
4. Check browser console for JavaScript errors
5. Verify routes are accessible
