// MarketingContent schema for CMS functionality

async function createMarketingContentSchema() {
  const schema = new Parse.Schema('MarketingContent');
  
  try {
    await schema.get();
    console.log('MarketingContent schema already exists');
  } catch (error) {
    // Schema doesn't exist, create it
    schema
      .addString('title', { required: true })
      .addString('slug', { required: true }) // URL-friendly identifier
      .addString('contentType', { required: true }) // 'page', 'blog', 'announcement', 'feature', 'help'
      .addString('status', { required: true, defaultValue: 'draft' }) // 'draft', 'published', 'archived'
      .addObject('content') // Rich content object (can store HTML, markdown, blocks, etc.)
      .addString('excerpt') // Short description
      .addString('featuredImage') // URL to featured image
      .addObject('seo') // SEO metadata (title, description, keywords, ogImage)
      .addArray('tags') // Tags for categorization
      .addPointer('author', '_User', { required: true })
      .addPointer('organization', 'Organization') // Optional: associate with specific org
      .addDate('publishedAt')
      .addDate('scheduledAt') // For scheduled publishing
      .addNumber('viewCount', { defaultValue: 0 })
      .addObject('metadata') // Additional flexible metadata
      .addArray('categories') // Categories for organization
      .addBoolean('isFeatured', { defaultValue: false }) // Feature on homepage
      .addNumber('sortOrder', { defaultValue: 0 }) // For manual ordering
      .addString('language', { defaultValue: 'en' }); // Language code

    // Add indexes
    schema.addIndex('slug_index', { slug: 1 });
    schema.addIndex('status_index', { status: 1 });
    schema.addIndex('contentType_index', { contentType: 1 });
    schema.addIndex('publishedAt_index', { publishedAt: -1 });
    schema.addIndex('organization_index', { organization: 1 });

    await schema.save();
    console.log('MarketingContent schema created successfully');
  }
}

// SignupRequest schema for managing platform signups
async function createSignupRequestSchema() {
  const schema = new Parse.Schema('SignupRequest');
  
  try {
    await schema.get();
    console.log('SignupRequest schema already exists');
  } catch (error) {
    // Schema doesn't exist, create it
    schema
      .addString('email', { required: true })
      .addString('organizationName', { required: true })
      .addString('firstName', { required: true })
      .addString('lastName', { required: true })
      .addString('phoneNumber')
      .addString('companySize') // 'solo', 'small', 'medium', 'large', 'enterprise'
      .addString('industry')
      .addString('useCase') // How they plan to use the platform
      .addString('status', { required: true, defaultValue: 'pending' }) // 'pending', 'approved', 'rejected', 'waitlisted'
      .addPointer('approvedBy', '_User') // Admin who approved
      .addPointer('createdOrganization', 'Organization') // Link to created org after approval
      .addDate('approvedAt')
      .addDate('rejectedAt')
      .addString('rejectionReason')
      .addObject('metadata') // Additional data from signup form
      .addString('referralSource') // How they heard about us
      .addString('ipAddress') // For security/fraud prevention
      .addObject('geoLocation'); // Country, region, city from IP

    // Add indexes
    schema.addIndex('email_index', { email: 1 });
    schema.addIndex('status_index', { status: 1 });
    schema.addIndex('createdAt_index', { createdAt: -1 });

    await schema.save();
    console.log('SignupRequest schema created successfully');
  }
}

module.exports = {
  createMarketingContentSchema,
  createSignupRequestSchema
};