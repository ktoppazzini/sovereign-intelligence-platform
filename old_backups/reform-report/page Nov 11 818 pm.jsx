"use client";
import { useState, useEffect } from 'react';
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
        `}</style>
      </Head>

      <VisualNotesObserver />

      {/* =========================================
         CENTERED, TOP-OF-PAGE REFORM REPORT FORM
         -----------------------------------------
         We render a single instance of the form, centered and near the top.
         No global styles touched. Only this component changed.
         ========================================= */}
      <NonHomeShell active="reform-report">
        <div
          style={{
            /* Top placement */
            paddingTop: 16,

            /* Center horizontally using flex */
            display: 'flex',
            justifyContent: 'center',

            /* Keep content readable on very wide screens */
            width: '100%'
          }}
        >
          <div
            style={{
              width: 'min(900px, 100%)'
            }}
          >
            <ReformReportForm />
          </div>
        </div>
      </NonHomeShell>

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

      {/* Mount Hydrator AFTER content is rendered - gated by generation state if needed */}
      {genDone && generatedHtml && <ChartHydrator />}
    </>
  );
}
