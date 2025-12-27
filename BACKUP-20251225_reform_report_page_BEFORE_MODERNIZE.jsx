'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { getUiTranslations, isRTL, normalizeLang } from '../../lib/i18nClient';
import NonHomeShell from '@/components/NonHomeShell.client';

const EnterpriseReportForm = dynamic(() => import('../../components/EnterpriseReportForm.client'), { ssr: false });

export const dynamic_config = 'force-dynamic';

const BASE_UI = {
  title: 'Government Reform Report',
  subtitle: 'AI-Powered Transformation Intelligence',
  printBtn: '🖨️ Print',
  exportBtn: '📤 Export',
  newReport: 'New Report',
  editReport: 'Edit',
  saveEdits: 'Save',
  discardEdits: 'Discard',
  editModeHint: 'Edit Mode: Click any text to edit',
  complianceBadge: 'FISMA • FedRAMP • NIST 800-53 Compliant',
};

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];
const LANGUAGES = ['English','Spanish','French','German','Chinese','Japanese','Korean','Arabic','Portuguese','Russian','Italian','Dutch','Swedish','Norwegian','Danish','Finnish','Polish','Czech','Hungarian','Romanian'];

export default function ReformReportPage() {
  const searchParams = useSearchParams();
  const urlLangRaw = searchParams?.get('lang') || 'English';
  const initialLang = normalizeLang ? normalizeLang(urlLangRaw) : urlLangRaw;
  
  const [lang, setLang] = useState(initialLang);
  const [ui, setUi] = useState(BASE_UI);
  const [reportHtml, setReportHtml] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedHtml, setEditedHtml] = useState('');
  const dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';

  useEffect(() => {
    if (initialLang && initialLang !== lang) {
      setLang(initialLang);
    }
  }, [initialLang]);

  useEffect(() => {
    (async () => {
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: 'SI_REFORM', setDir: true });
      setUi(t || BASE_UI);
    })();
  }, [lang]);

  useEffect(() => {
    document.documentElement.setAttribute('dir', isRTL(lang) ? 'rtl' : 'ltr');
  }, [lang]);

  const handleReportGenerated = (html) => { setReportHtml(html); setEditedHtml(html); setShowReport(true); };
  const handlePrint = () => window.print();
  const handleExport = () => {
    const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Government Reform Report</title><style>body{background:#0a1628;padding:40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e8eefb;}</style></head><body>${reportHtml}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `reform-report-${Date.now()}.html`; a.click(); URL.revokeObjectURL(url);
  };
  const handleNewReport = () => { setReportHtml(''); setEditedHtml(''); setShowReport(false); setEditMode(false); };
  const handleEdit = () => setEditMode(true);
  const handleSave = () => { setReportHtml(editedHtml); setEditMode(false); };
  const handleDiscard = () => { setEditedHtml(reportHtml); setEditMode(false); };

  const primaryColor = '#3b82f6';

  return (
    <NonHomeShell active="reform-report">
      <div dir={dir} style={{ padding: '24px', maxWidth: 1600, margin: '0 auto' }}>
        <div style={{ background: 'rgba(59,130,246,0.1)', borderBottom: '1px solid rgba(59,130,246,0.2)', padding: '8px 16px', textAlign: 'center', marginBottom: 16, borderRadius: 8 }}>
          <span style={{ color: primaryColor, fontSize: 12, fontWeight: 600 }}>🏛️ {ui.complianceBadge}</span>
        </div>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>🏛️ {ui.title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: '4px 0 0', fontSize: 14 }}>{ui.subtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {showReport && (
              <>
                <button onClick={handleNewReport} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#fff', cursor: 'pointer' }}>{ui.newReport}</button>
                {!editMode ? (
                  <button onClick={handleEdit} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#fff', cursor: 'pointer' }}>{ui.editReport}</button>
                ) : (
                  <>
                    <span style={{ color: '#f59e0b', fontSize: 13 }}>📝 {ui.editModeHint}</span>
                    <button onClick={handleSave} style={{ padding: '8px 16px', borderRadius: 8, background: '#10b981', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>{ui.saveEdits}</button>
                    <button onClick={handleDiscard} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer' }}>{ui.discardEdits}</button>
                  </>
                )}
                <button onClick={handlePrint} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#fff', cursor: 'pointer' }}>{ui.printBtn}</button>
                <button onClick={handleExport} style={{ padding: '8px 16px', borderRadius: 8, background: primaryColor, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>{ui.exportBtn}</button>
              </>
            )}
            <select value={lang} onChange={e => setLang(e.target.value)} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#fff' }}>
              {LANGUAGES.map(l => <option key={l} value={l} style={{ background: '#1a1a2e' }}>{l}</option>)}
            </select>
          </div>
        </header>

        <main style={{ display: 'grid', gridTemplateColumns: showReport ? '420px 1fr' : '1fr', gap: 32 }}>
          <div style={{ maxHeight: showReport ? 'calc(100vh - 240px)' : 'none', overflowY: showReport ? 'auto' : 'visible' }}>
            <EnterpriseReportForm verticalId="reform" lang={lang} ui={ui} onReportGenerated={handleReportGenerated} />
          </div>
          {showReport && (
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 32, border: editMode ? '3px solid #10b981' : '1px solid rgba(59,130,246,0.15)', overflowY: 'auto', maxHeight: 'calc(100vh - 240px)', transition: 'border 0.3s ease' }}>
              {editMode ? (
                <div contentEditable suppressContentEditableWarning onBlur={(e) => setEditedHtml(e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: editedHtml }} style={{ outline: 'none', minHeight: 400 }} />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: reportHtml }} />
              )}
            </div>
          )}
        </main>
      </div>
    </NonHomeShell>
  );
}
