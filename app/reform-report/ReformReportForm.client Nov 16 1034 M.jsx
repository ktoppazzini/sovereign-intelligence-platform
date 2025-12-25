'use client';
import { getUiTranslations, normalizeLang } from '@/lib/i18nClient';
import ReportSidePanel from './ReportSidePanel.client';
import UploadCardWire from './UploadCardWire.client';
import DefenseDownloadWire from './DefenseDownloadWire.client';
import RoadmapWire from './RoadmapWire.client';
import PdfExportWire from './PdfExportWire.client';
import ApprovalsWire from './ApprovalsWire.client';

import styles from './ReformReport.module.css';

import { useEffect, useMemo, useRef, useState } from 'react';

// pdf libs (client-side fallback export)
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Chart.js client-side imports
// import Chart from 'chart.js/auto';
// import ChartDataLabels from 'chartjs-plugin-datalabels';

// ✅ Debugging setup
const DEBUG_NS = 'SR:REFORM'; // Use the preferred namespace

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const xid = () => Math.random().toString(36).slice(2, 8);

function dbg(...args) {
  console.log(`[${DEBUG_NS}]`, ...args);
}

function dbgWarn(...args) {
  console.warn(`[${DEBUG_NS}]`, ...args);
}

function dbgErr(...args) {
  try {
    console.error('[SR:REFORM]', ...args);
  } catch (e) {
    console.error('dbgErr failed.', e);
  }
}

const preview = (s, n = 160) =>
  typeof s === 'string' ? (s.length > n ? `${s.slice(0, n)} …` : s) : s;

const qs = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const DEBUG_ON =
  typeof window !== 'undefined' && (qs?.get('debug') === '1' || qs?.get('dbg') === '1');
const vdbg = (...args) => {
  if (DEBUG_ON) console.log(`[${DEBUG_NS}:VERBOSE]`, ...args);
};

function expose(key, value) {
  try {
    if (typeof window !== 'undefined') {
      window.__SR_REFORM__ = window.__SR_REFORM__ || {};
      window.__SR_REFORM__[key] = value;
    }
  } catch {}
}

/* ============================================================================
   Brand Accent Helpers (mirror HomeShell)
   ========================================================================== */
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
  // pct>0 lighten; pct<0 darken
  const t = pct >= 0 ? 255 : 0;
  const p = Math.abs(pct);
  const nr = Math.round((t - r) * p + r);
  const ng = Math.round((t - g) * p + g);
  const nb = Math.round((t - b) * p + b);
  return `rgb(${clamp(nr)}, ${clamp(ng)}, ${clamp(nb)})`;
}
/** Robustly get the brand “dot” blue so pills use the exact color. */
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

      // Try brand mark from shell if present
      const el = document.querySelector('[class*="brandMark"]');
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

/* ============================================================================
   Constants & Translation Utilities
   ========================================================================== */
const BASE_UI = {
  title: 'Reform Report',
  orgName: 'Organization Name',
  country: 'Country',
  tier: 'Tier',
  companySize: 'Company Size',
  timeFrame: 'Time Frame',
  costSavingsGoal: 'Cost Savings Goal',
  strategicGoal: 'Strategic Goal',
  desiredOutcome: 'Desired Outcome',
  preparedFor: 'Prepared For',
  preparedForEmail: 'Prepared For Email',
  preparedBy: 'Prepared By',
  preparedByEmail: 'Prepared By Email',
  uploadReports: 'Upload Reports',
  chooseFiles: 'Choose files',
  filesSelected: 'files selected',
  submit: 'Submit Report',
  submitting: 'Submitting…',
  submitted: 'Submitted',
  error: 'Something went wrong',
  uploading: 'Uploading…',
  uploaded: 'Uploaded',
  generate: 'Generate Report',
  generating: 'Generating…',
  exportPdf: 'Export to PDF',
  exporting: 'Exporting…',
  finalize: 'Finalize',
  finalizing: 'Finalizing…',
  finalized: 'Finalized',
  openHtml: 'Open HTML',
  downloadPdf: 'Download PDF',
  submitShort: 'Submit',
};

const OPT_CACHE_KEY = (lang, field) =>
  `SI_REFORM_OPT_T_${field}_${(lang || 'English').toLowerCase()}`;
const UI_CACHE_KEY = (lang) => `SI_REFORM_UI_${(lang || 'English').toLowerCase()}`;
const uniq = (arr) =>
  Array.from(new Map(arr.map((v) => [String(v).trim().toLowerCase(), String(v).trim()])).values());

function clonePlainObject(obj) {
  try {
    return JSON.parse(JSON.stringify(obj || {}));
  } catch {
    const out = {};
    if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) out[k] = v;
    return out;
  }
}

async function translateMapClient(map, targetLang) {
  const rid = xid();
  const started = now();
  const payload = { mode: 'json', targetLang, map: clonePlainObject(map) };
  const keyCount = payload.map ? Object.keys(payload.map).length : 0;
  const badShape = !payload.map || typeof payload.map !== 'object' || keyCount === 0;

  dbg('gptTranslation[json] → start', {
    rid,
    lang: targetLang,
    keys: keyCount,
    shapeOK: !badShape,
  });
  if (badShape) {
    dbgErr('gptTranslation[json] → NOT SENDING: empty/invalid map', { rid, mapType: typeof map });
    return map || {};
  }

  try {
    const res = await fetch('/api/gptTranslation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-SI-Debug': `reform-ui-json:${rid}` },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });
    const raw = await res.text();
    let j;
    try {
      j = JSON.parse(raw);
    } catch {}
    dbg('gptTranslation[json] → done', {
      rid,
      ok: res.ok,
      status: res.status,
      ms: Math.round(now() - started),
      respKeys: j?.translation ? Object.keys(j.translation).length : 0,
      hasError: !!j?.error,
      rawPreview: preview(raw),
    });
    if (res.ok && j && typeof j.translation === 'object') return j.translation;
  } catch (err) {
    dbgWarn('gptTranslation[json] → exception', { rid, err: String(err?.message || err) });
  }
  return map;
}

