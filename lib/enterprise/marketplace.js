// lib/enterprise/marketplace.js
// [KT:MARKETPLACE-v1.0] App Marketplace & Plugin System
// Creates ecosystem lock-in + revenue share from 3rd parties
// Think: Salesforce AppExchange, Shopify Apps

import Airtable from 'airtable';
import crypto from 'crypto';
import { translateContent, translateBatch, loadModuleTranslations } from '../dynamicTranslation';

const TAG = '[ENTERPRISE:MARKETPLACE]';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ''
);

// ============================================================================
// App Categories
// ============================================================================
export const APP_CATEGORIES = {
  ANALYTICS: { name: 'Analytics & Reporting', icon: '📊', nameTranslated: 'Analytics & Reporting' },
  AUTOMATION: { name: 'Automation', icon: '⚡', nameTranslated: 'Automation' },
  COMMUNICATION: { name: 'Communication', icon: '💬', nameTranslated: 'Communication' },
  CRM: { name: 'CRM & Sales', icon: '🤝', nameTranslated: 'CRM & Sales' },
  DATA: { name: 'Data & Integration', icon: '🔄', nameTranslated: 'Data & Integration' },
  FINANCE: { name: 'Finance & Accounting', icon: '💰', nameTranslated: 'Finance & Accounting' },
  HR: { name: 'HR & People', icon: '👥', nameTranslated: 'HR & People' },
  MARKETING: { name: 'Marketing', icon: '📣', nameTranslated: 'Marketing' },
  PRODUCTIVITY: { name: 'Productivity', icon: '✅', nameTranslated: 'Productivity' },
  SECURITY: { name: 'Security & Compliance', icon: '🔒', nameTranslated: 'Security & Compliance' },
  AI_ML: { name: 'AI & Machine Learning', icon: '🤖', nameTranslated: 'AI & Machine Learning' },
  INDUSTRY: { name: 'Industry Solutions', icon: '🏭', nameTranslated: 'Industry Solutions' },
};

// ============================================================================
// Featured Apps (Pre-built integrations)
// ============================================================================
export const FEATURED_APPS = [
  {
    id: 'app_salesforce_sync',
    name: 'Salesforce Sync Pro',
    developer: 'Sovereign Labs',
    category: 'CRM',
    description: 'Bi-directional sync with Salesforce CRM. Keep your data in perfect harmony.',
    rating: 4.8,
    reviews: 324,
    installs: 12500,
    pricing: { type: 'subscription', price: 99, period: 'month' },
    features: ['Real-time sync', 'Custom field mapping', 'Conflict resolution', 'Audit trail'],
    verified: true,
    tier: 'professional',
  },
  {
    id: 'app_slack_alerts',
    name: 'Slack Intelligence Alerts',
    developer: 'Sovereign Labs',
    category: 'COMMUNICATION',
    description: 'Get AI-powered insights and alerts directly in Slack.',
    rating: 4.9,
    reviews: 856,
    installs: 34200,
    pricing: { type: 'free' },
    features: ['Custom alerts', 'Channel routing', 'Interactive reports', 'Slash commands'],
    verified: true,
    tier: 'starter',
  },
  {
    id: 'app_advanced_analytics',
    name: 'Advanced Analytics Suite',
    developer: 'DataViz Pro',
    category: 'ANALYTICS',
    description: 'Extended analytics with predictive modeling and forecasting.',
    rating: 4.7,
    reviews: 189,
    installs: 5600,
    pricing: { type: 'subscription', price: 199, period: 'month' },
    features: ['Predictive models', 'What-if analysis', 'Custom dashboards', 'Export to PDF'],
    verified: true,
    tier: 'enterprise',
  },
  {
    id: 'app_compliance_guardian',
    name: 'Compliance Guardian',
    developer: 'SecureAI Inc',
    category: 'SECURITY',
    description: 'Automated compliance monitoring for SOC2, HIPAA, GDPR.',
    rating: 4.9,
    reviews: 127,
    installs: 2100,
    pricing: { type: 'subscription', price: 299, period: 'month' },
    features: ['Policy scanning', 'Auto-remediation', 'Audit reports', 'Risk scoring'],
    verified: true,
    tier: 'enterprise',
  },
  {
    id: 'app_document_ai',
    name: 'Document AI Processor',
    developer: 'Sovereign Labs',
    category: 'AI_ML',
    description: 'Extract insights from documents using advanced AI.',
    rating: 4.6,
    reviews: 412,
    installs: 18900,
    pricing: { type: 'usage', pricePerUnit: 0.01, unit: 'page' },
    features: ['OCR extraction', 'Entity recognition', 'Summarization', 'Translation'],
    verified: true,
    tier: 'professional',
  },
  {
    id: 'app_workflow_builder',
    name: 'Visual Workflow Builder',
    developer: 'AutomateIT',
    category: 'AUTOMATION',
    description: 'Build complex workflows with drag-and-drop simplicity.',
    rating: 4.5,
    reviews: 234,
    installs: 7800,
    pricing: { type: 'subscription', price: 149, period: 'month' },
    features: ['Visual editor', '100+ triggers', 'Conditional logic', 'API actions'],
    verified: true,
    tier: 'professional',
  },
];

