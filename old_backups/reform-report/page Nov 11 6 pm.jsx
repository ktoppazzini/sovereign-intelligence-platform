"use client";
import { useState, useEffect } from 'react';
import ReformReportForm from './ReformReportForm.client.jsx';
import NonHomeShell from '@/components/NonHomeShell.client';

// Removed duplicate default export Page
/**
 * No code needed here for $PLACEHOLDER$.
 * The layout and styling changes should be made below.
 */
import Head from 'next/head';
// If you have a real VisualNotesObserver component, import it here. Otherwise, keep the fallback below.
// import VisualNotesObserver from './VisualNotesObserver.client';
// Fallback: ensure VisualNotesObserver exists even if the real component is missing
const VisualNotesObserver = () => null;

// import PlaceholderChart from './PlaceholderChart.client';
//import dynamic from 'next/dynamic';
//const ChartHydrator = dynamic(() => import('./ChartHydrator.client'), { ssr: false });
import nextDynamic from 'next/dynamic';
import React from 'react';
const ChartHydrator = nextDynamic(() => import('./ChartHydrator.client'), { ssr: false });
export const dynamic = 'force-dynamic';

 

export default function ReformReportPage() {
  const [genDone, setGenDone] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');
  // Listen for a global event dispatched by ReformReportForm when a report is generated
  useEffect(() => {
    const handler = (e) => {
      try {
        if (e?.detail?.html) {
          setGeneratedHtml(e.detail.html);
          setGenDone(true);
        }
      } catch {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('si-reform-generated', handler);
    }
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('si-reform-generated', handler);
    };
  }, []);
  return (
    <>
      <Head>
        <script src="/reform-wire.js" defer></script>
      </Head>
      <style jsx global>{`
        html, body {
          background: #0b1220;
          min-height: 100vh;
          margin: 0;
          padding: 0;
        }
        .reform-form-wrap { 
          background: transparent; 
          padding-top: 0 !important;
          max-width: 720px;
          margin-left: 260px;
        }
            .main-nav, .sidebar, .nav, .navigation {
          position: fixed !important;
          top: 0 !important;
              left: 0 !important;
              height: 100vh !important;
              width: 360px !important;
          z-index: 1000;
          background: #111 !important;
        }
              .main-content {
                display: flex;
                justify-content: center;
                padding: 0;
                margin: 0;
                margin-left: 360px;
                min-height: calc(100vh - 0px);
              }
              .center-wrap {
          width: min(1100px, 92%);
                margin: 0 auto;
        }
      `}</style>
      <VisualNotesObserver />
      <NonHomeShell active="reform-report" />
      <div className="main-content">
        <div className="reform-form-wrap" style={{ paddingTop: 20, marginLeft: 260 }}>
          <ReformReportForm />
        </div>
        {/* Show ChartHydrator (report viewer) only after a report is generated */}
        {genDone && generatedHtml && <ChartHydrator generatedHtml={generatedHtml} />}
      </div>
    </>
  );
}
 



