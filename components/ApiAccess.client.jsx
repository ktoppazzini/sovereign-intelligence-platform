'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../lib/i18nClient';

/**
 * ApiAccess - API key management and documentation
 * Features:
 * - API key generation
 * - Usage monitoring
 * - Rate limit settings
 * - Interactive documentation
 * Supports 207 languages via dynamic translation
 */

const BASE_UI = {
  apiAccess: 'API Access',
  apiKeys: 'API Keys',
  documentation: 'Documentation',
  usage: 'Usage',
  webhooks: 'Webhooks',
  createKey: 'Create New Key',
  keyName: 'Key Name',
  permissions: 'Permissions',
  create: 'Create',
  cancel: 'Cancel',
  revoke: 'Revoke',
  copy: 'Copy',
  copied: 'Copied!',
  active: 'Active',
  revoked: 'Revoked',
  created: 'Created',
  lastUsed: 'Last Used',
  never: 'Never',
  rateLimit: 'Rate Limit',
  callsPerMonth: 'calls/month',
  today: 'Today',
  thisMonth: 'This Month',
  read: 'Read',
  write: 'Write',
  generateReports: 'Generate Reports',
  admin: 'Admin',
  readDesc: 'View reports and data',
  writeDesc: 'Create and update reports',
  reportsDesc: 'Generate AI reports via API',
  webhooksDesc: 'Receive event notifications',
  adminDesc: 'Manage settings and users',
  endpoint: 'Endpoint',
  method: 'Method',
  parameters: 'Parameters',
  required: 'Required',
  optional: 'Optional',
  example: 'Example',
  tryIt: 'Try It',
  noKeys: 'No API keys yet. Create one to get started.',
};

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian', 'Pashto', 'Sindhi'];

