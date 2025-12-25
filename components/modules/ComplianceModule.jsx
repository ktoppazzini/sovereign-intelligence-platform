'use client';

import { useEffect, useState } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

// ═══════════════════════════════════════════════════════════════════════════
// COMPLIANCE MODULE - Shared Content Component
// Renders compliance with vertical-specific theming
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

const REGULATIONS = [
  { id: 'gdpr', name: 'GDPR', desc: 'General Data Protection Regulation', score: 94, status: 'compliant', controls: 87, issues: 2 },
  { id: 'hipaa', name: 'HIPAA', desc: 'Health Insurance Portability Act', score: 78, status: 'partial', controls: 65, issues: 8 },
  { id: 'sox', name: 'SOX', desc: 'Sarbanes-Oxley Act', score: 100, status: 'compliant', controls: 45, issues: 0 },
  { id: 'pci', name: 'PCI-DSS', desc: 'Payment Card Industry Security', score: 85, status: 'partial', controls: 52, issues: 5 },
  { id: 'iso', name: 'ISO 27001', desc: 'Information Security Management', score: 91, status: 'compliant', controls: 114, issues: 3 },
  { id: 'nist', name: 'NIST', desc: 'Cybersecurity Framework', score: 88, status: 'compliant', controls: 98, issues: 4 },
];

