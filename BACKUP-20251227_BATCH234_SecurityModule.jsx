'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { loadModuleTranslations } from '../../lib/dynamicTranslation';
import { getVerticalConfig } from '../../lib/verticalConfig';

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY MODULE - Full Dynamic Translation + Charts + CTA
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

// Threat level gauge component
function ThreatGauge({ level, color }) {
  const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const levelIndex = levels.indexOf(level);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {levels.map((l, i) => (
        <div key={l} style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          background: i <= levelIndex ? color : 'rgba(255,255,255,0.1)',
          transition: 'background 0.3s',
        }} />
      ))}
    </div>
  );
}

// Mini area chart for threat timeline
function ThreatTimeline({ data, color }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1,
          height: `${(v / max) * 100}%`,
          background: `linear-gradient(180deg, ${color}, ${color}30)`,
          borderRadius: 2,
          minHeight: 4,
        }} />
      ))}
    </div>
  );
}

export default function SecurityModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.security || { title: 'Security', icon: '🔒' };

  const BASE_UI = {
    pageTitle: moduleConfig.title,
    pageSubtitle: moduleConfig.desc || 'Security monitoring and threat detection',
    
    // Stats
    threatLevel: 'Threat Level',
    activeThreats: 'Active Threats',
    securityScore: 'Security Score',
    blockedAttacks: 'Blocked Attacks',
    
    // Buttons
    runScan: 'Run Security Scan',
    viewAllThreats: 'View All Threats',
    exportReport: 'Export Report',
    
    // Section titles
    recentThreats: 'Recent Threats',
    threatTimeline: 'Threat Timeline (24h)',
    securityMetrics: 'Security Metrics',
    
    // Threat items (fully translated)
    threatUnauthorized: 'Unauthorized Access Attempt',
    threatSuspiciousLogin: 'Suspicious Login Pattern',
    threatDataExport: 'Data Export Anomaly',
    threatPolicyViolation: 'Policy Violation',
    
    // Threat levels
    levelCritical: 'critical',
    levelHigh: 'high',
    levelMedium: 'medium',
    levelLow: 'low',
    
    // Sources
    sourceExternal: 'External',
    sourceInternal: 'Internal',
    sourceSystem: 'System',
    sourceUser: 'User',
    sourceLabel: 'Source',
    
    // Time
    time5min: '5 min ago',
    time15min: '15 min ago',
    time1hr: '1 hour ago',
    time2hr: '2 hours ago',
    
    // Contact CTA
    ctaTitle: 'Need Security Consultation?',
    ctaDesc: 'Our security experts can help protect your enterprise.',
    ctaScheduleDemo: 'Schedule Demo',
    ctaContactSales: 'Contact Sales',
    
    backToHome: verticalId ? `Back to ${vertical?.name}` : 'Back to Home',
  };
  
  const [ui, setUi] = useState(BASE_UI);

  useEffect(() => { const sp = new URLSearchParams(window.location.search); setLang(sp.get('lang') || 'English'); }, []);
  useEffect(() => {
    let m = true;
    (async () => {
      setDir(RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr');
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_SECURITY_${verticalId || 'MAIN'}_V2` });
      if (m) setUi(t || BASE_UI);
    })();
    return () => { m = false; };
  }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;
  
  const levelColors = { 
    [ui.levelCritical]: '#ef4444', 
    [ui.levelHigh]: '#f59e0b', 
    [ui.levelMedium]: '#3b82f6', 
    [ui.levelLow]: '#10b981' 
  };

  const threats = [
    { id: 1, name: ui.threatUnauthorized, level: ui.levelCritical, source: ui.sourceExternal, time: ui.time5min },
    { id: 2, name: ui.threatSuspiciousLogin, level: ui.levelHigh, source: ui.sourceInternal, time: ui.time15min },
    { id: 3, name: ui.threatDataExport, level: ui.levelMedium, source: ui.sourceSystem, time: ui.time1hr },
    { id: 4, name: ui.threatPolicyViolation, level: ui.levelLow, source: ui.sourceUser, time: ui.time2hr },
  ];

  const timelineData = [3, 5, 2, 8, 4, 6, 3, 9, 5, 4, 2, 7, 6, 4, 5, 3, 8, 6, 4, 7, 5, 3, 6, 4];

  return (
    <div style={{ minHeight: '100vh', background: theme.gradient, direction: dir }}>
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
      
      <header style={{ background: 'rgba(0,0,0,0.3)', borderBottom: `1px solid ${theme.cardBorder}`, padding: '20px 32px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <a href={homeLink} style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.85rem' }}>← {ui.backToHome}</a>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            {vertical && <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>{vertical.icon}</div>}
            <div>
              <h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{moduleConfig.icon} {ui.pageTitle}</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>{ui.pageSubtitle}</p>
            </div>
          </div>
        </div>
      </header>
      
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 32 }}>
        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: 12 }}>{ui.securityScore}</div>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#10b981' }}>94%</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: 12 }}>{ui.threatLevel}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', marginBottom: 8 }}>LOW</div>
            <ThreatGauge level="LOW" color="#f59e0b" />
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: 12 }}>{ui.activeThreats}</div>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#ef4444' }}>4</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: 12 }}>{ui.blockedAttacks}</div>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: theme.primary }}>1,247</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <button style={{ padding: '14px 28px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>🔍 {ui.runScan}</button>
          <button style={{ padding: '14px 28px', background: 'rgba(255,255,255,0.1)', border: `1px solid ${theme.cardBorder}`, borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>{ui.viewAllThreats}</button>
          <button style={{ padding: '14px 28px', background: 'rgba(255,255,255,0.1)', border: `1px solid ${theme.cardBorder}`, borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>📊 {ui.exportReport}</button>
        </div>

        {/* Threat Timeline */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, marginBottom: 24 }}>
          <h3 style={{ color: '#fff', margin: '0 0 20px' }}>{ui.threatTimeline}</h3>
          <ThreatTimeline data={timelineData} color={theme.primary} />
        </div>

        {/* Recent Threats */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, marginBottom: 24 }}>
          <h3 style={{ color: '#fff', margin: '0 0 20px' }}>{ui.recentThreats}</h3>
          {threats.map(t => (
            <div key={t.id} style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 10, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: levelColors[t.level] || '#6b7280' }} />
                <div>
                  <div style={{ color: '#fff', fontWeight: 500 }}>{t.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{ui.sourceLabel}: {t.source}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ padding: '4px 10px', borderRadius: 6, background: `${levelColors[t.level] || '#6b7280'}20`, color: levelColors[t.level] || '#6b7280', fontSize: '0.8rem', textTransform: 'uppercase' }}>{t.level}</span>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 4 }}>{t.time}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div style={{
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
      
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
    </div>
  );
}
