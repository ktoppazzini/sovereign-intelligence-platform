'use client';

// NOTE: surgical update:
// - Narrow panel to 240px so it intrudes less
// - After mounting, gently offset any element with `.si-main-content` so content never sits under the panel
// - Keep everything else identical to your previous behavior
// - NEW: all user-visible text is dynamically translated via /api/gptTranslation (JSON mode)
// - NEW: custom, translated “Choose File” button for the upload control

(function () {
  if (typeof window === 'undefined') return;

  var id = 'si-email-upload-panel';
  if (document.getElementById(id)) return;

  // ---- helpers (unchanged) -------------------------------------------------
  function getLS(k) {
    try {
      return localStorage.getItem(k) || '';
    } catch (e) {
      return '';
    }
  }
  function setLS(k, v) {
    try {
      localStorage.setItem(k, v || '');
    } catch (e) {}
  }

  function getRid() {
    try {
      var u = new URL(window.location.href);
      var r = u.searchParams.get('rid');
      if (r) {
        setLS('SI_FINALIZE', JSON.stringify({ rid: r }));
        return r;
      }
    } catch (e) {}
    try {
      var s = JSON.parse(getLS('SI_FINALIZE') || '{}');
      if (s && s.rid) return String(s.rid);
    } catch (e) {}
    return '';
  }

  async function lookupEmail(role, name) {
    if (!name) return '';
    try {
      var r = await fetch('/api/reform/lookup-contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: role, name: name }),
      });
      var j = await r.json();
      return j && j.email ? String(j.email) : '';
    } catch (e) {
      return '';
    }
  }

  async function uploadRevision(opts) {
    var fd = new FormData();
    if (opts.rid) fd.set('rid', opts.rid);
    if (opts.actor) fd.set('actor', opts.actor);
    if (opts.notes) fd.set('notes', opts.notes);
    if (opts.file) fd.set('file', opts.file, opts.file.name || 'upload');

    var r = await fetch('/api/reform/upload-revision', { method: 'POST', body: fd });
    try {
      return await r.json();
    } catch (e) {
      return {};
    }
  }

  async function submitForApproval(payload) {
    var r = await fetch('/api/reform/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    try {
      return await r.json();
    } catch (e) {
      return {};
    }
  }

  // Get HTML report content from the DOM
  async function getReportHtml() {
    try {
      // Try to find the main report container
      var reportEl = document.getElementById('reform-report-root');
      if (reportEl) {
        return reportEl.innerHTML;
      }
      // Fallback: try to find any report content
      var mainContent = document.querySelector('.si-main-content');
      if (mainContent) {
        return mainContent.innerHTML;
      }
      return '';
    } catch (e) {
      console.warn('[SI:PANEL] getReportHtml error:', e);
      return '';
    }
  }

  // Detect if this is a "changes requested" scenario
  function getChangeRequestContext() {
    try {
      var u = new URL(window.location.href);
      var changeReqId = u.searchParams.get('changeReqId');
      var requesterEmail = u.searchParams.get('requesterEmail');
      var changeNotes = u.searchParams.get('changeNotes');
      
      if (changeReqId) {
        return {
          changeReqId: changeReqId,
          requesterEmail: requesterEmail,
          changeNotes: decodeURIComponent(changeNotes || ''),
        };
      }
    } catch (e) {}
    return null;
  }

  // Get form data from main form inputs
  function getFormData() {
    try {
      var preparedFor = '';
      var preparedForEmail = '';
      
      // Try to find input fields by ID or name
      var pfInput = document.querySelector('input[id*="preparedFor"], input[name*="preparedFor"]');
      if (pfInput && pfInput.value) {
        preparedFor = pfInput.value;
      }
      
      var pfeInput = document.querySelector('input[id*="preparedForEmail"], input[name*="preparedForEmail"]');
      if (pfeInput && pfeInput.value) {
        preparedForEmail = pfeInput.value;
      }
      
      return {
        preparedFor: preparedFor,
        preparedForEmail: preparedForEmail,
      };
    } catch (e) {
      return {};
    }
  }

  // ---- language + UI translation helpers ----------------------------------

  function detectLang() {
    try {
      var u = new URL(window.location.href);
      var q = u.searchParams.get('lang');
      if (q) return q;
    } catch (e) {}
    try {
      var htmlLang =
        document.documentElement && document.documentElement.getAttribute('lang');
      if (htmlLang) return htmlLang;
    } catch (e) {}
    try {
      var m = document.cookie.match(/(?:^|;\s*)si\.lang=([^;]+)/i);
      if (m && m[1]) return decodeURIComponent(m[1]);
    } catch (e) {}
    return 'English';
  }

  function isEnglishLang(lang) {
    var v = String(lang || '').toLowerCase();
    return v === 'english' || v === 'en' || v.indexOf('en-') === 0;
  }

  // Base English UI strings – SINGLE source of truth for this panel
  var UI_EN = {
    panelTitle: 'Email & Submission',
    preparedByLabel: 'Prepared By (Name)',
    preparedByPlaceholder: 'Full name',
    preparedForLabel: 'Prepared For (Name)',
    preparedForPlaceholder: 'Contact name',
    fromEmailLabel: 'From Email (sender)',
    fromEmailPlaceholder: 'reports@yourdomain',
    uploadSectionTitle: 'Upload Revised Report',
    ridLabel: 'RID:',
    ridFallback: '(finalize to get RID)',
    notesPlaceholder: 'Notes (optional)',
    submitButton: 'Upload & Re-Submit / Submit',
    alertMissingRid: 'Missing RID. Click 4 - Finalize first to generate an RID.',
    msgUploadingRevision: 'Uploading revision…',
    msgRevisionUploaded: 'Revision {{rev}} uploaded — requesting approval…',
    msgRequestingApproval: 'Requesting approval…',
    msgSubmitted: 'Submitted ✔',
    // NEW: label for the custom file “Choose” button
    chooseFileButton: 'Choose file',
  };

  // active UI (starts as English, overridden by translations)
  var UI = UI_EN;

  async function fetchUiTranslations(targetLang) {
    try {
      if (!targetLang || isEnglishLang(targetLang)) {
        return UI_EN;
      }

      var payload = {
        mode: 'json',
        targetLang: targetLang,
        ui: UI_EN,
      };

      var res = await fetch('/api/gptTranslation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SI-Debug': 'panel-ui-json:' + String(targetLang),
        },
        cache: 'no-store',
        body: JSON.stringify(payload),
      });

      var raw = await res.text();
      var j;
      try {
        j = JSON.parse(raw);
      } catch (e) {
        console.warn('[SI:PANEL:I18N] ui parse error', e, raw.slice(0, 160));
      }

      if (res.ok && j && j.translation && typeof j.translation === 'object') {
        var merged = {};
        Object.keys(UI_EN).forEach(function (k) {
          merged[k] = UI_EN[k];
        });
        Object.keys(j.translation).forEach(function (k) {
          merged[k] = j.translation[k];
        });
        return merged;
      }

      console.warn('[SI:PANEL:I18N] ui translate fallback → english', {
        status: res.status,
        err: j && j.error,
      });
    } catch (e) {
      console.warn('[SI:PANEL:I18N] ui translate exception', e);
    }
    return UI_EN;
  }

  // ---- panel DOM -----------------------------------------------------------
  var PANEL_W = 240;
  var GUTTER = 24;

  var root = document.createElement('div');
  root.id = id;
  root.style.cssText = [
    'position:fixed',
    'left:16px',
    'top:72px',
    'z-index:9999',
    'width:' + PANEL_W + 'px',
    'background:rgba(15,23,42,.90)',
    'color:#e5e7eb',
    'border:1px solid #334155',
    'border-radius:12px',
    'padding:12px',
    'backdrop-filter:blur(6px)',
    'box-shadow:0 6px 20px rgba(0,0,0,.25)',
  ].join(';');

  // All static text here will be replaced by UI map after translations load
  root.innerHTML = [
    '<div id="si-panel-title" style="font-weight:600;font-size:14px;margin-bottom:8px">',
    UI_EN.panelTitle,
    '</div>',

    '<div id="si-label-prepared-by" style="font-size:12px;opacity:.8;margin-top:4px">',
    UI_EN.preparedByLabel,
    '</div>',
    '<input id="si-prepared-name" placeholder="',
    UI_EN.preparedByPlaceholder,
    '" style="width:100%;max-width:100%;padding:6px;margin:4px 0;border-radius:8px;color:#000" />',

    '<div id="si-label-prepared-for" style="font-size:12px;opacity:.8">',
    UI_EN.preparedForLabel,
    '</div>',
    '<input id="si-for-name" placeholder="',
    UI_EN.preparedForPlaceholder,
    '" style="width:100%;max-width:100%;padding:6px;margin:4px 0 8px 0;border-radius:8px;color:#000" />',

    '<div id="si-label-from-email" style="font-size:12px;opacity:.8">',
    UI_EN.fromEmailLabel,
    '</div>',
    '<input id="si-from-email" type="email" placeholder="',
    UI_EN.fromEmailPlaceholder,
    '" style="width:100%;max-width:100%;padding:6px;margin:4px 0;border-radius:8px;color:#000" />',

    '<hr style="border-color:#334155;margin:10px 0" />',

    '<div id="si-upload-title" style="font-weight:700;font-size:14px;margin-bottom:8px">',
    UI_EN.uploadSectionTitle,
    '</div>',
    '<div style="font-size:12px;opacity:.8">',
    UI_EN.ridLabel,
    ' <span id="si-rid" style="opacity:1"></span></div>',

    // NEW: custom file control wrapper – input sits on top, button shows translated label
    '<div style="position:relative;margin:6px 0;">',
    '<input id="si-rev-file" type="file" accept=".pdf,.html,.htm" ',
    'style="position:absolute;inset:0;opacity:0;width:100%;max-width:100%;cursor:pointer;" />',
    '<button id="si-file-trigger" type="button" ',
    'style="width:100%;max-width:100%;padding:8px 10px;border-radius:8px;',
    'background:#020617;color:#e5e7eb;font-size:12px;border:1px dashed #4b5563;',
    'cursor:pointer;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">',
    UI_EN.chooseFileButton,
    '</button>',
    '</div>',

    '<input id="si-rev-notes" placeholder="',
    UI_EN.notesPlaceholder,
    '" style="width:100%;max-width:100%;padding:6px;margin:4px 0;border-radius:8px;color:#000" />',

    '<button id="si-submit" ',
    'style="width:100%;max-width:100%;padding:10px 12px;border-radius:8px;background:#2563eb;color:#fff;font-weight:600;margin-top:6px;cursor:pointer">',
    UI_EN.submitButton,
    '</button>',

    '<div id="si-msg" style="font-size:12px;opacity:.85;margin-top:6px;min-height:18px"></div>',
  ].join('');

  document.body.appendChild(root);

  // ---- layout offset so the panel never overlaps main content --------------
  function applyOffset() {
    var main = document.querySelector('.si-main-content');
    if (!main) return;
    var shouldOffset = window.innerWidth >= PANEL_W + 900;
    main.style.marginLeft = shouldOffset ? PANEL_W + GUTTER + 16 + 'px' : '';
  }
  applyOffset();
  window.addEventListener('resize', applyOffset);

  // ---- wire up state + translation -----------------------------------------

  var elBy = root.querySelector('#si-prepared-name');
  var elFor = root.querySelector('#si-for-name');
  var elFrom = root.querySelector('#si-from-email');
  var elRid = root.querySelector('#si-rid');
  var elFile = root.querySelector('#si-rev-file');
  var elFileTrigger = root.querySelector('#si-file-trigger');
  var elNote = root.querySelector('#si-rev-notes');
  var elBtn = root.querySelector('#si-submit');
  var elMsg = root.querySelector('#si-msg');

  var elTitle = root.querySelector('#si-panel-title');
  var elPreparedByLabel = root.querySelector('#si-label-prepared-by');
  var elPreparedForLabel = root.querySelector('#si-label-prepared-for');
  var elFromEmailLabel = root.querySelector('#si-label-from-email');
  var elUploadTitle = root.querySelector('#si-upload-title');

  elBy.value = getLS('SI_PREPARED_BY_NAME');
  elFor.value = getLS('SI_PREPARED_FOR_NAME') || getFormData().preparedFor || '';
  elFrom.value = getLS('SI_FROM_EMAIL');

  // Also populate prepared for email from main form if available
  var formData = getFormData();
  if (!elFrom.value && formData.preparedForEmail) {
    elFrom.value = formData.preparedForEmail;
  }

  var rid = getRid();
  elRid.textContent = rid || UI_EN.ridFallback;

  function setBusy(b) {
    elBtn.disabled = !!b;
    elBtn.style.background = b ? '#1e3a8a' : '#2563eb';
  }
  function setMsg(m) {
    elMsg.textContent = m || '';
  }

  function applyUiToDom() {
    if (elTitle && UI.panelTitle) elTitle.textContent = UI.panelTitle;
    if (elPreparedByLabel && UI.preparedByLabel)
      elPreparedByLabel.textContent = UI.preparedByLabel;
    if (elPreparedForLabel && UI.preparedForLabel)
      elPreparedForLabel.textContent = UI.preparedForLabel;
    if (elFromEmailLabel && UI.fromEmailLabel)
      elFromEmailLabel.textContent = UI.fromEmailLabel;
    if (elUploadTitle && UI.uploadSectionTitle)
      elUploadTitle.textContent = UI.uploadSectionTitle;

    if (elBy && UI.preparedByPlaceholder)
      elBy.placeholder = UI.preparedByPlaceholder;
    if (elFor && UI.preparedForPlaceholder)
      elFor.placeholder = UI.preparedForPlaceholder;
    if (elFrom && UI.fromEmailPlaceholder)
      elFrom.placeholder = UI.fromEmailPlaceholder;
    if (elNote && UI.notesPlaceholder) elNote.placeholder = UI.notesPlaceholder;

    if (elBtn && UI.submitButton) elBtn.textContent = UI.submitButton;

    // NEW: translated label for “Choose file”
    if (elFileTrigger && UI.chooseFileButton) {
      elFileTrigger.textContent = UI.chooseFileButton;
    }

    if (!rid && elRid && UI.ridFallback) {
      elRid.textContent = UI.ridFallback;
    }
  }

  // initial apply (English)
  applyUiToDom();

  // NEW: watch for changes in main form and sync to side panel
  function syncFromMainForm() {
    var currentFormData = getFormData();
    if (currentFormData.preparedFor && currentFormData.preparedFor !== elFor.value) {
      elFor.value = currentFormData.preparedFor;
    }
    if (currentFormData.preparedForEmail && !elFrom.value) {
      elFrom.value = currentFormData.preparedForEmail;
    }
  }

  // Check for form changes every second
  var syncInterval = setInterval(syncFromMainForm, 1000);

  // Also listen for blur events on main form inputs to catch changes
  try {
    var pfInputs = document.querySelectorAll('input[id*="preparedFor"], input[name*="preparedFor"]');
    pfInputs.forEach(function (el) {
      el.addEventListener('blur', syncFromMainForm);
      el.addEventListener('change', syncFromMainForm);
    });
  } catch (e) {}

  elBy.addEventListener('change', function () {
    setLS('SI_PREPARED_BY_NAME', (elBy.value || '').trim());
  });
  elFor.addEventListener('change', function () {
    setLS('SI_PREPARED_FOR_NAME', (elFor.value || '').trim());
  });
  elFrom.addEventListener('change', function () {
    setLS('SI_FROM_EMAIL', (elFrom.value || '').trim());
  });

  // NEW: clicking the custom button forwards to the hidden file input
  if (elFileTrigger && elFile) {
    elFileTrigger.addEventListener('click', function () {
      elFile.click();
    });
  }

  // NEW: show selected filename in the message area (language-agnostic)
  if (elFile) {
    elFile.addEventListener('change', function () {
      var f = elFile.files && elFile.files[0];
      if (f) {
        setMsg(f.name);
      } else {
        setMsg('');
      }
    });
  }

  elBtn.addEventListener('click', async function () {
    var currentRid = rid || getRid();
    if (!currentRid) {
      alert(
        UI.alertMissingRid ||
          'Missing RID. Click 4 - Finalize first to generate an RID.'
      );
      return;
    }

    setBusy(true);
    setMsg('');

    var preparedByEmail = await lookupEmail(
      'preparedBy',
      (elBy.value || '').trim()
    );
    var preparedForEmail = await lookupEmail(
      'preparedFor',
      (elFor.value || '').trim()
    );
    if (preparedByEmail) setLS('SI_PREPARED_BY_EMAIL', preparedByEmail);
    if (preparedForEmail) setLS('SI_PREPARED_FOR_EMAIL', preparedForEmail);

    var f = elFile.files && elFile.files[0] ? elFile.files[0] : null;
    
    // If file uploaded, handle revision upload
    if (f) {
      setMsg(UI.msgUploadingRevision || 'Uploading revision…');
      var info = await uploadRevision({
        rid: currentRid,
        file: f,
        actor: elFrom.value || preparedByEmail || '',
        notes: (elNote.value || '').trim(),
      });
      var revLabel = info && (info.revision || info.rev || 'N');
      var tmpl =
        UI.msgRevisionUploaded ||
        'Revision {{rev}} uploaded — requesting approval…';
      var msg = tmpl.replace('{{rev}}', String(revLabel));
      setMsg(msg);
    } else {
      // No file: submit current report HTML from DOM
      setMsg(UI.msgRequestingApproval || 'Requesting approval…');
    }

    try {
      // Get report HTML from DOM
      var reportHtml = await getReportHtml();
      
      // Check if this is a "changes requested" resubmission
      var changeContext = getChangeRequestContext();
      
      var submitPayload = {
        rid: currentRid,
        html: reportHtml,
        fromEmail: elFrom.value || preparedByEmail || '',
        preparedByName: (elBy.value || '').trim(),
        preparedByEmail: preparedByEmail || '',
        preparedForName: (elFor.value || '').trim(),
        preparedForEmail: preparedForEmail || '',
        notes: (elNote.value || '').trim(),
        
        // If resubmitting after "changes requested"
        changeReqId: changeContext ? changeContext.changeReqId : undefined,
        requesterEmail: changeContext ? changeContext.requesterEmail : undefined,
        changeNotes: changeContext ? changeContext.changeNotes : undefined,
      };
      
      var result = await submitForApproval(submitPayload);
      
      if (result.ok) {
        setMsg(UI.msgSubmitted || 'Submitted ✔');
        // Clear form after successful submit
        elNote.value = '';
        elFile.value = '';
        setMsg('');
      } else {
        setMsg(
          'Error: ' + (result.error || 'Unknown error submitting report')
        );
      }
    } catch (e) {
      setMsg(String((e && e.message) || e));
    } finally {
      setBusy(false);
    }
  });

  // ---- kick off async translation after DOM is ready -----------------------

  (async function () {
    try {
      var lang = detectLang();
      if (!lang || isEnglishLang(lang)) return;
      var translatedUI = await fetchUiTranslations(lang);

      // Also translate any remaining static labels in the panel
      if (elUploadTitle && translatedUI.uploadSectionTitle) {
        elUploadTitle.textContent = translatedUI.uploadSectionTitle;
      }
      UI = translatedUI || UI_EN;
      applyUiToDom();
    } catch (e) {
      // Silent fail; English UI already applied
    }
  })();
})();

