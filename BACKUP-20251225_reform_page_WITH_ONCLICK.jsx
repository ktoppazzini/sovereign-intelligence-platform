'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getUiTranslations } from '@/lib/i18nClient';
import { COLORS, TYPOGRAPHY, COMPONENTS, PAGE_STYLES, HEADER_STYLES, KEYFRAMES, SHADOWS, RADIUS, TRANSITIONS } from '@/lib/designSystem';

const BASE_UI = {
  // Header
  logoText: 'Sovereign Intelligence',
  navDashboard: 'Dashboard',
  navReports: 'Reports',
  navAnalytics: 'Analytics',
  navSettings: 'Settings',
  
  // Hero
  badge: 'GOVERNMENT REFORM',
  title: 'Transform Government Operations',
  subtitle: 'AI-powered analysis for efficiency gains, waste reduction, and modernization recommendations across federal agencies.',
  ctaPrimary: 'Generate Analysis',
  ctaSecondary: 'View Demo',
  
  // Stats
  stat1Value: '$2.4T',
  stat1Label: 'Annual Budget Analyzed',
  stat2Value: '847',
  stat2Label: 'Agencies Covered',
  stat3Value: '$180B',
  stat3Label: 'Savings Identified',
  stat4Value: '99.9%',
  stat4Label: 'Accuracy Rate',
  
  // Features Section
  featuresTitle: 'Enterprise Capabilities',
  featuresSubtitle: 'Comprehensive tools for government modernization and efficiency analysis',
  
  feature1Title: 'Agency Analysis',
  feature1Desc: 'Deep-dive analysis of agency budgets, workforce, and operational metrics with AI-driven recommendations.',
  
  feature2Title: 'Waste Detection',
  feature2Desc: 'Automated identification of duplicate programs, inefficiencies, and cost reduction opportunities.',
  
  feature3Title: 'Modernization Roadmap',
  feature3Desc: 'Strategic recommendations for technology upgrades, process automation, and digital transformation.',
  
  feature4Title: 'Impact Forecasting',
  feature4Desc: 'Predictive modeling of reform outcomes, savings projections, and implementation timelines.',
  
  feature5Title: 'Compliance Tracking',
  feature5Desc: 'Monitor regulatory adherence, policy changes, and reform progress across agencies.',
  
  feature6Title: 'Executive Reports',
  feature6Desc: 'Board-ready presentations with visualizations, benchmarks, and actionable insights.',
  
  feature7Title: 'AI Business Partner',
  feature7Desc: 'Autonomous AI for project management, strategic consulting, coaching, and change management.',
  
  // CTA Section
  ctaTitle: 'Ready to Transform Government?',
  ctaSubtitle: 'Join leading agencies already using Sovereign Intelligence to drive reform.',
  ctaButton: 'Start Free Trial',
  ctaNote: 'No credit card required • 14-day trial • Full access',
  
  // Footer
  footerCopyright: '© 2025 Sovereign Intelligence. All rights reserved.',
  footerPrivacy: 'Privacy Policy',
  footerTerms: 'Terms of Service',
  footerContact: 'Contact',
};

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian', 'Pashto', 'Sindhi'];

