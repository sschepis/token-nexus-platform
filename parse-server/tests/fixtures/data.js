/**
 * Test Fixtures
 * Provides test data for various test scenarios
 */

// Sample content templates
exports.templates = {
  // Basic page template
  basicPage: {
    name: 'Basic Page',
    schema: {
      title: { type: 'String', required: true },
      content: { type: 'String', required: true },
      metadata: {
        type: 'Object',
        schema: {
          description: { type: 'String' },
          keywords: { type: 'Array', items: { type: 'String' } },
        },
      },
    },
    defaultContent: {
      title: 'New Page',
      content: '',
      metadata: {
        description: '',
        keywords: [],
      },
    },
  },

  // Blog post template
  blogPost: {
    name: 'Blog Post',
    schema: {
      title: { type: 'String', required: true },
      subtitle: { type: 'String' },
      content: { type: 'String', required: true },
      author: { type: 'Pointer', targetClass: '_User', required: true },
      categories: { type: 'Array', items: { type: 'String' } },
      tags: { type: 'Array', items: { type: 'String' } },
      featuredImage: { type: 'File' },
      publishDate: { type: 'Date' },
      status: { type: 'String', default: 'draft' },
    },
    defaultContent: {
      title: 'New Blog Post',
      content: '',
      categories: [],
      tags: [],
      status: 'draft',
    },
  },

  // Product template
  product: {
    name: 'Product',
    schema: {
      name: { type: 'String', required: true },
      description: { type: 'String', required: true },
      price: { type: 'Number', required: true, min: 0 },
      images: { type: 'Array', items: { type: 'File' } },
      category: { type: 'String', required: true },
      specifications: { type: 'Object' },
      inventory: { type: 'Number', default: 0 },
      status: { type: 'String', default: 'draft' },
    },
    defaultContent: {
      name: 'New Product',
      description: '',
      price: 0,
      images: [],
      specifications: {},
      inventory: 0,
      status: 'draft',
    },
  },
};

// Sample content
exports.content = {
  // Sample page
  homepage: {
    title: 'Welcome to Our Website',
    content: 'This is the homepage content.',
    metadata: {
      description: 'Welcome to our company website',
      keywords: ['welcome', 'homepage', 'company'],
    },
  },

  // Sample blog post
  blogPost: {
    title: 'Getting Started with Parse Server CMS',
    subtitle: 'A comprehensive guide',
    content: 'Learn how to use Parse Server CMS...',
    categories: ['Tutorial', 'CMS'],
    tags: ['parse-server', 'cms', 'tutorial'],
    status: 'draft',
  },

  // Sample product
  product: {
    name: 'Premium Widget',
    description: 'High-quality widget for all your needs',
    price: 99.99,
    category: 'Widgets',
    specifications: {
      weight: '1kg',
      dimensions: '10x10x10cm',
      color: 'Silver',
    },
    inventory: 100,
    status: 'active',
  },
};

// Sample users
exports.users = {
  admin: {
    username: 'admin',
    email: 'admin@example.com',
    password: 'Admin123!',
    role: 'admin',
  },
  editor: {
    username: 'editor',
    email: 'editor@example.com',
    password: 'Editor123!',
    role: 'editor',
  },
  author: {
    username: 'author',
    email: 'author@example.com',
    password: 'Author123!',
    role: 'author',
  },
};

// Sample media metadata
exports.media = {
  image: {
    name: 'Test Image',
    type: 'image/jpeg',
    size: 1024 * 100, // 100KB
    metadata: {
      width: 800,
      height: 600,
      format: 'jpeg',
      colorSpace: 'sRGB',
    },
  },
  document: {
    name: 'Test Document',
    type: 'application/pdf',
    size: 1024 * 500, // 500KB
    metadata: {
      pages: 5,
      author: 'Test Author',
      created: new Date().toISOString(),
    },
  },
};

// Sample webhook configurations
exports.webhooks = {
  contentHook: {
    url: 'https://example.com/webhooks/content',
    events: ['content.published', 'content.updated'],
    secret: 'webhook-secret-1',
    enabled: true,
  },
  mediaHook: {
    url: 'https://example.com/webhooks/media',
    events: ['media.uploaded', 'media.processed'],
    secret: 'webhook-secret-2',
    enabled: true,
  },
};

// Sample ACL configurations
exports.acl = {
  // Public read, authenticated write
  public: {
    '*': { read: true },
    'role:authenticated': { write: true },
  },
  // Organization-specific
  organization: {
    'role:org-admin': { read: true, write: true },
    'role:org-member': { read: true },
  },
  // Content-specific
  content: {
    'role:content-admin': { read: true, write: true },
    'role:content-editor': { read: true, write: true },
    'role:content-viewer': { read: true },
  },
};

// Helper function to create test data
exports.createTestData = async Parse => {
  const results = {
    users: {},
    templates: {},
    content: {},
    media: {},
  };

  // Create users
  for (const [role, userData] of Object.entries(exports.users)) {
    const user = new Parse.User();
    await user.signUp(userData);
    results.users[role] = user;
  }

  // Create templates
  for (const [type, templateData] of Object.entries(exports.templates)) {
    const template = new Parse.Object('CMSTemplate');
    await template.save(templateData, { useMasterKey: true });
    results.templates[type] = template;
  }

  // Create content
  for (const [type, contentData] of Object.entries(exports.content)) {
    const content = new Parse.Object('CMSContent');
    await content.save(
      {
        ...contentData,
        template: results.templates[type],
        createdBy: results.users.author,
      },
      { useMasterKey: true }
    );
    results.content[type] = content;
  }

  return results;
};
