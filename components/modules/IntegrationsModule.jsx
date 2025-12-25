'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

export default function IntegrationsModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.integrations || { title: 'Integrations', icon: '🔗' };

  const BASE_UI = { pageTitle: moduleConfig.title, pageSubtitle: moduleConfig.desc || 'Connect external systems and APIs', backToHome: verticalId ? `Back to ${vertical?.name}` : 'Back to Home' };
  const [ui, setUi] = useState(BASE_UI);

  useEffect(() => { const sp = new URLSearchParams(window.location.search); setLang(sp.get('lang') || 'English'); }, []);
  useEffect(() => { let m = true; (async () => { setDir(RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr'); const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_INTEGRATIONS_${verticalId || 'MAIN'}` }); if (m) setUi(t || BASE_UI); })(); return () => { m = false; }; }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

  const integrations = [
    { name: 'Microsoft 365', status: 'Connected', lastSync: '5 min ago', icon: '📧' },
    { name: 'Salesforce', status: 'Connected', lastSync: '1 hour ago', icon: '☁️' },
    { name: 'SAP', status: 'Pending', lastSync: 'Never', icon: '🏢' },
    { name: 'Slack', status: 'Connected', lastSync: '2 min ago', icon: '💬' },
    { name: 'AWS', status: 'Connected', lastSync: '10 min ago', icon: '☁️' },
  ];

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
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button style={{ padding: '14px 28px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>+ Add Integration</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {integrations.map((int, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${theme.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{int.icon}</div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>{int.name}</div>
                  <span style={{ padding: '2px 10px', borderRadius: 10, background: int.status === 'Connected' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: int.status === 'Connected' ? '#10b981' : '#f59e0b', fontSize: '0.75rem' }}>{int.status}</span>
                </div>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: 16 }}>Last sync: {int.lastSync}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Configure</button>
                <button style={{ flex: 1, padding: '10px', background: int.status === 'Connected' ? 'rgba(16,185,129,0.2)' : `${theme.primary}30`, border: 'none', borderRadius: 8, color: int.status === 'Connected' ? '#10b981' : theme.primary, cursor: 'pointer' }}>{int.status === 'Connected' ? 'Sync' : 'Connect'}</button>
              </div>
            </div>
          ))}
        </div>
      </main>
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
    </div>
  );
}
