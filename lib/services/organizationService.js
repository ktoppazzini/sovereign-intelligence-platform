/**
 * Sovereign Intelligence Platform
 * Organization Service - Multi-tenant Organization Management
 */

import { prisma } from '../db/prisma';
import { cache, CACHE_PREFIX, TTL } from '../cache/redis';
import { createAuditLog, AUDIT_ACTIONS } from '../middleware/auditLogger';

/**
 * Create organization
 */
export async function createOrganization({
  name,
  slug,
  plan = 'FREE',
  vertical,
  settings = {},
  createdById,
}) {
  // Generate slug if not provided
  const orgSlug = slug || name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Check if slug exists
  const existing = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });
  
  if (existing) {
    throw new Error('Organization slug already exists');
  }
  
  const organization = await prisma.organization.create({
    data: {
      name,
      slug: orgSlug,
      plan,
      vertical,
      settings,
    },
  });
  
  await createAuditLog({
    action: AUDIT_ACTIONS.ORG_CREATED,
    resource: 'organization',
    resourceId: organization.id,
    organizationId: organization.id,
    userId: createdById,
    details: { name, plan, vertical },
  });
  
  return organization;
}

/**
 * Get organization by ID with caching
 */
export async function getOrganization(organizationId) {
  const cacheKey = `${CACHE_PREFIX.ORG}${organizationId}`;
  
  return cache.getOrSet(cacheKey, async () => {
    return prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            users: true,
            reports: true,
            apiKeys: true,
          },
        },
      },
    });
  }, TTL.MEDIUM);
}

/**
 * Get organization by slug
 */
export async function getOrganizationBySlug(slug) {
  const cacheKey = `${CACHE_PREFIX.ORG}slug:${slug}`;
  
  return cache.getOrSet(cacheKey, async () => {
    return prisma.organization.findUnique({
      where: { slug },
    });
  }, TTL.MEDIUM);
}

/**
 * Update organization
 */
export async function updateOrganization(organizationId, data, userId) {
  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
  
  // Invalidate cache
  await cache.del(`${CACHE_PREFIX.ORG}${organizationId}`);
  if (organization.slug) {
    await cache.del(`${CACHE_PREFIX.ORG}slug:${organization.slug}`);
  }
  
  await createAuditLog({
    action: AUDIT_ACTIONS.ORG_UPDATED,
    resource: 'organization',
    resourceId: organizationId,
    organizationId,
    userId,
    details: { updated: Object.keys(data) },
  });
  
  return organization;
}

/**
 * Upgrade organization plan
 */
export async function upgradePlan(organizationId, newPlan, userId) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  
  const oldPlan = org.plan;
  
  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: { plan: newPlan },
  });
  
  await cache.del(`${CACHE_PREFIX.ORG}${organizationId}`);
  
  await createAuditLog({
    action: AUDIT_ACTIONS.ORG_PLAN_CHANGED,
    resource: 'organization',
    resourceId: organizationId,
    organizationId,
    userId,
    details: { oldPlan, newPlan },
  });
  
  return organization;
}

/**
 * Get organization members
 */
export async function getOrganizationMembers(organizationId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        lastActiveAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where: { organizationId } }),
  ]);
  
  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Invite user to organization
 */
export async function inviteUser(organizationId, email, role, invitedById) {
  // Check if user already exists in org
  const existingUser = await prisma.user.findFirst({
    where: {
      email,
      organizationId,
    },
  });
  
  if (existingUser) {
    throw new Error('User already in organization');
  }
  
  // Create invitation
  const invitation = await prisma.invitation.create({
    data: {
      email,
      role,
      organizationId,
      invitedById,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      token: crypto.randomUUID(),
    },
  });
  
  await createAuditLog({
    action: AUDIT_ACTIONS.USER_INVITED,
    resource: 'invitation',
    resourceId: invitation.id,
    organizationId,
    userId: invitedById,
    details: { email, role },
  });
  
  return invitation;
}

/**
 * Remove user from organization
 */
export async function removeUser(organizationId, userId, removedById) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      organizationId,
    },
  });
  
  if (!user) {
    throw new Error('User not found in organization');
  }
  
  // Don't allow removing the last admin
  if (user.role === 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: {
        organizationId,
        role: 'ADMIN',
      },
    });
    
    if (adminCount <= 1) {
      throw new Error('Cannot remove the last admin');
    }
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: { organizationId: null },
  });
  
  await createAuditLog({
    action: AUDIT_ACTIONS.USER_REMOVED,
    resource: 'user',
    resourceId: userId,
    organizationId,
    userId: removedById,
    details: { removedUserId: userId },
  });
  
  return { success: true };
}

/**
 * Update user role
 */
export async function updateUserRole(organizationId, userId, newRole, updatedById) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      organizationId,
    },
  });
  
  if (!user) {
    throw new Error('User not found in organization');
  }
  
  // Don't allow demoting the last admin
  if (user.role === 'ADMIN' && newRole !== 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: {
        organizationId,
        role: 'ADMIN',
      },
    });
    
    if (adminCount <= 1) {
      throw new Error('Cannot demote the last admin');
    }
  }
  
  const oldRole = user.role;
  
  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });
  
  await createAuditLog({
    action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
    resource: 'user',
    resourceId: userId,
    organizationId,
    userId: updatedById,
    details: { oldRole, newRole },
  });
  
  return { success: true };
}

/**
 * Get organization usage stats
 */
export async function getOrganizationUsage(organizationId, startDate, endDate) {
  const [
    totalReports,
    apiCalls,
    storage,
    activeUsers,
  ] = await Promise.all([
    prisma.report.count({
      where: {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.usageMetric.aggregate({
      where: {
        organizationId,
        metric: 'api_calls',
        timestamp: { gte: startDate, lte: endDate },
      },
      _sum: { value: true },
    }),
    prisma.usageMetric.findFirst({
      where: {
        organizationId,
        metric: 'storage_bytes',
      },
      orderBy: { timestamp: 'desc' },
    }),
    prisma.user.count({
      where: {
        organizationId,
        lastActiveAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);
  
  return {
    reports: totalReports,
    apiCalls: apiCalls._sum?.value || 0,
    storage: storage?.value || 0,
    activeUsers,
  };
}

export default {
  createOrganization,
  getOrganization,
  getOrganizationBySlug,
  updateOrganization,
  upgradePlan,
  getOrganizationMembers,
  inviteUser,
  removeUser,
  updateUserRole,
  getOrganizationUsage,
};
