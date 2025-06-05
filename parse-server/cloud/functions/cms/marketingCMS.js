module.exports = Parse => {
  const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');

  // Create or update marketing content
  Parse.Cloud.define('upsertMarketingContent', withOrganizationContext(async (request) => {
    const { user, organization, organizationId } = request;
    const { contentId, title, slug, contentType, content, excerpt, featuredImage, seo, tags, categories, status, scheduledAt, isFeatured, sortOrder, language } = request.params;

    try {
      const MarketingContent = Parse.Object.extend('MarketingContent');
      let marketingContent;

      if (contentId) {
        marketingContent = await new Parse.Query(MarketingContent).get(contentId, { useMasterKey: true });
        
        if (!marketingContent) {
          throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Content not found');
        }
      } else {
        marketingContent = new MarketingContent();
        
        const slugQuery = new Parse.Query(MarketingContent);
        slugQuery.equalTo('slug', slug);
        if (organizationId) {
          slugQuery.equalTo('organization', organization);
        }
        const existing = await slugQuery.first({ useMasterKey: true });
        if (existing) {
          throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'Content with this slug already exists');
        }
      }

      if (title !== undefined) marketingContent.set('title', title);
      if (slug !== undefined) marketingContent.set('slug', slug);
      if (contentType !== undefined) marketingContent.set('contentType', contentType);
      if (content !== undefined) marketingContent.set('content', content);
      if (excerpt !== undefined) marketingContent.set('excerpt', excerpt);
      if (featuredImage !== undefined) marketingContent.set('featuredImage', featuredImage);
      if (seo !== undefined) marketingContent.set('seo', seo);
      if (tags !== undefined) marketingContent.set('tags', tags);
      if (categories !== undefined) marketingContent.set('categories', categories);
      if (isFeatured !== undefined) marketingContent.set('isFeatured', isFeatured);
      if (sortOrder !== undefined) marketingContent.set('sortOrder', sortOrder);
      if (language !== undefined) marketingContent.set('language', language);
      
      if (!contentId) {
        marketingContent.set('author', user);
        marketingContent.set('viewCount', 0);
      }

      if (organizationId) {
        marketingContent.set('organization', organization);
      }

      if (status !== undefined) {
        const currentStatus = marketingContent.get('status');
        marketingContent.set('status', status);
        
        if (status === 'published' && currentStatus !== 'published') {
          marketingContent.set('publishedAt', new Date());
        }
      }

      if (scheduledAt !== undefined) {
        marketingContent.set('scheduledAt', new Date(scheduledAt));
      }

      await marketingContent.save(null, { useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', contentId ? 'marketing.content_updated' : 'marketing.content_created');
      log.set('targetType', 'MarketingContent');
      log.set('targetId', marketingContent.id);
      log.set('actor', user);
      if (organizationId) {
        log.set('organizationId', organizationId);
      }
      log.set('details', {
        title,
        contentType,
        status
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        contentId: marketingContent.id,
        message: contentId ? 'Content updated successfully' : 'Content created successfully'
      };

    } catch (error) {
      console.error('Upsert marketing content error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message);
    }
  }));

  // Get marketing content (public view)
  Parse.Cloud.define('getPublicMarketingContent', async (request) => {
    const { slug, contentType, organizationId, page = 1, limit = 10, tags, language = 'en' } = request.params;

    try {
      const MarketingContent = Parse.Object.extend('MarketingContent');
      const query = new Parse.Query(MarketingContent);

      query.equalTo('status', 'published');
      
      if (slug) {
        query.equalTo('slug', slug);
      }
      
      if (contentType) {
        query.equalTo('contentType', contentType);
      }
      
      if (organizationId) {
        query.equalTo('organization', {
          __type: 'Pointer',
          className: 'Organization',
          objectId: organizationId
        });
      }
      
      if (tags && tags.length > 0) {
        query.containsAll('tags', tags);
      }
      
      query.equalTo('language', language);
      
      query.descending('isFeatured');
      query.ascending('sortOrder');
      query.descending('publishedAt');
      
      query.include('author');
      query.include('organization');
      query.limit(limit);
      query.skip((page - 1) * limit);

      const [results, total] = await Promise.all([
        query.find({ useMasterKey: true }),
        query.count({ useMasterKey: true })
      ]);

      if (slug && results.length > 0) {
        const content = results[0];
        content.increment('viewCount');
        await content.save(null, { useMasterKey: true });
      }

      const contents = results.map(content => ({
        id: content.id,
        title: content.get('title'),
        slug: content.get('slug'),
        contentType: content.get('contentType'),
        content: content.get('content'),
        excerpt: content.get('excerpt'),
        featuredImage: content.get('featuredImage'),
        seo: content.get('seo'),
        tags: content.get('tags') || [],
        categories: content.get('categories') || [],
        author: {
          id: content.get('author').id,
          name: `${content.get('author').get('firstName') || ''} ${content.get('author').get('lastName') || ''}`.trim(),
          email: content.get('author').get('email')
        },
        organization: content.get('organization') ? {
          id: content.get('organization').id,
          name: content.get('organization').get('name')
        } : null,
        publishedAt: content.get('publishedAt'),
        viewCount: content.get('viewCount'),
        isFeatured: content.get('isFeatured'),
        language: content.get('language')
      }));

      return {
        success: true,
        contents: slug ? contents[0] : contents,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      console.error('Get public marketing content error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message);
    }
  });

  // Get marketing content (admin view)
  Parse.Cloud.define('getAdminMarketingContent', withOrganizationContext(async (request) => {
    const { user, organization, organizationId } = request;
    const { contentId, status, contentType, page = 1, limit = 20 } = request.params;

    try {
      const MarketingContent = Parse.Object.extend('MarketingContent');
      const query = new Parse.Query(MarketingContent);

      if (contentId) {
        query.equalTo('objectId', contentId);
      }

      if (organizationId) {
        query.equalTo('organization', organization);
      }

      if (status) {
        query.equalTo('status', status);
      }

      if (contentType) {
        query.equalTo('contentType', contentType);
      }

      query.include('author');
      query.include('organization');
      query.descending('createdAt');
      query.limit(limit);
      query.skip((page - 1) * limit);

      const [results, total] = await Promise.all([
        query.find({ useMasterKey: true }),
        query.count({ useMasterKey: true })
      ]);

      const contents = results.map(content => ({
        id: content.id,
        title: content.get('title'),
        slug: content.get('slug'),
        contentType: content.get('contentType'),
        status: content.get('status'),
        content: content.get('content'),
        excerpt: content.get('excerpt'),
        featuredImage: content.get('featuredImage'),
        seo: content.get('seo'),
        tags: content.get('tags') || [],
        categories: content.get('categories') || [],
        author: {
          id: content.get('author').id,
          name: `${content.get('author').get('firstName') || ''} ${content.get('author').get('lastName') || ''}`.trim(),
          email: content.get('author').get('email')
        },
        organization: content.get('organization') ? {
          id: content.get('organization').id,
          name: content.get('organization').get('name')
        } : null,
        publishedAt: content.get('publishedAt'),
        scheduledAt: content.get('scheduledAt'),
        viewCount: content.get('viewCount'),
        isFeatured: content.get('isFeatured'),
        sortOrder: content.get('sortOrder'),
        language: content.get('language'),
        createdAt: content.get('createdAt'),
        updatedAt: content.get('updatedAt')
      }));

      return {
        success: true,
        contents: contentId ? contents[0] : contents,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      console.error('Get admin marketing content error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message);
    }
  }));

  // Delete marketing content
  Parse.Cloud.define('deleteMarketingContent', withOrganizationContext(async (request) => {
    const { user, organization, organizationId } = request;
    const { contentId } = request.params;

    if (!contentId) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Content ID is required');
    }

    try {
      const MarketingContent = Parse.Object.extend('MarketingContent');
      const query = new Parse.Query(MarketingContent);
      const content = await query.get(contentId, { useMasterKey: true });

      if (!content) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Content not found');
      }

      if (content.get('organization')?.id !== organizationId) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Content does not belong to the specified organization');
      }

      await content.destroy({ useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', 'marketing.content_deleted');
      log.set('targetType', 'MarketingContent');
      log.set('targetId', contentId);
      log.set('actor', user);
      if (organizationId) {
        log.set('organizationId', organizationId);
      }
      log.set('details', {
        title: content.get('title'),
        contentType: content.get('contentType')
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: 'Content deleted successfully'
      };

    } catch (error) {
      console.error('Delete marketing content error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message);
    }
  }));

  // Get signup requests (admin)
  Parse.Cloud.define('getSignupRequests', async (request) => {
    const { user } = request;
    const { status, page = 1, limit = 20, searchQuery } = request.params;

    if (!user || user.get('isSystemAdmin') !== true) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can view signup requests');
    }

    try {
      const SignupRequest = Parse.Object.extend('SignupRequest');
      const query = new Parse.Query(SignupRequest);

      if (status) {
        query.equalTo('status', status);
      }

      if (searchQuery) {
        const emailQuery = new Parse.Query(SignupRequest);
        emailQuery.contains('email', searchQuery.toLowerCase());
        
        const orgQuery = new Parse.Query(SignupRequest);
        orgQuery.contains('organizationName', searchQuery);
        
        const nameQuery = new Parse.Query(SignupRequest);
        nameQuery.contains('firstName', searchQuery);
        
        query._orQuery([emailQuery, orgQuery, nameQuery]);
      }

      query.include('approvedBy');
      query.include('createdOrganization');
      query.descending('createdAt');
      query.limit(limit);
      query.skip((page - 1) * limit);

      const [results, total] = await Promise.all([
        query.find({ useMasterKey: true }),
        query.count({ useMasterKey: true })
      ]);

      const requests = results.map(request => ({
        id: request.id,
        email: request.get('email'),
        organizationName: request.get('organizationName'),
        firstName: request.get('firstName'),
        lastName: request.get('lastName'),
        phoneNumber: request.get('phoneNumber'),
        companySize: request.get('companySize'),
        industry: request.get('industry'),
        useCase: request.get('useCase'),
        status: request.get('status'),
        approvedBy: request.get('approvedBy') ? {
          id: request.get('approvedBy').id,
          email: request.get('approvedBy').get('email')
        } : null,
        createdOrganization: request.get('createdOrganization') ? {
          id: request.get('createdOrganization').id,
          name: request.get('createdOrganization').get('name')
        } : null,
        approvedAt: request.get('approvedAt'),
        rejectedAt: request.get('rejectedAt'),
        rejectionReason: request.get('rejectionReason'),
        referralSource: request.get('referralSource'),
        ipAddress: request.get('ipAddress'),
        geoLocation: request.get('geoLocation'),
        createdAt: request.get('createdAt')
      }));

      return {
        success: true,
        requests,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      console.error('Get signup requests error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message);
    }
  });

  // Approve signup request
  Parse.Cloud.define('approveSignupRequest', async (request) => {
    const { user } = request;
    const { requestId } = request.params;

    if (!user || user.get('isSystemAdmin') !== true) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can approve signup requests');
    }

    if (!requestId) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Request ID is required');
    }

    try {
      const SignupRequest = Parse.Object.extend('SignupRequest');
      const signupRequest = await new Parse.Query(SignupRequest).get(requestId, { useMasterKey: true });

      if (!signupRequest) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Signup request not found');
      }

      if (signupRequest.get('status') !== 'pending') {
        throw new Parse.Error(Parse.Error.INVALID_STATUS, 'Signup request is not in pending status');
      }

      signupRequest.set('status', 'approved');
      signupRequest.set('approvedBy', user);
      signupRequest.set('approvedAt', new Date());
      await signupRequest.save(null, { useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', 'signup.request_approved');
      log.set('targetType', 'SignupRequest');
      log.set('targetId', requestId);
      log.set('actor', user);
      log.set('details', {
        email: signupRequest.get('email'),
        organizationName: signupRequest.get('organizationName')
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: 'Signup request approved successfully',
        signupRequest: signupRequest.toJSON()
      };

    } catch (error) {
      console.error('Approve signup request error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message);
    }
  });

  // Reject signup request
  Parse.Cloud.define('rejectSignupRequest', async (request) => {
    const { user } = request;
    const { requestId, rejectionReason } = request.params;

    if (!user || user.get('isSystemAdmin') !== true) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can reject signup requests');
    }

    if (!requestId) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Request ID is required');
    }

    try {
      const SignupRequest = Parse.Object.extend('SignupRequest');
      const signupRequest = await new Parse.Query(SignupRequest).get(requestId, { useMasterKey: true });

      if (!signupRequest) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Signup request not found');
      }

      if (signupRequest.get('status') !== 'pending') {
        throw new Parse.Error(Parse.Error.INVALID_STATUS, 'Signup request is not in pending status');
      }

      signupRequest.set('status', 'rejected');
      signupRequest.set('rejectedBy', user);
      signupRequest.set('rejectedAt', new Date());
      signupRequest.set('rejectionReason', rejectionReason);
      await signupRequest.save(null, { useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', 'signup.request_rejected');
      log.set('targetType', 'SignupRequest');
      log.set('targetId', requestId);
      log.set('actor', user);
      log.set('details', {
        email: signupRequest.get('email'),
        organizationName: signupRequest.get('organizationName'),
        rejectionReason: rejectionReason
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: 'Signup request rejected successfully'
      };

    } catch (error) {
      console.error('Reject signup request error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message);
    }
  });

  // Activate organization (from signup)
  Parse.Cloud.define("activateOrganizationFromSignup", async (request) => {
    const { user } = request; // System Admin from context.
    const { signupRequestId } = request.params;

    if (!user || user.get('isSystemAdmin') !== true) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can activate organizations from signup');
    }

    if (!signupRequestId) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Signup request ID is required');
    }

    try {
      const SignupRequest = Parse.Object.extend('SignupRequest');
      const signupRequest = await new Parse.Query(SignupRequest).get(signupRequestId, { useMasterKey: true });

      if (!signupRequest) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Signup request not found');
      }

      if (signupRequest.get('status') !== 'approved') {
        throw new Parse.Error(Parse.Error.INVALID_STATUS, 'Signup request is not in approved status');
      }

      const Organization = Parse.Object.extend('Organization');
      const existingOrgQuery = new Parse.Query(Organization);
      existingOrgQuery.equalTo('signupRequest', signupRequest);
      const existingOrg = await existingOrgQuery.first({ useMasterKey: true });

      if (existingOrg) {
        throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'Organization already created for this signup request');
      }

      const org = new Organization();
      org.set('name', signupRequest.get('organizationName'));
      org.set('contactEmail', signupRequest.get('email'));
      org.set('contactPhone', signupRequest.get('phoneNumber') || '');
      org.set('status', 'active');
      org.set('planType', 'free'); // Default to free plan
      org.set('owner', { __type: 'Pointer', className: '_User', objectId: signupRequest.get('ownerUserId') || signupRequest.get('user')?.id }); // Link to the user who made the request
      org.set('industry', signupRequest.get('industry'));
      org.set('companySize', signupRequest.get('companySize'));
      org.set('useCase', signupRequest.get('useCase'));
      org.set('referralSource', signupRequest.get('referralSource'));
      org.set('signupRequest', signupRequest); // Link back to the signup request

      // Add default settings/metadata
      org.set("signupMetadata", {
        ipAddress: signupRequest.get('ipAddress'),
        geoLocation: signupRequest.get('geoLocation'),
        userAgent: request.headers['user-agent'] // Capture current user agent
      });

      await org.save(null, { useMasterKey: true });

      signupRequest.set('status', 'activated');
      signupRequest.set('createdOrganization', org);
      await signupRequest.save(null, { useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', 'organization.activated_from_signup');
      log.set('targetType', 'Organization');
      log.set('targetId', org.id);
      log.set('actor', user);
      log.set('details', {
        organizationName: org.get('name'),
        signupRequestId: signupRequestId,
        ownerEmail: signupRequest.get('email')
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: 'Organization activated successfully',
        organizationId: org.id
      };

    } catch (error) {
      console.error('Activate organization from signup error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message);
    }
  });

  // Update organization signup settings
  Parse.Cloud.define("updateOrganizationSignupSettings", async (request) => {
    const { user } = request;
    const { settings } = request.params;

    if (!user || user.get('isSystemAdmin') !== true) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only system administrators can update signup settings');
    }

    if (!settings || typeof settings !== 'object') {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Settings object is required');
    }

    try {
      const PlatformConfig = Parse.Object.extend('PlatformConfig');
      const query = new Parse.Query(PlatformConfig);
      let platformConfig = await query.first({ useMasterKey: true });

      if (!platformConfig) {
        platformConfig = new PlatformConfig();
      }

      const currentSettings = platformConfig.get('signupSettings') || {};
      platformConfig.set('signupSettings', {
        ...currentSettings,
        ...settings
      });

      await platformConfig.save(null, { useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', 'platform.signup_settings_updated');
      log.set('targetType', 'PlatformConfig');
      log.set('targetId', platformConfig.id);
      log.set('actor', user);
      log.set('details', {
        updatedSettings: settings
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: 'Signup settings updated successfully',
        updatedSettings: platformConfig.get('signupSettings')
      };
    } catch (error) {
      console.error("Error updating organization signup settings:", error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, error.message);
    }
  });
};