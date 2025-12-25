'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

const KNOWLEDGE_ITEMS = [
  { id: 1, title: 'Policy Framework Guide', type: 'Document', updated: 'Dec 24, 2025', views: 245 },
  { id: 2, title: 'Compliance Procedures', type: 'Knowledge Base', updated: 'Dec 23, 2025', views: 189 },
  { id: 3, title: 'Best Practices Manual', type: 'Document', updated: 'Dec 22, 2025', views: 312 },
  { id: 4, title: 'Training Resources', type: 'Course', updated: 'Dec 20, 2025', views: 567 },
];

export default function KnowledgeModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  const [searchQuery, setSearchQuery] = useState('');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.knowledge || { title: 'Knowledge Base', icon: '🧠' };

  const BASE_UI = {
    pageTitle: moduleConfig.title,
    pageSubtitle: moduleConfig.desc || 'Organizational knowledge and documentation',
    searchPlaceholder: 'Search knowledge base...',
    totalArticles: 'Total Articles',
    recentUpdates: 'Recent Updates',
    aiPowered: 'AI-Powered Search',
    backToHome: verticalId ? `Back to ${vertical?.name}` : 'Back to Home',
  };
  const [ui, setUi] = useState(BASE_UI);

  useEffect(() => { const sp = new URLSearchParams(window.location.search); setLang(sp.get('lang') || 'English'); }, []);
  useEffect(() => {
    let m = true;
    (async () => {
      setDir(RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr');
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_KNOWLEDGE_${verticalId || 'MAIN'}` });
      if (m) setUi(t || BASE_UI);
    })();
    return () => { m = false; };
  }, [lang, verticalId]);

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
            <div>
              <h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{moduleConfig.icon} {ui.pageTitle}</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>{ui.pageSubtitle}</p>
            </div>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 32 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={ui.searchPlaceholder} style={{ flex: 1, padding: '14px 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.cardBorder}`, borderRadius: 10, color: '#fff', fontSize: '1rem', outline: 'none' }} />
            <button style={{ padding: '14px 28px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>🔍 Search</button>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 20 }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>📚 {ui.totalArticles}: 1,247</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>🔄 {ui.recentUpdates}: 23</span>
            <span style={{ color: theme.primary, fontSize: '0.85rem' }}>✨ {ui.aiPowered}</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {KNOWLEDGE_ITEMS.map(item => (
            <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: `1px solid ${theme.cardBorder}`, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.primary} onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.cardBorder}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ padding: '4px 10px', borderRadius: 6, background: `${theme.primary}20`, color: theme.primary, fontSize: '0.75rem' }}>{item.type}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{item.views} views</span>
              </div>
              <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, margin: '0 0 8px' }}>{item.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>Updated: {item.updated}</p>
            </div>
          ))}
        </div>
      </main>
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
    </div>
  );
}
