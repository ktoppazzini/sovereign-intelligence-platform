/**
 * Feature Flags System for Sovereign Intelligence
 * Enables gradual rollouts and A/B testing
 * Created: December 25, 2025
 */

// Feature flag definitions
export const FEATURE_FLAGS = {
  // UI Features
  newReportUI: {
    name: 'New Report UI',
    description: 'Redesigned report generation interface',
    defaultValue: false,
    rolloutPercentage: 0,
    enabledFor: [],
  },
  
  darkModeV2: {
    name: 'Dark Mode V2',
    description: 'Enhanced dark mode with better contrast',
    defaultValue: true,
    rolloutPercentage: 100,
    enabledFor: [],
  },
  
  // AI Features
  advancedAnalytics: {
    name: 'Advanced Analytics',
    description: 'AI-powered predictive analytics',
    defaultValue: false,
    rolloutPercentage: 0,
    enabledFor: ['enterprise', 'government'],
  },
  
  multiModelAI: {
    name: 'Multi-Model AI',
    description: 'Use multiple AI models for better results',
    defaultValue: false,
    rolloutPercentage: 0,
    enabledFor: ['enterprise'],
  },
  
  // Beta Features
  betaTranslation: {
    name: 'Beta Translation Engine',
    description: 'New translation engine with better accuracy',
    defaultValue: false,
    rolloutPercentage: 10,
    enabledFor: [],
  },
  
  realtimeCollaboration: {
    name: 'Realtime Collaboration',
    description: 'Multiple users editing reports simultaneously',
    defaultValue: false,
    rolloutPercentage: 0,
    enabledFor: ['enterprise'],
  },
  
  // Enterprise Features
  customBranding: {
    name: 'Custom Branding',
    description: 'White-label reports with custom logos',
    defaultValue: false,
    rolloutPercentage: 0,
    enabledFor: ['professional', 'enterprise', 'government'],
  },
  
  apiAccess: {
    name: 'API Access',
    description: 'Direct API access for integrations',
    defaultValue: false,
    rolloutPercentage: 0,
    enabledFor: ['professional', 'enterprise', 'government'],
  },
  
  ssoIntegration: {
    name: 'SSO Integration',
    description: 'Enterprise SSO with Azure AD, Okta, etc.',
    defaultValue: false,
    rolloutPercentage: 0,
    enabledFor: ['enterprise', 'government'],
  },
  
  // Experimental
  voiceInput: {
    name: 'Voice Input',
    description: 'Voice-to-text for report input',
    defaultValue: false,
    rolloutPercentage: 0,
    enabledFor: [],
  },
  
  mobileApp: {
    name: 'Mobile App Features',
    description: 'Enhanced mobile experience',
    defaultValue: false,
    rolloutPercentage: 50,
    enabledFor: [],
  },
};

// In-memory overrides (would be stored in database in production)
const overrides = new Map();

/**
 * Check if a feature is enabled for a user
 */
export function isFeatureEnabled(flagName, context = {}) {
  const flag = FEATURE_FLAGS[flagName];
  if (!flag) return false;
  
  // Check environment variable override
  const envKey = `FF_${flagName.toUpperCase().replace(/([A-Z])/g, '_$1')}`;
  if (process.env[envKey] === 'true') return true;
  if (process.env[envKey] === 'false') return false;
  
  // Check user-specific override
  if (context.userId && overrides.has(`${flagName}:${context.userId}`)) {
    return overrides.get(`${flagName}:${context.userId}`);
  }
  
  // Check org-specific override
  if (context.orgId && overrides.has(`${flagName}:org:${context.orgId}`)) {
    return overrides.get(`${flagName}:org:${context.orgId}`);
  }
  
  // Check if enabled for user's plan
  if (context.plan && flag.enabledFor.includes(context.plan)) {
    return true;
  }
  
  // Check rollout percentage
  if (flag.rolloutPercentage > 0) {
    const hash = hashString(context.userId || context.sessionId || 'anonymous');
    const bucket = hash % 100;
    if (bucket < flag.rolloutPercentage) {
      return true;
    }
  }
  
  return flag.defaultValue;
}

/**
 * Get all feature flags with their status for a user
 */
export function getAllFlags(context = {}) {
  const flags = {};
  
  for (const [name, flag] of Object.entries(FEATURE_FLAGS)) {
    flags[name] = {
      enabled: isFeatureEnabled(name, context),
      name: flag.name,
      description: flag.description,
    };
  }
  
  return flags;
}

/**
 * Set override for a specific user or org
 */
export function setOverride(flagName, targetId, value, isOrg = false) {
  const key = isOrg ? `${flagName}:org:${targetId}` : `${flagName}:${targetId}`;
  overrides.set(key, value);
}

/**
 * Remove override
 */
export function removeOverride(flagName, targetId, isOrg = false) {
  const key = isOrg ? `${flagName}:org:${targetId}` : `${flagName}:${targetId}`;
  overrides.delete(key);
}

/**
 * Simple hash function for consistent bucketing
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * React hook helper (client-side)
 */
export function useFeatureFlag(flagName) {
  // This would be used with React context in production
  return {
    enabled: false,
    loading: false,
  };
}

export default {
  isFeatureEnabled,
  getAllFlags,
  setOverride,
  removeOverride,
  FEATURE_FLAGS,
};
