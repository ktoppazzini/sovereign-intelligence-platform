// lib/enterprise/embeddedAnalytics.js
// [KT:EMBEDDED-SDK-v1.0] Embedded Analytics SDK
// B2B2C Revenue Model - customers embed in THEIR products
// Massive TAM expansion - every company becomes a distributor

import crypto from 'crypto';

const TAG = '[ENTERPRISE:EMBEDDED]';

// ============================================================================
// Embed Types
// ============================================================================
export const EMBED_TYPES = {
  DASHBOARD: {
    name: 'Dashboard',
    description: 'Full interactive dashboard',
    tier: 'professional',
    customizable: true,
  },
  CHART: {
    name: 'Single Chart',
    description: 'Individual chart or visualization',
    tier: 'starter',
    customizable: true,
  },
  REPORT: {
    name: 'Report Viewer',
    description: 'Read-only report display',
    tier: 'starter',
    customizable: false,
  },
  ANALYSIS: {
    name: 'Analysis Widget',
    description: 'AI-powered analysis component',
    tier: 'professional',
    customizable: true,
  },
  CHAT: {
    name: 'AI Chat Widget',
    description: 'Conversational AI interface',
    tier: 'enterprise',
    customizable: true,
  },
  FULL_APP: {
    name: 'Full Application',
    description: 'Complete Sovereign application iframe',
    tier: 'enterprise',
    customizable: true,
  },
};

// ============================================================================
// Embed Token Management
// ============================================================================

/**
 * Generate embed token for secure embedding
 */
export function generateEmbedToken({
  organizationId,
  embedType,
  resourceId,
  permissions = ['view'],
  userId = null,
  expiresIn = 3600, // 1 hour default
  customization = {},
}) {
  const tokenId = `emb_${crypto.randomBytes(16).toString('hex')}`;
  const expiresAt = Date.now() + expiresIn * 1000;
  
  const payload = {
    tid: tokenId,
    oid: organizationId,
    etype: embedType,
    rid: resourceId,
    perms: permissions,
    uid: userId,
    exp: expiresAt,
    cust: customization,
  };
  
  // In production, sign with private key
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto
    .createHmac('sha256', process.env.EMBED_SECRET || 'embed-secret')
    .update(payloadStr)
    .digest('hex');
  
  return `${payloadStr}.${signature}`;
}

/**
 * Validate embed token
 */
export function validateEmbedToken(token) {
  try {
    const [payloadStr, signature] = token.split('.');
    
    const expectedSignature = crypto
      .createHmac('sha256', process.env.EMBED_SECRET || 'embed-secret')
      .update(payloadStr)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64').toString());
    
    if (payload.exp < Date.now()) {
      return { valid: false, error: 'Token expired' };
    }
    
    return {
      valid: true,
      organizationId: payload.oid,
      embedType: payload.etype,
      resourceId: payload.rid,
      permissions: payload.perms,
      userId: payload.uid,
      customization: payload.cust,
    };
  } catch (error) {
    return { valid: false, error: 'Invalid token format' };
  }
}

// ============================================================================
// SDK Code Generation
// ============================================================================

/**
 * Generate embeddable SDK code
 */
