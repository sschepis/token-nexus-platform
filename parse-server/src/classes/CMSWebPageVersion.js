/**
 * CMSWebPageVersion Class
 * Represents a version of a website page
 */

const Schema = {
  className: 'CMSWebPageVersion',
  fields: {
    // Reference to the original page
    page: {
      type: 'Pointer',
      targetClass: 'CMSWebPage',
      required: true,
    },

    // Version number
    version: {
      type: 'Number',
      required: true,
      defaultValue: 1,
    },

    // Content snapshot
    content: {
      type: 'Object',
      required: true,
      defaultValue: {
        html: '',
        css: '',
        components: [],
        styles: [],
      },
    },

    // Metadata snapshot
    metadata: {
      type: 'Object',
      required: true,
      defaultValue: {
        title: '',
        description: '',
        keywords: [],
        slug: '',
      },
    },

    // Change description
    description: {
      type: 'String',
    },

    // User who created this version
    createdBy: {
      type: 'Pointer',
      targetClass: '_User',
      required: true,
    },

    // Organization
    organization: {
      type: 'Pointer',
      targetClass: '_User',
      required: true,
    },

    // Restore point
    restoredFrom: {
      type: 'Pointer',
      targetClass: 'CMSWebPageVersion',
    },

    // Version type
    type: {
      type: 'String',
      required: true,
      defaultValue: 'manual',
      options: ['manual', 'auto', 'restore'],
    },

    // Hash of content for quick comparison
    contentHash: {
      type: 'String',
    },
  },

  indexes: {
    // Page and version number must be unique together
    pageVersion: {
      page: 1,
      version: -1,
    },
    // Organization for filtering
    organization: {
      organization: 1,
      createdAt: -1,
    },
  },

  classLevelPermissions: {
    find: {
      requiresAuthentication: true,
    },
    count: {
      requiresAuthentication: true,
    },
    get: {
      requiresAuthentication: true,
    },
    create: {
      requiresAuthentication: true,
    },
    update: {
      requiresAuthentication: true,
    },
    delete: {
      requiresAuthentication: true,
    },
    addField: {
      requiresAuthentication: true,
    },
  },

  /**
   * Before save trigger
   * @param {Parse.Object} version - The version being saved
   */
  beforeSave: async version => {
    // Generate content hash
    const crypto = require('crypto');
    const versionContent = version.get('content');
    const hash = crypto.createHash('sha256').update(JSON.stringify(versionContent)).digest('hex');
    version.set('contentHash', hash);

    // Set version number if not provided
    if (!version.get('version')) {
      const query = new Parse.Query('CMSWebPageVersion');
      query.equalTo('page', version.get('page'));
      query.descending('version');
      const lastVersion = await query.first({ useMasterKey: true });
      version.set('version', lastVersion ? lastVersion.get('version') + 1 : 1);
    }

    // Inherit organization from page
    if (!version.get('organization')) {
      const page = await version.get('page').fetch({ useMasterKey: true });
      version.set('organization', page.get('organization'));
    }

    // Validate content structure
    const pageContent = version.get('content');
    if (!pageContent || !pageContent.html || !pageContent.css) {
      throw new Parse.Error(Parse.Error.INVALID_JSON, 'Content must include HTML and CSS');
    }
  },

  /**
   * After save trigger
   * @param {Parse.Object} version - The saved version
   */
  afterSave: async version => {
    // Clear cache
    const cache = require('../utils/cache');
    await cache.delete(`version:${version.id}`);
    await cache.delete(`versions:${version.get('page').id}`);

    // Emit event
    const events = require('../utils/events');
    await events.emit('website.version.created', {
      versionId: version.id,
      pageId: version.get('page').id,
      version: version.get('version'),
      type: version.get('type'),
    });
  },

  /**
   * Before delete trigger
   * @param {Parse.Object} version - The version being deleted
   */
  beforeDelete: async version => {
    // Prevent deletion of latest version
    const query = new Parse.Query('CMSWebPageVersion');
    query.equalTo('page', version.get('page'));
    query.descending('version');
    const latestVersion = await query.first({ useMasterKey: true });

    if (latestVersion && latestVersion.id === version.id) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Cannot delete latest version');
    }
  },

  /**
   * After delete trigger
   * @param {Parse.Object} version - The deleted version
   */
  afterDelete: async version => {
    // Clear cache
    const cache = require('../utils/cache');
    await cache.delete(`version:${version.id}`);
    await cache.delete(`versions:${version.get('page').id}`);

    // Emit event
    const events = require('../utils/events');
    await events.emit('website.version.deleted', {
      versionId: version.id,
      pageId: version.get('page').id,
      version: version.get('version'),
    });
  },
};

module.exports = Schema;
