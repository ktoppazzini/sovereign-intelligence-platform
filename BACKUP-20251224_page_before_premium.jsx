'use client';

import { useEffect, useState, useCallback } from 'react';
import { getUiTranslations } from '../lib/i18nClient';
import { profileManager, CORE_IDENTITY } from '../lib/agentProfile';

// ═══════════════════════════════════════════════════════════════════════════
// SOVEREIGN INTELLIGENCE - MODERNIZED HOME PAGE
// Intelligence Operating System with AI Agent Integration
// ═══════════════════════════════════════════════════════════════════════════

const BASE_UI = {
  // Brand
  brandTitle: 'Sovereign Intelligence',
  brandSubtitle: 'Intelligence Operating System',
  
  // Hero
  heroWelcome: 'Welcome back',
  heroTitle: 'Your AI-Powered Intelligence Hub',
  heroSubtitle: 'Transform data into actionable insights with advanced AI capabilities',
  
  // Quick Actions
  quickActions: 'Quick Actions',
  startReform: 'Start Reform',
  createRequest: 'Create Request',
  viewDashboard: 'View Dashboard',
  aiAssistant: 'AI Assistant',
  
  // Stats
  statsTitle: 'System Overview',
  activeReforms: 'Active Reforms',
  openRequests: 'Open Requests',
  reportsGenerated: 'Reports Generated',
  aiInsights: 'AI Insights',
  
  // AI Agent Card
  agentTitle: 'Sovereign AI Agent',
  agentDescription: 'Your intelligent assistant that learns and adapts',
  agentInteractions: 'Total Interactions',
  agentSkills: 'Skills Learned',
  agentKnowledge: 'Knowledge Nodes',
  agentLastActive: 'Last Active',
  chatWithAgent: 'Chat with Agent',
  viewProfile: 'View Profile',
  
  // Modules Grid
  modulesTitle: 'Intelligence Modules',
  moduleCompliance: 'AI Compliance',
  moduleComplianceDesc: 'Auto-regulatory scanning, GDPR, HIPAA, SOX compliance',
  moduleDocuments: 'Document Processing',
  moduleDocumentsDesc: 'AI-powered OCR, extraction, and classification',
  moduleWorkflows: 'Workflow Automation',
  moduleWorkflowsDesc: 'Visual workflow builder with AI task routing',
  moduleKnowledge: 'Knowledge Graph',
  moduleKnowledgeDesc: 'Enterprise knowledge network visualization',
  moduleSecurity: 'Security Center',
  moduleSecurityDesc: 'Real-time threat detection and response',
  moduleComm: 'Communication Hub',
  moduleCommDesc: 'Omnichannel inbox and unified messaging',
  moduleFinance: 'Financial Intelligence',
  moduleFinanceDesc: 'AI-powered analytics and forecasting',
  moduleEmployee: 'Employee Experience',
  moduleEmployeeDesc: 'HR automation and engagement platform',
  moduleIntegrations: 'Integrations',
  moduleIntegrationsDesc: 'Connect 500+ enterprise applications',
  moduleTwin: 'Digital Twin',
  moduleTwinDesc: 'AI replica for predictive simulations',
  
  // Recent Activity
  recentActivity: 'Recent Activity',
  noActivity: 'No recent activity',
  viewAll: 'View All',
  
  // Navigation
  navHome: 'Home',
  navAssistant: 'Assistant',
  navDashboard: 'Dashboard',
  navReform: 'Reform',
  navAdmin: 'Admin',
  navDocuments: 'Documents',
  navAgent: 'AI Agent',
  navLogin: 'Login',
  
  // Footer
  footerPowered: 'Powered by Sovereign Intelligence',
  footerVersion: 'Version',
  
  // Time
  justNow: 'Just now',
  minutesAgo: 'minutes ago',
  hoursAgo: 'hours ago',
  daysAgo: 'days ago',
};

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function AnimatedGradient() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      zIndex: 0,
    }}>
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: `
          radial-gradient(circle at 20% 80%, rgba(59,130,246,0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(139,92,246,0.12) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(236,72,153,0.08) 0%, transparent 50%)
        `,
        animation: 'gradientMove 20s ease infinite',
      }} />
      <style jsx>{`
        @keyframes gradientMove {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(2%, 2%) rotate(1deg); }
          66% { transform: translate(-1%, 1%) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}

function StatCard({ value, label, icon, color, trend }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 16,
      padding: 20,
      border: '1px solid rgba(255,255,255,0.08)',
      transition: 'all 0.3s ease',
      cursor: 'default',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.borderColor = `${color}40`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
    }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {value}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: 6 }}>
            {label}
          </div>
        </div>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
        }}>
          {icon}
        </div>
      </div>
      {trend && (
        <div style={{
          marginTop: 12,
          fontSize: '0.8rem',
          color: trend > 0 ? '#10b981' : '#ef4444',
        }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last week
        </div>
      )}
    </div>
  );
}

function ModuleCard({ title, description, icon, href, color, lang }) {
  return (
    <a
      href={`${href}?lang=${encodeURIComponent(lang)}`}
      style={{
        display: 'block',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 24,
        border: '1px solid rgba(255,255,255,0.08)',
        textDecoration: 'none',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = `${color}60`;
        e.currentTarget.style.boxShadow = `0 20px 40px ${color}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        background: `linear-gradient(135deg, ${color}30, ${color}10)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.8rem',
        marginBottom: 16,
      }}>
        {icon}
      </div>
      <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, margin: '0 0 8px' }}>
        {title}
      </h3>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
        {description}
      </p>
    </a>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function HomePage() {
  const [lang, setLang] = useState('English');
  const [ui, setUi] = useState(BASE_UI);
  const [dir, setDir] = useState('ltr');
  const [profile, setProfile] = useState(null);
  const [profileSummary, setProfileSummary] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize
  useEffect(() => {
    // Get language from URL or cookie
    const sp = new URLSearchParams(window.location.search);
    const urlLang = sp.get('lang');
    if (urlLang) {
      setLang(urlLang);
    } else {
      // Try to get from cookie
      const match = document.cookie.match(/ui_lang=([^;]+)/);
      if (match) setLang(match[1]);
    }

    // Check admin status
    const checkAdmin = async () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        if (sp.get('forceAdmin') === '1') {
          setIsAdmin(true);
          return;
        }
        const res = await fetch('/api/users/me', { cache: 'no-store' });
        if (res.ok) {
          const j = await res.json();
          setIsAdmin(/^(admin|super\s*admin)$/i.test(j?.role || ''));
        }
      } catch {}
    };
    checkAdmin();

    // Update time
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Load agent profile
  useEffect(() => {
    (async () => {
      try {
        const loadedProfile = await profileManager.getProfile('default_user');
        setProfile(loadedProfile);
        setProfileSummary(loadedProfile.getSummary());
      } catch (err) {
        console.warn('[HomePage] Failed to load profile:', err);
      }
    })();
  }, []);

  // Set greeting based on time
  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, [currentTime]);

  // Translate UI
  useEffect(() => {
    let mounted = true;
    (async () => {
      const newDir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
      setDir(newDir);
      document.documentElement.setAttribute('dir', newDir);
      document.documentElement.setAttribute('lang', lang);

      const { t } = await getUiTranslations({
        base: BASE_UI,
        lang,
        cachePrefix: 'SI_HOME_PAGE',
        setDir: true,
      });
      if (mounted) setUi(t || BASE_UI);
    })();
    return () => { mounted = false; };
  }, [lang]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)',
      position: 'relative',
      direction: dir,
    }}>
      <AnimatedGradient />

      {/* Navigation */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10,22,40,0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 32px',
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: '#fff',
              fontSize: '1rem',
            }}>
              SI
            </div>
            <div className="si-brand-text">
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
                {ui.brandTitle}
              </div>
              <div className="si-brand-subtitle" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
                {ui.brandSubtitle}
              </div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              padding: '8px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>

          {/* Nav Links - Desktop */}
          <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[
              { label: ui.navHome, href: '/', icon: '🏠', active: true },
              { label: ui.navAssistant, href: '/assistant', icon: '🤖' },
              { label: ui.navDashboard, href: '/dashboard', icon: '📊' },
              { label: ui.navDocuments, href: '/documents', icon: '📁' },
              { label: ui.navAgent, href: '/agent', icon: '🧠' },
            ].map((item, i) => (
              <a
                key={i}
                href={`${item.href}${qsLang}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: item.active ? 'rgba(59,130,246,0.2)' : 'transparent',
                  border: item.active ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                  color: item.active ? '#3b82f6' : 'rgba(255,255,255,0.7)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              >
                <span>{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </a>
            ))}
            
            {isAdmin && (
              <a
                href={`/admin${qsLang}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: 'rgba(139,92,246,0.2)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  color: '#8b5cf6',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                }}
              >
                <span>⚙️</span>
                <span>{ui.navAdmin}</span>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-nav-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10,22,40,0.98)',
            zIndex: 200,
            padding: '80px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              padding: '12px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
          
          {[
            { label: ui.navHome, href: '/', icon: '🏠' },
            { label: ui.navAssistant, href: '/assistant', icon: '🤖' },
            { label: ui.navDashboard, href: '/dashboard', icon: '📊' },
            { label: ui.navDocuments, href: '/documents', icon: '📁' },
            { label: ui.navAgent, href: '/agent', icon: '🧠' },
          ].map((item, i) => (
            <a
              key={i}
              href={`${item.href}${qsLang}`}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px 20px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '1.1rem',
                fontWeight: 500,
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
              {item.label}
            </a>
          ))}
          
          {isAdmin && (
            <a
              href={`/admin${qsLang}`}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px 20px',
                borderRadius: 12,
                background: 'rgba(139,92,246,0.2)',
                border: '1px solid rgba(139,92,246,0.3)',
                color: '#8b5cf6',
                textDecoration: 'none',
                fontSize: '1.1rem',
                fontWeight: 500,
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>⚙️</span>
              {ui.navAdmin}
            </a>
          )}
        </div>
      )}

      {/* Main Content */}
      <main style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '32px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Hero Section */}
        <section className="si-hero" style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.1) 100%)',
          borderRadius: 24,
          padding: 40,
          marginBottom: 32,
          border: '1px solid rgba(59,130,246,0.2)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ 
              color: 'rgba(255,255,255,0.6)', 
              fontSize: '1rem', 
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>👋</span> {greeting}
            </div>
            <h1 style={{ 
              color: '#fff', 
              fontSize: '2.5rem', 
              fontWeight: 800, 
              margin: '0 0 12px',
              lineHeight: 1.2,
            }}>
              {ui.heroTitle}
            </h1>
            <p style={{ 
              color: 'rgba(255,255,255,0.7)', 
              fontSize: '1.1rem', 
              margin: '0 0 24px',
              maxWidth: 600,
            }}>
              {ui.heroSubtitle}
            </p>
            
            {/* Quick Actions */}
            <div className="si-hero-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {[
                { label: ui.startReform, href: '/reform-report', icon: '🚀', primary: true },
                { label: ui.createRequest, href: '/admin/service-requests2', icon: '📝' },
                { label: ui.viewDashboard, href: '/dashboard', icon: '📊' },
                { label: ui.aiAssistant, href: '/assistant', icon: '🤖' },
              ].map((action, i) => (
                <a
                  key={i}
                  href={`${action.href}${qsLang}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 20px',
                    borderRadius: 12,
                    background: action.primary 
                      ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' 
                      : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    border: action.primary 
                      ? 'none' 
                      : '1px solid rgba(255,255,255,0.2)',
                    transition: 'all 0.2s',
                  }}
                >
                  <span>{action.icon}</span>
                  {action.label}
                </a>
              ))}
            </div>
          </div>
          
          {/* Decorative element */}
          <div style={{
            position: 'absolute',
            right: 40,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 200,
            height: 200,
            background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.2))',
            borderRadius: '50%',
            filter: 'blur(60px)',
          }} />
        </section>

        {/* Stats Grid */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>
            {ui.statsTitle}
          </h2>
          <div className="si-stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
          }}>
            <StatCard value="47" label={ui.activeReforms} icon="📋" color="#3b82f6" trend={12} />
            <StatCard value="132" label={ui.openRequests} icon="📝" color="#8b5cf6" trend={-5} />
            <StatCard value="89" label={ui.reportsGenerated} icon="📊" color="#10b981" trend={23} />
            <StatCard value={profileSummary?.stats?.insightsGenerated || 0} label={ui.aiInsights} icon="💡" color="#f59e0b" trend={18} />
          </div>
        </section>

        {/* AI Agent Card + Modules */}
        <div className="si-agent-modules" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: 24,
          marginBottom: 32,
        }}>
          {/* AI Agent Card */}
          <div className="si-agent-card" style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.05) 100%)',
            borderRadius: 20,
            padding: 28,
            border: '1px solid rgba(59,130,246,0.2)',
          }}>
            <div className="si-agent-header" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                boxShadow: '0 8px 32px rgba(59,130,246,0.3)',
              }}>
                🧠
              </div>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  {ui.agentTitle}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                  {ui.agentDescription}
                </p>
              </div>
            </div>

            <div className="si-agent-stats" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
              marginBottom: 20,
            }}>
              {[
                { label: ui.agentInteractions, value: profileSummary?.stats?.totalInteractions || 0, icon: '💬' },
                { label: ui.agentSkills, value: profileSummary?.stats?.skillsLearned || 0, icon: '⚡' },
                { label: ui.agentKnowledge, value: profileSummary?.stats?.totalKnowledgeNodes || 0, icon: '📚' },
                { label: ui.agentLastActive, value: profileSummary?.stats?.lastActive 
                  ? new Date(profileSummary.stats.lastActive).toLocaleDateString() 
                  : '—', icon: '🕐' },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 12,
                  padding: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span>{stat.icon}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                      {stat.label}
                    </span>
                  </div>
                  <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="si-agent-actions" style={{ display: 'flex', gap: 10 }}>
              <a
                href={`/assistant${qsLang}`}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textAlign: 'center',
                }}
              >
                {ui.chatWithAgent}
              </a>
              <a
                href={`/agent${qsLang}`}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                {ui.viewProfile}
              </a>
            </div>
          </div>

          {/* Intelligence Modules */}
          <div className="si-modules-section">
            <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>
              {ui.modulesTitle}
            </h2>
            <div className="si-modules-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
            }}>
              <ModuleCard
                title={ui.moduleCompliance}
                description={ui.moduleComplianceDesc}
                icon="🏛️"
                href="/compliance"
                color="#3b82f6"
                lang={lang}
              />
              <ModuleCard
                title={ui.moduleDocuments}
                description={ui.moduleDocumentsDesc}
                icon="📄"
                href="/documents/processing"
                color="#10b981"
                lang={lang}
              />
              <ModuleCard
                title={ui.moduleWorkflows}
                description={ui.moduleWorkflowsDesc}
                icon="⚡"
                href="/workflows"
                color="#8b5cf6"
                lang={lang}
              />
              <ModuleCard
                title={ui.moduleKnowledge}
                description={ui.moduleKnowledgeDesc}
                icon="🧠"
                href="/knowledge"
                color="#f59e0b"
                lang={lang}
              />
              <ModuleCard
                title={ui.moduleSecurity}
                description={ui.moduleSecurityDesc}
                icon="🛡️"
                href="/security"
                color="#ef4444"
                lang={lang}
              />
              <ModuleCard
                title={ui.moduleComm}
                description={ui.moduleCommDesc}
                icon="💬"
                href="/communication"
                color="#06b6d4"
                lang={lang}
              />
              <ModuleCard
                title={ui.moduleFinance}
                description={ui.moduleFinanceDesc}
                icon="💰"
                href="/finance"
                color="#10b981"
                lang={lang}
              />
              <ModuleCard
                title={ui.moduleEmployee}
                description={ui.moduleEmployeeDesc}
                icon="👥"
                href="/employee"
                color="#ec4899"
                lang={lang}
              />
              <ModuleCard
                title={ui.moduleIntegrations}
                description={ui.moduleIntegrationsDesc}
                icon="🔌"
                href="/integrations"
                color="#8b5cf6"
                lang={lang}
              />
              <ModuleCard
                title={ui.moduleTwin}
                description={ui.moduleTwinDesc}
                icon="🪞"
                href="/digital-twin"
                color="#3b82f6"
                lang={lang}
              />
            </div>
          </div>
        </div>

        {/* Vertical Platforms Section */}
        <section style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 20,
          padding: 28,
          border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 32,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <div>
              <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                Industry Platforms
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                Specialized AI solutions for your industry
              </p>
            </div>
          </div>
          
          <div className="si-verticals-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {/* Universal Reform */}
            <a href={`/universal-reform${qsLang}`} style={{
              display: 'block',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(59,130,246,0.25)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}>🏛️</div>
                <div>
                  <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Universal Reform</div>
                  <div style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: 500 }}>GOVERNMENT INTELLIGENCE</div>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                AI-powered reform analysis, policy generation, and institutional optimization
              </p>
            </a>
            
            {/* Defense */}
            <a href={`/defense${qsLang}`} style={{
              display: 'block',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(239,68,68,0.25)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}>🛡️</div>
                <div>
                  <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Defense Intel</div>
                  <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 500 }}>MILITARY & SECURITY</div>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Threat analysis, intel fusion, and mission-critical decision support
              </p>
            </a>
            
            {/* Pharma */}
            <a href={`/pharma${qsLang}`} style={{
              display: 'block',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(16,185,129,0.25)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}>💊</div>
                <div>
                  <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Pharma Intel</div>
                  <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 500 }}>HEALTHCARE & LIFE SCIENCES</div>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Drug development, regulatory compliance, and clinical trial intelligence
              </p>
            </a>
            
            {/* Finance */}
            <a href={`/finance-platform${qsLang}`} style={{
              display: 'block',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(245,158,11,0.25)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: '10px',
                fontWeight: 700,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>NEW</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}>💰</div>
                <div>
                  <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Finance Intel</div>
                  <div style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 500 }}>BANKING & FINANCIAL SERVICES</div>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                AML/KYC compliance, fraud detection, and real-time risk management
              </p>
            </a>
            
            {/* Manufacturing */}
            <a href={`/manufacturing${qsLang}`} style={{
              display: 'block',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0.05) 100%)',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(6,182,212,0.25)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: '10px',
                fontWeight: 700,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>NEW</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}>🏭</div>
                <div>
                  <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Manufacturing Intel</div>
                  <div style={{ color: '#06b6d4', fontSize: '0.75rem', fontWeight: 500 }}>INDUSTRY 4.0 & SMART FACTORY</div>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Predictive maintenance, supply chain visibility, and quality control
              </p>
            </a>
            
            {/* Energy */}
            <a href={`/energy${qsLang}`} style={{
              display: 'block',
              background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(34,197,94,0.25)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: '10px',
                fontWeight: 700,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>NEW</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}>⚡</div>
                <div>
                  <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Energy Intel</div>
                  <div style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: 500 }}>UTILITIES & RENEWABLES</div>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Grid optimization, renewable integration, and sustainability analytics
              </p>
            </a>
            
            {/* Insurance */}
            <a href={`/insurance${qsLang}`} style={{
              display: 'block',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.05) 100%)',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(168,85,247,0.25)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'linear-gradient(135deg, #a855f7, #9333ea)',
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: '10px',
                fontWeight: 700,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>NEW</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #a855f7, #9333ea)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}>🛡️</div>
                <div>
                  <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Insurance Intel</div>
                  <div style={{ color: '#a855f7', fontSize: '0.75rem', fontWeight: 500 }}>CLAIMS & UNDERWRITING</div>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Automated claims processing, fraud detection, and risk assessment
              </p>
            </a>
            
            {/* Logistics */}
            <a href={`/logistics${qsLang}`} style={{
              display: 'block',
              background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.05) 100%)',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(249,115,22,0.25)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: '10px',
                fontWeight: 700,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>NEW</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                }}>🚚</div>
                <div>
                  <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Logistics Intel</div>
                  <div style={{ color: '#f97316', fontSize: '0.75rem', fontWeight: 500 }}>SUPPLY CHAIN & FLEET</div>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Route optimization, demand forecasting, and real-time tracking
              </p>
            </a>
          </div>
        </section>

        {/* Bottom Section - Recent Activity */}
        <section style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 20,
          padding: 28,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
              {ui.recentActivity}
            </h2>
            <a
              href={`/dashboard${qsLang}`}
              style={{
                color: '#3b82f6',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              {ui.viewAll} →
            </a>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {(profileSummary?.recentInsights || []).slice(0, 4).map((insight, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 12,
                borderLeft: `3px solid ${
                  insight.type === 'pattern' ? '#3b82f6' :
                  insight.type === 'skill_growth' ? '#10b981' : '#f59e0b'
                }`,
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${
                    insight.type === 'pattern' ? 'rgba(59,130,246,0.2)' :
                    insight.type === 'skill_growth' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {insight.type === 'pattern' ? '🔍' : insight.type === 'skill_growth' ? '📈' : '💡'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 500 }}>
                    {insight.description}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: 4 }}>
                    {insight.type} • {Math.round(insight.confidence * 100)}% confidence
                  </div>
                </div>
              </div>
            ))}
            
            {(!profileSummary?.recentInsights || profileSummary.recentInsights.length === 0) && (
              <div style={{
                textAlign: 'center',
                padding: 40,
                color: 'rgba(255,255,255,0.5)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>📭</div>
                <div>{ui.noActivity}</div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '20px 32px',
        marginTop: 40,
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.85rem',
        }}>
          <div>
            {ui.footerPowered} • {ui.footerVersion} {CORE_IDENTITY.version}
          </div>
          <div>
            © {new Date().getFullYear()} Sovereign Intelligence
          </div>
        </div>
      </footer>

      {/* Comprehensive Responsive Styles */}
      <style jsx global>{`
        /* Mobile Navigation */
        @media (max-width: 767px) {
          /* Mobile menu button */
          .mobile-menu-btn { display: block !important; }
          .nav-links-desktop { display: none !important; }
          
          .nav-label { display: none !important; }
          .si-brand-subtitle { display: none !important; }
          nav { padding: 10px 16px !important; }
          nav > div { gap: 8px !important; }
          main { padding: 16px !important; }
          section { padding: 20px !important; margin-bottom: 16px !important; }
          
          /* Hero responsive */
          .si-hero h1 { font-size: 1.5rem !important; }
          .si-hero p { font-size: 0.9rem !important; }
          .si-hero-actions { flex-direction: column !important; width: 100% !important; }
          .si-hero-actions a { width: 100% !important; justify-content: center !important; }
          
          /* Stats grid */
          .si-stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          
          /* Agent + Modules layout */
          .si-agent-modules { grid-template-columns: 1fr !important; gap: 16px !important; }
          .si-agent-card { order: 2 !important; }
          .si-modules-section { order: 1 !important; }
          .si-modules-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          
          /* Verticals grid */
          .si-verticals-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          
          /* Agent card */
          .si-agent-header { flex-direction: column !important; text-align: center !important; }
          .si-agent-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .si-agent-actions { flex-direction: column !important; }
          .si-agent-actions a { width: 100% !important; text-align: center !important; }
          
          /* Activity items */
          .si-activity-item { flex-direction: column !important; gap: 10px !important; align-items: flex-start !important; }
          
          /* Footer */
          footer > div { flex-direction: column !important; gap: 8px !important; text-align: center !important; }
        }
        
        /* Small mobile (< 480px) */
        @media (max-width: 479px) {
          .si-stats-grid { grid-template-columns: 1fr !important; }
          .si-modules-grid { grid-template-columns: 1fr !important; }
          .si-stat-value { font-size: 1.75rem !important; }
        }
        
        /* Tablet */
        @media (min-width: 768px) and (max-width: 1023px) {
          .nav-label { display: none !important; }
          main { padding: 24px !important; }
          .si-agent-modules { grid-template-columns: 1fr !important; }
          .si-modules-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        
        /* Desktop */
        @media (min-width: 1024px) {
          .nav-label { display: inline !important; }
          .mobile-menu-btn { display: none !important; }
        }
        
        /* Touch-friendly targets */
        @media (hover: none) and (pointer: coarse) {
          a, button { min-height: 44px; }
        }
        
        /* Animation for gradient (already defined, keep it) */
        @keyframes gradientMove {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(2%, 2%) rotate(1deg); }
          66% { transform: translate(-1%, 1%) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}
