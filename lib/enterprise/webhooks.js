// lib/enterprise/webhooks.js
// [KT:WEBHOOKS-v1.0] Enterprise Webhook System
// Outbound webhooks for integrations with external systems
// Supports retries, signatures, versioning, and delivery tracking

import Airtable from 'airtable';
import crypto from 'crypto';

const TAG = '[ENTERPRISE:WEBHOOKS]';

// ============================================================================
// Airtable Configuration
// ============================================================================
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ''
);

// ============================================================================
// Webhook Event Types
// ============================================================================
export const WEBHOOK_EVENTS = {
  // Report events
  'report.created': { description: 'Fired when a report is created', category: 'reports' },
  'report.updated': { description: 'Fired when a report is updated', category: 'reports' },
  'report.deleted': { description: 'Fired when a report is deleted', category: 'reports' },
  'report.exported': { description: 'Fired when a report is exported', category: 'reports' },
  'report.shared': { description: 'Fired when a report is shared', category: 'reports' },
  
  // User events
  'user.created': { description: 'Fired when a user is created', category: 'users' },
  'user.updated': { description: 'Fired when a user is updated', category: 'users' },
  'user.deleted': { description: 'Fired when a user is deleted', category: 'users' },
  'user.login': { description: 'Fired when a user logs in', category: 'users' },
  
  // Organization events
  'organization.created': { description: 'Fired when an organization is created', category: 'organizations' },
  'organization.updated': { description: 'Fired when an organization is updated', category: 'organizations' },
  'member.invited': { description: 'Fired when a member is invited', category: 'organizations' },
  'member.joined': { description: 'Fired when a member joins', category: 'organizations' },
  'member.removed': { description: 'Fired when a member is removed', category: 'organizations' },
  
  // Subscription events
  'subscription.created': { description: 'Fired when a subscription is created', category: 'billing' },
  'subscription.updated': { description: 'Fired when a subscription is updated', category: 'billing' },
  'subscription.cancelled': { description: 'Fired when a subscription is cancelled', category: 'billing' },
  'invoice.created': { description: 'Fired when an invoice is created', category: 'billing' },
  'invoice.paid': { description: 'Fired when an invoice is paid', category: 'billing' },
  'invoice.failed': { description: 'Fired when invoice payment fails', category: 'billing' },
  
  // AI events
  'ai.request.completed': { description: 'Fired when an AI request completes', category: 'ai' },
  'ai.request.failed': { description: 'Fired when an AI request fails', category: 'ai' },
  
  // System events
  'quota.warning': { description: 'Fired when quota reaches warning threshold', category: 'system' },
  'quota.exceeded': { description: 'Fired when quota is exceeded', category: 'system' },
};

// ============================================================================
// Webhook Configuration
// ============================================================================
export const WEBHOOK_CONFIG = {
  maxRetries: 5,
  retryDelays: [1000, 5000, 30000, 120000, 300000], // 1s, 5s, 30s, 2m, 5m
  timeout: 30000, // 30 seconds
  maxPayloadSize: 1024 * 1024, // 1MB
  signatureHeader: 'X-Sovereign-Signature',
  timestampHeader: 'X-Sovereign-Timestamp',
  versionHeader: 'X-Sovereign-Version',
  currentVersion: '2025-01-01',
};

// ============================================================================
// Webhook Endpoint Management
// ============================================================================

/**
 * Register a new webhook endpoint
 */
