// Dashboard Utilities
// Shared helper functions used across dashboard modules

const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware');

/**
 * Helper function to check user organization access
 * @param {Parse.User} user - The user to check
 * @param {string} organizationId - The organization ID
 * @returns {Promise<boolean>} - Whether user has access
 */
async function checkUserOrgAccess(user, organizationId) {
  if (user.get('isSystemAdmin')) {
    return true;
  }

  const OrgRole = Parse.Object.extend('OrgRole');
  const query = new Parse.Query(OrgRole);
  query.equalTo('user', user);
  query.equalTo('organization', {
    __type: 'Pointer',
    className: 'Organization',
    objectId: organizationId
  });
  query.equalTo('isActive', true);
  
  const role = await query.first({ useMasterKey: true });
  return !!role;
}

/**
 * Helper function to calculate growth percentage
 * @param {number} total - Total count
 * @param {number} active - Active count
 * @returns {number} - Growth percentage
 */
function calculateGrowthPercentage(total, active) {
  if (total === 0) return 0;
  return Math.round((active / total) * 100);
}

/**
 * Helper function to create organization pointer
 * @param {string} organizationId - The organization ID
 * @returns {Object} - Parse pointer object
 */
function createOrgPointer(organizationId) {
  return {
    __type: 'Pointer',
    className: 'Organization',
    objectId: organizationId
  };
}

/**
 * Helper function to parse time range into days
 * @param {string} timeRange - Time range string (7d, 30d, 90d)
 * @returns {number} - Number of days
 */
function parseTimeRangeToDays(timeRange) {
  switch (timeRange) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    default: return 30;
  }
}

/**
 * Helper function to calculate date range
 * @param {string} timeRange - Time range string
 * @returns {Date} - Start date
 */
function calculateStartDate(timeRange) {
  const now = new Date();
  const startDate = new Date();
  
  switch (timeRange) {
    case '1h':
      startDate.setHours(now.getHours() - 1);
      break;
    case '24h':
      startDate.setDate(now.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    default:
      startDate.setDate(now.getDate() - 1);
  }
  
  return startDate;
}

/**
 * Helper function to generate date range array
 * @param {number} days - Number of days
 * @returns {Array} - Array of date objects
 */
function generateDateRange(days) {
  const dates = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    dates.push({ date, nextDate });
  }
  
  return dates;
}

/**
 * Standard error handler for dashboard functions
 * @param {Error} error - The error object
 * @param {string} operation - The operation that failed
 * @param {Object} fallbackData - Fallback data to return
 * @returns {Object} - Standardized error response
 */
function handleDashboardError(error, operation, fallbackData = {}) {
  console.error(`Dashboard ${operation} error:`, error);
  
  return {
    success: false,
    error: error.message,
    ...fallbackData
  };
}

/**
 * Standard success response for dashboard functions
 * @param {Object} data - The data to return
 * @returns {Object} - Standardized success response
 */
function createSuccessResponse(data) {
  return {
    success: true,
    ...data
  };
}

module.exports = {
  withOrganizationContext,
  checkUserOrgAccess,
  calculateGrowthPercentage,
  createOrgPointer,
  parseTimeRangeToDays,
  calculateStartDate,
  generateDateRange,
  handleDashboardError,
  createSuccessResponse
};