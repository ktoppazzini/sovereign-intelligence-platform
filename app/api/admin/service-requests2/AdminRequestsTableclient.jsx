'use client';

// app/reform-report/ReformReportForm.client.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { getUiTranslations, normalizeLang } from '@/lib/i18nClient';

// client-side fallback PDF
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/* ================= Base UI (keys MUST stay stable) ================= */
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
  finalizedBy: 'Finalized By',
  openHtml: 'Open HTML',
};

const UI_CACHE_KEY = (lang) => `SI_REFORM_UI_${(lang || 'English').toLowerCase()}`;
const OPT_CACHE_KEY = (lang, field) =>
  `SI_REFORM_OPT_T_${field}_${(lang || 'English').toLowerCase()}`;

const uniq = (arr) =>
  Array.from(new Map(arr.map((v) => [String(v).trim().toLowerCase(), String(v).trim()])).values());

/* ================= Tiny utils ================= */
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

/* ================= Translation clients ================= */
async function translateMapClient(map, targetLang) {
  try {
    const res = await fetch('/api/gptTranslation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ mode: 'json', map, targetLang }),
    });
    const j = await res.json();
    if (res.ok && j && typeof j.translation === 'object') return j.translation;
  } catch (e) {
    console.warn('[reform][translateMapClient] error', e);
  }
  return map; // fallback to source
}

async function translateList(values, langTarget, cacheKey) {
  const vals = uniq(values);
  if (!vals.length) return {};
  const en = String(langTarget || 'English').toLowerCase();
  if (en === 'english' || en === 'en') return Object.fromEntries(vals.map((v) => [v, v]));

  // cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const obj = JSON.parse(cached);
      if (vals.every((v) => obj[v])) return obj;
    }
  } catch {}

  const mapIn = Object.fromEntries(vals.map((v) => [v, v]));
  const mapOut = await translateMapClient(mapIn, langTarget);
  try {
    localStorage.setItem(cacheKey, JSON.stringify(mapOut));
  } catch {}
  return mapOut;
}

