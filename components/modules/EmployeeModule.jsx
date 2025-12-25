'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

export default function EmployeeModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.employee || { title: 'Employee Management', icon: '👥' };

  const BASE_UI = { pageTitle: moduleConfig.title, pageSubtitle: moduleConfig.desc || 'Workforce analytics and management', backToHome: verticalId ? `Back to ${vertical?.name}` : 'Back to Home' };
  const [ui, setUi] = useState(BASE_UI);

  useEffect(() => { const sp = new URLSearchParams(window.location.search); setLang(sp.get('lang') || 'English'); }, []);
  useEffect(() => { let m = true; (async () => { setDir(RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr'); const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_EMPLOYEE_${verticalId || 'MAIN'}` }); if (m) setUi(t || BASE_UI); })(); return () => { m = false; }; }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

  const employees = [
    { name: 'John Smith', role: 'Senior Analyst', department: 'Compliance', status: 'Active' },
    { name: 'Sarah Johnson', role: 'Project Manager', department: 'Operations', status: 'Active' },
    { name: 'Mike Chen', role: 'Data Scientist', department: 'AI Team', status: 'Active' },
    { name: 'Lisa Anderson', role: 'Director', department: 'Finance', status: 'On Leave' },
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 32 }}>
          {[{ label: 'Total Employees', value: '2,847' }, { label: 'Active Today', value: '2,341' }, { label: 'On Leave', value: '89' }, { label: 'New This Month', value: '45' }].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: `1px solid ${theme.cardBorder}`, textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: theme.primary }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: `1px solid ${theme.cardBorder}` }}>
          {employees.map((emp, i) => (
            <div key={i} style={{ padding: 20, borderBottom: i < employees.length - 1 ? `1px solid ${theme.cardBorder}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${theme.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.primary, fontWeight: 600 }}>{emp.name.split(' ').map(n => n[0]).join('')}</div>
                <div><div style={{ color: '#fff', fontWeight: 500 }}>{emp.name}</div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{emp.role} • {emp.department}</div></div>
              </div>
              <span style={{ padding: '6px 14px', borderRadius: 20, background: emp.status === 'Active' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: emp.status === 'Active' ? '#10b981' : '#f59e0b', fontSize: '0.8rem' }}>{emp.status}</span>
            </div>
          ))}
        </div>
      </main>
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
    </div>
  );
}