export default function ComplianceModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  const [activeTab, setActiveTab] = useState('overview');
  const [scanning, setScanning] = useState(false);
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)',
    cardBorder: 'rgba(255,255,255,0.08)',
  };
  const moduleConfig = vertical?.modules?.compliance || { title: 'AI Compliance Engine', icon: '📋' };

  const BASE_UI = {
    pageTitle: moduleConfig.title || 'AI Compliance Engine',
    pageSubtitle: moduleConfig.desc || 'Automated regulatory compliance and risk management',
    
    tabOverview: 'Overview',
    tabRegulations: 'Regulations',
    tabPolicies: 'Policies',
    tabAuditTrail: 'Audit Trail',
    
    complianceScore: 'Compliance Score',
    criticalIssues: 'Critical Issues',
    pendingActions: 'Pending Actions',
    lastAudit: 'Last Audit',
    
    runScan: 'Run Compliance Scan',
    downloadReport: 'Download Report',
    
    backToHome: verticalId ? `Back to ${vertical?.name}` : 'Back to Home',
  };

  const [ui, setUi] = useState(BASE_UI);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setLang(sp.get('lang') || 'English');
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const newDir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
      setDir(newDir);
      document.documentElement.setAttribute('dir', newDir);

      const { t } = await getUiTranslations({
        base: BASE_UI,
        lang,
        cachePrefix: `SI_COMPLIANCE_${verticalId || 'MAIN'}`,
        setDir: true,
      });
      if (mounted) setUi(t || BASE_UI);
    })();
    return () => { mounted = false; };
  }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

  const handleScan = async () => {
    setScanning(true);
    await new Promise(r => setTimeout(r, 3000));
    setScanning(false);
  };

  const tabs = [
    { id: 'overview', label: ui.tabOverview },
    { id: 'regulations', label: ui.tabRegulations },
    { id: 'policies', label: ui.tabPolicies },
    { id: 'audit', label: ui.tabAuditTrail },
  ];

  const overallScore = Math.round(REGULATIONS.reduce((acc, r) => acc + r.score, 0) / REGULATIONS.length);

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.gradient,
      direction: dir,
    }}>
      {/* Classification Banner for Defense */}
      {vertical?.classification?.show && (
        <div style={{
          background: vertical.classification.color,
          padding: '4px 0',
          textAlign: 'center',
          color: '#000',
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '2px',
        }}>
          {vertical.classification.level}
        </div>
      )}

      {/* Header */}
      <header style={{
        background: 'rgba(0,0,0,0.3)',
        borderBottom: `1px solid ${theme.cardBorder}`,
        padding: '20px 32px',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <a href={homeLink} style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.85rem' }}>
            ← {ui.backToHome}
          </a>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            {vertical && (
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
              }}>
                {vertical.icon}
              </div>
            )}
            <div>
              <h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
                {moduleConfig.icon || '📋'} {ui.pageTitle}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>{ui.pageSubtitle}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div style={{
        background: 'rgba(0,0,0,0.2)',
        borderBottom: `1px solid ${theme.cardBorder}`,
        padding: '0 32px',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 4 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '16px 24px',
                background: activeTab === tab.id ? `${theme.primary}20` : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? `2px solid ${theme.primary}` : '2px solid transparent',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.6)',
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 32 }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Score Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 20,
              marginBottom: 32,
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 16,
                padding: 24,
                border: `1px solid ${theme.cardBorder}`,
                textAlign: 'center',
              }}>
                <div style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: `conic-gradient(${theme.primary} ${overallScore}%, rgba(255,255,255,0.1) 0)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  position: 'relative',
                }}>
                  <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: '#0a1628',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800 }}>{overallScore}%</span>
                  </div>
                </div>
                <div style={{ color: '#fff', fontWeight: 600 }}>{ui.complianceScore}</div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 16,
                padding: 24,
                border: `1px solid ${theme.cardBorder}`,
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ef4444' }}>3</div>
                <div style={{ color: 'rgba(255,255,255,0.6)' }}>{ui.criticalIssues}</div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 16,
                padding: 24,
                border: `1px solid ${theme.cardBorder}`,
              }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f59e0b' }}>12</div>
                <div style={{ color: 'rgba(255,255,255,0.6)' }}>{ui.pendingActions}</div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 16,
                padding: 24,
                border: `1px solid ${theme.cardBorder}`,
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#10b981' }}>Dec 20, 2025</div>
                <div style={{ color: 'rgba(255,255,255,0.6)' }}>{ui.lastAudit}</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
              <button
                onClick={handleScan}
                disabled={scanning}
                style={{
                  padding: '14px 28px',
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontWeight: 600,
                  cursor: scanning ? 'wait' : 'pointer',
                  opacity: scanning ? 0.7 : 1,
                }}
              >
                {scanning ? '🔄 Scanning...' : `🔍 ${ui.runScan}`}
              </button>
              <button style={{
                padding: '14px 28px',
                background: 'rgba(255,255,255,0.1)',
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: 10,
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                📊 {ui.downloadReport}
              </button>
            </div>

            {/* Regulations Overview */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 16,
              padding: 24,
              border: `1px solid ${theme.cardBorder}`,
            }}>
              <h3 style={{ color: '#fff', margin: '0 0 20px' }}>Regulatory Frameworks</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {REGULATIONS.map(reg => (
                  <div key={reg.id} style={{
                    padding: 16,
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600 }}>{reg.name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{reg.desc}</div>
                    </div>
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      background: reg.status === 'compliant' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                      color: reg.status === 'compliant' ? '#10b981' : '#f59e0b',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                    }}>
                      {reg.score}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Regulations Tab */}
        {activeTab === 'regulations' && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${theme.cardBorder}`,
          }}>
            <h3 style={{ color: '#fff', margin: '0 0 20px' }}>Detailed Compliance Status</h3>
            {REGULATIONS.map(reg => (
              <div key={reg.id} style={{
                padding: 20,
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 12,
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>{reg.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 12 }}>{reg.desc}</span>
                  </div>
                  <span style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    background: reg.status === 'compliant' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                    color: reg.status === 'compliant' ? '#10b981' : '#f59e0b',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}>
                    {reg.status === 'compliant' ? 'Compliant' : 'Partial'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 24, color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                  <span>Controls: {reg.controls}</span>
                  <span>Issues: {reg.issues}</span>
                  <span>Score: {reg.score}%</span>
                </div>
                <div style={{
                  marginTop: 12,
                  height: 6,
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${reg.score}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                    borderRadius: 3,
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${theme.cardBorder}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#fff', margin: 0 }}>Policy Management</h3>
              <button style={{
                padding: '10px 20px',
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                ✨ Generate Policy with AI
              </button>
            </div>
            {['Data Protection Policy', 'Access Control Policy', 'Incident Response Policy', 'Privacy Policy'].map((policy, i) => (
              <div key={i} style={{
                padding: 16,
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 10,
                marginBottom: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 500 }}>{policy}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Last updated: Dec {20 - i}, 2025</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{
                    padding: '6px 12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}>View</button>
                  <button style={{
                    padding: '6px 12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}>Edit</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === 'audit' && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${theme.cardBorder}`,
          }}>
            <h3 style={{ color: '#fff', margin: '0 0 20px' }}>Audit Trail</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>User</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Action</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Resource</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Timestamp</th>
                    <th style={{ padding: 12, textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { user: 'admin@company.com', action: 'Policy Updated', resource: 'Data Protection', time: '10:30 AM', verified: true },
                    { user: 'security@company.com', action: 'Access Granted', resource: 'Financial Records', time: '9:15 AM', verified: true },
                    { user: 'compliance@company.com', action: 'Audit Started', resource: 'GDPR Framework', time: '8:00 AM', verified: true },
                    { user: 'hr@company.com', action: 'Data Export', resource: 'Employee Records', time: 'Yesterday', verified: true },
                    { user: 'system', action: 'Auto-Remediation', resource: 'Encryption Settings', time: 'Yesterday', verified: true },
                  ].map((log, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: 12, color: '#fff' }}>{log.user}</td>
                      <td style={{ padding: 12, color: 'rgba(255,255,255,0.8)' }}>{log.action}</td>
                      <td style={{ padding: 12, color: 'rgba(255,255,255,0.6)' }}>{log.resource}</td>
                      <td style={{ padding: 12, color: 'rgba(255,255,255,0.5)' }}>{log.time}</td>
                      <td style={{ padding: 12 }}>
                        <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✓ Verified</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Classification Banner Bottom for Defense */}
      {vertical?.classification?.show && (
        <div style={{
          background: vertical.classification.color,
          padding: '4px 0',
          textAlign: 'center',
          color: '#000',
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '2px',
        }}>
          {vertical.classification.level}
        </div>
      )}

      {/* Responsive Styles */}
      <style jsx global>{`
        @media (max-width: 767px) {
          header { padding: 16px !important; }
          header h1 { font-size: 1.35rem !important; }
          main { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
