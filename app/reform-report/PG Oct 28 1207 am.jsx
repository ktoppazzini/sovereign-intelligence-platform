// at top:
'use client';
import VisualNotesObserver from '../_client/VisualNotesObserver';
import './ReportSidePanel.client';
import NonHomeShell from '@components/NonHomeShell.client';
import ReformReportForm from './ReformReportForm.client';
// import PlaceholderChart from './PlaceholderChart.client';
//import dynamic from 'next/dynamic';
//const ChartHydrator = dynamic(() => import('./ChartHydrator.client'), { ssr: false });
import nextDynamic from 'next/dynamic';
const ChartHydrator = nextDynamic(() => import('./ChartHydrator.client'), { ssr: false });

export const dynamic = 'force-dynamic';

export default function ReformReportPage() {
  return (
    <>
    <VisualNotesObserver />
      <NonHomeShell active="reform-report">
        <ReformReportForm />
        <ChartHydrator />
        {/* Uncomment the line below if PlaceholderChart is available */}
        {/* <PlaceholderChart prompt="3-Year Revenue & Margin Forecast" /> */}
      </NonHomeShell>
      {/* This script tag should not be inside JSX */}
      <script src="/reform-wire.js" defer></script>
      
    </>
  );
}
