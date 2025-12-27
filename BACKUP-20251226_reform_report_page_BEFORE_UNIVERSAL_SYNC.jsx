'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { getUiTranslations, isRTL, normalizeLang } from '../../lib/i18nClient';
import { COLORS, TYPOGRAPHY, COMPONENTS, PAGE_STYLES, KEYFRAMES, TRANSITIONS } from '@/lib/designSystem';

const EnterpriseReportForm = dynamic(() => import('../../components/EnterpriseReportForm.client'), { ssr: false });

export const dynamic_config = 'force-dynamic';

const BASE_UI = {
  logoText: 'Sovereign Intelligence',
  backToVertical: '← Back to Reform',
  badge: 'GOVERNMENT REFORM',
  title: 'Government Reform Report',
  subtitle: 'AI-Powered Transformation Intelligence for Federal Agencies',
  complianceBadge: 'FISMA • FedRAMP • NIST 800-53 Compliant',
  printBtn: '🖨️ Print',
  exportBtn: '📤 Export',
  newReport: 'New Report',
  editReport: '✏️ Edit',
  saveEdits: '💾 Save',
  discardEdits: '✕ Discard',
  editModeHint: 'Edit Mode: Click any text to edit',
  stat1Value: '25,000+',
  stat1Label: 'Words Generated',
  stat2Value: '207',
  stat2Label: 'Languages',
  stat3Value: '$180B',
  stat3Label: 'Savings Identified',
  stat4Value: '99.9%',
  stat4Label: 'Accuracy',
};

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian', 'Pashto', 'Sindhi'];
const LANGUAGES = ['English','Spanish','French','German','Chinese','Japanese','Korean','Arabic','Portuguese','Russian','Italian','Dutch','Swedish','Norwegian','Danish','Finnish','Polish','Czech','Hungarian','Romanian','Hindi','Vietnamese','Thai','Indonesian','Malay','Turkish','Greek','Hebrew','Urdu','Persian'];

