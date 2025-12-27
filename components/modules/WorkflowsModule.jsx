'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOWS MODULE - Full Dynamic Translation + Charts + CTA
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

// Workflow progress chart
function WorkflowChart({ workflows, theme }) {
  const stats = {
    completed: workflows.filter(w => w.status === 'completed').length,
    active: workflows.filter(w => w.status === 'active').length,
    pending: workflows.filter(w => w.status === 'pending').length,
  };
  const total = workflows.length;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="12" 
            strokeDasharray={`${(stats.completed/total)*251.2} 251.2`} />
          <circle cx="50" cy="50" r="40" fill="none" stroke={theme.primary} strokeWidth="12" 
            strokeDasharray={`${(stats.active/total)*251.2} 251.2`}
            strokeDashoffset={`-${(stats.completed/total)*251.2}`} />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{total}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{stats.completed} Completed</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: theme.primary }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{stats.active} Active</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b' }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{stats.pending} Pending</span>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowsModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.workflows || { title: 'Workflows', icon: '⚡' };

  const BASE_UI = {
    pageTitle: moduleConfig.title,
    pageSubtitle: moduleConfig.desc || 'Automated workflow management',
    
    // Stats
    activeWorkflows: 'Active Workflows',
    workflowOverview: 'Workflow Overview',
    
    // Buttons
    createNew: 'Create New Workflow',
    
    // Workflow items (fully translated)
    wfDocApproval: 'Document Approval',
    wfComplianceReview: 'Compliance Review',
    wfBudgetAuth: 'Budget Authorization',
    wfPolicyUpdate: 'Policy Update',
    
    // Statuses
    statusActive: 'active',
    statusPending: 'pending',
    statusCompleted: 'completed',
    
    // Meta
    assignee: 'Assignee',
    steps: 'steps',
    
    // Contact CTA
    ctaTitle: 'Need Custom Workflows?',
    ctaDesc: 'Our team can help automate your business processes.',
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
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_WORKFLOWS_${verticalId || 'MAIN'}_V2` });
      if (m) setUi(t || BASE_UI);
    })();
    return () => { m = false; };
  }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

  const workflows = [
    { id: 1, name: ui.wfDocApproval, status: 'active', steps: 5, completed: 3, assignee: 'John D.' },
    { id: 2, name: ui.wfComplianceReview, status: 'pending', steps: 4, completed: 0, assignee: 'Sarah M.' },
    { id: 3, name: ui.wfBudgetAuth, status: 'active', steps: 6, completed: 4, assignee: 'Mike R.' },
    { id: 4, name: ui.wfPolicyUpdate, status: 'completed', steps: 3, completed: 3, assignee: 'Lisa K.' },
  ];

  const getStatusColor = (status) => {
    if (status === 'completed') return '#10b981';
    if (status === 'active') return theme.primary;
    return '#f59e0b';
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.gradient, direction: dir }}>
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
      
      <header style={{ background: 'rgba(0,0,0,0.3)', borderBottom: `1px solid ${theme.cardBorder}`, padding: '20px 32px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <a href={homeLink} style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.85rem' }}>← {ui.backToHome}</a>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            {vertical && <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>{vertical.icon}</div>}
            <div>
              <h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{moduleConfig.icon} {ui.pageTitle}</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>{ui.pageSubtitle}</p>
            </div>
          </div>
        </div>
      </header>
      
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 32 }}>
        {/* Workflow Overview Chart */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, marginBottom: 24 }}>
          <h3 style={{ color: '#fff', margin: '0 0 20px' }}>{ui.workflowOverview}</h3>
          <WorkflowChart workflows={workflows} theme={theme} />
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: '#fff', margin: 0 }}>{ui.activeWorkflows}</h2>
          <button style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>+ {ui.createNew}</button>
        </div>

        {/* Workflow List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {workflows.map(wf => (
            <div key={wf.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: `1px solid ${theme.cardBorder}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ color: '#fff', fontWeight: 600 }}>{wf.name}</span>
                <span style={{ padding: '4px 12px', borderRadius: 20, background: `${getStatusColor(wf.status)}20`, color: getStatusColor(wf.status), fontSize: '0.8rem' }}>{wf.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {Array.from({ length: wf.steps }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < wf.completed ? theme.primary : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{ui.assignee}: {wf.assignee} • {wf.completed}/{wf.steps} {ui.steps}</div>
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
            <a href={`/contact${qsLang}`} style={{
              padding: '14px 32px',
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 600,
              textDecoration: 'none',
            }}>
              📅 {ui.ctaScheduleDemo}
            </a>
            <a href={`/contact${qsLang}`} style={{
              padding: '14px 32px',
              background: 'rgba(255,255,255,0.1)',
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 10,
              color: '#fff',
              fontWeight: 600,
              textDecoration: 'none',
            }}>
              📧 {ui.ctaContactSales}
            </a>
          </div>
        </div>
      </main>
      
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
    </div>
  );
}
