/**
 * Sovereign Intelligence Platform
 * Webhook Service - Outbound Webhooks for Integrations
 */

import { prisma } from '../db/prisma';
import { createAuditLog, AUDIT_ACTIONS } from '../middleware/auditLogger';
import crypto from 'crypto';

/**
 * Webhook event types
 */
export const WEBHOOK_EVENTS = {
  // Report events
  REPORT_CREATED: 'report.created',
  REPORT_UPDATED: 'report.updated',
  REPORT_SUBMITTED: 'report.submitted',
  REPORT_APPROVED: 'report.approved',
  REPORT_REJECTED: 'report.rejected',
  REPORT_FINALIZED: 'report.finalized',
  
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  
  // Organization events
  ORG_UPDATED: 'organization.updated',
  ORG_PLAN_CHANGED: 'organization.plan_changed',
};

/**
 * Sign webhook payload
 */
function signPayload(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return {
    timestamp,
    signature: `v1=${signature}`,
  };
}

/**
 * Register webhook endpoint
 */
export async function registerWebhook({
  url,
  events,
  organizationId,
  createdById,
  description,
}) {
  const secret = crypto.randomBytes(32).toString('hex');
  
  const webhook = await prisma.webhook.create({
    data: {
      url,
      events,
      secret,
      organizationId,
      createdById,
      description,
      isActive: true,
    },
  });
  
  await createAuditLog({
    action: AUDIT_ACTIONS.WEBHOOK_CREATED,
    resource: 'webhook',
    resourceId: webhook.id,
    organizationId,
    userId: createdById,
    details: { url, events },
  });
  
  return {
    id: webhook.id,
    url: webhook.url,
    events: webhook.events,
    secret, // Only shown once
    createdAt: webhook.createdAt,
  };
}

/**
 * Send webhook to a single endpoint
 */
async function sendWebhook(webhook, event, payload) {
  const { timestamp, signature } = signPayload(payload, webhook.secret);
  
  const body = JSON.stringify({
    id: crypto.randomUUID(),
    event,
    timestamp,
    data: payload,
  });
  
  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': String(timestamp),
        'X-Webhook-Event': event,
        'User-Agent': 'Sovereign-Intelligence-Webhook/1.0',
      },
      body,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
    
    // Log delivery attempt
    await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload,
        statusCode: response.status,
        success: response.ok,
        responseBody: await response.text().catch(() => ''),
      },
    });
    
    // Update webhook stats
    if (response.ok) {
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastSuccessAt: new Date(),
          failureCount: 0,
        },
      });
    } else {
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastFailureAt: new Date(),
          failureCount: { increment: 1 },
        },
      });
    }
    
    return response.ok;
  } catch (error) {
    // Log failed delivery
    await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload,
        success: false,
        error: error.message,
      },
    });
    
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        lastFailureAt: new Date(),
        failureCount: { increment: 1 },
      },
    });
    
    return false;
  }
}

/**
 * Dispatch webhook event to all subscribed endpoints
 */
export async function dispatchWebhook(organizationId, event, payload) {
  const webhooks = await prisma.webhook.findMany({
    where: {
      organizationId,
      isActive: true,
      events: { has: event },
      failureCount: { lt: 10 }, // Don't send to endpoints with 10+ failures
    },
  });
  
  if (webhooks.length === 0) return;
  
  // Send to all webhooks in parallel
  const results = await Promise.allSettled(
    webhooks.map(webhook => sendWebhook(webhook, event, payload))
  );
  
  return results;
}

/**
 * List webhooks for organization
 */
export async function listWebhooks(organizationId) {
  return prisma.webhook.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      url: true,
      events: true,
      description: true,
      isActive: true,
      lastSuccessAt: true,
      lastFailureAt: true,
      failureCount: true,
      createdAt: true,
    },
  });
}

/**
 * Update webhook
 */
export async function updateWebhook(webhookId, data, organizationId, userId) {
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, organizationId },
  });
  
  if (!webhook) {
    throw new Error('Webhook not found');
  }
  
  const updated = await prisma.webhook.update({
    where: { id: webhookId },
    data: {
      url: data.url,
      events: data.events,
      description: data.description,
      isActive: data.isActive,
    },
  });
  
  await createAuditLog({
    action: AUDIT_ACTIONS.WEBHOOK_UPDATED,
    resource: 'webhook',
    resourceId: webhookId,
    organizationId,
    userId,
    details: { updated: Object.keys(data) },
  });
  
  return updated;
}

/**
 * Delete webhook
 */
export async function deleteWebhook(webhookId, organizationId, userId) {
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, organizationId },
  });
  
  if (!webhook) {
    throw new Error('Webhook not found');
  }
  
  await prisma.webhook.delete({ where: { id: webhookId } });
  
  await createAuditLog({
    action: AUDIT_ACTIONS.WEBHOOK_DELETED,
    resource: 'webhook',
    resourceId: webhookId,
    organizationId,
    userId,
  });
  
  return { success: true };
}

/**
 * Test webhook endpoint
 */
export async function testWebhook(webhookId, organizationId) {
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, organizationId },
  });
  
  if (!webhook) {
    throw new Error('Webhook not found');
  }
  
  const testPayload = {
    test: true,
    message: 'This is a test webhook from Sovereign Intelligence',
    timestamp: new Date().toISOString(),
  };
  
  const success = await sendWebhook(webhook, 'test', testPayload);
  
  return { success };
}

/**
 * Get webhook delivery history
 */
export async function getWebhookDeliveries(webhookId, organizationId, limit = 50) {
  // Verify ownership
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, organizationId },
  });
  
  if (!webhook) {
    throw new Error('Webhook not found');
  }
  
  return prisma.webhookDelivery.findMany({
    where: { webhookId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export default {
  WEBHOOK_EVENTS,
  registerWebhook,
  dispatchWebhook,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  getWebhookDeliveries,
};