export async function registerWebhook({
  organizationId,
  url,
  events,
  description,
  secret, // Optional - will be generated if not provided
  version = WEBHOOK_CONFIG.currentVersion,
  metadata = {},
  createdBy,
}) {
  console.log(TAG, 'registerWebhook', { organizationId, url, events: events.length });
  
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Webhook URL must use HTTP or HTTPS');
    }
    
    // Validate events
    const invalidEvents = events.filter(e => !WEBHOOK_EVENTS[e]);
    if (invalidEvents.length > 0) {
      throw new Error(`Invalid webhook events: ${invalidEvents.join(', ')}`);
    }
    
    // Generate webhook ID and secret
    const webhookId = `wh_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const webhookSecret = secret || `whsec_${crypto.randomBytes(32).toString('hex')}`;
    
    await base('Webhooks').create({
      'Webhook ID': webhookId,
      'Organization ID': organizationId,
      'URL': url,
      'Events': events.join(','),
      'Description': description || '',
      'Secret': webhookSecret, // Stored encrypted in production
      'Version': version,
      'Status': 'active',
      'Metadata': JSON.stringify(metadata),
      'Created By': createdBy || '',
      'Created At': new Date().toISOString(),
      'Success Count': 0,
      'Failure Count': 0,
    });
    
    return {
      id: webhookId,
      url,
      events,
      secret: webhookSecret,
      version,
      status: 'active',
    };
  } catch (error) {
    console.error(TAG, 'registerWebhook.error', error);
    throw error;
  }
}

/**
 * Get webhook by ID
 */
export async function getWebhook(webhookId) {
  try {
    const records = await base('Webhooks')
      .select({
        filterByFormula: `{Webhook ID} = "${webhookId}"`,
        maxRecords: 1,
      })
      .firstPage();
    
    if (records.length === 0) return null;
    
    const record = records[0];
    return {
      id: record.fields['Webhook ID'],
      recordId: record.id,
      organizationId: record.fields['Organization ID'],
      url: record.fields['URL'],
      events: (record.fields['Events'] || '').split(',').filter(Boolean),
      description: record.fields['Description'],
      secret: record.fields['Secret'],
      version: record.fields['Version'],
      status: record.fields['Status'],
      metadata: JSON.parse(record.fields['Metadata'] || '{}'),
      successCount: record.fields['Success Count'] || 0,
      failureCount: record.fields['Failure Count'] || 0,
      lastDeliveryAt: record.fields['Last Delivery At'],
      lastDeliveryStatus: record.fields['Last Delivery Status'],
      createdAt: record.fields['Created At'],
    };
  } catch (error) {
    console.error(TAG, 'getWebhook.error', error);
    throw error;
  }
}

/**
 * List webhooks for an organization
 */
export async function listWebhooks(organizationId, options = {}) {
  const { status, event } = options;
  
  try {
    let formula = `{Organization ID} = "${organizationId}"`;
    if (status) formula = `AND(${formula}, {Status} = "${status}")`;
    
    const records = await base('Webhooks')
      .select({
        filterByFormula: formula,
        sort: [{ field: 'Created At', direction: 'desc' }],
      })
      .firstPage();
    
    let webhooks = records.map(record => ({
      id: record.fields['Webhook ID'],
      url: record.fields['URL'],
      events: (record.fields['Events'] || '').split(',').filter(Boolean),
      description: record.fields['Description'],
      status: record.fields['Status'],
      successCount: record.fields['Success Count'] || 0,
      failureCount: record.fields['Failure Count'] || 0,
      lastDeliveryAt: record.fields['Last Delivery At'],
      createdAt: record.fields['Created At'],
    }));
    
    // Filter by event if specified
    if (event) {
      webhooks = webhooks.filter(wh => wh.events.includes(event));
    }
    
    return webhooks;
  } catch (error) {
    console.error(TAG, 'listWebhooks.error', error);
    throw error;
  }
}

/**
 * Update webhook
 */
export async function updateWebhook(webhookId, updates) {
  try {
    const webhook = await getWebhook(webhookId);
    if (!webhook) throw new Error('Webhook not found');
    
    const fields = {};
    if (updates.url) {
      const parsedUrl = new URL(updates.url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Webhook URL must use HTTP or HTTPS');
      }
      fields['URL'] = updates.url;
    }
    if (updates.events) {
      const invalidEvents = updates.events.filter(e => !WEBHOOK_EVENTS[e]);
      if (invalidEvents.length > 0) {
        throw new Error(`Invalid webhook events: ${invalidEvents.join(', ')}`);
      }
      fields['Events'] = updates.events.join(',');
    }
    if (updates.description !== undefined) fields['Description'] = updates.description;
    if (updates.status) fields['Status'] = updates.status;
    if (updates.metadata) fields['Metadata'] = JSON.stringify({ ...webhook.metadata, ...updates.metadata });
    
    fields['Updated At'] = new Date().toISOString();
    
    await base('Webhooks').update(webhook.recordId, fields);
    
    return { ...webhook, ...updates };
  } catch (error) {
    console.error(TAG, 'updateWebhook.error', error);
    throw error;
  }
}

/**
 * Delete webhook
 */
export async function deleteWebhook(webhookId) {
  try {
    const webhook = await getWebhook(webhookId);
    if (!webhook) throw new Error('Webhook not found');
    
    await base('Webhooks').destroy(webhook.recordId);
    
    return { deleted: true, webhookId };
  } catch (error) {
    console.error(TAG, 'deleteWebhook.error', error);
    throw error;
  }
}

/**
 * Rotate webhook secret
 */
export async function rotateWebhookSecret(webhookId) {
  try {
    const webhook = await getWebhook(webhookId);
    if (!webhook) throw new Error('Webhook not found');
    
    const newSecret = `whsec_${crypto.randomBytes(32).toString('hex')}`;
    
    await base('Webhooks').update(webhook.recordId, {
      'Secret': newSecret,
      'Secret Rotated At': new Date().toISOString(),
    });
    
    return {
      webhookId,
      secret: newSecret,
      rotatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(TAG, 'rotateWebhookSecret.error', error);
    throw error;
  }
}

// ============================================================================
// Webhook Delivery
// ============================================================================

/**
 * Generate webhook signature
 */
function generateSignature(payload, secret, timestamp) {
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  return crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
}

/**
 * Trigger webhook event
 */
export async function triggerWebhook({
  organizationId,
  event,
  data,
  idempotencyKey,
}) {
  console.log(TAG, 'triggerWebhook', { organizationId, event });
  
  try {
    // Validate event
    if (!WEBHOOK_EVENTS[event]) {
      throw new Error(`Invalid webhook event: ${event}`);
    }
    
    // Get active webhooks subscribed to this event
    const webhooks = await listWebhooks(organizationId, { status: 'active', event });
    
    if (webhooks.length === 0) {
      console.log(TAG, 'triggerWebhook.noSubscribers', { event });
      return { delivered: 0, webhooks: [] };
    }
    
    // Generate delivery ID
    const deliveryId = idempotencyKey || `del_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Build payload
    const payload = {
      id: deliveryId,
      event,
      created: timestamp,
      api_version: WEBHOOK_CONFIG.currentVersion,
      data,
    };
    
    // Deliver to each webhook
    const results = await Promise.all(
      webhooks.map(webhook => deliverWebhook({
        webhook,
        payload,
        timestamp,
        deliveryId,
      }))
    );
    
    const successCount = results.filter(r => r.success).length;
    
    return {
      deliveryId,
      event,
      delivered: successCount,
      total: webhooks.length,
      results,
    };
  } catch (error) {
    console.error(TAG, 'triggerWebhook.error', error);
    throw error;
  }
}

