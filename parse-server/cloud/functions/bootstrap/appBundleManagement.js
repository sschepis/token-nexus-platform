module.exports = Parse => {
  // Helper function to check if a user has a specific role
  async function checkUserRole(user, roleName) {
    if (!user) return false;
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo('name', roleName);
    roleQuery.equalTo('users', user);
    const role = await roleQuery.first({ useMasterKey: true });
    return !!role;
  }

  // Create or update app bundle
  Parse.Cloud.define('createOrUpdateAppBundle', async (request) => {
    const { user } = request;
    const { 
      appId, 
      name, 
      description, 
      category, 
      version, 
      bundleUrl,
      permissions,
      configuration,
      screenshots,
      icon,
      developer,
      supportEmail,
      website,
      documentation
    } = request.params;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    const hasPermission = user.get('isSystemAdmin') || 
                           await checkUserRole(user, 'app_developer');
    
    if (!hasPermission) {
      throw new Error('Insufficient permissions to manage app bundles');
    }

    try {
      const AppBundle = Parse.Object.extend('AppBundle');
      let bundle;

      if (appId) {
        const query = new Parse.Query(AppBundle);
        bundle = await query.get(appId, { useMasterKey: true });
        
        if (!bundle) {
          throw new Error('App bundle not found');
        }

        if (!user.get('isSystemAdmin') && bundle.get('developer') !== user.id) {
          throw new Error('You can only update your own app bundles');
        }
      } else {
        bundle = new AppBundle();
        bundle.set('developer', user.id);
        bundle.set('status', 'draft');
        bundle.set('currentVersion', version || '1.0.0');
      }

      if (name) bundle.set('name', name);
      if (description) bundle.set('description', description);
      if (category) bundle.set('category', category);
      if (bundleUrl) bundle.set('bundleUrl', bundleUrl);
      if (permissions) bundle.set('permissions', permissions);
      if (configuration) bundle.set('configuration', configuration);
      if (screenshots) bundle.set('screenshots', screenshots);
      if (icon) bundle.set('icon', icon);
      if (supportEmail) bundle.set('supportEmail', supportEmail);
      if (website) bundle.set('website', website);
      if (documentation) bundle.set('documentation', documentation);

      if (version && (!appId || version !== bundle.get('currentVersion'))) {
        const AppVersion = Parse.Object.extend('AppVersion');
        const versionEntry = new AppVersion();
        
        versionEntry.set('appBundle', bundle);
        versionEntry.set('version', version);
        versionEntry.set('bundleUrl', bundleUrl);
        versionEntry.set('releaseNotes', request.params.releaseNotes || '');
        versionEntry.set('status', 'pending_review');
        versionEntry.set('submittedBy', user);
        versionEntry.set('submittedAt', new Date());
        
        await versionEntry.save(null, { useMasterKey: true });
        
        bundle.set('currentVersion', version);
        bundle.set('latestVersionId', versionEntry.id);
      }

      await bundle.save(null, { useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', appId ? 'app_bundle.updated' : 'app_bundle.created');
      log.set('targetType', 'AppBundle');
      log.set('targetId', bundle.id);
      log.set('actor', user);
      log.set('details', {
        bundleName: name,
        version,
        status: bundle.get('status')
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: appId ? 'App bundle updated successfully' : 'App bundle created successfully',
        bundleId: bundle.id
      };

    } catch (error) {
      console.error('Create/update app bundle error:', error);
      throw error;
    }
  });

  // Submit app for review
  Parse.Cloud.define('submitAppForReview', async (request) => {
    const { user } = request;
    const { bundleId, versionId, submissionNotes } = request.params;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    if (!bundleId) {
      throw new Error('Bundle ID is required');
    }

    try {
      const AppBundle = Parse.Object.extend('AppBundle');
      const query = new Parse.Query(AppBundle);
      const bundle = await query.get(bundleId, { useMasterKey: true });

      if (!bundle) {
        throw new Error('App bundle not found');
      }

      if (!user.get('isSystemAdmin') && bundle.get('developer') !== user.id) {
        throw new Error('You can only submit your own app bundles');
      }

      let version;
      if (versionId) {
        const AppVersion = Parse.Object.extend('AppVersion');
        const versionQuery = new Parse.Query(AppVersion);
        version = await versionQuery.get(versionId, { useMasterKey: true });
        
        if (!version || version.get('appBundle').id !== bundleId) {
          throw new Error('Version not found or does not belong to this bundle');
        }
      } else {
        const latestVersionId = bundle.get('latestVersionId');
        if (!latestVersionId) {
          throw new Error('No version available to submit');
        }
        
        const AppVersion = Parse.Object.extend('AppVersion');
        const versionQuery = new Parse.Query(AppVersion);
        version = await versionQuery.get(latestVersionId, { useMasterKey: true });
      }

      if (version.get('status') !== 'pending_review' && version.get('status') !== 'rejected') {
        throw new Error('This version cannot be submitted for review');
      }

      version.set('status', 'in_review');
      version.set('submittedAt', new Date());
      version.set('submissionNotes', submissionNotes || '');
      await version.save(null, { useMasterKey: true });

      bundle.set('status', 'in_review');
      await bundle.save(null, { useMasterKey: true });

      const AppReview = Parse.Object.extend('AppReview');
      const review = new AppReview();
      
      review.set('appBundle', bundle);
      review.set('appVersion', version);
      review.set('status', 'pending');
      review.set('submittedBy', user);
      review.set('submittedAt', new Date());
      review.set('submissionNotes', submissionNotes || '');
      
      await review.save(null, { useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', 'app_bundle.submitted_for_review');
      log.set('targetType', 'AppBundle');
      log.set('targetId', bundleId);
      log.set('actor', user);
      log.set('details', {
        bundleName: bundle.get('name'),
        version: version.get('version'),
        reviewId: review.id
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: 'App submitted for review successfully',
        reviewId: review.id
      };

    } catch (error) {
      console.error('Submit app for review error:', error);
      throw error;
    }
  });

  // Approve app version
  Parse.Cloud.define('approveAppVersion', async (request) => {
    const { user } = request;
    const { reviewId, comments } = request.params;

    if (!user || !user.get('isSystemAdmin')) {
      throw new Error('Only system administrators can approve app versions');
    }

    if (!reviewId) {
      throw new Error('Review ID is required');
    }

    try {
      const AppReview = Parse.Object.extend('AppReview');
      const query = new Parse.Query(AppReview);
      query.include(['appBundle', 'appVersion']);
      const review = await query.get(reviewId, { useMasterKey: true });

      if (!review) {
        throw new Error('Review not found');
      }

      if (review.get('status') !== 'pending') {
        throw new Error('This review has already been processed');
      }

      const bundle = review.get('appBundle');
      const version = review.get('appVersion');

      review.set('status', 'approved');
      review.set('reviewedBy', user);
      review.set('reviewedAt', new Date());
      review.set('reviewComments', comments || '');
      await review.save(null, { useMasterKey: true });

      version.set('status', 'approved');
      version.set('approvedAt', new Date());
      version.set('approvedBy', user.id);
      await version.save(null, { useMasterKey: true });

      bundle.set('status', 'approved');
      bundle.set('lastApprovedVersion', version.get('version'));
      bundle.set('lastApprovedAt', new Date());
      await bundle.save(null, { useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', 'app_version.approved');
      log.set('targetType', 'AppVersion');
      log.set('targetId', version.id);
      log.set('actor', user);
      log.set('details', {
        bundleName: bundle.get('name'),
        version: version.get('version'),
        reviewId: review.id
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: 'App version approved successfully'
      };

    } catch (error) {
      console.error('Approve app version error:', error);
      throw error;
    }
  });

  // Reject app version
  Parse.Cloud.define('rejectAppVersion', async (request) => {
    const { user } = request;
    const { reviewId, reason, comments } = request.params;

    if (!user || !user.get('isSystemAdmin')) {
      throw new Error('Only system administrators can reject app versions');
    }

    if (!reviewId || !reason) {
      throw new Error('Review ID and rejection reason are required');
    }

    try {
      const AppReview = Parse.Object.extend('AppReview');
      const query = new Parse.Query(AppReview);
      query.include(['appBundle', 'appVersion']);
      const review = await query.get(reviewId, { useMasterKey: true });

      if (!review) {
        throw new Error('Review not found');
      }

      if (review.get('status') !== 'pending') {
        throw new Error('This review has already been processed');
      }

      const bundle = review.get('appBundle');
      const version = review.get('appVersion');

      review.set('status', 'rejected');
      review.set('reviewedBy', user);
      review.set('reviewedAt', new Date());
      review.set('rejectionReason', reason);
      review.set('reviewComments', comments || '');
      await review.save(null, { useMasterKey: true });

      version.set('status', 'rejected');
      version.set('rejectedAt', new Date());
      version.set('rejectedBy', user.id);
      version.set('rejectionReason', reason);
      await version.save(null, { useMasterKey: true });

      bundle.set('status', 'rejected');
      await bundle.save(null, { useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', 'app_version.rejected');
      log.set('targetType', 'AppVersion');
      log.set('targetId', version.id);
      log.set('actor', user);
      log.set('details', {
        bundleName: bundle.get('name'),
        version: version.get('version'),
        reviewId: review.id,
        reason
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: 'App version rejected'
      };

    } catch (error) {
      console.error('Reject app version error:', error);
      throw error;
    }
  });

  // Publish app version
  Parse.Cloud.define('publishAppVersion', async (request) => {
    const { user } = request;
    const { bundleId, versionId } = request.params;

    if (!user || !user.get('isSystemAdmin')) {
      throw new Error('Only system administrators can publish app versions');
    }

    if (!bundleId) {
      throw new Error('Bundle ID is required');
    }

    try {
      const AppBundle = Parse.Object.extend('AppBundle');
      const bundleQuery = new Parse.Query(AppBundle);
      const bundle = await bundleQuery.get(bundleId, { useMasterKey: true });

      if (!bundle) {
        throw new Error('App bundle not found');
      }

      let version;
      if (versionId) {
        const AppVersion = Parse.Object.extend('AppVersion');
        const versionQuery = new Parse.Query(AppVersion);
        version = await versionQuery.get(versionId, { useMasterKey: true });
        
        if (!version || version.get('appBundle').id !== bundleId) {
          throw new Error('Version not found or does not belong to this bundle');
        }
      } else {
        const AppVersion = Parse.Object.extend('AppVersion');
        const versionQuery = new Parse.Query(AppVersion);
        versionQuery.equalTo('appBundle', bundle);
        versionQuery.equalTo('status', 'approved');
        versionQuery.descending('approvedAt');
        version = await versionQuery.first({ useMasterKey: true });
        
        if (!version) {
          throw new Error('No approved version available to publish');
        }
      }

      if (version.get('status') !== 'approved') {
        throw new Error('Only approved versions can be published');
      }

      version.set('status', 'published');
      version.set('publishedAt', new Date());
      version.set('publishedBy', user.id);
      await version.save(null, { useMasterKey: true });

      bundle.set('status', 'published');
      bundle.set('publishedVersion', version.get('version'));
      bundle.set('publishedVersionId', version.id);
      bundle.set('publishedAt', new Date());
      await bundle.save(null, { useMasterKey: true });

      const AppDefinition = Parse.Object.extend('AppDefinition');
      let appDef = await new Parse.Query(AppDefinition)
        .equalTo('appBundle', bundle)
        .first({ useMasterKey: true });

      if (!appDef) {
        appDef = new AppDefinition();
        appDef.set('appBundle', bundle);
      }

      appDef.set('name', bundle.get('name'));
      appDef.set('description', bundle.get('description'));
      appDef.set('category', bundle.get('category'));
      appDef.set('version', version.get('version'));
      appDef.set('bundleUrl', version.get('bundleUrl'));
      appDef.set('permissions', bundle.get('permissions'));
      appDef.set('configuration', bundle.get('configuration'));
      appDef.set('screenshots', bundle.get('screenshots'));
      appDef.set('icon', bundle.get('icon'));
      appDef.set('developer', bundle.get('developer'));
      appDef.set('supportEmail', bundle.get('supportEmail'));
      appDef.set('website', bundle.get('website'));
      appDef.set('documentation', bundle.get('documentation'));
      appDef.set('isActive', true);
      appDef.set('publishedAt', new Date());

      await appDef.save(null, { useMasterKey: true });

      const AuditLog = Parse.Object.extend('AuditLog');
      const log = new AuditLog();
      
      log.set('action', 'app_version.published');
      log.set('targetType', 'AppVersion');
      log.set('targetId', version.id);
      log.set('actor', user);
      log.set('details', {
        bundleName: bundle.get('name'),
        version: version.get('version'),
        appDefinitionId: appDef.id
      });
      
      await log.save(null, { useMasterKey: true });

      return {
        success: true,
        message: 'App version published successfully',
        appDefinitionId: appDef.id
      };

    } catch (error) {
      console.error('Publish app version error:', error);
      throw error;
    }
  });

  // Get app bundle details (public or developer view)
  Parse.Cloud.define('getAppBundleDetails', async (request) => {
    const { user } = request;
    const { bundleId, includeVersions = false, includeReviews = false } = request.params;

    if (!bundleId) {
      throw new Error('Bundle ID is required');
    }

    try {
      const AppBundle = Parse.Object.extend('AppBundle');
      const query = new Parse.Query(AppBundle);
      
      if (!user || (!user.get('isSystemAdmin') && !await checkUserRole(user, 'app_developer'))) {
        query.equalTo('status', 'published'); // Only show published bundles to non-admins/developers
      }

      const bundle = await query.get(bundleId, { useMasterKey: true });

      if (!bundle) {
        throw new Error('App bundle not found or not accessible');
      }

      // Populate developer info
      let developerInfo = null;
      try {
        const developerUser = await new Parse.Query(Parse.User).get(bundle.get('developer'), { useMasterKey: true });
        developerInfo = {
          id: developerUser.id,
          name: `${developerUser.get('firstName') || ''} ${developerUser.get('lastName') || ''}`.trim(),
          email: developerUser.get('email')
        };
      } catch (e) {
        console.warn('Could not fetch developer info for bundle:', bundle.id, e.message);
        developerInfo = { name: 'Unknown', email: 'unknown' };
      }
      
      const result = {
        id: bundle.id,
        name: bundle.get('name'),
        description: bundle.get('description'),
        category: bundle.get('category'),
        currentVersion: bundle.get('currentVersion'),
        status: bundle.get('status'),
        publisher: bundle.get('publisher'),
        supportEmail: bundle.get('supportEmail'),
        website: bundle.get('website'),
        documentation: bundle.get('documentation'),
        icon: bundle.get('icon'),
        screenshots: bundle.get('screenshots'),
        permissions: bundle.get('permissions'),
        configuration: bundle.get('configuration'),
        developer: developerInfo,
        publishedVersion: bundle.get('publishedVersion'),
        lastPublishedAt: bundle.get('lastPublishedAt'),
        lastApprovedVersion: bundle.get('lastApprovedVersion'),
        lastApprovedAt: bundle.get('lastApprovedAt'),
        createdAt: bundle.get('createdAt'),
        updatedAt: bundle.get('updatedAt')
      };

      if (includeVersions) {
        const AppVersion = Parse.Object.extend('AppVersion');
        const versionQuery = new Parse.Query(AppVersion);
        versionQuery.equalTo('appBundle', bundle);
        versionQuery.descending('createdAt');
        const versions = await versionQuery.find({ useMasterKey: true });
        
        result.versions = versions.map(v => ({
          id: v.id,
          version: v.get('version'),
          bundleUrl: v.get('bundleUrl'),
          releaseNotes: v.get('releaseNotes'),
          status: v.get('status'),
          submittedAt: v.get('submittedAt'),
          approvedAt: v.get('approvedAt'),
          publishedAt: v.get('publishedAt'),
          rejectedAt: v.get('rejectedAt'),
          rejectionReason: v.get('rejectionReason')
        }));
      }

      if (includeReviews) {
        const AppReview = Parse.Object.extend('AppReview');
        const reviewQuery = new Parse.Query(AppReview);
        reviewQuery.equalTo('appBundle', bundle);
        reviewQuery.include(['appVersion', 'submittedBy', 'reviewedBy']);
        reviewQuery.descending('submittedAt');
        const reviews = await reviewQuery.find({ useMasterKey: true });
        
        result.reviews = reviews.map(r => ({
          id: r.id,
          status: r.get('status'),
          submissionNotes: r.get('submissionNotes'),
          reviewComments: r.get('reviewComments'),
          rejectionReason: r.get('rejectionReason'),
          submittedAt: r.get('submittedAt'),
          reviewedAt: r.get('reviewedAt'),
          submittedBy: r.get('submittedBy') ? { id: r.get('submittedBy').id, email: r.get('submittedBy').get('email') } : null,
          reviewedBy: r.get('reviewedBy') ? { id: r.get('reviewedBy').id, email: r.get('reviewedBy').get('email') } : null,
          version: r.get('appVersion') ? r.get('appVersion').get('version') : 'N/A'
        }));
      }

      return { success: true, bundle: result };

    } catch (error) {
      console.error('getAppBundleDetails error:', error);
      throw error;
    }
  });

  // Get pending reviews for app bundles (system admin only)
  Parse.Cloud.define('getPendingReviews', async (request) => {
    const { user } = request;
    const { page = 1, limit = 20 } = request.params;

    if (!user || !user.get('isSystemAdmin')) {
      throw new Error('Only system administrators can access pending reviews');
    }

    try {
      const AppReview = Parse.Object.extend('AppReview');
      const query = new Parse.Query(AppReview);
      query.equalTo('status', 'pending');
      query.include(['appBundle', 'appVersion', 'submittedBy']);
      query.descending('submittedAt');
      query.limit(limit);
      query.skip((page - 1) * limit);

      const [reviews, total] = await Promise.all([
        query.find({ useMasterKey: true }),
        query.count({ useMasterKey: true })
      ]);

      const reviewData = reviews.map(review => {
        const bundle = review.get('appBundle');
        const version = review.get('appVersion');
        const submittedBy = review.get('submittedBy');

        return {
          id: review.id,
          bundleId: bundle ? bundle.id : null,
          bundleName: bundle ? bundle.get('name') : 'Unknown',
          bundleIcon: bundle ? bundle.get('icon') : null,
          versionId: version ? version.id : null,
          version: version ? version.get('version') : 'N/A',
          submissionNotes: review.get('submissionNotes'),
          submittedAt: review.get('submittedAt'),
          submittedBy: submittedBy ? {
            id: submittedBy.id,
            email: submittedBy.get('email'),
            name: `${submittedBy.get('firstName') || ''} ${submittedBy.get('lastName') || ''}`.trim(),
          } : null
        };
      });

      return {
        success: true,
        reviews: reviewData,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      console.error('Get pending reviews error:', error);
      throw error;
    }
  });

  // Helper function to check if a user has a specific role
  async function checkUserRole(user, roleName) {
    if (!user) return false;
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo('name', roleName);
    roleQuery.equalTo('users', user);
    const role = await roleQuery.first({ useMasterKey: true });
    return !!role;
  }
};