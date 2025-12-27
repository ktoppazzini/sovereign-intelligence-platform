'use client';

import { useEffect, useState } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { loadModuleTranslations } from '../../lib/dynamicTranslation';
import { getVerticalConfig } from '../../lib/verticalConfig';

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD MODULE - Shared Content Component
// Renders dashboard with vertical-specific theming
// Full dynamic translation + Charts + Contact CTA
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

// Simple animated bar chart component
function MiniBarChart({ data, color, height = 60 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((value, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${value}%`,
            background: `linear-gradient(180deg, ${color}, ${color}50)`,
            borderRadius: '4px 4px 0 0',
            transition: 'height 0.5s ease',
            minWidth: 8,
          }}
        />
      ))}
    </div>
  );
}

// Simple line chart component
function MiniLineChart({ data, color, height = 60 }) {
  const max = Math.max(...data);
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - (v / max) * 100,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  
  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${pathD} L 100 100 L 0 100 Z`} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
    </svg>
  );
}

// Donut chart component
function DonutChart({ value, color, size = 80 }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (value / 100) * circumference;
  
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
      <circle
        cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x="40" y="45" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700">{value}%</text>
    </svg>
  );
}

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
    
    // Stats labels
    totalUsers: 'Total Users',
    activeProjects: 'Active Projects',
    complianceScore: 'Compliance Score',
    aiInteractions: 'AI Interactions',
    documentsProcessed: 'Documents Processed',
    pendingTasks: 'Pending Tasks',
    
    // Section titles
    quickActions: 'Quick Actions',
    recentActivity: 'Recent Activity',
    systemHealth: 'System Health',
    performanceChart: 'Performance Trend',
    activityChart: 'Weekly Activity',
    
    // Buttons
    runComplianceScan: 'Run Compliance Scan',
    generateReport: 'Generate Report',
    scheduleAudit: 'Schedule Audit',
    
    // Activity items (fully translated)
    actComplianceScan: 'Compliance scan completed',
    actDocumentUpload: 'New document uploaded',
    actPolicyUpdate: 'Policy updated',
    actAiInsight: 'AI insight generated',
    actAccessGrant: 'User access granted',
    
    // Activity meta
    actBySystem: 'System',
    actByAI: 'AI Agent',
    actByAdmin: 'Admin',
    actTime5min: '5 min ago',
    actTime12min: '12 min ago',
    actTime1hr: '1 hour ago',
    actTime2hr: '2 hours ago',
    actTime3hr: '3 hours ago',
    
    // System health
    sysApiGateway: 'API Gateway',
    sysDatabase: 'Database Cluster',
    sysAiServices: 'AI Services',
    sysStorage: 'Storage',
    statusHealthy: 'healthy',
    statusWarning: 'warning',
    
    // Contact CTA
    ctaTitle: 'Need Enterprise Support?',
    ctaDesc: 'Get personalized assistance from our enterprise team.',
    ctaScheduleDemo: 'Schedule Demo',
    ctaContactSales: 'Contact Sales',
    
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
        cachePrefix: `SI_DASHBOARD_${verticalId || 'MAIN'}_V2`,
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
    { action: ui.actComplianceScan, user: ui.actBySystem, time: ui.actTime5min, icon: '✓', color: '#10b981' },
    { action: ui.actDocumentUpload, user: 'John D.', time: ui.actTime12min, icon: '📄', color: theme.primary },
    { action: ui.actPolicyUpdate, user: 'Sarah M.', time: ui.actTime1hr, icon: '📜', color: theme.secondary || '#8b5cf6' },
    { action: ui.actAiInsight, user: ui.actByAI, time: ui.actTime2hr, icon: '💡', color: '#f59e0b' },
    { action: ui.actAccessGrant, user: ui.actByAdmin, time: ui.actTime3hr, icon: '🔑', color: '#06b6d4' },
  ];

  const systemHealth = [
    { name: ui.sysApiGateway, status: ui.statusHealthy, uptime: '99.99%' },
    { name: ui.sysDatabase, status: ui.statusHealthy, uptime: '99.97%' },
    { name: ui.sysAiServices, status: ui.statusHealthy, uptime: '99.95%' },
    { name: ui.sysStorage, status: ui.statusWarning, uptime: '99.80%' },
  ];

  // Chart data
  const performanceData = [65, 72, 68, 85, 78, 92, 88, 95, 91, 94];
  const activityData = [45, 62, 78, 55, 89, 72, 95];

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

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 32 }}>
          {/* Performance Trend Chart */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${theme.cardBorder}`,
          }}>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 20px' }}>{ui.performanceChart}</h3>
            <MiniLineChart data={performanceData} color={theme.primary} height={120} />
          </div>

          {/* Weekly Activity Chart */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${theme.cardBorder}`,
          }}>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 20px' }}>{ui.activityChart}</h3>
            <MiniBarChart data={activityData} color={theme.secondary || '#8b5cf6'} height={120} />
          </div>

          {/* Compliance Donut */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${theme.cardBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 20px' }}>{ui.complianceScore}</h3>
            <DonutChart value={94} color="#10b981" size={120} />
          </div>
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
                      background: item.status === ui.statusHealthy ? '#10b981' : item.status === ui.statusWarning ? '#f59e0b' : '#ef4444',
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

        {/* Contact CTA */}
        <div style={{
          marginTop: 24,
          background: `linear-gradient(135deg, ${theme.primary}15, ${theme.secondary || theme.primary}15)`,
          borderRadius: 16,
          padding: 32,
          border: `1px solid ${theme.primary}30`,
          textAlign: 'center',
        }}>
          <h3 style={{ color: '#fff', fontSize: '1.25rem', margin: '0 0 8px' }}>{ui.ctaTitle}</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 24px' }}>{ui.ctaDesc}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`/contact${qsLang}`} style={{
              padding: '14px 32px',
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 600,
              textDecoration: 'none',
            }}>
              📅 {ui.ctaScheduleDemo}
            </a>
            <a href={`/contact${qsLang}`} style={{
              padding: '14px 32px',
              background: 'rgba(255,255,255,0.1)',
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 10,
              color: '#fff',
              fontWeight: 600,
              textDecoration: 'none',
            }}>
              📧 {ui.ctaContactSales}
            </a>
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
