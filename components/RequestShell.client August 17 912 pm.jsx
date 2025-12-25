// components/RequestShell.client.jsx
'use client';
import ServiceRequestForm from '@/components/ServiceRequestForm.client';
import NavCtas from '@/components/NavCtas.client';

export default function RequestShell({
  lang = 'English',
  formWidthPx = 760, // ← set the form column width here
  gapPx = 40, // ← space between logo and form
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#0f1116,#2d333a)' }}>
      <NavCtas lang={lang} />

      <main
        style={{
          padding: '24px 32px',
          color: '#fff',
          display: 'grid',
          gridTemplateColumns: `auto ${formWidthPx}px`, // ← RIGHT COLUMN FIXED WIDTH
          columnGap: gapPx, // ← MORE SPACE BETWEEN COLUMNS
          alignItems: 'start',
        }}
      >
        {/* left: logo card */}
        <div
          style={{
            background: 'inherit', // or 'transparent'
            borderRadius: 16,
            padding: 18,
            boxShadow: 'none',
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

        {/* right: form card (fills the fixed column) */}
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 42, margin: '0 0 16px 0' }}>Service Request</h1>
          <ServiceRequestForm lang={lang} />
        </div>
      </main>
    </div>
  );
}
