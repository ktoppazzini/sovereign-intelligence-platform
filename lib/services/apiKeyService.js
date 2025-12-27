/**
 * Sovereign Intelligence Platform
 * API Key Service - API Key Management for External Integrations
 */

import { prisma } from '../db/prisma';
import { cache, CACHE_PREFIX, TTL } from '../cache/redis';
import { createAuditLog, AUDIT_ACTIONS } from '../middleware/auditLogger';
import crypto from 'crypto';

/**
 * Generate a secure API key
 */
function generateApiKey() {
  const prefix = 'sk_live_';
  const key = crypto.randomBytes(32).toString('hex');
  return prefix + key;
}

/**
 * Hash API key for storage
 */
function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Create new API key
 */
export async function createApiKey({
  name,
  organizationId,
  createdById,
  permissions = [],
  expiresAt = null,
  rateLimit = null,
}) {
  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  
  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      keyHash,
      keyPreview: key.slice(0, 12) + '...',
      organizationId,
      createdById,
      permissions,
      expiresAt,
      rateLimit,
    },
  });
  
  await createAuditLog({
    action: AUDIT_ACTIONS.API_KEY_CREATED,
    resource: 'apiKey',
    resourceId: apiKey.id,
    organizationId,
    userId: createdById,
    details: { name, permissions },
  });
  
  // Return the full key ONLY on creation
  return {
    ...apiKey,
    key, // Full key - only shown once
  };
}

/**
 * Validate API key and return associated data
 */
export async function validateApiKey(key) {
  const keyHash = hashApiKey(key);
  const cacheKey = `${CACHE_PREFIX.API_KEY}${keyHash}`;
  
  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    // Update usage in background
    updateApiKeyUsage(cached.id).catch(() => {});
    return cached;
  }
  
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          plan: true,
          settings: true,
        },
      },
    },
  });
  
  if (!apiKey) {
    return null;
  }
  
  // Cache for faster subsequent lookups
  const cacheData = {
    id: apiKey.id,
    organizationId: apiKey.organizationId,
    organization: apiKey.organization,
    permissions: apiKey.permissions,
    rateLimit: apiKey.rateLimit,
  };
  
  await cache.set(cacheKey, cacheData, TTL.MEDIUM);
  
  // Update usage
  await updateApiKeyUsage(apiKey.id);
  
  return cacheData;
}

/**
 * Update API key usage stats
 */
async function updateApiKeyUsage(apiKeyId) {
  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: {
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    },
  });
}

/**
 * List API keys for organization
 */
export async function listApiKeys(organizationId) {
  return prisma.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      keyPreview: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      usageCount: true,
      createdAt: true,
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });
}

/**
 * Revoke API key
 */
export async function revokeApiKey(apiKeyId, organizationId, userId) {
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
      organizationId,
    },
  });
  
  if (!apiKey) {
    throw new Error('API key not found');
  }
  
  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { isActive: false },
  });
  
  // Invalidate cache
  await cache.del(`${CACHE_PREFIX.API_KEY}${apiKey.keyHash}`);
  
  await createAuditLog({
    action: AUDIT_ACTIONS.API_KEY_REVOKED,
    resource: 'apiKey',
    resourceId: apiKeyId,
    organizationId,
    userId,
    details: { name: apiKey.name },
  });
  
  return { success: true };
}

/**
 * Rotate API key (create new, revoke old)
 */
export async function rotateApiKey(apiKeyId, organizationId, userId) {
  const oldKey = await prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
      organizationId,
    },
  });
  
  if (!oldKey) {
    throw new Error('API key not found');
  }
  
  // Create new key with same settings
  const newKey = await createApiKey({
    name: oldKey.name,
    organizationId,
    createdById: userId,
    permissions: oldKey.permissions,
    expiresAt: oldKey.expiresAt,
    rateLimit: oldKey.rateLimit,
  });
  
  // Revoke old key
  await revokeApiKey(apiKeyId, organizationId, userId);
  
  await createAuditLog({
    action: AUDIT_ACTIONS.API_KEY_ROTATED,
    resource: 'apiKey',
    resourceId: newKey.id,
    organizationId,
    userId,
    details: { oldKeyId: apiKeyId, newKeyId: newKey.id },
  });
  
  return newKey;
}

/**
 * Update API key permissions
 */
export async function updateApiKeyPermissions(apiKeyId, permissions, organizationId, userId) {
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
      organizationId,
    },
  });
  
  if (!apiKey) {
    throw new Error('API key not found');
  }
  
  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { permissions },
  });
  
  // Invalidate cache
  await cache.del(`${CACHE_PREFIX.API_KEY}${apiKey.keyHash}`);
  
  await createAuditLog({
    action: AUDIT_ACTIONS.API_KEY_UPDATED,
    resource: 'apiKey',
    resourceId: apiKeyId,
    organizationId,
    userId,
    details: { permissions },
  });
  
  return { success: true };
}

export default {
  createApiKey,
  validateApiKey,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
  updateApiKeyPermissions,
};
