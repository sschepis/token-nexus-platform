const Parse = require('parse/node');

Parse.initialize('gemcms_dev', null, 'gemcms_master_key_dev');
Parse.masterKey = 'gemcms_master_key_dev';
Parse.serverURL = 'http://localhost:1337/parse';

async function createSampleTemplates() {
  try {
    // Get or create system user
    let systemUser = await new Parse.Query(Parse.User)
      .equalTo('username', 'system')
      .first({ useMasterKey: true });

    if (!systemUser) {
      systemUser = new Parse.User();
      systemUser.set('username', 'system');
      systemUser.set('password', 'system123!');
      systemUser.set('email', 'system@gemcms.dev');
      await systemUser.signUp(null, { useMasterKey: true });
    }

    // Get or create system organization
    const Organization = Parse.Object.extend('Organization');
    let systemOrg = await new Parse.Query(Organization)
      .equalTo('name', 'System')
      .first({ useMasterKey: true });

    if (!systemOrg) {
      systemOrg = new Organization();
      systemOrg.set('name', 'System');
      systemOrg.set('subdomain', 'system');
      systemOrg.set('createdBy', systemUser);
      systemOrg.set('updatedBy', systemUser);
      await systemOrg.save(null, { useMasterKey: true });
    }

    // Create sample templates
    const CMSTemplate = Parse.Object.extend('CMSTemplate');

    // Blog Template
    const blogTemplate = new CMSTemplate();

    blogTemplate.set('name', 'Blog Template');
    blogTemplate.set(
      'description',
      'A modern blog template with support for posts, categories, tags, and comments.'
    );
    blogTemplate.set('version', '1.0.0');
    blogTemplate.set('category', 'blog');
    blogTemplate.set('status', 'active');
    blogTemplate.set('tags', ['blog', 'content', 'markdown']);
    blogTemplate.set(
      'previewImage',
      'https://placehold.co/800x600/2196f3/ffffff/png?text=Blog+Template&font=Roboto'
    );
    blogTemplate.set(
      'previewUrl',
      'https://placehold.co/800x600/2196f3/ffffff/png?text=Blog+Preview&font=Roboto'
    );
    blogTemplate.set('components', [
      { name: 'PostList', type: 'component' },
      { name: 'PostDetail', type: 'component' },
      { name: 'CategoryList', type: 'component' },
    ]);
    blogTemplate.set('dependencies', [
      { name: 'markdown-it', version: '^12.0.0', type: 'required' },
      { name: 'prismjs', version: '^1.25.0', type: 'optional' },
    ]);
    blogTemplate.set('configurationSchema', [
      {
        name: 'postsPerPage',
        label: 'Posts Per Page',
        type: 'text',
        description: 'Number of posts to display per page',
      },
      {
        name: 'theme',
        label: 'Theme',
        type: 'select',
        options: [
          { value: 'light', label: 'Light Theme' },
          { value: 'dark', label: 'Dark Theme' },
        ],
      },
    ]);
    blogTemplate.set('defaultConfiguration', {
      postsPerPage: '10',
      theme: 'light',
    });
    blogTemplate.set('content', {
      pages: [
        {
          name: 'Home',
          path: '/',
          components: ['PostList']
        },
        {
          name: 'Post',
          path: '/post/:id',
          components: ['PostDetail']
        },
        {
          name: 'Categories',
          path: '/categories',
          components: ['CategoryList']
        }
      ],
      layouts: ['default', 'post'],
      styles: {
        primary: '#2196f3',
        secondary: '#1976d2'
      }
    });

    // Portfolio Template
    const portfolioTemplate = new CMSTemplate();

    portfolioTemplate.set('name', 'Portfolio Template');
    portfolioTemplate.set(
      'description',
      'A professional portfolio template for showcasing your work and projects.'
    );
    portfolioTemplate.set('version', '1.0.0');
    portfolioTemplate.set('category', 'portfolio');
    portfolioTemplate.set('status', 'active');
    portfolioTemplate.set('tags', ['portfolio', 'gallery', 'projects']);
    portfolioTemplate.set(
      'previewImage',
      'https://placehold.co/800x600/4caf50/ffffff/png?text=Portfolio+Template&font=Roboto'
    );
    portfolioTemplate.set(
      'previewUrl',
      'https://placehold.co/800x600/4caf50/ffffff/png?text=Portfolio+Preview&font=Roboto'
    );
    portfolioTemplate.set('components', [
      { name: 'ProjectGrid', type: 'component' },
      { name: 'ProjectDetail', type: 'component' },
      { name: 'ContactForm', type: 'component' },
    ]);
    portfolioTemplate.set('dependencies', [
      { name: 'lightbox', version: '^2.0.0', type: 'required' },
      { name: 'masonry', version: '^4.0.0', type: 'optional' },
    ]);
    portfolioTemplate.set('configurationSchema', [
      {
        name: 'layout',
        label: 'Layout Style',
        type: 'select',
        options: [
          { value: 'grid', label: 'Grid Layout' },
          { value: 'masonry', label: 'Masonry Layout' },
        ],
      },
      {
        name: 'contactEmail',
        label: 'Contact Email',
        type: 'text',
        description: 'Email address for contact form submissions',
      },
    ]);
    portfolioTemplate.set('defaultConfiguration', {
      layout: 'grid',
      contactEmail: '',
    });
    portfolioTemplate.set('content', {
      pages: [
        {
          name: 'Home',
          path: '/',
          components: ['ProjectGrid']
        },
        {
          name: 'Project',
          path: '/project/:id',
          components: ['ProjectDetail']
        },
        {
          name: 'Contact',
          path: '/contact',
          components: ['ContactForm']
        }
      ],
      layouts: ['default', 'project'],
      styles: {
        primary: '#4caf50',
        secondary: '#388e3c'
      }
    });

    // Set createdBy, updatedBy, and organization for both templates
    blogTemplate.set('createdBy', systemUser);
    blogTemplate.set('updatedBy', systemUser);
    blogTemplate.set('organization', systemOrg);
    portfolioTemplate.set('createdBy', systemUser);
    portfolioTemplate.set('updatedBy', systemUser);
    portfolioTemplate.set('organization', systemOrg);

    await Parse.Object.saveAll([blogTemplate, portfolioTemplate], { useMasterKey: true });
    console.log('Successfully created sample templates');
  } catch (error) {
    console.error('Error creating sample templates:', error);
    process.exit(1);
  }

  process.exit(0);
}

createSampleTemplates();
