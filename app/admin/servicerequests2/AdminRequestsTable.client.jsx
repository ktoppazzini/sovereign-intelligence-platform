'use client';

/**
 * AdminRequestsTable — SR2-table-fit-no-scroll (FIXED)
 * - No horizontal scroll; whole grid fits
 * - WRAPS Type, Description, Email (no spill into next column)
 * - Comments column removed; merged header "Resolution and Comments" (translated)
 * - Headers + values (Type/Description/Department/Status) translated via /api/gptTranslation
 * - Uses <colgroup> to hard-enforce column widths (rendered WITHOUT whitespace nodes)
 * - Hides duplicate external filter bar from page.jsx
 * - Debug: ?debug=1 dumps description translation map
 */

import { useEffect, useMemo, useRef, useState } from 'react';

const C = {
  bg: 'var(--si-bg, #0b1220)',
  surface: 'var(--si-surface, #0f1b2d)',
  text: 'var(--si-text, #e5eef9)',
  primaryDark: 'var(--si-primary-dark, #1b2e66)',
  accent: 'var(--si-accent, #2d6ae3)',
};

const HEADERS = {
  title: 'Service Requests',
  filterLabel: 'Filter by status',
  apply: 'Apply',
  type: 'Type',
  description: 'Description',
  name: 'Name',
  department: 'Department',
  email: 'Email',
  created: 'Created',
  status: 'Status',
  resolution: 'Resolution and Comments',
};

const T_HEADERS_KEY = (lang) => `SI_SR_TABLE_T_HEADERS_${(lang || 'English').toLowerCase()}`;
const T_VALUES_KEY = (lang, field) =>
  `SI_SR_TABLE_T_VALUES_${field}_${(lang || 'English').toLowerCase()}`;

function isEnglishLang(v = '') {
  const s = String(v || '')
    .trim()
    .toLowerCase();
  return s === 'en' || s === 'english' || s === 'eng' || /^en([-_][a-z0-9]{2,8})?$/.test(s);
}
const RTL_BASES = new Set([
  'ar',
  'fa',
  'he',
  'iw',
  'ur',
  'ps',
  'ku',
  'sd',
  'ug',
  'yi',
  'dv',
  'syr',
]);
const isRtl = (v = '') => RTL_BASES.has(String(v).toLowerCase().split(/[-_]/)[0]);

const unique = (arr) =>
  Array.from(new Set((arr || []).map((x) => (x == null ? '' : String(x).trim())))).filter(Boolean);
const norm = (s) =>
  String(s ?? '')
    .trim()
    .toLowerCase();

