'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

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
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '16px',
        padding: '48px',
        maxWidth: '500px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#ef4444',
          margin: '0 0 16px 0',
        }}>
          Something went wrong
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '16px',
          lineHeight: 1.6,
          margin: '0 0 32px 0',
        }}>
          We encountered an unexpected error. Our team has been notified and is working on a fix.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = ''}
          >
            Try Again
          </button>
          <a
            href="/"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'transform 0.2s',
            }}
          >
            Go Home
          </a>
        </div>
        <p style={{
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: '12px',
          marginTop: '32px',
        }}>
          Error ID: {error?.digest || 'Unknown'}
        </p>
      </div>
    </div>
  );
}
