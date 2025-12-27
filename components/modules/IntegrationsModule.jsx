'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATIONS MODULE - Full Dynamic Translation + Charts + CTA
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

// Integration health chart
function IntegrationHealth({ connected, pending, total }) {
  const connectedPercent = (connected / total) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 60, height: 60 }}>
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="12"
            strokeDasharray={`${connectedPercent * 2.51} 251`}
            transform="rotate(-90 50 50)"
            strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{connected}</div>
      </div>
      <div>
        <div style={{ color: '#10b981', fontSize: '0.85rem' }}>{connected} Connected</div>
        <div style={{ color: '#f59e0b', fontSize: '0.85rem' }}>{pending} Pending</div>
      </div>
    </div>
  );
}

export default function IntegrationsModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.integrations || { title: 'Integrations', icon: '🔗' };

  const BASE_UI = {
    pageTitle: moduleConfig.title,
    pageSubtitle: moduleConfig.desc || 'Connect external systems and APIs',
    
    // Buttons
    addIntegration: 'Add Integration',
    configureBtn: 'Configure',
    syncBtn: 'Sync',
    connectBtn: 'Connect',
    
    // Integration items (fully translated)
    intMicrosoft: 'Microsoft 365',
    intSalesforce: 'Salesforce',
    intSap: 'SAP',
    intSlack: 'Slack',
    intAws: 'AWS',
    
    // Statuses
    statusConnected: 'Connected',
    statusPending: 'Pending',
    
    // Meta
    lastSync: 'Last sync',
    never: 'Never',
    minAgo: 'min ago',
    hourAgo: 'hour ago',
    
    // Chart
    integrationHealth: 'Integration Health',
    
    // Contact CTA
    ctaTitle: 'Need Custom Integrations?',
    ctaDesc: 'Our team can build custom connectors for your systems.',
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
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_INTEGRATIONS_${verticalId || 'MAIN'}_V2` }); 
      if (m) setUi(t || BASE_UI); 
    })(); 
    return () => { m = false; }; 
  }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

  const integrations = [
    { name: ui.intMicrosoft, status: ui.statusConnected, lastSync: `5 ${ui.minAgo}`, icon: '📧' },
    { name: ui.intSalesforce, status: ui.statusConnected, lastSync: `1 ${ui.hourAgo}`, icon: '☁️' },
    { name: ui.intSap, status: ui.statusPending, lastSync: ui.never, icon: '🏢' },
    { name: ui.intSlack, status: ui.statusConnected, lastSync: `2 ${ui.minAgo}`, icon: '💬' },
    { name: ui.intAws, status: ui.statusConnected, lastSync: `10 ${ui.minAgo}`, icon: '☁️' },
  ];

  const connectedCount = integrations.filter(i => i.status === ui.statusConnected).length;
  const pendingCount = integrations.filter(i => i.status === ui.statusPending).length;

  return (
    <div style={{ minHeight: '100vh', background: theme.gradient, direction: dir }}>
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
      
      <header style={{ background: 'rgba(0,0,0,0.3)', borderBottom: `1px solid ${theme.cardBorder}`, padding: '20px 32px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <a href={homeLink} style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.85rem' }}>← {ui.backToHome}</a>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            {vertical && <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>{vertical.icon}</div>}
            <div><h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{moduleConfig.icon} {ui.pageTitle}</h1><p style={{ color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>{ui.pageSubtitle}</p></div>
          </div>
        </div>
      </header>
      
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 32 }}>
        {/* Integration Health */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, marginBottom: 24 }}>
          <h3 style={{ color: '#fff', margin: '0 0 16px' }}>{ui.integrationHealth}</h3>
          <IntegrationHealth connected={connectedCount} pending={pendingCount} total={integrations.length} />
        </div>

        {/* Add Button */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button style={{ padding: '14px 28px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>+ {ui.addIntegration}</button>
        </div>

        {/* Integrations Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
          {integrations.map((int, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${theme.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{int.icon}</div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>{int.name}</div>
                  <span style={{ padding: '2px 10px', borderRadius: 10, background: int.status === ui.statusConnected ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: int.status === ui.statusConnected ? '#10b981' : '#f59e0b', fontSize: '0.75rem' }}>{int.status}</span>
                </div>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: 16 }}>{ui.lastSync}: {int.lastSync}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>{ui.configureBtn}</button>
                <button style={{ flex: 1, padding: '10px', background: int.status === ui.statusConnected ? 'rgba(16,185,129,0.2)' : `${theme.primary}30`, border: 'none', borderRadius: 8, color: int.status === ui.statusConnected ? '#10b981' : theme.primary, cursor: 'pointer' }}>{int.status === ui.statusConnected ? ui.syncBtn : ui.connectBtn}</button>
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
            <a href={`/contact${qsLang}`} style={{ padding: '14px 32px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, textDecoration: 'none' }}>📅 {ui.ctaScheduleDemo}</a>
            <a href={`/contact${qsLang}`} style={{ padding: '14px 32px', background: 'rgba(255,255,255,0.1)', border: `1px solid ${theme.cardBorder}`, borderRadius: 10, color: '#fff', fontWeight: 600, textDecoration: 'none' }}>📧 {ui.ctaContactSales}</a>
          </div>
        </div>
      </main>
      
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
    </div>
  );
}
