// lib/enterprise/multiTenant.js
// [KT:MULTI-TENANT-v1.0] Enterprise Multi-Tenant Architecture
// Supports unlimited organizations, teams, roles, and hierarchical permissions
// Designed for Fortune 500, Government, and Global Enterprise deployments

import Airtable from 'airtable';

const TAG = '[ENTERPRISE:MULTI-TENANT]';

// ============================================================================
// Airtable Configuration
// ============================================================================
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ''
);

// ============================================================================
// Organization Tiers & Limits
// ============================================================================
export const ORGANIZATION_TIERS = {
  free: {
    name: 'Free',
    maxUsers: 1,
    maxTeams: 0,
    maxReportsPerMonth: 10,
    maxApiCallsPerMonth: 1000,
    maxStorage: '1 GB',
    features: ['basic_reports'],
    support: 'community',
    sla: null,
  },
  starter: {
    name: 'Starter',
    maxUsers: 5,
    maxTeams: 2,
    maxReportsPerMonth: 100,
    maxApiCallsPerMonth: 10000,
    maxStorage: '10 GB',
    features: ['basic_reports', 'pdf_export', 'email_support', '50_languages'],
    support: 'email',
    sla: '99%',
  },
  professional: {
    name: 'Professional',
    maxUsers: 25,
    maxTeams: 10,
    maxReportsPerMonth: -1, // unlimited
    maxApiCallsPerMonth: 100000,
    maxStorage: '100 GB',
    features: [
      'basic_reports', 'pdf_export', 'priority_support', '207_languages',
      'api_access', 'webhooks', 'custom_branding', 'analytics',
      'team_collaboration', 'audit_logs', 'sso',
    ],
    support: 'priority',
    sla: '99.5%',
  },
  enterprise: {
    name: 'Enterprise',
    maxUsers: -1, // unlimited
    maxTeams: -1,
    maxReportsPerMonth: -1,
    maxApiCallsPerMonth: -1,
    maxStorage: 'unlimited',
    features: [
      'basic_reports', 'pdf_export', 'dedicated_support', '207_languages',
      'api_access', 'webhooks', 'custom_branding', 'analytics',
      'team_collaboration', 'audit_logs', 'sso', 'saml',
      'on_premise', 'dedicated_infrastructure', 'custom_sla',
      'compliance_reports', 'data_residency', 'advanced_security',
    ],
    support: 'dedicated',
    sla: '99.99%',
  },
  government: {
    name: 'Government',
    maxUsers: -1,
    maxTeams: -1,
    maxReportsPerMonth: -1,
    maxApiCallsPerMonth: -1,
    maxStorage: 'unlimited',
    features: [
      'basic_reports', 'pdf_export', 'dedicated_support', '207_languages',
      'api_access', 'webhooks', 'custom_branding', 'analytics',
      'team_collaboration', 'audit_logs', 'sso', 'saml',
      'on_premise', 'air_gapped', 'fedramp', 'security_clearance',
      'compliance_reports', 'data_residency', 'advanced_security',
      'custom_integrations', 'priority_roadmap',
    ],
    support: 'dedicated_team',
    sla: '99.999%',
  },
};

// ============================================================================
// Role Definitions (RBAC)
// ============================================================================
export const ORGANIZATION_ROLES = {
  owner: {
    name: 'Owner',
    level: 100,
    permissions: ['*'], // All permissions
    description: 'Full control over organization',
  },
  admin: {
    name: 'Administrator',
    level: 90,
    permissions: [
      'org:read', 'org:update', 'org:billing',
      'users:*', 'teams:*', 'reports:*', 'settings:*',
      'integrations:*', 'audit:read', 'analytics:*',
    ],
    description: 'Manage organization settings and users',
  },
  manager: {
    name: 'Manager',
    level: 70,
    permissions: [
      'org:read',
      'users:read', 'users:invite',
      'teams:read', 'teams:update',
      'reports:*',
      'analytics:read',
    ],
    description: 'Manage teams and reports',
  },
  analyst: {
    name: 'Analyst',
    level: 50,
    permissions: [
      'org:read',
      'reports:create', 'reports:read', 'reports:update',
      'analytics:read',
    ],
    description: 'Create and analyze reports',
  },
  viewer: {
    name: 'Viewer',
    level: 20,
    permissions: [
      'org:read',
      'reports:read',
      'analytics:read',
    ],
    description: 'View reports and analytics',
  },
  guest: {
    name: 'Guest',
    level: 10,
    permissions: [
      'reports:read:shared',
    ],
    description: 'View shared reports only',
  },
};

