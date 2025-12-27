// lib/enterprise/usageBilling.js
// [KT:USAGE-BILLING-v1.0] Usage-Based & Metered Billing
// Stripe metered billing for API calls, tokens, storage, agents
// Enables: Consumption pricing, overage charges, committed use discounts

import Stripe from 'stripe';
import Airtable from 'airtable';
import crypto from 'crypto';

const TAG = '[ENTERPRISE:USAGE-BILLING]';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ''
);

// ============================================================================
// Billable Metrics
// ============================================================================
export const BILLABLE_METRICS = {
  // API Usage
  api_requests: {
    name: 'API Requests',
    unit: 'request',
    aggregation: 'sum',
    tiers: [
      { upTo: 10000, price: 0 }, // Free tier
      { upTo: 100000, price: 0.001 }, // $0.001/request
      { upTo: 1000000, price: 0.0005 }, // Volume discount
      { upTo: 'inf', price: 0.0002 },
    ],
  },
  
  // AI Token Usage
  ai_tokens: {
    name: 'AI Tokens',
    unit: 'token',
    aggregation: 'sum',
    tiers: [
      { upTo: 100000, price: 0 },
      { upTo: 1000000, price: 0.00002 }, // $0.02 per 1K tokens
      { upTo: 'inf', price: 0.00001 },
    ],
  },
  
  // Agent Executions
  agent_runs: {
    name: 'Agent Executions',
    unit: 'run',
    aggregation: 'sum',
    tiers: [
      { upTo: 100, price: 0 },
      { upTo: 1000, price: 0.10 }, // $0.10/run
      { upTo: 'inf', price: 0.05 },
    ],
  },
  
  // Translation Characters
  translation_chars: {
    name: 'Translation Characters',
    unit: 'character',
    aggregation: 'sum',
    tiers: [
      { upTo: 100000, price: 0 },
      { upTo: 1000000, price: 0.00001 }, // $10 per 1M chars
      { upTo: 'inf', price: 0.000005 },
    ],
  },
  
  // Storage
  storage_gb: {
    name: 'Storage',
    unit: 'GB',
    aggregation: 'max', // Bill for peak
    tiers: [
      { upTo: 10, price: 0 },
      { upTo: 100, price: 0.10 }, // $0.10/GB/month
      { upTo: 'inf', price: 0.05 },
    ],
  },
  
  // Embed Views
  embed_views: {
    name: 'Embed Views',
    unit: 'view',
    aggregation: 'sum',
    tiers: [
      { upTo: 10000, price: 0 },
      { upTo: 100000, price: 0.001 },
      { upTo: 'inf', price: 0.0005 },
    ],
  },
  
  // Active Users (MAU pricing)
  active_users: {
    name: 'Monthly Active Users',
    unit: 'user',
    aggregation: 'max',
    tiers: [
      { upTo: 50, price: 0 },
      { upTo: 500, price: 2 }, // $2/user/month
      { upTo: 5000, price: 1.50 },
      { upTo: 'inf', price: 1 },
    ],
  },
  
  // Reports Generated
  reports_generated: {
    name: 'Reports Generated',
    unit: 'report',
    aggregation: 'sum',
    tiers: [
      { upTo: 50, price: 0 },
      { upTo: 500, price: 0.50 },
      { upTo: 'inf', price: 0.25 },
    ],
  },
};

// ============================================================================
// Usage Tracking
// ============================================================================

/**
 * Track usage event
 */
