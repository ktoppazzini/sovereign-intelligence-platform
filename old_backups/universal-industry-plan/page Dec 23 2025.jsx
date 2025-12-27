// app/universal-industry-plan/page.jsx
// [KT:UNIVERSAL-PAGE-v2.0] Universal Industry Transformation Platform
// Main entry point for the industry-agnostic report generator
// [KT:INLINE-EDIT] Supports inline editing like Reform
// [KT:I18N] Language from URL param ?lang= (set during onboarding)
'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import NonHomeShell from '../../components/NonHomeShell.client';
import ChartHydrator from '../reform-report/ChartHydrator.client';
import { getUiTranslations, isRTL } from '../../lib/i18nClient';

// Dynamic import to avoid SSR issues with the form
const UniversalIndustryForm = dynamic(
  () => import('./UniversalIndustryForm.client'),
  { ssr: false, loading: () => <div style={{ textAlign: 'center', padding: '3rem' }}>Loading form...</div> }
);

export default function UniversalIndustryPlanPage() {
  // [KT:I18N] Get language from URL param (set during admin onboarding)
  const searchParams = useSearchParams();
  const urlLangRaw = searchParams?.get("lang") || "English";
  const [lang, setLang] = useState(urlLangRaw);

  // [KT:INLINE-EDIT] State for inline editing (matching Reform pattern)
  const [genDone, setGenDone] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const reportRef = useRef(null);
  const [editMode, setEditMode] = useState(false);
  const [hasEdits, setHasEdits] = useState(false);

  // [KT:I18N] Translatable UI labels
  const baseLabels = useMemo(() => ({
    title: 'Universal Industry Transformation',
    export: 'Export',
    // [KT:INLINE-EDIT] Edit toolbar translations
    editReport: 'Edit Report',
    saveEdits: 'Save Edits',
    discardEdits: 'Discard',
    editModeHint: 'Edit Mode: Click any text to edit',
    unsavedChanges: 'Unsaved changes',
    // Error messages
    finalizeError: 'Error finalizing report',
    submitError: 'Error submitting report',
    generateError: 'Error generating report',
    // Actions
    downloadHtml: 'Download HTML',
    printPdf: 'Print / Export PDF',
    newReport: 'New Report',
    submitForApproval: 'Submit for Approval',
  }), []);
  const [t, setT] = useState(baseLabels);

  // [KT:FIX] Sync lang state with URL parameter changes
  useEffect(() => {
    if (urlLangRaw && urlLangRaw !== lang) {
      console.log("[AUDIT] Syncing lang from URL:", urlLangRaw);
      setLang(urlLangRaw);
    }
  }, [urlLangRaw]);

  // [KT:I18N] Fetch translations dynamically on lang change
  useEffect(() => {
    getUiTranslations({ base: baseLabels, lang }).then(({ t }) => setT(t));
  }, [lang, baseLabels]);

  // [KT:I18N] Set document direction on lang change
  useEffect(() => {
    document.documentElement.setAttribute("dir", isRTL(lang) ? "rtl" : "ltr");
  }, [lang]);

  // [KT:INLINE-EDIT] Listen for report generation events from form
  useEffect(() => {
    const onGenerated = (e) => {
      if (e?.detail?.html) {
        setGeneratedHtml(e.detail.html);
        setGenDone(true);
        setHasEdits(false);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("si-universal-generated", onGenerated);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("si-universal-generated", onGenerated);
      }
    };
  }, []);

  // [KT:INLINE-EDIT] Enable contenteditable on text elements when edit mode is active
  useEffect(() => {
    if (!reportRef.current) return;
    
    const applyEditMode = () => {
      if (!reportRef.current) return;
      
      const editableSelectors = 'p, h1, h2, h3, h4, h5, h6, li, td, th, dt, dd, figcaption, blockquote, strong, b, em, i, span:not(.chart-label):not(.axis-label), div.subtitle, div.section-title, div.section-subtitle, .executive-summary, .section-content, [class*="title"], [class*="heading"], [class*="subtitle"]';
      const elements = reportRef.current.querySelectorAll(editableSelectors);
      
      if (editMode) {
        console.log('[KT:INLINE-EDIT] Enabling edit mode, found', elements.length, 'editable elements');
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
          
          el.addEventListener('mousedown', (e) => e.stopPropagation(), { once: false });
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
      requestAnimationFrame(() => applyEditMode());
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

  // [KT:INLINE-EDIT] Track edits
  const handleReportInput = useCallback(() => {
    if (reportRef.current) setHasEdits(true);
  }, []);

  // [KT:INLINE-EDIT] Save edits - syncs DOM changes back to state
  const saveEdits = useCallback(() => {
    if (reportRef.current) {
      const updatedHtml = reportRef.current.innerHTML;
      setGeneratedHtml(updatedHtml);
      setHasEdits(false);
      setEditMode(false);
      window.dispatchEvent(new CustomEvent('si-universal-html-updated', { detail: { html: updatedHtml } }));
      console.log('[KT:INLINE-EDIT] Edits saved to state');
    }
  }, []);

  // [KT:INLINE-EDIT] Discard edits - reload original HTML
  const discardEdits = useCallback(() => {
    if (reportRef.current && generatedHtml) {
      reportRef.current.innerHTML = generatedHtml
        .replace(/<pre[\s\S]*?<\/pre>/gi, "")
        .replace(/<code[\s\S]*?<\/code>/gi, "")
        .replace(/<div[^>]*class=["']?debug["']?[^>]*>[\s\S]*?<\/div>/gi, "");
      setHasEdits(false);
      setEditMode(false);
      console.log('[KT:INLINE-EDIT] Edits discarded');
    }
  }, [generatedHtml]);

  // [KT:INLINE-EDIT] Memoize sanitized HTML for display
  const [initialHtmlForEdit, setInitialHtmlForEdit] = useState('');
  useEffect(() => {
    if (!editMode && generatedHtml) {
      const sanitized = generatedHtml
        .replace(/<pre[\s\S]*?<\/pre>/gi, "")
        .replace(/<code[\s\S]*?<\/code>/gi, "")
        .replace(/<div[^>]*class=["']?debug["']?[^>]*>[\s\S]*?<\/div>/gi, "");
      setInitialHtmlForEdit(sanitized);
    }
  }, [generatedHtml, editMode]);

  // [KT:INLINE-EDIT] Inject HTML when entering edit mode
  useEffect(() => {
    if (editMode && reportRef.current && initialHtmlForEdit) {
      if (!reportRef.current.innerHTML.trim()) {
        reportRef.current.innerHTML = initialHtmlForEdit;
        console.log('[KT:INLINE-EDIT] Injected HTML for edit mode');
      }
    }
  }, [editMode, initialHtmlForEdit]);

  const handleStartOver = () => {
    setGenDone(false);
    setGeneratedHtml('');
    setEditMode(false);
    setHasEdits(false);
  };

  const handleReportGenerated = useCallback((data) => {
    if (data?.html) {
      setGeneratedHtml(data.html);
      setGenDone(true);
      setHasEdits(false);
    }
    console.log('[UniversalPage] Report generated:', data?.meta);
  }, []);

  return (
    <NonHomeShell active="universal-industry">
      <style>{`
        .chart-title{ font-size: 28px !important; }
        .chart-label{ font-size: 14px !important; }
        .axis-label{ transform: rotate(-45deg); transform-origin:left bottom; white-space:nowrap; }
        .universal-form-scope input,
        .universal-form-scope select,
        .universal-form-scope textarea {
          max-width: 100%;
          width: 100%;
        }
        .universal-form-scope .form-row,
        .universal-form-scope .form-control {
          min-width: 0;
        }
      `}</style>

      <div
        id="universal-report-root"
        style={{
          paddingTop: 16,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Form Section */}
        <div
          className="universal-form-scope"
          style={{
            width: "100%",
            maxWidth: 700,
            marginBottom: 0,
            display: "flex",
            justifyContent: "center",
            boxSizing: "border-box",
          }}
        >
          <div style={{ width: "100%", minWidth: 0 }}>
            <UniversalIndustryForm
              initialLang={lang}
              onReportGenerated={handleReportGenerated}
              setGenDoneExternal={setGenDone}
              setGeneratedHtmlExternal={setGeneratedHtml}
            />
          </div>
        </div>

        {/* Report Viewer with Inline Edit */}
        {genDone && generatedHtml && (
          <>
            {/* [KT:INLINE-EDIT] Edit toolbar */}
            <div style={{
              width: '100%',
              maxWidth: 1100,
              margin: '0 auto 12px auto',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              alignItems: 'center',
            }}>
              {!editMode ? (
                <button
                  onClick={() => {
                    console.log('[KT:INLINE-EDIT] Edit button clicked, enabling edit mode');
                    setEditMode(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
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
                  ✏️ {t.editReport}
                </button>
              ) : (
                <>
                  <span style={{ color: '#66e6b0', fontSize: 13, marginRight: 8 }}>
                    📝 {t.editModeHint}
                  </span>
                  {hasEdits && (
                    <span style={{ color: '#f59e0b', fontSize: 13 }}>
                      ⚠️ {t.unsavedChanges}
                    </span>
                  )}
                  <button
                    onClick={saveEdits}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '10px 20px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 14,
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.target.style.transform = ''}
                  >
                    ✓ {t.saveEdits}
                  </button>
                  <button
                    onClick={discardEdits}
                    style={{
                      background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '10px 20px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 14,
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.target.style.transform = ''}
                  >
                    ✗ {t.discardEdits}
                  </button>
                </>
              )}
            </div>

            {/* Report Viewer */}
            <div
              ref={reportRef}
              className="universal-report-viewer"
              onInput={handleReportInput}
              suppressContentEditableWarning={true}
              style={{
                width: "100%",
                maxWidth: 1100,
                margin: "0 auto",
                background: "#000",
                color: "#e8eefb",
                borderRadius: 12,
                padding: 32,
                border: editMode ? "3px solid #10b981" : "1px solid rgba(255,255,255,0.15)",
                overflow: "visible",
                boxSizing: "border-box",
                marginTop: 0,
                transition: 'border 0.3s ease',
              }}
              dangerouslySetInnerHTML={editMode ? undefined : { __html: initialHtmlForEdit }}
            >
              {/* When in edit mode, children managed by contenteditable */}
            </div>
          </>
        )}
      </div>

      {/* Chart Hydrator for interactive charts */}
      {genDone && generatedHtml && <ChartHydrator />}
    </NonHomeShell>
  );
}
