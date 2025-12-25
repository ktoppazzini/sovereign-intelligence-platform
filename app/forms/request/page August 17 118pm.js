// app/forms/request/page.js
import { cookies } from 'next/headers';
import ServiceRequestForm from '@/components/ServiceRequestForm.client';

export default async function Page({ searchParams }) {
  const sp = await searchParams;
  const c = await cookies();

  const lang = (sp && (sp.lang || sp.language)) || c.get('ui_lang')?.value || 'English';

  const email = c.get('user_email')?.value || '';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#0f1116,#2d333a)' }}>
      <main style={{ padding: '24px 32px', color: '#fff', maxWidth: 880, margin: '0 auto' }}>
        <h1 style={{ fontWeight: 900, fontSize: 36, margin: '0 0 16px' }}>Service Request</h1>
        <ServiceRequestForm lang={lang} emailFromCookie={email} />
      </main>
    </div>
  );
}
