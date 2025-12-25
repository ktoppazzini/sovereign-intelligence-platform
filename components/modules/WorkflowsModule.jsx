'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

const WORKFLOWS = [
  { id: 1, name: 'Document Approval', status: 'active', steps: 5, completed: 3, assignee: 'John D.' },
  { id: 2, name: 'Compliance Review', status: 'pending', steps: 4, completed: 0, assignee: 'Sarah M.' },
  { id: 3, name: 'Budget Authorization', status: 'active', steps: 6, completed: 4, assignee: 'Mike R.' },
  { id: 4, name: 'Policy Update', status: 'completed', steps: 3, completed: 3, assignee: 'Lisa K.' },
];

export default function WorkflowsModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.workflows || { title: 'Workflows', icon: '⚡' };

  const BASE_UI = {
    pageTitle: moduleConfig.title,
    pageSubtitle: moduleConfig.desc || 'Automated workflow management',
    activeWorkflows: 'Active Workflows',
    createNew: 'Create New Workflow',
    backToHome: verticalId ? `Back to ${vertical?.name}` : 'Back to Home',
  };
  const [ui, setUi] = useState(BASE_UI);

  useEffect(() => { const sp = new URLSearchParams(window.location.search); setLang(sp.get('lang') || 'English'); }, []);
  useEffect(() => {
    let m = true;
    (async () => {
      setDir(RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr');
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_WORKFLOWS_${verticalId || 'MAIN'}` });
      if (m) setUi(t || BASE_UI);
    })();
    return () => { m = false; };
  }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: '#fff', margin: 0 }}>{ui.activeWorkflows}</h2>
          <button style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>+ {ui.createNew}</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {WORKFLOWS.map(wf => (
            <div key={wf.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: `1px solid ${theme.cardBorder}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ color: '#fff', fontWeight: 600 }}>{wf.name}</span>
                <span style={{ padding: '4px 12px', borderRadius: 20, background: wf.status === 'completed' ? 'rgba(16,185,129,0.2)' : wf.status === 'active' ? `${theme.primary}30` : 'rgba(245,158,11,0.2)', color: wf.status === 'completed' ? '#10b981' : wf.status === 'active' ? theme.primary : '#f59e0b', fontSize: '0.8rem' }}>{wf.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {Array.from({ length: wf.steps }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < wf.completed ? theme.primary : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Assignee: {wf.assignee} • {wf.completed}/{wf.steps} steps</div>
            </div>
          ))}
        </div>
      </main>
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
    </div>
  );
}
