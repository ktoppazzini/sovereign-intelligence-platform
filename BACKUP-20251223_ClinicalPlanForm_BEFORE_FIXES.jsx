'use client';

import { getUiTranslations, normalizeLang } from '@/lib/i18nClient';
import styles from '../reform-report/ReformReport.module.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import nextDynamic from 'next/dynamic';

// [KT:CHART-HYDRATOR] Dynamic import for chart type switching functionality
const ChartHydrator = nextDynamic(() => import('./ChartHydrator.client'), {
  ssr: false,
});

// ✅ Debugging setup
const DEBUG_NS = 'SR:CLINICAL';
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const xid = () => Math.random().toString(36).slice(2, 8);

function dbg(...args) {
  console.log(`[${DEBUG_NS}]`, ...args);
}
function dbgWarn(...args) {
  console.warn(`[${DEBUG_NS}]`, ...args);
}
function dbgErr(...args) {
  console.error(`[${DEBUG_NS}]`, ...args);
}

const preview = (s, n = 160) =>
  typeof s === 'string' ? (s.length > n ? `${s.slice(0, n)} …` : s) : s;

function expose(key, value) {
  try {
    if (typeof window !== 'undefined') {
      window.__SR_CLINICAL__ = window.__SR_CLINICAL__ || {};
      window.__SR_CLINICAL__[key] = value;
    }
  } catch {}
}

/* ============================================================================
   Brand Accent Helpers (mirror Reform form)
   ========================================================================== */
function parseColor(c) {
  if (!c) return { r: 59, g: 130, b: 246 };
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
  const t = pct >= 0 ? 255 : 0;
  const p = Math.abs(pct);
  const nr = Math.round((t - r) * p + r);
  const ng = Math.round((t - g) * p + g);
  const nb = Math.round((t - b) * p + b);
  return `rgb(${clamp(nr)}, ${clamp(ng)}, ${clamp(nb)})`;
}

