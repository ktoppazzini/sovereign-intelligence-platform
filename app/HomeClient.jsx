'use client';

export default function HomeClient({ lang = 'en', isAdmin = false }) {
  const rtl = /^ar/.test(lang);

  return (
    <main
      dir={rtl ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#0f1116 0%, #22272e 100%)',
        padding: '28px 24px',
      }}
    >
      {/* top row: title+logo left, buttons right */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        {/* left: title + logo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1
            style={{
              color: '#fff',
              fontSize: 48,
              fontWeight: 900,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Sovereign Intelligence
          </h1>

          <div
            style={{
              background: '#f3f4f6',
              borderRadius: 16,
              padding: 14,
              width: 'fit-content',
              boxShadow: '0 10px 24px rgba(0,0,0,.25)',
            }}
          >
            {/* update src if your logo is elsewhere */}
            <img
              src="/images/secure.png"
              alt="Sovereign Intelligence"
              style={{ width: 260, height: 'auto', display: 'block' }}
            />
          </div>
        </div>

        {/* right: buttons */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <a href="/service-request" className="btn">
            Submit Service Request
          </a>

          {isAdmin ? (
            <a href="/admin" className="btn secondary">
              Admin
            </a>
          ) : (
            <button className="btn secondary" disabled title="Admin only">
              Admin
            </button>
          )}
        </div>
      </div>

      {/* scoped styles */}
      <style jsx>{`
        .btn {
          display: inline-block;
          padding: 12px 18px;
          border-radius: 10px;
          background: #0b2b52;
          color: #fff;
          font-weight: 800;
          border: 2px solid rgba(255, 255, 255, 0.85);
          text-decoration: none;
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
          transition: transform 0.06s ease;
        }
        .btn:hover {
          transform: translateY(-1px);
        }
        .btn.secondary {
          background: #2a3138;
        }
        .btn[disabled] {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </main>
  );
}