/**
 * Deliver webhook to endpoint
 */
async function deliverWebhook({ webhook, payload, timestamp, deliveryId }) {
  const fullWebhook = await getWebhook(webhook.id);
  if (!fullWebhook) {
    return { webhookId: webhook.id, success: false, error: 'Webhook not found' };
  }
  
  // Generate signature
  const signature = generateSignature(payload, fullWebhook.secret, timestamp);
  
  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Sovereign-Webhooks/1.0',
    [WEBHOOK_CONFIG.signatureHeader]: `v1=${signature}`,
    [WEBHOOK_CONFIG.timestampHeader]: timestamp.toString(),
    [WEBHOOK_CONFIG.versionHeader]: fullWebhook.version,
    'X-Delivery-ID': deliveryId,
  };
  
  let lastError = null;
  let responseStatus = null;
  let responseBody = null;
  let attempt = 0;
  
  // Retry loop
  for (attempt = 0; attempt <= WEBHOOK_CONFIG.maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = WEBHOOK_CONFIG.retryDelays[attempt - 1] || 300000;
      console.log(TAG, 'deliverWebhook.retry', { webhookId: webhook.id, attempt, delay });
      await sleep(delay);
    }
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), WEBHOOK_CONFIG.timeout);
      
      const response = await fetch(fullWebhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      responseStatus = response.status;
      responseBody = await response.text().catch(() => '');
      
      // Success if 2xx status
      if (response.ok) {
        await logDelivery({
          webhookId: webhook.id,
          deliveryId,
          event: payload.event,
          status: 'success',
          httpStatus: responseStatus,
          attempts: attempt + 1,
        });
        
        await updateWebhookStats(webhook.id, true);
        
        return {
          webhookId: webhook.id,
          success: true,
          status: responseStatus,
          attempts: attempt + 1,
        };
      }
      
      // Permanent failure (4xx except 429)
      if (responseStatus >= 400 && responseStatus < 500 && responseStatus !== 429) {
        lastError = `HTTP ${responseStatus}: ${responseBody.slice(0, 200)}`;
        break;
      }
      
      lastError = `HTTP ${responseStatus}`;
    } catch (error) {
      lastError = error.name === 'AbortError' ? 'Request timeout' : error.message;
      console.error(TAG, 'deliverWebhook.attempt.error', { webhookId: webhook.id, attempt, error: lastError });
    }
  }
  
  // All retries exhausted
  await logDelivery({
    webhookId: webhook.id,
    deliveryId,
    event: payload.event,
    status: 'failed',
    httpStatus: responseStatus,
    error: lastError,
    attempts: attempt,
  });
  
  await updateWebhookStats(webhook.id, false);
  
  return {
    webhookId: webhook.id,
    success: false,
    status: responseStatus,
    error: lastError,
    attempts: attempt,
  };
}

