// app/forms/request/page.js
import { cookies } from 'next/headers';
import NavCtas from '../../../components/NavCtas.client.jsx';
import RequestForm from './RequestForm.client.jsx';

export default async function Page(ctx) {
  // Next 15: await dynamic APIs before property access
  const sp = await ctx.searchParams;
  const c = await cookies();

  const lang = (sp && sp.lang) || c.get('ui_lang')?.value || 'English';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#0f1116,#2d333a)',
        color: '#fff',
      }}
    >
      {/* Top navigation (same across the app) */}
      <NavCtas lang={lang} />

      {/* Main content: left column = logo + title, center column = form */}
      <main
        style={{
          maxWidth: 1200,
          margin: '20px auto',
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: '420px 1fr',
          gap: 28,
          alignItems: 'start',
        }}
      >
        {/* Left column: logo + big title */}
        <aside>
          <h1 style={{ fontWeight: 900, fontSize: 44, margin: '6px 0 18px' }}>
            Sovereign Intelligence
          </h1>
          <div
            style={{
              background: '#f3f4f6',
              borderRadius: 16,
              padding: 18,
              width: 420,
              boxShadow: '0 14px 28px rgba(0,0,0,0.25)',
            }}
          >
            <img
              src="/images/secure.png"
              alt="Sovereign Intelligence"
              width={420}
              height={420}
              style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        </aside>

        {/* Center column: the translated request form */}
        <section>
          <RequestForm lang={lang} />
        </section>
      </main>
    </div>
  );
}
