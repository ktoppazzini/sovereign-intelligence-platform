'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body style={{
        margin: 0,
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          padding: '48px',
          maxWidth: '500px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🚨</div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#ef4444',
            margin: '0 0 16px 0',
          }}>
            Critical Error
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '16px',
            lineHeight: 1.6,
            margin: '0 0 32px 0',
          }}>
            A critical error occurred. Please try refreshing the page or contact support if the problem persists.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
