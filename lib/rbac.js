// lib/rbac.js

/**
 * Role-based permission mappings
 */
export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['*'],
  OWNER: ['*'],
  ADMIN: ['read', 'write', 'delete', 'approve', 'manage_users', 'manage_settings', 'manage_api_keys', 'view_analytics'],
  MANAGER: ['read', 'write', 'delete', 'approve', 'view_analytics'],
  ANALYST: ['read', 'write', 'view_analytics'],
  MEMBER: ['read', 'write'],
  VIEWER: ['read'],
};

export function isSuperAdmin(user) {
  if (!user) return false;
  if (process.env.SUPERADMIN_EMAIL && user.email === process.env.SUPERADMIN_EMAIL) return true;
  // or check for a special role in user.roles (if you populate it)
  return !!user.roles?.some((r) => r.permissions?.includes('*'));
}

export function userHasPermission(user, key) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const all = new Set();
  (user.roles || []).forEach((r) => (r.permissions || []).forEach((p) => all.add(p)));
  return all.has(key);
}

/**
 * Optional scope check when a user is limited by organization/country.
 */
export function canAccessOrg(user, orgId) {
  if (isSuperAdmin(user)) return true;
  // if your user object has organization.id or allowedOrgs
  if (!orgId) return false;
  return user.organization?.id === orgId || (user.allowedOrgs || []).includes(orgId);
}
