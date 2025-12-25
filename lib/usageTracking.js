/**
 * API Usage Tracking for Sovereign Intelligence
 * Tracks API usage per user/organization for billing and analytics
 * Created: December 25, 2025
 */

// In-memory usage store (use Redis/database in production)
const usageStore = new Map();

// Usage categories and their costs (in credits)
export const USAGE_COSTS = {
  // Report generation
  report_reform: 100,
  report_clinical: 150,
  report_defense: 200,
  report_enterprise: 250,
  report_manufacturing: 100,
  report_logistics: 100,
  report_energy: 100,
  report_insurance: 100,
  report_pharma: 150,
  report_universal: 100,
  
  // API calls
  api_translate: 5,
  api_chat: 10,
  api_query: 2,
  api_export: 20,
  api_finalize: 10,
  
  // Storage (per MB)
  storage_report: 1,
  storage_attachment: 2,
};

// Plan limits (monthly credits)
export const PLAN_LIMITS = {
  free: 500,
  starter: 5000,
  professional: 25000,
  enterprise: 100000,
  government: 1000000,
};

/**
 * Get user's usage key
 */
function getUserKey(userId, orgId) {
  const month = new Date().toISOString().substring(0, 7); // YYYY-MM
  return `${orgId || userId}:${month}`;
}

/**
 * Track API usage
 */
export async function trackUsage(userId, orgId, category, count = 1) {
  const key = getUserKey(userId, orgId);
  const cost = (USAGE_COSTS[category] || 1) * count;
  
  if (!usageStore.has(key)) {
    usageStore.set(key, {
      userId,
      orgId,
      month: new Date().toISOString().substring(0, 7),
      totalCredits: 0,
      breakdown: {},
      events: [],
    });
  }
  
  const usage = usageStore.get(key);
  usage.totalCredits += cost;
  usage.breakdown[category] = (usage.breakdown[category] || 0) + cost;
  usage.events.push({
    category,
    cost,
    count,
    timestamp: new Date().toISOString(),
  });
  
  // Keep only last 1000 events
  if (usage.events.length > 1000) {
    usage.events = usage.events.slice(-1000);
  }
  
  return {
    creditsUsed: cost,
    totalCredits: usage.totalCredits,
  };
}

/**
 * Get current usage for user/org
 */
export function getUsage(userId, orgId) {
  const key = getUserKey(userId, orgId);
  return usageStore.get(key) || {
    userId,
    orgId,
    month: new Date().toISOString().substring(0, 7),
    totalCredits: 0,
    breakdown: {},
    events: [],
  };
}

/**
 * Check if user has quota remaining
 */
export function checkQuota(userId, orgId, userPlan = 'free', requiredCredits = 0) {
  const usage = getUsage(userId, orgId);
  const limit = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;
  const remaining = limit - usage.totalCredits;
  
  return {
    allowed: remaining >= requiredCredits,
    remaining,
    limit,
    used: usage.totalCredits,
    percentUsed: Math.round((usage.totalCredits / limit) * 100),
  };
}

/**
 * Get usage summary for billing
 */
export function getUsageSummary(userId, orgId) {
  const usage = getUsage(userId, orgId);
  
  return {
    month: usage.month,
    totalCredits: usage.totalCredits,
    breakdown: usage.breakdown,
    topCategories: Object.entries(usage.breakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, credits]) => ({ category, credits })),
    recentEvents: usage.events.slice(-10),
  };
}

/**
 * Reset usage (for new billing period or admin action)
 */
export function resetUsage(userId, orgId) {
  const key = getUserKey(userId, orgId);
  usageStore.delete(key);
}

/**
 * Middleware to track and enforce usage limits
 */
export function withUsageTracking(handler, category, planField = 'x-user-plan') {
  return async function usageTrackedHandler(request, context) {
    const userId = request.headers.get('x-user-id') || 'anonymous';
    const orgId = request.headers.get('x-org-id');
    const userPlan = request.headers.get(planField) || 'free';
    
    // Check quota before processing
    const requiredCredits = USAGE_COSTS[category] || 1;
    const quota = checkQuota(userId, orgId, userPlan, requiredCredits);
    
    if (!quota.allowed) {
      return new Response(
        JSON.stringify({
          error: 'QUOTA_EXCEEDED',
          message: 'Your usage quota has been exceeded for this billing period',
          usage: {
            used: quota.used,
            limit: quota.limit,
            remaining: quota.remaining,
          },
          upgrade: 'Visit /pricing to upgrade your plan',
        }),
        { 
          status: 402, 
          headers: { 
            'Content-Type': 'application/json',
            'X-Usage-Remaining': quota.remaining.toString(),
            'X-Usage-Limit': quota.limit.toString(),
          },
        }
      );
    }
    
    // Process request
    const response = await handler(request, context);
    
    // Track usage after successful response
    if (response.ok) {
      const tracked = await trackUsage(userId, orgId, category);
      
      // Add usage headers to response
      response.headers.set('X-Credits-Used', tracked.creditsUsed.toString());
      response.headers.set('X-Credits-Total', tracked.totalCredits.toString());
      response.headers.set('X-Usage-Remaining', (quota.limit - tracked.totalCredits).toString());
    }
    
    return response;
  };
}

export default {
  trackUsage,
  getUsage,
  checkQuota,
  getUsageSummary,
  resetUsage,
  withUsageTracking,
  USAGE_COSTS,
  PLAN_LIMITS,
};
