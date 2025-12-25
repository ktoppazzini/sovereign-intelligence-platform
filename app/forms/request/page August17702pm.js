// app/forms/request/page.js
import { cookies } from 'next/headers';
import RequestShell from '@/components/RequestShell.client'; // or ../../components/RequestShell.client

export default async function Page({ searchParams }) {
  const params = await searchParams; // Next 15: await dynamic APIs
  const c = await cookies();

  const lang = params?.lang ?? c.get('ui_lang')?.value ?? 'English';

  return <RequestShell lang={lang} />;
}