export default function ReformReportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlLangRaw = searchParams?.get('lang') || 'English';
  const initialLang = normalizeLang ? normalizeLang(urlLangRaw) : urlLangRaw;
  
  const [lang, setLang] = useState(initialLang);
  const [ui, setUi] = useState(BASE_UI);
  const [reportHtml, setReportHtml] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedHtml, setEditedHtml] = useState('');
  const [loading, setLoading] = useState(true);
  
  const isRTLLang = RTL_LANGUAGES.includes(lang);
  const dir = isRTLLang ? 'rtl' : 'ltr';

  useEffect(() => {
    if (initialLang && initialLang !== lang) {
      setLang(initialLang);
    }
  }, [initialLang]);

  useEffect(() => {
    (async () => {
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: 'SI_REFORM_REPORT', setDir: true });
      setUi(t || BASE_UI);
      setLoading(false);
    })();
  }, [lang]);

  useEffect(() => {
    document.documentElement.setAttribute('dir', isRTL(lang) ? 'rtl' : 'ltr');
  }, [lang]);

  const handleReportGenerated = (html) => { 
    setReportHtml(html); 
    setEditedHtml(html); 
    setShowReport(true); 
  };
  
  const handlePrint = () => window.print();
  
  const handleExport = () => {
    const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Government Reform Report</title><style>body{background:#0a1628;padding:40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e8eefb;}</style></head><body>${reportHtml}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `reform-report-${Date.now()}.html`; 
    a.click(); 
    URL.revokeObjectURL(url);
  };
  
  const handleNewReport = () => { 
    setReportHtml(''); 
    setEditedHtml(''); 
    setShowReport(false); 
    setEditMode(false); 
  };
  
  const handleEdit = () => setEditMode(true);
  const handleSave = () => { setReportHtml(editedHtml); setEditMode(false); };
  const handleDiscard = () => { setEditedHtml(reportHtml); setEditMode(false); };

  const stats = [
    { value: ui.stat1Value, label: ui.stat1Label, icon: '📝' },
    { value: ui.stat2Value, label: ui.stat2Label, icon: '🌍' },
    { value: ui.stat3Value, label: ui.stat3Label, icon: '💰' },
    { value: ui.stat4Value, label: ui.stat4Label, icon: '✨' },
  ];

  return (
    <div style={{
      ...PAGE_STYLES.wrapper,
      direction: dir,
      fontFamily: TYPOGRAPHY.fontFamily,
      minHeight: '100vh',
    }}>
      {/* Inject keyframes */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES + `
        .btn-action:hover { transform: translateY(-2px); }
        .stat-card:hover { transform: translateY(-3px); }
        .report-container { transition: all 0.3s ease; }
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(16, 185, 129, 0.5); }
          50% { border-color: rgba(16, 185, 129, 0.9); }
        }
      `}} />
      
      {/* Background Effects */}
      <div style={PAGE_STYLES.backgroundOrb1} />
      <div style={PAGE_STYLES.backgroundOrb2} />
      <div style={PAGE_STYLES.backgroundOrb3} />
      <div style={PAGE_STYLES.gridPattern} />
      
      {/* Header */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div 
            onClick={() => router.push(`/?lang=${lang}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <img 
              src="/images/secure.png" 
              alt="Sovereign Intelligence" 
              style={{ width: '40px', height: '40px', borderRadius: '10px' }}
            />
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{ui.logoText}</span>
          </div>
          
          <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)' }} />
          
          <button 
            onClick={() => router.push(`/verticals/reform?lang=${lang}`)}
            style={{
              background: 'transparent',
              border: 'none',
              color: COLORS.textSecondary,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {ui.backToVertical}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Language Selector */}
          <select 
            value={lang} 
            onChange={e => setLang(e.target.value)} 
            style={{ 
              padding: '10px 16px', 
              borderRadius: '10px', 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {LANGUAGES.map(l => (
              <option key={l} value={l} style={{ background: '#1a2d4a', color: '#fff' }}>{l}</option>
            ))}
          </select>
          
          {/* Report Actions */}
          {showReport && (
            <>
              <button 
                onClick={handleNewReport} 
                className="btn-action"
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '10px', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: TRANSITIONS.fast,
                }}
              >
                {ui.newReport}
              </button>
              
              {!editMode ? (
                <button 
                  onClick={handleEdit} 
                  className="btn-action"
                  style={{ 
                    padding: '10px 20px', 
                    borderRadius: '10px', 
                    background: 'rgba(139, 92, 246, 0.15)', 
                    border: '1px solid rgba(139, 92, 246, 0.3)', 
                    color: '#8b5cf6', 
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: TRANSITIONS.fast,
                  }}
                >
                  {ui.editReport}
                </button>
              ) : (
                <>
                  <span style={{ color: '#f59e0b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📝 {ui.editModeHint}
                  </span>
                  <button 
                    onClick={handleSave} 
                    className="btn-action"
                    style={{ 
                      padding: '10px 20px', 
                      borderRadius: '10px', 
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                      border: 'none', 
                      color: '#fff', 
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      transition: TRANSITIONS.fast,
                    }}
                  >
                    {ui.saveEdits}
                  </button>
                  <button 
                    onClick={handleDiscard} 
                    className="btn-action"
                    style={{ 
                      padding: '10px 20px', 
                      borderRadius: '10px', 
                      background: 'rgba(239, 68, 68, 0.15)', 
                      border: '1px solid rgba(239, 68, 68, 0.3)', 
                      color: '#ef4444', 
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: TRANSITIONS.fast,
                    }}
                  >
                    {ui.discardEdits}
                  </button>
                </>
              )}
              
              <button 
                onClick={handlePrint} 
                className="btn-action"
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '10px', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: TRANSITIONS.fast,
                }}
              >
                {ui.printBtn}
              </button>
              
              <button 
                onClick={handleExport} 
                className="btn-action"
                style={{ 
                  ...COMPONENTS.buttonPrimary,
                  padding: '10px 24px',
                  fontSize: '14px',
                }}
              >
                {ui.exportBtn}
              </button>
            </>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main style={{
        position: 'relative',
        zIndex: 1,
        padding: '40px',
        maxWidth: '1600px',
        margin: '0 auto',
      }}>
        {/* Hero Section - Only show when form is visible */}
        {!showReport && (
          <>
            {/* Compliance Badge */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px',
              animation: 'fade-in 0.6s ease',
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 20px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '100px',
              }}>
                <span style={{ fontSize: '14px' }}>🛡️</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#3b82f6',
                  letterSpacing: '0.05em',
                }}>{ui.complianceBadge}</span>
              </div>
            </div>
            
            {/* Badge */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '16px',
              animation: 'fade-in 0.6s ease 0.1s both',
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 20px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '100px',
              }}>
                <span style={{ fontSize: '16px' }}>🏛️</span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#6366f1',
                  letterSpacing: '0.1em',
                }}>{ui.badge}</span>
              </div>
            </div>
            
            {/* Title */}
            <h1 style={{
              ...TYPOGRAPHY.h1,
              fontSize: 'clamp(32px, 5vw, 48px)',
              textAlign: 'center',
              marginBottom: '16px',
              background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'fade-in 0.6s ease 0.2s both',
            }}>
              {ui.title}
            </h1>
            
            <p style={{
              ...TYPOGRAPHY.body,
              fontSize: '18px',
              color: COLORS.textSecondary,
              textAlign: 'center',
              maxWidth: '600px',
              margin: '0 auto 40px',
              animation: 'fade-in 0.6s ease 0.3s both',
            }}>
              {ui.subtitle}
            </p>
            
            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              maxWidth: '800px',
              margin: '0 auto 48px',
              animation: 'fade-in 0.6s ease 0.4s both',
            }}>
              {stats.map((stat, idx) => (
                <div 
                  key={idx}
                  className="stat-card"
                  style={{
                    ...COMPONENTS.glassCard,
                    padding: '20px',
                    textAlign: 'center',
                    transition: TRANSITIONS.normal,
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    color: '#fff',
                    marginBottom: '4px',
                  }}>{stat.value}</div>
                  <div style={{
                    fontSize: '12px',
                    color: COLORS.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
        
        {/* Form and Report Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: showReport ? '450px 1fr' : '1fr', 
          gap: '32px',
          animation: 'fade-in 0.6s ease 0.5s both',
        }}>
          {/* Form Container */}
          <div style={{ 
            maxHeight: showReport ? 'calc(100vh - 200px)' : 'none', 
            overflowY: showReport ? 'auto' : 'visible',
            ...COMPONENTS.glassCard,
            padding: '32px',
            background: showReport ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.02)',
          }}>
            <EnterpriseReportForm 
              verticalId="reform" 
              lang={lang} 
              ui={ui} 
              onReportGenerated={handleReportGenerated}
            />
          </div>
          
          {/* Report Preview */}
          {showReport && (
            <div 
              className="report-container"
              style={{ 
                ...COMPONENTS.glassCard,
                padding: '40px', 
                border: editMode ? '2px solid #10b981' : '1px solid rgba(99, 102, 241, 0.15)',
                animation: editMode ? 'pulse-border 2s ease-in-out infinite' : 'none',
                overflowY: 'auto', 
                maxHeight: 'calc(100vh - 200px)',
                background: 'rgba(0, 0, 0, 0.4)',
              }}
            >
              {/* Report Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}>
                <h2 style={{
                  ...TYPOGRAPHY.h3,
                  color: '#fff',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  📄 Generated Report
                </h2>
                {editMode && (
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    ✏️ Editing
                  </span>
                )}
              </div>
              
              {/* Report Content */}
              {editMode ? (
                <div 
                  contentEditable 
                  suppressContentEditableWarning 
                  onBlur={(e) => setEditedHtml(e.currentTarget.innerHTML)} 
                  dangerouslySetInnerHTML={{ __html: editedHtml }} 
                  style={{ outline: 'none', minHeight: '400px', cursor: 'text' }} 
                />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: reportHtml }} />
              )}
            </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        padding: '24px 40px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        textAlign: 'center',
        marginTop: '40px',
      }}>
        <p style={{ fontSize: '13px', color: COLORS.textMuted }}>
          © 2025 Sovereign Intelligence. All rights reserved. • {ui.complianceBadge}
        </p>
      </footer>
    </div>
  );
}
