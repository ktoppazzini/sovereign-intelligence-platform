'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './NonHomeShell.module.css'; // sidebar + layout CSS
import { getUiTranslations, normalizeLang } from '../lib/i18nClient';

/* ---------- tiny helpers (in-file) ---------- */
function Icon({ name }) {
  return (
    <span
      aria-hidden="true"
      style={{ inlineSize: 16, display: 'inline-block', textAlign: 'center' }}
    >
      {name?.[0]?.toUpperCase() ?? '•'}
    </span>
  );
}

const BASE = {
  // brand + nav
  'brand.title': 'Sovereign Intelligence',
  'nav.home': 'Home',
  'nav.assistant': 'Assistant',
  'nav.dashboard': 'Dashboard',
  'nav.reform': 'Reform Report',
  // top-right CTAs
  'cta.serviceRequests': 'Service Requests',
  'cta.admin': 'Admin',
  // hero + page title + pills
  'home.title': 'Home',
  'hero.title': 'Welcome to Sovereign Intelligence',
  'hero.subtitle': 'Get started by selecting an option below.',
  'pill.startReform': 'Start a Reform',
  'pill.createRequest': 'Create Request',
  'pill.viewReports': 'View Reports',
  // cards/sections
  'stat.openRequests': 'Open Requests',
  'stat.activeReforms': 'Active Reforms',
  'section.recentActivity': 'Recent Activity',
  'section.newReports': 'New Reports',
  'section.pinnedShortcuts': 'Pinned Shortcuts',
  // shortcuts + upload
  'shortcut.newReform': 'New Reform',
  'shortcut.myReports': 'My Reports',
  'shortcut.attachments': 'Attachments',
  'upload.logo': 'Upload Logo',
};

// parse rgb/rgba/hex → {r,g,b}
function parseColor(c) {
  if (!c) return { r: 59, g: 130, b: 246 }; // #3b82f6
  const m1 = c.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (m1) return { r: +m1[1], g: +m1[2], b: +m1[3] };
  const m2 = c.trim().replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(m2)) {
    return {
      r: parseInt(m2[0] + m2[0], 16),
      g: parseInt(m2[1] + m2[1], 16),
      b: parseInt(m2[2] + m2[2], 16),
    };
  }
  if (/^[0-9a-f]{6}$/i.test(m2)) {
    return {
      r: parseInt(m2.slice(0, 2), 16),
      g: parseInt(m2.slice(2, 4), 16),
      b: parseInt(m2.slice(4, 6), 16),
    };
  }
  return { r: 59, g: 130, b: 246 };
}
const clamp = (n, min = 0, max = 255) => Math.max(min, Math.min(max, n));
function shade(c, pct) {
  const { r, g, b } = parseColor(c);
  return `rgb(${clamp(r + (255 - r) * pct)}, ${clamp(g + (255 - g) * pct)}, ${clamp(
    b + (255 - b) * pct,
  )})`;
}

function useLang() {
  const [lang, setLang] = useState('English');
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const normalized = normalizeLang(sp.get('lang') || 'English');
      setLang(normalized);
      document.documentElement.setAttribute('lang', normalized);
    } catch {
      setLang('English');
      document.documentElement.setAttribute('lang', 'English');
    }
  }, []);
  return lang;
}