export default function ApiAccess({ verticalId, color = '#3b82f6', lang = 'English', organizationName = '' }) {
  const [ui, setUi] = useState(BASE_UI);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('keys');
  const [apiKeys, setApiKeys] = useState([
    {
      id: 'si_prod_demo123',
      name: 'Production Key',
      created: '2025-12-20',
      lastUsed: '2025-12-24',
      status: 'active',
      permissions: ['read', 'write', 'reports'],
      rateLimit: 1000,
      usage: { today: 147, month: 3420 },
    },
  ]);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState(['read']);
  const [generatedKey, setGeneratedKey] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  const isRTL = RTL_LANGUAGES.includes(lang);

  // Load translations
  useEffect(() => {
    (async () => {
      try {
        const { t } = await getUiTranslations({
          base: BASE_UI,
          lang,
          cachePrefix: 'SI_ApiAccess',
          setDir: false,
        });
        setUi(t || BASE_UI);
      } catch (err) {
        console.warn('ApiAccess translation failed:', err);
      }
    })();
  }, [lang]);

  const permissionOptions = [
    { id: 'read', label: ui.read, description: ui.readDesc },
    { id: 'write', label: ui.write, description: ui.writeDesc },
    { id: 'reports', label: ui.generateReports, description: ui.reportsDesc },
    { id: 'webhooks', label: ui.webhooks, description: ui.webhooksDesc },
    { id: 'admin', label: ui.admin, description: ui.adminDesc },
  ];

  const apiEndpoints = [
    {
      method: 'POST',
      path: '/api/v1/reports/generate',
      description: 'Generate a new AI-powered report',
      params: [
        { name: 'vertical', type: 'string', required: true, description: 'Industry vertical (reform, defense, pharma, finance, etc.)' },
        { name: 'report_type', type: 'string', required: true, description: 'Type of report to generate' },
        { name: 'context', type: 'string', required: true, description: 'Report context and requirements' },
        { name: 'role_id', type: 'string', required: false, description: 'Target role for personalization' },
        { name: 'language', type: 'string', required: false, description: 'Output language (default: English)' },
      ],
      example: `{
  "vertical": "${verticalId}",
  "report_type": "comprehensive",
  "context": "Q4 2025 analysis",
  "role_id": "director",
  "language": "English"
}`,
    },
    {
      method: 'GET',
      path: '/api/v1/reports/{report_id}',
      description: 'Retrieve a generated report',
      params: [
        { name: 'report_id', type: 'string', required: true, description: 'Unique report identifier' },
        { name: 'format', type: 'string', required: false, description: 'Output format: html, pdf, json' },
      ],
    },
    {
      method: 'GET',
      path: '/api/v1/reports',
      description: 'List all reports for your organization',
      params: [
        { name: 'vertical', type: 'string', required: false, description: 'Filter by vertical' },
        { name: 'status', type: 'string', required: false, description: 'Filter by status' },
        { name: 'limit', type: 'number', required: false, description: 'Results per page (default: 20)' },
        { name: 'offset', type: 'number', required: false, description: 'Pagination offset' },
      ],
    },
    {
      method: 'POST',
      path: '/api/v1/surveys/generate',
      description: 'Generate AI-powered survey questions',
      params: [
        { name: 'vertical', type: 'string', required: true, description: 'Industry vertical' },
        { name: 'role_id', type: 'string', required: true, description: 'Target role' },
        { name: 'count', type: 'number', required: false, description: 'Number of questions (default: 5)' },
      ],
    },
    {
      method: 'POST',
      path: '/api/v1/chat',
      description: 'Ask Sovereign AI about reports',
      params: [
        { name: 'message', type: 'string', required: true, description: 'User question' },
        { name: 'report_context', type: 'string', required: false, description: 'Report HTML for context' },
        { name: 'vertical', type: 'string', required: false, description: 'Industry context' },
      ],
    },
    {
      method: 'GET',
      path: '/api/v1/usage',
      description: 'Get API usage statistics',
      params: [
        { name: 'period', type: 'string', required: false, description: 'Time period: day, week, month' },
      ],
    },
  ];

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    
    const newKey = {
      id: `si_prod_${Math.random().toString(36).substring(2, 15)}`,
      name: newKeyName,
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
      status: 'active',
      permissions: newKeyPermissions,
      rateLimit: 1000,
      usage: { today: 0, month: 0 },
    };
    
    setApiKeys([...apiKeys, newKey]);
    setGeneratedKey(newKey.id);
    setNewKeyName('');
    setNewKeyPermissions(['read']);
  };

  const handleRevokeKey = (keyId) => {
    setApiKeys(apiKeys.map(k => 
      k.id === keyId ? { ...k, status: 'revoked' } : k
    ));
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: 20,
  };

  const contentStyle = {
    background: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 1000,
    maxHeight: '95vh',
    overflow: 'hidden',
    border: `1px solid ${color}33`,
    boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
    direction: isRTL ? 'rtl' : 'ltr',
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '12px 20px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${color}44`,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          transition: 'all 0.2s',
          direction: isRTL ? 'rtl' : 'ltr',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = `${color}22`;
          e.currentTarget.style.borderColor = color;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.borderColor = `${color}44`;
        }}
      >
        <span style={{ fontSize: 18 }}>🔌</span>
        {ui.apiAccess}
      </button>

      {/* Modal */}
      {isOpen && (
        <div style={modalStyle} onClick={() => setIsOpen(false)}>
          <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>🔌</span>
                <div>
                  <h2 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 700 }}>
                    API Access
                  </h2>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    Integrate Sovereign Intelligence into your systems
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 10px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              padding: '0 24px',
            }}>
              {[
                { id: 'keys', label: 'API Keys', icon: '🔑' },
                { id: 'docs', label: 'Documentation', icon: '📚' },
                { id: 'usage', label: 'Usage', icon: '📊' },
                { id: 'webhooks', label: 'Webhooks', icon: '🔔' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab.id ? `2px solid ${color}` : '2px solid transparent',
                    color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    marginBottom: -1,
                  }}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ padding: 24, maxHeight: 'calc(95vh - 160px)', overflowY: 'auto' }}>
              {/* API Keys Tab */}
              {activeTab === 'keys' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ color: '#fff', margin: 0, fontSize: 16 }}>Your API Keys</h3>
                    <button
                      onClick={() => setShowNewKeyModal(true)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 8,
                        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>+</span> Create New Key
                    </button>
                  </div>

                  {/* Generated Key Alert */}
                  {generatedKey && (
                    <div style={{
                      padding: 16,
                      background: 'rgba(16,185,129,0.1)',
                      borderRadius: 8,
                      border: '1px solid rgba(16,185,129,0.3)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span>⚠️</span>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>Save your API key now!</span>
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '0 0 12px' }}>
                        This key will only be shown once. Copy it now and store it securely.
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <code style={{
                          flex: 1,
                          padding: '10px 14px',
                          background: 'rgba(0,0,0,0.3)',
                          borderRadius: 6,
                          color: '#10b981',
                          fontSize: 13,
                          fontFamily: 'monospace',
                        }}>
                          {generatedKey}
                        </code>
                        <button
                          onClick={() => { handleCopyKey(generatedKey); setGeneratedKey(''); }}
                          style={{
                            padding: '10px 16px',
                            borderRadius: 6,
                            background: '#10b981',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {copiedKey === generatedKey ? '✓ Copied' : 'Copy & Close'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Keys List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        style={{
                          padding: 16,
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: 12,
                          border: `1px solid ${key.status === 'revoked' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
                          opacity: key.status === 'revoked' ? 0.6 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ color: '#fff', fontWeight: 600 }}>{key.name}</span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                background: key.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                color: key.status === 'active' ? '#10b981' : '#ef4444',
                              }}>
                                {key.status.toUpperCase()}
                              </span>
                            </div>
                            <code style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'monospace' }}>
                              {key.id.substring(0, 12)}...{key.id.substring(key.id.length - 4)}
                            </code>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleCopyKey(key.id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 6,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: 12,
                              }}
                            >
                              {copiedKey === key.id ? '✓' : '📋'}
                            </button>
                            {key.status === 'active' && (
                              <button
                                onClick={() => handleRevokeKey(key.id)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  background: 'rgba(239,68,68,0.1)',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: 12,
                                }}
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                          <span>Created: {key.created}</span>
                          <span>Last used: {key.lastUsed}</span>
                          <span>Today: {key.usage.today} requests</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          {key.permissions.map((perm) => (
                            <span
                              key={perm}
                              style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: 'rgba(255,255,255,0.05)',
                                color: 'rgba(255,255,255,0.6)',
                                fontSize: 11,
                              }}
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* New Key Modal */}
                  {showNewKeyModal && (
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10001,
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #0a1628, #1a2d4a)',
                        borderRadius: 12,
                        padding: 24,
                        width: '100%',
                        maxWidth: 400,
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}>
                        <h3 style={{ color: '#fff', margin: '0 0 16px' }}>Create New API Key</h3>
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
                            Key Name
                          </label>
                          <input
                            type="text"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="e.g., Production API"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: 8,
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#fff',
                              fontSize: 14,
                            }}
                          />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
                            Permissions
                          </label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {permissionOptions.map((perm) => (
                              <label
                                key={perm.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  padding: '8px 12px',
                                  background: newKeyPermissions.includes(perm.id) ? `${color}11` : 'transparent',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={newKeyPermissions.includes(perm.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewKeyPermissions([...newKeyPermissions, perm.id]);
                                    } else {
                                      setNewKeyPermissions(newKeyPermissions.filter(p => p !== perm.id));
                                    }
                                  }}
                                  style={{ accentColor: color }}
                                />
                                <div>
                                  <div style={{ color: '#fff', fontSize: 13 }}>{perm.label}</div>
                                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{perm.description}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setShowNewKeyModal(false)}
                            style={{
                              padding: '10px 16px',
                              borderRadius: 8,
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => { handleCreateKey(); setShowNewKeyModal(false); }}
                            disabled={!newKeyName.trim()}
                            style={{
                              padding: '10px 16px',
                              borderRadius: 8,
                              background: newKeyName.trim() ? color : 'rgba(255,255,255,0.1)',
                              border: 'none',
                              color: '#fff',
                              cursor: newKeyName.trim() ? 'pointer' : 'not-allowed',
                              fontWeight: 600,
                            }}
                          >
                            Create Key
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Documentation Tab */}
              {activeTab === 'docs' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Quick Start */}
                  <div style={{
                    padding: 16,
                    background: 'rgba(59,130,246,0.1)',
                    borderRadius: 8,
                    border: '1px solid rgba(59,130,246,0.2)',
                  }}>
                    <h4 style={{ color: '#3b82f6', margin: '0 0 12px' }}>🚀 Quick Start</h4>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '0 0 12px' }}>
                      Include your API key in the Authorization header:
                    </p>
                    <div style={{ position: 'relative' }}>
                      <pre style={{
                        background: 'rgba(0,0,0,0.3)',
                        padding: 12,
                        borderRadius: 6,
                        color: '#10b981',
                        fontSize: 12,
                        fontFamily: 'monospace',
                        margin: 0,
                        overflow: 'auto',
                      }}>
{`curl -X POST https://api.sovereign-intelligence.ai/v1/reports/generate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"vertical": "${verticalId}", "report_type": "comprehensive", "context": "Q4 analysis"}'`}
                      </pre>
                      <button
                        onClick={() => handleCopyCode(`curl -X POST https://api.sovereign-intelligence.ai/v1/reports/generate -H "Authorization: Bearer YOUR_API_KEY" -H "Content-Type: application/json" -d '{"vertical": "${verticalId}", "report_type": "comprehensive", "context": "Q4 analysis"}'`)}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: 11,
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Endpoints */}
                  <h3 style={{ color: '#fff', margin: 0, fontSize: 16 }}>API Endpoints</h3>
                  {apiEndpoints.map((endpoint, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.08)',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background: endpoint.method === 'GET' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                          color: endpoint.method === 'GET' ? '#10b981' : '#3b82f6',
                        }}>
                          {endpoint.method}
                        </span>
                        <code style={{ color: '#fff', fontFamily: 'monospace', fontSize: 13 }}>
                          {endpoint.path}
                        </code>
                      </div>
                      <div style={{ padding: 16 }}>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '0 0 12px' }}>
                          {endpoint.description}
                        </p>
                        <div style={{ marginBottom: 12 }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600 }}>Parameters:</span>
                          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {endpoint.params.map((param) => (
                              <div key={param.name} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12 }}>
                                <code style={{ color: color, fontFamily: 'monospace' }}>{param.name}</code>
                                <span style={{ color: 'rgba(255,255,255,0.4)' }}>({param.type})</span>
                                {param.required && <span style={{ color: '#ef4444', fontSize: 10 }}>required</span>}
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>- {param.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {endpoint.example && (
                          <div>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600 }}>Example:</span>
                            <pre style={{
                              background: 'rgba(0,0,0,0.3)',
                              padding: 12,
                              borderRadius: 6,
                              color: '#10b981',
                              fontSize: 11,
                              fontFamily: 'monospace',
                              margin: '8px 0 0',
                              overflow: 'auto',
                            }}>
                              {endpoint.example}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Usage Tab */}
              {activeTab === 'usage' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Usage Overview */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {[
                      { label: 'Today', value: '147', limit: '1,000' },
                      { label: 'This Week', value: '892', limit: '7,000' },
                      { label: 'This Month', value: '3,420', limit: '30,000' },
                      { label: 'Success Rate', value: '99.2%', limit: null },
                    ].map((stat, index) => (
                      <div
                        key={index}
                        style={{
                          padding: 16,
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4 }}>{stat.label}</div>
                        <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{stat.value}</div>
                        {stat.limit && (
                          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>of {stat.limit}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Usage Chart Placeholder */}
                  <div style={{
                    padding: 20,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <h4 style={{ color: '#fff', margin: '0 0 16px', fontSize: 14 }}>API Requests (Last 7 Days)</h4>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
                      {[65, 82, 91, 75, 88, 95, 78].map((value, index) => (
                        <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: '100%',
                              height: value,
                              background: `linear-gradient(180deg, ${color}, ${color}44)`,
                              borderRadius: '4px 4px 0 0',
                            }}
                          />
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rate Limits */}
                  <div style={{
                    padding: 16,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <h4 style={{ color: '#fff', margin: '0 0 12px', fontSize: 14 }}>Rate Limits</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Per Minute</span>
                        <span style={{ color: '#fff', fontSize: 13 }}>60 requests</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Per Hour</span>
                        <span style={{ color: '#fff', fontSize: 13 }}>1,000 requests</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Per Day</span>
                        <span style={{ color: '#fff', fontSize: 13 }}>10,000 requests</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Per Month</span>
                        <span style={{ color: '#fff', fontSize: 13 }}>100,000 requests</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Webhooks Tab */}
              {activeTab === 'webhooks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{
                    padding: 16,
                    background: 'rgba(245,158,11,0.1)',
                    borderRadius: 8,
                    border: '1px solid rgba(245,158,11,0.2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span>🔔</span>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>Webhooks</span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>
                      Receive real-time notifications when reports are generated, shared, or scheduled tasks complete.
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
                      Webhook URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://yourapp.com/webhooks/sovereign"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: 14,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 }}>
                      Events to Subscribe
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { id: 'report.generated', label: 'Report Generated' },
                        { id: 'report.shared', label: 'Report Shared' },
                        { id: 'report.exported', label: 'Report Exported' },
                        { id: 'schedule.completed', label: 'Scheduled Task Completed' },
                        { id: 'team.member_added', label: 'Team Member Added' },
                        { id: 'usage.limit_warning', label: 'Usage Limit Warning' },
                      ].map((event) => (
                        <label
                          key={event.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.08)',
                            cursor: 'pointer',
                          }}
                        >
                          <input type="checkbox" style={{ accentColor: color }} />
                          <span style={{ color: '#fff', fontSize: 13 }}>{event.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    style={{
                      padding: '12px 20px',
                      borderRadius: 8,
                      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      alignSelf: 'flex-start',
                    }}
                  >
                    Save Webhook Configuration
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
