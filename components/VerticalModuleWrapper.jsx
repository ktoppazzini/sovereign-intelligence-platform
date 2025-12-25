'use client';

import { useEffect, useState } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';
import { CORE_IDENTITY } from '../../lib/agentProfile';

// ═══════════════════════════════════════════════════════════════════════════
// VERTICAL MODULE WRAPPER
// Shared component that wraps any module with vertical-specific theming
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

export default function VerticalModuleWrapper({ 
  verticalId, 
  moduleId, 
  children,
  renderModule 
}) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  const vertical = getVerticalConfig(verticalId);
  const moduleConfig = vertical.modules[moduleId] || {};

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setLang(sp.get('lang') || 'English');
  }, []);

  useEffect(() => {
    const newDir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
    setDir(newDir);
    document.documentElement.setAttribute('dir', newDir);
  }, [lang]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const { theme, classification, compliance } = vertical;

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.gradient,
      direction: dir,
    }}>
      {/* Classification Banner (Defense) */}
      {classification?.show && (
        <div style={{
          background: classification.color,
          padding: '4px 0',
          textAlign: 'center',
          color: '#000',
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '2px',
        }}>
          {classification.level}
        </div>
      )}

      {/* Header */}
      <header style={{
        background: theme.headerBg,
        borderBottom: `1px solid ${theme.headerBorder}`,
        padding: '12px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ 
          maxWidth: 1400, 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a 
              href={`/${verticalId}${qsLang}`}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                textDecoration: 'none',
              }}
            >
              {vertical.icon}
            </a>
            <div>
              <h1 style={{ 
                color: '#fff', 
                fontSize: '1.1rem', 
                fontWeight: 700, 
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                {vertical.name}
                <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>|</span>
                <span style={{ color: theme.primary }}>{moduleConfig.title}</span>
              </h1>
              <p style={{ 
                color: 'rgba(255,255,255,0.5)', 
                margin: 0, 
                fontSize: '0.75rem' 
              }}>
                {vertical.tagline}
              </p>
            </div>
          </div>
          
          <nav style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <a 
              href={`/${verticalId}/dashboard${qsLang}`} 
              style={{ 
                color: moduleId === 'dashboard' ? theme.primary : 'rgba(255,255,255,0.7)', 
                textDecoration: 'none', 
                fontSize: '0.85rem',
                fontWeight: moduleId === 'dashboard' ? 600 : 400,
              }}
            >
              Dashboard
            </a>
            <a 
              href={`/${verticalId}/assistant${qsLang}`} 
              style={{ 
                color: moduleId === 'assistant' ? theme.primary : 'rgba(255,255,255,0.7)', 
                textDecoration: 'none', 
                fontSize: '0.85rem',
                fontWeight: moduleId === 'assistant' ? 600 : 400,
              }}
            >
              AI Assistant
            </a>
            <a 
              href={`/${verticalId}${qsLang}`} 
              style={{ 
                color: theme.primary, 
                textDecoration: 'none', 
                fontSize: '0.85rem' 
              }}
            >
              ← All Modules
            </a>
          </nav>
        </div>
      </header>

      {/* Module Content */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
        {renderModule ? renderModule({ lang, dir, vertical, moduleConfig, theme, qsLang }) : children}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${theme.cardBorder}`,
        padding: '16px 24px',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.5)',
        fontSize: '0.8rem',
      }}>
        {vertical.name} • Powered by Sovereign Intelligence v{CORE_IDENTITY.version}
        {compliance?.show && ` • ${compliance.label}`}
      </footer>

      {/* Classification Banner Bottom (Defense) */}
      {classification?.show && (
        <div style={{
          background: classification.color,
          padding: '4px 0',
          textAlign: 'center',
          color: '#000',
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '2px',
        }}>
          {classification.level}
        </div>
      )}

      {/* Responsive Styles */}
      <style jsx global>{`
        @media (max-width: 767px) {
          header { padding: 12px 16px !important; }
          header h1 { font-size: 0.95rem !important; }
          main { padding: 16px !important; }
          nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}
