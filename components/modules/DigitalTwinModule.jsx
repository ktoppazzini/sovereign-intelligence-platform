'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

export default function DigitalTwinModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.['digital-twin'] || { title: 'Digital Twin', icon: '🪞' };

  const BASE_UI = { pageTitle: moduleConfig.title, pageSubtitle: moduleConfig.desc || 'Simulation and scenario modeling', backToHome: verticalId ? `Back to ${vertical?.name}` : 'Back to Home' };
  const [ui, setUi] = useState(BASE_UI);

  useEffect(() => { const sp = new URLSearchParams(window.location.search); setLang(sp.get('lang') || 'English'); }, []);
  useEffect(() => { let m = true; (async () => { setDir(RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr'); const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_TWIN_${verticalId || 'MAIN'}` }); if (m) setUi(t || BASE_UI); })(); return () => { m = false; }; }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 32 }}>
          {[{ name: 'Policy Impact Simulation', status: 'Ready', scenarios: 12 }, { name: 'Budget Forecast Model', status: 'Running', scenarios: 8 }, { name: 'Risk Assessment Twin', status: 'Ready', scenarios: 15 }].map((twin, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <h3 style={{ color: '#fff', margin: 0 }}>{twin.name}</h3>
                <span style={{ padding: '4px 12px', borderRadius: 20, background: twin.status === 'Running' ? `${theme.primary}30` : 'rgba(16,185,129,0.2)', color: twin.status === 'Running' ? theme.primary : '#10b981', fontSize: '0.8rem' }}>{twin.status}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>{twin.scenarios} scenarios configured</div>
              <button style={{ width: '100%', padding: '12px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>{twin.status === 'Running' ? '⏸️ Pause' : '▶️ Run Simulation'}</button>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🪞</div>
          <h3 style={{ color: '#fff' }}>Create New Digital Twin</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 500, margin: '0 auto 20px' }}>Model complex scenarios, test policies, and predict outcomes using AI-powered simulation.</p>
          <button style={{ padding: '14px 32px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>+ New Twin Model</button>
        </div>
      </main>
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
    </div>
  );
}
