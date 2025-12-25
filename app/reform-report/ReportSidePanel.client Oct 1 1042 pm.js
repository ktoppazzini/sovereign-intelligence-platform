'use client';

(function () {
  if (typeof window === 'undefined') return;

  var id = 'si-email-upload-panel';
  if (document.getElementById(id)) return;

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

  // Try to discover rid from URL (?rid=...) or LS
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

  var root = document.createElement('div');
  root.id = id;
  root.style.cssText = [
    'position:fixed',
    'left:16px',
    // ↓ Move panel down so it does not cover the navigation
    'top:72px',
    'z-index:9999',
    'width:280px',
    'background:rgba(15,23,42,.90)',
    'color:#e5e7eb',
    'border:1px solid #334155',
    'border-radius:12px',
    'padding:12px',
    'backdrop-filter:blur(6px)',
    'box-shadow:0 6px 20px rgba(0,0,0,.25)',
  ].join(';');

  root.innerHTML = [
    '<div style="font-weight:600;font-size:14px;margin-bottom:8px">Email & Submission</div>',

    '<div style="font-size:12px;opacity:.8;margin-top:4px">Prepared By (Name)</div>',
    '<input id="si-prepared-name" placeholder="Full name" ',
    'style="width:100%;max-width:100%;max-width:100%;padding:6px;margin:4px 0;border-radius:8px;color:#000" />',

    '<div style="font-size:12px;opacity:.8">Prepared For (Name)</div>',
    '<input id="si-for-name" placeholder="Contact name" ',
    'style="width:100%;max-width:100%;max-width:100%;padding:6px;margin:4px 0 8px 0;border-radius:8px;color:#000" />',

    '<div style="font-size:12px;opacity:.8">From Email (sender)</div>',
    '<input id="si-from-email" type="email" placeholder="reports@yourdomain" ',
    'style="width:100%;max-width:100%;max-width:100%;padding:6px;margin:4px 0;border-radius:8px;color:#000" />',

    '<hr style="border-color:#334155;margin:10px 0" />',

    '<div style="font-weight:700;font-size:14px;margin-bottom:8px">Upload Revised Report</div>',
    '<div style="font-size:12px;opacity:.8">RID: <span id="si-rid" style="opacity:1"></span></div>',
    '<input id="si-rev-file" type="file" accept=".pdf,.html,.htm" ',
    'style="width:100%;max-width:100%;max-width:100%;margin:6px 0" />',
    '<input id="si-rev-notes" placeholder="Notes (optional)" ',
    'style="width:100%;max-width:100%;max-width:100%;padding:6px;margin:4px 0;border-radius:8px;color:#000" />',

    '<button id="si-submit" ',
    'style="width:100%;max-width:100%;max-width:100%;padding:10px 12px;border-radius:8px;background:#2563eb;color:#fff;font-weight:600;margin-top:6px;cursor:pointer">',
    'Upload & Re-Submit / Submit',
    '</button>',

    '<div id="si-msg" style="font-size:12px;opacity:.85;margin-top:6px;min-height:18px"></div>',
  ].join('');

  document.body.appendChild(root);

  // Wire up state
  var elBy = root.querySelector('#si-prepared-name');
  var elFor = root.querySelector('#si-for-name');
  var elFrom = root.querySelector('#si-from-email');
  var elRid = root.querySelector('#si-rid');
  var elFile = root.querySelector('#si-rev-file');
  var elNote = root.querySelector('#si-rev-notes');
  var elBtn = root.querySelector('#si-submit');
  var elMsg = root.querySelector('#si-msg');

  // Restore cached values
  elBy.value = getLS('SI_PREPARED_BY_NAME');
  elFor.value = getLS('SI_PREPARED_FOR_NAME');
  elFrom.value = getLS('SI_FROM_EMAIL');
  var rid = getRid();
  elRid.textContent = rid || '(finalize to get RID)';

  function setBusy(b) {
    elBtn.disabled = !!b;
    elBtn.style.background = b ? '#1e3a8a' : '#2563eb';
  }
  function setMsg(m) {
    elMsg.textContent = m || '';
  }

  elBy.addEventListener('change', function () {
    setLS('SI_PREPARED_BY_NAME', (elBy.value || '').trim());
  });
  elFor.addEventListener('change', function () {
    setLS('SI_PREPARED_FOR_NAME', (elFor.value || '').trim());
  });
  elFrom.addEventListener('change', function () {
    setLS('SI_FROM_EMAIL', (elFrom.value || '').trim());
  });

  elBtn.addEventListener('click', async function () {
    var currentRid = rid || getRid();
    if (!currentRid) {
      alert('Missing RID. Click 4 - Finalize first to generate an RID.');
      return;
    }

    setBusy(true);
    setMsg('');

    // Airtable-driven emails (if available)
    var preparedByEmail = await lookupEmail('preparedBy', (elBy.value || '').trim());
    var preparedForEmail = await lookupEmail('preparedFor', (elFor.value || '').trim());
    if (preparedByEmail) setLS('SI_PREPARED_BY_EMAIL', preparedByEmail);
    if (preparedForEmail) setLS('SI_PREPARED_FOR_EMAIL', preparedForEmail);

    // Optional revision upload
    var f = elFile.files && elFile.files[0] ? elFile.files[0] : null;
    if (f) {
      setMsg('Uploading revision…');
      var info = await uploadRevision({
        rid: currentRid,
        file: f,
        actor: elFrom.value || preparedByEmail || '',
        notes: (elNote.value || '').trim(),
      });
      setMsg(
        'Revision ' +
          (info && (info.revision || info.rev || 'N')) +
          ' uploaded — requesting approval…',
      );
    } else {
      setMsg('Requesting approval…');
    }

    // Submit for approval
    var payload = {
      rid: currentRid,
      fromEmail: elFrom.value || preparedByEmail || '',
      preparedByName: (elBy.value || '').trim(),
      preparedByEmail: preparedByEmail || '',
      preparedForName: (elFor.value || '').trim(),
      preparedForEmail: preparedForEmail || '',
      notes: (elNote.value || '').trim(),
    };
    try {
      await submitForApproval(payload);
      setMsg('Submitted ✔');
    } catch (e) {
      setMsg(String((e && e.message) || e));
    } finally {
      setBusy(false);
    }
  });
})();
