import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '16px',
        padding: '48px',
        maxWidth: '500px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '80px', marginBottom: '16px', lineHeight: 1 }}>404</div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#fff',
          margin: '0 0 16px 0',
        }}>
          Page Not Found
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '16px',
          lineHeight: 1.6,
          margin: '0 0 32px 0',
        }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'transform 0.2s',
            }}
          >
            Go Home
          </Link>
          <Link
            href="/contact"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Contact Support
          </Link>
        </div>
        <div style={{
          marginTop: '40px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
        }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', margin: 0 }}>
            🤖 Powered by Sovereign Intelligence
          </p>
        </div>
      </div>
    </div>
  );
}