/** Robustly get the brand “dot” blue so CTAs & hero use the exact color. */
function useAccent() {
  const [accent, setAccent] = useState('#3b82f6'); // safe fallback
  useEffect(() => {
    const pick = () => {
      const root = getComputedStyle(document.documentElement);
      const v = (
        root.getPropertyValue('--si-accent') ||
        root.getPropertyValue('--brand-accent') ||
        ''
      ).trim();
      if (v) return setAccent(v);

      const el = document.querySelector('.' + styles.brandMark);
      if (!el) return;
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor?.trim();
      if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') return setAccent(bg);

      const bgi = cs.backgroundImage?.trim();
      const m = bgi && (bgi.match(/rgba?\([^)]*\)/) || bgi.match(/#[0-9a-fA-F]{3,8}/));
      if (m && m[0]) return setAccent(m[0]);
    };
    pick();
    const obs = new MutationObserver(pick);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
    return () => obs.disconnect();
  }, []);
  return accent;
}

/** Admin when role = Admin/Super Admin OR LAN dev OR ?forceAdmin=1 */
function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        if (sp.get('forceAdmin') === '1') {
          if (mounted) setIsAdmin(true);
          return;
        }

        let role = null;
        try {
          const res = await fetch('/api/users/me', { cache: 'no-store' });
          if (res.ok) {
            const j = await res.json();
            role = j?.role || null;
          }
        } catch {}
        if (!role) role = localStorage.getItem('si.role');

        const host = window.location.hostname || '';
        if (!role && /^(localhost|127\.0\.0\.1|192\.168\.)/.test(host)) role = 'Admin';

        const ok = /^(admin|super\s*admin)$/i.test((role || '').trim());
        if (mounted) setIsAdmin(ok);
      } catch {
        if (mounted) setIsAdmin(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return isAdmin;
}

/* ---------- main component ---------- */
export default function HomeShell({ active = 'home', children }) {
  const lang = useLang();
  const accent = useAccent();
  const accentDark = shade(accent, -0.25);
  const accentLight = shade(accent, 0.2);
  const isAdmin = useIsAdmin();

  const [labels, setLabels] = useState({
    brand: { title: BASE['brand.title'] },
    nav: {
      home: BASE['nav.home'],
      assistant: BASE['nav.assistant'],
      dashboard: BASE['nav.dashboard'],
      reform: BASE['nav.reform'],
    },
    cta: { serviceRequests: BASE['cta.serviceRequests'], admin: BASE['cta.admin'] },
    page: {
      title: BASE['home.title'],
      heroTitle: BASE['hero.title'],
      heroSubtitle: BASE['hero.subtitle'],
      pillStart: BASE['pill.startReform'],
      pillCreate: BASE['pill.createRequest'],
      pillView: BASE['pill.viewReports'],
      statOpen: BASE['stat.openRequests'],
      statActive: BASE['stat.activeReforms'],
      recent: BASE['section.recentActivity'],
      newReports: BASE['section.newReports'],
      pinned: BASE['section.pinnedShortcuts'],
      scNewReform: BASE['shortcut.newReform'],
      scMyReports: BASE['shortcut.myReports'],
      scAttachments: BASE['shortcut.attachments'],
      uploadLogo: BASE['upload.logo'],
    },
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setReady(false);
      try {
        const { t } = await getUiTranslations({
          base: BASE,
          lang,
          cachePrefix: 'SI_HOME_SHELL',
          setDir: true,
        });
        if (!mounted) return;
        setLabels({
          brand: { title: t['brand.title'] ?? BASE['brand.title'] },
          nav: {
            home: t['nav.home'] ?? BASE['nav.home'],
            assistant: t['nav.assistant'] ?? BASE['nav.assistant'],
            dashboard: t['nav.dashboard'] ?? BASE['nav.dashboard'],
            reform: t['nav.reform'] ?? BASE['nav.reform'],
          },
          cta: {
            serviceRequests: t['cta.serviceRequests'] ?? BASE['cta.serviceRequests'],
            admin: t['cta.admin'] ?? BASE['cta.admin'],
          },
          page: {
            title: t['home.title'] ?? BASE['home.title'],
            heroTitle: t['hero.title'] ?? BASE['hero.title'],
            heroSubtitle: t['hero.subtitle'] ?? BASE['hero.subtitle'],
            pillStart: t['pill.startReform'] ?? BASE['pill.startReform'],
            pillCreate: t['pill.createRequest'] ?? BASE['pill.createRequest'],
            pillView: t['pill.viewReports'] ?? BASE['pill.viewReports'],
            statOpen: t['stat.openRequests'] ?? BASE['stat.openRequests'],
            statActive: t['stat.activeReforms'] ?? BASE['stat.activeReforms'],
            recent: t['section.recentActivity'] ?? BASE['section.recentActivity'],
            newReports: t['section.newReports'] ?? BASE['section.newReports'],
            pinned: t['section.pinnedShortcuts'] ?? BASE['section.pinnedShortcuts'],
            scNewReform: t['shortcut.newReform'] ?? BASE['shortcut.newReform'],
            scMyReports: t['shortcut.myReports'] ?? BASE['shortcut.myReports'],
            scAttachments: t['shortcut.attachments'] ?? BASE['shortcut.attachments'],
            uploadLogo: t['upload.logo'] ?? BASE['upload.logo'],
          },
        });
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [lang]);

  const qsLang = '?lang=' + encodeURIComponent(lang || 'English');
  const navItems = useMemo(
    () => [
      { id: 'home', href: '/' + qsLang, label: labels.nav.home, icon: 'H' },
      { id: 'assistant', href: '/assistant' + qsLang, label: labels.nav.assistant, icon: 'A' },
      { id: 'dashboard', href: '/dashboard' + qsLang, label: labels.nav.dashboard, icon: 'D' },
      { id: 'reform-report', href: '/reform-report' + qsLang, label: labels.nav.reform, icon: 'R' },
    ],
    [labels, qsLang],
  );

  /* --- small inline “components” for the middle mockup --- */
  const Pill = (props) => (
    <a
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 16px',
        borderRadius: 9999,
        fontWeight: 700,
        textDecoration: 'none',
        background: '#fff',
        color: accentDark,
        boxShadow: '0 6px 14px rgba(0,0,0,.10)',
        border: '1px solid rgba(0,0,0,.06)',
        ...props.style,
      }}
    />
  );

  const Card = ({ children, style, className }) => (
    <div
      className={className}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,.12)',
        backdropFilter: 'blur(4px)',
        ...style,
      }}
    >
      {children}
    </div>
  );

  const Spark = ({ w = 180, h = 48, points = [4, 8, 6, 12, 9, 14, 12, 16] }) => {
    const max = Math.max(...points),
      min = Math.min(...points);
    const n = points.length;
    const toXY = (v, i) => {
      const x = (i / (n - 1)) * (w - 8) + 4;
      const y = h - 4 - ((v - min) / (max - min || 1)) * (h - 12);
      return [x, y];
    };
    const d = points
      .map((v, i) => toXY(v, i))
      .map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1])
      .join(' ');
    return (
      <svg width={w} height={h} style={{ display: 'block' }}>
        <path d={d} fill="none" stroke={accentLight} strokeWidth="2.5" />
        <rect x="0" y={h - 10} width={w} height="1" fill="rgba(255,255,255,0.08)" />
      </svg>
    );
  };

  return (
    <>
      {/* responsive grid helpers (scoped classes) */}
      <style>{`
        .si-grid {
          display: grid;
          gap: 16px;
          margin-top: 16px;
        }
        /* desktop: 12-col */
        @media (min-width: 1024px) {
          .si-grid { grid-template-columns: repeat(12, minmax(0, 1fr)); }
          .si-col-3 { grid-column: span 3; }
          .si-col-6 { grid-column: span 6; }
        }
        /* mobile/tablet: auto-fit cards */
        @media (max-width: 1023px) {
          .si-grid { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
        }
      `}</style>

      <div className={styles.shell}>
        {/* LEFT NAV */}
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <div className={styles.brandMark} />
            <div className={styles.brandTitle}>{labels.brand.title}</div>
          </div>
          <div className={styles.hr} />
          <nav className={styles.nav} aria-label="Section">
            {navItems.map((item) => {
              const isActive = active === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </aside>

        {/* RIGHT CONTENT */}
        <main className={styles.content} aria-busy={!ready}>
          {/* top-right CTAs (exact brand blue) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              padding: '10px 0 14px',
              flexWrap: 'wrap', // responsiveness
              rowGap: 8,
            }}
          >
            <a
              href={'/admin/service-requests2' + qsLang}
              style={{
                ...btnBase,
                color: '#fff',
                backgroundColor: accent,
                borderColor: 'transparent',
                boxShadow: '0 8px 18px rgba(0,0,0,.18)',
              }}
            >
              {labels.cta.serviceRequests}
            </a>
            {isAdmin && (
              <a
                href={'/admin' + qsLang}
                style={{
                  ...btnBase,
                  color: '#fff',
                  backgroundColor: accent,
                  borderColor: 'transparent',
                  boxShadow: '0 8px 18px rgba(0,0,0,.18)',
                }}
              >
                {labels.cta.admin}
              </a>
            )}
          </div>

          {/* --------- MOCKUP MIDDLE (in this file) --------- */}
          {/* page title */}
          <h1
            style={{
              margin: '0 0 12px 0',
              fontSize: 20,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.92)',
            }}
          >
            {labels.page.title}
          </h1>

          {/* HERO */}
          <section
            style={{
              borderRadius: 20,
              padding: 28,
              backgroundImage: `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)`,
              boxShadow: '0 10px 30px rgba(0,0,0,.25)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'white',
            }}
          >
            {/* badge avatar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,.15)',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: 22,
                  letterSpacing: 1,
                }}
              >
                SI
              </div>
            </div>

            <h2
              style={{
                textAlign: 'center',
                margin: '4px 0',
                fontSize: 28,
                lineHeight: 1.2,
                fontWeight: 800,
              }}
            >
              {labels.page.heroTitle}
            </h2>
            <p style={{ textAlign: 'center', margin: '6px 0 18px', opacity: 0.92 }}>
              {labels.page.heroSubtitle}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Pill href={'/reform-report' + qsLang}>{labels.page.pillStart}</Pill>
              <Pill href={'/admin/service-requests2' + qsLang}>{labels.page.pillCreate}</Pill>
              <Pill href={'/dashboard' + qsLang}>{labels.page.pillView}</Pill>
            </div>
          </section>

          {/* GRID under hero */}
          <div className="si-grid">
            {/* Open Requests */}
            <Card className="si-col-3">
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>132</div>
              <div style={{ opacity: 0.8, marginTop: 2 }}>{labels.page.statOpen}</div>
              <div style={{ marginTop: 8 }}>
                <Spark points={[3, 4, 6, 5, 7, 8, 7, 9]} />
              </div>
            </Card>

            {/* Active Reforms */}
            <Card className="si-col-3">
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>47</div>
              <div style={{ opacity: 0.8, marginTop: 2 }}>{labels.page.statActive}</div>
              <div style={{ marginTop: 8 }}>
                <Spark points={[2, 3, 4, 3, 5, 6, 7, 6]} />
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="si-col-6">
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: 10 }}>
                {labels.page.recent}
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}
                >
                  <span
                    style={{ width: 8, height: 8, borderRadius: '50%', background: accentLight }}
                  />
                  <div
                    style={{
                      flex: 1,
                      height: 10,
                      borderRadius: 6,
                      background: 'rgba(255,255,255,.08)',
                    }}
                  />
                </div>
              ))}
            </Card>

            {/* New Reports */}
            <Card className="si-col-6">
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                {labels.page.newReports}
              </div>
              <Spark w={520} points={[3, 5, 4, 6, 5, 7, 6, 8, 7, 9]} />
            </Card>

            {/* Pinned Shortcuts */}
            <Card className="si-col-3">
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: 10 }}>
                {labels.page.pinned}
              </div>
              {[
                { label: labels.page.scNewReform, href: '/reform-report' + qsLang },
                { label: labels.page.scMyReports, href: '/dashboard' + qsLang },
                { label: labels.page.scAttachments, href: '/attachments' + qsLang },
              ].map((it) => (
                <a
                  key={it.label}
                  href={it.href}
                  style={{
                    display: 'block',
                    padding: '8px 10px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    color: '#fff',
                    background: 'rgba(255,255,255,.04)',
                    border: '1px solid rgba(255,255,255,.06)',
                    marginBottom: 8,
                  }}
                >
                  {it.label}
                </a>
              ))}
            </Card>

            {/* Upload Logo */}
            <Card className="si-col-3" style={{ display: 'grid', placeItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: 'rgba(255,255,255,.08)',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 8px',
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: 'rgba(255,255,255,.22)',
                    }}
                  />
                </div>
                <div>{labels.page.uploadLogo}</div>
              </div>
            </Card>
          </div>

          {/* keep any routed children below (if you pass any) */}
          {children}
        </main>
      </div>
    </>
  );
}

/* CTA base (top-right) */
const btnBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 14px',
  borderRadius: 12,
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.1,
  whiteSpace: 'nowrap',
  border: '1px solid rgba(255,255,255,0.18)',
  transition: 'transform .06s ease, box-shadow .12s ease, opacity .12s ease',
};
