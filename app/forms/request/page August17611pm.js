// app/forms/request/page.js
import { cookies } from 'next/headers';
import RequestShell from '@/components/RequestShell.client';

export default async function Page({ searchParams }) {
  const params = await searchParams; // Next 15 quirk
  const c = await cookies();

  const lang = params?.lang ?? c.get('ui_lang')?.value ?? 'English';
  const role = String(c.get('user_role')?.value ?? 'User').trim();

  return <RequestShell lang={lang} role={role} />;
}
