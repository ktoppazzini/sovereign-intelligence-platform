// app/page.js
import { cookies } from 'next/headers';
import HomeShell from '@/components/HomeShell.client';

export default async function Page({ searchParams }) {
  // Next 15: searchParams is async
  const params = await searchParams;
  const c = await cookies();

  const lang = params?.lang ?? c.get('ui_lang')?.value ?? 'English';

  // Read whatever your verify route already set (we won't change verify)
  const role = String(c.get('user_role')?.value ?? 'User').trim();

  // Server-side debug (shows in terminal)
  console.log('[home/page] lang=%s role(cookie)=%s', lang, role);

  return <HomeShell lang={lang} role={role} />;
}
