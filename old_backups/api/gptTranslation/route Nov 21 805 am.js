import OpenAI from 'openai'; 

export async function POST(req) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s max
const model = 'gpt-5-nano-2025-08-07';
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return Response.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // Check for API key at runtime
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY not set, translation will fail');
      return Response.json(
        { error: 'Translation service not configured' },
        { status: 503 }
      );
    }

    // [KT:SURGICAL] Model selection: env override, fallback to Nano
    const model =
      process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';

    // Initialize OpenAI client here to avoid build-time errors
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create(
      {
        // model: 'gpt-4', // [KT:SURGICAL] Hard-coded model retired; see dynamic model below
        model,
        messages: [{
          role: 'user',
          content: `${prompt}\n\nRespond ONLY with valid JSON. Do not include any explanation or extra text.`
        }],
        temperature: 1,
        max_completion_tokens: 1500, // Changed from max_tokens to max_completion_tokens
      },
      {
        signal: controller.signal,
      },
    );

    clearTimeout(timeout);


    const raw = completion.choices?.[0]?.message?.content || '';
    console.log('🧠 GPT raw output (first 200 chars):', raw.slice(0, 200));
    console.log('🧠 GPT raw output (FULL):', raw);
    console.log('🧠 GPT model used:', model);

    // Handle truncated JSON by finding complete JSON object
    const start = raw.indexOf('{');
    let end = raw.lastIndexOf('}');
    
    if (start === -1) {
      throw new Error('No JSON opening brace found in GPT output');
    }
    
    // If no closing brace, try to repair the JSON
    if (end === -1 || end < start) {
      console.warn('⚠️ JSON truncated, attempting repair...');
      // Try to find the last complete key-value pair
      const lastComma = raw.lastIndexOf(',');
      if (lastComma > start) {
        end = lastComma;
        const repairedJson = raw.slice(start, end) + '}';
        const parsed = JSON.parse(repairedJson);
        console.log('✅ Successfully repaired truncated JSON');
        return Response.json({ translation: parsed });
      }
      throw new Error('No JSON closing brace found and repair failed');
    }

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