/* Flexible translator */
async function translateList(values, langTarget, cacheKey, debugLog) {
  const vals = unique(values);
  if (vals.length === 0 || isEnglishLang(langTarget)) {
    debugLog?.('translateList: skip (English/empty)', cacheKey);
    return Object.fromEntries(vals.map((v) => [v, v]));
  }

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const m = JSON.parse(cached);
      if (vals.every((v) => m[v])) return m;
    }
  } catch {}

  const objPayload = Object.fromEntries(vals.map((v) => [v, v]));
  const prompt =
    `Translate ONLY the VALUES of this JSON into "${langTarget}". ` +
    `Return valid JSON with the SAME KEYS and translated VALUES:\n${JSON.stringify(objPayload)}`;

  let map = null;
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const res = await fetch(`${base}/api/gptTranslation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ prompt }),
    });
    const raw = await res.text();
    let j = {};
    try {
      j = JSON.parse(raw);
    } catch {}
    const obj =
      (j && typeof j.translation === 'object' && j.translation) ||
      (j && typeof j === 'object' && j);
    if (res.ok && obj) {
      map = {};
      for (const k of Object.keys(objPayload)) map[k] = String(obj[k] ?? k);
    }
  } catch {}

  if (!map) map = Object.fromEntries(vals.map((v) => [v, v]));
  try {
    localStorage.setItem(cacheKey, JSON.stringify(map));
  } catch {}
  return map;
}

function canonStatus(raw, options) {
  const s = norm(raw);
  if (!s) return '';
  const nopts = (options || []).map((o) => norm(o));
  if (nopts.includes(s)) return s;

  const aliases = new Map([
    ['rec', 'received'],
    ['received', 'received'],
    ['inprogress', 'in progress'],
    ['progress', 'in progress'],
    ['ip', 'in progress'],
    ['onhold', 'on hold'],
    ['hold', 'on hold'],
    ['complete', 'completed'],
    ['completed', 'completed'],
    ['done', 'completed'],
    ['closed', 'closed'],
    ['close', 'closed'],
  ]);

  const aliasKey = aliases.get(s) || [...aliases.keys()].find((k) => s.startsWith(k));
  if (aliasKey) {
    const target = norm(aliases.get(aliasKey) || aliasKey);
    if (nopts.includes(target)) return target;
  }
  const fuzzy = nopts.find((o) => s.startsWith(o) || o.startsWith(s));
  return fuzzy || '';
}

export default function AdminRequestsTable({
  rows = [],
  lang = 'English',
  initialStatusFilter = '',
}) {
  const debugOn = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const url = new URL(window.location.href);
      return (
        url.searchParams.get('debug') === '1' || localStorage.getItem('sr_table_debug') === '1'
      );
    } catch {
      return false;
    }
  }, []);
  const dlog = (...a) => debugOn && console.debug('[SR2]', ...a);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const wrapRef = useRef(null);
  useEffect(() => {
    try {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const forms = Array.from(document.querySelectorAll('form'));
      forms.forEach((f) => {
        if (!wrap.contains(f) && f.querySelector('select[name="status"]')) {
          f.style.display = 'none';
          f.setAttribute('data-si-hidden', '1');
        }
      });
    } catch {}
  }, [mounted]);

  const langTarget = useMemo(() => {
    if (typeof window === 'undefined') return lang;
    const url = new URL(window.location.href);
    const resolved =
      url.searchParams.get('lang') || lang || localStorage.getItem('ui_lang') || 'en';
    const cleaned = String(resolved).trim();
    try {
      localStorage.setItem('ui_lang', cleaned);
    } catch {}
    return cleaned;
  }, [lang]);
  const rtl = useMemo(() => isRtl(langTarget), [langTarget]);

  const [t, setT] = useState(HEADERS);
  useEffect(() => {
    if (isEnglishLang(langTarget)) {
      setT(HEADERS);
      return;
    }

    try {
      const cached = localStorage.getItem(T_HEADERS_KEY(langTarget));
      if (cached) setT((prev) => ({ ...prev, ...JSON.parse(cached) }));
    } catch {}

    const prompt =
      `Translate ONLY these table labels into "${langTarget}". ` +
      `Return JSON with the SAME KEYS (no prose):\n` +
      JSON.stringify(HEADERS);

    (async () => {
      try {
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        const res = await fetch(`${base}/api/gptTranslation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ prompt }),
        });
        const raw = await res.text();
        let j = {};
        try {
          j = JSON.parse(raw);
        } catch {}
        const translated = j?.translation || (j && typeof j === 'object' ? j : null);
        if (res.ok && translated) {
          setT((prev) => ({ ...prev, ...translated }));
          try {
            localStorage.setItem(T_HEADERS_KEY(langTarget), JSON.stringify(translated));
          } catch {}
        }
      } catch {}
    })();
  }, [langTarget]);

  const [statusOptions, setStatusOptions] = useState([]);
  useEffect(() => {
    let killed = false;
    (async () => {
      try {
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        const res = await fetch(`${base}/api/requests/options`, { cache: 'no-store' });
        const j = await res.json();
        const opts = Array.isArray(j?.statusOptions) ? j.statusOptions : [];
        if (!killed) setStatusOptions(opts);
      } catch {
        if (!killed)
          setStatusOptions(['All', 'received', 'in progress', 'on hold', 'completed', 'closed']);
      }
    })();
    return () => {
      killed = true;
    };
  }, []);

  const [typeMap, setTypeMap] = useState({});
  const [descMap, setDescMap] = useState({});
  const [deptMap, setDeptMap] = useState({});
  const [statusMap, setStatusMap] = useState({});

  useEffect(() => {
    const types = unique(rows.map((r) => r?.type));
    const descs = unique(rows.map((r) => r?.description));
    const depts = unique(rows.map((r) => r?.department));
    const statusesAll = unique([...rows.map((r) => r?.status), ...statusOptions]);

    (async () => {
      setTypeMap(await translateList(types, langTarget, T_VALUES_KEY(langTarget, 'type'), dlog));
      setDescMap(await translateList(descs, langTarget, T_VALUES_KEY(langTarget, 'desc'), dlog));
      setDeptMap(await translateList(depts, langTarget, T_VALUES_KEY(langTarget, 'dept'), dlog));
      setStatusMap(
        await translateList(statusesAll, langTarget, T_VALUES_KEY(langTarget, 'status'), dlog),
      );
    })();
  }, [rows, statusOptions, langTarget]);

  const tr = (map, v) => {
    const key = v == null ? '' : String(v).trim();
    return key ? map[key] || key : '';
  };
  const statusDropdown = useMemo(
    () => statusOptions.filter((o) => norm(o) !== 'all'),
    [statusOptions],
  );
  const applied = useMemo(() => norm(initialStatusFilter || 'all'), [initialStatusFilter]);

  useEffect(() => {
    if (!debugOn) return;
    const dump = rows.map((r) => ({
      id: r.id,
      raw: r?.description ?? '',
      hit: Boolean(descMap[(r?.description ?? '').trim()]),
      tr: tr(descMap, r?.description),
    }));
    console.table(dump);
  }, [rows, descMap, debugOn]);

  /* column widths — NO whitespace in <colgroup> to avoid hydration error */
  const COL_PX = [120, 190, 100, 110, 190, 100, 120, 170]; // Created 100, Resolution+Comments 170

  return (
    <div ref={wrapRef} className="si-table-wrap" dir={rtl ? 'rtl' : 'ltr'}>
      <form className="si-filter" method="GET">
        <label className="si-filter-label">
          {t.filterLabel}:{' '}
          <select name="status" defaultValue={applied || 'all'} className="si-filter-select">
            {(statusOptions.length ? statusOptions : ['All']).map((opt) => (
              <option key={opt} value={norm(opt)}>
                {tr(statusMap, opt)}
              </option>
            ))}
          </select>
        </label>
        <input type="hidden" name="lang" value={langTarget} />
        <button type="submit" className="si-apply">
          {t.apply || 'Apply'}
        </button>
      </form>

      <h2 className="si-title">{t.title}</h2>

      <div className="si-scroll">
        <table className="si-table">
          <colgroup>
            {COL_PX.map((w, i) => (
              <col key={i} style={{ width: `${w}px` }} />
            ))}
          </colgroup>

          <thead>
            <tr>
              <th className="col-type">{t.type}</th>
              <th className="col-description">{t.description}</th>
              <th className="col-name">{t.name}</th>
              <th className="col-dept">{t.department}</th>
              <th className="col-email">{t.email}</th>
              <th className="col-created">{t.created}</th>
              <th className="col-status">{t.status}</th>
              <th className="col-resolution">{t.resolution}</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const currentNorm = canonStatus(r?.status, statusDropdown);
              return (
                <tr key={r.id}>
                  <td className="col-type" title={tr(typeMap, r.type)}>
                    {tr(typeMap, r.type)}
                  </td>
                  <td className="col-description" title={tr(descMap, r.description)}>
                    {tr(descMap, r.description)}
                  </td>
                  <td className="col-name" title={r.name || ''}>
                    {r.name || ''}
                  </td>
                  <td className="col-dept" title={tr(deptMap, r.department)}>
                    {tr(deptMap, r.department)}
                  </td>
                  <td className="col-email" title={r.email || ''}>
                    {r.email || ''}
                  </td>
                  <td className="col-created" title={r.created || ''}>
                    {r.created || ''}
                  </td>
                  <td className="col-status">
                    <select
                      className="si-input si-select"
                      defaultValue={currentNorm || ''}
                      aria-label={t.status}
                    >
                      <option value="">{/* empty */}</option>
                      {statusDropdown.map((opt) => (
                        <option key={opt} value={norm(opt)}>
                          {tr(statusMap, opt)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="col-resolution">
                    <input
                      className="si-input"
                      type="text"
                      placeholder={t.resolution}
                      defaultValue={r.resolution || r.comments || ''}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .si-table-wrap {
          color: ${C.text};
        }

        .si-filter {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 6px 0 8px;
        }
        .si-filter-label {
          font-weight: 700;
        }
        .si-filter-select {
          height: 28px;
          border-radius: 8px;
          background: ${C.bg};
          color: ${C.text};
          border: 2px solid ${C.primaryDark};
          margin-left: 8px;
          padding: 1px 8px;
        }
        .si-apply {
          height: 28px;
          border-radius: 8px;
          padding: 1px 10px;
          border: 2px solid ${C.accent};
          background: ${C.surface};
          color: ${C.text};
          cursor: pointer;
        }

        .si-title {
          margin: 6px 0 10px;
          font-weight: 900;
          letter-spacing: 0.2px;
          font-size: 20px;
        }

        .si-scroll {
          overflow-x: hidden;
          background: ${C.surface};
          border: 3px solid ${C.text};
          border-radius: 14px;
          box-shadow: 0 16px 26px rgba(0, 0, 0, 0.28);
        }

        .si-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          background: ${C.surface};
          font-size: 11.5px;
          line-height: 1.28;
          table-layout: fixed; /* works with colgroup widths */
        }

        thead th {
          position: sticky;
          top: 0;
          z-index: 1;
          background: ${C.surface};
          color: ${C.text};
          font-weight: 800;
          text-align: left;
          padding: 6px 8px;
          border-bottom: 3px solid ${C.text};
          border-right: 2px solid ${C.text};
          white-space: nowrap;
        }
        thead th:first-child {
          border-left: 0;
        }

        tbody td {
          padding: 6px 8px;
          border-bottom: 2px solid ${C.text};
          border-right: 2px solid ${C.text};
          vertical-align: top;

          /* hard wrap for long tokens */
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
          hyphens: auto;
        }
        tbody tr:last-child td {
          border-bottom: 3px solid ${C.text};
        }
        tbody td:first-child {
          border-left: 0;
        }
        tbody tr:nth-child(odd) {
          background: rgba(9, 27, 46, 0.85);
        }
        tbody tr:nth-child(even) {
          background: rgba(6, 20, 36, 0.85);
        }

        /* WRAP columns per spec */
        .col-type {
          white-space: normal;
        }
        .col-description {
          white-space: normal;
        }
        .col-email {
          white-space: normal;
          word-break: break-all;
        }

        /* Compact fixed-width columns (do not wrap) */
        .col-name,
        .col-dept,
        .col-created,
        .col-status,
        .col-resolution {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .si-input {
          height: 28px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          border-radius: 8px;
          padding: 5px 8px;
          color: ${C.text};
          background: ${C.bg};
          border: 2px solid ${C.primaryDark};
          outline: none;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
          font-size: 11.5px;
        }
        .si-input::placeholder {
          color: rgba(229, 238, 249, 0.55);
        }
        .si-input:focus {
          border-color: ${C.accent};
          box-shadow: 0 0 0 3px rgba(45, 106, 227, 0.25);
        }

        .si-select {
          appearance: none;
          background-image:
            linear-gradient(45deg, transparent 50%, ${C.text} 50%),
            linear-gradient(135deg, ${C.text} 50%, transparent 50%),
            linear-gradient(to right, transparent, transparent);
          background-position:
            calc(100% - 18px) calc(50% - 4px),
            calc(100% - 12px) calc(50% - 4px),
            100% 0;
          background-size:
            6px 6px,
            6px 6px,
            2.5em 100%;
          background-repeat: no-repeat;
          padding-right: 22px;
        }

        @media (max-width: 1280px) {
          .si-title {
            font-size: 18px;
          }
          .si-input {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}