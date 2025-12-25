import fs from 'fs';
import path from 'path';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const CACHE_DIR = path.join(process.cwd(), '.cache');
const TRANS_CACHE_FILE = path.join(CACHE_DIR, 'translations.json');

type FixedTranslations = Record<string, Record<string, string>>; // lang -> map

export const FIXED_TERMS = [
  'Executive Branch',
  'Policy',
  'Programs',
  'Operations',
  'Unit A',
  'Minister / Cabinet Member',
  'Deputy Minister / Permanent Secretary',
  'Associate/Additional Secretary',
  'Director General',
  'Executive Director',
  'Director',
  'Manager / Section Chief',
  'Supervisor / Unit Head',
  'Employee / Analyst',
  'Intern / Trainee',
];

export function loadCache(): FixedTranslations {
  try {
    if (fs.existsSync(TRANS_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(TRANS_CACHE_FILE, 'utf8'));
    }
  } catch {}
  return {};
}
export function saveCache(cache: FixedTranslations) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(TRANS_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch {}
}

const translationCache = loadCache();

/** Return translations for fixed labels in a given language; cached to disk. */
export async function getFixedTranslations(lang: string): Promise<Record<string, string>> {
  if (!lang || lang === 'en' || !OPENAI_API_KEY) {
    return Object.fromEntries(FIXED_TERMS.map((t) => [t, t]));
  }
  if (translationCache[lang]) {
    const missing = FIXED_TERMS.filter((k) => !translationCache[lang][k]);
    if (missing.length === 0) return translationCache[lang];
  }
  const prompt = [
    `Translate the following UI terms into ${lang}.`,
    `Return ONLY a raw JSON object mapping the English string to the translation.`,
    JSON.stringify(FIXED_TERMS),
  ].join('\n');

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You are a precise localization engine. Respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const j = await r.json();
  const raw = j?.choices?.[0]?.message?.content ?? '{}';
  let parsed: Record<string, string> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = Object.fromEntries(FIXED_TERMS.map((t) => [t, t]));
  }
  translationCache[lang] = { ...(translationCache[lang] || {}), ...parsed };
  saveCache(translationCache);
  return translationCache[lang];
}

/** Our role ladder in English (to be localized via getFixedTranslations). */
export const ROLE_LADDER = [
  'Minister / Cabinet Member',
  'Deputy Minister / Permanent Secretary',
  'Associate/Additional Secretary',
  'Director General',
  'Executive Director',
  'Director',
  'Manager / Section Chief',
  'Supervisor / Unit Head',
  'Employee / Analyst',
  'Intern / Trainee',
];
