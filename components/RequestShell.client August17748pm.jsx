// components/RequestShell.client.jsx
'use client';

import NavCtas from '@/components/NavCtas.client';
import ServiceRequestForm from './ServiceRequestForm.client';

const FORM_MAX_W = 840; // px – cap the form’s max width
const FORM_VW = 54; // vw – relative width on wide screens

export default function RequestShell({ lang = 'English' }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#0f1116,#2d333a)',
        color: '#fff',
      }}
    >
      {/* Top nav (same as Home) */}
      <header style={{ padding: '14px 28px' }}>
        <NavCtas lang={lang} />
      </header>

      <main style={{ padding: '0 28px 48px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 420px) auto',
            gap: 40, // ⬅️ a little more space between logo and form
            alignItems: 'start',
          }}
        >
          {/* Left: logo card */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 12px 30px rgba(0,0,0,0.28)',
            }}
          >
            <img
              src="/images/secure.png"
              alt="Sovereign Intelligence"
              width={380}
              height={380}
              style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
            />
          </div>

          {/* Right: title + form card */}
          <section style={{ maxWidth: FORM_MAX_W, width: `${FORM_VW}vw` }}>
            <h1
              style={{
                margin: '0 0 12px',
                fontSize: 36,
                fontWeight: 900,
                letterSpacing: 0.3,
              }}
            >
              Service Request
            </h1>

            <div
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 12px 30px rgba(0,0,0,0.28)',
              }}
            >
              <ServiceRequestForm lang={lang} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