export async function trackUsage({
  organizationId,
  subscriptionId,
  metric,
  quantity,
  timestamp = new Date(),
  metadata = {},
}) {
  const eventId = `usage_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  try {
    // Store in Airtable for analytics
    await base('Usage Events').create({
      'Event ID': eventId,
      'Organization ID': organizationId,
      'Subscription ID': subscriptionId || '',
      'Metric': metric,
      'Quantity': quantity,
      'Timestamp': timestamp.toISOString(),
      'Metadata': JSON.stringify(metadata),
    });
    
    // Report to Stripe if subscription exists
    if (subscriptionId && process.env.STRIPE_SECRET_KEY) {
      await reportToStripe(subscriptionId, metric, quantity, timestamp);
    }
    
    return { eventId, tracked: true };
  } catch (error) {
    console.error(TAG, 'trackUsage.error', error);
    throw error;
  }
}

/**
 * Report usage to Stripe metered billing
 */
async function reportToStripe(subscriptionId, metric, quantity, timestamp) {
  try {
    // Get subscription items
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Find the metered item for this metric
    const meteredItem = subscription.items.data.find(item => 
      item.price?.metadata?.metric === metric
    );
    
    if (meteredItem) {
      await stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
        quantity,
        timestamp: Math.floor(timestamp.getTime() / 1000),
        action: 'increment',
      });
    }
  } catch (error) {
    console.error(TAG, 'reportToStripe.error', error);
  }
}

/**
 * Get usage summary for organization
 */
export async function getUsageSummary(organizationId, period = 'current_month') {
  try {
    let startDate, endDate;
    const now = new Date();
    
    if (period === 'current_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
    } else if (period === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      // Custom period: { start: Date, end: Date }
      startDate = new Date(period.start);
      endDate = new Date(period.end);
    }
    
    const records = await base('Usage Events')
      .select({
        filterByFormula: `AND(
          {Organization ID} = "${organizationId}",
          {Timestamp} >= "${startDate.toISOString()}",
          {Timestamp} <= "${endDate.toISOString()}"
        )`,
      })
      .all();
    
    // Aggregate by metric
    const summary = {};
    
    Object.keys(BILLABLE_METRICS).forEach(metric => {
      summary[metric] = {
        name: BILLABLE_METRICS[metric].name,
        unit: BILLABLE_METRICS[metric].unit,
        quantity: 0,
        estimatedCost: 0,
      };
    });
    
    records.forEach(r => {
      const metric = r.fields['Metric'];
      const quantity = r.fields['Quantity'] || 0;
      
      if (summary[metric]) {
        const metricConfig = BILLABLE_METRICS[metric];
        if (metricConfig.aggregation === 'sum') {
          summary[metric].quantity += quantity;
        } else if (metricConfig.aggregation === 'max') {
          summary[metric].quantity = Math.max(summary[metric].quantity, quantity);
        }
      }
    });
    
    // Calculate estimated costs
    Object.keys(summary).forEach(metric => {
      summary[metric].estimatedCost = calculateCost(
        metric,
        summary[metric].quantity
      );
    });
    
    const totalCost = Object.values(summary).reduce(
      (sum, s) => sum + s.estimatedCost,
      0
    );
    
    return {
      organizationId,
      period: { start: startDate, end: endDate },
      metrics: summary,
      totalEstimatedCost: Math.round(totalCost * 100) / 100,
    };
  } catch (error) {
    console.error(TAG, 'getUsageSummary.error', error);
    throw error;
  }
}

/**
 * Calculate cost for a metric quantity using tiered pricing
 */
export function calculateCost(metric, quantity) {
  const config = BILLABLE_METRICS[metric];
  if (!config) return 0;
  
  let remaining = quantity;
  let cost = 0;
  let previousLimit = 0;
  
  for (const tier of config.tiers) {
    const tierLimit = tier.upTo === 'inf' ? Infinity : tier.upTo;
    const tierQuantity = Math.min(remaining, tierLimit - previousLimit);
    
    if (tierQuantity > 0) {
      cost += tierQuantity * tier.price;
      remaining -= tierQuantity;
    }
    
    previousLimit = tierLimit;
    if (remaining <= 0) break;
  }
  
  return cost;
}

// ============================================================================
// Committed Use Discounts
// ============================================================================
export const COMMITMENT_DISCOUNTS = {
  monthly: { discount: 0, term: 1 },
  annual: { discount: 0.20, term: 12 }, // 20% off
  '2year': { discount: 0.30, term: 24 }, // 30% off
  '3year': { discount: 0.40, term: 36 }, // 40% off
};

/**
 * Create committed use agreement
 */
export async function createCommitment({
  organizationId,
  term, // 'annual', '2year', '3year'
  monthlyCommitment, // $ amount
  metrics = {}, // { metric: quantity } minimums
}) {
  const discount = COMMITMENT_DISCOUNTS[term];
  if (!discount) throw new Error('Invalid commitment term');
  
  const commitmentId = `commit_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + discount.term);
  
  const totalCommitment = monthlyCommitment * discount.term;
  const effectiveMonthly = monthlyCommitment * (1 - discount.discount);
  
  try {
    await base('Commitments').create({
      'Commitment ID': commitmentId,
      'Organization ID': organizationId,
      'Term': term,
      'Monthly Commitment': monthlyCommitment,
      'Discount Percentage': discount.discount * 100,
      'Effective Monthly': effectiveMonthly,
      'Total Commitment': totalCommitment,
      'Metric Minimums': JSON.stringify(metrics),
      'Start Date': startDate.toISOString(),
      'End Date': endDate.toISOString(),
      'Status': 'active',
    });
    
    return {
      commitmentId,
      term,
      monthlyCommitment,
      discount: `${discount.discount * 100}%`,
      effectiveMonthly,
      totalCommitment,
      savings: totalCommitment * discount.discount,
      startDate,
      endDate,
    };
  } catch (error) {
    console.error(TAG, 'createCommitment.error', error);
    throw error;
  }
}

