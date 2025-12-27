// app/api/admin/users/route.js
/**
 * Users admin API – Airtable
 *
 * ENV it will accept (use either table *ID* or table *name*):
 *   AIRTABLE_API_KEY
 *   AIRTABLE_BASE_ID
 *   AIRTABLE_USERS_TABLE_ID       (e.g. "tblQv2xRDEFkD1VXr")
 *   AIRTABLE_USERS_TABLE          (e.g. "Users")
 *   AIRTABLE_ROLES_TABLE_ID
 *   AIRTABLE_ROLES_TABLE
 *
 * Users fields used:
 *   Name        (single line text)
 *   Email       (email)
 *   Suspended   (checkbox)  -> we treat Active = !Suspended
 *   Role        (link to Roles; single select link)
 *
 * Roles fields used:
 *   Name        (single line text)
 */

const API = 'https://api.airtable.com/v0';

function envOrThrow(n) {
  const v = process.env[n];
  if (!v) throw new Error(`Missing env: ${n}`);
  return v;
}

function tablePath(idKey, nameKey) {
  return encodeURIComponent(process.env[idKey] || process.env[nameKey] || '');
}

function headers() {
  return {
    Authorization: `Bearer ${envOrThrow('AIRTABLE_API_KEY')}`,
    'Content-Type': 'application/json',
  };
}

function qs(params = {}) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    s.append(k, String(v));
  }
  return s;
}

// Airtable requires "fields[]" repeated, not comma-separated.
function addFields(searchParams, arr) {
  for (const f of arr) searchParams.append('fields[]', f);
}

