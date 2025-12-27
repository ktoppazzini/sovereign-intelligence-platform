'use client';
import { useState, useRef, useEffect } from 'react';
import { getUiTranslations } from '../lib/i18nClient';
import { loadModuleTranslations, ensureTranslatedResponse } from '../lib/dynamicTranslation';

/**
 * AskSovereign - Premium AI Chat Interface
 * Modern glassmorphism design with smooth animations
 * Supports 207 languages via dynamic translation
 * 
 * @version 2.0.0 - Premium UI Redesign
 */

const BASE_UI = {
  title: 'Sovereign AI',
  subtitle: 'Intelligence Assistant',
  greeting: "Hey! 👋 I'm Sovereign — and honestly? I've been looking forward to this.\n\nI've dug through your report and I have THOUGHTS. The good kind. The kind that make me want to grab a coffee and map this out on a whiteboard with you.\n\nSo what's the vibe — want to start with the juicy findings, poke holes in the recommendations, or just tell me what's keeping you up at night? I'm all in, whatever direction you want to take this.",
  placeholder: 'What are we diving into?',
  send: 'Send',
  thinking: 'Cooking up something good...',
  errorMessage: "Okay, that didn't land right — totally on me. Give me another shot?",
  suggestionsTitle: 'Let\'s Talk About...',
  suggestion1: "What's the ONE thing I should focus on?",
  suggestion2: "Where are the hidden risks here?",
  suggestion3: "Talk me through the ROI story",
  suggestion4: "How does this stack up against the best?",
  suggestion5: "What's this actually going to take?",
  close: 'Close',
  newChat: 'Start Fresh',
  online: 'Ready when you are',
  powered: 'Powered by Sovereign Intelligence',
};

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian', 'Pashto', 'Sindhi'];

// Premium animated AI avatar component - Luxury design
function SovereignAvatar({ size = 48, animated = true, pulse = false }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      boxShadow: pulse 
        ? '0 0 30px rgba(212, 175, 55, 0.5), 0 0 60px rgba(212, 175, 55, 0.2), inset 0 0 20px rgba(212, 175, 55, 0.1)'
        : '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(212, 175, 55, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      animation: animated ? 'avatarGlow 4s ease-in-out infinite' : 'none',
    }}>
      {/* Outer luxury ring */}
      <div style={{
        position: 'absolute',
        inset: -2,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #d4af37 0%, #f4e4bc 25%, #d4af37 50%, #aa8c2c 75%, #d4af37 100%)',
        zIndex: -1,
        animation: animated ? 'ringRotate 8s linear infinite' : 'none',
      }} />
      
      {/* Inner dark circle */}
      <div style={{
        position: 'absolute',
        inset: 2,
        borderRadius: '50%',
        background: 'linear-gradient(145deg, #1a1a2e 0%, #0f0f23 100%)',
        boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)',
      }} />
      
      {/* Shine effect */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '15%',
        width: '35%',
        height: '25%',
        borderRadius: '50%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)',
        filter: 'blur(2px)',
      }} />
      
      {/* Premium Crown/Diamond Icon */}
      <svg 
        width={size * 0.5} 
        height={size * 0.5} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
      >
        {/* Premium S monogram with crown accent */}
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f4e4bc" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#aa8c2c" />
          </linearGradient>
          <linearGradient id="goldGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff9e6" />
            <stop offset="50%" stopColor="#f4e4bc" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
        </defs>
        {/* Crown top */}
        <path d="M12 2L14 6L18 4L16 9H8L6 4L10 6L12 2Z" fill="url(#goldGradLight)" />
        {/* Stylized S */}
        <path 
          d="M15.5 10C15.5 10 14.5 9 12 9C9.5 9 8.5 10.5 8.5 11.5C8.5 12.5 9.5 13 12 13.5C14.5 14 15.5 14.5 15.5 16C15.5 17.5 14 19 12 19C10 19 8.5 18 8.5 18" 
          stroke="url(#goldGrad)" 
          strokeWidth="2" 
          strokeLinecap="round"
          fill="none"
        />
        {/* Diamond accents */}
        <circle cx="6" cy="21" r="1.5" fill="url(#goldGradLight)" />
        <circle cx="18" cy="21" r="1.5" fill="url(#goldGradLight)" />
        <circle cx="12" cy="22" r="1" fill="url(#goldGrad)" />
      </svg>
      
      {/* Pulse ring for active state */}
      {pulse && (
        <>
          <div style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            border: '2px solid rgba(212, 175, 55, 0.6)',
            animation: 'pulseRing 2s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute',
            inset: -12,
            borderRadius: '50%',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            animation: 'pulseRing 2s ease-out 0.5s infinite',
          }} />
        </>
      )}
      
      {/* Floating particles for premium effect */}
      {animated && (
        <div style={{
          position: 'absolute',
          inset: -8,
          borderRadius: '50%',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: 'absolute',
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: 'rgba(212, 175, 55, 0.8)',
              boxShadow: '0 0 6px rgba(212, 175, 55, 0.6)',
              animation: `particleFloat${i} ${3 + i}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

// Typing indicator with premium gold animation
function TypingIndicator() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '18px 22px',
      background: 'rgba(212, 175, 55, 0.04)',
      backdropFilter: 'blur(10px)',
      borderRadius: 22,
      border: '1px solid rgba(212, 175, 55, 0.15)',
    }}>
      <div style={{ display: 'flex', gap: 5 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #d4af37 0%, #f4e4bc 100%)',
            boxShadow: '0 0 8px rgba(212, 175, 55, 0.4)',
            animation: `typingBounce 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ color: 'rgba(212, 175, 55, 0.7)', fontSize: 13, marginLeft: 6, fontWeight: 500 }}>
        Sovereign is thinking...
      </span>
    </div>
  );
}

