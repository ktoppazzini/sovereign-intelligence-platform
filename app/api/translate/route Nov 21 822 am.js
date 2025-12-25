// app/api/translate/route.js
// Dynamic UI translation via GPT-5 Nano (temp=1). Returns array of translated strings.
// POST body: { lang: "French", items: ["Generate Report", "Export to PDF", ...] }

import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs"; // explicit for Next
const MODEL = "gpt-5-nano-2025-08-07";      // per your stack
const TEMP  = 1;

const SYS = `You translate short UI labels.
Return ONLY a flat JSON array of translated strings in the SAME order as input.
Do not add notes, comments, or extra fields.`;

function okJson(data, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export async function POST(req) {
  try {
    const { lang, items } = await req.json();
    if (!Array.isArray(items) || !lang) {
      return okJson({ error: "Invalid payload" }, 400);
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Compose prompt that preserves order
    const user = `Target language: ${lang}
Input JSON array:
${JSON.stringify(items)}
Return ONLY the translated array.`;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 6000); // 6s hard timeout

    const resp = await client.chat.completions.create({
      model: MODEL,
      temperature: TEMP,
      messages: [
        { role: "system", content: SYS },
        { role: "user", content: user }
      ]
    }, { signal: controller.signal });

    clearTimeout(id);

    const text = resp.choices?.[0]?.message?.content?.trim() ?? "[]";
    // Parse from first [ to last ]
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    const json = start !== -1 && end !== -1 ? text.slice(start, end + 1) : "[]";

    let arr;
    try { arr = JSON.parse(json); } catch { arr = []; }

    // Validate length; if mismatch, return originals
    if (!Array.isArray(arr) || arr.length !== items.length) {
      return okJson({ translations: items, fallback: true });
    }
    return okJson({ translations: arr, fallback: false });
  } catch (err) {
    // Timeout or API error → fallback to originals
    return okJson({ translations: [], error: true, message: String(err) }, 200);
  }
}
