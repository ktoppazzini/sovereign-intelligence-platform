'use client';

import { useEffect, useState } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { loadModuleTranslations } from '../../lib/dynamicTranslation';
import { getVerticalConfig } from '../../lib/verticalConfig';

// ═══════════════════════════════════════════════════════════════════════════
// COMPLIANCE MODULE - Full Dynamic Translation + Charts + CTA
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

// Compliance score gauge
function ComplianceGauge({ score, color }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto' }}>
      <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
        <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s' }} />
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>{score}%</div>
      </div>
    </div>
  );
}

// Regulations bar chart
function RegulationsChart({ data, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((item, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#fff', fontSize: '0.85rem' }}>{item.name}</span>
            <span style={{ color: item.score >= 90 ? '#10b981' : item.score >= 70 ? '#f59e0b' : '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>{item.score}%</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${item.score}%`, background: item.score >= 90 ? '#10b981' : item.score >= 70 ? '#f59e0b' : '#ef4444', borderRadius: 4, transition: 'width 0.5s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ComplianceModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  const [scanning, setScanning] = useState(false);
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.compliance || { title: 'AI Compliance Engine', icon: '📋' };

  const BASE_UI = {
    pageTitle: moduleConfig.title || 'AI Compliance Engine',
    pageSubtitle: moduleConfig.desc || 'Automated regulatory compliance and risk management',
    
    // Statistics
    complianceScore: 'Compliance Score',
    criticalIssues: 'Critical Issues',
    pendingActions: 'Pending Actions',
    lastAudit: 'Last Audit',
    
    // Regulations (fully translated)
    regGdpr: 'GDPR',
    regGdprDesc: 'General Data Protection Regulation',
    regHipaa: 'HIPAA',
    regHipaaDesc: 'Health Insurance Portability Act',
    regSox: 'SOX',
    regSoxDesc: 'Sarbanes-Oxley Act',
    regPci: 'PCI-DSS',
    regPciDesc: 'Payment Card Industry Security',
    regIso: 'ISO 27001',
    regIsoDesc: 'Information Security Management',
    regNist: 'NIST',
    regNistDesc: 'Cybersecurity Framework',
    
    // Statuses
    statusCompliant: 'Compliant',
    statusPartial: 'Partial',
    statusNonCompliant: 'Non-Compliant',
    
    // Chart title
    regulationScores: 'Regulation Scores',
    
    // Buttons
    runScan: 'Run Compliance Scan',
    scanning: 'Scanning...',
    downloadReport: 'Download Report',
    viewDetails: 'View Details',
    
    // Meta
    controls: 'controls',
    issues: 'issues',
    
    // Contact CTA
    ctaTitle: 'Need Compliance Expertise?',
    ctaDesc: 'Our team can help ensure full regulatory compliance across your organization.',
    ctaScheduleDemo: 'Schedule Demo',
    ctaContactSales: 'Contact Sales',
    
    backToHome: verticalId ? `Back to ${vertical?.name}` : 'Back to Home',
  };

  const [ui, setUi] = useState(BASE_UI);

  useEffect(() => { const sp = new URLSearchParams(window.location.search); setLang(sp.get('lang') || 'English'); }, []);
  useEffect(() => {
    let m = true;
    (async () => {
      setDir(RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr');
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_COMPLIANCE_${verticalId || 'MAIN'}_V2` });
      if (m) setUi(t || BASE_UI);
    })();
    return () => { m = false; };
  }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

  const handleScan = async () => {
    setScanning(true);
    await new Promise(r => setTimeout(r, 3000));
    setScanning(false);
  };

  const regulations = [
    { name: ui.regGdpr, desc: ui.regGdprDesc, score: 94, status: ui.statusCompliant, controls: 87, issues: 2 },
    { name: ui.regHipaa, desc: ui.regHipaaDesc, score: 78, status: ui.statusPartial, controls: 65, issues: 8 },
    { name: ui.regSox, desc: ui.regSoxDesc, score: 100, status: ui.statusCompliant, controls: 45, issues: 0 },
    { name: ui.regPci, desc: ui.regPciDesc, score: 85, status: ui.statusPartial, controls: 52, issues: 5 },
    { name: ui.regIso, desc: ui.regIsoDesc, score: 91, status: ui.statusCompliant, controls: 114, issues: 3 },
    { name: ui.regNist, desc: ui.regNistDesc, score: 88, status: ui.statusCompliant, controls: 98, issues: 4 },
  ];

  const overallScore = Math.round(regulations.reduce((acc, r) => acc + r.score, 0) / regulations.length);
  const totalIssues = regulations.reduce((acc, r) => acc + r.issues, 0);

  return (
    <div style={{ minHeight: '100vh', background: theme.gradient, direction: dir }}>
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
      
      <header style={{ background: 'rgba(0,0,0,0.3)', borderBottom: `1px solid ${theme.cardBorder}`, padding: '20px 32px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <a href={homeLink} style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.85rem' }}>← {ui.backToHome}</a>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            {vertical && <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>{vertical.icon}</div>}
            <div><h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{moduleConfig.icon} {ui.pageTitle}</h1><p style={{ color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>{ui.pageSubtitle}</p></div>
          </div>
        </div>
      </header>
      
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 32 }}>
        {/* Score Cards + Gauge */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: 12 }}>{ui.complianceScore}</div>
            <ComplianceGauge score={overallScore} color={overallScore >= 85 ? '#10b981' : '#f59e0b'} />
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ef4444' }}>{totalIssues}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>{ui.criticalIssues}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f59e0b' }}>12</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>{ui.pendingActions}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#10b981' }}>Dec 24, 2025</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>{ui.lastAudit}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <button onClick={handleScan} disabled={scanning} style={{ padding: '14px 28px', background: scanning ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: scanning ? 'not-allowed' : 'pointer' }}>{scanning ? `⏳ ${ui.scanning}` : `🔍 ${ui.runScan}`}</button>
          <button style={{ padding: '14px 28px', background: 'rgba(255,255,255,0.1)', border: `1px solid ${theme.cardBorder}`, borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>📄 {ui.downloadReport}</button>
        </div>

        {/* Regulation Scores Chart */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, marginBottom: 24 }}>
          <h3 style={{ color: '#fff', margin: '0 0 20px' }}>{ui.regulationScores}</h3>
          <RegulationsChart data={regulations} color={theme.primary} />
        </div>

        {/* Regulation Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
          {regulations.map((reg, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: `1px solid ${theme.cardBorder}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>{reg.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{reg.desc}</div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 8, background: reg.status === ui.statusCompliant ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: reg.status === ui.statusCompliant ? '#10b981' : '#f59e0b', fontSize: '0.75rem' }}>{reg.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                <span>{reg.controls} {ui.controls}</span>
                <span>{reg.issues} {ui.issues}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div style={{
          background: `linear-gradient(135deg, ${theme.primary}15, ${theme.secondary || theme.primary}15)`,
          borderRadius: 16,
          padding: 32,
          border: `1px solid ${theme.primary}30`,
          textAlign: 'center',
        }}>
          <h3 style={{ color: '#fff', fontSize: '1.25rem', margin: '0 0 8px' }}>{ui.ctaTitle}</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 24px' }}>{ui.ctaDesc}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`/contact${qsLang}`} style={{ padding: '14px 32px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, textDecoration: 'none' }}>📅 {ui.ctaScheduleDemo}</a>
            <a href={`/contact${qsLang}`} style={{ padding: '14px 32px', background: 'rgba(255,255,255,0.1)', border: `1px solid ${theme.cardBorder}`, borderRadius: 10, color: '#fff', fontWeight: 600, textDecoration: 'none' }}>📧 {ui.ctaContactSales}</a>
          </div>
        </div>
      </main>
      
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
    </div>
  );
}
