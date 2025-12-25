'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function AdminHome() {
  const sp = useSearchParams();
  const lang = sp.get('lang') || 'English';
  const suffix = lang.toLowerCase() === 'english' ? '' : `?lang=${encodeURIComponent(lang)}`;

  const tile = {
    display: 'block',
    padding: '16px 18px',
    borderRadius: 12,
    background: '#0b2e56',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 800,
    boxShadow: '0 10px 20px rgba(0,0,0,.25)',
  };

  return (
    <div style={{ maxWidth: 980, margin: '24px auto', padding: '0 16px' }}>
      <h1 style={{ color: '#fff', fontWeight: 900, marginBottom: 18 }}>
        Admin
        <span style={{ fontWeight: 400, marginLeft: 8, fontSize: 16, opacity: 0.85 }}>
          ({lang})
        </span>
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
          gap: 16,
        }}
      >
        <Link href={`/admin/reforms${suffix}`} style={tile}>
          Reform Requests
        </Link>
        <Link href={`/admin/languages${suffix}`} style={tile}>
          Languages
        </Link>
        <Link href={`/admin/users${suffix}`} style={tile}>
          Users
        </Link>
        <Link href={`/admin/logs${suffix}`} style={tile}>
          Logs
        </Link>
      </div>
    </div>
  );
}