export function generateEmbedCode({
  embedType,
  embedToken,
  containerId = 'sovereign-embed',
  width = '100%',
  height = '600px',
  theme = 'dark',
  locale = 'en',
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.sovereign-intelligence.com';
  
  return {
    iframe: `
<!-- Sovereign Intelligence Embed -->
<iframe
  id="${containerId}"
  src="${baseUrl}/embed/${embedType}?token=${embedToken}&theme=${theme}&locale=${locale}"
  width="${width}"
  height="${height}"
  frameborder="0"
  allowfullscreen
  allow="clipboard-write"
  style="border: none; border-radius: 8px;"
></iframe>
`,
    
    javascript: `
<!-- Sovereign Intelligence SDK -->
<div id="${containerId}"></div>
<script src="${baseUrl}/sdk/sovereign-embed.js"></script>
<script>
  SovereignEmbed.init({
    container: '#${containerId}',
    token: '${embedToken}',
    type: '${embedType}',
    theme: '${theme}',
    locale: '${locale}',
    width: '${width}',
    height: '${height}',
    onReady: function() {
      console.log('Sovereign embed ready');
    },
    onError: function(error) {
      console.error('Sovereign embed error:', error);
    },
    onEvent: function(event) {
      // Handle events from embed
      console.log('Sovereign event:', event);
    }
  });
</script>
`,
    
    react: `
import { SovereignEmbed } from '@sovereign-ai/react-sdk';

function MyComponent() {
  return (
    <SovereignEmbed
      token="${embedToken}"
      type="${embedType}"
      theme="${theme}"
      locale="${locale}"
      width="${width}"
      height="${height}"
      onReady={() => console.log('Ready')}
      onError={(err) => console.error(err)}
      onEvent={(event) => console.log(event)}
    />
  );
}
`,
    
    vue: `
<template>
  <SovereignEmbed
    :token="'${embedToken}'"
    type="${embedType}"
    theme="${theme}"
    locale="${locale}"
    width="${width}"
    height="${height}"
    @ready="onReady"
    @error="onError"
    @event="onEvent"
  />
</template>

<script>
import { SovereignEmbed } from '@sovereign-ai/vue-sdk';

export default {
  components: { SovereignEmbed },
  methods: {
    onReady() { console.log('Ready'); },
    onError(err) { console.error(err); },
    onEvent(event) { console.log(event); }
  }
};
</script>
`,
  };
}

// ============================================================================
// Embed Customization
// ============================================================================
export const CUSTOMIZATION_OPTIONS = {
  // Visual
  theme: ['dark', 'light', 'auto', 'custom'],
  primaryColor: 'string', // hex color
  backgroundColor: 'string',
  borderRadius: 'number',
  fontFamily: 'string',
  
  // Behavior
  interactive: 'boolean',
  exportEnabled: 'boolean',
  filterEnabled: 'boolean',
  drilldownEnabled: 'boolean',
  fullscreenEnabled: 'boolean',
  
  // Branding
  showLogo: 'boolean',
  customLogo: 'string', // URL
  poweredByText: 'string',
  
  // Localization
  locale: 'string',
  dateFormat: 'string',
  numberFormat: 'string',
  currency: 'string',
};

/**
 * Build customized embed configuration
 */
export function buildCustomization(options = {}) {
  const defaults = {
    theme: 'dark',
    primaryColor: '#3b82f6',
    backgroundColor: '#0a1628',
    borderRadius: 8,
    fontFamily: 'Inter, system-ui, sans-serif',
    interactive: true,
    exportEnabled: false,
    filterEnabled: true,
    drilldownEnabled: true,
    fullscreenEnabled: true,
    showLogo: true,
    customLogo: null,
    poweredByText: 'Powered by Sovereign Intelligence',
    locale: 'en',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: 'en-US',
    currency: 'USD',
  };
  
  return { ...defaults, ...options };
}

// ============================================================================
// Usage Tracking for Embedded Analytics
// ============================================================================

/**
 * Track embed usage (for billing)
 */
export function trackEmbedUsage({
  organizationId,
  embedType,
  resourceId,
  action,
  endUserId,
  metadata = {},
}) {
  const event = {
    eventId: `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    organizationId,
    embedType,
    resourceId,
    action,
    endUserId,
    metadata,
    timestamp: new Date().toISOString(),
  };
  
  // In production, send to analytics/billing system
  console.log(TAG, 'trackEmbedUsage', event);
  
  return event;
}

/**
 * Get embed usage stats
 */
export function getEmbedUsageStats(organizationId, period = '30d') {
  // Mock stats - would query from database
  return {
    period,
    totalViews: Math.floor(Math.random() * 50000) + 10000,
    uniqueUsers: Math.floor(Math.random() * 5000) + 1000,
    byType: {
      dashboard: Math.floor(Math.random() * 20000),
      chart: Math.floor(Math.random() * 15000),
      report: Math.floor(Math.random() * 10000),
      analysis: Math.floor(Math.random() * 5000),
    },
    topEmbeds: [
      { resourceId: 'dash_001', name: 'Sales Overview', views: 12500 },
      { resourceId: 'chart_042', name: 'Revenue Trend', views: 8300 },
      { resourceId: 'report_007', name: 'Monthly Report', views: 6100 },
    ],
    engagement: {
      avgSessionDuration: '4m 32s',
      interactionRate: 0.68,
      exportRate: 0.12,
    },
  };
}

// ============================================================================
// Embed Security
// ============================================================================

/**
 * Configure allowed domains for embedding
 */
export function configureAllowedDomains(organizationId, domains) {
  // Store allowed domains for CORS/CSP
  return {
    organizationId,
    allowedDomains: domains,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validate embed request origin
 */
export function validateEmbedOrigin(organizationId, origin) {
  // In production, check against stored allowed domains
  const allowedDomains = ['*']; // Default allow all for demo
  
  if (allowedDomains.includes('*')) return true;
  
  try {
    const url = new URL(origin);
    return allowedDomains.some(domain => 
      url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// ============================================================================
// Pricing for Embedded Analytics
// ============================================================================
export const EMBED_PRICING = {
  starter: {
    includedViews: 10000,
    overage: 0.001, // $0.001 per view over limit
    embedTypes: ['CHART', 'REPORT'],
    customization: 'basic',
  },
  professional: {
    includedViews: 100000,
    overage: 0.0005,
    embedTypes: ['CHART', 'REPORT', 'DASHBOARD', 'ANALYSIS'],
    customization: 'full',
  },
  enterprise: {
    includedViews: 1000000,
    overage: 0.0002,
    embedTypes: ['ALL'],
    customization: 'full',
    whiteLabel: true,
  },
};

export default {
  EMBED_TYPES,
  CUSTOMIZATION_OPTIONS,
  EMBED_PRICING,
  generateEmbedToken,
  validateEmbedToken,
  generateEmbedCode,
  buildCustomization,
  trackEmbedUsage,
  getEmbedUsageStats,
  configureAllowedDomains,
  validateEmbedOrigin,
};
