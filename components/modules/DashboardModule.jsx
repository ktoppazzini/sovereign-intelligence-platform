'use client';

import { useEffect, useState } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD MODULE - Shared Content Component
// Renders dashboard with vertical-specific theming
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

export default function DashboardModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  // Get vertical config if specified
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)',
    cardBorder: 'rgba(255,255,255,0.08)',
  };
  const moduleConfig = vertical?.modules?.dashboard || { title: 'Executive Dashboard', icon: '📊' };

  const BASE_UI = {
    pageTitle: moduleConfig.title || 'Executive Dashboard',
    pageSubtitle: moduleConfig.desc || 'Real-time enterprise intelligence overview',
    
    totalUsers: 'Total Users',
    activeProjects: 'Active Projects',
    complianceScore: 'Compliance Score',
    aiInteractions: 'AI Interactions',
    documentsProcessed: 'Documents Processed',
    pendingTasks: 'Pending Tasks',
    
    quickActions: 'Quick Actions',
    recentActivity: 'Recent Activity',
    systemHealth: 'System Health',
    
    runComplianceScan: 'Run Compliance Scan',
    generateReport: 'Generate Report',
    scheduleAudit: 'Schedule Audit',
    
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
        cachePrefix: `SI_DASHBOARD_${verticalId || 'MAIN'}`,
        setDir: true,
      });
      if (mounted) setUi(t || BASE_UI);
    })();
    return () => { mounted = false; };
  }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;
  const complianceLink = verticalId ? `/${verticalId}/compliance${qsLang}` : `/compliance${qsLang}`;

  const stats = [
    { label: ui.totalUsers, value: '2,847', change: '+12%', icon: '👥', color: theme.primary },
    { label: ui.activeProjects, value: '156', change: '+8%', icon: '📁', color: theme.secondary || '#8b5cf6' },
    { label: ui.complianceScore, value: '94%', change: '+3%', icon: '✓', color: '#10b981' },
    { label: ui.aiInteractions, value: '45.2K', change: '+28%', icon: '🤖', color: '#f59e0b' },
    { label: ui.documentsProcessed, value: '8,934', change: '+15%', icon: '📄', color: '#06b6d4' },
    { label: ui.pendingTasks, value: '23', change: '-5%', icon: '📋', color: '#ec4899' },
  ];

  const recentActivity = [
    { action: 'Compliance scan completed', user: 'System', time: '5 min ago', icon: '✓', color: '#10b981' },
    { action: 'New document uploaded', user: 'John D.', time: '12 min ago', icon: '📄', color: theme.primary },
    { action: 'Policy updated', user: 'Sarah M.', time: '1 hour ago', icon: '📜', color: theme.secondary || '#8b5cf6' },
    { action: 'AI insight generated', user: 'AI Agent', time: '2 hours ago', icon: '💡', color: '#f59e0b' },
    { action: 'User access granted', user: 'Admin', time: '3 hours ago', icon: '🔑', color: '#06b6d4' },
  ];

  const systemHealth = [
    { name: 'API Gateway', status: 'healthy', uptime: '99.99%' },
    { name: 'Database Cluster', status: 'healthy', uptime: '99.97%' },
    { name: 'AI Services', status: 'healthy', uptime: '99.95%' },
    { name: 'Storage', status: 'warning', uptime: '99.80%' },
  ];

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
                {moduleConfig.icon || '📊'} {ui.pageTitle}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>{ui.pageSubtitle}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 32 }}>
        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
          marginBottom: 32,
        }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 16,
              padding: 24,
              border: `1px solid ${theme.cardBorder}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: `${stat.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                }}>
                  {stat.icon}
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  color: stat.change.startsWith('+') ? '#10b981' : '#ef4444',
                  fontWeight: 600,
                }}>
                  {stat.change}
                </span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                {stat.value}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          {/* Recent Activity */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${theme.cardBorder}`,
          }}>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 20px' }}>{ui.recentActivity}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {recentActivity.map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 12,
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 10,
                }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `${item.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: '0.9rem' }}>{item.action}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{item.user}</div>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{item.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* System Health */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${theme.cardBorder}`,
          }}>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 20px' }}>{ui.systemHealth}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {systemHealth.map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: item.status === 'healthy' ? '#10b981' : item.status === 'warning' ? '#f59e0b' : '#ef4444',
                    }} />
                    <span style={{ color: '#fff', fontSize: '0.9rem' }}>{item.name}</span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{item.uptime}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          marginTop: 24,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${theme.cardBorder}`,
        }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 20px' }}>{ui.quickActions}</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={complianceLink} style={{
              padding: '12px 24px',
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              🔍 {ui.runComplianceScan}
            </a>
            <button style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.1)',
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 10,
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              📊 {ui.generateReport}
            </button>
            <button style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.1)',
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 10,
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              📅 {ui.scheduleAudit}
            </button>
          </div>
        </div>
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
          main > div[style*="grid-template-columns: 2fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