// ============================================================================
// Invoice Generation
// ============================================================================

/**
 * Generate usage invoice
 */
export async function generateUsageInvoice(organizationId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const usage = await getUsageSummary(organizationId, {
    start: startDate,
    end: endDate,
  });
  
  const invoiceId = `inv_${year}${String(month).padStart(2, '0')}_${organizationId}`;
  
  const lineItems = Object.entries(usage.metrics)
    .filter(([_, data]) => data.quantity > 0)
    .map(([metric, data]) => ({
      description: `${data.name} (${data.quantity.toLocaleString()} ${data.unit}s)`,
      quantity: data.quantity,
      unitPrice: data.estimatedCost / data.quantity || 0,
      amount: data.estimatedCost,
    }));
  
  return {
    invoiceId,
    organizationId,
    period: { month, year },
    lineItems,
    subtotal: usage.totalEstimatedCost,
    tax: 0, // Calculated by Stripe Tax
    total: usage.totalEstimatedCost,
    status: 'draft',
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Quota & Limits
// ============================================================================

/**
 * Check if organization is within quota
 */
export async function checkQuota(organizationId, metric, additionalQuantity = 0) {
  const usage = await getUsageSummary(organizationId, 'current_month');
  const current = usage.metrics[metric]?.quantity || 0;
  
  // Get org's plan limits (would fetch from subscription)
  const planLimits = {
    free: { api_requests: 1000, ai_tokens: 10000, agent_runs: 10 },
    starter: { api_requests: 50000, ai_tokens: 500000, agent_runs: 500 },
    professional: { api_requests: 500000, ai_tokens: 5000000, agent_runs: 5000 },
    enterprise: { api_requests: Infinity, ai_tokens: Infinity, agent_runs: Infinity },
  };
  
  // Default to starter limits
  const limits = planLimits.starter;
  const limit = limits[metric] || Infinity;
  
  return {
    metric,
    current,
    limit,
    remaining: Math.max(0, limit - current),
    withinQuota: current + additionalQuantity <= limit,
    percentUsed: limit === Infinity ? 0 : Math.round((current / limit) * 100),
  };
}

/**
 * Get all quotas for organization
 */
export async function getAllQuotas(organizationId) {
  const quotas = {};
  
  for (const metric of Object.keys(BILLABLE_METRICS)) {
    quotas[metric] = await checkQuota(organizationId, metric);
  }
  
  return quotas;
}

export default {
  BILLABLE_METRICS,
  COMMITMENT_DISCOUNTS,
  trackUsage,
  getUsageSummary,
  calculateCost,
  createCommitment,
  generateUsageInvoice,
  checkQuota,
  getAllQuotas,
};
