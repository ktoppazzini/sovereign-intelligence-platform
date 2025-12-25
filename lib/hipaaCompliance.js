/**
 * HIPAA Compliance Module for Sovereign Intelligence
 * Ensures healthcare data handling meets HIPAA requirements
 * Created: December 25, 2025
 */

// HIPAA Safeguards Categories
export const HIPAA_SAFEGUARDS = {
  ADMINISTRATIVE: 'administrative',
  PHYSICAL: 'physical',
  TECHNICAL: 'technical',
};

// PHI (Protected Health Information) Field Types
export const PHI_FIELD_TYPES = {
  NAME: 'name',
  ADDRESS: 'address',
  DATE: 'date',
  PHONE: 'phone',
  FAX: 'fax',
  EMAIL: 'email',
  SSN: 'ssn',
  MRN: 'medical_record_number',
  HEALTH_PLAN: 'health_plan_beneficiary',
  ACCOUNT: 'account_number',
  LICENSE: 'license_number',
  VIN: 'vehicle_identifier',
  DEVICE_ID: 'device_identifier',
  URL: 'web_url',
  IP: 'ip_address',
  BIOMETRIC: 'biometric_identifier',
  PHOTO: 'photo',
  OTHER: 'other_unique_identifier',
};

// HIPAA-compliant audit log requirements
export const HIPAA_AUDIT_REQUIREMENTS = {
  // What must be logged
  requiredEvents: [
    'login_attempt',
    'login_success',
    'login_failure',
    'logout',
    'phi_access',
    'phi_modification',
    'phi_disclosure',
    'phi_export',
    'access_denied',
    'user_creation',
    'user_modification',
    'permission_change',
    'system_configuration_change',
  ],
  
  // Required fields in audit logs
  requiredFields: [
    'timestamp',
    'userId',
    'userRole',
    'ipAddress',
    'action',
    'resourceType',
    'resourceId',
    'outcome',
  ],
  
  // Retention requirements
  retentionPeriod: 6 * 365, // 6 years minimum
};

/**
 * Check if data contains PHI
 */
export function containsPHI(data) {
  if (!data) return false;
  
  const phiPatterns = {
    ssn: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/,
    mrn: /\b(MRN|MR#?)[\s:-]?\d{6,12}\b/i,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    dob: /\b(0[1-9]|1[0-2])[-\/](0[1-9]|[12]\d|3[01])[-\/](19|20)\d{2}\b/,
    healthPlan: /\b[A-Z]{3}\d{9,}\b/, // Health plan IDs
  };
  
  const str = JSON.stringify(data);
  
  return Object.values(phiPatterns).some(pattern => pattern.test(str));
}

/**
 * Mask PHI in data for logging
 */
export function maskPHI(data) {
  if (!data) return data;
  
  let str = typeof data === 'string' ? data : JSON.stringify(data);
  
  // Mask SSN
  str = str.replace(/\b(\d{3})[-.]?(\d{2})[-.]?(\d{4})\b/g, '***-**-$3');
  
  // Mask email (keep domain)
  str = str.replace(/\b([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g, '****@$2');
  
  // Mask phone
  str = str.replace(/\b(\d{3})[-.]?(\d{3})[-.]?(\d{4})\b/g, '***-***-$3');
  
  // Mask names (common patterns)
  str = str.replace(/"(firstName|lastName|patientName|name)":\s*"[^"]+"/gi, '"$1": "[REDACTED]"');
  
  // Mask dates
  str = str.replace(/\b(0[1-9]|1[0-2])[-\/](0[1-9]|[12]\d|3[01])[-\/](19|20)\d{2}\b/g, '**/**/****');
  
  return typeof data === 'string' ? str : JSON.parse(str);
}

/**
 * HIPAA-compliant access logging
 */
export function logPHIAccess(details) {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    eventType: 'PHI_ACCESS',
    
    // User info
    userId: details.userId,
    userName: details.userName,
    userRole: details.userRole,
    userDepartment: details.userDepartment,
    
    // Access details
    action: details.action, // view, create, update, delete, export
    resourceType: details.resourceType,
    resourceId: details.resourceId,
    phiFieldsAccessed: details.phiFields || [],
    
    // Request context
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    sessionId: details.sessionId,
    
    // Outcome
    outcome: details.outcome || 'success',
    reason: details.reason,
    
    // Compliance
    complianceTags: ['HIPAA', 'PHI_ACCESS'],
    retentionDays: HIPAA_AUDIT_REQUIREMENTS.retentionPeriod,
    
    // Additional metadata
    metadata: maskPHI(details.metadata),
  };
  
  // Log to audit trail
  console.log('[HIPAA AUDIT]', JSON.stringify(auditEntry));
  
  return auditEntry;
}

/**
 * Validate HIPAA compliance for an operation
 */
export function validateHIPAACompliance(operation, context) {
  const issues = [];
  
  // Check authentication
  if (!context.userId) {
    issues.push({
      code: 'AUTH_REQUIRED',
      message: 'User authentication required for PHI access',
      severity: 'critical',
    });
  }
  
  // Check authorization
  if (!context.userRole || !hasRolePermission(context.userRole, operation)) {
    issues.push({
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'User lacks required permissions for this PHI operation',
      severity: 'critical',
    });
  }
  
  // Check minimum necessary
  if (operation === 'access' && !context.purpose) {
    issues.push({
      code: 'PURPOSE_REQUIRED',
      message: 'Access purpose required (minimum necessary standard)',
      severity: 'warning',
    });
  }
  
  // Check encryption
  if (operation === 'export' && !context.encrypted) {
    issues.push({
      code: 'ENCRYPTION_REQUIRED',
      message: 'PHI exports must be encrypted',
      severity: 'critical',
    });
  }
  
  return {
    compliant: issues.filter(i => i.severity === 'critical').length === 0,
    issues,
  };
}

/**
 * Role-based PHI access permissions
 */
function hasRolePermission(role, operation) {
  const permissions = {
    admin: ['view', 'create', 'update', 'delete', 'export'],
    physician: ['view', 'create', 'update'],
    nurse: ['view', 'update'],
    analyst: ['view'],
    auditor: ['view'],
    billing: ['view'],
    researcher: ['view'], // De-identified only
  };
  
  return permissions[role]?.includes(operation) || false;
}

/**
 * Generate BAA (Business Associate Agreement) status
 */
export function checkBAAStatus(organizationId) {
  // In production, check database for signed BAA
  return {
    hasBBA: false,
    signedDate: null,
    expirationDate: null,
    status: 'required',
    message: 'Business Associate Agreement required for PHI access',
  };
}

export default {
  containsPHI,
  maskPHI,
  logPHIAccess,
  validateHIPAACompliance,
  checkBAAStatus,
  HIPAA_SAFEGUARDS,
  PHI_FIELD_TYPES,
  HIPAA_AUDIT_REQUIREMENTS,
};
