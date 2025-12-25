'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { getVerticalConfig } from '../../lib/verticalConfig';

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

const CHANNELS = [
  { id: 1, name: 'General', unread: 5, members: 45, lastMessage: 'New policy update available' },
  { id: 2, name: 'Compliance Team', unread: 2, members: 12, lastMessage: 'Review completed for Q4' },
  { id: 3, name: 'Leadership', unread: 0, members: 8, lastMessage: 'Meeting scheduled for Monday' },
  { id: 4, name: 'Announcements', unread: 1, members: 150, lastMessage: 'Holiday schedule posted' },
];

export default function CommunicationModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || { primary: '#3b82f6', secondary: '#8b5cf6', gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)', cardBorder: 'rgba(255,255,255,0.08)' };
  const moduleConfig = vertical?.modules?.communication || { title: 'Communication', icon: '💬' };

  const BASE_UI = {
    pageTitle: moduleConfig.title,
    pageSubtitle: moduleConfig.desc || 'Team communication and collaboration',
    channels: 'Channels',
    directMessages: 'Direct Messages',
    newChannel: 'New Channel',
    compose: 'Compose Message',
    backToHome: verticalId ? `Back to ${vertical?.name}` : 'Back to Home',
  };
  const [ui, setUi] = useState(BASE_UI);

  useEffect(() => { const sp = new URLSearchParams(window.location.search); setLang(sp.get('lang') || 'English'); }, []);
  useEffect(() => {
    let m = true;
    (async () => {
      setDir(RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr');
      const { t } = await getUiTranslations({ base: BASE_UI, lang, cachePrefix: `SI_COMMUNICATION_${verticalId || 'MAIN'}` });
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
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 32, display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: '#fff', margin: 0 }}>{ui.channels}</h3>
            <button style={{ padding: '8px 16px', background: `${theme.primary}20`, border: 'none', borderRadius: 8, color: theme.primary, fontSize: '0.85rem', cursor: 'pointer' }}>+ {ui.newChannel}</button>
          </div>
          {CHANNELS.map(ch => (
            <div key={ch.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14, border: `1px solid ${theme.cardBorder}`, marginBottom: 10, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 500 }}># {ch.name}</span>
                {ch.unread > 0 && <span style={{ background: theme.primary, color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem' }}>{ch.unread}</span>}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: 6 }}>{ch.lastMessage}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: `1px solid ${theme.cardBorder}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: `1px solid ${theme.cardBorder}`, paddingBottom: 16, marginBottom: 16 }}>
            <h3 style={{ color: '#fff', margin: 0 }}># General</h3>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>45 members</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>💬</div>
            <p>Select a channel to start messaging</p>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <input type="text" placeholder={ui.compose} style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.cardBorder}`, borderRadius: 10, color: '#fff', outline: 'none' }} />
            <button style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Send</button>
          </div>
        </div>
      </main>
      {vertical?.classification?.show && <div style={{ background: vertical.classification.color, padding: '4px 0', textAlign: 'center', color: '#000', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px' }}>{vertical.classification.level}</div>}
      <style jsx global>{`@media (max-width: 767px) { main { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
