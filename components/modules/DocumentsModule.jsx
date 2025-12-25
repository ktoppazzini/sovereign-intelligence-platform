'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

export default function DocumentsModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.documents || { title: 'Documents', icon: '📄' };

  const BASE_UI = { pageTitle: moduleConfig.title, pageSubtitle: moduleConfig.desc || 'Document management and processing', backToHome: verticalId ? `Back to ${vertical?.name}` : 'Back to Home' };
  const [ui, setUi] = useState(BASE_UI);

  useEffect(() => { const sp = new URLSearchParams(window.location.search); setLang(sp.get('lang') || 'English'); }, []);
  useEffect(() => { let m = true; (async () => { setDir(RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr'); const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_DOCUMENTS_${verticalId || 'MAIN'}` }); if (m) setUi(t || BASE_UI); })(); return () => { m = false; }; }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

  const docs = [
    { name: 'Q4 Report.pdf', size: '2.4 MB', modified: 'Dec 24', type: 'PDF' },
    { name: 'Policy Draft v3.docx', size: '156 KB', modified: 'Dec 23', type: 'Word' },
    { name: 'Budget Analysis.xlsx', size: '890 KB', modified: 'Dec 22', type: 'Excel' },
    { name: 'Presentation.pptx', size: '5.2 MB', modified: 'Dec 20', type: 'PowerPoint' },
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
          <button style={{ padding: '14px 28px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>📤 Upload Document</button>
          <button style={{ padding: '14px 28px', background: 'rgba(255,255,255,0.1)', border: `1px solid ${theme.cardBorder}`, borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>📁 New Folder</button>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: `1px solid ${theme.cardBorder}` }}>
          {docs.map((doc, i) => (
            <div key={i} style={{ padding: 20, borderBottom: i < docs.length - 1 ? `1px solid ${theme.cardBorder}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${theme.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>📄</div>
                <div><div style={{ color: '#fff', fontWeight: 500 }}>{doc.name}</div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{doc.size} • {doc.type}</div></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{doc.modified}</span>
                <button style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>View</button>
              </div>
            </div>
          ))}
        </div>
      </main>
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
    </div>
  );
}