// ============================================================================
// Permission Checking
// ============================================================================
export function hasPermission(userRole, requiredPermission) {
  const role = ORGANIZATION_ROLES[userRole];
  if (!role) return false;
  
  // Owner has all permissions
  if (role.permissions.includes('*')) return true;
  
  // Check exact permission
  if (role.permissions.includes(requiredPermission)) return true;
  
  // Check wildcard permissions (e.g., 'reports:*' covers 'reports:create')
  const [resource, action] = requiredPermission.split(':');
  if (role.permissions.includes(`${resource}:*`)) return true;
  
  return false;
}

export function checkPermissions(userRole, requiredPermissions) {
  return requiredPermissions.every(perm => hasPermission(userRole, perm));
}

// ============================================================================
// Organization Management
// ============================================================================

/**
 * Create a new organization
 */
export async function createOrganization({
  name,
  ownerId,
  ownerEmail,
  tier = 'free',
  industry,
  country,
  metadata = {},
}) {
  console.log(TAG, 'createOrganization', { name, ownerEmail, tier });
  
  try {
    const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const record = await base('Organizations').create({
      'Organization ID': orgId,
      'Name': name,
      'Owner ID': ownerId,
      'Owner Email': ownerEmail,
      'Tier': tier,
      'Industry': industry,
      'Country': country,
      'Status': 'active',
      'Created At': new Date().toISOString(),
      'Settings': JSON.stringify({
        branding: { logo: null, primaryColor: '#6366f1' },
        notifications: { email: true, slack: false },
        security: { mfaRequired: false, sessionTimeout: 24 },
        ...metadata,
      }),
      'Usage This Month': JSON.stringify({
        reports: 0,
        apiCalls: 0,
        storage: 0,
        periodStart: new Date().toISOString(),
      }),
    });
    
    // Add owner as first member
    await addOrganizationMember({
      organizationId: orgId,
      userId: ownerId,
      email: ownerEmail,
      role: 'owner',
    });
    
    return {
      id: orgId,
      recordId: record.id,
      name,
      tier,
      status: 'active',
    };
  } catch (error) {
    console.error(TAG, 'createOrganization.error', error);
    throw error;
  }
}

/**
 * Get organization by ID
 */
export async function getOrganization(organizationId) {
  try {
    const records = await base('Organizations')
      .select({
        filterByFormula: `{Organization ID} = "${organizationId}"`,
        maxRecords: 1,
      })
      .firstPage();
    
    if (records.length === 0) return null;
    
    const record = records[0];
    const tierConfig = ORGANIZATION_TIERS[record.fields['Tier']] || ORGANIZATION_TIERS.free;
    
    return {
      id: record.fields['Organization ID'],
      recordId: record.id,
      name: record.fields['Name'],
      tier: record.fields['Tier'],
      tierConfig,
      industry: record.fields['Industry'],
      country: record.fields['Country'],
      status: record.fields['Status'],
      ownerId: record.fields['Owner ID'],
      ownerEmail: record.fields['Owner Email'],
      stripeCustomerId: record.fields['Stripe Customer ID'],
      subscriptionId: record.fields['Subscription ID'],
      subscriptionStatus: record.fields['Subscription Status'],
      settings: JSON.parse(record.fields['Settings'] || '{}'),
      usage: JSON.parse(record.fields['Usage This Month'] || '{}'),
      createdAt: record.fields['Created At'],
    };
  } catch (error) {
    console.error(TAG, 'getOrganization.error', error);
    throw error;
  }
}

