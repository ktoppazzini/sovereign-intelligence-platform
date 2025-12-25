/**
 * API Metering System for Sovereign Intelligence
 * Tracks usage, enforces limits, enables usage-based billing
 * Created: December 24, 2025
 */

// Usage tiers with limits
export const USAGE_TIERS = {
  free: {
    name: 'Free Trial',
    limits: {
      reportsPerMonth: 5,
      apiCallsPerMonth: 100,
      translationsPerMonth: 50,
      storageGB: 1,
      teamMembers: 1,
    },
    overageRates: null, // No overage allowed
  },
  starter: {
    name: 'Starter',
    limits: {
      reportsPerMonth: 50,
      apiCallsPerMonth: 5000,
      translationsPerMonth: 1000,
      storageGB: 10,
      teamMembers: 3,
    },
    overageRates: {
      reportsPerMonth: 5.00,      // $5 per extra report
      apiCallsPerMonth: 0.01,     // $0.01 per extra call
      translationsPerMonth: 0.05, // $0.05 per extra translation
      storageGB: 2.00,            // $2 per extra GB
    },
  },
  professional: {
    name: 'Professional',
    limits: {
      reportsPerMonth: 500,
      apiCallsPerMonth: 50000,
      translationsPerMonth: 10000,
      storageGB: 100,
      teamMembers: 10,
    },
    overageRates: {
      reportsPerMonth: 3.00,
      apiCallsPerMonth: 0.005,
      translationsPerMonth: 0.03,
      storageGB: 1.50,
    },
  },
  enterprise: {
    name: 'Enterprise',
    limits: {
      reportsPerMonth: 5000,
      apiCallsPerMonth: 500000,
      translationsPerMonth: 100000,
      storageGB: 1000,
      teamMembers: 100,
    },
    overageRates: {
      reportsPerMonth: 2.00,
      apiCallsPerMonth: 0.002,
      translationsPerMonth: 0.02,
      storageGB: 1.00,
    },
  },
  government: {
    name: 'Government',
    limits: {
      reportsPerMonth: -1, // Unlimited
      apiCallsPerMonth: -1,
      translationsPerMonth: -1,
      storageGB: -1,
      teamMembers: -1,
    },
    overageRates: null, // Custom pricing
  },
};

// Metric types for tracking
export const METRIC_TYPES = {
  REPORT_GENERATED: 'report_generated',
  API_CALL: 'api_call',
  TRANSLATION: 'translation',
  STORAGE_USED: 'storage_used',
  EXPORT_PDF: 'export_pdf',
  EXPORT_HTML: 'export_html',
  ASK_SOVEREIGN: 'ask_sovereign',
  TEAM_INVITE: 'team_invite',
  WEBHOOK_SENT: 'webhook_sent',
  DASHBOARD_VIEW: 'dashboard_view',
};

// In-memory storage (replace with database in production)
let usageData = {};
let usageHistory = [];

/**
 * Initialize usage tracking for an organization
 */
