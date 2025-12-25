// app/assistant/useGPTAssist.js
// ═══════════════════════════════════════════════════════════════════════════
// SOVEREIGN INTELLIGENCE - Enhanced GPT Assist Hook with Profile Integration
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useContext } from 'react';
import axios from 'axios';
import { AssistantContext } from './context/AssistantContext';

/**
 * useGPTAssist - Hook for interacting with the AI assistant
 * 
 * Features:
 * - Automatic profile context injection
 * - Skill tracking
 * - Conversation memory
 * - Feedback loop for learning
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.userId - User ID for profile lookup
 * @param {string} options.lang - Language preference
 */
export function useGPTAssist(options = {}) {
  const {
    userId = 'default_user',
    lang = 'English',
  } = options;
  
  // Local state
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);
  
  // Conversation history
  const [history, setHistory] = useState([]);
  
  // Try to use context if available
  let contextValue = null;
  try {
    contextValue = useContext(AssistantContext);
  } catch {}

  /**
   * Ask the assistant a question
   * @param {Array|string} messages - Array of messages or single query string
   * @param {Object} askOptions - Additional options
   */
  const askAssistant = useCallback(async (messages, askOptions = {}) => {
    setLoading(true);
    setError(null);
    
    // Normalize messages to array format
    const normalizedMessages = typeof messages === 'string' 
      ? [{ role: 'user', content: messages }]
      : messages;
    
    // Add to local history
    const userMessage = normalizedMessages[normalizedMessages.length - 1];
    setHistory(prev => [...prev, { ...userMessage, timestamp: Date.now() }]);
    
    try {
      const res = await axios.post('/api/ask', {
        assistant_id: askOptions.assistantId || process.env.NEXT_PUBLIC_ASSISTANT_ID,
        messages: normalizedMessages,
        userId,
        lang: askOptions.lang || lang,
        feedback: askOptions.feedback || null,
      });
      
      const reply = res.data.reply || '';
      const responseMeta = res.data.meta || {};
      
      // Update state
      setResponse(reply);
      setMeta(responseMeta);
      
      // Add to history
      setHistory(prev => [...prev, { 
        role: 'assistant', 
        content: reply, 
        timestamp: Date.now(),
        meta: responseMeta,
      }]);
      
      // Update context if available
      if (contextValue?.setAiResponse) {
        contextValue.setAiResponse(reply);
      }
      
      return {
        success: true,
        reply,
        meta: responseMeta,
      };
      
    } catch (err) {
      console.error('Assistant error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'There was an issue with the assistant.';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, [userId, lang, contextValue]);

  /**
   * Provide feedback on the last response
   * @param {Object} feedback - { positive: boolean, rating: 1-5, comment: string }
   */
  const provideFeedback = useCallback(async (feedback) => {
    if (history.length < 2) return;
    
    // Get last user message and assistant response
    const lastAssistantIndex = history.length - 1;
    const lastUserIndex = lastAssistantIndex - 1;
    
    if (history[lastAssistantIndex]?.role !== 'assistant') return;
    
    try {
      // Re-send with feedback to update profile
      await axios.post('/api/ask', {
        assistant_id: process.env.NEXT_PUBLIC_ASSISTANT_ID,
        messages: [history[lastUserIndex]],
        userId,
        feedback: {
          success: feedback.positive,
          rating: feedback.rating || (feedback.positive ? 5 : 1),
        },
      });
      
      return { success: true };
    } catch (err) {
      console.error('Feedback error:', err);
      return { success: false, error: err.message };
    }
  }, [history, userId]);

  /**
   * Clear conversation history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setResponse('');
    setMeta(null);
    setError(null);
  }, []);

  /**
   * Get full conversation for display
   */
  const getConversation = useCallback(() => {
    return history.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      meta: msg.meta,
    }));
  }, [history]);

  return { 
    // Core
    askAssistant, 
    response, 
    loading, 
    error,
    meta,
    
    // Conversation
    history,
    getConversation,
    clearHistory,
    
    // Feedback
    provideFeedback,
  };
}
