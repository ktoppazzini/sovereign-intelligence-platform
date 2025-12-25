// app/forms/request/page.js
import { cookies } from 'next/headers';
import NavCtas from '@/components/NavCtas.client.jsx'; // your existing top nav with icons
import RequestForm from './RequestForm.client';

export default async function Page({ searchParams }) {
  // Next 15 quirk: touch searchParams before other dynamic APIs
  const sp = await Promise.resolve(searchParams);
  const c = await cookies();

  const lang = sp?.lang || c.get('ui_lang')?.value || 'English';
  const role = c.get('user_role')?.value || 'User';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#0f1116,#2d333a)',
        color: '#fff',
      }}
    >
      {/* Reuse the SAME app header/nav */}
      <NavCtas lang={lang} role={role} />

      <main style={{ padding: '24px 32px' }}>
        {/* Title row */}
        <h1 style={{ fontWeight: 900, fontSize: 44, margin: '6px 0 18px' }}>Service Request</h1>

        {/* 2-column layout: logo card (same as Home) + form */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '420px 1fr',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {/* Logo card – identical look to Home */}
          <div
            style={{
              background: '#f3f4f6',
              borderRadius: 16,
              padding: 18,
              width: 420,
              boxShadow: '0 14px 28px rgba(0,0,0,0.25)',
            }}
          >
            <img
              src="/images/secure.png"
              alt="Sovereign Intelligence"
              width={420}
              height={420}
              style={{ maxWidth: '28vw', height: 'auto', display: 'block' }}
            />
          </div>

          {/* The translated request form */}
          <RequestForm lang={lang} />
        </div>
      </main>
    </div>
  );
}
