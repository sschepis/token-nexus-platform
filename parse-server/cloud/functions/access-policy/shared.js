/* eslint-disable max-nested-callbacks */
/* global Parse */

// Shared Parse Object extensions for access policy management
const AccessPolicy = Parse.Object.extend('AccessPolicy');
const PolicyRule = Parse.Object.extend('PolicyRule');

// Helper function to evaluate policy rules
async function evaluatePolicyRules(rules, { user, resource, action, context }) {
  for (const rule of rules) {
    const match = await evaluateRule(rule, { user, resource, action, context });

    if (match) {
      return {
        allowed: rule.effect === 'allow',
        rule: rule,
      };
    }
  }

  return { allowed: false, rule: null };
}

// Helper function to evaluate rule conditions
async function evaluateConditions(conditions, { user, context }) {
  try {
    for (const condition of conditions) {
      switch (condition.type) {
        case 'role':
          const userRoles = await Parse.Cloud.run(
            'checkUserRole',
            { userId: user.id },
            { useMasterKey: true }
          );

          if (!userRoles.roles.includes(condition.value)) {
            return false;
          }

          break;

        case 'time':
          const now = new Date();
          const timeCondition = new Date(condition.value);

          if (condition.operator === 'before' && now >= timeCondition) {
            return false;
          }

          if (condition.operator === 'after' && now <= timeCondition) {
            return false;
          }

          break;

        case 'ip':
          const clientIp = context.ip || context.request?.ip;

          if (!clientIp || !isIpInRange(clientIp, condition.value)) {
            return false;
          }

          break;

        case 'custom':
          // Custom condition evaluation could be implemented here
          break;
      }
    }

    return true;
  } catch (error) {
    console.error('Error evaluating conditions:', error);

    return false;
  }
}

// Helper function to check if IP is in range
function isIpInRange(ip, range) {
  // Simple IP range check - could be enhanced for proper CIDR support
  const [rangeIp, rangeMask] = range.split('/');
  const mask = parseInt(rangeMask, 10);

  return (ipToNumber(ip) >>> (32 - mask)) === (ipToNumber(rangeIp) >>> (32 - mask));
}

// Helper function to convert IP to number
function ipToNumber(ip) {
  return ip.split('.').reduce((total, octet) => (total << 8) + parseInt(octet, 10), 0) >>> 0;
}

// Helper function to evaluate individual rule
async function evaluateRule(rule, { user, resource, action, context }) {
  // Check resource match
  if (rule.resource && rule.resource !== resource) {
    return false;
  }

  // Check action match
  if (rule.action && rule.action !== action) {
    return false;
  }

  // Check conditions
  if (rule.conditions && rule.conditions.length > 0) {
    const conditionsMatch = await evaluateConditions(rule.conditions, { user, context });

    if (!conditionsMatch) {
      return false;
    }
  }

  return true;
}

module.exports = {
  AccessPolicy,
  PolicyRule,
  evaluatePolicyRules,
  evaluateConditions,
  isIpInRange,
  ipToNumber,
  evaluateRule
};