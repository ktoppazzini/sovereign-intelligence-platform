'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

// ═══════════════════════════════════════════════════════════════════════════
// COMMUNICATION MODULE - Full Dynamic Translation + Charts + CTA
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

// Message activity chart
function MessageActivityChart({ data, color }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: 'flex', gap: 4, height: 50, alignItems: 'flex-end' }}>
      {data.map((value, i) => (
        <div key={i} style={{
          flex: 1,
          height: `${(value / max) * 100}%`,
          minHeight: 4,
          background: `linear-gradient(180deg, ${color}, ${color}40)`,
          borderRadius: 3,
        }} />
      ))}
    </div>
  );
}

export default function CommunicationModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.communication || { title: 'Communication', icon: '💬' };

  const BASE_UI = {
    pageTitle: moduleConfig.title,
    pageSubtitle: moduleConfig.desc || 'Team communication and collaboration',
    
    // Channel labels
    channels: 'Channels',
    directMessages: 'Direct Messages',
    
    // Channel names (fully translated)
    chGeneral: 'General',
    chCompliance: 'Compliance Team',
    chLeadership: 'Leadership',
    chAnnouncements: 'Announcements',
    
    // Last messages (fully translated)
    msgPolicyUpdate: 'New policy update available',
    msgReviewCompleted: 'Review completed for Q4',
    msgMeetingScheduled: 'Meeting scheduled for Monday',
    msgHolidaySchedule: 'Holiday schedule posted',
    
    // Stats
    members: 'members',
    unreadMessages: 'unread messages',
    
    // Buttons
    newChannel: 'New Channel',
    compose: 'Compose Message',
    send: 'Send',
    
    // Chart
    weeklyActivity: 'Weekly Activity',
    
    // Placeholder
    selectChannel: 'Select a channel to start messaging',
    
    // Contact CTA
    ctaTitle: 'Need Enterprise Communication?',
    ctaDesc: 'Secure, AI-powered team collaboration for your organization.',
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
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_COMMUNICATION_${verticalId || 'MAIN'}_V2` });
      if (m) setUi(t || BASE_UI);
    })();
    return () => { m = false; };
  }, [lang, verticalId]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

  const channels = [
    { name: ui.chGeneral, unread: 5, members: 45, lastMessage: ui.msgPolicyUpdate },
    { name: ui.chCompliance, unread: 2, members: 12, lastMessage: ui.msgReviewCompleted },
    { name: ui.chLeadership, unread: 0, members: 8, lastMessage: ui.msgMeetingScheduled },
    { name: ui.chAnnouncements, unread: 1, members: 150, lastMessage: ui.msgHolidaySchedule },
  ];

  const activityData = [45, 62, 78, 55, 89, 42, 95];
  const totalUnread = channels.reduce((a, c) => a + c.unread, 0);

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
        {/* Stats + Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: theme.primary }}>{channels.length}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>{ui.channels}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f59e0b' }}>{totalUnread}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)' }}>{ui.unreadMessages}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, gridColumn: 'span 2' }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: 12 }}>{ui.weeklyActivity}</div>
            <MessageActivityChart data={activityData} color={theme.primary} />
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
          {/* Sidebar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#fff', margin: 0 }}>{ui.channels}</h3>
              <button style={{ padding: '8px 16px', background: `${theme.primary}20`, border: 'none', borderRadius: 8, color: theme.primary, fontSize: '0.85rem', cursor: 'pointer' }}>+ {ui.newChannel}</button>
            </div>
            {channels.map((ch, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14, border: `1px solid ${theme.cardBorder}`, marginBottom: 10, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 500 }}># {ch.name}</span>
                  {ch.unread > 0 && <span style={{ background: theme.primary, color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem' }}>{ch.unread}</span>}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: 6 }}>{ch.lastMessage}</div>
              </div>
            ))}
          </div>

          {/* Chat Area */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderBottom: `1px solid ${theme.cardBorder}`, paddingBottom: 16, marginBottom: 16 }}>
              <h3 style={{ color: '#fff', margin: 0 }}>#{ui.chGeneral}</h3>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>45 {ui.members}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'rgba(255,255,255,0.4)', minHeight: 200 }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>💬</div>
              <p>{ui.selectChannel}</p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <input type="text" placeholder={ui.compose} style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.cardBorder}`, borderRadius: 10, color: '#fff', outline: 'none' }} />
              <button style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>{ui.send}</button>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div style={{
          background: `linear-gradient(135deg, ${theme.primary}15, ${theme.secondary || theme.primary}15)`,
          borderRadius: 16,
          padding: 32,
          border: `1px solid ${theme.primary}30`,
          textAlign: 'center',
          marginTop: 32,
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
      <style jsx global>{`@media (max-width: 767px) { main > div:last-of-type { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