export default function AskSovereign({ reportHtml, reportContext, verticalId, color = '#667eea', lang = 'English' }) {
  const [ui, setUi] = useState(BASE_UI);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isRTL = RTL_LANGUAGES.includes(lang);

  // Voice synthesis for Sovereign's charismatic voice
  const speakMessage = (text, index) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    // If already speaking this message, stop it
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Clean text for speech (remove emojis and formatting)
    const cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // symbols
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // transport
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // flags
      .replace(/[\u{2600}-\u{26FF}]/gu, '')   // misc
      .replace(/[\u{2700}-\u{27BF}]/gu, '')   // dingbats
      .replace(/\*\*/g, '')                   // bold markers
      .replace(/\n+/g, '. ')                  // newlines to pauses
      .trim();
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Find the best voice - prefer natural/enhanced voices
    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = voices.filter(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Natural') || v.name.includes('Enhanced') || v.name.includes('Premium') || v.name.includes('Samantha') || v.name.includes('Alex'))
    );
    
    if (preferredVoices.length > 0) {
      utterance.voice = preferredVoices[0];
    } else {
      // Fallback to any English voice
      const englishVoice = voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) utterance.voice = englishVoice;
    }
    
    // Charismatic voice settings - engaging and warm
    utterance.rate = 1.0;    // Natural pace
    utterance.pitch = 1.05;  // Slightly higher for warmth
    utterance.volume = 1.0;
    
    utterance.onstart = () => setSpeakingIndex(index);
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    
    window.speechSynthesis.speak(utterance);
  };
  
  // Preload voices (some browsers need this)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices(); // Trigger voice list load
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);
  
  // Stop speaking when chat closes
  useEffect(() => {
    if (!isOpen && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
    }
  }, [isOpen]);

  // Load translations and set initial message
  useEffect(() => {
    (async () => {
      try {
        const { t } = await getUiTranslations({
          base: BASE_UI,
          lang,
          cachePrefix: 'SI_AskSovereign_v2',
          setDir: false,
        });
        const translations = t || BASE_UI;
        setUi(translations);
        setMessages([{
          role: 'assistant',
          content: translations.greeting,
          timestamp: new Date(),
        }]);
      } catch (err) {
        console.warn('AskSovereign translation failed:', err);
        setMessages([{
          role: 'assistant',
          content: BASE_UI.greeting,
          timestamp: new Date(),
        }]);
      }
    })();
  }, [lang]);

  const suggestedQuestions = [
    { text: ui.suggestion1, icon: '🎯' },
    { text: ui.suggestion2, icon: '⚠️' },
    { text: ui.suggestion3, icon: '📈' },
    { text: ui.suggestion4, icon: '📊' },
    { text: ui.suggestion5, icon: '👥' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const handleSend = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const userMessage = { role: 'user', content: messageText, timestamp: new Date() };
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
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response,
        timestamp: new Date(),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: ui.errorMessage,
        timestamp: new Date(),
        isError: true,
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

  const handleNewChat = () => {
    setMessages([{
      role: 'assistant',
      content: ui.greeting,
      timestamp: new Date(),
    }]);
  };

  // Premium floating button when closed
  if (!isOpen) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: isRTL ? 'auto' : 24,
            left: isRTL ? 24 : 'auto',
            width: isHovered ? 200 : 68,
            height: 68,
            borderRadius: 34,
            background: 'linear-gradient(145deg, #1a1a2e 0%, #0f0f23 100%)',
            border: '2px solid transparent',
            borderImage: 'linear-gradient(135deg, #d4af37 0%, #f4e4bc 50%, #d4af37 100%) 1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isHovered ? 'flex-start' : 'center',
            padding: isHovered ? '0 20px' : 0,
            gap: 14,
            boxShadow: isHovered 
              ? '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 40px rgba(212, 175, 55, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(212, 175, 55, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 9998,
            overflow: 'hidden',
          }}
          title={ui.title}
        >
          {/* Gold border effect */}
          <div style={{
            position: 'absolute',
            inset: -2,
            borderRadius: 36,
            background: 'linear-gradient(135deg, #d4af37 0%, #f4e4bc 25%, #d4af37 50%, #aa8c2c 75%, #d4af37 100%)',
            zIndex: -1,
            animation: isHovered ? 'ringRotate 4s linear infinite' : 'none',
          }} />
          <div style={{
            position: 'absolute',
            inset: 2,
            borderRadius: 32,
            background: 'linear-gradient(145deg, #1a1a2e 0%, #0f0f23 100%)',
            zIndex: -1,
          }} />
          
          <SovereignAvatar size={44} animated={true} />
          <span style={{
            color: '#d4af37',
            fontWeight: 700,
            fontSize: 15,
            whiteSpace: 'nowrap',
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? 'translateX(0)' : 'translateX(-10px)',
            transition: 'all 0.4s ease',
            letterSpacing: '0.5px',
            textShadow: '0 2px 10px rgba(212, 175, 55, 0.3)',
          }}>
            Ask Sovereign
          </span>
        </button>
        <style>{globalStyles}</style>
      </>
    );
  }

  // Minimized state - premium gold styling
  if (isMinimized) {
    return (
      <>
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: isRTL ? 'auto' : 24,
          left: isRTL ? 24 : 'auto',
          width: 340,
          background: 'linear-gradient(145deg, #1a1a2e 0%, #0f0f23 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: 22,
          border: '2px solid rgba(212, 175, 55, 0.25)',
          boxShadow: '0 12px 50px rgba(0,0,0,0.5), 0 0 40px rgba(212, 175, 55, 0.1)',
          zIndex: 9999,
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out',
        }}>
          <div 
            onClick={() => setIsMinimized(false)}
            style={{
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.08) 0%, rgba(170, 140, 44, 0.04) 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <SovereignAvatar size={40} pulse={loading} />
              <div>
                <div style={{ color: '#d4af37', fontWeight: 600, fontSize: 15, letterSpacing: '0.3px' }}>{ui.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
                  {loading ? ui.thinking : `${messages.length} messages`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }} style={iconBtnStylePremium}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="17 11 12 6 7 11"></polyline>
                  <polyline points="17 18 12 13 7 18"></polyline>
                </svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} style={iconBtnStylePremium}>×</button>
            </div>
          </div>
        </div>
        <style>{globalStyles}</style>
      </>
    );
  }

  // Full chat interface
  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: isRTL ? 'auto' : 24,
        left: isRTL ? 24 : 'auto',
        width: 440,
        maxWidth: 'calc(100vw - 48px)',
        height: 640,
        maxHeight: 'calc(100vh - 48px)',
        background: 'linear-gradient(145deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f23 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: 28,
        border: '2px solid rgba(212, 175, 55, 0.3)',
        boxShadow: '0 30px 100px rgba(0,0,0,0.7), 0 0 60px rgba(212, 175, 55, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 9999,
        direction: isRTL ? 'rtl' : 'ltr',
        animation: 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Premium Header with gold accents */}
        <div style={{
          padding: '22px 26px',
          background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.08) 0%, rgba(170, 140, 44, 0.04) 100%)',
          borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <SovereignAvatar size={52} pulse={loading} />
            <div>
              <div style={{ 
                color: '#d4af37', 
                fontWeight: 700, 
                fontSize: 18, 
                letterSpacing: '0.5px',
                textShadow: '0 2px 10px rgba(212, 175, 55, 0.2)',
              }}>{ui.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)',
                  animation: 'pulse 2s ease-in-out infinite',
                }} />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500 }}>{ui.online}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleNewChat} style={iconBtnStylePremium} title={ui.newChat}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
            <button onClick={() => setIsMinimized(true)} style={iconBtnStylePremium} title="Minimize">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <button onClick={() => setIsOpen(false)} style={iconBtnStylePremium} title={ui.close}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: 10,
                animation: 'messageSlide 0.3s ease-out',
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{ flexShrink: 0, marginBottom: 4 }}>
                  <SovereignAvatar size={32} animated={false} />
                </div>
              )}
              <div style={{
                maxWidth: '80%',
                padding: '16px 20px',
                borderRadius: msg.role === 'user' ? '22px 22px 6px 22px' : '22px 22px 22px 6px',
                background: msg.role === 'user' 
                  ? 'linear-gradient(135deg, #d4af37 0%, #aa8c2c 100%)'
                  : msg.isError 
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(255,255,255,0.03)',
                border: msg.role === 'user' 
                  ? 'none'
                  : '1px solid rgba(212, 175, 55, 0.15)',
                color: msg.role === 'user' ? '#0f0f23' : '#fff',
                fontSize: 14,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                boxShadow: msg.role === 'user' 
                  ? '0 6px 20px rgba(212, 175, 55, 0.3)'
                  : 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
                position: 'relative',
                fontWeight: msg.role === 'user' ? 500 : 400,
              }}>
                {msg.content}
                {/* Voice button for assistant messages */}
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => speakMessage(msg.content, i)}
                    style={{
                      position: 'absolute',
                      bottom: -8,
                      right: -8,
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: speakingIndex === i 
                        ? 'linear-gradient(135deg, #d4af37 0%, #aa8c2c 100%)'
                        : 'rgba(212, 175, 55, 0.1)',
                      border: speakingIndex === i 
                        ? 'none'
                        : '1px solid rgba(212, 175, 55, 0.3)',
                      color: speakingIndex === i ? '#0f0f23' : '#d4af37',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      boxShadow: speakingIndex === i 
                        ? '0 0 20px rgba(212, 175, 55, 0.5)'
                        : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (speakingIndex !== i) {
                        e.currentTarget.style.background = 'rgba(212, 175, 55, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (speakingIndex !== i) {
                        e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
                      }
                    }}
                    title={speakingIndex === i ? 'Stop speaking' : 'Listen to Sovereign'}
                  >
                    {speakingIndex === i ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="2"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <SovereignAvatar size={32} animated={false} pulse={true} />
              <TypingIndicator />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions - Premium gold styling */}
        {messages.length <= 2 && !loading && (
          <div style={{
            padding: '0 22px 18px',
            overflowX: 'auto',
            display: 'flex',
            gap: 12,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q.text)}
                style={{
                  padding: '12px 18px',
                  borderRadius: 14,
                  background: 'rgba(212, 175, 55, 0.06)',
                  border: '1px solid rgba(212, 175, 55, 0.2)',
                  color: 'rgba(212, 175, 55, 0.9)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.25s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(212, 175, 55, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.4)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(212, 175, 55, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(212, 175, 55, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span>{q.icon}</span>
                <span>{q.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* Premium Input Area */}
        <div style={{
          padding: 22,
          borderTop: '1px solid rgba(212, 175, 55, 0.15)',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.3) 100%)',
        }}>
          <div style={{
            display: 'flex',
            gap: 14,
            alignItems: 'flex-end',
          }}>
            <div style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 18,
              border: '1px solid rgba(212, 175, 55, 0.15)',
              overflow: 'hidden',
              transition: 'all 0.25s ease',
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={ui.placeholder}
                rows={1}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: 14,
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.5,
                  maxHeight: 120,
                }}
                onFocus={(e) => {
                  e.currentTarget.parentElement.style.borderColor = 'rgba(212, 175, 55, 0.4)';
                  e.currentTarget.parentElement.style.boxShadow = '0 0 25px rgba(212, 175, 55, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.parentElement.style.borderColor = 'rgba(212, 175, 55, 0.15)';
                  e.currentTarget.parentElement.style.boxShadow = 'none';
                }}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: input.trim() && !loading 
                  ? 'linear-gradient(135deg, #d4af37 0%, #aa8c2c 100%)'
                  : 'rgba(212, 175, 55, 0.1)',
                border: input.trim() && !loading 
                  ? 'none'
                  : '1px solid rgba(212, 175, 55, 0.2)',
                color: input.trim() && !loading ? '#0f0f23' : 'rgba(212, 175, 55, 0.5)',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.25s ease',
                boxShadow: input.trim() && !loading 
                  ? '0 6px 20px rgba(212, 175, 55, 0.4)'
                  : 'none',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          
          {/* Footer - Premium styling */}
          <div style={{
            marginTop: 14,
            textAlign: 'center',
            color: 'rgba(212, 175, 55, 0.4)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.5px',
          }}>
            ✦ {ui.powered} ✦
          </div>
        </div>
      </div>
      <style>{globalStyles}</style>
    </>
  );
}

