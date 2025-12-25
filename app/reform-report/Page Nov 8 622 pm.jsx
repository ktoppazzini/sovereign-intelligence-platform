"use client";
import ReformReportForm from './ReformReportForm.client.jsx';
import NonHomeShell from '@/components/NonHomeShell.client';

// Removed duplicate default export Page

// Fallback: ensure VisualNotesObserver exists even if the real component is missing
const VisualNotesObserver = () => null;
import './ReportSidePanel.client';
import Head from 'next/head';

// import PlaceholderChart from './PlaceholderChart.client';
//import dynamic from 'next/dynamic';
//const ChartHydrator = dynamic(() => import('./ChartHydrator.client'), { ssr: false });
import nextDynamic from 'next/dynamic';
const ChartHydrator = nextDynamic(() => import('./ChartHydrator.client'), { ssr: false });

export const dynamic = 'force-dynamic';

export default function ReformReportPage() {
  return (
    <>
      <Head>
        <script src="/reform-wire.js" defer></script>
        <style>{` .chart-title{ font-size: 28px !important; } .chart-label{ font-size: 14px !important; } .axis-label{ transform: rotate(-45deg); transform-origin:left bottom; white-space:nowrap; } `}</style>
      </Head>
      <VisualNotesObserver />
         <div className="chart-desc" style={{ fontWeight: 700, fontSize: 28, color: '#66e6b0', margin: '8px 0' }}>
      Graph descriptions follow each chart; updated for accessibility and consistency.
    </div>
  {/* Image fixes: placeholders for missing sections/descriptions (non-breaking) */}
    <div className="matrix-placeholder" style={{ padding: '12px 16px', background: '#0b1220', borderRadius: 12, margin: '8px 0' }}>
      <div style={{ color: '#2bd79b', fontSize: 22, fontWeight: 700 }}>Initiative Prioritization Matrix</div>
      <div style={{ color: '#aaa', marginTop: 6 }}>This section describes initiative prioritization; ensures a visible caption.</div>
      <div style={{ textAlign: 'center', marginTop: 6, fontSize: 14, color: '#66e6b0' }}>(Description: alignment with image 5)</div>
    </div>
    <div className="risk-desc" style={{ padding: '8px 0', color: '#2bd79b', fontSize: 20, fontWeight: 600 }}>
      Risk Heat Map & Risk Assessment sections should include consistent descriptions (like image 4).
    </div>
    <div className="risk-block" style={{ padding: '12px 0' }}>
      <div style={{ display:'flex', gap:20, alignItems:'center' }}>
        <span style={{ width:12, height:12, background:'#2ecc71', borderRadius:6, display:'inline-block' }}></span>
        <span>Risk 1</span>
        <span style={{ width:12, height:12, background:'#f1c40f', borderRadius:6, display:'inline-block' }}></span>
        <span>Risk 2</span>
        <span style={{ width:12, height:12, background:'#e74c3c', borderRadius:6, display:'inline-block' }}></span>
        <span>Risk 3</span>
      </div>
    </div>
    <div className="risk-legend" style={{ display:'flex', gap:12, alignItems:'center', paddingTop:6 }}>
      <span style={{ width:12, height:12, background:'#2ecc71', borderRadius:6, display:'inline-block' }}></span> Risk 1
      <span style={{ width:12, height:12, background:'#f39c12', borderRadius:6, display:'inline-block' }}></span> Risk 2
      <span style={{ width:12, height:12, background:'#e74c3c', borderRadius:6, display:'inline-block' }}></span> Risk 3
    </div>
    <NonHomeShell active="reform-report">
        <ReformReportForm />
        
        {/* Uncomment the line below if PlaceholderChart is available */}
        {/* <PlaceholderChart prompt="3-Year Revenue & Margin Forecast" /> */}
      </NonHomeShell>
      {/* Mount Hydrator AFTER content is rendered */}
      <ChartHydrator />
    </>
  );
}



