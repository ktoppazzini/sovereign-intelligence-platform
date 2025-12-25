// app/api/admin/org-roles/route.js
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// very small starter fallback sets
const FALLBACK = {
  government: [
    { name: 'Head of State', level: 'National' },
    { name: 'Minister of Finance', level: 'National' },
    { name: 'Minister of Health', level: 'National' },
    { name: 'Premier/Governor', level: 'Provincial/State' },
    { name: 'Mayor', level: 'Municipal' },
    { name: 'Director', level: 'Agency' },
    { name: 'Manager', level: 'Agency' },
    { name: 'Supervisor', level: 'Agency' },
    { name: 'Staff', level: 'Agency' },
  ],
  corporation: [
    { name: 'CEO / President', level: 'Executive' },
    { name: 'Senior Vice President (Org-wide)', level: 'Executive' },
    { name: 'Senior Vice President (Region)', level: 'Regional' },
    { name: 'Vice President (Region)', level: 'Regional' },
    { name: 'Director', level: 'Department' },
    { name: 'Manager', level: 'Team' },
    { name: 'Supervisor', level: 'Team' },
    { name: 'Staff', level: 'Team' },
  ],
};

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get('country') || 'Generic';
  const domain = (searchParams.get('domain') || 'government').toLowerCase();

  const sys = `Return ONLY a JSON array. Each item: {"name": string, "level": string}. 
The roles should reflect ${domain === 'government' ? 'political and non-political public sector roles' : 'corporate roles'} used in ${country}. 
No markdown, no prose, just the array.`;

  const user = `List the common ${domain} roles for ${country} as a JSON array. Include senior → frontline levels.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const out = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
      },
      { signal: controller.signal },
    );
    clearTimeout(timer);

    const text = out.choices?.[0]?.message?.content || '';
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    const raw = start >= 0 && end >= 0 ? text.slice(start, end + 1) : '[]';
    let roles = [];
    try {
      roles = JSON.parse(raw);
    } catch {}

    if (!roles.length) roles = FALLBACK[domain] || [];

    return NextResponse.json({ ok: true, roles });
  } catch (e) {
    clearTimeout(timer);
    return NextResponse.json({ ok: true, roles: FALLBACK[domain] || [] });
  }
}
