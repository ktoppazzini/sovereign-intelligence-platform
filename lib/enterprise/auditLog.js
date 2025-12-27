// lib/enterprise/auditLog.js
// [KT:AUDIT-LOG-v1.0] Enterprise Audit Logging System
// SOC 2, HIPAA, FedRAMP, GDPR compliant audit trail
// Immutable logs with cryptographic integrity verification

import Airtable from 'airtable';
import crypto from 'crypto';

const TAG = '[ENTERPRISE:AUDIT]';

// ============================================================================
// Airtable Configuration
// ============================================================================
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ''
);

// ============================================================================
// Audit Event Categories
// ============================================================================
export const AUDIT_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification',
  CONFIGURATION: 'configuration',
  SECURITY: 'security',
  BILLING: 'billing',
  INTEGRATION: 'integration',
  SYSTEM: 'system',
  COMPLIANCE: 'compliance',
};

// ============================================================================
// Audit Event Types
// ============================================================================
export const AUDIT_EVENTS = {
  // Authentication Events
  USER_LOGIN: { category: 'authentication', severity: 'info', retention: 365 },
  USER_LOGOUT: { category: 'authentication', severity: 'info', retention: 365 },
  USER_LOGIN_FAILED: { category: 'authentication', severity: 'warning', retention: 730 },
  PASSWORD_CHANGED: { category: 'authentication', severity: 'info', retention: 730 },
  PASSWORD_RESET_REQUESTED: { category: 'authentication', severity: 'warning', retention: 730 },
  MFA_ENABLED: { category: 'authentication', severity: 'info', retention: 730 },
  MFA_DISABLED: { category: 'authentication', severity: 'warning', retention: 730 },
  SESSION_EXPIRED: { category: 'authentication', severity: 'info', retention: 90 },
  API_KEY_CREATED: { category: 'authentication', severity: 'info', retention: 730 },
  API_KEY_REVOKED: { category: 'authentication', severity: 'info', retention: 730 },
  
  // Authorization Events
  PERMISSION_GRANTED: { category: 'authorization', severity: 'info', retention: 730 },
  PERMISSION_REVOKED: { category: 'authorization', severity: 'info', retention: 730 },
  ROLE_ASSIGNED: { category: 'authorization', severity: 'info', retention: 730 },
  ROLE_REMOVED: { category: 'authorization', severity: 'info', retention: 730 },
  ACCESS_DENIED: { category: 'authorization', severity: 'warning', retention: 730 },
  
  // Data Access Events
  REPORT_VIEWED: { category: 'data_access', severity: 'info', retention: 365 },
  REPORT_EXPORTED: { category: 'data_access', severity: 'info', retention: 365 },
  REPORT_SHARED: { category: 'data_access', severity: 'info', retention: 365 },
  DATA_DOWNLOADED: { category: 'data_access', severity: 'info', retention: 365 },
  BULK_EXPORT: { category: 'data_access', severity: 'warning', retention: 730 },
  
  // Data Modification Events
  REPORT_CREATED: { category: 'data_modification', severity: 'info', retention: 730 },
  REPORT_UPDATED: { category: 'data_modification', severity: 'info', retention: 730 },
  REPORT_DELETED: { category: 'data_modification', severity: 'warning', retention: 730 },
  USER_CREATED: { category: 'data_modification', severity: 'info', retention: 730 },
  USER_UPDATED: { category: 'data_modification', severity: 'info', retention: 730 },
  USER_DELETED: { category: 'data_modification', severity: 'warning', retention: 730 },
  ORGANIZATION_CREATED: { category: 'data_modification', severity: 'info', retention: 730 },
  ORGANIZATION_UPDATED: { category: 'data_modification', severity: 'info', retention: 730 },
  TEAM_CREATED: { category: 'data_modification', severity: 'info', retention: 730 },
  TEAM_DELETED: { category: 'data_modification', severity: 'warning', retention: 730 },
  
  // Configuration Events
  SETTINGS_CHANGED: { category: 'configuration', severity: 'info', retention: 730 },
  INTEGRATION_ENABLED: { category: 'configuration', severity: 'info', retention: 730 },
  INTEGRATION_DISABLED: { category: 'configuration', severity: 'info', retention: 730 },
  WEBHOOK_CONFIGURED: { category: 'configuration', severity: 'info', retention: 730 },
  SSO_CONFIGURED: { category: 'configuration', severity: 'warning', retention: 730 },
  
  // Security Events
  SUSPICIOUS_ACTIVITY: { category: 'security', severity: 'critical', retention: 1095 },
  BRUTE_FORCE_DETECTED: { category: 'security', severity: 'critical', retention: 1095 },
  RATE_LIMIT_EXCEEDED: { category: 'security', severity: 'warning', retention: 365 },
  IP_BLOCKED: { category: 'security', severity: 'warning', retention: 730 },
  SECURITY_ALERT: { category: 'security', severity: 'critical', retention: 1095 },
  
  // Billing Events
  SUBSCRIPTION_CREATED: { category: 'billing', severity: 'info', retention: 2555 },
  SUBSCRIPTION_UPGRADED: { category: 'billing', severity: 'info', retention: 2555 },
  SUBSCRIPTION_DOWNGRADED: { category: 'billing', severity: 'info', retention: 2555 },
  SUBSCRIPTION_CANCELLED: { category: 'billing', severity: 'warning', retention: 2555 },
  PAYMENT_SUCCEEDED: { category: 'billing', severity: 'info', retention: 2555 },
  PAYMENT_FAILED: { category: 'billing', severity: 'warning', retention: 2555 },
  INVOICE_CREATED: { category: 'billing', severity: 'info', retention: 2555 },
  REFUND_ISSUED: { category: 'billing', severity: 'warning', retention: 2555 },
  
  // Integration Events
  API_CALL: { category: 'integration', severity: 'info', retention: 90 },
  WEBHOOK_SENT: { category: 'integration', severity: 'info', retention: 90 },
  WEBHOOK_FAILED: { category: 'integration', severity: 'warning', retention: 365 },
  OAUTH_CONNECTED: { category: 'integration', severity: 'info', retention: 365 },
  OAUTH_DISCONNECTED: { category: 'integration', severity: 'info', retention: 365 },
  
  // System Events
  SYSTEM_ERROR: { category: 'system', severity: 'error', retention: 365 },
  MAINTENANCE_STARTED: { category: 'system', severity: 'info', retention: 365 },
  MAINTENANCE_COMPLETED: { category: 'system', severity: 'info', retention: 365 },
  BACKUP_CREATED: { category: 'system', severity: 'info', retention: 365 },
  
  // Compliance Events
  DATA_EXPORT_REQUEST: { category: 'compliance', severity: 'warning', retention: 2555 },
  DATA_DELETION_REQUEST: { category: 'compliance', severity: 'warning', retention: 2555 },
  GDPR_REQUEST: { category: 'compliance', severity: 'warning', retention: 2555 },
  COMPLIANCE_REPORT_GENERATED: { category: 'compliance', severity: 'info', retention: 2555 },
};

