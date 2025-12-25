// app/assistant/context/AssistantContext.js
// ═══════════════════════════════════════════════════════════════════════════
// SOVEREIGN INTELLIGENCE - Enhanced Assistant Context with Profile Integration
// ═══════════════════════════════════════════════════════════════════════════

import { createContext, useState, useEffect, useCallback } from 'react';
import { profileManager, CORE_IDENTITY } from '../../../lib/agentProfile';

export const AssistantContext = createContext();

export function AssistantProvider({ children, userId = 'default_user' }) {
  // Core state
  const [aiResponse, setAiResponse] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Profile state
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [identity, setIdentity] = useState(CORE_IDENTITY);
  
  // Conversation history
  const [conversationHistory, setConversationHistory] = useState([]);
  
  // Stats
  const [stats, setStats] = useState({
    totalInteractions: 0,
    skillsLearned: 0,
    knowledgeNodes: 0,
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Load profile on mount
  // ═════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let mounted = true;
    
    (async () => {
      try {
        const loadedProfile = await profileManager.getProfile(userId);
        if (mounted) {
          setProfile(loadedProfile);
          setProfileLoaded(true);
          
          // Update stats
          const summary = loadedProfile.getSummary();
          setStats({
            totalInteractions: summary.stats.totalInteractions,
            skillsLearned: summary.stats.skillsLearned,
            knowledgeNodes: summary.stats.totalKnowledgeNodes,
          });
        }
      } catch (err) {
        console.error('[AssistantContext] Failed to load profile:', err);
        if (mounted) {
          setProfileLoaded(true); // Continue without profile
        }
      }
    })();
    
    return () => { mounted = false; };
  }, [userId]);

  // ═════════════════════════════════════════════════════════════════════════
  // Ask the assistant (with profile integration)
  // ═════════════════════════════════════════════════════════════════════════
  const askAssistant = useCallback(async (query, options = {}) => {
    setLoading(true);
    setError(null);
    
    const { 
      lang = 'English',
      assistantId = process.env.NEXT_PUBLIC_ASSISTANT_ID,
    } = options;
    
    try {
      // Add to conversation history
      const userMessage = { role: 'user', content: query, timestamp: new Date().toISOString() };
      setConversationHistory(prev => [...prev, userMessage]);
      
      // Make API call
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistant_id: assistantId,
          messages: [...conversationHistory, userMessage],
          userId,
          lang,
        }),
      });
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
      const data = await res.json();
      const reply = data.reply || 'No response received.';
      
      // Add assistant response to history
      const assistantMessage = { 
        role: 'assistant', 
        content: reply, 
        timestamp: new Date().toISOString(),
        meta: data.meta,
      };
      setConversationHistory(prev => [...prev, assistantMessage]);
      setAiResponse(reply);
      
      // Update stats
      if (data.meta) {
        setStats(prev => ({
          ...prev,
          totalInteractions: data.meta.interactionCount || prev.totalInteractions + 1,
        }));
      }
      
      // Refresh profile to get updated data
      if (profile) {
        const updatedProfile = await profileManager.getProfile(userId);
        setProfile(updatedProfile);
      }
      
      return { success: true, reply, meta: data.meta };
      
    } catch (err) {
      console.error('[AssistantContext] Ask failed:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [conversationHistory, profile, userId]);

  // ═════════════════════════════════════════════════════════════════════════
  // Provide feedback on response
  // ═════════════════════════════════════════════════════════════════════════
  const provideFeedback = useCallback(async (messageIndex, feedback) => {
    if (!profile) return;
    
    const message = conversationHistory[messageIndex];
    if (!message || message.role !== 'assistant') return;
    
    try {
      // Find the preceding user message
      const userMessage = conversationHistory[messageIndex - 1];
      if (!userMessage) return;
      
      // Process feedback
      profile.processMessage(userMessage, message, {
        success: feedback.positive,
        rating: feedback.rating,
      });
      
      await profileManager.saveProfile(userId);
      
      // Update local profile
      const updatedProfile = await profileManager.getProfile(userId);
      setProfile(updatedProfile);
      
    } catch (err) {
      console.error('[AssistantContext] Feedback failed:', err);
    }
  }, [conversationHistory, profile, userId]);

  // ═════════════════════════════════════════════════════════════════════════
  // Clear conversation
  // ═════════════════════════════════════════════════════════════════════════
  const clearConversation = useCallback(() => {
    setConversationHistory([]);
    setAiResponse('');
    setError(null);
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // Get profile summary
  // ═════════════════════════════════════════════════════════════════════════
  const getProfileSummary = useCallback(() => {
    if (!profile) return null;
    return profile.getSummary();
  }, [profile]);

  // ═════════════════════════════════════════════════════════════════════════
  // Context value
  // ═════════════════════════════════════════════════════════════════════════
  const value = {
    // Core
    aiResponse,
    setAiResponse,
    pdfUrl,
    setPdfUrl,
    loading,
    error,
    
    // Profile
    profile,
    profileLoaded,
    identity,
    stats,
    
    // Conversation
    conversationHistory,
    
    // Actions
    askAssistant,
    provideFeedback,
    clearConversation,
    getProfileSummary,
  };

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
}
