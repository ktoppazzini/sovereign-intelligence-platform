import OpenAI from 'openai'; 

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s max (increased from 15s)
const model = 'gpt-5-nano-2025-08-07';
  try {

    // Accept both legacy { prompt } and new { mode, map, text, targetLang }
    let body;
    try {
      body = await req.json();
    } catch (jsonErr) {
      console.error('❌ Failed to parse JSON body:', jsonErr);
      return Response.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    let prompt = body.prompt;

    // If not a direct prompt, build it from map or text
    if (!prompt) {
      if (body.mode === 'json' && body.map && typeof body.map === 'object' && Object.keys(body.map).length > 0) {
        // JSON translation mode
        prompt = `Translate the following UI labels to ${body.targetLang || 'the target language'} and return ONLY a JSON object with the same keys and translated values.\n\n${JSON.stringify(body.map, null, 2)}`;
      } else if (body.mode === 'text' && body.text && typeof body.text === 'string') {
        // Text translation mode
        prompt = `Translate the following text to ${body.targetLang || 'the target language'} and return ONLY the translated text.\n\n${body.text}`;
      } else {
        return Response.json({ error: 'No UI labels provided. Please paste the list to translate.' }, { status: 400 });
      }
    }

    // Check for API key at runtime
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY not set, translation will fail');
      return Response.json(
        { error: 'Translation service not configured' },
        { status: 503 }
      );
    }

    let completion;
    try {
      completion = await openai.chat.completions.create(
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
    } catch (apiErr) {
      clearTimeout(timeout);
      console.error('❌ OpenAI API error:', apiErr);
      return Response.json(
        { error: apiErr.message || 'OpenAI API error' },
        { status: 502 }
      );
    }

    clearTimeout(timeout);

    // Parse the response from OpenAI
    let raw = completion.choices?.[0]?.message?.content || '';
    let start = raw.indexOf('{');
    let end = raw.lastIndexOf('}');

    // If no closing brace, try to repair the JSON
    if (end === -1 || end < start) {
      console.warn('⚠️ JSON truncated, attempting repair...');
      // Try to find the last complete key-value pair
      const lastComma = raw.lastIndexOf(',');
      if (lastComma > start) {
        end = lastComma;
        const repairedJson = raw.slice(start, end) + '}';
        try {
          const parsed = JSON.parse(repairedJson);
          console.log('✅ Successfully repaired truncated JSON');
          return Response.json({ translation: parsed });
        } catch (jsonRepairErr) {
          console.error('❌ Failed to repair and parse truncated JSON:', jsonRepairErr);
          return Response.json({
            translation: {},
            error: 'Failed to repair and parse truncated JSON from GPT output',
          }, { status: 502 });
        }
      }
      console.error('❌ No JSON closing brace found and repair failed');
      return Response.json({
        translation: {},
        error: 'No JSON closing brace found and repair failed',
      }, { status: 502 });
    }

    const jsonStr = raw.slice(start, end + 1);
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (jsonParseErr) {
      console.error('❌ Failed to parse JSON from GPT output:', jsonParseErr);
      return Response.json({
        translation: {},
        error: 'Failed to parse JSON from GPT output',
      }, { status: 502 });
    }

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
