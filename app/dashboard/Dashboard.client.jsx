use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getUiTranslations, normalizeLang } from '../../lib/i18nClient';

// ----- UI labels (translated via your helper) -----
const BASE_UI = {
  title: 'Dashboard',
  kpis: 'Key Metrics',
  srtWithinSLA: 'Requests Within SLA',
  avgResponseTime: 'Avg. Response Time',
  costSavingsYTD: 'Cost Savings (YTD)',
  reportsByArea: 'Reform Reports by Area',
  savingsByDept: 'Cost Savings by Department',
  openRequests: 'Open Service Requests',
  quickLinks: 'Quick Links',
  viewServiceRequests: 'Service Requests',
  viewReports: 'Reform Reports',
  admin: 'Admin',
  exportCSV: 'Export CSV',
  viewAll: 'View All',
  createReport: 'Create Reform Report',
  runQueries: 'Run Queries',
};

function useLang() {
  const [activeLang, setActiveLang] = useState('English');
  useEffect(() => {
    const detect = () => {
      try {
        const usp = new URLSearchParams(window.location.search);
        const q = usp.get('lang');
        if (q) return q;
      } catch {}
      try {
        const htmlLang = document.documentElement?.getAttribute('lang');
        if (htmlLang) return htmlLang;
      } catch {}
      try {
        const m = document.cookie.match(/(?:^|;\s*)si\.lang=([^;]+)/i);
        if (m && m[1]) return decodeURIComponent(m[1]);
      } catch {}
      return 'English';
    };
    setActiveLang(detect());
    const onPop = () => setActiveLang(detect());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return useMemo(() => normalizeLang(activeLang || 'English'), [activeLang]);
}

const MOCK = {
  kpis: { withinSLA: 86, avgResponseMins: 73, costSavingsYTD: 1245000, openRequests: 47 },
  savingsByDept: [
    { name: 'Operations', value: 420000 },
    { name: 'Finance', value: 310000 },
    { name: 'IT', value: 205000 },
    { name: 'Procurement', value: 172000 },
    { name: 'HR', value: 145000 },
  ],
  reportsByArea: [
    { name: 'North America', value: 22 },
    { name: 'EMEA', value: 18 },
    { name: 'APAC', value: 12 },
    { name: 'LATAM', value: 9 },
  ],
  openRequests: [
    { id: 'SR-1842', title: 'Invoice automation', dept: 'Finance', ageHrs: 5, slaHrs: 24 },
    { id: 'SR-1833', title: 'Onboarding workflow', dept: 'HR', ageHrs: 18, slaHrs: 48 },
    { id: 'SR-1827', title: 'Vendor consolidation', dept: 'Procurement', ageHrs: 29, slaHrs: 72 },
    { id: 'SR-1801', title: 'Service catalog revamp', dept: 'IT', ageHrs: 55, slaHrs: 72 },
  ],
};

export default function Dashboard() {
  const lang = useLang();
  const [ui, setUi] = useState(BASE_UI);

  // live data (defaults to mock)
  const [data, setData] = useState(MOCK);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // i18n
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { t } = await getUiTranslations({
        base: BASE_UI,
        lang,
        cachePrefix: 'SI_DASH',
        setDir: true,
      });
      if (mounted) setUi(t || BASE_UI);
    })();
    return () => {
      mounted = false;
    };
  }, [lang]);

  // fetch from server summary API (falls back silently to mock if missing)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await fetch(`/api/dashboard/summary?lang=${encodeURIComponent(lang)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (j?.ok && j?.data && mounted) {
          setData({
            kpis: j.data.kpis ?? MOCK.kpis,
            savingsByDept: j.data.savingsByDept ?? MOCK.savingsByDept,
            reportsByArea: j.data.reportsByArea ?? MOCK.reportsByArea,
            openRequests: j.data.openRequests ?? MOCK.openRequests,
          });
        } else if (mounted) {
          setData(MOCK);
        }
      } catch (e) {
        if (mounted) {
          setErr('offline');
          setData(MOCK);
        }
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [lang]);

  // helpers
  const currency = (n) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);

  // simple bar chart as SVG
  function BarChart({ items, max, height = 160 }) {
    const barW = 36;
    const gap = 16;
    const width = items.length * barW + (items.length - 1) * gap;
    return (
      <svg
        role="img"
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        {items.map((it, i) => {
          const h = Math.max(4, Math.round((it.value / max) * (height - 28)));
          const x = i * (barW + gap);
          const y = height - h - 20;
          return (
            <g key={i} transform={`translate(${x},0)`}>
              <rect x="0" y={y} width={barW} height={h} rx="4" />
              <text x={barW / 2} y={height - 6} textAnchor="middle" style={{ fontSize: 11 }}>
                {it.name.length > 8 ? it.name.slice(0, 8) + '…' : it.name}
              </text>
              <title>{`${it.name}: ${it.value}`}</title>
            </g>
          );
        })}
      </svg>
    );
  }

  // donut chart as SVG
  function Donut({ items, size = 160, strokeW = 18 }) {
    const total = items.reduce((a, b) => a + b.value, 0) || 1;
    const r = (size - strokeW) / 2;
    const c = Math.PI * 2 * r;
    let offset = 0;
    return (
      <svg role="img" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size / 2}, ${size / 2})`}>
          {items.map((it, i) => {
            const frac = it.value / total;
            const len = c * frac;
            const dashArray = `${len} ${c - len}`;
            const el = (
              <circle
                key={i}
                r={r}
                cx="0"
                cy="0"
                fill="none"
                strokeWidth={strokeW}
                strokeDasharray={dashArray}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
          <circle r={r} cx="0" cy="0" fill="none" strokeWidth={strokeW} strokeOpacity="0.15" />
          <text y="6" textAnchor="middle" style={{ fontSize: 14, fontWeight: 600 }}>
            {total}
          </text>
        </g>
      </svg>
    );
  }

  // layout styles
  const wrap = { display: 'grid', gap: 16 };
  const grid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
    alignItems: 'stretch',
  };
  const card = {
    background: 'var(--si-surface, rgba(255,255,255,0.04))',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
  };
  const header = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  };
  const h2 = { fontSize: 16, fontWeight: 600, margin: 0 };
  const kpiNum = { fontSize: 28, fontWeight: 700, lineHeight: 1.1 };
  const kpiSub = { opacity: 0.8, fontSize: 12 };

  // admin visibility (replace with real user context later)
  const userRole =
    typeof window !== 'undefined' ? localStorage.getItem('si.role') || 'User' : 'User';
  const showAdmin = /admin/i.test(userRole);

  return (
    <div style={wrap}>
      {/* Header row actions */}
      <div style={{ ...header, marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>{ui.title}</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/service-requests" className="btn" style={btnPrimary}>
            {ui.viewServiceRequests}
          </Link>
          <Link href="/reform-report" className="btn" style={btnPrimary}>
            {ui.createReport}
          </Link>
          <Link href="/reports" className="btn" style={btnSecondary}>
            {ui.viewReports}
          </Link>
          <Link href="/queries" className="btn" style={btnSecondary}>
            {ui.runQueries}
          </Link>
          {showAdmin ? (
            <Link href="/admin" className="btn" style={btnWarning}>
              {ui.admin}
            </Link>
          ) : null}
        </div>
      </div>

      {/* KPI cards */}
      <section aria-label={ui.kpis} style={grid}>
        <div style={card}>
          <div style={h2}>{ui.srtWithinSLA}</div>
          <div style={kpiNum}>{data.kpis.withinSLA}%</div>
          <div style={kpiSub}>
            {data.kpis.openRequests} {ui.openRequests}
          </div>
        </div>
        <div style={card}>
          <div style={h2}>{ui.avgResponseTime}</div>
          <div style={kpiNum}>{data.kpis.avgResponseMins}m</div>
          <div style={kpiSub}>
            {ui.srtWithinSLA}: {data.kpis.withinSLA}%
          </div>
        </div>
        <div style={card}>
          <div style={h2}>{ui.costSavingsYTD}</div>
          <div style={kpiNum}>{currency(data.kpis.costSavingsYTD)}</div>
          <div style={kpiSub}>
            <Link href="/reports">{ui.viewReports} →</Link>
          </div>
        </div>
      </section>

      {/* Visuals row */}
      <section style={grid}>
        <div style={card}>
          <div style={{ ...header, marginBottom: 8 }}>
            <h3 style={h2}>{ui.savingsByDept}</h3>
            <Link href="/reports" style={{ fontSize: 12 }}>
              {ui.viewAll}
            </Link>
          </div>
          <BarChart
            items={data.savingsByDept}
            max={Math.max(...data.savingsByDept.map((d) => d.value))}
            height={180}
          />
        </div>

        <div style={card}>
          <div style={{ ...header, marginBottom: 8 }}>
            <h3 style={h2}>{ui.reportsByArea}</h3>
            {/* CSV download hits the server route; works even on mobile */}
            <a
              href={`/api/dashboard/summary.csv?lang=${encodeURIComponent(lang)}`}
              style={tinyBtn}
              download
            >
              {ui.exportCSV}
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Donut items={data.reportsByArea} size={180} strokeW={18} />
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 14 }}>
              {data.reportsByArea.map((r, i) => (
                <li key={i} style={{ padding: '4px 0' }}>
                  {r.name}: <strong>{r.value}</strong>
                </li>
              ))}
            </ul>
          </div>
          {err ? (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
              Showing sample data (offline).
            </div>
          ) : null}
        </div>
      </section>

      {/* Table of open requests */}
      <section style={card} aria-label={ui.openRequests}>
        <div style={{ ...header, marginBottom: 8 }}>
          <h3 style={h2}>{ui.openRequests}</h3>
          <Link href="/service-requests" style={{ fontSize: 12 }}>
            {ui.viewAll}
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Title</th>
                <th style={th}>Dept</th>
                <th style={th}>Age (hrs)</th>
                <th style={th}>SLA (hrs)</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {data.openRequests.map((r) => (
                <tr key={r.id}>
                  <td style={tdMono}>{r.id}</td>
                  <td style={td}>{r.title}</td>
                  <td style={td}>{r.dept}</td>
                  <td style={td}>{r.ageHrs}</td>
                  <td style={td}>{r.slaHrs}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <Link href={`/service-requests/${r.id}`} style={tinyBtnLink}>
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick links */}
      <section
        style={{ ...card, display: 'flex', gap: 12, flexWrap: 'wrap' }}
        aria-label={ui.quickLinks}
      >
        <Link href="/service-requests" className="btn" style={btnChip}>
          {ui.viewServiceRequests}
        </Link>
        <Link href="/reform-report" className="btn" style={btnChip}>
          {ui.createReport}
        </Link>
        <Link href="/reports" className="btn" style={btnChip}>
          {ui.viewReports}
        </Link>
        <Link href="/queries" className="btn" style={btnChip}>
          {ui.runQueries}
        </Link>
        {showAdmin ? (
          <Link href="/admin" className="btn" style={btnChip}>
            {ui.admin}
          </Link>
        ) : null}
      </section>

      {loading ? <div style={{ fontSize: 12, opacity: 0.7 }}>Loading…</div> : null}
    </div>
  );
}

/* ---- tiny inline “tokens” to keep visual parity with existing surface ---- */
const btnBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  textDecoration: 'none',
  fontSize: 14,
  lineHeight: 1.1,
  whiteSpace: 'nowrap',
};
const btnPrimary = { ...btnBase, background: 'rgba(255,255,255,0.08)' };
const btnSecondary = { ...btnBase, background: 'transparent' };
const btnWarning = {
  ...btnBase,
  background: 'rgba(255,165,0,0.15)',
  borderColor: 'rgba(255,165,0,0.35)',
};
const btnChip = { ...btnBase, padding: '6px 10px', fontSize: 13 };
const tinyBtn = { ...btnBase, padding: '6px 8px', fontSize: 12, background: 'transparent' };
const tinyBtnLink = { fontSize: 12, textDecoration: 'none' };

const th = {
  textAlign: 'left',
  padding: '10px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: 0.2,
};
const td = { padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' };
const tdMono = { ...td, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' };
