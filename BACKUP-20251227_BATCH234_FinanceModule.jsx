'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';import { loadModuleTranslations } from '../../lib/dynamicTranslation';import { getVerticalConfig } from '../../lib/verticalConfig';

// ═══════════════════════════════════════════════════════════════════════════
// FINANCE MODULE - Full Dynamic Translation + Charts + CTA
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

// Budget donut chart
function BudgetDonut({ spent, total, color }) {
  const percentage = (spent / total) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: 100, height: 100 }}>
      <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
        <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s' }} />
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{Math.round(percentage)}%</div>
      </div>
    </div>
  );
}

// Monthly trend bars
function TrendChart({ data, color }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', gap: 6, height: 80, alignItems: 'flex-end' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: '100%', height: `${(d.value / max) * 100}%`, minHeight: 4, background: `linear-gradient(180deg, ${color}, ${color}40)`, borderRadius: 4, transition: 'height 0.3s' }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function FinanceModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.finance || { title: 'Finance', icon: '💰' };

  const BASE_UI = {
    pageTitle: moduleConfig.title,
    pageSubtitle: moduleConfig.desc || 'Financial analytics and reporting',
    
    // Stats labels (fully translated)
    totalBudget: 'Total Budget',
    spentYtd: 'Spent YTD',
    remaining: 'Remaining',
    forecasted: 'Forecasted',
    
    // Transaction labels
    recentTransactions: 'Recent Transactions',
    txnSoftwareLicense: 'Software License Renewal',
    txnConsultingServices: 'Consulting Services',
    txnBudgetAllocation: 'Budget Allocation Q1',
    txnHardwarePurchase: 'Hardware Purchase',
    txnTrainingProgram: 'Training Program',
    
    // Dates
    dateDec24: 'Dec 24',
    dateDec23: 'Dec 23',
    dateDec20: 'Dec 20',
    dateDec18: 'Dec 18',
    dateDec15: 'Dec 15',
    
    // Chart titles
    budgetUtilization: 'Budget Utilization',
    monthlyTrend: 'Monthly Spend Trend',
    
    // Months
    monthJan: 'Jan',
    monthFeb: 'Feb',
    monthMar: 'Mar',
    monthApr: 'Apr',
    monthMay: 'May',
    monthJun: 'Jun',
    
    // Contact CTA
    ctaTitle: 'Need Financial Intelligence?',
    ctaDesc: 'AI-powered budget analytics and forecasting for your organization.',
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
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_FINANCE_${verticalId || 'MAIN'}_V2` }); 
      if (m) setUi(t || BASE_UI); 
    })(); 
    return () => { m = false; }; 
  }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

  const stats = [
    { label: ui.totalBudget, value: '$12.5M', change: '+5%', color: '#10b981' },
    { label: ui.spentYtd, value: '$8.2M', change: '66%', color: theme.primary },
    { label: ui.remaining, value: '$4.3M', change: '34%', color: '#f59e0b' },
    { label: ui.forecasted, value: '$11.8M', change: '-6%', color: '#8b5cf6' },
  ];

  const transactions = [
    { desc: ui.txnSoftwareLicense, amount: '-$45,000', date: ui.dateDec24 },
    { desc: ui.txnConsultingServices, amount: '-$125,000', date: ui.dateDec23 },
    { desc: ui.txnBudgetAllocation, amount: '+$2,500,000', date: ui.dateDec20 },
    { desc: ui.txnHardwarePurchase, amount: '-$78,500', date: ui.dateDec18 },
    { desc: ui.txnTrainingProgram, amount: '-$32,000', date: ui.dateDec15 },
  ];

  const trendData = [
    { label: ui.monthJan, value: 1200000 },
    { label: ui.monthFeb, value: 1450000 },
    { label: ui.monthMar, value: 980000 },
    { label: ui.monthApr, value: 1680000 },
    { label: ui.monthMay, value: 1320000 },
    { label: ui.monthJun, value: 1550000 },
  ];

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
        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ color: s.change.startsWith('+') ? '#10b981' : s.change.startsWith('-') ? '#ef4444' : 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{s.change}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 32 }}>
          {/* Budget Donut */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
            <h3 style={{ color: '#fff', margin: '0 0 20px' }}>{ui.budgetUtilization}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <BudgetDonut spent={8.2} total={12.5} color={theme.primary} />
              <div>
                <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600 }}>$8.2M / $12.5M</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{ui.spentYtd}</div>
              </div>
            </div>
          </div>
          
          {/* Monthly Trend */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}` }}>
            <h3 style={{ color: '#fff', margin: '0 0 20px' }}>{ui.monthlyTrend}</h3>
            <TrendChart data={trendData} color={theme.primary} />
          </div>
        </div>

        {/* Transactions */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, marginBottom: 24 }}>
          <h3 style={{ color: '#fff', margin: '0 0 20px' }}>{ui.recentTransactions}</h3>
          {transactions.map((t, i) => (
            <div key={i} style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 10, marginBottom: i < transactions.length - 1 ? 10 : 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#fff' }}>{t.desc}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{t.date}</div>
              </div>
              <div style={{ color: t.amount.startsWith('+') ? '#10b981' : '#ef4444', fontWeight: 600 }}>{t.amount}</div>
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