// ... (translation helpers & detectLanguage identical)

export default function ReformReportForm({ setGenDoneExternal, setGeneratedHtmlExternal }) {
  const [activeLang, setActiveLang] = useState(detectLanguage());
  // Fast Mode toggle state
  const [fastMode, setFastMode] = useState(false);
  const langResolved = useMemo(() => normalizeLang(activeLang || 'English'), [activeLang]);

  const [ui, setUi] = useState(BASE_UI);
  const [loadingUI, setLoadingUI] = useState(true);

  const [countries, setCountries] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [frames, setFrames] = useState([]);

  const [countryMap, setCountryMap] = useState({});
  const [tierMap, setTierMap] = useState({});
  const [sizeMap, setSizeMap] = useState({});
  const [frameMap, setFrameMap] = useState({});

  const [form, setForm] = useState({
    preparedForEmail: '',
    preparedByEmail: '',
    orgName: '',
    country: '',
    tier: '',
    companySize: '',
    timeFrame: '',
    costSavingsGoal: '',
    strategicGoal: '',
    desiredOutcome: '',
    preparedFor: '',
    preparedBy: '',
    files: [],
  });
  const [minWords, setMinWords] = useState(20000); // hidden (no UI change)

  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  // === Nav pill look (match sidebar item) ===
  const accent = useAccent();
  const pillBg = shade(accent, -0.55); // dark base like nav item
  const pillHover = shade(accent, -0.45); // slightly lighter on hover
  const pillBr = shade(accent, -0.2); // subtle border

  // shared pill styles
  const navBtnBase = {
    backgroundColor: pillBg,
    color: '#E6F0FF',
    borderRadius: 12,
    padding: '10px 16px',
    border: `1px solid ${pillBr}`,
    boxShadow: '0 0 0 1px rgba(255,255,255,0.06) inset',
    fontWeight: 600,
    lineHeight: 1.1,
    transition: 'background-color .15s ease-in-out, border-color .15s ease-in-out',
  };

  const navBtnDone = {
    backgroundColor: '#124A2A', // dark green for "done"
    borderColor: '#15613A',
    color: '#E8FFF1',
  };

  const navBtnDisabled = { opacity: 0.7, cursor: 'not-allowed' };

  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState('');
  const [uploadedList, setUploadedList] = useState([]);

  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState('');
  const [genResult, setGenResult] = useState(null);
  const [rid, setRid] = useState(null);

  const [recordId, setRecordId] = useState(null);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [generatedHtmlOriginal, setGeneratedHtmlOriginal] = useState('');
  const [exportHtmlUrl, setExportHtmlUrl] = useState('');

  const [exporting, setExporting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const [genDone, setGenDone] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [finalizeDone, setFinalizeDone] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);

  // store server PDF URL from export for the “Download PDF” button
  const [exportPdfUrl, setExportPdfUrl] = useState('');

  const fileInputRef = useRef(null);

  function updateFormField(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      vdbg('field.change', { field, from: prev[field], to: value });
      expose('form', next);
      return next;
    });
  }

  useEffect(() => {
    const handlePop = () => setActiveLang(detectLanguage());
    window.addEventListener('popstate', handlePop);
    setActiveLang(detectLanguage());
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Execute TypeSwitch script after HTML is rendered
  useEffect(() => {
    if (!generatedHtml) return;

    setTimeout(() => {
      try {
        const script = document.createElement('script');
        script.textContent = `(function(){if(typeof document==='undefined')return;console.log('[TypeSwitch] Executing');function applyType(card){try{if(!card)return;var sel=card.querySelector('select.chart-type-select')||card.querySelector('.chart-type-select')||card.querySelector('select');if(!sel)return;var value=(sel.value||'').trim();if(!value){value=card.getAttribute('data-type')||'line';sel.value=value;}card.setAttribute('data-type',value);var plots=card.querySelectorAll('.plot');plots.forEach(function(p){var match=p.classList.contains(value);p.style.display=match?'block':'none';});}catch(e){console.error('[applyType]',e);}}function initTypes(){var cards=document.querySelectorAll('.chart-card, figure[data-type]');console.log('[TypeSwitch] Found '+cards.length+' cards');cards.forEach(function(c){applyType(c);});}document.addEventListener('change',function(e){if(e.target.tagName!=='SELECT')return;var card=e.target.closest('.chart-card')||e.target.closest('figure[data-type]');if(card)applyType(card);},true);initTypes();if(typeof window!=='undefined'){window.reportGraphs={_applyType:applyType,_initTypes:initTypes};console.log('[TypeSwitch] Ready');}})();`;
        document.body.appendChild(script);
        console.log('[ReformReport] TypeSwitch injected');
      } catch (e) {
        console.error('[ReformReport] TypeSwitch failed:', e);
      }
    }, 100);
  }, [generatedHtml]);

  // --- Helpers used below (same impl as Part 1 referenced) ---
  function detectLanguage() {
    if (typeof window === 'undefined') return 'English';
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
  }
  async function readSafeText(res) {
    try {
      return await res.text();
    } catch {
      return '';
    }
  }
  function safeParseJSON(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  async function translateTextClient(text, targetLang, preserve = 'html') {
    const rid = xid();
    const started = now();
    const payload = { mode: 'text', text, targetLang, preserve };

    dbg('gptTranslation[text] → start', {
      rid,
      lang: targetLang,
      size: (text || '').length,
      preserve,
    });

    try {
      const res = await fetch('/api/gptTranslation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-SI-Debug': `reform-report-text:${rid}` },
        cache: 'no-store',
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      let j;
      try {
        j = JSON.parse(raw);
      } catch {}
      dbg('gptTranslation[text] → done', {
        rid,
        ok: res.ok,
        status: res.status,
        ms: Math.round(now() - started),
        got: j?.translated ? (j.translated.length > 20 ? 'string(len)' : 'short') : 'none',
        err: j?.error,
        rawPreview: preview(raw),
      });
      if (res.ok && j?.translated) return j.translated;
    } catch (err) {
      dbgWarn('gptTranslation[text] → exception', { rid, err: String(err?.message || err) });
    }
    return text;
  }

  async function translateList(values, langTarget, cacheKey) {
    const vals = uniq(values);
    if (!vals.length) return {};
    const en = String(langTarget || 'English').toLowerCase();
    if (en === 'english' || en === 'en') return Object.fromEntries(vals.map((v) => [v, v]));

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const obj = JSON.parse(cached);
        if (vals.every((v) => obj[v])) {
          dbg('[opts] cache hit →', cacheKey);
          return obj;
        }
      }
    } catch {}

    const payload = Object.fromEntries(vals.map((v) => [v, v]));
    const map = await translateMapClient(payload, langTarget);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(map));
    } catch {}
    return map;
  }

  // UI translations on load / language change
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingUI(true);
      const helperRid = xid();
      const helperStart = now();
      dbg('ui-translate[helper] → start', {
        rid: helperRid,
        lang: langResolved,
        baseKeys: Object.keys(BASE_UI).length,
        src: '../../lib/i18nClient',
      });

      let nextUi = BASE_UI;
      try {
        const { t } = await getUiTranslations({
          base: BASE_UI,
          lang: langResolved,
          cachePrefix: 'SI_REFORM_FORM',
          setDir: true,
        });
        nextUi = t || BASE_UI;
        dbg('ui-translate[helper] → ok', {
          rid: helperRid,
          ms: Math.round(now() - helperStart),
          keys: Object.keys(nextUi).length,
        });
      } catch (err) {
        dbgWarn('ui-translate[helper] → error (will fallback)', {
          rid: helperRid,
          ms: Math.round(now() - helperStart),
          message: String(err?.message || err),
        });
        nextUi = BASE_UI;
      }

      const isEnglish = String(langResolved || 'English')
        .toLowerCase()
        .startsWith('english');
      const maybeSame =
        JSON.stringify(Object.values(nextUi)) === JSON.stringify(Object.values(BASE_UI));

      if (!isEnglish && maybeSame) {
        const cacheKey = UI_CACHE_KEY(langResolved);
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object') {
              dbg('ui-translate[json-fallback] → cache hit', { lang: langResolved });
              nextUi = parsed;
            }
          } else {
            const mapPayload = clonePlainObject(BASE_UI);
            const ridJson = xid();
            dbg('ui-translate[json-fallback] → calling /api/gptTranslation', {
              rid: ridJson,
              lang: langResolved,
              keys: Object.keys(mapPayload).length,
            });
            const translated = await translateMapClient(mapPayload, langResolved);
            nextUi = translated || BASE_UI;
            localStorage.setItem(cacheKey, JSON.stringify(nextUi));
          }
        } catch (err) {
          dbgWarn('ui-translate[json-fallback] → error', { message: String(err?.message || err) });
        }
      } else {
        if (isEnglish) dbg('ui-translate → English: no translation needed');
        if (!maybeSame) dbg('ui-translate → helper provided translated strings');
      }

      if (mounted) {
        setUi(nextUi);
        setLoadingUI(false);
        dbg('ui-translate → final sample', { title: nextUi.title, orgName: nextUi.orgName });
        expose('ui', nextUi);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [langResolved]);

  // Load options
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rid = xid();
      const started = now();
      try {
        const res = await fetch('/api/reform/options', {
          cache: 'no-store',
          headers: { 'X-SI-Debug': `reform-options:${rid}` },
        });
        const j = await res.json();
        if (cancelled) return;
        setCountries(Array.isArray(j?.countries) ? uniq(j.countries) : []);
        setTiers(Array.isArray(j?.tiers) ? uniq(j.tiers) : []);
        setSizes(Array.isArray(j?.sizes) ? uniq(j.sizes) : []);
        setFrames(Array.isArray(j?.timeFrames) ? uniq(j.timeFrames) : []);
        dbg('options → loaded', {
          rid,
          ms: Math.round(now() - started),
          countries: (j?.countries || []).length,
          tiers: (j?.tiers || []).length,
          sizes: (j?.sizes || []).length,
          timeFrames: (j?.timeFrames || []).length,
        });
        expose('options', j);
      } catch (err) {
        dbgErr('options → error', { message: String(err?.message || err) });
        if (cancelled) return;
        setCountries([]);
        setTiers([]);
        setSizes([]);
        setFrames([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Translate option values for UI display
  useEffect(() => {
    (async () => {
      const cm = await translateList(
        countries,
        langResolved,
        OPT_CACHE_KEY(langResolved, 'countries'),
      );
      const tm = await translateList(tiers, langResolved, OPT_CACHE_KEY(langResolved, 'tiers'));
      const sm = await translateList(sizes, langResolved, OPT_CACHE_KEY(langResolved, 'sizes'));
      const fm = await translateList(frames, langResolved, OPT_CACHE_KEY(langResolved, 'frames'));
      setCountryMap(cm);
      setTierMap(tm);
      setSizeMap(sm);
      setFrameMap(fm);
      expose('translatedOptionMaps', { cm, tm, sm, fm });
    })();
  }, [countries, tiers, sizes, frames, langResolved]);

  const tr = (map, v) => {
    const key = v == null ? '' : String(v).trim();
    return key ? map[key] || key : '';
  };

  // uploads
  function toUploadedObjects(list) {
    if (!Array.isArray(list)) return [];
    return list.map((item) => {
      if (typeof item === 'string') {
        const name = item.split('/').pop() || 'file';
        return { url: item, filename: name, size: 0 };
      }
      return {
        url: item.url || '',
        filename: item.filename || item.name || (item.url ? item.url.split('/').pop() : 'file'),
        size: item.size || 0,
      };
    });
  }

  async function uploadSelectedFiles(fileList) {
    if (!fileList || fileList.length === 0) return [];
    if (fileList.length > 10) throw new Error('Please select at most 10 files.');
    const fd = new FormData();
    [...fileList].forEach((f) => fd.append('file', f, f.name));

    const rid = xid();
    console.group(`[${DEBUG_NS}] upload → /api/uploads rid=${rid}`);
    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: fd,
        headers: { 'X-SI-Debug': `reform-upload:${rid}` },
      });
      const j = await res.json().catch(() => ({}));
      dbg('upload → response', { rid, status: res.status, ok: res.ok, bodyKeys: Object.keys(j) });
      if (!res.ok || j.error) throw new Error(j.error || 'Upload failed');
      const rawList = j.files || j.urls || [];
      const normalized = toUploadedObjects(rawList);
      console.groupEnd();
      expose('uploadedList', normalized);
      return normalized;
    } catch (e) {
      dbgErr('upload → error', { rid, message: String(e?.message || e) });
      console.groupEnd();
      throw e;
    }
  }

  async function doUpload(filesForUpload) {
    try {
      setUploading(true);
      setUploadNote(ui.uploading);
      const uploaded = await uploadSelectedFiles(filesForUpload);
      setUploadedList(uploaded);
      setForm((f) => ({ ...f, files: uploaded }));
      setUploadNote(ui.uploaded);
    } catch (e) {
      setUploadNote(e?.message || ui.error);
    } finally {
      setUploading(false);
    }
  }

  // client-side fallback PDF
  async function onDownloadPdfFallback() {
    const card = document.getElementById('reformCard');
    if (!card) return;
    const canvas = await html2canvas(card, { scale: 2, useCORS: true, backgroundColor: null });
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    if (imgH <= pageH) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
    } else {
      let position = 0,
        heightLeft = imgH;
      while (heightLeft > 0) {
        pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
        heightLeft -= pageH;
        if (heightLeft > 0) pdf.addPage();
        position = -(imgH - heightLeft);
      }
    }
    pdf.save('Reform_Report.pdf');
  }

  // Generate
  async function onGenerate() {
    setGenBusy(true);
    setGenError('');
    setGenResult(null);
    setGenDone(false);
    const ridGen = xid();
    const started = now();

    try {
      const attachmentUrls = (form.files || []).map((f) => f?.url).filter(Boolean);

      const canon = {
        orgName: form.orgName,
        country: form.country,
        tier: form.tier,
        companySize: form.companySize,
        timeFrame: form.timeFrame,
        costSavingsGoal: Number(form.costSavingsGoal || 100),
        strategicGoal: form.strategicGoal,
        desiredOutcome: form.desiredOutcome,
        preparedFor: form.preparedFor,
        preparedForEmail: form.preparedForEmail,
        preparedBy: form.preparedBy,
        preparedByEmail: form.preparedByEmail,
        logoUrl: '/brand/sovereign-mark.svg',
        reportDate: new Date().toISOString().split('T')[0],
        metrics: {
          deliveryShare: 28,
          marketDelivery: 34,
          onTime: 87,
          nps: 46,
        },
      };

      const sections = {
        exec: 'Executive summary goes here.',
        current: 'Current state analysis goes here.',
        financials: 'Financial overview goes here.',
        kpis: 'Key performance indicators go here.',
        ops: 'Operating model description goes here.',
        risk: 'Risk assessment goes here.',
        roi: 'ROI and next steps go here.',
      };

      const legacyPayload = {
        lang: langResolved,
        orgName: form.orgName,
        country: form.country,
        tier: form.tier,
        companySize: form.companySize,
        timeFrame: form.timeFrame,
        costSavingsGoal: form.costSavingsGoal,
        strategicGoal: form.strategicGoal,
        desiredOutcome: form.desiredOutcome,
        preparedFor: form.preparedFor,
        preparedForEmail: form.preparedForEmail,
        preparedBy: form.preparedBy,
        preparedByEmail: form.preparedByEmail,
        files: (form.files || []).map((f) => ({
          url: f.url,
          filename: f.filename || f.name,
          size: f.size,
        })),
        rid,
      };

      const newPayload = {
        form: {
          orgName: form.orgName,
          country: form.country,
          tier: form.tier,
          companySize: form.companySize,
          timeFrame: form.timeFrame,
          costSavingsGoal: form.costSavingsGoal,
          desiredOutcome: form.desiredOutcome,
          strategicGoal: form.strategicGoal,
          preparedFor: form.preparedFor,
          preparedForEmail: form.preparedForEmail,
          preparedBy: form.preparedBy,
          preparedByEmail: form.preparedByEmail,
        },
        lang: langResolved,
        targetLang: langResolved,
        attachmentUrls,
        recordId,
        logoUrl: '/brand/sovereign-mark.svg',
        minWords: Number(minWords) || 10000,
      };

      const payload = {
        canon,
        sections,
        phases: [],
        ...legacyPayload,
        ...newPayload,
        ...(fastMode ? { fastMode: true } : {}),
      };
      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      try {
        console.group(`[${DEBUG_NS}] generate`);
        dbg('generate → POST /api/reform/generate', {
          rid: ridGen,
          lang: langResolved,
          files: attachmentUrls.length,
          minWords: newPayload.minWords,
        });
        vdbg('generate.payload.preview', preview(JSON.stringify(payload), 400));
        console.log('Sending payload to /api/reform/generate:', JSON.stringify(payload, null, 2));
        expose('lastGeneratePayload', payload);
        console.log('Sending payload:', JSON.stringify(payload, null, 2));

        const res = await fetch('/api/reform/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SI-Debug': `reform-generate:${ridGen}`,
          },
          body: JSON.stringify(payload),
        });

        const raw = await readSafeText(res);
        const j = safeParseJSON(raw);
        dbg('generate → response', {
          rid: ridGen,
          ms: Math.round(now() - started),
          status: res.status,
          ok: res.ok,
          hasJson: !!j,
          keys: j ? Object.keys(j).length : 0,
        });
        vdbg('generate.response.rawPreview', preview(raw, 600));
        expose('lastGenerateResponse', j || raw);

        if (!res.ok || !j?.ok) {
          const msg = j?.error || `HTTP ${res.status}`;
          throw new Error(msg);
        }

        if (j.rid || j.report || j.wordCount) {
          setGenResult(j);
          setRid(j.rid || null);
          if (j.report) {
            setGeneratedHtml(j.report);
            setGeneratedHtmlOriginal(j.report);
            if (typeof setGeneratedHtmlExternal === 'function') {
              setGeneratedHtmlExternal(j.report);
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('si-reform-generated', {
                  detail: { html: j.report, rid: j.rid || null },
                }),
              );
            }
          }
          if (typeof setGenDoneExternal === 'function') {
            setGenDoneExternal(true);
          } else {
            setGenDone(true);
          }
        }

        if (j.recordId || j.html || j.status) {
          setRecordId(j.recordId || recordId || null);
          if (j.html) {
            setGeneratedHtml(j.html);
            setGeneratedHtmlOriginal(j.html);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('si-reform-generated', {
                  detail: { html: j.html, rid: j.recordId || null },
                }),
              );
            }
          }
          setGenResult((prev) =>
            prev || {
              rid: j.recordId,
              report: j.html,
              wordCount: undefined,
            },
          );
        }

        setGenError('');
        setGenDone(true);
        console.groupEnd();
      } catch (e) {
        let msg = e?.message || 'Generation failed';
        if (msg === 'HTTP 200') {
          msg = 'An unknown error occurred. Please try again or contact support.';
        }
        dbgErr('generate → error', { message: msg });
        setGenError(msg);
        setGenDone(false);
        console.groupEnd();
      } finally {
        setGenBusy(false);
      }
    } catch (e) {
      let msg = e?.message || 'Generation failed';
      if (msg === 'HTTP 200') {
        msg = 'An unknown error occurred. Please try again or contact support.';
      }
      dbgErr('generate → error', { message: msg });
      setGenError(msg);
      setGenDone(false);
    } finally {
      setGenBusy(false);
    }
  }

  // Retranslate generated HTML when language changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!generatedHtmlOriginal) return;
      const t0 = now();
      const translated = await translateTextClient(generatedHtmlOriginal, langResolved, 'html');
      if (!cancelled) {
        setGeneratedHtml(translated || generatedHtmlOriginal);
        dbg('report-retranslate → done', { ms: Math.round(now() - t0), lang: langResolved });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [langResolved, generatedHtmlOriginal]);

  // Export (server) — no longer requires record id to be present
  async function onExportPdfServer() {
    setExporting(true);
    setSubmitMsg('');
    setExportDone(false);
    const ridExp = xid();
    const t0 = now();
    try {
      if (!generatedHtml) throw new Error('No report HTML found. Please generate first.');

      const localFallbackId = `local-${Date.now().toString(36)}`;
      const id = recordId || rid || localFallbackId;

      const filenameSlug = `${(form.orgName || 'reform-report')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-${id}`;
      const body = {
        recordId: id,
        reportHtml: generatedHtml,
        title: `Sovereign Intelligence Reform Report — ${form.orgName || ''}`.trim(),
        filenameSlug,
        extraFields: {},
      };
      expose('lastExportBody', body);

      const res = await fetch('/api/reform/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-SI-Debug': `reform-export:${ridExp}` },
        body: JSON.stringify(body),
      });
      const raw = await readSafeText(res);
      const j = safeParseJSON(raw) || {};
      dbg('export → response', { rid: ridExp, status: res.status, ms: Math.round(now() - t0) });
      vdbg('export.response.rawPreview', preview(raw, 400));
      expose('lastExportResponse', j || raw);

      if (!res.ok || j.error) throw new Error(j.error || `HTTP ${res.status}`);

      setExportHtmlUrl(j.htmlUrl || '');
      setExportPdfUrl(j.downloadUrl || j.pdfUrl || '');
      setSubmitMsg(j.pdfUrl ? `Exported. PDF: ${j.pdfUrl}` : 'Exported.');
      setExportDone(true);

      if (j.downloadUrl || j.pdfUrl) {
        if (typeof window !== 'undefined')
          window.open(j.downloadUrl || j.pdfUrl, '_blank', 'noopener');
      }
    } catch (e) {
      dbgErr('export → error', { rid: ridExp, message: String(e?.message || e) });
      setSubmitMsg(e?.message || ui.error);
      setExportDone(false);
    } finally {
      setExporting(false);
    }
  }

  // Finalize (kept for workflow parity; does not change Prepared fields)
  const onFinalize = async () => {
    setFinalizing(true);
    setSubmitMsg('');
    setFinalizeDone(false);
    const ridFin = xid();
    try {
      const id = recordId || rid;
      if (!id) throw new Error('Generate the report first.');

      const body = { recordId: id, rid: id };
      expose('lastFinalizeBody', body);

      const res = await fetch('/api/reform/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-SI-Debug': `reform-finalize:${ridFin}` },
        body: JSON.stringify(body),
      });

      const raw = await readSafeText(res);
      const j = safeParseJSON(raw);
      dbg('finalize → response', { rid: ridFin, status: res.status, ok: res.ok });
      vdbg('finalize.response.rawPreview', preview(raw, 300));
      expose('lastFinalizeResponse', j || raw);

      if (!res.ok || j?.error || j?.ok === false) throw new Error(j?.error || `HTTP ${res.status}`);
      setSubmitMsg(j?.status ? `${j.status}` : ui.finalized);
      setFinalizeDone(true);
    } catch (e2) {
      dbgErr('finalize → error', { rid: ridFin, message: String(e2?.message || e2) });
      setSubmitMsg(e2?.message || ui.error);
      setFinalizeDone(false);
    } finally {
      setFinalizing(false);
    }
  };

  // Submit
  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg('');
    setSubmitDone(false);
    const ridSub = xid();
    try {
      const id = recordId || rid;
      if (!id) throw new Error('Please click "Generate Report" before submitting.');

      const body = { recordId: id, rid: id };
      expose('lastSubmitBody', body);

      const res = await fetch('/api/reform/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-SI-Debug': `reform-submit:${ridSub}` },
        body: JSON.stringify(body),
      });

      const raw = await readSafeText(res);
      const j = safeParseJSON(raw);
      dbg('submit → response', { rid: ridSub, status: res.status, ok: res.ok });
      vdbg('submit.response.rawPreview', preview(raw, 300));
      expose('lastSubmitResponse', j || raw);

      if (!res.ok || j?.ok === false || j?.error)
        throw new Error((j && j.error) || `HTTP ${res.status}`);
      setSubmitMsg(j?.status ? j.status : ui.submitted);
      setSubmitDone(true);
    } catch (e2) {
      dbgErr('submit → error', { rid: ridSub, message: String(e2?.message || e2) });
      setSubmitMsg(e2?.message || ui.error);
      setSubmitDone(false);
    } finally {
      setSubmitting(false);
    }
  };

  // state probes
  useEffect(() => {
    vdbg('state.genFlags', { genBusy, genDone, genError: !!genError });
  }, [genBusy, genDone, genError]);
  useEffect(() => {
    if (recordId || rid) vdbg('state.record', { recordId, rid });
  }, [recordId, rid]);
  useEffect(() => {
    if (generatedHtml) vdbg('state.generatedHtml.len', (generatedHtml || '').length);
  }, [generatedHtml]);

  // Hydrate charts using dynamic CDN loader for Chart.js
  useEffect(() => {
    if (!generatedHtml) return;

    const destroyExistingCharts = () => {
      document.querySelectorAll('canvas[data-chart-bound="true"]').forEach((canvas) => {
        const chartInstance = canvas.__chartInstance;
        if (chartInstance && typeof chartInstance.destroy === 'function') {
          chartInstance.destroy();
        }
        delete canvas.__chartInstance;
        delete canvas.dataset.chartBound;
      });
    };

    let isCancelled = false;

    const hydrateCharts = async () => {
      const registryEl = document.getElementById('chart-registry');
      if (!registryEl) return;

      let entries = [];
      try {
        entries = JSON.parse(registryEl.textContent || '[]');
      } catch {
        return;
      }
      if (!entries.length) return;

      // Apply dark theme defaults once
      if (window.Chart) {
        // white text for axes and legends
        window.Chart.defaults.color = '#FFFFFF';
        if (window.Chart.defaults.plugins?.legend?.labels) {
          window.Chart.defaults.plugins.legend.labels.color = '#FFFFFF';
        }
        if (!window.Chart.defaults._darkModeConfigured) {
          window.Chart.defaults._darkModeConfigured = true;
        }
      }

      // Use locally imported Chart.js; register plugin if needed
      try {
        if (!window.Chart) {
          const script = document.createElement('script');
          // use UMD build to expose global Chart
          script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.3.0/dist/chart.umd.min.js';
          script.onload = () => {
            const safeRender = () => {
              if (!window.Chart) return setTimeout(safeRender, 50);
              renderCharts(entries);
            };
            safeRender();
          };
          document.body.appendChild(script);
          return;
        }
        renderCharts(entries);
      } catch {}
    };

    const renderCharts = (entries) => {
      if (isCancelled) return;
      destroyExistingCharts();
      // Build a map of id->config
      const configMap = {};
      entries.forEach((e) => {
        try {
          configMap[e.id] = JSON.parse(e.config);
        } catch {}
      });
      // Find all canvas elements and render matching configs
      document.querySelectorAll('canvas[id]').forEach((canvas) => {
        const id = canvas.id;
        const cfg = configMap[id];
        if (!cfg) return;
        const ctx = canvas.getContext('2d');
        try {
          // set canvas parent to relative for dropdown positioning
          const parent = canvas.parentNode;
          if (parent && getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
          }
          const chartInstance = new Chart(ctx, cfg);
          canvas.dataset.chartBound = 'true';
          canvas.__chartInstance = chartInstance;
          // add dropdown selector
          if (parent && !parent.querySelector('.chart-type-select')) {
            const select = document.createElement('select');
            select.className = 'chart-type-select';
            select.style.position = 'absolute';
            select.style.top = '8px';
            select.style.right = '8px';
            select.style.background = '#FFFFFF';
            select.style.color = '#000000';
            select.style.zIndex = '10';
            ['line', 'bar', 'pie'].forEach((type) => {
              const opt = document.createElement('option');
              opt.value = type;
              opt.text = type;
              if (cfg.type === type) opt.selected = true;
              select.appendChild(opt);
            });
            select.onchange = () => {
              chartInstance.config.type = select.value;
              chartInstance.update();
            };
            parent.appendChild(select);
          }
        } catch (err) {
          console.error('report-charts.render', id, err);
        }
      });
    };

    const timeout = setTimeout(hydrateCharts, 50);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
      destroyExistingCharts();
    };
  }, [generatedHtml]);

  // Derived flags
  const hasHtml = !!generatedHtml;
  const hasRecord = !!(recordId || rid); // used for Finalize/Submit

  // Unified download click: use server PDF if present; else fallback
  const onDownloadPrimary = async () => {
    if (exportPdfUrl) {
      if (typeof window !== 'undefined') window.open(exportPdfUrl, '_blank', 'noopener');
      return;
    }
    await onDownloadPdfFallback();
  };

  /* --------------------------------
     Render
     -------------------------------- */
  return (
    <div id="reformCard" className={styles.card}>
      <h1 className={styles.title}>{ui.title}</h1>

      {/* [KT:SURGICAL:FORM-WIDTH-CLAMP:2025-11-14] Clamp form and grid width to prevent stretching and horizontal scroll */}
      <div
        className={styles.cardGrid}
        style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}
      >
        {/* Fast Mode Toggle */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            id="fastModeToggle"
            checked={fastMode}
            onChange={e => setFastMode(e.target.checked)}
            style={{ transform: 'scale(1.2)' }}
          />
          <label htmlFor="fastModeToggle" style={{ fontWeight: 500, cursor: 'pointer' }}>
            Fast Mode (instant static report)
          </label>
        </div>
        {/* Left column */}
        <form
          onSubmit={onSubmit}
          aria-busy={submitting || loadingUI}
          className={styles.leftCol}
          style={{ width: '100%', maxWidth: 700 }}
        >
          <div className={styles.formStack}>
            <label className={styles.label}>{ui.orgName}</label>
            <input
              className={styles.input}
              type="text"
              value={form.orgName}
              onChange={(e) => updateFormField('orgName', e.target.value)}
              placeholder={ui.orgName}
              required
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.country}</label>
            <select
              className={styles.input}
              value={form.country}
              onChange={(e) => updateFormField('country', e.target.value)}
              required
            >
              <option value="" />
              {countries.map((c, i) => (
                <option key={`${c}__${i}`} value={c}>
                  {tr(countryMap, c)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.tier}</label>
            <select
              className={styles.input}
              value={form.tier}
              onChange={(e) => updateFormField('tier', e.target.value)}
              required
            >
              <option value="" />
              {tiers.map((t, i) => (
                <option key={`${t}__${i}`} value={t}>
                  {tr(tierMap, t)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.companySize}</label>
            <select
              className={styles.input}
              value={form.companySize}
              onChange={(e) => updateFormField('companySize', e.target.value)}
              required
            >
              <option value="" />
              {sizes.map((s, i) => (
                <option key={`${s}__${i}`} value={s}>
                  {tr(sizeMap, s)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.timeFrame}</label>
            <select
              className={styles.input}
              value={form.timeFrame}
              onChange={(e) => updateFormField('timeFrame', e.target.value)}
              required
            >
              <option value="" />
              {frames.map((f, i) => (
                <option key={`${f}__${i}`} value={f}>
                  {tr(frameMap, f)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.costSavingsGoal}</label>
            <input
              className={styles.input}
              type="text"
              inputMode="decimal"
              placeholder="$1,200,000 or 1200000"
              value={form.costSavingsGoal}
              onChange={(e) => updateFormField('costSavingsGoal', e.target.value)}
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.strategicGoal}</label>
            <input
              className={styles.input}
              type="text"
              value={form.strategicGoal}
              onChange={(e) => updateFormField('strategicGoal', e.target.value)}
              placeholder="e.g., Streamline workflows, digitize ops"
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.desiredOutcome}</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              rows={3}
              value={form.desiredOutcome}
              onChange={(e) => updateFormField('desiredOutcome', e.target.value)}
            />
          </div>

          {/* ✅ Prepared For */}
          <div className={styles.formStack}>
            <label className={styles.label}>{ui.preparedFor}</label>
            <input
              className={styles.input}
              type="text"
              placeholder="e.g., Ministry of Health (Ontario)"
              value={form.preparedFor}
              onChange={(e) => updateFormField('preparedFor', e.target.value)}
            />

            <input
              className={styles.input}
              type="email"
              placeholder="email@example.com"
              value={form.preparedForEmail}
              onChange={(e) => updateFormField('preparedForEmail', e.target.value)}
            />
          </div>

          {/* ✅ Prepared By */}
          <div className={styles.formStack}>
            <label className={styles.label}>{ui.preparedBy}</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Your name or organization"
              value={form.preparedBy}
              onChange={(e) => updateFormField('preparedBy', e.target.value)}
            />

            <input
              className={styles.input}
              type="email"
              placeholder="email@example.com"
              value={form.preparedByEmail}
              onChange={(e) => updateFormField('preparedByEmail', e.target.value)}
            />
          </div>

          {/* ===== ACTIONS (exact required order & labels) ===== */}
          <div className={styles.actions}>
            {/* 1 — Generate (nav pills) */}
            <button
              type="button"
              onClick={onGenerate}
              disabled={genBusy}
              aria-label={`1 - ${ui.generate}`}
              className={styles.navButton}
              style={{
                ...(genDone ? { ...navBtnBase, ...navBtnDone } : navBtnBase),
                ...(genBusy ? navBtnDisabled : null),
              }}
              onMouseEnter={(e) => {
                if (!genDone && !genBusy) e.currentTarget.style.backgroundColor = pillHover;
              }}
              onMouseLeave={(e) => {
                if (!genDone && !genBusy) e.currentTarget.style.backgroundColor = pillBg;
              }}
            >
              {`1- ${genBusy ? ui.generating : ui.generate}`}
            </button>

            {/* 2 — Export to PDF */}
            <button
              type="button"
              onClick={onExportPdfServer}
              disabled={exporting || !hasHtml}
              title={!hasHtml ? 'No HTML to export (Generate first)' : ui.exportPdf}
              aria-label={`2 - ${ui.exportPdf}`}
              className={styles.navButton}
              style={{
                ...(exportDone ? { ...navBtnBase, ...navBtnDone } : navBtnBase),
                ...(exporting || !hasHtml ? navBtnDisabled : null),
              }}
              onMouseEnter={(e) => {
                if (!exportDone && hasHtml && !exporting)
                  e.currentTarget.style.backgroundColor = pillHover;
              }}
              onMouseLeave={(e) => {
                if (!exportDone && hasHtml && !exporting)
                  e.currentTarget.style.backgroundColor = pillBg;
              }}
            >
              {`2- ${exporting ? ui.exporting : ui.exportPdf}`}
            </button>

            {/* 3 — Download PDF */}
            <button
              type="button"
              onClick={onDownloadPrimary}
              disabled={!exportPdfUrl && !hasHtml}
              aria-label={`3 - ${ui.downloadPdf}`}
              className={styles.navButton}
              style={{ ...navBtnBase, ...(!exportPdfUrl && !hasHtml ? navBtnDisabled : null) }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = pillHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = pillBg)}
            >
              {`3- ${ui.downloadPdf}`}
            </button>

            {/* Optional: Open HTML */}
            {!!exportHtmlUrl && (
              <button
                type="button"
                onClick={() => window.open(exportHtmlUrl, '_blank', 'noopener')}
                className={styles.navButton}
                style={navBtnBase}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = pillHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = pillBg)}
              >
                {ui.openHtml}
              </button>
            )}

            {/* 4 — Finalize */}
            <button
              type="button"
              onClick={onFinalize}
              disabled={finalizing || !hasRecord}
              className={styles.navButton}
              style={{
                ...(finalizeDone ? { ...navBtnBase, ...navBtnDone } : navBtnBase),
                ...(finalizing || !hasRecord ? navBtnDisabled : null),
              }}
              onMouseEnter={(e) => {
                if (!finalizeDone && hasRecord && !finalizing)
                  e.currentTarget.style.backgroundColor = pillHover;
              }}
              onMouseLeave={(e) => {
                if (!finalizeDone && hasRecord && !finalizing)
                  e.currentTarget.style.backgroundColor = pillBg;
              }}
            >
              {finalizing
                ? `4- ${ui.finalizing}`
                : finalizeDone
                  ? `4- ${ui.finalized}`
                  : `4- ${ui.finalize}`}
            </button>

            {/* status/hints */}
            {submitMsg ? <span className={styles.hint}>{submitMsg}</span> : null}

            {/* 5 — Submit */}
            <button
              type="submit"
              disabled={submitting || !hasRecord}
              aria-label={`5 - ${ui.submitShort}`}
              className={styles.navButton}
              style={{
                ...(submitDone ? { ...navBtnBase, ...navBtnDone } : navBtnBase),
                ...(submitting || !hasRecord ? navBtnDisabled : null),
              }}
              onMouseEnter={(e) => {
                if (!submitDone && hasRecord && !submitting)
                  e.currentTarget.style.backgroundColor = pillHover;
              }}
              onMouseLeave={(e) => {
                if (!submitDone && hasRecord && !submitting)
                  e.currentTarget.style.backgroundColor = pillBg;
              }}
            >
              {`5- ${submitting ? ui.submitting : ui.submitShort}`}
            </button>
          </div>

          {genError ? (
            <div className={styles.hint} style={{ color: '#ff6b6b', marginTop: 8 }}>
              {genError}
            </div>
          ) : null}

          {/* Result preview box */}
          {generatedHtml ? (
            <div className={styles.previewBox} style={{ marginTop: 12 }}>
              <h3>{ui.title}</h3>
              <p className={styles.smallNote}>
                {genResult?.wordCount ? `${genResult.wordCount} words` : ''}
                {rid || recordId ? ` · Record: ${rid || recordId}` : ''}
              </p>
              {/* [KT:SURGICAL:REPORT-IFRAME] Render report in sandboxed iframe to prevent CSS leakage */}
              <iframe
                title="Reform Report"
                style={{
                  width: '100%', // [KT:SURGICAL:REPORT-WIDTH:CLAMPED] Keep report constrained to form column
                  minWidth: 0,   // [KT:SURGICAL:REPORT-WIDTH-FIX] Allow shrink to avoid double-width effect
                  minHeight: 1200,
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  background: 'transparent',
                  marginTop: 8,
                }}
                sandbox="allow-same-origin allow-scripts allow-downloads allow-popups allow-forms"
                srcDoc={generatedHtml}
              />
            </div>
          ) : null}
        </form>

        {/* Right column — upload */}
        <div className={styles.rightCol}>
          <fieldset className={styles.uploadFieldset}>
            <legend>{ui.uploadReports}</legend>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.rtf"
              hidden
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                updateFormField('files', files);
                if (files.length) await doUpload(files);
                else {
                  setUploadNote('');
                  setUploadedList([]);
                }
              }}
            />

            {/* Upload trigger — same nav pill */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={styles.navButton}
              style={{ ...navBtnBase, ...(uploading ? navBtnDisabled : null) }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = pillHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = pillBg)}
            >
              {ui.chooseFiles}
            </button>

            <div className={styles.smallNote} style={{ marginTop: 8 }}>
              {(uploadedList?.length || form.files?.length || 0).toString()} {ui.filesSelected}
              {uploadNote ? ` · ${uploadNote}` : ''}
            </div>

            {uploadedList?.length ? (
              <ul className={styles.smallNote} style={{ marginTop: 8, paddingLeft: 18 }}>
                {uploadedList.map((u, i) => (
                  <li key={i}>
                    {u.url ? (
                      <a href={u.url} target="_blank" rel="noreferrer">
                        {u.filename || u.name || 'file'}
                      </a>
                    ) : (
                      u.filename || u.name || 'file'
                    )}{' '}
                    ({Math.round((u.size || 0) / 1024)} KB)
                  </li>
                ))}
              </ul>
            ) : null}
          </fieldset>
        </div>
      </div>
    </div>
  );
}

/* Auto-mounted Roadmap enhancer */
export function __SI_WithRoadmap() {
  return (
    <>
      <RoadmapWire />
    </>
  );
}