function useAccent() {
  const [accent, setAccent] = useState('#3b82f6');
  useEffect(() => {
    const pick = () => {
      const root = getComputedStyle(document.documentElement);
      const v = (
        root.getPropertyValue('--si-accent') ||
        root.getPropertyValue('--brand-accent') ||
        ''
      ).trim();
      if (v) return setAccent(v);
      const el = document.querySelector('[class*="brandMark"]');
      if (!el) return;
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor?.trim();
      if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') return setAccent(bg);
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
   Translation Utilities & Constants
   ========================================================================== */
const BASE_UI = {
  title: 'Clinical Trial Plan',
  sponsor: 'Sponsor Organization',
  drugName: 'Drug / Compound Name',
  indication: 'Primary Indication',
  therapeuticArea: 'Therapeutic Area',
  phase: 'Trial Phase',
  trialType: 'Trial Type',
  regulatoryPathway: 'Regulatory Pathway',
  country: 'Target Country/Region',
  plannedSites: 'Planned Trial Sites',
  estimatedEnrollment: 'Estimated Enrollment',
  primaryEndpoint: 'Primary Endpoint',
  secondaryEndpoints: 'Key Secondary Endpoints',
  trialDuration: 'Expected Trial Duration',
  estimatedCost: 'Estimated Trial Cost',
  approverEmail: 'Approver Email',
  yourEmail: 'Your Email',
  uploadDocs: 'Upload Protocol/IND Documents',
  chooseFiles: 'Choose files',
  filesSelected: 'files selected',
  generate: 'Generate Plan',
  generating: 'Generating…',
  exportPdf: 'Export to PDF',
  exporting: 'Exporting…',
  downloadPdf: 'Download PDF',
  finalize: 'Finalize (store approved copy)',
  finalizing: 'Finalizing…',
  finalized: 'Finalized',
  submit: 'Submit',
  submitting: 'Submitting…',
  // [KT:INLINE-EDIT] Edit toolbar translations
  editReport: 'Edit Report',
  saveEdits: 'Save Edits',
  discardEdits: 'Discard',
  editModeHint: 'Edit Mode: Click any text to edit',
  unsavedChanges: 'Unsaved changes',
  submitted: 'Submitted',
  error: 'Something went wrong',
  uploading: 'Uploading…',
  uploaded: 'Uploaded',
};

const UI_CACHE_KEY = (lang) => `SI_CLINICAL_UI_${(lang || 'English').toLowerCase()}`;
const OPT_CACHE_KEY = (lang, field) =>
  `SI_CLINICAL_OPT_T_${field}_${(lang || 'English').toLowerCase()}`;
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

async function translateMapClient(map, targetLang) {
  const rid = xid();
  const started = now();
  const payload = { mode: 'json', targetLang, map: clonePlainObject(map) };
  const keyCount = payload.map ? Object.keys(payload.map).length : 0;
  const badShape = !payload.map || typeof payload.map !== 'object' || keyCount === 0;

  dbg('gptTranslation[json] → start', { rid, lang: targetLang, keys: keyCount });
  if (badShape) {
    dbgErr('gptTranslation[json] → NOT SENDING: empty/invalid map', { rid });
    return map || {};
  }

  try {
    const res = await fetch('/api/gptTranslation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-SI-Debug': `clinical-ui-json:${rid}` },
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
    });
    if (res.ok && j && typeof j.translation === 'object') return j.translation;
  } catch (err) {
    dbgWarn('gptTranslation[json] → exception', { rid, err: String(err?.message || err) });
  }
  return map;
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

/* ============================================================================
   Component
   ========================================================================== */
export default function ClinicalPlanForm() {
  // [KT:FIX] Use useSearchParams for reactive URL lang detection
  const searchParams = useSearchParams();
  const urlLang = searchParams?.get('lang') || 'English';
  
  const [activeLang, setActiveLang] = useState(detectLanguage());
  const langResolved = useMemo(() => normalizeLang(activeLang || 'English'), [activeLang]);
  
  // [KT:FIX] Sync lang state with URL parameter changes
  useEffect(() => {
    const detectedLang = detectLanguage();
    if (detectedLang !== activeLang) {
      console.log('[SR:CLINICAL] Syncing lang from URL:', detectedLang);
      setActiveLang(detectedLang);
    }
  }, [urlLang]);

  const [ui, setUi] = useState(BASE_UI);
  const [loadingUI, setLoadingUI] = useState(true);

  // Options lists for dropdowns
  const [countries, setCountries] = useState([]);
  const [therapeuticAreas, setTherapeuticAreas] = useState([]);
  const [phases, setPhases] = useState([]);
  const [trialTypes, setTrialTypes] = useState([]);
  const [regulatoryPathways, setRegulatoryPathways] = useState([]);

  // Translation maps for options
  const [countryMap, setCountryMap] = useState({});
  const [therapeuticAreaMap, setTherapeuticAreaMap] = useState({});
  const [phaseMap, setPhaseMap] = useState({});
  const [trialTypeMap, setTrialTypeMap] = useState({});
  const [regulatoryPathwayMap, setRegulatoryPathwayMap] = useState({});

  const [form, setForm] = useState({
    sponsor: '',
    drugName: '',
    indication: '',
    therapeuticArea: '',
    phase: '',
    trialType: '',
    regulatoryPathway: '',
    country: '',
    plannedSites: '',
    estimatedEnrollment: '',
    primaryEndpoint: '',
    secondaryEndpoints: '',
    trialDuration: '',
    estimatedCost: '',
    approverEmail: '',
    yourEmail: '',
    files: [],
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  // === Nav pill styling (match Reform) ===
  const accent = useAccent();
  const pillBg = shade(accent, -0.55);
  const pillHover = shade(accent, -0.45);
  const pillBr = shade(accent, -0.2);

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
    backgroundColor: '#124A2A',
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

  const [finalizing, setFinalizing] = useState(false);

  const [genDone, setGenDone] = useState(false);
  const [finalizeDone, setFinalizeDone] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);

  // [KT:INLINE-EDIT] Edit mode state and refs
  const reportRef = useRef(null);
  const [editMode, setEditMode] = useState(false);
  const [hasEdits, setHasEdits] = useState(false);
  const [initialHtmlForEdit, setInitialHtmlForEdit] = useState('');

  const fileInputRef = useRef(null);

  function updateFormField(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
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

  // UI translations on load / language change
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingUI(true);
      const helperRid = xid();
      dbg('ui-translate[helper] → start', { rid: helperRid, lang: langResolved });

      let nextUi = BASE_UI;
      try {
        const { t } = await getUiTranslations({
          base: BASE_UI,
          lang: langResolved,
          cachePrefix: 'SI_CLINICAL_FORM',
          setDir: true,
        });
        nextUi = t || BASE_UI;
        dbg('ui-translate[helper] → ok', { rid: helperRid, keys: Object.keys(nextUi).length });
      } catch (err) {
        dbgWarn('ui-translate[helper] → error (will fallback)', {
          rid: helperRid,
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
            dbg('ui-translate[json-fallback] → calling /api/gptTranslation', { rid: ridJson });
            const translated = await translateMapClient(mapPayload, langResolved);
            nextUi = translated || BASE_UI;
            localStorage.setItem(cacheKey, JSON.stringify(nextUi));
          }
        } catch (err) {
          dbgWarn('ui-translate[json-fallback] → error', { message: String(err?.message || err) });
        }
      }

      if (mounted) {
        setUi(nextUi);
        setLoadingUI(false);
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
      try {
        const res = await fetch('/api/reform/options', {
          cache: 'no-store',
          headers: { 'X-SI-Debug': `clinical-options:${rid}` },
        });
        const j = await res.json();
        if (cancelled) return;

        setCountries(Array.isArray(j?.countries) ? uniq(j.countries) : []);
        
        // Pharma-specific options
        const areas = [
          'Oncology',
          'Cardiology',
          'Neurology',
          'Immunology',
          'Infectious Disease',
          'Rare Disease',
          'Metabolic Disorders',
          'Respiratory',
          'Dermatology',
          'Other',
        ];
        setTherapeuticAreas(areas);

        const trialPhases = ['Phase I', 'Phase II', 'Phase III', 'Phase IV'];
        setPhases(trialPhases);

        const types = [
          'Interventional',
          'Observational',
          'Expanded Access',
          'Adaptive Trial',
          'Basket Trial',
          'Umbrella Trial',
        ];
        setTrialTypes(types);

        const pathways = [
          'Standard Approval (FDA)',
          'Fast Track (FDA)',
          'Breakthrough Therapy (FDA)',
          'Accelerated Approval (FDA)',
          'Priority Review (FDA)',
          'Orphan Drug Designation',
          'EMA Standard',
          'EMA Conditional Approval',
          'PMDA Sakigake',
          'Health Canada Priority Review',
          'Other',
        ];
        setRegulatoryPathways(pathways);

        dbg('options → loaded', { rid, countries: (j?.countries || []).length });
        expose('options', { countries: j?.countries, therapeuticAreas: areas, phases: trialPhases, trialTypes: types, regulatoryPathways: pathways });
      } catch (err) {
        dbgErr('options → error', { message: String(err?.message || err) });
        if (cancelled) return;
        setCountries([]);
        setTherapeuticAreas([]);
        setPhases([]);
        setTrialTypes([]);
        setRegulatoryPathways([]);
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
      const am = await translateList(
        therapeuticAreas,
        langResolved,
        OPT_CACHE_KEY(langResolved, 'therapeuticAreas'),
      );
      const pm = await translateList(phases, langResolved, OPT_CACHE_KEY(langResolved, 'phases'));
      const tm = await translateList(
        trialTypes,
        langResolved,
        OPT_CACHE_KEY(langResolved, 'trialTypes'),
      );
      const rm = await translateList(
        regulatoryPathways,
        langResolved,
        OPT_CACHE_KEY(langResolved, 'regulatoryPathways'),
      );
      setCountryMap(cm);
      setTherapeuticAreaMap(am);
      setPhaseMap(pm);
      setTrialTypeMap(tm);
      setRegulatoryPathwayMap(rm);
      expose('translatedOptionMaps', { cm, am, pm, tm, rm });
    })();
  }, [countries, therapeuticAreas, phases, trialTypes, regulatoryPathways, langResolved]);

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
    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: fd,
        headers: { 'X-SI-Debug': `clinical-upload:${rid}` },
      });
      const j = await res.json().catch(() => ({}));
      dbg('upload → response', { rid, status: res.status, ok: res.ok });
      if (!res.ok || j.error) throw new Error(j.error || 'Upload failed');
      const rawList = j.files || j.urls || [];
      const normalized = toUploadedObjects(rawList);
      expose('uploadedList', normalized);
      return normalized;
    } catch (e) {
      dbgErr('upload → error', { rid, message: String(e?.message || e) });
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

  // State for link-based flow
  const [viewLink, setViewLink] = useState('');

  // [KT:INLINE-EDIT] Enable contenteditable on text elements when edit mode is active
  useEffect(() => {
    if (!reportRef.current) return;
    
    const applyEditMode = () => {
      if (!reportRef.current) return;
      
      const editableSelectors = 'p, h1, h2, h3, h4, h5, h6, li, td, th, dt, dd, figcaption, blockquote, strong, b, em, i, span:not(.chart-label):not(.axis-label), div.subtitle, div.section-title, div.section-subtitle, .executive-summary, .section-content, [class*="title"], [class*="heading"], [class*="subtitle"]';
      const elements = reportRef.current.querySelectorAll(editableSelectors);
      
      if (editMode) {
        dbg('[INLINE-EDIT] Enabling edit mode, found', elements.length, 'editable elements');
        
        elements.forEach((el) => {
          if (el.querySelector('svg, canvas') || el.closest('svg') || el.closest('canvas')) return;
          if (!el.textContent.trim()) return;
          if (el.querySelector('[contenteditable="true"]')) return;
          
          el.setAttribute('contenteditable', 'true');
          el.style.cursor = 'text';
          el.style.outline = 'none';
          el.style.borderRadius = '4px';
          el.style.transition = 'background 0.2s ease, box-shadow 0.2s ease';
          el.style.minHeight = '1em';
          el.setAttribute('data-editable', 'true');
          
          el.addEventListener('mousedown', (e) => {
            e.stopPropagation();
          }, { once: false });
        });
      } else {
        elements.forEach((el) => {
          el.removeAttribute('contenteditable');
          el.removeAttribute('data-editable');
          el.style.cursor = '';
          el.style.background = '';
          el.style.boxShadow = '';
        });
      }
    };
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        applyEditMode();
      });
    });
  }, [editMode]);

  // [KT:INLINE-EDIT] Focus/blur styling via event delegation
  useEffect(() => {
    if (!reportRef.current || !editMode) return;

    const handleFocus = (e) => {
      if (e.target.getAttribute('data-editable') === 'true') {
        e.target.style.background = 'rgba(102, 230, 176, 0.15)';
        e.target.style.boxShadow = '0 0 0 2px rgba(102, 230, 176, 0.4)';
      }
    };

    const handleBlur = (e) => {
      if (e.target.getAttribute('data-editable') === 'true') {
        e.target.style.background = '';
        e.target.style.boxShadow = '';
      }
    };

    const container = reportRef.current;
    container.addEventListener('focusin', handleFocus, true);
    container.addEventListener('focusout', handleBlur, true);

    return () => {
      container.removeEventListener('focusin', handleFocus, true);
      container.removeEventListener('focusout', handleBlur, true);
    };
  }, [editMode]);

  // [KT:INLINE-EDIT] Track edits handler
  const handleReportInput = () => {
    if (reportRef.current) {
      setHasEdits(true);
    }
  };

  // [KT:INLINE-EDIT] Save edits - syncs DOM changes back to generatedHtml state
  const saveEdits = () => {
    if (reportRef.current) {
      const updatedHtml = reportRef.current.innerHTML;
      setGeneratedHtml(updatedHtml);
      setHasEdits(false);
      setEditMode(false);
      dbg('[INLINE-EDIT] Edits saved to state');
    }
  };

  // [KT:INLINE-EDIT] Discard edits - reload original HTML
  const discardEdits = () => {
    if (reportRef.current && initialHtmlForEdit) {
      reportRef.current.innerHTML = initialHtmlForEdit;
      setHasEdits(false);
      setEditMode(false);
      dbg('[INLINE-EDIT] Edits discarded');
    }
  };

  // [KT:INLINE-EDIT] Memoize sanitized HTML for edit mode
  useEffect(() => {
    if (!editMode && generatedHtml) {
      setInitialHtmlForEdit(generatedHtml);
    }
  }, [generatedHtml, editMode]);

  // [KT:INLINE-EDIT] Inject HTML into ref when entering edit mode
  useEffect(() => {
    if (editMode && reportRef.current && initialHtmlForEdit) {
      if (!reportRef.current.innerHTML.trim()) {
        reportRef.current.innerHTML = initialHtmlForEdit;
        dbg('[INLINE-EDIT] Injected HTML for edit mode');
      }
    }
  }, [editMode, initialHtmlForEdit]);

  // Generate - calls /api/clinical/generate with GPT integration
  async function onGenerate() {
    setGenBusy(true);
    setGenError('');
    setGenResult(null);
    setGenDone(false);
    setFinalizeDone(false);
    setSubmitDone(false);
    // [KT:INLINE-EDIT] Reset edit state on new generation
    setEditMode(false);
    setHasEdits(false);
    setViewLink('');
    const ridGen = xid();

    try {
      dbg('generate → calling /api/clinical/generate', { rid: ridGen, form });
      
      const payload = {
        form: {
          ...form,
          preparedFor: form.approverEmail || '',
          preparedBy: form.yourEmail || '',
        },
        lang: langResolved,
        minWords: 15000,
      };

      const res = await fetch('/api/clinical/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-SI-Debug': `clinical-gen:${ridGen}`,
        },
        body: JSON.stringify(payload),
      });

      const j = await res.json();
      dbg('generate → response', { rid: ridGen, ok: j.ok, wordCount: j.wordCount });

      if (!res.ok || !j.ok) {
        throw new Error(j.error || 'Generation failed');
      }

      setRid(j.rid);
      setRecordId(j.recordId || j.rid);
      setGeneratedHtml(j.html || j.report || '');
      setGenResult(j);
      setGenDone(true);
      expose('genResult', j);

    } catch (e) {
      dbgErr('generate → error', { message: String(e?.message || e) });
      setGenError(e?.message || ui.error);
      setGenDone(false);
    } finally {
      setGenBusy(false);
    }
  }

  // Finalize - stores HTML in Airtable for link-based viewing
  const onFinalize = async () => {
    if (!generatedHtml || (!rid && !recordId)) {
      setSubmitMsg('Generate a report first');
      return;
    }

    setFinalizing(true);
    setSubmitMsg('');
    setFinalizeDone(false);
    const ridFin = xid();

    try {
      dbg('finalize → calling /api/clinical/finalize', { rid: ridFin, recordId, rid });
      
      const res = await fetch('/api/clinical/finalize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-SI-Debug': `clinical-fin:${ridFin}`,
        },
        body: JSON.stringify({
          html: generatedHtml,
          recordId: recordId,
          rid: rid,
        }),
      });

      const j = await res.json();
      dbg('finalize → response', { rid: ridFin, ok: j.ok, viewLink: j.viewLink });

      if (!res.ok || !j.ok) {
        throw new Error(j.error || 'Finalize failed');
      }

      setRecordId(j.recordId || recordId);
      setViewLink(j.viewLink || '');
      setFinalizeDone(true);
      setSubmitMsg('Report finalized - ready to submit');
      expose('finalizeResult', j);

    } catch (e2) {
      dbgErr('finalize → error', { rid: ridFin, message: String(e2?.message || e2) });
      setSubmitMsg(e2?.message || ui.error);
      setFinalizeDone(false);
    } finally {
      setFinalizing(false);
    }
  };

  // Submit - sends approval email with link to view report
  const onSubmit = async (e) => {
    e.preventDefault();
    
    // First finalize if not done
    if (!finalizeDone || !viewLink) {
      setSubmitMsg('Finalizing report first...');
      await onFinalize();
      // Wait for state to update
      await new Promise(r => setTimeout(r, 100));
    }

    if (!viewLink && !finalizeDone) {
      setSubmitMsg('Please finalize the report first');
      return;
    }

    if (!form.approverEmail) {
      setSubmitMsg('Approver email required');
      return;
    }

    setSubmitting(true);
    setSubmitMsg('');
    setSubmitDone(false);
    const ridSub = xid();

    try {
      // Get the current viewLink (may have been set by finalize)
      const currentViewLink = viewLink || `${window.location.origin}/clinical-plan/view/${recordId}`;
      
      dbg('submit → calling /api/clinical/submit', { rid: ridSub, email: form.approverEmail, viewLink: currentViewLink });
      
      const res = await fetch('/api/clinical/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-SI-Debug': `clinical-sub:${ridSub}`,
        },
        body: JSON.stringify({
          email: form.approverEmail,
          recordId: recordId,
          rid: rid,
          viewLink: currentViewLink,
          metadata: {
            drugName: form.drugName,
            indication: form.indication,
            phase: form.phase,
            sponsor: form.sponsor,
          },
        }),
      });

      const j = await res.json();
      dbg('submit → response', { rid: ridSub, ok: j.ok });

      if (!res.ok || !j.ok) {
        throw new Error(j.error || 'Submit failed');
      }

      setSubmitDone(true);
      setSubmitMsg(`Submitted to ${form.approverEmail}`);
      expose('submitResult', j);

    } catch (e2) {
      dbgErr('submit → error', { rid: ridSub, message: String(e2?.message || e2) });
      setSubmitMsg(e2?.message || ui.error);
      setSubmitDone(false);
    } finally {
      setSubmitting(false);
    }
  };

  const hasHtml = !!generatedHtml;
  const hasRecord = !!(recordId || rid);

  /* --------------------------------
     Render
     -------------------------------- */
  return (
    <div id="clinicalCard" className={styles.card}>
      <h1 className={styles.title}>{ui.title}</h1>

      <div className={styles.cardGrid}>
        {/* Left column */}
        <form onSubmit={onSubmit} aria-busy={submitting || loadingUI} className={styles.leftCol}>
          <div className={styles.formStack}>
            <label className={styles.label}>{ui.sponsor}</label>
            <input
              className={styles.input}
              type="text"
              value={form.sponsor}
              onChange={(e) => updateFormField('sponsor', e.target.value)}
              placeholder={ui.sponsor}
              required
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.drugName}</label>
            <input
              className={styles.input}
              type="text"
              value={form.drugName}
              onChange={(e) => updateFormField('drugName', e.target.value)}
              placeholder="e.g., ABC-123 or Compound X"
              required
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.indication}</label>
            <input
              className={styles.input}
              type="text"
              value={form.indication}
              onChange={(e) => updateFormField('indication', e.target.value)}
              placeholder="e.g., Advanced Non-Small Cell Lung Cancer"
              required
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.therapeuticArea}</label>
            <select
              className={styles.input}
              style={{ width: '107%' }}
              value={form.therapeuticArea}
              onChange={(e) => updateFormField('therapeuticArea', e.target.value)}
              required
            >
              <option value="" />
              {therapeuticAreas.map((a, i) => (
                <option key={`${a}__${i}`} value={a}>
                  {tr(therapeuticAreaMap, a)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.phase}</label>
            <select
              className={styles.input}
              style={{ width: '107%' }}
              value={form.phase}
              onChange={(e) => updateFormField('phase', e.target.value)}
              required
            >
              <option value="" />
              {phases.map((p, i) => (
                <option key={`${p}__${i}`} value={p}>
                  {tr(phaseMap, p)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.trialType}</label>
            <select
              className={styles.input}
              style={{ width: '107%' }}
              value={form.trialType}
              onChange={(e) => updateFormField('trialType', e.target.value)}
              required
            >
              <option value="" />
              {trialTypes.map((t, i) => (
                <option key={`${t}__${i}`} value={t}>
                  {tr(trialTypeMap, t)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.regulatoryPathway}</label>
            <select
              className={styles.input}
              style={{ width: '107%' }}
              value={form.regulatoryPathway}
              onChange={(e) => updateFormField('regulatoryPathway', e.target.value)}
              required
            >
              <option value="" />
              {regulatoryPathways.map((r, i) => (
                <option key={`${r}__${i}`} value={r}>
                  {tr(regulatoryPathwayMap, r)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.country}</label>
            <select
              className={styles.input}
              style={{ width: '107%' }}
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
            <label className={styles.label}>{ui.plannedSites}</label>
            <input
              className={styles.input}
              type="text"
              placeholder="e.g., 50"
              value={form.plannedSites}
              onChange={(e) => updateFormField('plannedSites', e.target.value)}
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.estimatedEnrollment}</label>
            <input
              className={styles.input}
              type="text"
              placeholder="e.g., 300 patients"
              value={form.estimatedEnrollment}
              onChange={(e) => updateFormField('estimatedEnrollment', e.target.value)}
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.primaryEndpoint}</label>
            <input
              className={styles.input}
              type="text"
              placeholder="e.g., Overall Survival (OS)"
              value={form.primaryEndpoint}
              onChange={(e) => updateFormField('primaryEndpoint', e.target.value)}
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.secondaryEndpoints}</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              rows={3}
              placeholder="e.g., Progression-Free Survival, Objective Response Rate"
              value={form.secondaryEndpoints}
              onChange={(e) => updateFormField('secondaryEndpoints', e.target.value)}
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.trialDuration}</label>
            <input
              className={styles.input}
              type="text"
              placeholder="e.g., 18 months"
              value={form.trialDuration}
              onChange={(e) => updateFormField('trialDuration', e.target.value)}
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.estimatedCost}</label>
            <input
              className={styles.input}
              type="text"
              placeholder="e.g., $25,000,000"
              value={form.estimatedCost}
              onChange={(e) => updateFormField('estimatedCost', e.target.value)}
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.approverEmail}</label>
            <input
              className={styles.input}
              type="email"
              placeholder="approver@pharma.com"
              value={form.approverEmail}
              onChange={(e) => updateFormField('approverEmail', e.target.value)}
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.yourEmail}</label>
            <input
              className={styles.input}
              type="email"
              placeholder="you@pharma.com"
              value={form.yourEmail}
              onChange={(e) => updateFormField('yourEmail', e.target.value)}
            />
          </div>

          {/* ===== ACTIONS (3-step flow: Generate → Finalize → Submit) ===== */}
          <div className={styles.actions}>
            {/* 1 — Generate */}
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

            {/* 2 — Finalize (stores HTML for link-based viewing) */}
            <button
              type="button"
              onClick={onFinalize}
              disabled={finalizing || !hasHtml}
              title={!hasHtml ? 'Generate a report first' : ui.finalize}
              aria-label={`2 - ${ui.finalize}`}
              className={styles.navButton}
              style={{
                ...(finalizeDone ? { ...navBtnBase, ...navBtnDone } : navBtnBase),
                ...(finalizing || !hasHtml ? navBtnDisabled : null),
              }}
              onMouseEnter={(e) => {
                if (!finalizeDone && hasHtml && !finalizing)
                  e.currentTarget.style.backgroundColor = pillHover;
              }}
              onMouseLeave={(e) => {
                if (!finalizeDone && hasHtml && !finalizing)
                  e.currentTarget.style.backgroundColor = pillBg;
              }}
            >
              {finalizing
                ? `2- ${ui.finalizing}`
                : finalizeDone
                  ? `2- ${ui.finalized}`
                  : `2- ${ui.finalize}`}
            </button>

            {/* status/hints */}
            {submitMsg ? <span className={styles.hint}>{submitMsg}</span> : null}

            {/* 3 — Submit (sends link-based approval email) */}
            <button
              type="submit"
              disabled={submitting || !hasHtml}
              title={!hasHtml ? 'Generate a report first' : ui.submit}
              aria-label={`3 - ${ui.submit}`}
              className={styles.navButton}
              style={{
                ...(submitDone ? { ...navBtnBase, ...navBtnDone } : navBtnBase),
                ...(submitting || !hasHtml ? navBtnDisabled : null),
              }}
              onMouseEnter={(e) => {
                if (!submitDone && hasHtml && !submitting)
                  e.currentTarget.style.backgroundColor = pillHover;
              }}
              onMouseLeave={(e) => {
                if (!submitDone && hasHtml && !submitting)
                  e.currentTarget.style.backgroundColor = pillBg;
              }}
            >
              {`3- ${submitting ? ui.submitting : submitDone ? ui.submitted : ui.submit}`}
            </button>
          </div>

          {genError ? (
            <div className={styles.hint} style={{ color: '#ff6b6b', marginTop: 8 }}>
              {genError}
            </div>
          ) : null}

          {/* Result preview box with Edit functionality */}
          {generatedHtml ? (
            <div className={styles.previewBox} style={{ marginTop: 12 }}>
              <h3>{ui.title}</h3>
              <p className={styles.smallNote}>
                {genResult?.wordCount ? `${genResult.wordCount} words` : ''}
                {rid || recordId ? ` · Record: ${rid || recordId}` : ''}
              </p>
              
              {/* [KT:INLINE-EDIT] Edit toolbar */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                alignItems: 'center',
                marginBottom: 8,
              }}>
                {!editMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      dbg('[INLINE-EDIT] Edit button clicked, enabling edit mode');
                      setEditMode(true);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = '';
                      e.target.style.boxShadow = '';
                    }}
                  >
                    ✏️ {ui.editReport}
                  </button>
                ) : (
                  <>
                    <span style={{ color: '#66e6b0', fontSize: 12, marginRight: 6 }}>
                      📝 {ui.editModeHint}
                    </span>
                    {hasEdits && (
                      <span style={{ color: '#f59e0b', fontSize: 12 }}>
                        ⚠️ {ui.unsavedChanges}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={saveEdits}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.target.style.transform = ''}
                    >
                      ✓ {ui.saveEdits}
                    </button>
                    <button
                      type="button"
                      onClick={discardEdits}
                      style={{
                        background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.target.style.transform = ''}
                    >
                      ✗ {ui.discardEdits}
                    </button>
                  </>
                )}
              </div>
              
              <div
                ref={reportRef}
                className={styles.translatedPreview || ''}
                onInput={handleReportInput}
                suppressContentEditableWarning={true}
                style={{
                  background: '#111',
                  color: '#eee',
                  padding: 12,
                  borderRadius: 8,
                  marginTop: 8,
                  maxHeight: 600,
                  overflow: 'auto',
                  border: editMode ? '3px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                  transition: 'border 0.3s ease',
                }}
                dangerouslySetInnerHTML={
                  editMode ? undefined : { __html: initialHtmlForEdit || generatedHtml }
                }
              />
              {/* [KT:CHART-HYDRATOR] Mount chart type switcher after report HTML is rendered */}
              <ChartHydrator />
            </div>
          ) : null}
        </form>

        {/* Right column — upload */}
        <div className={styles.rightCol}>
          <fieldset className={styles.uploadFieldset}>
            <legend>{ui.uploadDocs}</legend>

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
