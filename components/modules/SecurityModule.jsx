'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

const THREATS = [
  { id: 1, name: 'Unauthorized Access Attempt', level: 'critical', source: 'External', time: '5 min ago' },
  { id: 2, name: 'Suspicious Login Pattern', level: 'high', source: 'Internal', time: '15 min ago' },
  { id: 3, name: 'Data Export Anomaly', level: 'medium', source: 'System', time: '1 hour ago' },
  { id: 4, name: 'Policy Violation', level: 'low', source: 'User', time: '2 hours ago' },
];

export default function SecurityModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.security || { title: 'Security', icon: '🔒' };

  const BASE_UI = {
    pageTitle: moduleConfig.title,
    pageSubtitle: moduleConfig.desc || 'Security monitoring and threat detection',
    threatLevel: 'Threat Level',
    activeThreats: 'Active Threats',
    securityScore: 'Security Score',
    runScan: 'Run Security Scan',
    backToHome: verticalId ? `Back to ${vertical?.name}` : 'Back to Home',
  };
  const [ui, setUi] = useState(BASE_UI);

  useEffect(() => { const sp = new URLSearchParams(window.location.search); setLang(sp.get('lang') || 'English'); }, []);
  useEffect(() => {
    let m = true;
    (async () => {
      setDir(RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr');
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_SECURITY_${verticalId || 'MAIN'}` });
      if (m) setUi(t || BASE_UI);
    })();
    return () => { m = false; };
  }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;
  const levelColors = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' };

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#10b981' }}>94%</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>{ui.securityScore}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#f59e0b' }}>LOW</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>{ui.threatLevel}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#ef4444' }}>4</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>{ui.activeThreats}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button style={{ padding: '14px 28px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>🔍 {ui.runScan}</button>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
          <h3 style={{ color: '#fff', margin: '0 0 20px' }}>Recent Threats</h3>
          {THREATS.map(t => (
            <div key={t.id} style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 10, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: levelColors[t.level] }} />
                <div>
                  <div style={{ color: '#fff', fontWeight: 500 }}>{t.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Source: {t.source}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ padding: '4px 10px', borderRadius: 6, background: `${levelColors[t.level]}20`, color: levelColors[t.level], fontSize: '0.8rem', textTransform: 'uppercase' }}>{t.level}</span>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 4 }}>{t.time}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
    </div>
  );
}
