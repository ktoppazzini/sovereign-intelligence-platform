/**
 * Sovereign Intelligence Platform
 * Audit Logger
 * 
 * SOC2/HIPAA compliant audit logging
 */

import { prisma } from '../db/prisma';
import { getCurrentOrgId, getCurrentUser } from './multiTenant';

// Action types for audit logging
export const AUDIT_ACTIONS = {
  // Authentication
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_LOGIN_FAILED: 'user.login_failed',
  USER_PASSWORD_CHANGED: 'user.password_changed',
  USER_2FA_ENABLED: 'user.2fa_enabled',
  USER_2FA_DISABLED: 'user.2fa_disabled',
  
  // User Management
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_ROLE_CHANGED: 'user.role_changed',
  USER_INVITED: 'user.invited',
  
  // Reports
  REPORT_CREATED: 'report.created',
  REPORT_UPDATED: 'report.updated',
  REPORT_DELETED: 'report.deleted',
  REPORT_SUBMITTED: 'report.submitted',
  REPORT_APPROVED: 'report.approved',
  REPORT_REJECTED: 'report.rejected',
  REPORT_FINALIZED: 'report.finalized',
  REPORT_EXPORTED: 'report.exported',
  REPORT_VIEWED: 'report.viewed',
  
  // API
  API_KEY_CREATED: 'api_key.created',
  API_KEY_REVOKED: 'api_key.revoked',
  API_KEY_USED: 'api_key.used',
  
  // Organization
  ORG_SETTINGS_UPDATED: 'org.settings_updated',
  ORG_PLAN_CHANGED: 'org.plan_changed',
  ORG_SSO_CONFIGURED: 'org.sso_configured',
  
  // Integrations
  INTEGRATION_CONNECTED: 'integration.connected',
  INTEGRATION_DISCONNECTED: 'integration.disconnected',
  
  // Data Access (HIPAA)
  PHI_ACCESSED: 'phi.accessed',
  PHI_EXPORTED: 'phi.exported',
  PHI_MODIFIED: 'phi.modified',
  
  // System
  SYSTEM_ERROR: 'system.error',
  SYSTEM_CONFIG_CHANGED: 'system.config_changed',
};

/**
 * Create audit log entry
 */
export async function createAuditLog({
  action,
  resource,
  resourceId,
  details,
  userId,
  organizationId,
  ipAddress,
  userAgent,
}) {
  try {
    // Use context if not provided
    const orgId = organizationId || getCurrentOrgId();
    const user = userId || getCurrentUser()?.id;
    
    if (!orgId) {
      console.warn('[Audit] No organization ID for audit log');
      return null;
    }
    
    const log = await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: user,
        action,
        resource,
        resourceId,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
      },
    });
    
    return log;
  } catch (error) {
    console.error('[Audit] Failed to create audit log:', error.message);
    return null;
  }
}

/**
 * Log user authentication
 */
export async function logAuth(action, userId, request, details = {}) {
  return createAuditLog({
    action,
    resource: 'user',
    resourceId: userId,
    details,
    userId,
    ipAddress: request?.headers?.get('x-forwarded-for')?.split(',')[0] || 
               request?.ip || 'unknown',
    userAgent: request?.headers?.get('user-agent') || 'unknown',
  });
}

/**
 * Log report action
 */
export async function logReportAction(action, reportId, details = {}, request = null) {
  return createAuditLog({
    action,
    resource: 'report',
    resourceId: reportId,
    details,
    ipAddress: request?.headers?.get('x-forwarded-for')?.split(',')[0],
    userAgent: request?.headers?.get('user-agent'),
  });
}

/**
 * Log API key usage
 */
export async function logApiKeyUsage(apiKeyId, endpoint, request) {
  return createAuditLog({
    action: AUDIT_ACTIONS.API_KEY_USED,
    resource: 'api_key',
    resourceId: apiKeyId,
    details: { endpoint },
    ipAddress: request?.headers?.get('x-forwarded-for')?.split(',')[0],
    userAgent: request?.headers?.get('user-agent'),
  });
}

/**
 * Log PHI access (HIPAA compliance)
 */
export async function logPHIAccess(resourceType, resourceId, accessType, request) {
  const action = accessType === 'export' ? AUDIT_ACTIONS.PHI_EXPORTED :
                 accessType === 'modify' ? AUDIT_ACTIONS.PHI_MODIFIED :
                 AUDIT_ACTIONS.PHI_ACCESSED;
  
  return createAuditLog({
    action,
    resource: resourceType,
    resourceId,
    details: { accessType },
    ipAddress: request?.headers?.get('x-forwarded-for')?.split(',')[0],
    userAgent: request?.headers?.get('user-agent'),
  });
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs({
  organizationId,
  userId,
  action,
  resource,
  resourceId,
  startDate,
  endDate,
  limit = 100,
  offset = 0,
}) {
  const where = { organizationId };
  
  if (userId) where.userId = userId;
  if (action) where.action = { contains: action };
  if (resource) where.resource = resource;
  if (resourceId) where.resourceId = resourceId;
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);
  
  return { logs, total, limit, offset };
}

/**
 * Export audit logs for compliance
 */
export async function exportAuditLogs(organizationId, startDate, endDate) {
  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { timestamp: 'asc' },
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
  });
  
  return logs.map(log => ({
    timestamp: log.timestamp.toISOString(),
    action: log.action,
    user: log.user?.email || 'system',
    userName: log.user?.name || 'System',
    resource: log.resource,
    resourceId: log.resourceId,
    details: log.details,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
  }));
}

export default {
  AUDIT_ACTIONS,
  createAuditLog,
  logAuth,
  logReportAction,
  logApiKeyUsage,
  logPHIAccess,
  queryAuditLogs,
  exportAuditLogs,
};