// Icon button style
const iconBtnStyle = {
  width: 32,
  height: 32,
  borderRadius: 10,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.6)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  transition: 'all 0.2s ease',
};

// Premium gold-themed icon button style
const iconBtnStylePremium = {
  width: 36,
  height: 36,
  borderRadius: 12,
  background: 'rgba(212, 175, 55, 0.08)',
  border: '1px solid rgba(212, 175, 55, 0.2)',
  color: 'rgba(212, 175, 55, 0.7)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  transition: 'all 0.2s ease',
};

// Global CSS animations
const globalStyles = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  @keyframes messageSlide {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes avatarGlow {
    0%, 100% {
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(212, 175, 55, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    50% {
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(212, 175, 55, 0.4), 0 0 0 1px rgba(212, 175, 55, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }
  }
  
  @keyframes ringRotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  @keyframes pulseRing {
    0% {
      transform: scale(1);
      opacity: 0.8;
    }
    100% {
      transform: scale(1.8);
      opacity: 0;
    }
  }
  
  @keyframes typingBounce {
    0%, 60%, 100% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-8px);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  
  @keyframes particleFloat0 {
    0%, 100% {
      top: 20%;
      left: 10%;
      opacity: 0;
    }
    25% {
      opacity: 1;
    }
    50% {
      top: 5%;
      left: 50%;
      opacity: 0.8;
    }
    75% {
      opacity: 0.3;
    }
  }
  
  @keyframes particleFloat1 {
    0%, 100% {
      top: 70%;
      left: 80%;
      opacity: 0;
    }
    25% {
      opacity: 1;
    }
    50% {
      top: 30%;
      left: 90%;
      opacity: 0.8;
    }
    75% {
      opacity: 0.3;
    }
  }
  
  @keyframes particleFloat2 {
    0%, 100% {
      top: 80%;
      left: 20%;
      opacity: 0;
    }
    25% {
      opacity: 1;
    }
    50% {
      top: 60%;
      left: 5%;
      opacity: 0.8;
    }
    75% {
      opacity: 0.3;
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;
