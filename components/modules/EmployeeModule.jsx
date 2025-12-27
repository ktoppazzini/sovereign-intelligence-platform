'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYEE MODULE - Full Dynamic Translation + Charts + CTA
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

// Department distribution chart
function DepartmentChart({ data, colors }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ display: 'flex', height: 12, flex: 1, borderRadius: 6, overflow: 'hidden' }}>
        {data.map((item, i) => (
          <div key={i} style={{ width: `${(item.value / total) * 100}%`, background: colors[i], transition: 'width 0.5s' }} />
        ))}
      </div>
    </div>
  );
}

export default function EmployeeModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.employee || { title: 'Employee Management', icon: '👥' };

  const BASE_UI = {
    pageTitle: moduleConfig.title,
    pageSubtitle: moduleConfig.desc || 'Workforce analytics and management',
    
    // Stats (fully translated)
    totalEmployees: 'Total Employees',
    activeToday: 'Active Today',
    onLeave: 'On Leave',
    newThisMonth: 'New This Month',
    
    // Employee items
    empJohn: 'John Smith',
    empSarah: 'Sarah Johnson',
    empMike: 'Mike Chen',
    empLisa: 'Lisa Anderson',
    
    // Roles
    roleSeniorAnalyst: 'Senior Analyst',
    roleProjectManager: 'Project Manager',
    roleDataScientist: 'Data Scientist',
    roleDirector: 'Director',
    
    // Departments
    deptCompliance: 'Compliance',
    deptOperations: 'Operations',
    deptAiTeam: 'AI Team',
    deptFinance: 'Finance',
    
    // Statuses
    statusActive: 'Active',
    statusOnLeave: 'On Leave',
    
    // Chart
    departmentBreakdown: 'Department Breakdown',
    
    // Contact CTA
    ctaTitle: 'Need HR Intelligence Solutions?',
    ctaDesc: 'AI-powered workforce analytics for your enterprise.',
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
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_EMPLOYEE_${verticalId || 'MAIN'}_V2` }); 
      if (m) setUi(t || BASE_UI); 
    })(); 
    return () => { m = false; }; 
  }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

  const stats = [
    { label: ui.totalEmployees, value: '2,847' },
    { label: ui.activeToday, value: '2,341' },
    { label: ui.onLeave, value: '89' },
    { label: ui.newThisMonth, value: '45' },
  ];

  const employees = [
    { name: ui.empJohn, role: ui.roleSeniorAnalyst, department: ui.deptCompliance, status: ui.statusActive },
    { name: ui.empSarah, role: ui.roleProjectManager, department: ui.deptOperations, status: ui.statusActive },
    { name: ui.empMike, role: ui.roleDataScientist, department: ui.deptAiTeam, status: ui.statusActive },
    { name: ui.empLisa, role: ui.roleDirector, department: ui.deptFinance, status: ui.statusOnLeave },
  ];

  const departmentData = [
    { label: ui.deptCompliance, value: 245 },
    { label: ui.deptOperations, value: 412 },
    { label: ui.deptAiTeam, value: 156 },
    { label: ui.deptFinance, value: 189 },
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 32 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: `1px solid ${theme.cardBorder}`, textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: theme.primary }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Department Breakdown */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, marginBottom: 24 }}>
          <h3 style={{ color: '#fff', margin: '0 0 16px' }}>{ui.departmentBreakdown}</h3>
          <DepartmentChart data={departmentData} colors={[theme.primary, theme.secondary || '#8b5cf6', '#10b981', '#f59e0b']} />
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {departmentData.map((dept, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: [theme.primary, theme.secondary || '#8b5cf6', '#10b981', '#f59e0b'][i] }} />
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{dept.label}: {dept.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Employee List */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: `1px solid ${theme.cardBorder}`, marginBottom: 24 }}>
          {employees.map((emp, i) => (
            <div key={i} style={{ padding: 20, borderBottom: i < employees.length - 1 ? `1px solid ${theme.cardBorder}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${theme.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.primary, fontWeight: 600 }}>{emp.name.split(' ').map(n => n[0]).join('')}</div>
                <div><div style={{ color: '#fff', fontWeight: 500 }}>{emp.name}</div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{emp.role} • {emp.department}</div></div>
              </div>
              <span style={{ padding: '6px 14px', borderRadius: 20, background: emp.status === ui.statusActive ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: emp.status === ui.statusActive ? '#10b981' : '#f59e0b', fontSize: '0.8rem' }}>{emp.status}</span>
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
