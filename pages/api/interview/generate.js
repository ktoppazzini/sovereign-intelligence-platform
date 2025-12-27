// pages/api/interview/generate.js
// Interview Generation API with Dynamic Translation

import { ensureTranslatedResponse } from '../../../lib/dynamicTranslation';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { questions = [], context = '', lang = 'English' } = req.body;

    if (questions.length === 0) {
      return res.status(400).json({ error: 'Questions are required' });
    }

    // Generate interview structure
    const interview = {
      id: `INT-${Date.now().toString(36).toUpperCase()}`,
      generatedAt: new Date().toISOString(),
      language: lang,
      totalQuestions: questions.length,
      sections: questions.map((q, idx) => ({
        id: `section-${idx + 1}`,
        question: q,
        order: idx + 1,
        responseType: 'text',
      })),
      context,
    };

    const responseData = {
      ok: true,
      interview,
      message: 'Interview generated successfully',
    };

    const translatedData = await ensureTranslatedResponse(responseData, lang);
    return res.status(200).json(translatedData);
  } catch (error) {
    console.error('[interview/generate] Error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Interview generation failed',
    });
  }
}
