// lib/enterprise/index.js
// [KT:ENTERPRISE-v1.0] Sovereign Intelligence Enterprise Module Index
// Unified export for all enterprise-grade functionality
// Designed for Fortune 500, Government, and Global Enterprise deployments

// ============================================================================
// Multi-Tenant Architecture
// ============================================================================
export * from './multiTenant';
export { default as multiTenant } from './multiTenant';

// ============================================================================
// Enterprise Audit Logging
// ============================================================================
export * from './auditLog';
export { default as auditLog } from './auditLog';

// ============================================================================
// Rate Limiting & Quotas
// ============================================================================
export * from './rateLimiter';
export { default as rateLimiter } from './rateLimiter';

// ============================================================================
// Analytics & Telemetry
// ============================================================================
export * from './analytics';
export { default as analytics } from './analytics';

// ============================================================================
// Notification System
// ============================================================================
export * from './notifications';
export { default as notifications } from './notifications';

// ============================================================================
// Webhook System
// ============================================================================
export * from './webhooks';
export { default as webhooks } from './webhooks';

// ============================================================================
// Background Jobs
// ============================================================================
export * from './backgroundJobs';
export { default as backgroundJobs } from './backgroundJobs';

// ============================================================================
// AI Agents - Autonomous Workers (MASSIVE VALUE MULTIPLIER)
// ============================================================================
export * from './aiAgents';
export { default as aiAgents } from './aiAgents';

// ============================================================================
// API Platform - Developer Ecosystem (PLATFORM PLAY)
// ============================================================================
export * from './apiPlatform';
export { default as apiPlatform } from './apiPlatform';

// ============================================================================
// White-Label & Reseller System (REVENUE MULTIPLIER)
// ============================================================================
export * from './whiteLabel';
export { default as whiteLabel } from './whiteLabel';

// ============================================================================
// Enterprise Connectors (FASTER ENTERPRISE SALES)
// ============================================================================
export * from './connectors';
export { default as connectors } from './connectors';

// ============================================================================
// Embedded Analytics SDK (B2B2C REVENUE MODEL)
// ============================================================================
export * from './embeddedAnalytics';
export { default as embeddedAnalytics } from './embeddedAnalytics';

// ============================================================================
// Marketplace & App Store (ECOSYSTEM LOCK-IN)
// ============================================================================
export * from './marketplace';
export { default as marketplace } from './marketplace';

// ============================================================================
// Usage-Based Billing (CONSUMPTION REVENUE)
// ============================================================================
export * from './usageBilling';
export { default as usageBilling } from './usageBilling';

// ============================================================================
// SSO/SAML Authentication (ENTERPRISE REQUIREMENT)
// ============================================================================
export * from './sso';
export { default as sso } from './sso';

// ============================================================================
// Custom Report Builder (SELF-SERVICE ANALYTICS)
// ============================================================================
export * from './reportBuilder';
export { default as reportBuilder } from './reportBuilder';

// ============================================================================
// Data Import/Export (BULK DATA OPERATIONS)
// ============================================================================
export * from './dataImportExport';
export { default as dataImportExport } from './dataImportExport';

// ============================================================================
// Convenience Imports
// ============================================================================
import { audit } from './auditLog';
import { notify } from './notifications';
import { webhooks as webhookTriggers } from './webhooks';
import { jobs } from './backgroundJobs';
import {
  hasPermission,
  checkPermissions,
  hasFeature,
  trackUsage,
  checkUsageLimit,
} from './multiTenant';
import {
  checkRateLimit,
  checkQuota,
  trackSuspiciousActivity,
} from './rateLimiter';
import {
  trackEvent,
  trackFeatureUsage,
  trackConversion,
  incrementCounter,
  getDashboardMetrics,
} from './analytics';

// ============================================================================
// Enterprise Service Object
// ============================================================================
export const enterprise = {
  // Audit logging shortcuts
  audit,
  
  // Notification shortcuts
  notify,
  
  // Webhook shortcuts
  webhooks: webhookTriggers,
  
  // Background job shortcuts
  jobs,
  
  // Permission checking
  hasPermission,
  checkPermissions,
  hasFeature,
  
  // Usage & quotas
  trackUsage,
  checkUsageLimit,
  checkRateLimit,
  checkQuota,
  
  // Analytics
  trackEvent,
  trackFeatureUsage,
  trackConversion,
  incrementCounter,
  getDashboardMetrics,
  
  // Security
  trackSuspiciousActivity,
};

export default enterprise;

// ============================================================================
// Version & Info
// ============================================================================
export const ENTERPRISE_VERSION = '1.0.0';
export const ENTERPRISE_BUILD = '2025-01-01';
export const ENTERPRISE_MODULES = [
  'multiTenant',
  'auditLog',
  'rateLimiter',
  'analytics',
  'notifications',
  'webhooks',
  'backgroundJobs',
];

/**
 * Get enterprise module info
 */
export function getEnterpriseInfo() {
  return {
    version: ENTERPRISE_VERSION,
    build: ENTERPRISE_BUILD,
    modules: ENTERPRISE_MODULES,
    capabilities: {
      multiTenant: {
        description: 'Multi-organization architecture with roles & permissions',
        features: ['organizations', 'teams', 'roles', 'permissions', 'quotas'],
      },
      auditLog: {
        description: 'SOC 2 / HIPAA / FedRAMP compliant audit logging',
        features: ['immutable logs', 'integrity verification', 'compliance reports'],
      },
      rateLimiter: {
        description: 'Token bucket & sliding window rate limiting',
        features: ['per-user limits', 'per-org limits', 'quota management'],
      },
      analytics: {
        description: 'Real-time metrics and business intelligence',
        features: ['dashboards', 'funnels', 'cohorts', 'usage reports'],
      },
      notifications: {
        description: 'Multi-channel notification system',
        features: ['email', 'in-app', 'SMS', 'Slack', 'webhooks'],
      },
      webhooks: {
        description: 'Outbound webhooks for integrations',
        features: ['signatures', 'retries', 'delivery tracking'],
      },
      backgroundJobs: {
        description: 'Async job queue for heavy processing',
        features: ['priorities', 'retries', 'scheduling', 'dead-letter queue'],
      },
    },
  };
}