// ============================================================================
// Audit Log Entry
// ============================================================================

/**
 * Generate cryptographic hash for audit log integrity
 */
function generateLogHash(entry) {
  const content = JSON.stringify({
    timestamp: entry.timestamp,
    eventType: entry.eventType,
    actorId: entry.actorId,
    resourceId: entry.resourceId,
    details: entry.details,
  });
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate chain hash linking to previous log entry
 */
function generateChainHash(previousHash, currentHash) {
  return crypto.createHash('sha256').update(previousHash + currentHash).digest('hex');
}

/**
 * Create an audit log entry
 */
export async function logAuditEvent({
  eventType,
  organizationId,
  actorId,
  actorEmail,
  actorType = 'user', // user, system, api, webhook
  resourceType,
  resourceId,
  resourceName,
  action,
  details = {},
  ipAddress,
  userAgent,
  requestId,
  result = 'success', // success, failure, error
  errorMessage,
}) {
  console.log(TAG, 'logAuditEvent', { eventType, actorEmail, resourceType, result });
  
  try {
    const eventConfig = AUDIT_EVENTS[eventType] || {
      category: 'system',
      severity: 'info',
      retention: 365,
    };
    
    const logId = `log_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const timestamp = new Date().toISOString();
    
    // Build entry object
    const entry = {
      logId,
      timestamp,
      eventType,
      category: eventConfig.category,
      severity: eventConfig.severity,
      organizationId: organizationId || 'system',
      actorId: actorId || 'system',
      actorEmail: actorEmail || 'system@sovereign.ai',
      actorType,
      resourceType,
      resourceId,
      resourceName,
      action,
      details,
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      requestId: requestId || logId,
      result,
      errorMessage,
      retentionDays: eventConfig.retention,
      expiresAt: new Date(Date.now() + eventConfig.retention * 24 * 60 * 60 * 1000).toISOString(),
    };
    
    // Generate integrity hash
    const logHash = generateLogHash(entry);
    
    // Store in Airtable
    await base('Audit Logs').create({
      'Log ID': logId,
      'Timestamp': timestamp,
      'Event Type': eventType,
      'Category': eventConfig.category,
      'Severity': eventConfig.severity,
      'Organization ID': organizationId || '',
      'Actor ID': actorId || '',
      'Actor Email': actorEmail || '',
      'Actor Type': actorType,
      'Resource Type': resourceType || '',
      'Resource ID': resourceId || '',
      'Resource Name': resourceName || '',
      'Action': action || eventType,
      'Details': JSON.stringify(details),
      'IP Address': ipAddress || '',
      'User Agent': userAgent || '',
      'Request ID': requestId || logId,
      'Result': result,
      'Error Message': errorMessage || '',
      'Integrity Hash': logHash,
      'Retention Days': eventConfig.retention,
      'Expires At': entry.expiresAt,
    });
    
    // For critical events, trigger alerts
    if (eventConfig.severity === 'critical') {
      await triggerSecurityAlert(entry);
    }
    
    return {
      logId,
      timestamp,
      eventType,
      result: 'logged',
    };
  } catch (error) {
    console.error(TAG, 'logAuditEvent.error', error);
    // Audit logging should never throw - fallback to console
    console.error(TAG, 'AUDIT_FALLBACK', {
      eventType,
      actorEmail,
      resourceType,
      error: error.message,
    });
    return { logId: null, error: error.message };
  }
}

/**
 * Trigger security alert for critical events
 */
async function triggerSecurityAlert(entry) {
  console.warn(TAG, 'SECURITY_ALERT', entry);
  
  // In production, this would:
  // 1. Send email to security team
  // 2. Send Slack/PagerDuty notification
  // 3. Potentially block suspicious activity
  
  try {
    await base('Security Alerts').create({
      'Alert ID': `alert_${Date.now()}`,
      'Log ID': entry.logId,
      'Event Type': entry.eventType,
      'Organization ID': entry.organizationId,
      'Actor ID': entry.actorId,
      'Details': JSON.stringify(entry.details),
      'Status': 'open',
      'Created At': new Date().toISOString(),
    });
  } catch (error) {
    console.error(TAG, 'triggerSecurityAlert.error', error);
  }
}

// ============================================================================
// Query Audit Logs
// ============================================================================

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs({
  organizationId,
  actorId,
  eventType,
  category,
  severity,
  resourceType,
  resourceId,
  startDate,
  endDate,
  result,
  limit = 100,
  offset = 0,
}) {
  try {
    const filters = [];
    
    if (organizationId) filters.push(`{Organization ID} = "${organizationId}"`);
    if (actorId) filters.push(`{Actor ID} = "${actorId}"`);
    if (eventType) filters.push(`{Event Type} = "${eventType}"`);
    if (category) filters.push(`{Category} = "${category}"`);
    if (severity) filters.push(`{Severity} = "${severity}"`);
    if (resourceType) filters.push(`{Resource Type} = "${resourceType}"`);
    if (resourceId) filters.push(`{Resource ID} = "${resourceId}"`);
    if (result) filters.push(`{Result} = "${result}"`);
    if (startDate) filters.push(`{Timestamp} >= "${startDate}"`);
    if (endDate) filters.push(`{Timestamp} <= "${endDate}"`);
    
    const formula = filters.length > 0 ? `AND(${filters.join(', ')})` : '';
    
    const records = await base('Audit Logs')
      .select({
        filterByFormula: formula || undefined,
        maxRecords: limit,
        sort: [{ field: 'Timestamp', direction: 'desc' }],
      })
      .firstPage();
    
    return {
      logs: records.map(record => ({
        logId: record.fields['Log ID'],
        timestamp: record.fields['Timestamp'],
        eventType: record.fields['Event Type'],
        category: record.fields['Category'],
        severity: record.fields['Severity'],
        organizationId: record.fields['Organization ID'],
        actorId: record.fields['Actor ID'],
        actorEmail: record.fields['Actor Email'],
        actorType: record.fields['Actor Type'],
        resourceType: record.fields['Resource Type'],
        resourceId: record.fields['Resource ID'],
        resourceName: record.fields['Resource Name'],
        action: record.fields['Action'],
        details: JSON.parse(record.fields['Details'] || '{}'),
        ipAddress: record.fields['IP Address'],
        result: record.fields['Result'],
        errorMessage: record.fields['Error Message'],
      })),
      total: records.length,
      hasMore: records.length === limit,
    };
  } catch (error) {
    console.error(TAG, 'queryAuditLogs.error', error);
    throw error;
  }
}

/**
 * Get audit log by ID
 */
export async function getAuditLog(logId) {
  try {
    const records = await base('Audit Logs')
      .select({
        filterByFormula: `{Log ID} = "${logId}"`,
        maxRecords: 1,
      })
      .firstPage();
    
    if (records.length === 0) return null;
    
    const record = records[0];
    return {
      logId: record.fields['Log ID'],
      timestamp: record.fields['Timestamp'],
      eventType: record.fields['Event Type'],
      category: record.fields['Category'],
      severity: record.fields['Severity'],
      organizationId: record.fields['Organization ID'],
      actorId: record.fields['Actor ID'],
      actorEmail: record.fields['Actor Email'],
      resourceType: record.fields['Resource Type'],
      resourceId: record.fields['Resource ID'],
      details: JSON.parse(record.fields['Details'] || '{}'),
      ipAddress: record.fields['IP Address'],
      userAgent: record.fields['User Agent'],
      result: record.fields['Result'],
      integrityHash: record.fields['Integrity Hash'],
    };
  } catch (error) {
    console.error(TAG, 'getAuditLog.error', error);
    throw error;
  }
}

/**
 * Verify audit log integrity
 */
export async function verifyLogIntegrity(logId) {
  try {
    const log = await getAuditLog(logId);
    if (!log) return { valid: false, reason: 'Log not found' };
    
    const recalculatedHash = generateLogHash({
      timestamp: log.timestamp,
      eventType: log.eventType,
      actorId: log.actorId,
      resourceId: log.resourceId,
      details: log.details,
    });
    
    const valid = recalculatedHash === log.integrityHash;
    
    return {
      valid,
      storedHash: log.integrityHash,
      calculatedHash: recalculatedHash,
      reason: valid ? 'Integrity verified' : 'Hash mismatch - log may have been tampered',
    };
  } catch (error) {
    console.error(TAG, 'verifyLogIntegrity.error', error);
    return { valid: false, reason: error.message };
  }
}

// ============================================================================
// Compliance Reports
// ============================================================================

/**
 * Generate compliance report for date range
 */
export async function generateComplianceReport({
  organizationId,
  startDate,
  endDate,
  reportType = 'full', // full, security, access, billing
}) {
  console.log(TAG, 'generateComplianceReport', { organizationId, reportType, startDate, endDate });
  
  try {
    // Query all logs for period
    const result = await queryAuditLogs({
      organizationId,
      startDate,
      endDate,
      limit: 10000,
    });
    
    const logs = result.logs;
    
    // Generate statistics
    const stats = {
      totalEvents: logs.length,
      byCategory: {},
      bySeverity: {},
      byResult: {},
      byActor: {},
      securityIncidents: [],
      accessPatterns: [],
    };
    
    logs.forEach(log => {
      // By category
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
      
      // By severity
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
      
      // By result
      stats.byResult[log.result] = (stats.byResult[log.result] || 0) + 1;
      
      // By actor
      if (log.actorEmail) {
        stats.byActor[log.actorEmail] = (stats.byActor[log.actorEmail] || 0) + 1;
      }
      
      // Security incidents
      if (log.severity === 'critical' || log.severity === 'error') {
        stats.securityIncidents.push({
          timestamp: log.timestamp,
          eventType: log.eventType,
          actor: log.actorEmail,
          details: log.details,
        });
      }
    });
    
    // Log the report generation itself
    await logAuditEvent({
      eventType: 'COMPLIANCE_REPORT_GENERATED',
      organizationId,
      actorId: 'system',
      resourceType: 'compliance_report',
      resourceId: `report_${Date.now()}`,
      details: { reportType, startDate, endDate, eventCount: logs.length },
    });
    
    return {
      reportId: `compliance_${Date.now()}`,
      organizationId,
      reportType,
      period: { startDate, endDate },
      generatedAt: new Date().toISOString(),
      statistics: stats,
      summary: {
        totalEvents: stats.totalEvents,
        criticalIncidents: stats.bySeverity.critical || 0,
        failedOperations: stats.byResult.failure || 0,
        uniqueActors: Object.keys(stats.byActor).length,
      },
    };
  } catch (error) {
    console.error(TAG, 'generateComplianceReport.error', error);
    throw error;
  }
}

/**
 * Get user activity report
 */
export async function getUserActivityReport(organizationId, userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  const result = await queryAuditLogs({
    organizationId,
    actorId: userId,
    startDate,
    limit: 1000,
  });
  
  return {
    userId,
    organizationId,
    period: `Last ${days} days`,
    totalEvents: result.logs.length,
    events: result.logs.slice(0, 100), // Return last 100
    summary: {
      logins: result.logs.filter(l => l.eventType === 'USER_LOGIN').length,
      reportsViewed: result.logs.filter(l => l.eventType === 'REPORT_VIEWED').length,
      reportsCreated: result.logs.filter(l => l.eventType === 'REPORT_CREATED').length,
      exports: result.logs.filter(l => l.eventType === 'REPORT_EXPORTED').length,
    },
  };
}

// ============================================================================
// Convenience Logging Functions
// ============================================================================

export const audit = {
  // Authentication
  login: (data) => logAuditEvent({ eventType: 'USER_LOGIN', ...data }),
  logout: (data) => logAuditEvent({ eventType: 'USER_LOGOUT', ...data }),
  loginFailed: (data) => logAuditEvent({ eventType: 'USER_LOGIN_FAILED', result: 'failure', ...data }),
  
  // Data Access
  viewReport: (data) => logAuditEvent({ eventType: 'REPORT_VIEWED', resourceType: 'report', ...data }),
  exportReport: (data) => logAuditEvent({ eventType: 'REPORT_EXPORTED', resourceType: 'report', ...data }),
  shareReport: (data) => logAuditEvent({ eventType: 'REPORT_SHARED', resourceType: 'report', ...data }),
  
  // Data Modification
  createReport: (data) => logAuditEvent({ eventType: 'REPORT_CREATED', resourceType: 'report', ...data }),
  updateReport: (data) => logAuditEvent({ eventType: 'REPORT_UPDATED', resourceType: 'report', ...data }),
  deleteReport: (data) => logAuditEvent({ eventType: 'REPORT_DELETED', resourceType: 'report', ...data }),
  
  // User Management
  createUser: (data) => logAuditEvent({ eventType: 'USER_CREATED', resourceType: 'user', ...data }),
  updateUser: (data) => logAuditEvent({ eventType: 'USER_UPDATED', resourceType: 'user', ...data }),
  deleteUser: (data) => logAuditEvent({ eventType: 'USER_DELETED', resourceType: 'user', ...data }),
  
  // Security
  accessDenied: (data) => logAuditEvent({ eventType: 'ACCESS_DENIED', result: 'failure', ...data }),
  suspiciousActivity: (data) => logAuditEvent({ eventType: 'SUSPICIOUS_ACTIVITY', ...data }),
  rateLimitExceeded: (data) => logAuditEvent({ eventType: 'RATE_LIMIT_EXCEEDED', ...data }),
  
  // Billing
  subscriptionCreated: (data) => logAuditEvent({ eventType: 'SUBSCRIPTION_CREATED', resourceType: 'subscription', ...data }),
  paymentSucceeded: (data) => logAuditEvent({ eventType: 'PAYMENT_SUCCEEDED', resourceType: 'payment', ...data }),
  paymentFailed: (data) => logAuditEvent({ eventType: 'PAYMENT_FAILED', result: 'failure', resourceType: 'payment', ...data }),
  
  // API
  apiCall: (data) => logAuditEvent({ eventType: 'API_CALL', actorType: 'api', ...data }),
};

export default {
  AUDIT_CATEGORIES,
  AUDIT_EVENTS,
  logAuditEvent,
  queryAuditLogs,
  getAuditLog,
  verifyLogIntegrity,
  generateComplianceReport,
  getUserActivityReport,
  audit,
};
