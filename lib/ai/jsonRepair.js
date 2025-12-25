// /lib/ai/jsonRepair.js
// Safely parse "almost JSON" by slicing to first/last brace/bracket.
// Returns { ok, value, error }

export function parseJsonSafe(text) {
  if (typeof text !== 'string') {
    return { ok: false, value: null, error: 'Non-string JSON input' };
  }

  // Try strict parse first
  try {
    return { ok: true, value: JSON.parse(text), error: null };
  } catch {
    // fall through
  }

  // Try to find the outermost JSON object or array
  const firstObj = text.indexOf('{');
  const lastObj = text.lastIndexOf('}');
  const firstArr = text.indexOf('[');
  const lastArr = text.lastIndexOf(']');

  // Prefer object if both exist; otherwise take the longest plausible slice
  let start = -1,
    end = -1;
  if (firstObj !== -1 && lastObj !== -1) {
    start = firstObj;
    end = lastObj + 1;
  } else if (firstArr !== -1 && lastArr !== -1) {
    start = firstArr;
    end = lastArr + 1;
  }

  if (start === -1 || end === -1 || end <= start) {
    return { ok: false, value: null, error: 'No JSON braces found' };
  }

  const slice = text.slice(start, end);
  try {
    return { ok: true, value: JSON.parse(slice), error: null };
  } catch (e) {
    return { ok: false, value: null, error: 'Malformed JSON after slice' };
  }
}
