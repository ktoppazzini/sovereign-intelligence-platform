// app/page.js
import { cookies } from 'next/headers';
import HomeShell from '@/components/HomeShell.client';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }) {
  const c = await cookies(); // required await in Next 15
  const lang = searchParams?.lang || c.get('ui_lang')?.value || 'English';
  const role = c.get('user_role')?.value || 'User';
  return <HomeShell lang={lang} role={role} />;
}
