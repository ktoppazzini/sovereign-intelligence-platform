"use client";
import { useState, useEffect } from 'react';
// [KT:SURGICAL:TRANSLATION-INFRA] Add dynamic translation imports
import { getUiTranslations, normalizeLang, isRTL } from '../../lib/i18nClient';
import fetchChatGPTTranslation from '../../lib/fetchChatGPTTranslation';
import ReformReportForm from './ReformReportForm.client.jsx';
import NonHomeShell from '@/components/NonHomeShell.client';

// Fallback: ensure VisualNotesObserver exists even if the real component is missing
const VisualNotesObserver = () => null;
import Head from 'next/head';

import nextDynamic from 'next/dynamic';
const ChartHydrator = nextDynamic(() => import('./ChartHydrator.client'), { ssr: false });

export const dynamic = 'force-dynamic';

export default function ReformReportPage() {
  const [genDone, setGenDone] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');

  // [KT:SURGICAL:TRANSLATION-INFRA] Dynamic UI translation state
  const baseLabels = {
    title: 'Reform Report',
    export: 'Export',
    // ...add all UI labels here as needed
  };
  const [t, setT] = useState(baseLabels);
  const [lang, setLang] = useState('English');

  // [KT:SURGICAL:TRANSLATION-INFRA] Fetch translations dynamically on lang change
  useEffect(() => {
    getUiTranslations({ base: baseLabels, lang }).then(({ t }) => setT(t));
  }, [lang]);

  // [KT:SURGICAL:TRANSLATION-INFRA] Set document direction on lang change
  useEffect(() => {
    document.documentElement.setAttribute('dir', isRTL(lang) ? 'rtl' : 'ltr');
  }, [lang]);

  // [KT:SURGICAL:TRANSLATION-INFRA] Audit log for language changes
  useEffect(() => {
    console.log('[AUDIT] UI language set to', lang);
  }, [lang]);

  useEffect(() => {
    const onGenerated = (e) => {
      if (e?.detail?.html) {
        setGeneratedHtml(e.detail.html);
        setGenDone(true);
      }
    };
    if (typeof window !== 'undefined') window.addEventListener('si-reform-generated', onGenerated);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('si-reform-generated', onGenerated);
    };
  }, []);

  return (
    <>
      <Head>
        <script src="/reform-wire.js" defer></script>
        <style>{`
          .chart-title{ font-size: 28px !important; }
          .chart-label{ font-size: 14px !important; }
          .axis-label{ transform: rotate(-45deg); transform-origin:left bottom; white-space:nowrap; }
          /* Immunize the form from any global report CSS */
          .reform-form-scope input,
          .reform-form-scope select,
          .reform-form-scope textarea {
            max-width: 100%;
            width: 100%;
          }
          /* Optional: keep selects from exploding full-page due to flex ancestors */
          .reform-form-scope .form-row,
          .reform-form-scope .form-control {
            min-width: 0;
          }
        `}</style>
      </Head>

      <VisualNotesObserver />

      {/* =========================================
         PREVIOUS INSTANCES (COMMENTED OUT ONLY)
         Kept to respect "no deletions" / surgical change rule.
         ========================================= */}
      {/*
      <div className="chart-desc" style={{ fontWeight: 700, fontSize: 28, color: '#66e6b0', margin: '8px 0' }}>
        <ReformReportForm />
      </div>
      */}
      {/* Removed: <input type="checkbox" id="fastModeToggle" style="transform:scale(1.2)"> */}
      {/* [KT:LEGACY:REFORM-REPORT-LAYOUT] original single-column centered layout */}
      {/* Fast Mode (instant static report) has been removed as requested. */}
      <style>{`
        /* Move the form 20px to the left */
        .reform-form-scope {
          margin-left: 20px !important;
        }
      `}</style>

      {/* --- SINGLE report viewer, wider, form fields contained --- */}

                <NonHomeShell active="reform-report">
                <div
                  style={{
                  paddingTop: 16,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 32,
                  }}
                >
                  <div
                  className="reform-form-scope"
                  style={{
                    width: '100%',
                    maxWidth: 700,
                    marginBottom: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
                  >
                  <div style={{ width: '100%', minWidth: 0 }}>
                    <ReformReportForm />
                  </div>
                  </div>
                  {genDone && generatedHtml && (
                    <div
                      className="reform-report-viewer"
                      style={{
                        width: '100%',
                        maxWidth: 1200,
                        margin: '0 auto',
                        background: '#000',
                        color: '#e8eefb',
                        borderRadius: 12,
                        padding: 32,
                        border: '1px solid rgba(255,255,255,0.15)',
                        overflow: 'visible',
                        boxSizing: 'border-box',
                        marginTop: 0,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: generatedHtml
                          .replace(/<pre[\s\S]*?<\/pre>/gi, '')
                          .replace(/<code[\s\S]*?<\/code>/gi, '')
                          .replace(/<div[^>]*class=["']?debug["']?[^>]*>[\s\S]*?<\/div>/gi, '')
                      }}
                    />
                  )}
                </div>
                </NonHomeShell>

                {/* Mount Hydrator AFTER content is rendered - gated by generation state if needed */}
      {genDone && generatedHtml && <ChartHydrator />}
    </>
  );
}