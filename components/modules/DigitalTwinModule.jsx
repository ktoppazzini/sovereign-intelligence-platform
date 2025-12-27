'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

// ═══════════════════════════════════════════════════════════════════════════
// DIGITAL TWIN MODULE - Full Dynamic Translation + Charts + CTA
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

// Simulation metrics chart
function SimulationChart({ data, color }) {
  return (
    <div style={{ display: 'flex', gap: 8, height: 60, alignItems: 'flex-end' }}>
      {data.map((value, i) => (
        <div key={i} style={{
          flex: 1,
          height: `${value}%`,
          background: `linear-gradient(180deg, ${color}, ${color}40)`,
          borderRadius: 4,
          transition: 'height 0.3s',
        }} />
      ))}
    </div>
  );
}

export default function DigitalTwinModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.['digital-twin'] || { title: 'Digital Twin', icon: '🪞' };

  const BASE_UI = {
    pageTitle: moduleConfig.title,
    pageSubtitle: moduleConfig.desc || 'Simulation and scenario modeling',
    
    // Twin items (fully translated)
    twinPolicyImpact: 'Policy Impact Simulation',
    twinBudgetForecast: 'Budget Forecast Model',
    twinRiskAssessment: 'Risk Assessment Twin',
    
    // Statuses
    statusReady: 'Ready',
    statusRunning: 'Running',
    
    // Meta
    scenariosConfigured: 'scenarios configured',
    
    // Buttons
    runSimulation: 'Run Simulation',
    pauseSimulation: 'Pause',
    newTwinModel: 'New Twin Model',
    
    // Create section
    createTitle: 'Create New Digital Twin',
    createDesc: 'Model complex scenarios, test policies, and predict outcomes using AI-powered simulation.',
    
    // Simulation metrics
    simulationMetrics: 'Simulation Metrics',
    accuracy: 'Accuracy',
    confidence: 'Confidence',
    iterations: 'Iterations',
    
    // Contact CTA
    ctaTitle: 'Need Custom Simulations?',
    ctaDesc: 'Our AI experts can build custom digital twins for your organization.',
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
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_TWIN_${verticalId || 'MAIN'}_V2` }); 
      if (m) setUi(t || BASE_UI); 
    })(); 
    return () => { m = false; }; 
  }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

  const twins = [
    { name: ui.twinPolicyImpact, status: ui.statusReady, scenarios: 12 },
    { name: ui.twinBudgetForecast, status: ui.statusRunning, scenarios: 8 },
    { name: ui.twinRiskAssessment, status: ui.statusReady, scenarios: 15 },
  ];

  const simulationData = [45, 62, 78, 55, 89, 72, 95, 68, 82, 76];

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
        {/* Simulation Metrics */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, marginBottom: 24 }}>
          <h3 style={{ color: '#fff', margin: '0 0 20px' }}>{ui.simulationMetrics}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 20, marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>94.2%</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>{ui.accuracy}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: theme.primary }}>87.5%</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>{ui.confidence}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>1,247</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>{ui.iterations}</div>
            </div>
          </div>
          <SimulationChart data={simulationData} color={theme.primary} />
        </div>

        {/* Twin Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 32 }}>
          {twins.map((twin, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <h3 style={{ color: '#fff', margin: 0 }}>{twin.name}</h3>
                <span style={{ padding: '4px 12px', borderRadius: 20, background: twin.status === ui.statusRunning ? `${theme.primary}30` : 'rgba(16,185,129,0.2)', color: twin.status === ui.statusRunning ? theme.primary : '#10b981', fontSize: '0.8rem' }}>{twin.status}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>{twin.scenarios} {ui.scenariosConfigured}</div>
              <button style={{ width: '100%', padding: '12px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>{twin.status === ui.statusRunning ? `⏸️ ${ui.pauseSimulation}` : `▶️ ${ui.runSimulation}`}</button>
            </div>
          ))}
        </div>

        {/* Create New */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 32, border: `1px solid ${theme.cardBorder}`, textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🪞</div>
          <h3 style={{ color: '#fff' }}>{ui.createTitle}</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 500, margin: '0 auto 20px' }}>{ui.createDesc}</p>
          <button style={{ padding: '14px 32px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>+ {ui.newTwinModel}</button>
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
