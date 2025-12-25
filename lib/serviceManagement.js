// lib/serviceManagement.js
// [KT:SERVICE-MANAGEMENT-v1.0] Core Service Management Engine
// Handles: Roles, Permissions, Users, Incidents, Service Requests, BI Integration

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================
export const ROLES = {
  // System Roles
  SUPER_ADMIN: {
    id: 'super_admin',
    name: 'Super Administrator',
    level: 100,
    description: 'Full system access with all permissions',
    icon: '👑',
    color: '#ef4444',
  },
  ADMIN: {
    id: 'admin',
    name: 'Administrator',
    level: 90,
    description: 'System administration and user management',
    icon: '⚙️',
    color: '#f59e0b',
  },
  
  // Enterprise Roles
  EXECUTIVE: {
    id: 'executive',
    name: 'Executive',
    level: 80,
    description: 'C-Suite and senior leadership access',
    icon: '👔',
    color: '#8b5cf6',
  },
  DIRECTOR: {
    id: 'director',
    name: 'Director',
    level: 70,
    description: 'Department and division leadership',
    icon: '📊',
    color: '#3b82f6',
  },
  MANAGER: {
    id: 'manager',
    name: 'Manager',
    level: 60,
    description: 'Team and project management',
    icon: '👥',
    color: '#10b981',
  },
  ANALYST: {
    id: 'analyst',
    name: 'Analyst',
    level: 50,
    description: 'Data analysis and reporting',
    icon: '🔍',
    color: '#06b6d4',
  },
  USER: {
    id: 'user',
    name: 'Standard User',
    level: 40,
    description: 'Basic system access',
    icon: '👤',
    color: '#64748b',
  },
  VIEWER: {
    id: 'viewer',
    name: 'Viewer',
    level: 10,
    description: 'Read-only access',
    icon: '👁️',
    color: '#94a3b8',
  },
  
  // Defense-Specific Roles
  COMMANDER: {
    id: 'commander',
    name: 'Commander',
    level: 85,
    description: 'Military command authority',
    icon: '⭐',
    color: '#1e3a5f',
  },
  OPERATIONS_OFFICER: {
    id: 'operations_officer',
    name: 'Operations Officer',
    level: 65,
    description: 'Operational planning and execution',
    icon: '🎯',
    color: '#0d9488',
  },
  INTEL_ANALYST: {
    id: 'intel_analyst',
    name: 'Intelligence Analyst',
    level: 55,
    description: 'Intelligence analysis and threat assessment',
    icon: '📡',
    color: '#7c3aed',
  },
  
  // Pharma-Specific Roles
  CHIEF_SCIENTIFIC_OFFICER: {
    id: 'cso',
    name: 'Chief Scientific Officer',
    level: 85,
    description: 'Scientific strategy and pipeline oversight',
    icon: '🔬',
    color: '#14b8a6',
  },
  CLINICAL_DIRECTOR: {
    id: 'clinical_director',
    name: 'Clinical Director',
    level: 70,
    description: 'Clinical trial management',
    icon: '💊',
    color: '#0891b2',
  },
  REGULATORY_ANALYST: {
    id: 'regulatory_analyst',
    name: 'Regulatory Analyst',
    level: 55,
    description: 'Regulatory compliance and submissions',
    icon: '📋',
    color: '#059669',
  },
};

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================
export const PERMISSIONS = {
  // System Permissions
  SYSTEM_ADMIN: { id: 'system.admin', name: 'System Administration', category: 'System' },
  SYSTEM_CONFIG: { id: 'system.config', name: 'System Configuration', category: 'System' },
  SYSTEM_AUDIT: { id: 'system.audit', name: 'View Audit Logs', category: 'System' },
  
  // User Management
  USERS_VIEW: { id: 'users.view', name: 'View Users', category: 'Users' },
  USERS_CREATE: { id: 'users.create', name: 'Create Users', category: 'Users' },
  USERS_EDIT: { id: 'users.edit', name: 'Edit Users', category: 'Users' },
  USERS_DELETE: { id: 'users.delete', name: 'Delete Users', category: 'Users' },
  USERS_ASSIGN_ROLES: { id: 'users.assign_roles', name: 'Assign Roles', category: 'Users' },
  
  // Reports
  REPORTS_VIEW: { id: 'reports.view', name: 'View Reports', category: 'Reports' },
  REPORTS_CREATE: { id: 'reports.create', name: 'Create Reports', category: 'Reports' },
  REPORTS_EDIT: { id: 'reports.edit', name: 'Edit Reports', category: 'Reports' },
  REPORTS_DELETE: { id: 'reports.delete', name: 'Delete Reports', category: 'Reports' },
  REPORTS_EXPORT: { id: 'reports.export', name: 'Export Reports', category: 'Reports' },
  REPORTS_APPROVE: { id: 'reports.approve', name: 'Approve Reports', category: 'Reports' },
  
  // Service Requests
  SR_VIEW_OWN: { id: 'sr.view_own', name: 'View Own Service Requests', category: 'Service Requests' },
  SR_VIEW_ALL: { id: 'sr.view_all', name: 'View All Service Requests', category: 'Service Requests' },
  SR_CREATE: { id: 'sr.create', name: 'Create Service Requests', category: 'Service Requests' },
  SR_EDIT: { id: 'sr.edit', name: 'Edit Service Requests', category: 'Service Requests' },
  SR_ASSIGN: { id: 'sr.assign', name: 'Assign Service Requests', category: 'Service Requests' },
  SR_RESOLVE: { id: 'sr.resolve', name: 'Resolve Service Requests', category: 'Service Requests' },
  SR_ESCALATE: { id: 'sr.escalate', name: 'Escalate Service Requests', category: 'Service Requests' },
  
  // Incidents
  INCIDENT_VIEW_OWN: { id: 'incident.view_own', name: 'View Own Incidents', category: 'Incidents' },
  INCIDENT_VIEW_ALL: { id: 'incident.view_all', name: 'View All Incidents', category: 'Incidents' },
  INCIDENT_CREATE: { id: 'incident.create', name: 'Create Incidents', category: 'Incidents' },
  INCIDENT_EDIT: { id: 'incident.edit', name: 'Edit Incidents', category: 'Incidents' },
  INCIDENT_ASSIGN: { id: 'incident.assign', name: 'Assign Incidents', category: 'Incidents' },
  INCIDENT_RESOLVE: { id: 'incident.resolve', name: 'Resolve Incidents', category: 'Incidents' },
  INCIDENT_ESCALATE: { id: 'incident.escalate', name: 'Escalate Incidents', category: 'Incidents' },
  INCIDENT_MAJOR: { id: 'incident.major', name: 'Manage Major Incidents', category: 'Incidents' },
  
  // BI & Analytics
  BI_VIEW: { id: 'bi.view', name: 'View BI Dashboards', category: 'Analytics' },
  BI_CREATE: { id: 'bi.create', name: 'Create BI Reports', category: 'Analytics' },
  BI_EXPORT: { id: 'bi.export', name: 'Export BI Data', category: 'Analytics' },
  BI_ADMIN: { id: 'bi.admin', name: 'Administer BI', category: 'Analytics' },
  
  // Predictive Intelligence
  PREDICT_VIEW: { id: 'predict.view', name: 'View Predictions', category: 'Intelligence' },
  PREDICT_CONFIGURE: { id: 'predict.configure', name: 'Configure Predictions', category: 'Intelligence' },
  PREDICT_TRAIN: { id: 'predict.train', name: 'Train Models', category: 'Intelligence' },
  
  // Defense-Specific
  DEFENSE_CLASSIFIED: { id: 'defense.classified', name: 'Access Classified Data', category: 'Defense' },
  DEFENSE_OPERATIONS: { id: 'defense.operations', name: 'Operational Access', category: 'Defense' },
  DEFENSE_INTEL: { id: 'defense.intel', name: 'Intelligence Access', category: 'Defense' },
  
  // Pharma-Specific
  PHARMA_CLINICAL: { id: 'pharma.clinical', name: 'Clinical Trial Access', category: 'Pharma' },
  PHARMA_REGULATORY: { id: 'pharma.regulatory', name: 'Regulatory Access', category: 'Pharma' },
  PHARMA_GXP: { id: 'pharma.gxp', name: 'GxP Documentation', category: 'Pharma' },
};