/**
 * Update organization
 */
export async function updateOrganization(organizationId, updates) {
  try {
    const org = await getOrganization(organizationId);
    if (!org) throw new Error('Organization not found');
    
    const fields = {};
    if (updates.name) fields['Name'] = updates.name;
    if (updates.tier) fields['Tier'] = updates.tier;
    if (updates.industry) fields['Industry'] = updates.industry;
    if (updates.country) fields['Country'] = updates.country;
    if (updates.status) fields['Status'] = updates.status;
    if (updates.settings) {
      fields['Settings'] = JSON.stringify({
        ...org.settings,
        ...updates.settings,
      });
    }
    if (updates.stripeCustomerId) fields['Stripe Customer ID'] = updates.stripeCustomerId;
    if (updates.subscriptionId) fields['Subscription ID'] = updates.subscriptionId;
    if (updates.subscriptionStatus) fields['Subscription Status'] = updates.subscriptionStatus;
    
    fields['Updated At'] = new Date().toISOString();
    
    await base('Organizations').update(org.recordId, fields);
    
    return { ...org, ...updates };
  } catch (error) {
    console.error(TAG, 'updateOrganization.error', error);
    throw error;
  }
}

// ============================================================================
// Organization Members
// ============================================================================

/**
 * Add member to organization
 */
export async function addOrganizationMember({
  organizationId,
  userId,
  email,
  role = 'viewer',
  teamIds = [],
  invitedBy,
}) {
  console.log(TAG, 'addOrganizationMember', { organizationId, email, role });
  
  try {
    // Check if already a member
    const existing = await getOrganizationMember(organizationId, userId || email);
    if (existing) {
      throw new Error('User is already a member of this organization');
    }
    
    const memberId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await base('Organization Members').create({
      'Member ID': memberId,
      'Organization ID': organizationId,
      'User ID': userId || '',
      'Email': email,
      'Role': role,
      'Team IDs': JSON.stringify(teamIds),
      'Status': userId ? 'active' : 'invited',
      'Invited By': invitedBy || '',
      'Invited At': new Date().toISOString(),
      'Joined At': userId ? new Date().toISOString() : '',
    });
    
    return {
      id: memberId,
      organizationId,
      userId,
      email,
      role,
      status: userId ? 'active' : 'invited',
    };
  } catch (error) {
    console.error(TAG, 'addOrganizationMember.error', error);
    throw error;
  }
}

/**
 * Get organization member
 */
export async function getOrganizationMember(organizationId, userIdOrEmail) {
  try {
    const formula = `AND({Organization ID} = "${organizationId}", OR({User ID} = "${userIdOrEmail}", {Email} = "${userIdOrEmail}"))`;
    
    const records = await base('Organization Members')
      .select({
        filterByFormula: formula,
        maxRecords: 1,
      })
      .firstPage();
    
    if (records.length === 0) return null;
    
    const record = records[0];
    return {
      id: record.fields['Member ID'],
      recordId: record.id,
      organizationId: record.fields['Organization ID'],
      userId: record.fields['User ID'],
      email: record.fields['Email'],
      role: record.fields['Role'],
      roleConfig: ORGANIZATION_ROLES[record.fields['Role']],
      teamIds: JSON.parse(record.fields['Team IDs'] || '[]'),
      status: record.fields['Status'],
      joinedAt: record.fields['Joined At'],
    };
  } catch (error) {
    console.error(TAG, 'getOrganizationMember.error', error);
    throw error;
  }
}

/**
 * List organization members
 */
export async function listOrganizationMembers(organizationId, options = {}) {
  try {
    const { status, role, limit = 100 } = options;
    
    let formula = `{Organization ID} = "${organizationId}"`;
    if (status) formula = `AND(${formula}, {Status} = "${status}")`;
    if (role) formula = `AND(${formula}, {Role} = "${role}")`;
    
    const records = await base('Organization Members')
      .select({
        filterByFormula: formula,
        maxRecords: limit,
        sort: [{ field: 'Joined At', direction: 'desc' }],
      })
      .firstPage();
    
    return records.map(record => ({
      id: record.fields['Member ID'],
      recordId: record.id,
      userId: record.fields['User ID'],
      email: record.fields['Email'],
      role: record.fields['Role'],
      roleConfig: ORGANIZATION_ROLES[record.fields['Role']],
      status: record.fields['Status'],
      joinedAt: record.fields['Joined At'],
    }));
  } catch (error) {
    console.error(TAG, 'listOrganizationMembers.error', error);
    throw error;
  }
}

