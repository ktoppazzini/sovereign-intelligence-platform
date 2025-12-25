// components/RequestShell.client.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import NavCtas from '@/components/NavCtas.client'; // ⬅️ add this
import ServiceRequestForm from '@/components/ServiceRequestForm.client';

// ... helpers getCookie / extractRoleString / isAdminish unchanged ...

export default function RequestShell({ lang = 'English', role: roleFromServer = 'User' }) {
  const [dbg, setDbg] = useState(false);
  const [roleResolved, setRoleResolved] = useState(String(roleFromServer || '').trim());
  const [checkedFallback, setCheckedFallback] = useState(false);

  // ... same role resolution + debug effects as you already have ...

  return (
    <div
      style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#0f1116,#2d333a)' }}
      data-role={roleResolved}
      data-can-see-admin={String(/^(admin|super\s*admin)$/i.test(roleResolved))}
    >
      {/* TOP NAV (same as Home) */}
      <div style={{ padding: '10px 22px' }}>
        <NavCtas lang={lang} />
      </div>

      <main style={{ padding: '24px 32px', color: '#fff' }}>
        {/* title row to match Home’s look */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <h1 style={{ fontWeight: 900, fontSize: 44, margin: 0 }}>Sovereign Intelligence</h1>
          <div style={{ marginLeft: 'auto' }} />
        </div>

        {/* two-column: logo left, form right */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '380px 1fr',
            gap: 28,
            alignItems: 'start',
          }}
        >
          <div
            style={{
              background: '#f3f4f6',
              borderRadius: 16,
              padding: 18,
              width: 380,
              boxShadow: '0 14px 28px rgba(0,0,0,0.25)',
            }}
          >
            <img
              src="/images/secure.png"
              alt="Sovereign Intelligence"
              width={380}
              height={380}
              style={{ maxWidth: '26vw', height: 'auto', display: 'block' }}
            />
          </div>

          <ServiceRequestForm lang={lang} />
        </div>
      </main>
    </div>
  );
}
