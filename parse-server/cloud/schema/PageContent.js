// PageContent schema for storing pages created with PageBuilder

async function createPageContentSchema() {
  const schema = new Parse.Schema('PageContent');
  
  try {
    await schema.get();
    console.log('PageContent schema already exists');
  } catch (error) {
    // Schema doesn't exist, create it
    schema
      .addString('title', { required: true })
      .addString('slug', { required: true }) // URL-friendly identifier
      .addString('html') // Page HTML content
      .addString('css') // Page CSS styles
      .addString('js') // Page JavaScript
      .addObject('metadata') // Additional page metadata (SEO, etc.)
      .addString('status', { required: true, defaultValue: 'draft' }) // 'draft', 'published', 'archived'
      .addPointer('author', '_User', { required: true })
      .addPointer('organization', 'Organization') // Optional: associate with org
      .addPointer('lastModifiedBy', '_User')
      .addDate('lastModifiedAt')
      .addDate('publishedAt')
      .addNumber('version', { defaultValue: 1 }) // Version tracking
      .addArray('tags') // Tags for categorization
      .addBoolean('isTemplate', { defaultValue: false }) // Whether this is a template
      .addString('templateCategory') // If template, what category
      .addObject('settings') // Page-specific settings
      .addArray('usedComponents'); // Track which components are used

    // Add indexes
    schema.addIndex('slug_index', { slug: 1 });
    schema.addIndex('status_index', { status: 1 });
    schema.addIndex('author_index', { author: 1 });
    schema.addIndex('organization_index', { organization: 1 });
    schema.addIndex('template_index', { isTemplate: 1, templateCategory: 1 });

    await schema.save();
    console.log('PageContent schema created successfully');
  }
}

// ComponentLibrary schema for reusable components
async function createComponentLibrarySchema() {
  const schema = new Parse.Schema('ComponentLibrary');
  
  try {
    await schema.get();
    console.log('ComponentLibrary schema already exists');
  } catch (error) {
    // Schema doesn't exist, create it
    schema
      .addString('name', { required: true })
      .addString('category', { required: true }) // 'Basic', 'Layout', 'Forms', 'Custom', etc.
      .addString('description')
      .addString('html', { required: true }) // Component HTML
      .addString('css') // Component CSS
      .addString('js') // Component JavaScript
      .addObject('props') // Configurable properties
      .addString('preview') // Preview image URL
      .addPointer('author', '_User', { required: true })
      .addPointer('organization', 'Organization') // Optional: org-specific component
      .addBoolean('isPublic', { defaultValue: false }) // Available to all users
      .addString('status', { required: true, defaultValue: 'active' }) // 'active', 'deprecated'
      .addArray('tags')
      .addNumber('usageCount', { defaultValue: 0 }) // Track popularity
      .addObject('config'); // Component configuration options

    // Add indexes
    schema.addIndex('name_index', { name: 1 });
    schema.addIndex('category_index', { category: 1 });
    schema.addIndex('public_index', { isPublic: 1 });
    schema.addIndex('status_index', { status: 1 });

    await schema.save();
    console.log('ComponentLibrary schema created successfully');
  }
}

module.exports = {
  createPageContentSchema,
  createComponentLibrarySchema
};