/* ================= Component ================= */
export default function ReformReportForm() {
  // ------- language -------
  const [activeLang, setActiveLang] = useState(detectLanguage());
  const langResolved = useMemo(() => normalizeLang(activeLang || 'English'), [activeLang]);

  useEffect(() => {
    // keep <html lang> in sync
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', langResolved || 'English');
      }
    } catch {}
  }, [langResolved]);

  // ------- UI state -------
  const [ui, setUi] = useState(BASE_UI);
  const [loadingUI, setLoadingUI] = useState(true);

  // ------- option lists -------
  const [countries, setCountries] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [frames, setFrames] = useState([]);

  const [countryMap, setCountryMap] = useState({});
  const [tierMap, setTierMap] = useState({});
  const [sizeMap, setSizeMap] = useState({});
  const [frameMap, setFrameMap] = useState({});

  // ------- form -------
  const [form, setForm] = useState({
    orgName: '',
    country: '',
    tier: '',
    companySize: '',
    timeFrame: '',
    costSavingsGoal: '',
    strategicGoal: '',
    desiredOutcome: '',
    files: [], // pre-upload: File[] ; post-upload: [{url, filename, size}]
  });

  const [finalizedBy, setFinalizedBy] = useState('');

  // uploading
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState('');
  const [uploadedList, setUploadedList] = useState([]);

  // generate/export/finalize/submit
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
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const [genDone, setGenDone] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [finalizeDone, setFinalizeDone] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);

  const fileInputRef = useRef(null);

  // keep lang in sync on navigation changes
  useEffect(() => {
    const handlePop = () => setActiveLang(detectLanguage());
    window.addEventListener('popstate', handlePop);
    setActiveLang(detectLanguage());
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  /* ---------------- UI translations (two-pass: local helper -> GPT) ---------------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingUI(true);
      let stage = 'helper';
      try {
        // 1) try your existing helper (dir, etc.)
        let nextUi = BASE_UI;
        try {
          const { t } = await getUiTranslations({
            base: BASE_UI,
            lang: langResolved,
            cachePrefix: 'SI_REFORM_FORM',
            setDir: true,
          });
          nextUi = t || BASE_UI;
        } catch {
          nextUi = BASE_UI;
        }

        // if it didn't translate and target isn't English → 2) force GPT JSON
        const isEnglish = String(langResolved || 'English')
          .toLowerCase()
          .startsWith('english');
        const helperDidNothing =
          JSON.stringify(Object.values(nextUi)) === JSON.stringify(Object.values(BASE_UI));

        if (!isEnglish && helperDidNothing) {
          stage = 'gpt-cache';
          const cacheKey = UI_CACHE_KEY(langResolved);
          let cached = null;
          try {
            cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
          } catch {}
          if (cached && typeof cached === 'object') {
            console.log('[reform][ui] using cached GPT map for', langResolved);
            nextUi = cached;
          } else {
            stage = 'gpt-fetch';
            const gptMap = await translateMapClient(BASE_UI, langResolved);
            // ensure shape
            const finalMap = {};
            for (const k of Object.keys(BASE_UI)) finalMap[k] = gptMap?.[k] ?? BASE_UI[k];
            nextUi = finalMap;
            try {
              localStorage.setItem(cacheKey, JSON.stringify(nextUi));
            } catch {}
            console.log('[reform][ui] GPT map applied for', langResolved);
          }
        } else {
          console.log('[reform][ui] helper map used for', langResolved);
        }

        if (mounted) setUi(nextUi);
      } catch (e) {
        console.warn('[reform][ui] translation stage failed:', stage, e);
        if (mounted) setUi(BASE_UI);
      } finally {
        if (mounted) setLoadingUI(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [langResolved]);

  /* ---------------- Options (raw fetch) ---------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/reform/options', { cache: 'no-store' });
        const j = await res.json();
        if (cancelled) return;
        setCountries(Array.isArray(j?.countries) ? uniq(j.countries) : []);
        setTiers(Array.isArray(j?.tiers) ? uniq(j.tiers) : []);
        setSizes(Array.isArray(j?.sizes) ? uniq(j.sizes) : []);
        setFrames(Array.isArray(j?.timeFrames) ? uniq(j.timeFrames) : []);
      } catch (err) {
        console.error('[reform][options] error', err);
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

  /* ---------------- Option translations ---------------- */
  useEffect(() => {
    (async () => {
      setCountryMap(
        await translateList(countries, langResolved, OPT_CACHE_KEY(langResolved, 'countries')),
      );
      setTierMap(await translateList(tiers, langResolved, OPT_CACHE_KEY(langResolved, 'tiers')));
      setSizeMap(await translateList(sizes, langResolved, OPT_CACHE_KEY(langResolved, 'sizes')));
      setFrameMap(await translateList(frames, langResolved, OPT_CACHE_KEY(langResolved, 'frames')));
    })();
  }, [countries, tiers, sizes, frames, langResolved]);

  const tr = (map, v) => {
    const key = v == null ? '' : String(v).trim();
    return key ? map[key] || key : '';
  };

  /* ---------------- Uploads ---------------- */
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

    console.group('[reform][upload] POST /api/uploads');
    try {
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      console.log('status', res.status, 'ok', res.ok, 'body', j);
      if (!res.ok || j.error) throw new Error(j.error || 'Upload failed');

      const rawList = j.files || j.urls || [];
      const normalized = toUploadedObjects(rawList);
      console.groupEnd();
      return normalized;
    } catch (e) {
      console.error('upload error', e);
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

  /* ---------------- Client PDF (fallback) ---------------- */
  async function onDownloadPdf() {
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

  /* ---------------- Generate ---------------- */
  async function onGenerate() {
    setGenBusy(true);
    setGenError('');
    setGenResult(null);
    setGenDone(false);
    try {
      const attachmentUrls = (form.files || []).map((f) => f?.url).filter(Boolean);

      const payload = {
        // legacy
        lang: langResolved,
        orgName: form.orgName,
        country: form.country,
        tier: form.tier,
        companySize: form.companySize,
        timeFrame: form.timeFrame,
        costSavingsGoal: form.costSavingsGoal,
        strategicGoal: form.strategicGoal,
        desiredOutcome: form.desiredOutcome,
        files: (form.files || []).map((f) => ({
          url: f.url,
          filename: f.filename || f.name,
          size: f.size,
        })),
        rid,
        // new
        form: {
          OrgName: form.orgName,
          Country: form.country,
          Tier: form.tier,
          CompanySize: form.companySize,
          TimeFrame: form.timeFrame,
          CostSavingsGoal: form.costSavingsGoal,
          DesiredOutcome: form.desiredOutcome,
        },
        targetLang: langResolved,
        attachmentUrls,
        recordId,
        logoUrl: '/brand/sovereign-mark.svg',
      };

      console.group('[reform][generate] ▶ payload', JSON.stringify(payload).slice(0, 500) + '…');

      const res = await fetch('/api/reform/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const raw = await readSafeText(res);
      const j = safeParseJSON(raw);

      if (!res.ok || !j?.ok) {
        throw new Error((j && j.error) || `HTTP ${res.status}`);
      }

      // legacy
      if (j.rid || j.report || j.wordCount) {
        setGenResult(j);
        setRid(j.rid || null);
        if (j.report) {
          setGeneratedHtml(j.report);
          setGeneratedHtmlOriginal(j.report);
        }
      }
      // new
      if (j.recordId || j.html || j.status) {
        setRecordId(j.recordId || recordId || null);
        if (j.html) {
          setGeneratedHtml(j.html);
          setGeneratedHtmlOriginal(j.html);
        }
        setGenResult((prev) => prev || { rid: j.recordId, report: j.html, wordCount: undefined });
      }

      setGenError('');
      setGenDone(true);
    } catch (e) {
      console.error('[reform][generate] error', e);
      setGenError(e?.message || 'Generation failed');
      setGenDone(false);
    } finally {
      console.groupEnd?.();
      setGenBusy(false);
    }
  }

  /* ---------------- Re-translate generated HTML when language changes ---------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!generatedHtmlOriginal) return;
      // Use text mode to preserve HTML
      try {
        const res = await fetch('/api/gptTranslation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'text',
            text: generatedHtmlOriginal,
            targetLang: langResolved,
            preserve: 'html',
          }),
        });
        const j = await res.json();
        const translated = j?.translated || generatedHtmlOriginal;
        if (!cancelled) setGeneratedHtml(translated);
      } catch {
        if (!cancelled) setGeneratedHtml(generatedHtmlOriginal);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [langResolved, generatedHtmlOriginal]);

  /* ---------------- Server PDF (export) ---------------- */
  async function onExportPdfServer() {
    setExporting(true);
    setSubmitMsg('');
    setExportDone(false);
    try {
      const id = recordId || rid;
      if (!id) throw new Error('Generate the report first.');
      if (!generatedHtml) throw new Error('No report HTML found.');

      const filenameSlug = `${(form.orgName || 'reform-report')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-${id}`;

      const res = await fetch('/api/reform/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: id,
          reportHtml: generatedHtml,
          title: `Sovereign Intelligence Reform Report — ${form.orgName || ''}`.trim(),
          filenameSlug,
          extraFields: {},
        }),
      });
      const raw = await readSafeText(res);
      const j = safeParseJSON(raw) || {};
      if (!res.ok || j.error) throw new Error(j.error || `HTTP ${res.status}`);

      setExportHtmlUrl(j.htmlUrl || '');
      setSubmitMsg(`Exported. PDF: ${j.pdfUrl}`);
      setExportDone(true);

      if (typeof window !== 'undefined') {
        window.open(j.downloadUrl || j.pdfUrl, '_blank', 'noopener');
      }
    } catch (e) {
      setSubmitMsg(e?.message || ui.error);
      setExportDone(false);
    } finally {
      setExporting(false);
    }
  }

  /* ---------------- Finalize ---------------- */
  const onFinalize = async () => {
    setFinalizing(true);
    setSubmitMsg('');
    setFinalizeDone(false);
    try {
      const id = recordId || rid;
      if (!id) throw new Error('Generate the report first.');

      const res = await fetch('/api/reform/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: id,
          rid: id,
          finalizedBy: finalizedBy?.trim() || undefined,
        }),
      });

      const raw = await readSafeText(res);
      const j = safeParseJSON(raw);

      if (!res.ok || j?.error || j?.ok === false) {
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      setSubmitMsg(j?.status ? `${j.status}` : ui.finalized);
      setFinalizeDone(true);
    } catch (e2) {
      console.error('[reform][finalize] error', e2);
      setSubmitMsg(e2?.message || ui.error);
      setFinalizeDone(false);
    } finally {
      setFinalizing(false);
    }
  };

  /* ---------------- Submit ---------------- */
  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg('');
    setSubmitDone(false);
    try {
      const id = recordId || rid;
      if (!id) throw new Error('Please click "Generate Report" before submitting.');

      const res = await fetch('/api/reform/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: id,
          rid: id,
          finalizedBy: finalizedBy?.trim() || undefined,
        }),
      });

      const raw = await readSafeText(res);
      const j = safeParseJSON(raw);

      if (!res.ok || j?.ok === false || j?.error)
        throw new Error((j && j.error) || `HTTP ${res.status}`);
      setSubmitMsg(j?.status ? j.status : ui.submitted);
      setSubmitDone(true);
    } catch (e2) {
      console.error('[reform][submit] error', e2);
      setSubmitMsg(e2?.message || ui.error);
      setSubmitDone(false);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <div id="reformCard" className={styles.card}>
      <h1 className={styles.title}>{ui.title}</h1>

      <div className={styles.cardGrid}>
        {/* Left column */}
        <form onSubmit={onSubmit} aria-busy={submitting || loadingUI} className={styles.leftCol}>
          <div className={styles.formStack}>
            <label className={styles.label}>{ui.orgName}</label>
            <input
              className={styles.input}
              type="text"
              value={form.orgName}
              onChange={(e) => setForm((f) => ({ ...f, orgName: e.target.value }))}
              placeholder={ui.orgName}
              required
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.country}</label>
            <select
              className={styles.input}
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, companySize: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, timeFrame: e.target.value }))}
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

          {/* Cost Savings BEFORE Strategic Goal */}
          <div className={styles.formStack}>
            <label className={styles.label}>{ui.costSavingsGoal}</label>
            <input
              className={styles.input}
              type="text"
              inputMode="decimal"
              placeholder="$1,200,000 or 1200000"
              value={form.costSavingsGoal}
              onChange={(e) => setForm((f) => ({ ...f, costSavingsGoal: e.target.value }))}
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.strategicGoal}</label>
            <input
              className={styles.input}
              type="text"
              value={form.strategicGoal}
              onChange={(e) => setForm((f) => ({ ...f, strategicGoal: e.target.value }))}
              placeholder="e.g., Streamline workflows, digitize ops"
            />
          </div>

          <div className={styles.formStack}>
            <label className={styles.label}>{ui.desiredOutcome}</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              rows={3}
              value={form.desiredOutcome}
              onChange={(e) => setForm((f) => ({ ...f, desiredOutcome: e.target.value }))}
            />
          </div>

          {/* Finalized By */}
          <div className={styles.formStack}>
            <label className={styles.label}>{ui.finalizedBy}</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Your name or email"
              value={finalizedBy}
              onChange={(e) => setFinalizedBy(e.target.value)}
            />
          </div>

          <div className={styles.actions}>
            {/* Client PDF */}
            <button type="button" className={styles.primaryBtn} onClick={onDownloadPdf}>
              Download PDF
            </button>

            {/* Generate */}
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={onGenerate}
              disabled={genBusy}
              style={genDone ? { backgroundColor: '#16a34a', borderColor: '#16a34a' } : undefined}
            >
              {genBusy ? ui.generating : genDone ? 'Completed' : ui.generate}
            </button>

            {/* Export (server WYSIWYG) */}
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={onExportPdfServer}
              disabled={exporting || !(recordId || rid) || !generatedHtml}
              title={
                !(recordId || rid)
                  ? 'Generate first'
                  : !generatedHtml
                    ? 'No HTML to export'
                    : ui.exportPdf
              }
              style={
                exportDone ? { backgroundColor: '#16a34a', borderColor: '#16a34a' } : undefined
              }
            >
              {exporting ? ui.exporting : exportDone ? 'Completed' : ui.exportPdf}
            </button>

            {/* Open HTML (after export) */}
            {!!exportHtmlUrl && (
              <button
                type="button"
                className={styles.secondaryBtn || styles.primaryBtn}
                onClick={() => window.open(exportHtmlUrl, '_blank', 'noopener')}
              >
                {ui.openHtml}
              </button>
            )}

            {/* Finalize */}
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={onFinalize}
              disabled={finalizing || !(recordId || rid)}
              style={
                finalizeDone ? { backgroundColor: '#16a34a', borderColor: '#16a34a' } : undefined
              }
            >
              {finalizing ? ui.finalizing : finalizeDone ? 'Completed' : ui.finalize}
            </button>

            {/* Submit */}
            {submitMsg ? <span className={styles.hint}>{submitMsg}</span> : null}
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={submitting}
              style={
                submitDone ? { backgroundColor: '#16a34a', borderColor: '#16a34a' } : undefined
              }
            >
              {submitting ? ui.submitting : submitDone ? 'Completed' : ui.submit}
            </button>
          </div>

          {genError ? (
            <div className={styles.hint} style={{ color: '#ff6b6b', marginTop: 8 }}>
              {genError}
            </div>
          ) : null}

          {/* Result preview */}
          {generatedHtml ? (
            <div className={styles.previewBox} style={{ marginTop: 12 }}>
              <h3>{ui.title}</h3>
              <p className={styles.smallNote}>
                {genResult?.wordCount ? `${genResult.wordCount} words` : ''}
                {rid || recordId ? ` · Record: ${rid || recordId}` : ''}
              </p>
              <div
                className={styles.translatedPreview || ''}
                style={{
                  background: '#111',
                  color: '#eee',
                  padding: 12,
                  borderRadius: 8,
                  marginTop: 8,
                  maxHeight: 600,
                  overflow: 'auto',
                }}
                dangerouslySetInnerHTML={{ __html: generatedHtml }}
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
              hidden
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                setForm((f) => ({ ...f, files }));
                if (files.length) await doUpload(files);
                else {
                  setUploadNote('');
                  setUploadedList([]);
                }
              }}
            />

            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ width: '100%' }}
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