/**
 * Update member role
 */
export async function updateMemberRole(organizationId, memberId, newRole, updatedBy) {
  try {
    const records = await base('Organization Members')
      .select({
        filterByFormula: `AND({Organization ID} = "${organizationId}", {Member ID} = "${memberId}")`,
        maxRecords: 1,
      })
      .firstPage();
    
    if (records.length === 0) throw new Error('Member not found');
    
    // Cannot change owner role
    if (records[0].fields['Role'] === 'owner') {
      throw new Error('Cannot change owner role');
    }
    
    await base('Organization Members').update(records[0].id, {
      'Role': newRole,
      'Updated By': updatedBy,
      'Updated At': new Date().toISOString(),
    });
    
    return { memberId, role: newRole };
  } catch (error) {
    console.error(TAG, 'updateMemberRole.error', error);
    throw error;
  }
}

/**
 * Remove member from organization
 */
export async function removeMember(organizationId, memberId, removedBy) {
  try {
    const records = await base('Organization Members')
      .select({
        filterByFormula: `AND({Organization ID} = "${organizationId}", {Member ID} = "${memberId}")`,
        maxRecords: 1,
      })
      .firstPage();
    
    if (records.length === 0) throw new Error('Member not found');
    
    // Cannot remove owner
    if (records[0].fields['Role'] === 'owner') {
      throw new Error('Cannot remove organization owner');
    }
    
    await base('Organization Members').destroy(records[0].id);
    
    return { memberId, removed: true };
  } catch (error) {
    console.error(TAG, 'removeMember.error', error);
    throw error;
  }
}

// ============================================================================
// Teams
// ============================================================================

/**
 * Create team within organization
 */
export async function createTeam({
  organizationId,
  name,
  description,
  managerId,
  createdBy,
}) {
  console.log(TAG, 'createTeam', { organizationId, name });
  
  try {
    // Check organization limits
    const org = await getOrganization(organizationId);
    if (!org) throw new Error('Organization not found');
    
    const existingTeams = await listTeams(organizationId);
    const maxTeams = org.tierConfig.maxTeams;
    
    if (maxTeams !== -1 && existingTeams.length >= maxTeams) {
      throw new Error(`Team limit reached. Upgrade to create more teams.`);
    }
    
    const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await base('Teams').create({
      'Team ID': teamId,
      'Organization ID': organizationId,
      'Name': name,
      'Description': description || '',
      'Manager ID': managerId || '',
      'Member Count': 0,
      'Created By': createdBy,
      'Created At': new Date().toISOString(),
    });
    
    return {
      id: teamId,
      organizationId,
      name,
      description,
      managerId,
    };
  } catch (error) {
    console.error(TAG, 'createTeam.error', error);
    throw error;
  }
}

/**
 * List teams in organization
 */
export async function listTeams(organizationId) {
  try {
    const records = await base('Teams')
      .select({
        filterByFormula: `{Organization ID} = "${organizationId}"`,
        sort: [{ field: 'Name', direction: 'asc' }],
      })
      .firstPage();
    
    return records.map(record => ({
      id: record.fields['Team ID'],
      recordId: record.id,
      name: record.fields['Name'],
      description: record.fields['Description'],
      managerId: record.fields['Manager ID'],
      memberCount: record.fields['Member Count'] || 0,
      createdAt: record.fields['Created At'],
    }));
  } catch (error) {
    console.error(TAG, 'listTeams.error', error);
    throw error;
  }
}

// ============================================================================
// Usage Tracking
// ============================================================================

/**
 * Track usage for an organization
 */