async function listRoles(baseId, rolesTablePath) {
  const sp = new URLSearchParams();
  addFields(sp, ['Name']);
  sp.set('maxRecords', '1000');

  const res = await fetch(`${API}/${baseId}/${rolesTablePath}?${sp}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error('Roles GET failed'), {
      status: res.status,
      body,
    });
  }
  const data = await res.json();
  const roles = (data.records || []).map((r) => ({
    id: r.id,
    name: r.fields?.Name || '',
  }));
  const byId = new Map(roles.map((r) => [r.id, r]));
  const byName = new Map(roles.map((r) => [r.name.toLowerCase(), r]));
  return { roles, byId, byName, raw: data };
}

async function findUserByEmail(baseId, usersTablePath, emailLower) {
  // LOWER({Email}) = 'foo@bar.com'
  const sp = new URLSearchParams();
  addFields(sp, ['Name', 'Email', 'Suspended', 'Role']);
  sp.set('filterByFormula', `LOWER({Email}) = '${emailLower.replace(/'/g, '\\\'')}'`);
  sp.set('maxRecords', '1');

  const res = await fetch(`${API}/${baseId}/${usersTablePath}?${sp}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error('Find user failed'), {
      status: res.status,
      body,
    });
  }
  const data = await res.json();
  return (data.records || [])[0] || null;
}

export async function GET(req) {
  const url = new URL(req.url);
  const debugWanted = url.searchParams.get('debug') === '1';
  const limit = Number(url.searchParams.get('limit') || '100');

  try {
    const baseId = envOrThrow('AIRTABLE_BASE_ID');
    const usersTablePath = tablePath('AIRTABLE_USERS_TABLE_ID', 'AIRTABLE_USERS_TABLE');
    const rolesTablePath = tablePath('AIRTABLE_ROLES_TABLE_ID', 'AIRTABLE_ROLES_TABLE');
    if (!usersTablePath)
      throw new Error(
        'Missing users table id/name (AIRTABLE_USERS_TABLE_ID or AIRTABLE_USERS_TABLE)',
      );
    if (!rolesTablePath)
      throw new Error(
        'Missing roles table id/name (AIRTABLE_ROLES_TABLE_ID or AIRTABLE_ROLES_TABLE)',
      );

    // 1) roles (for dropdown + name resolution)
    const rolesInfo = await listRoles(baseId, rolesTablePath);

    // 2) users
    const sp = new URLSearchParams();
    addFields(sp, ['Name', 'Email', 'Suspended', 'Role']);
    sp.set('maxRecords', String(Math.max(1, Math.min(1000, limit))));

    const res = await fetch(`${API}/${baseId}/${usersTablePath}?${sp}`, {
      headers: headers(),
      cache: 'no-store',
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Response.json(
        {
          ok: false,
          status: res.status,
          message: 'Airtable GET failed',
          debug: debugWanted
            ? {
                env: {
                  baseId: baseId.slice(0, 10) + '...',
                  usersTable: decodeURIComponent(usersTablePath),
                },
                url: `${API}/${baseId}/${usersTablePath}?${sp}`,
                airtableStatus: res.status,
                airtableBody: body,
              }
            : undefined,
        },
        { status: 200 },
      );
    }

    const records = (body.records || []).map((r) => {
      const linkIds = Array.isArray(r.fields?.Role) ? r.fields.Role : [];
      const firstRoleId = linkIds[0] || '';
      const roleName = rolesInfo.byId.get(firstRoleId)?.name || '';
      return {
        id: r.id,
        Name: r.fields?.Name || '',
        Email: r.fields?.Email || '',
        Suspended: !!r.fields?.Suspended,
        Active: !r.fields?.Suspended,
        RoleId: firstRoleId || null,
        Role: roleName || '',
      };
    });

    return Response.json({
      ok: true,
      count: records.length,
      records,
      roles: rolesInfo.roles,
      debug: debugWanted
        ? {
            env: {
              baseId: baseId.slice(0, 10) + '...',
              usersTable: decodeURIComponent(usersTablePath),
              rolesTable: decodeURIComponent(rolesTablePath),
            },
            usersUrl: `${API}/${baseId}/${usersTablePath}?${sp}`,
          }
        : undefined,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        status: 500,
        message: err.message || 'Server error',
      },
      { status: 200 },
    );
  }
}

export async function POST(req) {
  try {
    const baseId = envOrThrow('AIRTABLE_BASE_ID');
    const usersTablePath = tablePath('AIRTABLE_USERS_TABLE_ID', 'AIRTABLE_USERS_TABLE');
    const rolesTablePath = tablePath('AIRTABLE_ROLES_TABLE_ID', 'AIRTABLE_ROLES_TABLE');
    if (!usersTablePath)
      throw new Error(
        'Missing users table id/name (AIRTABLE_USERS_TABLE_ID or AIRTABLE_USERS_TABLE)',
      );
    if (!rolesTablePath)
      throw new Error(
        'Missing roles table id/name (AIRTABLE_ROLES_TABLE_ID or AIRTABLE_ROLES_TABLE)',
      );

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const deleteFlag = !!body.delete;
    const active = typeof body.active === 'boolean' ? body.active : undefined;

    if (!email) {
      return Response.json(
        { ok: false, status: 400, message: 'Email is required' },
        { status: 200 },
      );
    }

    // Resolve role (optional)
    let roleId = String(body.roleId || '').trim();
    const roleNameMaybe = String(body.role || '').trim();
    if (!roleId && roleNameMaybe) {
      const { byName } = await listRoles(baseId, rolesTablePath);
      roleId = byName.get(roleNameMaybe.toLowerCase())?.id || '';
    }

    // Look up user
    const existing = await findUserByEmail(baseId, usersTablePath, email);

    if (deleteFlag) {
      if (!existing) {
        return Response.json({ ok: true, deleted: 0, message: 'User not found' }, { status: 200 });
      }
      const delRes = await fetch(`${API}/${baseId}/${usersTablePath}/${existing.id}`, {
        method: 'DELETE',
        headers: headers(),
      });
      const delBody = await delRes.json().catch(() => ({}));
      if (!delRes.ok) {
        return Response.json(
          {
            ok: false,
            status: delRes.status,
            message: 'Airtable DELETE failed',
            debug: { delBody },
          },
          { status: 200 },
        );
      }
      return Response.json({ ok: true, deleted: 1 }, { status: 200 });
    }

    // Fields to set
    const fields = {};
    if (body.name) fields['Name'] = String(body.name);
    fields['Email'] = email;

    // Active -> Suspended
    if (typeof active === 'boolean') {
      fields['Suspended'] = !active;
    }

    if (roleId) {
      fields['Role'] = [roleId]; // link field expects array of record IDs
    }

    if (existing) {
      const upRes = await fetch(`${API}/${baseId}/${usersTablePath}/${existing.id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ fields }),
      });
      const upBody = await upRes.json().catch(() => ({}));
      if (!upRes.ok) {
        return Response.json(
          { ok: false, status: upRes.status, message: 'Airtable UPDATE failed', debug: { upBody } },
          { status: 200 },
        );
      }
      return Response.json({ ok: true, updated: 1, id: existing.id }, { status: 200 });
    }

    // Create new
    const crRes = await fetch(`${API}/${baseId}/${usersTablePath}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ records: [{ fields }] }),
    });
    const crBody = await crRes.json().catch(() => ({}));
    if (!crRes.ok) {
      return Response.json(
        { ok: false, status: crRes.status, message: 'Airtable CREATE failed', debug: { crBody } },
        { status: 200 },
      );
    }
    return Response.json(
      { ok: true, created: 1, id: crBody.records?.[0]?.id || null },
      { status: 200 },
    );
  } catch (err) {
    return Response.json(
      { ok: false, status: 500, message: err.message || 'Server error' },
      { status: 200 },
    );
  }
}
