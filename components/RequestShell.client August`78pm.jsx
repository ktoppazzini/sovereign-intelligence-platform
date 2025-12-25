'use client';

import NavCtas from '@/components/NavCtas.client';
import ServiceRequestForm from '@/components/ServiceRequestForm.client';

export default function RequestShell({ lang = 'English' }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#0f1116,#2d333a)',
        color: '#fff',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontWeight: 900,
            fontSize: 36, // slightly smaller than home
            letterSpacing: 0.5,
            whiteSpace: 'nowrap',
          }}
        >
          Sovereign Intelligence
        </h1>

        {/* nav on the right, scaled up to visually match home */}
        <div style={{ marginLeft: 'auto', transform: 'scale(1.15)', transformOrigin: 'top right' }}>
          <NavCtas lang={lang} />
        </div>
      </header>

      {/* Main content */}
      <main style={{ padding: '22px 24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '460px 1fr', // a little more spacing than before
            gap: 22,
            alignItems: 'start',
          }}
        >
          {/* Logo card */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 12px 24px rgba(0,0,0,0.3)',
            }}
          >
            <img
              src="/images/secure.png"
              alt="Sovereign Intelligence"
              width={420}
              height={420}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>

          {/* Form card */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 14px 28px rgba(0,0,0,0.25)',
            }}
          >
            <h2 style={{ margin: '0 0 12px', fontSize: 34, fontWeight: 900 }}>Service Request</h2>
            <ServiceRequestForm lang={lang} />
          </div>
        </div>
      </main>
    </div>
  );
}