// ============================================================================
// App Management
// ============================================================================

/**
 * List available apps in marketplace
 */
export async function listMarketplaceApps(options = {}) {
  const { category, search, tier, sort = 'popular' } = options;
  
  let apps = [...FEATURED_APPS];
  
  // Filter by category
  if (category) {
    apps = apps.filter(a => a.category === category);
  }
  
  // Filter by tier availability
  if (tier) {
    const tierOrder = ['free', 'starter', 'professional', 'enterprise'];
    const tierIndex = tierOrder.indexOf(tier);
    apps = apps.filter(a => tierOrder.indexOf(a.tier) <= tierIndex);
  }
  
  // Search
  if (search) {
    const searchLower = search.toLowerCase();
    apps = apps.filter(a => 
      a.name.toLowerCase().includes(searchLower) ||
      a.description.toLowerCase().includes(searchLower)
    );
  }
  
  // Sort
  switch (sort) {
    case 'popular':
      apps.sort((a, b) => b.installs - a.installs);
      break;
    case 'rating':
      apps.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      // Would sort by createdAt in production
      break;
    case 'price_low':
      apps.sort((a, b) => (a.pricing.price || 0) - (b.pricing.price || 0));
      break;
  }
  
  return apps;
}

/**
 * Get app details
 */
export async function getAppDetails(appId) {
  const app = FEATURED_APPS.find(a => a.id === appId);
  if (!app) return null;
  
  return {
    ...app,
    screenshots: [
      `/marketplace/${appId}/screenshot1.png`,
      `/marketplace/${appId}/screenshot2.png`,
    ],
    changelog: [
      { version: '2.1.0', date: '2025-12-20', notes: 'Added new features' },
      { version: '2.0.0', date: '2025-11-15', notes: 'Major update' },
    ],
    requirements: {
      minTier: app.tier,
      permissions: ['read:data', 'write:data'],
    },
  };
}

/**
 * Install app for organization
 */
export async function installApp({
  organizationId,
  appId,
  installedBy,
  config = {},
}) {
  const app = await getAppDetails(appId);
  if (!app) throw new Error('App not found');
  
  const installId = `install_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  
  try {
    await base('App Installations').create({
      'Install ID': installId,
      'Organization ID': organizationId,
      'App ID': appId,
      'App Name': app.name,
      'Installed By': installedBy,
      'Config': JSON.stringify(config),
      'Status': 'active',
      'Installed At': new Date().toISOString(),
    });
    
    return {
      installId,
      appId,
      appName: app.name,
      status: 'active',
      message: 'App installed successfully',
    };
  } catch (error) {
    console.error(TAG, 'installApp.error', error);
    throw error;
  }
}

/**
 * Uninstall app
 */
export async function uninstallApp(installId) {
  try {
    const records = await base('App Installations')
      .select({ filterByFormula: `{Install ID} = "${installId}"`, maxRecords: 1 })
      .firstPage();
    
    if (records.length === 0) throw new Error('Installation not found');
    
    await base('App Installations').update(records[0].id, {
      'Status': 'uninstalled',
      'Uninstalled At': new Date().toISOString(),
    });
    
    return { uninstalled: true, installId };
  } catch (error) {
    console.error(TAG, 'uninstallApp.error', error);
    throw error;
  }
}

/**
 * List installed apps for organization
 */
export async function listInstalledApps(organizationId) {
  try {
    const records = await base('App Installations')
      .select({
        filterByFormula: `AND({Organization ID} = "${organizationId}", {Status} = "active")`,
      })
      .firstPage();
    
    return records.map(r => ({
      installId: r.fields['Install ID'],
      appId: r.fields['App ID'],
      appName: r.fields['App Name'],
      installedAt: r.fields['Installed At'],
      config: JSON.parse(r.fields['Config'] || '{}'),
    }));
  } catch (error) {
    console.error(TAG, 'listInstalledApps.error', error);
    throw error;
  }
}

// ============================================================================
// Developer Portal - Submit Apps
// ============================================================================

/**
 * Submit new app to marketplace
 */
export async function submitApp({
  developerId,
  name,
  category,
  description,
  features,
  pricing,
  manifestUrl,
  screenshotUrls,
}) {
  const appId = `app_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  
  try {
    await base('Marketplace Submissions').create({
      'App ID': appId,
      'Developer ID': developerId,
      'Name': name,
      'Category': category,
      'Description': description,
      'Features': features.join(', '),
      'Pricing': JSON.stringify(pricing),
      'Manifest URL': manifestUrl,
      'Screenshots': screenshotUrls.join(', '),
      'Status': 'pending_review',
      'Submitted At': new Date().toISOString(),
    });
    
    return {
      appId,
      status: 'pending_review',
      message: 'App submitted for review. You will be notified within 5 business days.',
    };
  } catch (error) {
    console.error(TAG, 'submitApp.error', error);
    throw error;
  }
}

