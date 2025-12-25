// components/AdminButton.client.jsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function getCookie(name) {
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[-.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'),
  );
  return m ? decodeURIComponent(m[1]) : '';
}

export default function AdminButton({ className = '' }) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [role, setRole] = useState('');

  useEffect(() => {
    setVerified(getCookie('auth_isVerified') === 'true');
    setRole(getCookie('auth_role') || '');
  }, []);

  const isAdmin = verified && ['Admin', 'Super Admin'].includes(role);

  return (
    <button
      type="button"
      disabled={!isAdmin}
      onClick={() => router.push('/admin')}
      className={
        className ||
        (isAdmin
          ? 'px-4 py-2 rounded-md bg-slate-900 text-white font-semibold hover:opacity-90'
          : 'px-4 py-2 rounded-md bg-gray-500/60 text-white/80 cursor-not-allowed')
      }
      title={isAdmin ? 'Open Admin' : 'Admin requires 2FA + Admin role'}
    >
      Admin
    </button>
  );
}