export async function trackUsage(organizationId, usageType, amount = 1) {
  try {
    const org = await getOrganization(organizationId);
    if (!org) throw new Error('Organization not found');
    
    const usage = org.usage || {
      reports: 0,
      apiCalls: 0,
      storage: 0,
      periodStart: new Date().toISOString(),
    };
    
    // Reset if new month
    const periodStart = new Date(usage.periodStart);
    const now = new Date();
    if (periodStart.getMonth() !== now.getMonth() || periodStart.getFullYear() !== now.getFullYear()) {
      usage.reports = 0;
      usage.apiCalls = 0;
      usage.periodStart = now.toISOString();
    }
    
    // Update usage
    if (usageType === 'report') usage.reports += amount;
    if (usageType === 'apiCall') usage.apiCalls += amount;
    if (usageType === 'storage') usage.storage += amount;
    
    // Check limits
    const limits = org.tierConfig;
    const exceeded = {
      reports: limits.maxReportsPerMonth !== -1 && usage.reports > limits.maxReportsPerMonth,
      apiCalls: limits.maxApiCallsPerMonth !== -1 && usage.apiCalls > limits.maxApiCallsPerMonth,
    };
    
    // Update in Airtable
    await base('Organizations').update(org.recordId, {
      'Usage This Month': JSON.stringify(usage),
    });
    
    return {
      usage,
      limits: {
        reports: limits.maxReportsPerMonth,
        apiCalls: limits.maxApiCallsPerMonth,
        storage: limits.maxStorage,
      },
      exceeded,
      warning: exceeded.reports || exceeded.apiCalls,
    };
  } catch (error) {
    console.error(TAG, 'trackUsage.error', error);
    throw error;
  }
}

/**
 * Check if usage limit exceeded
 */
export async function checkUsageLimit(organizationId, usageType) {
  try {
    const org = await getOrganization(organizationId);
    if (!org) return { allowed: false, reason: 'Organization not found' };
    
    const usage = org.usage || { reports: 0, apiCalls: 0 };
    const limits = org.tierConfig;
    
    if (usageType === 'report') {
      if (limits.maxReportsPerMonth === -1) return { allowed: true };
      return {
        allowed: usage.reports < limits.maxReportsPerMonth,
        current: usage.reports,
        limit: limits.maxReportsPerMonth,
        reason: usage.reports >= limits.maxReportsPerMonth ? 'Report limit exceeded' : null,
      };
    }
    
    if (usageType === 'apiCall') {
      if (limits.maxApiCallsPerMonth === -1) return { allowed: true };
      return {
        allowed: usage.apiCalls < limits.maxApiCallsPerMonth,
        current: usage.apiCalls,
        limit: limits.maxApiCallsPerMonth,
        reason: usage.apiCalls >= limits.maxApiCallsPerMonth ? 'API call limit exceeded' : null,
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error(TAG, 'checkUsageLimit.error', error);
    return { allowed: false, reason: error.message };
  }
}

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Check if organization has access to a feature
 */
export async function hasFeature(organizationId, featureName) {
  try {
    const org = await getOrganization(organizationId);
    if (!org) return false;
    
    return org.tierConfig.features.includes(featureName);
  } catch (error) {
    console.error(TAG, 'hasFeature.error', error);
    return false;
  }
}

/**
 * Get all features for an organization
 */
export async function getFeatures(organizationId) {
  try {
    const org = await getOrganization(organizationId);
    if (!org) return [];
    
    return org.tierConfig.features;
  } catch (error) {
    console.error(TAG, 'getFeatures.error', error);
    return [];
  }
}

export default {
  ORGANIZATION_TIERS,
  ORGANIZATION_ROLES,
  hasPermission,
  checkPermissions,
  createOrganization,
  getOrganization,
  updateOrganization,
  addOrganizationMember,
  getOrganizationMember,
  listOrganizationMembers,
  updateMemberRole,
  removeMember,
  createTeam,
  listTeams,
  trackUsage,
  checkUsageLimit,
  hasFeature,
  getFeatures,
};