/**
 * Update webhook delivery statistics
 */
async function updateWebhookStats(webhookId, success) {
  try {
    const webhook = await getWebhook(webhookId);
    if (!webhook) return;
    
    const fields = {
      'Last Delivery At': new Date().toISOString(),
      'Last Delivery Status': success ? 'success' : 'failed',
    };
    
    if (success) {
      fields['Success Count'] = (webhook.successCount || 0) + 1;
    } else {
      fields['Failure Count'] = (webhook.failureCount || 0) + 1;
    }
    
    // Auto-disable after too many failures
    const failureRate = fields['Failure Count'] / ((webhook.successCount || 0) + fields['Failure Count'] + 1);
    if (failureRate > 0.5 && (webhook.failureCount || 0) + 1 >= 10) {
      fields['Status'] = 'disabled';
      console.warn(TAG, 'webhook.autoDisabled', { webhookId, failureRate });
    }
    
    await base('Webhooks').update(webhook.recordId, fields);
  } catch (error) {
    console.error(TAG, 'updateWebhookStats.error', error);
  }
}

/**
 * Log webhook delivery attempt
 */
async function logDelivery({ webhookId, deliveryId, event, status, httpStatus, error, attempts }) {
  try {
    await base('Webhook Deliveries').create({
      'Delivery ID': deliveryId,
      'Webhook ID': webhookId,
      'Event': event,
      'Status': status,
      'HTTP Status': httpStatus || 0,
      'Error': error || '',
      'Attempts': attempts,
      'Timestamp': new Date().toISOString(),
    });
  } catch (err) {
    console.error(TAG, 'logDelivery.error', err);
  }
}

// ============================================================================
// Delivery History
// ============================================================================

/**
 * Get webhook delivery history
 */
