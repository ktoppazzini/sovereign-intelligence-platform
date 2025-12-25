// pages/api/translate.js

import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { prompt } = req.body;

  try {
    const chat = await openai.chat.completions.create({
      model: 'gpt-5-nano-2025-08-07',
      temperature: 1,
      messages: [{ role: 'user', content: prompt }],
    });

    const translation = chat.choices[0].message.content.trim();
    res.status(200).json({ translation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ translation: null, error: 'Translation failed' });
  }
}