// app/forms/request/page.js
import { cookies } from 'next/headers';
import RequestShell from '@/components/RequestShell.client';

export default async function Page({ searchParams }) {
  // Next 15 rule: await dynamic APIs before reading their properties
  const params = await searchParams;
  const c = await cookies();

  const lang = params?.lang ?? c.get('ui_lang')?.value ?? 'English';

  // Whatever verify route already set (we aren’t touching it)
  const role = String(c.get('user_role')?.value ?? 'User').trim();

  return <RequestShell lang={lang} role={role} />;
}
