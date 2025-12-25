'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

// Extracted readable English text from Reform Report Dec 19.jpeg
const REFORM_REPORT_CONTENT = {
  title: 'SOVEREIGN INTELLIGENCE',
  subtitle: 'Toppers Pizza',
  authors: 'Reith Toppazzini Kyle Toppazzini',
  date: 'December 19, 2025',
  
  sections: {
    overview: {
      label: 'Strategic Overview',
      description: 'This 3-year plan hinges on rapid expansion in high-potential urban clusters and disciplined cost management across supply and delivery.'
    },
    channels: {
      label: 'Channel Expansion',
      description: 'Channel expansion and strategic partnerships are not optional but core to capturing Canada\'s growth potential.'
    },
    operations: {
      label: 'Operational Excellence',
      description: 'Operational excellence is inseparable from customer satisfaction in winning the market.'
    },
    capital: {
      label: 'Capital Allocation',
      description: 'Disciplined capital allocation to sustain growth while mitigating key market risks.'
    },
    loyalty: {
      label: 'Loyalty Programs',
      description: 'Loyalty platforms amplify lifetime value and reduce churn, enabling sustainable growth.'
    },
    governance: {
      label: 'Execution & Governance',
      description: 'Disciplined execution and governance across markets.'
    },
    digital: {
      label: 'Digital Penetration',
      description: 'This 15 percentage-point gap represents CAD $750M potential value over three years if digital penetration narrows through a unified, channel-optimized strategy.'
    },
    delivery: {
      label: 'Delivery Optimization',
      description: 'Cost-savings potential of CAD $120M over 3 years arises from optimized staffing, waste reduction, and cross-store inventory sharing. Operational analytics enable better scheduling and fewer stockouts.'
    },
    online: {
      label: 'Online Orders',
      description: 'This 23-28% uplift in online orders is a direct lever for revenue acceleration if we optimize funnel efficiency and improve delivery ETA accuracy.'
    }
  },

  cta: {
    whereToPlay: 'where to play',
    howToWin: 'how to win',
    quickWins: 'quick wins'
  }
};

function normalizeLang(raw) {
  if (!raw) return 'English';
  return String(raw).trim();
}

function isRTL(lang) {
  return ['Arabic', 'Hebrew', 'Urdu', 'Farsi', 'Persian'].some(l => lang.includes(l));
}

export default function ReformReportTranslatable({ lang: langProp = 'English' }) {
  const searchParams = useSearchParams();
  const urlLang = searchParams?.get('lang');
  const effectiveLang = normalizeLang(langProp || urlLang || 'English');

  const [translations, setTranslations] = useState(REFORM_REPORT_CONTENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set RTL direction
  useEffect(() => {
    try {
      document.documentElement.setAttribute('dir', isRTL(effectiveLang) ? 'rtl' : 'ltr');
    } catch {}
  }, [effectiveLang]);

  // Fetch translations via existing gptTranslation endpoint
  useEffect(() => {
    if (/^english$/i.test(effectiveLang)) {
      setTranslations(REFORM_REPORT_CONTENT);
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    (async () => {
      try {
        // Build prompt with the content structure
        const prompt = `Translate the following content into ${effectiveLang}. 
Return ONLY a valid JSON object with the same nested structure and keys:
${JSON.stringify(REFORM_REPORT_CONTENT, null, 2)}`;

        const response = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json().catch(() => ({}));
        
        // Handle various response shapes from the API
        const translatedData = data?.translation || data?.data || data?.result || data;
        
        if (translatedData && typeof translatedData === 'object') {
          setTranslations(prev => ({
            ...prev,
            ...translatedData
          }));
        }
      } catch (err) {
        console.warn(`Translation failed for ${effectiveLang}:`, err?.message);
        setError(err?.message);
        // Fall back to English on error
        setTranslations(REFORM_REPORT_CONTENT);
      } finally {
        setLoading(false);
      }
    })();

    return () => clearTimeout(timeoutId);
  }, [effectiveLang]);

  return (
    <div className="reform-report-container" style={{ direction: isRTL(effectiveLang) ? 'rtl' : 'ltr' }}>
      <header className="report-header">
        <h1>{translations.title}</h1>
        <p className="subtitle">{translations.subtitle}</p>
        <p className="meta">{translations.authors} | {translations.date}</p>
      </header>

      {loading && (
        <div className="loading-indicator">
          🌐 Translating to {effectiveLang}...
        </div>
      )}

      {error && (
        <div className="error-indicator">
          ⚠️ Translation unavailable, showing English
        </div>
      )}

      <section className="report-sections">
        {Object.entries(translations.sections || {}).map(([key, section]) => (
          <article key={key} className={`report-section section-${key}`}>
            <h2>{section.label}</h2>
            <p>{section.description}</p>
          </article>
        ))}
      </section>

      <footer className="report-cta">
        <div className="cta-items">
          <span className="cta-item">• {translations.cta?.whereToPlay}</span>
          <span className="cta-item">• {translations.cta?.howToWin}</span>
          <span className="cta-item">• {translations.cta?.quickWins}</span>
        </div>
      </footer>

      <style jsx>{`
        .reform-report-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          padding: 2rem;
          max-width: 1000px;
          margin: 0 auto;
          background: #fff;
          color: #333;
        }

        .report-header {
          text-align: center;
          margin-bottom: 3rem;
          border-bottom: 2px solid #0066cc;
          padding-bottom: 1.5rem;
        }

        .report-header h1 {
          font-size: 2.5rem;
          margin: 0 0 0.5rem;
          color: #0066cc;
        }

        .subtitle {
          font-size: 1.5rem;
          color: #666;
          margin: 0.5rem 0;
        }

        .meta {
          font-size: 0.9rem;
          color: #999;
          margin: 0.5rem 0 0;
        }

        .loading-indicator,
        .error-indicator {
          padding: 1rem;
          margin: 1rem 0;
          border-radius: 4px;
          font-weight: 500;
        }

        .loading-indicator {
          background: #e3f2fd;
          color: #1976d2;
        }

        .error-indicator {
          background: #fff3e0;
          color: #f57c00;
        }

        .report-sections {
          margin: 2rem 0;
        }

        .report-section {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #f9f9f9;
          border-left: 4px solid #0066cc;
          border-radius: 4px;
        }

        .report-section h2 {
          margin: 0 0 1rem;
          color: #0066cc;
          font-size: 1.3rem;
        }

        .report-section p {
          margin: 0;
          line-height: 1.6;
          color: #555;
        }

        .report-cta {
          margin-top: 3rem;
          padding: 1.5rem;
          background: #0066cc;
          color: white;
          border-radius: 4px;
          text-align: center;
        }

        .cta-items {
          display: flex;
          gap: 2rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .cta-item {
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .reform-report-container {
            padding: 1rem;
          }

          .report-header h1 {
            font-size: 1.8rem;
          }

          .cta-items {
            flex-direction: column;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
