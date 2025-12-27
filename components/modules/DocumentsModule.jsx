'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTS MODULE - Full Dynamic Translation + Charts + CTA
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

// Storage usage chart
function StorageChart({ used, total, color }) {
  const percentage = (used / total) * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{used} GB / {total} GB</span>
        <span style={{ color: color, fontSize: '0.85rem', fontWeight: 600 }}>{Math.round(percentage)}%</span>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${percentage}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}80)`, borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

// File type breakdown
function FileTypeChart({ data, colors }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {data.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: `${colors[i]}15`, borderRadius: 8 }}>
          <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{item.count}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DocumentsModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.documents || { title: 'Documents', icon: '📄' };

  const BASE_UI = {
    pageTitle: moduleConfig.title,
    pageSubtitle: moduleConfig.desc || 'Document management and processing',
    
    // Buttons
    uploadDocument: 'Upload Document',
    newFolder: 'New Folder',
    viewBtn: 'View',
    
    // Stats
    storageUsed: 'Storage Used',
    fileTypes: 'File Types',
    
    // Document items (fully translated)
    docQ4Report: 'Q4 Report.pdf',
    docPolicyDraft: 'Policy Draft v3.docx',
    docBudgetAnalysis: 'Budget Analysis.xlsx',
    docPresentation: 'Presentation.pptx',
    
    // File types
    typePdf: 'PDF',
    typeWord: 'Word',
    typeExcel: 'Excel',
    typePowerPoint: 'PowerPoint',
    
    // Meta
    modified: 'Modified',
    
    // Contact CTA
    ctaTitle: 'Need Enterprise Document Management?',
    ctaDesc: 'Secure, AI-powered document processing for your organization.',
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
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_DOCUMENTS_${verticalId || 'MAIN'}_V2` }); 
      if (m) setUi(t || BASE_UI); 
    })(); 
    return () => { m = false; }; 
  }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

  const docs = [
    { name: ui.docQ4Report, size: '2.4 MB', modified: 'Dec 24', type: ui.typePdf },
    { name: ui.docPolicyDraft, size: '156 KB', modified: 'Dec 23', type: ui.typeWord },
    { name: ui.docBudgetAnalysis, size: '890 KB', modified: 'Dec 22', type: ui.typeExcel },
    { name: ui.docPresentation, size: '5.2 MB', modified: 'Dec 20', type: ui.typePowerPoint },
  ];

  const fileTypeData = [
    { icon: '📕', label: ui.typePdf, count: 234 },
    { icon: '📘', label: ui.typeWord, count: 156 },
    { icon: '📗', label: ui.typeExcel, count: 89 },
    { icon: '📙', label: ui.typePowerPoint, count: 45 },
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
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
            <h3 style={{ color: '#fff', margin: '0 0 16px' }}>{ui.storageUsed}</h3>
            <StorageChart used={45.2} total={100} color={theme.primary} />
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
            <h3 style={{ color: '#fff', margin: '0 0 16px' }}>{ui.fileTypes}</h3>
            <FileTypeChart data={fileTypeData} colors={['#ef4444', '#3b82f6', '#10b981', '#f59e0b']} />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button style={{ padding: '14px 28px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>📤 {ui.uploadDocument}</button>
          <button style={{ padding: '14px 28px', background: 'rgba(255,255,255,0.1)', border: `1px solid ${theme.cardBorder}`, borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>📁 {ui.newFolder}</button>
        </div>

        {/* Document List */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: `1px solid ${theme.cardBorder}`, marginBottom: 24 }}>
          {docs.map((doc, i) => (
            <div key={i} style={{ padding: 20, borderBottom: i < docs.length - 1 ? `1px solid ${theme.cardBorder}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${theme.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>📄</div>
                <div><div style={{ color: '#fff', fontWeight: 500 }}>{doc.name}</div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{doc.size} • {doc.type}</div></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{ui.modified}: {doc.modified}</span>
                <button style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>{ui.viewBtn}</button>
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
