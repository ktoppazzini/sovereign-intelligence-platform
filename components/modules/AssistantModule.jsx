'use client';

import { useState, useEffect, useRef } from 'react';
import { getUiTranslations } from '../../lib/i18nClient';
import { profileManager, CORE_IDENTITY } from '../../lib/agentProfile';
import { getVerticalConfig } from '../../lib/verticalConfig';

// ═══════════════════════════════════════════════════════════════════════════
// ASSISTANT MODULE - Shared AI Chat Component
// Renders AI assistant with vertical-specific theming
// ═══════════════════════════════════════════════════════════════════════════

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian'];

export default function AssistantModule({ verticalId = null }) {
  const [lang, setLang] = useState('English');
  const [dir, setDir] = useState('ltr');
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  const vertical = verticalId ? getVerticalConfig(verticalId) : null;
  const theme = vertical?.theme || {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)',
    cardBorder: 'rgba(255,255,255,0.08)',
  };
  const moduleConfig = vertical?.modules?.assistant || { title: 'AI Assistant', icon: '🤖' };

  const BASE_UI = {
    pageTitle: moduleConfig.title || 'AI Assistant',
    pageSubtitle: moduleConfig.desc || 'Chat with your intelligent assistant',
    
    placeholder: 'Type your message...',
    send: 'Send',
    thinking: 'Thinking...',
    
    welcomeTitle: `Hello! I am ${vertical?.name || 'Sovereign'} AI.`,
    welcomeMessage: `I'm your intelligent assistant specialized in ${vertical?.tagline?.toLowerCase() || 'enterprise intelligence'}. How can I help you today?`,
    
    suggestionsTitle: 'Try asking me:',
    suggestion1: verticalId === 'defense' ? 'Analyze threat intelligence' : verticalId === 'pharma' ? 'Review drug trial data' : 'Generate a reform report',
    suggestion2: verticalId === 'defense' ? 'Security assessment' : verticalId === 'pharma' ? 'Check compliance status' : 'Analyze policy impact',
    suggestion3: verticalId === 'defense' ? 'Mission planning' : verticalId === 'pharma' ? 'Literature review' : 'Explain regulations',
    suggestion4: 'Help with planning',
    
    backToHome: verticalId ? `Back to ${vertical?.name}` : 'Back to Home',
  };

  const [ui, setUi] = useState(BASE_UI);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setLang(sp.get('lang') || 'English');
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const newDir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
      setDir(newDir);
      document.documentElement.setAttribute('dir', newDir);

      const { t } = await getUiTranslations({
        base: BASE_UI,
        lang,
        cachePrefix: `SI_ASSISTANT_${verticalId || 'MAIN'}`,
        setDir: true,
      });
      if (mounted) setUi(t || BASE_UI);
    })();
    return () => { mounted = false; };
  }, [lang, verticalId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const qsLang = `?lang=${encodeURIComponent(lang)}`;
  const homeLink = verticalId ? `/${verticalId}${qsLang}` : `/${qsLang}`;

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;
    const query = inputValue.trim();
    setInputValue('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setLoading(true);
    
    try {
      const res = await fetch('/api/gpt-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: query, 
          lang, 
          context: verticalId ? `You are the ${vertical?.name} AI assistant specialized in ${vertical?.tagline}.` : undefined 
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || data.error || 'I apologize, I could not process that request.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I apologize, there was an error processing your request. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (suggestion) => {
    setInputValue(suggestion);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.gradient,
      direction: dir,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Classification Banner for Defense */}
      {vertical?.classification?.show && (
        <div style={{
          background: vertical.classification.color,
          padding: '4px 0',
          textAlign: 'center',
          color: '#000',
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '2px',
        }}>
          {vertical.classification.level}
        </div>
      )}

      {/* Header */}
      <header style={{
        background: 'rgba(0,0,0,0.3)',
        borderBottom: `1px solid ${theme.cardBorder}`,
        padding: '16px 24px',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {vertical && (
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
              }}>
                {vertical.icon}
              </div>
            )}
            <div>
              <h1 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {moduleConfig.icon || '🤖'} {ui.pageTitle}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.8rem' }}>{ui.pageSubtitle}</p>
            </div>
          </div>
          <a href={homeLink} style={{ color: theme.primary, textDecoration: 'none', fontSize: '0.85rem' }}>
            ← {ui.backToHome}
          </a>
        </div>
      </header>

      {/* Chat Area */}
      <main style={{ flex: 1, maxWidth: 1000, margin: '0 auto', width: '100%', padding: 24, display: 'flex', flexDirection: 'column' }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 20 }}>
          {messages.length === 0 ? (
            // Welcome Screen
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                margin: '0 auto 24px',
              }}>
                {vertical?.icon || '🤖'}
              </div>
              <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 600, margin: '0 0 12px' }}>
                {ui.welcomeTitle}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 500, margin: '0 auto 32px', lineHeight: 1.6 }}>
                {ui.welcomeMessage}
              </p>
              
              {/* Suggestions */}
              <div style={{ marginTop: 24 }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: 12 }}>{ui.suggestionsTitle}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                  {[ui.suggestion1, ui.suggestion2, ui.suggestion3, ui.suggestion4].map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestion(sug)}
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${theme.cardBorder}`,
                        borderRadius: 20,
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = `${theme.primary}20`}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Messages List
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '80%',
                    padding: '14px 18px',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.role === 'user' 
                      ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})` 
                      : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: '18px 18px 18px 4px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '0.95rem',
                  }}>
                    {ui.thinking}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 16,
          padding: '12px 16px',
          border: `1px solid ${theme.cardBorder}`,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={ui.placeholder}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '1rem',
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !inputValue.trim()}
            style={{
              padding: '10px 20px',
              background: loading || !inputValue.trim() 
                ? 'rgba(255,255,255,0.1)' 
                : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary || theme.primary})`,
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 600,
              cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !inputValue.trim() ? 0.5 : 1,
            }}
          >
            {loading ? '...' : ui.send}
          </button>
        </div>
      </main>

      {/* Classification Banner Bottom for Defense */}
      {vertical?.classification?.show && (
        <div style={{
          background: vertical.classification.color,
          padding: '4px 0',
          textAlign: 'center',
          color: '#000',
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '2px',
        }}>
          {vertical.classification.level}
        </div>
      )}

      {/* Responsive Styles */}
      <style jsx global>{`
        @media (max-width: 767px) {
          header { padding: 12px 16px !important; }
          header h1 { font-size: 1rem !important; }
          main { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