export default function ReformVerticalPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lang = searchParams.get('lang') || 'English';
  const [ui, setUi] = useState(BASE_UI);
  const [loading, setLoading] = useState(true);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [hoveredStat, setHoveredStat] = useState(null);
  
  const isRTL = RTL_LANGUAGES.includes(lang);
  
  useEffect(() => {
    (async () => {
      const { t } = await getUiTranslations({
        base: BASE_UI,
        lang,
        cachePrefix: 'SI_REFORM_VERTICAL',
        setDir: true,
      });
      setUi(t || BASE_UI);
      setLoading(false);
    })();
  }, [lang]);
  
  const features = [
    { icon: '🤖', title: ui.feature7Title, desc: ui.feature7Desc, gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', href: '/reform/assistant', featured: true },
    { icon: '🏛️', title: ui.feature1Title, desc: ui.feature1Desc, gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' },
    { icon: '🔍', title: ui.feature2Title, desc: ui.feature2Desc, gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
    { icon: '🚀', title: ui.feature3Title, desc: ui.feature3Desc, gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
    { icon: '📊', title: ui.feature4Title, desc: ui.feature4Desc, gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    { icon: '✅', title: ui.feature5Title, desc: ui.feature5Desc, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
    { icon: '📋', title: ui.feature6Title, desc: ui.feature6Desc, gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' },
  ];
  
  const stats = [
    { value: ui.stat1Value, label: ui.stat1Label, icon: '💰' },
    { value: ui.stat2Value, label: ui.stat2Label, icon: '🏢' },
    { value: ui.stat3Value, label: ui.stat3Label, icon: '📈' },
    { value: ui.stat4Value, label: ui.stat4Label, icon: '✨' },
  ];
  
  return (
    <div style={{
      ...PAGE_STYLES.wrapper,
      direction: isRTL ? 'rtl' : 'ltr',
      fontFamily: TYPOGRAPHY.fontFamily,
    }}>
      {/* Inject keyframes */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES + `
        .feature-card:hover { transform: translateY(-8px) scale(1.02); }
        .stat-card:hover { transform: translateY(-5px); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5); }
        .nav-link:hover { color: #fff !important; }
      `}} />
      
      {/* Background Effects */}
      <div style={PAGE_STYLES.backgroundOrb1} />
      <div style={PAGE_STYLES.backgroundOrb2} />
      <div style={PAGE_STYLES.backgroundOrb3} />
      <div style={PAGE_STYLES.gridPattern} />
      
      {/* Premium Header */}
      <header style={HEADER_STYLES.container}>
        <div style={HEADER_STYLES.logo}>
          <img 
            src="/images/secure.png" 
            alt="Sovereign Intelligence" 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
            }}
          />
          <span style={HEADER_STYLES.logoText}>{ui.logoText}</span>
        </div>
        
        <nav style={HEADER_STYLES.nav}>
          <span className="nav-link" style={HEADER_STYLES.navLink} onClick={() => router.push(`/?lang=${lang}`)}>{ui.navDashboard}</span>
          <span className="nav-link" style={HEADER_STYLES.navLink} onClick={() => router.push(`/reports?lang=${lang}`)}>{ui.navReports}</span>
          <span className="nav-link" style={HEADER_STYLES.navLink} onClick={() => router.push(`/analytics?lang=${lang}`)}>{ui.navAnalytics}</span>
          <span className="nav-link" style={HEADER_STYLES.navLink} onClick={() => router.push(`/settings?lang=${lang}`)}>{ui.navSettings}</span>
          <button onClick={() => router.push(`/universal-industry-plan?lang=${lang}&vertical=government`)} style={{
            ...COMPONENTS.buttonPrimary,
            padding: '10px 20px',
            fontSize: '14px',
          }}>
            {ui.ctaPrimary}
          </button>
        </nav>
      </header>
      
      {/* Hero Section */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '100px 40px 80px',
        textAlign: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 20px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '100px',
          marginBottom: '32px',
          animation: 'fade-in 0.6s ease',
        }}>
          <span style={{ fontSize: '16px' }}>🏛️</span>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#3b82f6',
            letterSpacing: '0.1em',
          }}>{ui.badge}</span>
        </div>
        
        {/* Main Title */}
        <h1 style={{
          ...TYPOGRAPHY.h1,
          fontSize: 'clamp(36px, 6vw, 64px)',
          color: COLORS.textPrimary,
          marginBottom: '24px',
          animation: 'fade-in 0.6s ease 0.1s both',
          background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {ui.title}
        </h1>
        
        {/* Subtitle */}
        <p style={{
          ...TYPOGRAPHY.body,
          fontSize: '18px',
          color: COLORS.textSecondary,
          maxWidth: '700px',
          margin: '0 auto 48px',
          animation: 'fade-in 0.6s ease 0.2s both',
        }}>
          {ui.subtitle}
        </p>
        
        {/* CTA Buttons */}
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          animation: 'fade-in 0.6s ease 0.3s both',
        }}>
          <button className="btn-primary" onClick={() => router.push(`/universal-industry-plan?lang=${lang}&vertical=government`)} style={{
            ...COMPONENTS.buttonPrimary,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span>✨</span>
            {ui.ctaPrimary}
          </button>
          <button onClick={() => router.push(`/reform/assistant?lang=${lang}`)} style={{
            ...COMPONENTS.buttonSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span>▶️</span>
            {ui.ctaSecondary}
          </button>
        </div>
      </section>
      
      {/* Stats Section */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '0 40px 80px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
        }}>
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="stat-card"
              onMouseEnter={() => setHoveredStat(idx)}
              onMouseLeave={() => setHoveredStat(null)}
              style={{
                ...COMPONENTS.glassCard,
                padding: '32px',
                textAlign: 'center',
                transition: TRANSITIONS.normal,
                transform: hoveredStat === idx ? 'translateY(-5px)' : 'translateY(0)',
                animation: `fade-in 0.6s ease ${0.1 * idx}s both`,
              }}
            >
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                margin: '0 auto 20px',
                boxShadow: hoveredStat === idx ? '0 0 30px rgba(99, 102, 241, 0.3)' : 'none',
                transition: TRANSITIONS.normal,
              }}>
                {stat.icon}
              </div>
              <div style={{
                fontSize: '36px',
                fontWeight: 700,
                color: '#fff',
                marginBottom: '8px',
                letterSpacing: '-0.02em',
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '14px',
                color: COLORS.textSecondary,
                fontWeight: 500,
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* Features Section */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '80px 40px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{
            ...TYPOGRAPHY.h2,
            color: '#fff',
            marginBottom: '16px',
          }}>
            {ui.featuresTitle}
          </h2>
          <p style={{
            ...TYPOGRAPHY.body,
            color: COLORS.textSecondary,
            maxWidth: '600px',
            margin: '0 auto',
          }}>
            {ui.featuresSubtitle}
          </p>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
        }}>
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="feature-card"
              onMouseEnter={() => setHoveredFeature(idx)}
              onMouseLeave={() => setHoveredFeature(null)}
              onClick={() => {
                if (feature.href) {
                  router.push(`${feature.href}?lang=${lang}`);
                } else {
                  router.push(`/universal-industry-plan?lang=${lang}&vertical=government`);
                }
              }}
              style={{
                ...COMPONENTS.glassCard,
                padding: '36px',
                transition: TRANSITIONS.normal,
                transform: hoveredFeature === idx ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
                cursor: 'pointer',
                animation: `fade-in 0.6s ease ${0.05 * idx}s both`,
              }}
            >
              {/* Icon */}
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: feature.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '24px',
                boxShadow: hoveredFeature === idx 
                  ? `0 8px 25px ${feature.gradient.includes('#3b82f6') ? 'rgba(59, 130, 246, 0.4)' : 'rgba(99, 102, 241, 0.3)'}`
                  : '0 4px 15px rgba(0, 0, 0, 0.3)',
                transition: TRANSITIONS.normal,
              }}>
                {feature.icon}
              </div>
              
              {/* Title */}
              <h3 style={{
                ...TYPOGRAPHY.h4,
                color: '#fff',
                marginBottom: '12px',
              }}>
                {feature.title}
              </h3>
              
              {/* Description */}
              <p style={{
                ...TYPOGRAPHY.body,
                color: COLORS.textSecondary,
                margin: 0,
              }}>
                {feature.desc}
              </p>
              
              {/* Hover arrow */}
              <div style={{
                marginTop: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#6366f1',
                fontSize: '14px',
                fontWeight: 600,
                opacity: hoveredFeature === idx ? 1 : 0,
                transform: hoveredFeature === idx ? 'translateX(0)' : 'translateX(-10px)',
                transition: TRANSITIONS.normal,
              }}>
                Learn more
                <span style={{ fontSize: '18px' }}>→</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* Bottom CTA Section */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '80px 40px 100px',
        maxWidth: '1000px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div style={{
          ...COMPONENTS.glassCard,
          padding: '64px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
        }}>
          <h2 style={{
            ...TYPOGRAPHY.h2,
            color: '#fff',
            marginBottom: '16px',
          }}>
            {ui.ctaTitle}
          </h2>
          <p style={{
            ...TYPOGRAPHY.body,
            color: COLORS.textSecondary,
            marginBottom: '32px',
            maxWidth: '500px',
            margin: '0 auto 32px',
          }}>
            {ui.ctaSubtitle}
          </p>
          <button className="btn-primary" onClick={() => router.push(`/universal-industry-plan?lang=${lang}&vertical=government`)} style={{
            ...COMPONENTS.buttonPrimary,
            fontSize: '16px',
            padding: '18px 36px',
          }}>
            {ui.ctaButton}
          </button>
          <p style={{
            marginTop: '16px',
            fontSize: '13px',
            color: COLORS.textMuted,
          }}>
            {ui.ctaNote}
          </p>
        </div>
      </section>
      
      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        padding: '32px 40px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <span style={{ fontSize: '14px', color: COLORS.textMuted }}>
          {ui.footerCopyright}
        </span>
        <div style={{ display: 'flex', gap: '24px' }}>
          <span className="nav-link" style={{ ...HEADER_STYLES.navLink, fontSize: '13px' }}>{ui.footerPrivacy}</span>
          <span className="nav-link" style={{ ...HEADER_STYLES.navLink, fontSize: '13px' }}>{ui.footerTerms}</span>
          <span className="nav-link" style={{ ...HEADER_STYLES.navLink, fontSize: '13px' }}>{ui.footerContact}</span>
        </div>
      </footer>
    </div>
  );
}