// ============================================================================
// ROLE-PERMISSION MAPPINGS
// ============================================================================
export const ROLE_PERMISSIONS = {
  super_admin: Object.keys(PERMISSIONS).map(k => PERMISSIONS[k].id),
  
  admin: [
    'system.config', 'system.audit',
    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.assign_roles',
    'reports.view', 'reports.create', 'reports.edit', 'reports.delete', 'reports.export', 'reports.approve',
    'sr.view_all', 'sr.create', 'sr.edit', 'sr.assign', 'sr.resolve', 'sr.escalate',
    'incident.view_all', 'incident.create', 'incident.edit', 'incident.assign', 'incident.resolve', 'incident.escalate', 'incident.major',
    'bi.view', 'bi.create', 'bi.export', 'bi.admin',
    'predict.view', 'predict.configure',
  ],
  
  executive: [
    'users.view',
    'reports.view', 'reports.create', 'reports.export', 'reports.approve',
    'sr.view_all', 'sr.create', 'sr.escalate',
    'incident.view_all', 'incident.escalate', 'incident.major',
    'bi.view', 'bi.create', 'bi.export',
    'predict.view', 'predict.configure',
  ],
  
  director: [
    'users.view',
    'reports.view', 'reports.create', 'reports.edit', 'reports.export',
    'sr.view_all', 'sr.create', 'sr.assign', 'sr.resolve',
    'incident.view_all', 'incident.create', 'incident.assign', 'incident.resolve',
    'bi.view', 'bi.create', 'bi.export',
    'predict.view',
  ],
  
  manager: [
    'reports.view', 'reports.create', 'reports.edit', 'reports.export',
    'sr.view_all', 'sr.create', 'sr.edit', 'sr.assign', 'sr.resolve',
    'incident.view_all', 'incident.create', 'incident.edit', 'incident.assign', 'incident.resolve',
    'bi.view', 'bi.create',
    'predict.view',
  ],
  
  analyst: [
    'reports.view', 'reports.create', 'reports.export',
    'sr.view_own', 'sr.create',
    'incident.view_own', 'incident.create',
    'bi.view', 'bi.create', 'bi.export',
    'predict.view',
  ],
  
  user: [
    'reports.view',
    'sr.view_own', 'sr.create',
    'incident.view_own', 'incident.create',
    'bi.view',
    'predict.view',
  ],
  
  viewer: [
    'reports.view',
    'sr.view_own',
    'incident.view_own',
    'bi.view',
  ],
  
  // Defense roles
  commander: [
    'reports.view', 'reports.create', 'reports.approve', 'reports.export',
    'sr.view_all', 'sr.escalate',
    'incident.view_all', 'incident.escalate', 'incident.major',
    'bi.view', 'bi.export',
    'predict.view', 'predict.configure',
    'defense.classified', 'defense.operations', 'defense.intel',
  ],
  
  operations_officer: [
    'reports.view', 'reports.create', 'reports.edit', 'reports.export',
    'sr.view_all', 'sr.create', 'sr.assign', 'sr.resolve',
    'incident.view_all', 'incident.create', 'incident.assign', 'incident.resolve',
    'bi.view', 'bi.create',
    'predict.view',
    'defense.operations',
  ],
  
  intel_analyst: [
    'reports.view', 'reports.create', 'reports.export',
    'sr.view_own', 'sr.create',
    'incident.view_own', 'incident.create',
    'bi.view', 'bi.create', 'bi.export',
    'predict.view', 'predict.configure', 'predict.train',
    'defense.intel',
  ],
  
  // Pharma roles
  cso: [
    'reports.view', 'reports.create', 'reports.approve', 'reports.export',
    'sr.view_all', 'sr.escalate',
    'incident.view_all', 'incident.escalate', 'incident.major',
    'bi.view', 'bi.create', 'bi.export',
    'predict.view', 'predict.configure',
    'pharma.clinical', 'pharma.regulatory', 'pharma.gxp',
  ],
  
  clinical_director: [
    'reports.view', 'reports.create', 'reports.edit', 'reports.export',
    'sr.view_all', 'sr.create', 'sr.assign', 'sr.resolve',
    'incident.view_all', 'incident.create', 'incident.assign', 'incident.resolve',
    'bi.view', 'bi.create',
    'predict.view',
    'pharma.clinical', 'pharma.gxp',
  ],
  
  regulatory_analyst: [
    'reports.view', 'reports.create', 'reports.export',
    'sr.view_own', 'sr.create',
    'incident.view_own', 'incident.create',
    'bi.view', 'bi.create', 'bi.export',
    'predict.view',
    'pharma.regulatory', 'pharma.gxp',
  ],
};

