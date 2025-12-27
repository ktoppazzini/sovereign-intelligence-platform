// app/api/translations.js
// ═══════════════════════════════════════════════════════════════════════════
// SOVEREIGN INTELLIGENCE - Translation API with Self-Learning
// ═══════════════════════════════════════════════════════════════════════════
// Routes through SovereignAI for:
// - Self-learning translation improvement
// - Pattern recognition across language pairs
// - Never forgets translation contexts
// ═══════════════════════════════════════════════════════════════════════════

import SovereignAI from '@/lib/ai/sovereignAI';

export default async function handler(req, res) {
  const { prompt, targetLang } = req.body;

  try {
    const result = await SovereignAI.call({
      prompt,
      systemPrompt: `You are an expert translator. Translate accurately and naturally to ${targetLang || 'the target language'}.`,
      callType: 'translation',
      vertical: 'translations',
      lang: targetLang || 'English',
      maxTokens: 16000,
    });

    const translation = result?.response || result?.raw || '';
    res.status(200).json({ translation: translation.trim() });
  } catch (err) {
    console.error('[SR:TRANSLATIONS]', err);
    res.status(500).json({ translation: null, error: 'Translation failed' });
  }
}