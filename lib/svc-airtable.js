// lib/svc-airtable.js
export function makeAirtable() {
  const API_URL = process.env.AIRTABLE_API_URL || 'https://api.airtable.com/v0';
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE = process.env.AIRTABLE_SERVICE_TABLE || 'Reform Requests';
  if (!API_KEY || !BASE_ID) {
    throw new Error('Airtable config missing');
  }

  // Field mapping (env overrideable)
  const F = {
    number: process.env.AIRTABLE_SR_REQNO_FIELD || 'Request Number',
    name: process.env.AIRTABLE_SR_NAME_FIELD || 'Requester Name',
    department: process.env.AIRTABLE_SR_DEPT_FIELD || 'Department',
    email: process.env.AIRTABLE_SR_EMAIL_FIELD || 'Email',
    type: process.env.AIRTABLE_SR_TYPE_FIELD || 'Request Type',
    changeType: process.env.AIRTABLE_SR_CHANGE_TYPE_FIELD || 'Change Type',
    description: process.env.AIRTABLE_SR_DESC_FIELD || 'Description',
    status: process.env.AIRTABLE_SR_STATUS_FIELD || 'Status',
    lang: process.env.AIRTABLE_SR_LANG_FIELD || 'Language',
    created: process.env.AIRTABLE_SR_CREATED_FIELD || 'Created At',
    resolution: process.env.AIRTABLE_SR_RESOLUTION_FIELD || 'Resolution',
    // status dates (optional)
    receivedAt: process.env.AIRTABLE_SR_RECEIVED_AT_FIELD || '',
    inProgressAt: process.env.AIRTABLE_SR_INPROGRESS_AT_FIELD || '',
    onHoldAt: process.env.AIRTABLE_SR_ONHOLD_AT_FIELD || '',
    completedAt: process.env.AIRTABLE_SR_COMPLETED_AT_FIELD || '',
    closedAt: process.env.AIRTABLE_SR_CLOSED_AT_FIELD || '',
  };

  const auth = { Authorization: `Bearer ${API_KEY}` };

  function toFields(obj) {
    const f = {};
    if (obj.number) f[F.number] = obj.number;
    if (obj.name) f[F.name] = obj.name;
    if (obj.department) f[F.department] = obj.department;
    if (obj.email) f[F.email] = obj.email;
    if (obj.type) f[F.type] = obj.type;
    if (obj.changeType) f[F.changeType] = obj.changeType;
    if (obj.description) f[F.description] = obj.description;
    if (obj.status) f[F.status] = obj.status;
    if (obj.lang) f[F.lang] = obj.lang;
    if (obj.created) f[F.created] = obj.created;
    if (obj.resolution !== undefined) f[F.resolution] = obj.resolution;

    // status date stamping:
    if (obj.status) {
      const now = new Date().toISOString();
      const lc = obj.status.toLowerCase();
      if (lc === 'received' && F.receivedAt) f[F.receivedAt] = now;
      if (lc === 'in progress' && F.inProgressAt) f[F.inProgressAt] = now;
      if (lc === 'on hold' && F.onHoldAt) f[F.onHoldAt] = now;
      if (lc === 'completed' && F.completedAt) f[F.completedAt] = now;
      if (lc === 'closed' && F.closedAt) f[F.closedAt] = now;
    }
    return f;
  }

  return {
    async list(limit = 100) {
      const r = await fetch(
        `${API_URL}/${BASE_ID}/${encodeURIComponent(TABLE)}?maxRecords=${limit}`,
        {
          headers: auth,
          cache: 'no-store',
        },
      );
      if (!r.ok) throw new Error('airtable list error');
      return r.json();
    },
    async create(obj) {
      const fields = toFields(obj);
      const r = await fetch(`${API_URL}/${BASE_ID}/${encodeURIComponent(TABLE)}`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [{ fields }] }),
      });
      if (!r.ok) {
        const tx = await r.text().catch(() => '');
        console.error('[airtable create]', r.status, tx);
        throw new Error('airtable create error');
      }
      const j = await r.json();
      return j.records?.[0] || j;
    },
    async get(id) {
      const r = await fetch(`${API_URL}/${BASE_ID}/${encodeURIComponent(TABLE)}/${id}`, {
        headers: auth,
        cache: 'no-store',
      });
      if (!r.ok) {
        const tx = await r.text().catch(() => '');
        console.error('[airtable get]', r.status, tx);
        throw new Error('airtable get error');
      }
      return r.json();
    },
    async update(id, obj) {
      const fields = toFields(obj);
      const r = await fetch(`${API_URL}/${BASE_ID}/${encodeURIComponent(TABLE)}`, {
        method: 'PATCH',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [{ id, fields }] }),
      });
      if (!r.ok) {
        const tx = await r.text().catch(() => '');
        console.error('[airtable update]', r.status, tx);
        throw new Error('airtable update error');
      }
      const j = await r.json();
      return j.records?.[0] || j;
    },
  };
}