export function initializeUsage(orgId, tier = 'free') {
  if (!usageData[orgId]) {
    usageData[orgId] = {
      orgId,
      tier,
      currentPeriodStart: new Date().toISOString(),
      metrics: {
        reportsPerMonth: 0,
        apiCallsPerMonth: 0,
        translationsPerMonth: 0,
        storageGB: 0,
        teamMembers: 1,
      },
      overageCharges: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
  return usageData[orgId];
}

/**
 * Track a usage event
 */
export function trackUsage(orgId, metricType, amount = 1, metadata = {}) {
  const org = usageData[orgId] || initializeUsage(orgId);
  const timestamp = new Date().toISOString();
  
  // Map metric type to limit key
  const metricToLimit = {
    [METRIC_TYPES.REPORT_GENERATED]: 'reportsPerMonth',
    [METRIC_TYPES.API_CALL]: 'apiCallsPerMonth',
    [METRIC_TYPES.TRANSLATION]: 'translationsPerMonth',
    [METRIC_TYPES.STORAGE_USED]: 'storageGB',
    [METRIC_TYPES.EXPORT_PDF]: 'reportsPerMonth',
    [METRIC_TYPES.EXPORT_HTML]: 'reportsPerMonth',
    [METRIC_TYPES.ASK_SOVEREIGN]: 'apiCallsPerMonth',
    [METRIC_TYPES.WEBHOOK_SENT]: 'apiCallsPerMonth',
  };

  const limitKey = metricToLimit[metricType];
  
  if (limitKey && org.metrics[limitKey] !== undefined) {
    org.metrics[limitKey] += amount;
  }

  // Record in history
  const historyEntry = {
    id: `${orgId}-${Date.now()}`,
    orgId,
    metricType,
    amount,
    metadata,
    timestamp,
    limitKey,
    currentValue: org.metrics[limitKey],
  };
  
  usageHistory.push(historyEntry);
  org.lastUpdated = timestamp;

  // Calculate overage if applicable
  const tier = USAGE_TIERS[org.tier];
  if (tier && tier.limits[limitKey] !== -1 && tier.overageRates) {
    const limit = tier.limits[limitKey];
    if (org.metrics[limitKey] > limit) {
      const overage = org.metrics[limitKey] - limit;
      const rate = tier.overageRates[limitKey] || 0;
      org.overageCharges = overage * rate;
    }
  }

  return { success: true, entry: historyEntry, usage: org };
}

/**
 * Check if usage is within limits
 */
export function checkLimit(orgId, metricType, additionalAmount = 1) {
  const org = usageData[orgId] || initializeUsage(orgId);
  const tier = USAGE_TIERS[org.tier];
  
  if (!tier) return { allowed: false, reason: 'Invalid tier' };
  
  const metricToLimit = {
    [METRIC_TYPES.REPORT_GENERATED]: 'reportsPerMonth',
    [METRIC_TYPES.API_CALL]: 'apiCallsPerMonth',
    [METRIC_TYPES.TRANSLATION]: 'translationsPerMonth',
    [METRIC_TYPES.ASK_SOVEREIGN]: 'apiCallsPerMonth',
  };

  const limitKey = metricToLimit[metricType];
  if (!limitKey) return { allowed: true };

  const limit = tier.limits[limitKey];
  
  // Unlimited
  if (limit === -1) return { allowed: true, unlimited: true };
  
  const currentUsage = org.metrics[limitKey] || 0;
  const projectedUsage = currentUsage + additionalAmount;
  
  // Within limit
  if (projectedUsage <= limit) {
    return {
      allowed: true,
      currentUsage,
      limit,
      remaining: limit - currentUsage,
      percentUsed: Math.round((currentUsage / limit) * 100),
    };
  }
  
  // Over limit but overage allowed
  if (tier.overageRates && tier.overageRates[limitKey]) {
    const overageAmount = projectedUsage - limit;
    const overageCost = overageAmount * tier.overageRates[limitKey];
    return {
      allowed: true,
      isOverage: true,
      currentUsage,
      limit,
      overageAmount,
      overageCost,
      overageRate: tier.overageRates[limitKey],
    };
  }
  
  // Over limit, no overage allowed
  return {
    allowed: false,
    currentUsage,
    limit,
    reason: `${limitKey} limit exceeded. Upgrade to continue.`,
  };
}

/**
 * Get usage summary for an organization
 */
export function getUsageSummary(orgId) {
  const org = usageData[orgId] || initializeUsage(orgId);
  const tier = USAGE_TIERS[org.tier];
  
  const summary = {
    orgId,
    tier: org.tier,
    tierName: tier?.name || 'Unknown',
    currentPeriodStart: org.currentPeriodStart,
    lastUpdated: org.lastUpdated,
    metrics: {},
    overageCharges: org.overageCharges,
    totalEstimatedBill: 0,
  };

  // Calculate usage percentages and remaining
  Object.keys(org.metrics).forEach(key => {
    const current = org.metrics[key];
    const limit = tier?.limits[key] ?? 0;
    const isUnlimited = limit === -1;
    
    summary.metrics[key] = {
      current,
      limit: isUnlimited ? 'Unlimited' : limit,
      remaining: isUnlimited ? 'Unlimited' : Math.max(0, limit - current),
      percentUsed: isUnlimited ? 0 : Math.min(100, Math.round((current / limit) * 100)),
      isOverLimit: !isUnlimited && current > limit,
    };
  });

  return summary;
}

/**
 * Get usage history with filtering
 */
export function getUsageHistory(orgId, options = {}) {
  const { metricType, startDate, endDate, limit = 100 } = options;
  
  let filtered = usageHistory.filter(h => h.orgId === orgId);
  
  if (metricType) {
    filtered = filtered.filter(h => h.metricType === metricType);
  }
  
  if (startDate) {
    filtered = filtered.filter(h => new Date(h.timestamp) >= new Date(startDate));
  }
  
  if (endDate) {
    filtered = filtered.filter(h => new Date(h.timestamp) <= new Date(endDate));
  }
  
  return filtered.slice(-limit).reverse();
}

/**
 * Reset monthly usage (call on billing cycle)
 */
export function resetMonthlyUsage(orgId) {
  const org = usageData[orgId];
  if (!org) return null;
  
  org.currentPeriodStart = new Date().toISOString();
  org.metrics.reportsPerMonth = 0;
  org.metrics.apiCallsPerMonth = 0;
  org.metrics.translationsPerMonth = 0;
  org.overageCharges = 0;
  org.lastUpdated = new Date().toISOString();
  
  return org;
}

/**
 * Upgrade tier
 */
export function upgradeTier(orgId, newTier) {
  const org = usageData[orgId] || initializeUsage(orgId);
  
  if (!USAGE_TIERS[newTier]) {
    return { success: false, error: 'Invalid tier' };
  }
  
  const oldTier = org.tier;
  org.tier = newTier;
  org.lastUpdated = new Date().toISOString();
  
  return {
    success: true,
    oldTier,
    newTier,
    newLimits: USAGE_TIERS[newTier].limits,
  };
}

/**
 * Get all organizations (admin)
 */
export function getAllOrganizations() {
  return Object.values(usageData);
}

/**
 * Export usage data for billing
 */
export function exportBillingData(orgId, periodStart, periodEnd) {
  const org = usageData[orgId];
  if (!org) return null;
  
  const history = getUsageHistory(orgId, { startDate: periodStart, endDate: periodEnd, limit: 10000 });
  const tier = USAGE_TIERS[org.tier];
  
  return {
    orgId,
    tier: org.tier,
    tierName: tier?.name,
    periodStart,
    periodEnd,
    usage: org.metrics,
    limits: tier?.limits,
    overageRates: tier?.overageRates,
    totalOverageCharges: org.overageCharges,
    eventCount: history.length,
    events: history,
    generatedAt: new Date().toISOString(),
  };
}

// UI Translation keys
export const METERING_UI_KEYS = {
  title: 'API Usage & Metering',
  subtitle: 'Monitor your usage and manage limits',
  currentPeriod: 'Current Billing Period',
  reportsUsed: 'Reports Generated',
  apiCalls: 'API Calls',
  translations: 'Translations',
  storage: 'Storage Used',
  teamMembers: 'Team Members',
  remaining: 'Remaining',
  unlimited: 'Unlimited',
  overLimit: 'Over Limit',
  overageCharges: 'Overage Charges',
  upgradeNow: 'Upgrade Now',
  viewHistory: 'View History',
  exportData: 'Export Data',
  usagePercentage: 'used',
  limitReached: 'Limit Reached',
  warningThreshold: 'Approaching Limit',
  safeZone: 'Within Limits',
  perReport: 'per report',
  perCall: 'per call',
  perTranslation: 'per translation',
  perGB: 'per GB',
  resetDate: 'Resets on',
  lastUpdated: 'Last Updated',
  noUsage: 'No usage recorded yet',
  tier: 'Current Plan',
  free: 'Free Trial',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
  government: 'Government',
};

export default {
  USAGE_TIERS,
  METRIC_TYPES,
  METERING_UI_KEYS,
  initializeUsage,
  trackUsage,
  checkLimit,
  getUsageSummary,
  getUsageHistory,
  resetMonthlyUsage,
  upgradeTier,
  getAllOrganizations,
  exportBillingData,
};
