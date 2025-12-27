/**
 * Sovereign Intelligence Platform
 * Multi-Tenant Context Manager
 * 
 * Handles organization isolation, user context, and tenant-aware queries
 */

import { prisma } from '../db/prisma';
import { cache, CACHE_PREFIX, TTL } from '../cache/redis';

/**
 * Permission constants for role-based access control
 */
export const PERMISSIONS = {
  // Report permissions
  CREATE_REPORTS: 'create_reports',
  READ_REPORTS: 'read_reports',
  UPDATE_REPORTS: 'update_reports',
  DELETE_REPORTS: 'delete_reports',
  APPROVE_REPORTS: 'approve_reports',
  FINALIZE_REPORTS: 'finalize_reports',
  
  // User management
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  
  // Organization settings
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_SETTINGS: 'view_settings',
  
  // API & Integrations
  MANAGE_API_KEYS: 'manage_api_keys',
  MANAGE_INTEGRATIONS: 'manage_integrations',
  MANAGE_WEBHOOKS: 'manage_webhooks',
  
  // Workflows
  MANAGE_WORKFLOWS: 'manage_workflows',
  VIEW_WORKFLOWS: 'view_workflows',
  
  // Analytics
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data',
  
  // Audit
  VIEW_AUDIT_LOGS: 'view_audit_logs',
};

/**
 * Role-based permission mappings
 */
export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: Object.values(PERMISSIONS), // All permissions
  OWNER: Object.values(PERMISSIONS),
  ADMIN: [
    PERMISSIONS.CREATE_REPORTS, PERMISSIONS.READ_REPORTS, PERMISSIONS.UPDATE_REPORTS, 
    PERMISSIONS.DELETE_REPORTS, PERMISSIONS.APPROVE_REPORTS, PERMISSIONS.FINALIZE_REPORTS,
    PERMISSIONS.MANAGE_USERS, PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.MANAGE_API_KEYS, PERMISSIONS.MANAGE_INTEGRATIONS, PERMISSIONS.MANAGE_WEBHOOKS,
    PERMISSIONS.MANAGE_WORKFLOWS, PERMISSIONS.VIEW_WORKFLOWS,
    PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
  MANAGER: [
    PERMISSIONS.CREATE_REPORTS, PERMISSIONS.READ_REPORTS, PERMISSIONS.UPDATE_REPORTS,
    PERMISSIONS.DELETE_REPORTS, PERMISSIONS.APPROVE_REPORTS,
    PERMISSIONS.VIEW_USERS, PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.VIEW_WORKFLOWS, PERMISSIONS.VIEW_ANALYTICS,
  ],
  ANALYST: [
    PERMISSIONS.CREATE_REPORTS, PERMISSIONS.READ_REPORTS, PERMISSIONS.UPDATE_REPORTS,
    PERMISSIONS.VIEW_WORKFLOWS, PERMISSIONS.VIEW_ANALYTICS,
  ],
  MEMBER: [
    PERMISSIONS.CREATE_REPORTS, PERMISSIONS.READ_REPORTS, PERMISSIONS.UPDATE_REPORTS,
  ],
  VIEWER: [
    PERMISSIONS.READ_REPORTS, PERMISSIONS.VIEW_ANALYTICS,
  ],
};

// Async local storage for request context
const { AsyncLocalStorage } = require('async_hooks');
const tenantContext = new AsyncLocalStorage();

/**
 * Get current tenant context
 */
export function getTenantContext() {
  return tenantContext.getStore() || null;
}

/**
 * Get current organization ID
 */
export function getCurrentOrgId() {
  const ctx = getTenantContext();
  return ctx?.organizationId || null;
}

/**
 * Get current user
 */
export function getCurrentUser() {
  const ctx = getTenantContext();
  return ctx?.user || null;
}

/**
 * Run code within tenant context
 */
export function runWithTenant(context, fn) {
  return tenantContext.run(context, fn);
}

/**
 * Load organization by ID with caching
 */
export async function getOrganization(orgId) {
  const cacheKey = `${CACHE_PREFIX.ORG}${orgId}`;
  
  return cache.getOrSet(cacheKey, async () => {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        settings: true,
        ssoEnabled: true,
        hipaaEnabled: true,
        soc2Enabled: true,
      },
    });
    return org;
  }, TTL.MEDIUM);
}

/**
 * Load organization by slug with caching
 */
