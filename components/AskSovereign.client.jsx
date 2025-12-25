'use client';
import { useState, useRef, useEffect } from 'react';
import { getUiTranslations } from '../lib/i18nClient';

/**
 * AskSovereign - AI Chat Interface
 * Allows users to ask questions about their report and get AI-powered answers
 * Supports 207 languages via dynamic translation
 */

const BASE_UI = {
  title: 'Ask Sovereign',
  greeting: "Hello! I'm Sovereign, your AI intelligence assistant. I've analyzed your report and I'm ready to answer any questions about the findings, recommendations, or help you dig deeper into specific areas. What would you like to know?",
  placeholder: 'Ask me anything about your report...',
  send: 'Send',
  thinking: 'Thinking...',
  errorMessage: "I apologize, but I encountered an issue processing your question. Please try again or rephrase your question.",
  suggestionsTitle: 'Suggested Questions',
  suggestion1: "What are the top 3 priority actions?",
  suggestion2: "Summarize the key risks identified",
  suggestion3: "What's the expected ROI of recommendations?",
  suggestion4: "Compare this to industry benchmarks",
  suggestion5: "What resources are needed for implementation?",
  close: 'Close',
  newChat: 'New Chat',
};

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian', 'Pashto', 'Sindhi'];

export default function AskSovereign({ reportHtml, reportContext, verticalId, color = '#3b82f6', lang = 'English' }) {
  const [ui, setUi] = useState(BASE_UI);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isRTL = RTL_LANGUAGES.includes(lang);

  // Load translations and set initial message
  useEffect(() => {
    (async () => {
      try {
        const { t } = await getUiTranslations({
          base: BASE_UI,
          lang,
          cachePrefix: 'SI_AskSovereign',
          setDir: false,
        });
        const translations = t || BASE_UI;
        setUi(translations);
        // Set initial greeting with translated text
        setMessages([{
          role: 'assistant',
          content: translations.greeting,
        }]);
      } catch (err) {
        console.warn('AskSovereign translation failed:', err);
        setMessages([{
          role: 'assistant',
          content: BASE_UI.greeting,
        }]);
      }
    })();
  }, [lang]);

  const suggestedQuestions = [
    ui.suggestion1,
    ui.suggestion2,
    ui.suggestion3,
    ui.suggestion4,
    ui.suggestion5,
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          reportContext: reportHtml ? reportHtml.substring(0, 15000) : reportContext,
          verticalId,
          lang,
        }),
      });

      if (!res.ok) throw new Error('Failed to get response');
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: ui.errorMessage
      }]);
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

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: isRTL ? 'auto' : 24,
          left: isRTL ? 24 : 'auto',
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          boxShadow: `0 4px 20px ${color}40`,
          transition: 'transform 0.2s, box-shadow 0.2s',
          zIndex: 9998,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = `0 6px 30px ${color}60`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = `0 4px 20px ${color}40`;
        }}
        title={ui.title}
      >
        🤖
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: isRTL ? 'auto' : 24,
      left: isRTL ? 24 : 'auto',
      width: 400,
      maxWidth: 'calc(100vw - 48px)',
      height: 550,
      maxHeight: 'calc(100vh - 48px)',
      background: 'linear-gradient(135deg, #1a2942 0%, #0d1a2d 100%)',
      borderRadius: 16,
      border: `1px solid ${color}30`,
      boxShadow: `0 10px 40px rgba(0,0,0,0.5)`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 9999,
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: `${color}10`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${color} 0%, #8b5cf6 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}>
            🤖
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Ask Sovereign</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>AI Report Assistant</div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            width: 32,
            height: 32,
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' 
                ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`
                : 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: 14,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '16px 16px 16px 4px',
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>●</span>
              <span style={{ animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.2s' }}>●</span>
              <span style={{ animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.4s' }}>●</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 2 && (
        <div style={{
          padding: '0 16px 12px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          {suggestedQuestions.slice(0, 3).map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              style={{
                padding: '6px 12px',
                borderRadius: 16,
                background: `${color}15`,
                border: `1px solid ${color}30`,
                color: color,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: 16,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        gap: 12,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about your report..."
          rows={1}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 14,
            resize: 'none',
            outline: 'none',
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: input.trim() && !loading ? color : 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ➤
        </button>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
