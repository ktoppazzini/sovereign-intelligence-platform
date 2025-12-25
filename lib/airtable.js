// Minimal Airtable helpers for SR2 admin

// List records from a table
export async function atList(table, {
  view,
  fields,
  filterByFormula,
  maxRecords = 1000,
  pageSize = 100
} = {}) {
  const key  = process.env.AIRTABLE_API_KEY;
  const base = process.env.AIRTABLE_BASE_ID;
  if (!key || !base) {
    console.warn('[AIRTABLE] atList: missing env', { hasKey: !!key, hasBase: !!base });
    return [];
  }
  const params = new URLSearchParams();
  if (view) params.append('view', view);
  if (filterByFormula) params.append('filterByFormula', filterByFormula);
  if (Array.isArray(fields)) for (const f of fields) params.append('fields[]', f);
  params.append('pageSize', String(pageSize));
  const out = [];
  let offset;
  do {
    const url = `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}?${params.toString()}${offset ? `&offset=${offset}` : ''}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` }
    });
    if (!resp.ok) {
      console.warn('[AIRTABLE] atList: http error', { status: resp.status, table, view });
      break;
    }
    const data = await resp.json();
    if (Array.isArray(data.records)) out.push(...data.records);
    offset = data.offset;
    if (out.length >= maxRecords) break;
  } while (offset);
  return out;
}

// Update a record in a table
export async function atUpdate(table, recordId, fields = {}) {
  const key  = process.env.AIRTABLE_API_KEY;
  const base = process.env.AIRTABLE_BASE_ID;
  if (!key || !base) {
    console.warn('[AIRTABLE] atUpdate: missing env', { hasKey: !!key, hasBase: !!base });
    return null;
  }
  const url = `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}/${encodeURIComponent(recordId)}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  if (!resp.ok) {
    console.warn('[AIRTABLE] atUpdate: http error', { status: resp.status, table, recordId });
    return null;
  }
  const json = await resp.json();
  return json; // { id, fields, ... }
}

// Create a record in a table
export async function atCreate(table, fields = {}) {
  const key  = process.env.AIRTABLE_API_KEY;
  const base = process.env.AIRTABLE_BASE_ID;
  if (!key || !base) {
    console.warn('[AIRTABLE] atCreate: missing env', { hasKey: !!key, hasBase: !!base });
    return null;
  }
  const url = `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  if (!resp.ok) {
    console.warn('[AIRTABLE] atCreate: http error', { status: resp.status, table });
    return null;
  }
  const json = await resp.json();
  return json; // { id, fields, ... }
}

// Delete a record from a table
export async function atDelete(table, recordId) {
  const key  = process.env.AIRTABLE_API_KEY;
  const base = process.env.AIRTABLE_BASE_ID;
  if (!key || !base) {
    console.warn('[AIRTABLE] atDelete: missing env', { hasKey: !!key, hasBase: !!base });
    return null;
  }
  const url = `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}/${encodeURIComponent(recordId)}`;
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${key}` }
  });
  if (!resp.ok) {
    console.warn('[AIRTABLE] atDelete: http error', { status: resp.status, table, recordId });
    return null;
  }
  const json = await resp.json();
  return json;
}

// List Service Requests wrapper
export async function listServiceRequests({ maxRecords = 1000 } = {}) {
  return atList("Service Requests", { maxRecords });
}

// Dummy business duration metrics
export async function computeSRBusinessDurations(record, { country, orgType } = {}) {
  // Replace with real business logic as needed
  return {
    createdToReceived: 1,
    receivedToInProgress: 2,
    inProgressToCompleted: 3,
    completedToClosed: 4,
    createdToClosed: 10
  };
}
