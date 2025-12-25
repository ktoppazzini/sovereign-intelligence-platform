import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s max
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return Response.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create(
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 500,
      },
      {
        signal: controller.signal,
      },
    );

    clearTimeout(timeout);

    const raw = completion.choices?.[0]?.message?.content || '';
    console.log('🧠 GPT raw output:', raw);

    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON found in GPT output');

    const jsonStr = raw.slice(start, end + 1);
    const parsed = JSON.parse(jsonStr);

    return Response.json({ translation: parsed });
  } catch (err) {
    clearTimeout(timeout);

    if (err.name === 'AbortError') {
      console.warn('⚠️ GPT request aborted due to timeout.');
      return Response.json({
        translation: {},
        error: 'GPT request timed out',
      });
    }

    console.error('❌ GPT Translation error:', err);
    return Response.json({
      translation: {},
      error: err.message || 'Translation failed',
    });
  }
}
