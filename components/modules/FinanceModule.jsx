'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

export default function FinanceModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.finance || { title: 'Finance', icon: '💰' };

  const BASE_UI = { pageTitle: moduleConfig.title, pageSubtitle: moduleConfig.desc || 'Financial analytics and reporting', backToHome: verticalId ? `Back to ${vertical?.name}` : 'Back to Home' };
  const [ui, setUi] = useState(BASE_UI);

  useEffect(() => { const sp = new URLSearchParams(window.location.search); setLang(sp.get('lang') || 'English'); }, []);
  useEffect(() => { let m = true; (async () => { setDir(RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr'); const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_FINANCE_${verticalId || 'MAIN'}` }); if (m) setUi(t || BASE_UI); })(); return () => { m = false; }; }, [lang, verticalId]);

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
          {[{ label: 'Total Budget', value: '$12.5M', change: '+5%', color: '#10b981' }, { label: 'Spent YTD', value: '$8.2M', change: '66%', color: theme.primary }, { label: 'Remaining', value: '$4.3M', change: '34%', color: '#f59e0b' }, { label: 'Forecasted', value: '$11.8M', change: '-6%', color: '#8b5cf6' }].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ color: s.change.startsWith('+') || s.change.startsWith('-') ? (s.change.startsWith('+') ? '#10b981' : '#ef4444') : 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{s.change}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
          <h3 style={{ color: '#fff', margin: '0 0 20px' }}>Recent Transactions</h3>
          {[{ desc: 'Software License Renewal', amount: '-$45,000', date: 'Dec 24' }, { desc: 'Consulting Services', amount: '-$125,000', date: 'Dec 23' }, { desc: 'Budget Allocation Q1', amount: '+$2,500,000', date: 'Dec 20' }].map((t, i) => (
            <div key={i} style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 10, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              <div><div style={{ color: '#fff' }}>{t.desc}</div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{t.date}</div></div>
              <div style={{ color: t.amount.startsWith('+') ? '#10b981' : '#ef4444', fontWeight: 600 }}>{t.amount}</div>
            </div>
          ))}
        </div>
      </main>
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
    </div>
  );
}
