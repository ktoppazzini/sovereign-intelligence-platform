// lib/serviceRequests.js
// Centralized creator for Service Requests that reads names from env
import { table as getTable } from './airtable';

const TABLE =
  process.env.AIRTABLE_SERVICE_REQUESTS_TABLE_ID || // tblXXXXXXXX (preferred)
  process.env.AIRTABLE_TABLE_REQUESTS || // table name
  'Service Requests';

// Parse the mapping once (env holds a JSON object of column names)
function names() {
  try {
    return JSON.parse(process.env.AIRTABLE_SR_FIELDS_NAMES_JSON || '{}');
  } catch {
    return {};
  }
}

// Remove undefined/empty fields so Airtable won’t choke
function compact(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '')) out[k] = v;
  }
  return out;
}

/**
 * createServiceRequest
 * @param {object} f  – { requestNumber, requesterName, department, email, requestType, changeType, description, status, language, createdAt }
 * @param {string} rid – request id for logs
 */
export async function createServiceRequest(f = {}, rid = '') {
  const n = names(); // column-name map from env
  const fields = compact({
    [n.requestNumber || 'Request Number']: f.requestNumber,
    [n.requesterName || 'Name']: f.requesterName ?? f.name,
    [n.department || 'Department']: f.department,
    [n.email || 'Email']: f.email,
    [n.requestType || 'Type']: f.requestType ?? f.type,
    [n.changeType || 'Change Type']: f.changeType,
    [n.description || 'Description']: f.description ?? '',
    [n.status || 'Status']: f.status ?? 'Received',
    [n.language || 'Language']: f.language,
    [n.createdAt || 'Created At']: f.createdAt ?? new Date().toISOString(),
    // Optional status dates if you mapped them in env:
    [n.receivedAt]: f.receivedAt,
    [n.inProgressAt]: f.inProgressAt,
    [n.onHoldAt]: f.onHoldAt,
    [n.completedAt]: f.completedAt,
    [n.closedAt]: f.closedAt,
    [n.resolution]: f.resolution,
  });

  const t0 = Date.now();
  const tbl = getTable(TABLE); // accepts tbl id or table name
  const res = await tbl.create([{ fields }], { typecast: true }); // typecast = respect single-select options
  const rec = res?.[0];
  console.log(`[AT ${rid}] create Service Requests id=${rec?.id} ms=${Date.now() - t0}`);
  return rec;
}
