'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

// ═══════════════════════════════════════════════════════════════════════════
// KNOWLEDGE MODULE - Full Dynamic Translation + Charts + CTA
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

// Knowledge stats chart
function KnowledgeStats({ data, colors }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  let offset = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        {data.map((item, i) => {
          const percentage = (item.value / total) * 100;
          const strokeDasharray = `${percentage} ${100 - percentage}`;
          const rotation = offset * 3.6 - 90;
          offset += percentage;
          return (
            <circle
              key={i}
              cx="50" cy="50" r="40"
              fill="none" stroke={colors[i]}
              strokeWidth="20" strokeDasharray={strokeDasharray}
              transform={`rotate(${rotation} 50 50)`}
              style={{ transition: 'stroke-dasharray 0.5s' }}
            />
          );
        })}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: colors[i] }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{item.label}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    
    // Search
    searchPlaceholder: 'Search knowledge base...',
    searchBtn: 'Search',
    
    // Stats
    totalArticles: 'Total Articles',
    recentUpdates: 'Recent Updates',
    aiPowered: 'AI-Powered Search',
    
    // Categories
    categoryDocuments: 'Documents',
    categoryKnowledgeBase: 'Knowledge Base',
    categoryCourses: 'Courses',
    categoryPolicies: 'Policies',
    
    // Knowledge items (fully translated)
    itemPolicyFramework: 'Policy Framework Guide',
    itemComplianceProc: 'Compliance Procedures',
    itemBestPractices: 'Best Practices Manual',
    itemTrainingRes: 'Training Resources',
    
    // Meta
    views: 'views',
    updated: 'Updated',
    
    // Knowledge breakdown
    breakdownTitle: 'Knowledge Breakdown',
    
    // Contact CTA
    ctaTitle: 'Need Custom Knowledge Solutions?',
    ctaDesc: 'Our team can help build your enterprise knowledge base.',
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
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_KNOWLEDGE_${verticalId || 'MAIN'}_V2` });
      if (m) setUi(t || BASE_UI);
    })();
    return () => { m = false; };
  }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

  const knowledgeItems = [
    { id: 1, title: ui.itemPolicyFramework, type: ui.categoryDocuments, updated: 'Dec 24, 2025', views: 245 },
    { id: 2, title: ui.itemComplianceProc, type: ui.categoryKnowledgeBase, updated: 'Dec 23, 2025', views: 189 },
    { id: 3, title: ui.itemBestPractices, type: ui.categoryDocuments, updated: 'Dec 22, 2025', views: 312 },
    { id: 4, title: ui.itemTrainingRes, type: ui.categoryCourses, updated: 'Dec 20, 2025', views: 567 },
  ];

  const breakdownData = [
    { label: ui.categoryDocuments, value: 523 },
    { label: ui.categoryKnowledgeBase, value: 412 },
    { label: ui.categoryCourses, value: 189 },
    { label: ui.categoryPolicies, value: 123 },
  ];

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
        {/* Search */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={ui.searchPlaceholder} style={{ flex: 1, padding: '14px 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.cardBorder}`, borderRadius: 10, color: '#fff', fontSize: '1rem', outline: 'none' }} />
            <button style={{ padding: '14px 28px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>🔍 {ui.searchBtn}</button>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 20 }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>📚 {ui.totalArticles}: 1,247</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>🔄 {ui.recentUpdates}: 23</span>
            <span style={{ color: theme.primary, fontSize: '0.85rem' }}>✨ {ui.aiPowered}</span>
          </div>
        </div>

        {/* Knowledge Breakdown Chart */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, marginBottom: 24 }}>
          <h3 style={{ color: '#fff', margin: '0 0 20px' }}>{ui.breakdownTitle}</h3>
          <KnowledgeStats 
            data={breakdownData} 
            colors={[theme.primary, theme.secondary || '#8b5cf6', '#10b981', '#f59e0b']} 
          />
        </div>

        {/* Knowledge Items */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
          {knowledgeItems.map(item => (
            <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: `1px solid ${theme.cardBorder}`, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.primary} onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.cardBorder}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ padding: '4px 10px', borderRadius: 6, background: `${theme.primary}20`, color: theme.primary, fontSize: '0.75rem' }}>{item.type}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{item.views} {ui.views}</span>
              </div>
              <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, margin: '0 0 8px' }}>{item.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>{ui.updated}: {item.updated}</p>
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
