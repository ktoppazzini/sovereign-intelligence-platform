// lib/enterprise/apiPlatform.js
// [KT:API-PLATFORM-v1.0] Developer API Platform
// Turns Sovereign into a PLATFORM - massive valuation multiplier
// Enables: API monetization, developer ecosystem, integrations

import Airtable from 'airtable';
import crypto from 'crypto';

const TAG = '[ENTERPRISE:API-PLATFORM]';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ''
);

// ============================================================================
// API Key Management
// ============================================================================

/**
 * Generate a new API key for an organization
 */
export async function generateApiKey({
  organizationId,
  name,
  scopes = ['read'],
  expiresIn = null, // days, null = never
  createdBy,
}) {
  const keyId = `sk_${process.env.NODE_ENV === 'production' ? 'live' : 'test'}_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(keyId).digest('hex');
  
  const expiresAt = expiresIn 
    ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString()
    : null;
  
  try {
    await base('API Keys').create({
      'Key ID': keyId.substring(0, 12) + '...',
      'Key Hash': keyHash,
      'Organization ID': organizationId,
      'Name': name,
      'Scopes': scopes.join(','),
      'Status': 'active',
      'Expires At': expiresAt || '',
      'Created By': createdBy,
      'Created At': new Date().toISOString(),
      'Last Used': '',
      'Total Requests': 0,
    });
    
    // Return full key ONLY on creation - never stored/shown again
    return {
      key: keyId,
      keyPreview: keyId.substring(0, 12) + '...',
      name,
      scopes,
      expiresAt,
      warning: 'Save this key securely. It will not be shown again.',
    };
  } catch (error) {
    console.error(TAG, 'generateApiKey.error', error);
    throw error;
  }
}

/**
 * Validate an API key
 */
export async function validateApiKey(apiKey) {
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  try {
    const records = await base('API Keys')
      .select({
        filterByFormula: `AND({Key Hash} = "${keyHash}", {Status} = "active")`,
        maxRecords: 1,
      })
      .firstPage();
    
    if (records.length === 0) {
      return { valid: false, error: 'Invalid API key' };
    }
    
    const record = records[0];
    const expiresAt = record.fields['Expires At'];
    
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return { valid: false, error: 'API key expired' };
    }
    
    // Update last used
    await base('API Keys').update(record.id, {
      'Last Used': new Date().toISOString(),
      'Total Requests': (record.fields['Total Requests'] || 0) + 1,
    });
    
    return {
      valid: true,
      organizationId: record.fields['Organization ID'],
      scopes: (record.fields['Scopes'] || '').split(','),
      name: record.fields['Name'],
    };
  } catch (error) {
    console.error(TAG, 'validateApiKey.error', error);
    return { valid: false, error: 'Validation failed' };
  }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyPreview, organizationId) {
  try {
    const records = await base('API Keys')
      .select({
        filterByFormula: `AND({Key ID} = "${keyPreview}", {Organization ID} = "${organizationId}")`,
        maxRecords: 1,
      })
      .firstPage();
    
    if (records.length === 0) throw new Error('API key not found');
    
    await base('API Keys').update(records[0].id, {
      'Status': 'revoked',
      'Revoked At': new Date().toISOString(),
    });
    
    return { revoked: true };
  } catch (error) {
    console.error(TAG, 'revokeApiKey.error', error);
    throw error;
  }
}

/**
 * List API keys for organization
 */
export async function listApiKeys(organizationId) {
  try {
    const records = await base('API Keys')
      .select({
        filterByFormula: `{Organization ID} = "${organizationId}"`,
        sort: [{ field: 'Created At', direction: 'desc' }],
      })
      .firstPage();
    
    return records.map(r => ({
      keyPreview: r.fields['Key ID'],
      name: r.fields['Name'],
      scopes: (r.fields['Scopes'] || '').split(','),
      status: r.fields['Status'],
      createdAt: r.fields['Created At'],
      lastUsed: r.fields['Last Used'],
      totalRequests: r.fields['Total Requests'] || 0,
      expiresAt: r.fields['Expires At'],
    }));
  } catch (error) {
    console.error(TAG, 'listApiKeys.error', error);
    throw error;
  }
}

// ============================================================================
// API Scopes & Permissions
// ============================================================================
export const API_SCOPES = {
  // Read scopes
  'read': 'Read access to all resources',
  'read:reports': 'Read reports and analyses',
  'read:data': 'Read raw data',
  'read:users': 'Read user information',
  'read:analytics': 'Read analytics data',
  
  // Write scopes
  'write': 'Write access to all resources',
  'write:reports': 'Create and modify reports',
  'write:data': 'Import and modify data',
  'write:users': 'Manage users',
  
  // Special scopes
  'agents': 'Access AI agents',
  'agents:run': 'Execute AI agents',
  'translate': 'Use translation API',
  'analyze': 'Use analysis API',
  'export': 'Export data and reports',
  'admin': 'Full administrative access',
};

// ============================================================================
// API Rate Limits by Tier
// ============================================================================
export const API_RATE_LIMITS = {
  free: { requestsPerMinute: 10, requestsPerDay: 100 },
  starter: { requestsPerMinute: 60, requestsPerDay: 5000 },
  professional: { requestsPerMinute: 300, requestsPerDay: 50000 },
  enterprise: { requestsPerMinute: 1000, requestsPerDay: 500000 },
  government: { requestsPerMinute: 2000, requestsPerDay: 'unlimited' },
};

// ============================================================================
// API Endpoints Registry
// ============================================================================
export const API_ENDPOINTS = {
  // Core APIs
  '/api/v1/analyze': {
    method: 'POST',
    scope: 'analyze',
    description: 'Analyze text, documents, or data',
    tier: 'starter',
  },
  '/api/v1/translate': {
    method: 'POST',
    scope: 'translate',
    description: 'Translate text to any of 207 languages',
    tier: 'starter',
  },
  '/api/v1/reports': {
    method: 'GET',
    scope: 'read:reports',
    description: 'List all reports',
    tier: 'starter',
  },
  '/api/v1/reports/{id}': {
    method: 'GET',
    scope: 'read:reports',
    description: 'Get a specific report',
    tier: 'starter',
  },
  '/api/v1/reports/generate': {
    method: 'POST',
    scope: 'write:reports',
    description: 'Generate a new report',
    tier: 'professional',
  },
  
  // AI Agents APIs
  '/api/v1/agents': {
    method: 'GET',
    scope: 'agents',
    description: 'List AI agents',
    tier: 'professional',
  },
  '/api/v1/agents/{id}/run': {
    method: 'POST',
    scope: 'agents:run',
    description: 'Execute an AI agent',
    tier: 'professional',
  },
  
  // Data APIs
  '/api/v1/data/import': {
    method: 'POST',
    scope: 'write:data',
    description: 'Import data from various formats',
    tier: 'professional',
  },
  '/api/v1/data/export': {
    method: 'POST',
    scope: 'export',
    description: 'Export data to various formats',
    tier: 'professional',
  },
  
  // Analytics APIs
  '/api/v1/analytics/query': {
    method: 'POST',
    scope: 'read:analytics',
    description: 'Query analytics data',
    tier: 'enterprise',
  },
  '/api/v1/analytics/dashboard': {
    method: 'GET',
    scope: 'read:analytics',
    description: 'Get dashboard metrics',
    tier: 'professional',
  },
  
  // Webhooks
  '/api/v1/webhooks': {
    method: 'POST',
    scope: 'admin',
    description: 'Register webhooks',
    tier: 'professional',
  },
};

// ============================================================================
// API Usage Tracking
// ============================================================================

/**
 * Track API usage
 */
export async function trackApiUsage({
  organizationId,
  endpoint,
  method,
  statusCode,
  responseTime,
  apiKeyPreview,
}) {
  try {
    await base('API Usage').create({
      'Organization ID': organizationId,
      'Endpoint': endpoint,
      'Method': method,
      'Status Code': statusCode,
      'Response Time': responseTime,
      'API Key': apiKeyPreview,
      'Timestamp': new Date().toISOString(),
    });
  } catch (error) {
    console.error(TAG, 'trackApiUsage.error', error);
  }
}

/**
 * Get API usage stats
 */
export async function getApiUsageStats(organizationId, days = 30) {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const records = await base('API Usage')
      .select({
        filterByFormula: `AND({Organization ID} = "${organizationId}", {Timestamp} >= "${since}")`,
      })
      .all();
    
    const stats = {
      totalRequests: records.length,
      byEndpoint: {},
      byStatusCode: {},
      avgResponseTime: 0,
      requestsByDay: {},
    };
    
    let totalResponseTime = 0;
    
    records.forEach(r => {
      const endpoint = r.fields['Endpoint'];
      const status = r.fields['Status Code'];
      const responseTime = r.fields['Response Time'] || 0;
      const day = r.fields['Timestamp']?.split('T')[0];
      
      stats.byEndpoint[endpoint] = (stats.byEndpoint[endpoint] || 0) + 1;
      stats.byStatusCode[status] = (stats.byStatusCode[status] || 0) + 1;
      stats.requestsByDay[day] = (stats.requestsByDay[day] || 0) + 1;
      totalResponseTime += responseTime;
    });
    
    stats.avgResponseTime = records.length > 0 
      ? Math.round(totalResponseTime / records.length) 
      : 0;
    
    return stats;
  } catch (error) {
    console.error(TAG, 'getApiUsageStats.error', error);
    throw error;
  }
}

// ============================================================================
// SDK Code Generation
// ============================================================================
export function generateSdkCode(language, apiKey = 'YOUR_API_KEY') {
  const sdks = {
    python: `
# Sovereign Intelligence Python SDK
import requests

class SovereignAI:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://api.sovereign-intelligence.com/v1"
        self.headers = {"Authorization": f"Bearer {api_key}"}
    
    def analyze(self, text, analysis_type="general"):
        response = requests.post(
            f"{self.base_url}/analyze",
            headers=self.headers,
            json={"text": text, "type": analysis_type}
        )
        return response.json()
    
    def translate(self, text, target_language):
        response = requests.post(
            f"{self.base_url}/translate",
            headers=self.headers,
            json={"text": text, "target": target_language}
        )
        return response.json()
    
    def run_agent(self, agent_id, input_data=None):
        response = requests.post(
            f"{self.base_url}/agents/{agent_id}/run",
            headers=self.headers,
            json={"input": input_data}
        )
        return response.json()

# Usage
client = SovereignAI("${apiKey}")
result = client.analyze("Your text here")
`,
    
    javascript: `
// Sovereign Intelligence JavaScript SDK
class SovereignAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.sovereign-intelligence.com/v1';
  }

  async request(endpoint, options = {}) {
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      ...options,
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return response.json();
  }

  async analyze(text, type = 'general') {
    return this.request('/analyze', {
      method: 'POST',
      body: JSON.stringify({ text, type }),
    });
  }

  async translate(text, targetLanguage) {
    return this.request('/translate', {
      method: 'POST',
      body: JSON.stringify({ text, target: targetLanguage }),
    });
  }

  async runAgent(agentId, input = null) {
    return this.request(\`/agents/\${agentId}/run\`, {
      method: 'POST',
      body: JSON.stringify({ input }),
    });
  }
}

// Usage
const client = new SovereignAI('${apiKey}');
const result = await client.analyze('Your text here');
`,
    
    curl: `
# Sovereign Intelligence API - cURL Examples

# Analyze text
curl -X POST https://api.sovereign-intelligence.com/v1/analyze \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Your text here", "type": "general"}'

# Translate text
curl -X POST https://api.sovereign-intelligence.com/v1/translate \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Hello world", "target": "Spanish"}'

# Run an AI agent
curl -X POST https://api.sovereign-intelligence.com/v1/agents/agent_123/run \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"input": {"query": "Research market trends"}}'
`,
  };
  
  return sdks[language] || sdks.curl;
}

export default {
  generateApiKey,
  validateApiKey,
  revokeApiKey,
  listApiKeys,
  trackApiUsage,
  getApiUsageStats,
  generateSdkCode,
  API_SCOPES,
  API_RATE_LIMITS,
  API_ENDPOINTS,
};