export async function getOrganizationBySlug(slug) {
  const cacheKey = `${CACHE_PREFIX.ORG}slug:${slug}`;
  
  return cache.getOrSet(cacheKey, async () => {
    const org = await prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        settings: true,
      },
    });
    return org;
  }, TTL.MEDIUM);
}

/**
 * Load user with organization context
 */
export async function getUserWithOrg(userId) {
  const cacheKey = `${CACHE_PREFIX.USER}${userId}`;
  
  return cache.getOrSet(cacheKey, async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        language: true,
        timezone: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
          },
        },
      },
    });
    return user;
  }, TTL.MEDIUM);
}

/**
 * Invalidate organization cache
 */
export async function invalidateOrgCache(orgId) {
  await cache.delPattern(`${CACHE_PREFIX.ORG}${orgId}*`);
}

/**
 * Invalidate user cache
 */
export async function invalidateUserCache(userId) {
  await cache.del(`${CACHE_PREFIX.USER}${userId}`);
}

/**
 * Create tenant-aware Prisma extension
 */
export function createTenantPrisma(orgId) {
  return prisma.$extends({
    query: {
      // Automatically filter queries by organization
      report: {
        async findMany({ model, operation, args, query }) {
          args.where = { ...args.where, organizationId: orgId };
          return query(args);
        },
        async findFirst({ model, operation, args, query }) {
          args.where = { ...args.where, organizationId: orgId };
          return query(args);
        },
        async create({ model, operation, args, query }) {
          args.data = { ...args.data, organizationId: orgId };
          return query(args);
        },
      },
      user: {
        async findMany({ model, operation, args, query }) {
          args.where = { ...args.where, organizationId: orgId };
          return query(args);
        },
      },
      workflow: {
        async findMany({ model, operation, args, query }) {
          args.where = { ...args.where, organizationId: orgId };
          return query(args);
        },
      },
      apiKey: {
        async findMany({ model, operation, args, query }) {
          args.where = { ...args.where, organizationId: orgId };
          return query(args);
        },
      },
      auditLog: {
        async create({ model, operation, args, query }) {
          args.data = { ...args.data, organizationId: orgId };
          return query(args);
        },
      },
    },
  });
}

/**
 * Check if user has permission for action
 */
export function hasPermission(userRole, permission) {
  const role = typeof userRole === 'string' ? userRole : userRole?.role;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission) || role === 'SUPER_ADMIN' || role === 'OWNER';
}

/**
 * Middleware to extract tenant from request
 */
export async function extractTenantFromRequest(request) {
  // Try API key first
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    const keyData = await validateApiKey(apiKey);
    if (keyData) {
      return {
        organizationId: keyData.organizationId,
        apiKeyId: keyData.id,
        plan: keyData.organization?.plan || 'FREE',
      };
    }
  }
  
  // Try session/JWT
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = await validateSession(token);
    if (session) {
      return {
        organizationId: session.user.organizationId,
        userId: session.userId,
        user: session.user,
        plan: session.user.organization?.plan || 'FREE',
      };
    }
  }
  
  return null;
}

/**
 * Validate API key
 */
async function validateApiKey(key) {
  const crypto = require('crypto');
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  
  const cacheKey = `${CACHE_PREFIX.API_KEY}${keyHash}`;
  
  return cache.getOrSet(cacheKey, async () => {
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        organization: {
          select: { id: true, plan: true },
        },
      },
    });
    
    if (!apiKey || apiKey.revokedAt || (apiKey.expiresAt && apiKey.expiresAt < new Date())) {
      return null;
    }
    
    // Update usage stats (fire and forget)
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
    }).catch(() => {});
    
    return apiKey;
  }, TTL.SHORT);
}

/**
 * Validate session token
 */
async function validateSession(token) {
  const cacheKey = `${CACHE_PREFIX.SESSION}${token}`;
  
  return cache.getOrSet(cacheKey, async () => {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            organizationId: true,
            organization: {
              select: { id: true, plan: true, name: true },
            },
          },
        },
      },
    });
    
    if (!session || session.expiresAt < new Date()) {
      return null;
    }
    
    return session;
  }, TTL.SHORT);
}

export default {
  getTenantContext,
  getCurrentOrgId,
  getCurrentUser,
  runWithTenant,
  getOrganization,
  getUserWithOrg,
  createTenantPrisma,
  hasPermission,
  extractTenantFromRequest,
};
