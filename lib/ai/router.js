// /lib/ai/router.js
// Central model routing + timeout wrapper for OpenAI calls.

export function chooseModel({ scope, tokens = 0 }) {
  const g4Scopes = new Set([
    'translate_nav',
    'translate_ui',
    'complex_reasoning',
    '2fa_message',
    'critical',
  ]);
  const g35Scopes = new Set(['code_small', 'tests', 'explain_code', 'small_copy']);

  if (g4Scopes.has(scope)) return 'gpt-4-turbo';
  if (g35Scopes.has(scope) && tokens < 6000) return 'gpt-3.5-turbo';
  return 'gpt-4-turbo';
}

/**
 * callOpenAI
 * - chooses model via scope
 * - enforces 6s/12s timeout
 * - uniform return: { ok, data, error, meta }
 */
export async function callOpenAI({
  openai, // OpenAI SDK instance
  scope, // 'translate_nav' | 'code_small' | ...
  messages, // chat messages array
  maxTokens = 600,
  tokens = 0,
  temperature = 0.2,
}) {
  const model = chooseModel({ scope, tokens });
  const timeoutMs = [
    'translate_nav',
    'translate_ui',
    'complex_reasoning',
    '2fa_message',
    'critical',
  ].includes(scope)
    ? 12000
    : 6000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);

  const meta = { scope, model, timeoutMs, startedAt: Date.now() };

  try {
    const completion = await openai.chat.completions.create(
      { model, messages, max_tokens: maxTokens, temperature },
      { signal: controller.signal }
    );

    clearTimeout(timer);
    meta.latencyMs = Date.now() - meta.startedAt;

    return { ok: true, data: completion, error: null, meta };
  } catch (err) {
    clearTimeout(timer);
    meta.latencyMs = Date.now() - meta.startedAt;
    const msg = (err && err.message) || String(err);
    const isTimeout = msg.includes('timeout') || msg.includes('The operation was aborted');
    return { ok: false, data: null, error: isTimeout ? 'timeout' : msg, meta };
  }
}