// ============================================================================
// INCIDENT PRIORITIES & STATUSES
// ============================================================================
export const INCIDENT_PRIORITIES = {
  P1: { id: 'P1', name: 'Critical', slaHours: 1, color: '#ef4444', description: 'Business critical - immediate response required' },
  P2: { id: 'P2', name: 'High', slaHours: 4, color: '#f59e0b', description: 'Significant impact - urgent response' },
  P3: { id: 'P3', name: 'Medium', slaHours: 24, color: '#3b82f6', description: 'Moderate impact - standard response' },
  P4: { id: 'P4', name: 'Low', slaHours: 72, color: '#10b981', description: 'Minimal impact - scheduled response' },
};

export const INCIDENT_STATUSES = {
  NEW: { id: 'new', name: 'New', color: '#8b5cf6' },
  ASSIGNED: { id: 'assigned', name: 'Assigned', color: '#3b82f6' },
  IN_PROGRESS: { id: 'in_progress', name: 'In Progress', color: '#f59e0b' },
  PENDING: { id: 'pending', name: 'Pending', color: '#64748b' },
  RESOLVED: { id: 'resolved', name: 'Resolved', color: '#10b981' },
  CLOSED: { id: 'closed', name: 'Closed', color: '#1e293b' },
};

export const INCIDENT_CATEGORIES = {
  SYSTEM: { id: 'system', name: 'System Issue', icon: '💻' },
  REPORT: { id: 'report', name: 'Report Issue', icon: '📄' },
  ACCESS: { id: 'access', name: 'Access Issue', icon: '🔐' },
  DATA: { id: 'data', name: 'Data Issue', icon: '📊' },
  PERFORMANCE: { id: 'performance', name: 'Performance Issue', icon: '⚡' },
  SECURITY: { id: 'security', name: 'Security Issue', icon: '🛡️' },
  INTEGRATION: { id: 'integration', name: 'Integration Issue', icon: '🔗' },
  OTHER: { id: 'other', name: 'Other', icon: '❓' },
};

