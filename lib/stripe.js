// lib/stripe.js
// [KT:STRIPE-v1.0] Stripe Integration for Sovereign Intelligence
// Supports subscriptions, usage-based billing, and one-time purchases

import Stripe from 'stripe';

// ============================================================================
// Stripe Client Singleton
// ============================================================================
let stripeClient = null;

export function getStripe() {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.warn('[STRIPE] No STRIPE_SECRET_KEY found - payments disabled');
      return null;
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: false,
    });
  }
  return stripeClient;
}

// ============================================================================
// Price IDs - Map to your Stripe Dashboard products
// Create these in Stripe Dashboard > Products
// ============================================================================
export const STRIPE_PRICES = {
  // Monthly Plans
  starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly_placeholder',
  professional_monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_professional_monthly_placeholder',
  enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly_placeholder',
  
  // Annual Plans (20% discount)
  starter_annual: process.env.STRIPE_PRICE_STARTER_ANNUAL || 'price_starter_annual_placeholder',
  professional_annual: process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL || 'price_professional_annual_placeholder',
  enterprise_annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || 'price_enterprise_annual_placeholder',
  
  // Usage-based metering (for API calls beyond plan limits)
  api_calls_overage: process.env.STRIPE_PRICE_API_OVERAGE || 'price_api_overage_placeholder',
  reports_overage: process.env.STRIPE_PRICE_REPORTS_OVERAGE || 'price_reports_overage_placeholder',
};

// ============================================================================
// Plan Configuration
// ============================================================================
export const PLANS = {
  starter: {
    name: 'Starter',
    monthlyPrice: 499,
    annualPrice: 4990,
    features: {
      users: 5,
      reportsPerMonth: 100,
      apiCalls: 10000,
      languages: 50,
      verticals: 3,
      storage: '10 GB',
    },
  },
  professional: {
    name: 'Professional',
    monthlyPrice: 1999,
    annualPrice: 19990,
    features: {
      users: 25,
      reportsPerMonth: -1, // unlimited
      apiCalls: 100000,
      languages: 207,
      verticals: 10,
      storage: '100 GB',
    },
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: 9999,
    annualPrice: 99990,
    features: {
      users: -1, // unlimited
      reportsPerMonth: -1,
      apiCalls: -1,
      languages: 207,
      verticals: 10,
      storage: 'Unlimited',
    },
  },
};

// ============================================================================
// Customer Management
// ============================================================================

/**
 * Create or retrieve a Stripe customer
 */
export async function getOrCreateCustomer({ email, name, metadata = {} }) {
  const stripe = getStripe();
  if (!stripe) return null;
  
  // Check if customer exists
  const existing = await stripe.customers.list({
    email,
    limit: 1,
  });
  
  if (existing.data.length > 0) {
    return existing.data[0];
  }
  
  // Create new customer
  return stripe.customers.create({
    email,
    name,
    metadata: {
      platform: 'sovereign-intelligence',
      ...metadata,
    },
  });
}

/**
 * Get customer's active subscription
 */
export async function getCustomerSubscription(customerId) {
  const stripe = getStripe();
  if (!stripe || !customerId) return null;
  
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });
  
  return subscriptions.data[0] || null;
}

/**
 * Get customer's billing portal session
 */
export async function createBillingPortalSession(customerId, returnUrl) {
  const stripe = getStripe();
  if (!stripe) return null;
  
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// ============================================================================
// Checkout Sessions
// ============================================================================

/**
 * Create a checkout session for new subscription
 */
export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  metadata = {},
  trialDays = 14,
}) {
  const stripe = getStripe();
  if (!stripe) return null;
  
  const sessionParams = {
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      platform: 'sovereign-intelligence',
      ...metadata,
    },
    subscription_data: {
      metadata: {
        platform: 'sovereign-intelligence',
        ...metadata,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
  };
  
  // Add trial if applicable
  if (trialDays > 0) {
    sessionParams.subscription_data.trial_period_days = trialDays;
  }
  
  return stripe.checkout.sessions.create(sessionParams);
}

/**
 * Create checkout for plan upgrade/downgrade
 */
export async function createUpgradeSession({
  subscriptionId,
  newPriceId,
}) {
  const stripe = getStripe();
  if (!stripe) return null;
  
  // Get current subscription
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // Update to new price (prorated by default)
  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  });
}

// ============================================================================
// Usage-Based Billing (for overages)
// ============================================================================

/**
 * Record usage for metered billing
 */
export async function recordUsage({
  subscriptionItemId,
  quantity,
  timestamp = Math.floor(Date.now() / 1000),
  action = 'increment',
}) {
  const stripe = getStripe();
  if (!stripe) return null;
  
  return stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity,
    timestamp,
    action,
  });
}

/**
 * Get current usage for a subscription item
 */
export async function getUsageSummary(subscriptionItemId) {
  const stripe = getStripe();
  if (!stripe) return null;
  
  const summary = await stripe.subscriptionItems.listUsageRecordSummaries(
    subscriptionItemId,
    { limit: 1 }
  );
  
  return summary.data[0] || null;
}

// ============================================================================
// Invoice Management
// ============================================================================

/**
 * Get customer's invoice history
 */
export async function getInvoices(customerId, limit = 10) {
  const stripe = getStripe();
  if (!stripe) return [];
  
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });
  
  return invoices.data.map(inv => ({
    id: inv.id,
    number: inv.number,
    date: new Date(inv.created * 1000).toISOString(),
    amount: inv.amount_due / 100,
    currency: inv.currency.toUpperCase(),
    status: inv.status,
    pdfUrl: inv.invoice_pdf,
    hostedUrl: inv.hosted_invoice_url,
  }));
}

/**
 * Get upcoming invoice preview
 */
export async function getUpcomingInvoice(customerId) {
  const stripe = getStripe();
  if (!stripe) return null;
  
  try {
    const invoice = await stripe.invoices.retrieveUpcoming({
      customer: customerId,
    });
    
    return {
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      dueDate: invoice.next_payment_attempt 
        ? new Date(invoice.next_payment_attempt * 1000).toISOString()
        : null,
      lines: invoice.lines.data.map(line => ({
        description: line.description,
        amount: line.amount / 100,
        quantity: line.quantity,
      })),
    };
  } catch (err) {
    // No upcoming invoice
    return null;
  }
}

// ============================================================================
// Subscription Lifecycle
// ============================================================================

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(subscriptionId) {
  const stripe = getStripe();
  if (!stripe) return null;
  
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Reactivate a cancelled subscription
 */
export async function reactivateSubscription(subscriptionId) {
  const stripe = getStripe();
  if (!stripe) return null;
  
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Immediately cancel subscription (no refund)
 */
export async function cancelSubscriptionImmediately(subscriptionId) {
  const stripe = getStripe();
  if (!stripe) return null;
  
  return stripe.subscriptions.cancel(subscriptionId);
}

// ============================================================================
// Webhook Signature Verification
// ============================================================================

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload, signature) {
  const stripe = getStripe();
  if (!stripe) return null;
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[STRIPE] No STRIPE_WEBHOOK_SECRET configured');
    return null;
  }
  
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('[STRIPE] Webhook signature verification failed:', err.message);
    return null;
  }
}

export default {
  getStripe,
  STRIPE_PRICES,
  PLANS,
  getOrCreateCustomer,
  getCustomerSubscription,
  createBillingPortalSession,
  createCheckoutSession,
  createUpgradeSession,
  recordUsage,
  getUsageSummary,
  getInvoices,
  getUpcomingInvoice,
  cancelSubscription,
  reactivateSubscription,
  cancelSubscriptionImmediately,
  verifyWebhookSignature,
};
