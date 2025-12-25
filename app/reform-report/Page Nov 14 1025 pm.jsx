"use client";
import { useState, useEffect } from 'react';
// [KT:SURGICAL:TRANSLATION-INFRA] Add dynamic translation imports
import { getUiTranslations, normalizeLang, isRTL } from '../../lib/i18nClient';
import fetchChatGPTTranslation from '../../lib/fetchChatGPTTranslation';
import ReformReportForm from './ReformReportForm.client.jsx';
import NonHomeShell from '@/components/NonHomeShell.client';

// Fallback: ensure VisualNotesObserver exists even if the real component is missing
const VisualNotesObserver = () => null;
import './ReportSidePanel.client';
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

          /* [KT:SURGICAL:REFORM-REPORT-VIEWER-CLAMP] Clamp report viewer width and center it. */
          .reform-report-shell {
            width: 100% !important;
            max-width: 1024px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            box-sizing: border-box;
          }
          /* Hide print clone except for print/export */
          .report-print-clone {
            display: none !important;
          }
          @media print {
            .report-print-clone {
              display: block !important;
            }
            #reform-report-main {
              display: none !important;
            }
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

      {/*
      <NonHomeShell active="reform-report">
        <div style={{ marginLeft: 260, maxWidth: 720 }}>
          <ReformReportForm />
        </div>
      </NonHomeShell>
      */}

      {/* [KT:LEGACY:REFORM-REPORT-LAYOUT] original single-column centered layout */}
      {/*
      <NonHomeShell active="reform-report">
        <div
          style={{
            paddingTop: 16,
            display: 'flex',
            justifyContent: 'center',
            width: '100%'
          }}
        >
          <div className="reform-form-scope"
            style={{
              width: 'min(900px, 100%)'
            }}
          >
            <ReformReportForm />
          </div>
        </div>
      </NonHomeShell>
      */}

      {/* [KT:LEGACY:REFORM-REPORT-LAYOUT] Two-column grid layout commented out for traceability. */}
      {/**
      <NonHomeShell active="reform-report">
        <div
          style={{
            paddingTop: 16,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            width: '100%',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 1200,
              display: 'grid',
              gridTemplateColumns: genDone ? 'minmax(0, 420px) minmax(0, 1fr)' : 'minmax(0, 600px)',
              gap: 24,
              padding: 16,
            }}
          >
            <div>
              <ReformReportForm />
            </div>
            {genDone && generatedHtml && (
              <div
                style={{
                  backgroundColor: '#000000',
                  color: '#e8eefb',
                  borderRadius: 12,
                  padding: 16,
                  border: '1px solid rgba(255,255,255,0.15)',
                  overflow: 'hidden',
                }}
                dangerouslySetInnerHTML={{ __html: generatedHtml }}
              />
            )}
          </div>
        </div>
      </NonHomeShell>
      */}

      {/* [KT:SURGICAL:REFORM-REPORT-LAYOUT-VERTICAL] Vertically stacked layout: form above, report viewer below, both centered and full-width. */}
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
              maxWidth: 600,
              marginBottom: 0,
            }}
          >
            <ReformReportForm />
          </div>
          {/* MAIN live report viewer – keep this */}
          {genDone && generatedHtml && (
            <div
              id="reform-report-main"
              className="reform-report-shell"
              style={{
                width: '100%',
                maxWidth: 1024,
                backgroundColor: '#000000',
                color: '#e8eefb',
                borderRadius: 12,
                padding: 24,
                border: '1px solid rgba(255,255,255,0.15)',
                overflow: 'hidden',
                marginTop: 0,
                boxShadow: '0 2px 16px 0 rgba(0,0,0,0.18)',
              }}
              dangerouslySetInnerHTML={{ __html: generatedHtml }}
            />
          )}

          {/* [KT:SURGICAL:DUPLICATE-REPORT]
              This secondary clone caused the “second report far right”.
              Keep for print/export logic only; hidden in screen CSS.
          */}
          {false && (
            <div
              id="reform-report-print"
              className="reform-report-shell report-print-clone"
              style={{
                width: '100%',
                maxWidth: 1024,
                backgroundColor: '#000000',
                color: '#e8eefb',
                borderRadius: 12,
                padding: 24,
                border: '1px solid rgba(255,255,255,0.15)',
                overflow: 'hidden',
                marginTop: 0,
                boxShadow: '0 2px 16px 0 rgba(0,0,0,0.18)',
              }}
              dangerouslySetInnerHTML={{ __html: generatedHtml }}
            />
          )}
        </div>
      </NonHomeShell>

      {/* Mount Hydrator AFTER content is rendered - gated by generation state if needed */}
      {genDone && generatedHtml && <ChartHydrator />}
    </>
  );
}