// ============================================================================
// SERVICE REQUEST TYPES
// ============================================================================
export const SERVICE_REQUEST_TYPES = {
  NEW_REPORT: { id: 'new_report', name: 'New Report Request', slaHours: 48, icon: '📝' },
  REPORT_MODIFICATION: { id: 'report_mod', name: 'Report Modification', slaHours: 24, icon: '✏️' },
  DATA_REQUEST: { id: 'data_request', name: 'Data Request', slaHours: 72, icon: '📊' },
  ACCESS_REQUEST: { id: 'access_request', name: 'Access Request', slaHours: 24, icon: '🔑' },
  TRAINING_REQUEST: { id: 'training', name: 'Training Request', slaHours: 168, icon: '📚' },
  CONSULTATION: { id: 'consultation', name: 'Consultation Request', slaHours: 48, icon: '💬' },
  ENHANCEMENT: { id: 'enhancement', name: 'Enhancement Request', slaHours: 240, icon: '🚀' },
  BI_DASHBOARD: { id: 'bi_dashboard', name: 'BI Dashboard Request', slaHours: 120, icon: '📈' },
};

export const SERVICE_REQUEST_STATUSES = {
  SUBMITTED: { id: 'submitted', name: 'Submitted', color: '#8b5cf6' },
  UNDER_REVIEW: { id: 'under_review', name: 'Under Review', color: '#3b82f6' },
  APPROVED: { id: 'approved', name: 'Approved', color: '#10b981' },
  IN_PROGRESS: { id: 'in_progress', name: 'In Progress', color: '#f59e0b' },
  PENDING_INFO: { id: 'pending_info', name: 'Pending Information', color: '#64748b' },
  COMPLETED: { id: 'completed', name: 'Completed', color: '#059669' },
  REJECTED: { id: 'rejected', name: 'Rejected', color: '#ef4444' },
  CANCELLED: { id: 'cancelled', name: 'Cancelled', color: '#1e293b' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(roleId, permissionId) {
  const rolePerms = ROLE_PERMISSIONS[roleId] || [];
  return rolePerms.includes(permissionId);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(roleId, permissionIds) {
  return permissionIds.some(p => hasPermission(roleId, p));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(roleId, permissionIds) {
  return permissionIds.every(p => hasPermission(roleId, p));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(roleId) {
  return ROLE_PERMISSIONS[roleId] || [];
}

/**
 * Get permission details by ID
 */
export function getPermissionDetails(permissionId) {
  return Object.values(PERMISSIONS).find(p => p.id === permissionId);
}

/**
 * Get role details by ID
 */
export function getRoleDetails(roleId) {
  return Object.values(ROLES).find(r => r.id === roleId);
}

/**
 * Calculate SLA deadline
 */
export function calculateSLADeadline(createdAt, slaHours) {
  const deadline = new Date(createdAt);
  deadline.setHours(deadline.getHours() + slaHours);
  return deadline;
}

/**
 * Check if SLA is breached
 */
export function isSLABreached(createdAt, slaHours) {
  const deadline = calculateSLADeadline(createdAt, slaHours);
  return new Date() > deadline;
}

/**
 * Get SLA status
 */
export function getSLAStatus(createdAt, slaHours) {
  const deadline = calculateSLADeadline(createdAt, slaHours);
  const now = new Date();
  const remaining = deadline - now;
  const totalMs = slaHours * 60 * 60 * 1000;
  const percentRemaining = (remaining / totalMs) * 100;
  
  if (remaining < 0) return { status: 'breached', color: '#ef4444', remaining: 0 };
  if (percentRemaining < 25) return { status: 'critical', color: '#f59e0b', remaining };
  if (percentRemaining < 50) return { status: 'warning', color: '#eab308', remaining };
  return { status: 'ok', color: '#10b981', remaining };
}

/**
 * Generate unique ID
 */
export function generateId(prefix = 'SI') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Group permissions by category
 */
export function groupPermissionsByCategory() {
  const grouped = {};
  Object.values(PERMISSIONS).forEach(p => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });
  return grouped;
}

/**
 * Get roles by industry
 */
export function getRolesByIndustry(industry) {
  const commonRoles = ['super_admin', 'admin', 'executive', 'director', 'manager', 'analyst', 'user', 'viewer'];
  
  switch (industry) {
    case 'defense':
      return [...commonRoles, 'commander', 'operations_officer', 'intel_analyst'];
    case 'pharma':
      return [...commonRoles, 'cso', 'clinical_director', 'regulatory_analyst'];
    default:
      return commonRoles;
  }
}