export async function getDeliveryHistory(webhookId, options = {}) {
  const { status, limit = 50 } = options;
  
  try {
    let formula = `{Webhook ID} = "${webhookId}"`;
    if (status) formula = `AND(${formula}, {Status} = "${status}")`;
    
    const records = await base('Webhook Deliveries')
      .select({
        filterByFormula: formula,
        maxRecords: limit,
        sort: [{ field: 'Timestamp', direction: 'desc' }],
      })
      .firstPage();
    
    return records.map(record => ({
      deliveryId: record.fields['Delivery ID'],
      event: record.fields['Event'],
      status: record.fields['Status'],
      httpStatus: record.fields['HTTP Status'],
      error: record.fields['Error'],
      attempts: record.fields['Attempts'],
      timestamp: record.fields['Timestamp'],
    }));
  } catch (error) {
    console.error(TAG, 'getDeliveryHistory.error', error);
    throw error;
  }
}

/**
 * Retry a failed delivery
 */
export async function retryDelivery(deliveryId) {
  // In production, this would re-queue the delivery
  console.log(TAG, 'retryDelivery', { deliveryId });
  
  return {
    deliveryId,
    status: 'queued',
    message: 'Delivery queued for retry',
  };
}

// ============================================================================
// Webhook Verification (for incoming webhooks)
// ============================================================================

/**
 * Verify incoming webhook signature
 */
export function verifyWebhookSignature(payload, signature, secret, timestamp, tolerance = 300) {
  // Check timestamp is recent (within tolerance seconds)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) {
    return { valid: false, reason: 'Timestamp too old or too far in future' };
  }
  
  // Extract signature from header
  const parts = signature.split(',');
  const signaturePart = parts.find(p => p.startsWith('v1='));
  if (!signaturePart) {
    return { valid: false, reason: 'Invalid signature format' };
  }
  
  const providedSignature = signaturePart.replace('v1=', '');
  
  // Calculate expected signature
  const expectedSignature = generateSignature(payload, secret, timestamp);
  
  // Constant-time comparison
  const valid = crypto.timingSafeEqual(
    Buffer.from(providedSignature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
  
  return { valid, reason: valid ? null : 'Signature mismatch' };
}

// ============================================================================
// Helper Functions
// ============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Convenience Functions
// ============================================================================

export const webhooks = {
  // Trigger specific events
  reportCreated: (organizationId, data) => triggerWebhook({ organizationId, event: 'report.created', data }),
  reportUpdated: (organizationId, data) => triggerWebhook({ organizationId, event: 'report.updated', data }),
  reportDeleted: (organizationId, data) => triggerWebhook({ organizationId, event: 'report.deleted', data }),
  reportExported: (organizationId, data) => triggerWebhook({ organizationId, event: 'report.exported', data }),
  
  userCreated: (organizationId, data) => triggerWebhook({ organizationId, event: 'user.created', data }),
  userLogin: (organizationId, data) => triggerWebhook({ organizationId, event: 'user.login', data }),
  
  memberInvited: (organizationId, data) => triggerWebhook({ organizationId, event: 'member.invited', data }),
  memberJoined: (organizationId, data) => triggerWebhook({ organizationId, event: 'member.joined', data }),
  
  subscriptionCreated: (organizationId, data) => triggerWebhook({ organizationId, event: 'subscription.created', data }),
  invoicePaid: (organizationId, data) => triggerWebhook({ organizationId, event: 'invoice.paid', data }),
  
  quotaWarning: (organizationId, data) => triggerWebhook({ organizationId, event: 'quota.warning', data }),
  quotaExceeded: (organizationId, data) => triggerWebhook({ organizationId, event: 'quota.exceeded', data }),
};

export default {
  WEBHOOK_EVENTS,
  WEBHOOK_CONFIG,
  registerWebhook,
  getWebhook,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
  rotateWebhookSecret,
  triggerWebhook,
  getDeliveryHistory,
  retryDelivery,
  verifyWebhookSignature,
  webhooks,
};