/**
 * Register as developer
 */
export async function registerDeveloper({
  userId,
  companyName,
  website,
  contactEmail,
  taxInfo,
}) {
  const developerId = `dev_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  
  try {
    await base('Developers').create({
      'Developer ID': developerId,
      'User ID': userId,
      'Company Name': companyName,
      'Website': website || '',
      'Contact Email': contactEmail,
      'Tax Info': taxInfo ? JSON.stringify(taxInfo) : '',
      'Status': 'active',
      'Registered At': new Date().toISOString(),
      'Revenue Share': 70, // Developer gets 70%, platform gets 30%
    });
    
    return {
      developerId,
      status: 'active',
      revenueShare: 70,
    };
  } catch (error) {
    console.error(TAG, 'registerDeveloper.error', error);
    throw error;
  }
}

/**
 * Get developer earnings
 */
export async function getDeveloperEarnings(developerId, period = 'all') {
  // Mock earnings - would query from database
  return {
    developerId,
    period,
    totalRevenue: Math.floor(Math.random() * 50000) + 5000,
    totalPayout: Math.floor(Math.random() * 35000) + 3500,
    pendingPayout: Math.floor(Math.random() * 5000),
    appStats: [
      { appId: 'app_001', name: 'My App', installs: 1250, revenue: 12500 },
    ],
  };
}

// ============================================================================
// App Reviews
// ============================================================================

/**
 * Submit app review
 */
export async function submitReview({
  appId,
  userId,
  rating,
  title,
  body,
}) {
  const reviewId = `review_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  try {
    await base('App Reviews').create({
      'Review ID': reviewId,
      'App ID': appId,
      'User ID': userId,
      'Rating': rating,
      'Title': title,
      'Body': body,
      'Created At': new Date().toISOString(),
      'Helpful': 0,
    });
    
    return { reviewId, status: 'published' };
  } catch (error) {
    console.error(TAG, 'submitReview.error', error);
    throw error;
  }
}

/**
 * Get app reviews
 */
export async function getAppReviews(appId, options = {}) {
  const { sort = 'recent', limit = 10 } = options;
  
  // Mock reviews
  return [
    {
      reviewId: 'review_001',
      userId: 'user_123',
      userName: 'John D.',
      rating: 5,
      title: 'Excellent integration!',
      body: 'This app saved us hours of manual work every week.',
      createdAt: '2025-12-20T10:00:00Z',
      helpful: 42,
    },
    {
      reviewId: 'review_002',
      userId: 'user_456',
      userName: 'Sarah M.',
      rating: 4,
      title: 'Great but could be better',
      body: 'Works well, but would love to see more customization options.',
      createdAt: '2025-12-18T15:30:00Z',
      helpful: 18,
    },
  ];
}

// ============================================================================
// Marketplace Revenue
// ============================================================================
export const MARKETPLACE_REVENUE_SHARE = {
  platform: 30, // Sovereign takes 30%
  developer: 70, // Developer gets 70%
};

export default {
  APP_CATEGORIES,
  FEATURED_APPS,
  MARKETPLACE_REVENUE_SHARE,
  listMarketplaceApps,
  getAppDetails,
  installApp,
  uninstallApp,
  listInstalledApps,
  submitApp,
  registerDeveloper,
  getDeveloperEarnings,
  submitReview,
  getAppReviews,
};
