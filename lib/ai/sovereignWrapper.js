// lib/ai/sovereignWrapper.js
// ═══════════════════════════════════════════════════════════════════════════
// SOVEREIGN AI WRAPPER - Easy Integration for All Routes
// ═══════════════════════════════════════════════════════════════════════════
// 
// This module provides a drop-in replacement for direct OpenAI calls.
// Simply replace: openai.chat.completions.create(...)
// With: sovereignAI.chat(...)
//
// The wrapper automatically:
// - Embeds agent learning context
// - Tracks call success/failure
// - Records insights for improvement
// - Maintains skill proficiency per call type
//
// @version 1.0.0

import SovereignAI from './sovereignAI';

const TAG = '[SR:SOVEREIGN-WRAPPER]';

/**
 * Drop-in replacement for OpenAI chat completions
 * Automatically integrates Sovereign AI learning
 */
export async function sovereignChat({
  messages,
  model,
  temperature = 1, // Project standard
  max_tokens,
  response_format,
  // Sovereign AI metadata
  callType = 'general',
  vertical = null,
  lang = 'English',
  context = {},
}) {
  // Extract the main prompt from messages
  const userMessage = messages.find(m => m.role === 'user')?.content || '';
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  
  const prompt = `${systemMessage}\n\n${userMessage}`;
  
  const result = await SovereignAI.call({
    prompt,
    callType,
    vertical,
    lang,
    expectedFormat: response_format?.type === 'json_object' ? 'json' : null,
    responseFormat: response_format,
    maxTokens: max_tokens,
    temperature,
    context,
  });
  
  // Return in OpenAI-compatible format
  return {
    choices: [{
      message: {
        role: 'assistant',
        content: result.data || result.rawResponse || '',
      },
      finish_reason: result.success ? 'stop' : 'error',
    }],
    usage: {
      prompt_tokens: result.metrics?.promptTokens || 0,
      completion_tokens: result.metrics?.completionTokens || 0,
      total_tokens: result.metrics?.totalTokens || 0,
    },
    // Sovereign AI additions
    sovereign: {
      success: result.success,
      metrics: result.metrics,
      learnings: result.learnings,
      skillLevel: result.skillLevel,
    },
  };
}

/**
 * Create a Sovereign-enhanced OpenAI-like client
 * Use this to replace: const openai = new OpenAI(...)
 */
export function createSovereignClient(defaultOptions = {}) {
  return {
    chat: {
      completions: {
        create: async (options) => {
          return sovereignChat({
            ...options,
            callType: defaultOptions.callType || 'general',
            vertical: defaultOptions.vertical,
            lang: defaultOptions.lang,
            context: defaultOptions.context,
          });
        },
      },
    },
  };
}

/**
 * Wrap an existing OpenAI call with Sovereign AI learning
 * Minimal changes required to existing code
 */
export async function wrapWithSovereign(openaiCall, metadata = {}) {
  const {
    callType = 'general',
    vertical = null,
    lang = 'English',
  } = metadata;
  
  const startTime = Date.now();
  
  try {
    // Execute the original OpenAI call
    const result = await openaiCall();
    
    const duration = Date.now() - startTime;
    const content = result.choices?.[0]?.message?.content || '';
    
    // Record success with Sovereign AI
    SovereignAI.call({
      prompt: `[RECORDING] ${callType} call completed successfully`,
      callType: `${callType}-record`,
      vertical,
      lang,
      context: {
        recordOnly: true,
        success: true,
        duration,
        tokenCount: result.usage?.total_tokens || 0,
        contentLength: content.length,
      },
    }).catch(() => {}); // Fire and forget
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Record failure with Sovereign AI
    SovereignAI.call({
      prompt: `[RECORDING] ${callType} call failed: ${error.message}`,
      callType: `${callType}-record`,
      vertical,
      lang,
      context: {
        recordOnly: true,
        success: false,
        duration,
        error: error.message,
      },
    }).catch(() => {}); // Fire and forget
    
    throw error;
  }
}

/**
 * Enhance any prompt with Sovereign AI context
 * Use before sending to OpenAI
 */
export function enhancePrompt(basePrompt, options = {}) {
  const { callType = 'general', vertical = null, lang = 'English' } = options;
  
  // Get Sovereign AI enhancements synchronously
  const analytics = SovereignAI.getAnalytics();
  const recommendations = SovereignAI.getRecommendations();
  
  // Find relevant learnings
  const relevantRecs = recommendations
    .filter(r => r.callType === callType || r.type === 'knowledge')
    .slice(0, 2);
  
  let enhancement = '';
  
  if (relevantRecs.length > 0) {
    enhancement = `\n\n[SOVEREIGN AI LEARNED INSIGHTS]\n${relevantRecs.map(r => `- ${r.message}`).join('\n')}\n`;
  }
  
  // Add identity context
  const identityContext = `[SOVEREIGN AI - Self-Learning Intelligence Platform]
You are Sovereign, the AI powering this enterprise platform. Your responses improve continuously through:
- Learning from successful outputs
- Pattern recognition across industries
- Adaptive skill development
`;

  return `${identityContext}\n\n${basePrompt}${enhancement}`;
}

/**
 * Record the outcome of an AI generation for learning
 */
export function recordOutcome(callType, success, details = {}) {
  const { vertical, lang = 'English', duration, error, quality } = details;
  
  SovereignAI.call({
    prompt: `[OUTCOME] ${callType}: ${success ? 'SUCCESS' : 'FAILURE'}${error ? ` - ${error}` : ''}`,
    callType: `${callType}-outcome`,
    vertical,
    lang,
    context: {
      recordOnly: true,
      success,
      duration,
      error,
      quality,
    },
  }).catch(() => {}); // Fire and forget
}

// Export everything
export default {
  chat: sovereignChat,
  createClient: createSovereignClient,
  wrap: wrapWithSovereign,
  enhancePrompt,
  recordOutcome,
};
