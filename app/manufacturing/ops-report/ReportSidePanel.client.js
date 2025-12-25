'use client';

// Manufacturing Operations Report - Side Panel
// Workflow: Draft → Submit → Review → Approve → Finalize

(function () {
  if (typeof window === 'undefined') return;

  var id = 'si-mfg-ops-panel';
  if (document.getElementById(id)) return;

  function getLS(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function setLS(k, v) { try { localStorage.setItem(k, v || ''); } catch (e) {} }

  function getRid() {
    try {
      var u = new URL(window.location.href);
      var r = u.searchParams.get('rid');
      if (r) { setLS('SI_MFG_REPORT', JSON.stringify({ rid: r })); return r; }
    } catch (e) {}
    try { var s = JSON.parse(getLS('SI_MFG_REPORT') || '{}'); if (s && s.rid) return String(s.rid); } catch (e) {}
    return '';
  }

  async function submitForApproval(payload) {
    var r = await fetch('/api/manufacturing/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    try { return await r.json(); } catch (e) { return {}; }
  }

  async function finalizeReport(rid) {
    var r = await fetch('/api/manufacturing/finalize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rid: rid }) });
    try { return await r.json(); } catch (e) { return {}; }
  }

  // Create panel
  var panel = document.createElement('div');
  panel.id = id;
  panel.innerHTML = `
    <style>
      #${id} { position: fixed; top: 80px; right: 16px; width: 280px; background: rgba(0,0,0,0.85); border: 1px solid rgba(6,182,212,0.3); border-radius: 16px; padding: 20px; z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; backdrop-filter: blur(10px); }
      #${id} h3 { color: #06b6d4; font-size: 14px; margin: 0 0 16px 0; font-weight: 600; display: flex; align-items: center; gap: 8px; }
      #${id} .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; }
      #${id} .status-draft { background: rgba(245,158,11,0.2); color: #f59e0b; }
      #${id} .status-review { background: rgba(139,92,246,0.2); color: #8b5cf6; }
      #${id} .status-approved { background: rgba(16,185,129,0.2); color: #10b981; }
      #${id} .field { margin-bottom: 16px; }
      #${id} label { display: block; color: rgba(255,255,255,0.6); font-size: 12px; margin-bottom: 6px; }
      #${id} input, #${id} select, #${id} textarea { width: 100%; padding: 10px 12px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(6,182,212,0.2); color: #fff; font-size: 13px; }
      #${id} input:focus, #${id} select:focus, #${id} textarea:focus { outline: none; border-color: #06b6d4; }
      #${id} button { width: 100%; padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s; }
      #${id} .btn-primary { background: linear-gradient(135deg, #06b6d4, #0891b2); color: #fff; }
      #${id} .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(6,182,212,0.3); }
      #${id} .btn-secondary { background: rgba(6,182,212,0.15); color: #06b6d4; border: 1px solid rgba(6,182,212,0.3); margin-top: 8px; }
      #${id} .btn-success { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
      #${id} .divider { height: 1px; background: rgba(6,182,212,0.2); margin: 16px 0; }
      #${id} .workflow-steps { display: flex; justify-content: space-between; margin-bottom: 16px; }
      #${id} .step { text-align: center; flex: 1; }
      #${id} .step-dot { width: 24px; height: 24px; border-radius: 50%; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
      #${id} .step-dot.active { background: #06b6d4; color: #fff; }
      #${id} .step-dot.done { background: #10b981; color: #fff; }
      #${id} .step-dot.pending { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); }
      #${id} .step-label { font-size: 10px; color: rgba(255,255,255,0.5); }
      #${id} .collapse-btn { position: absolute; top: 8px; right: 8px; background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 18px; width: auto; padding: 4px; }
      #${id}.collapsed { width: 48px; height: 48px; padding: 12px; border-radius: 50%; }
      #${id}.collapsed .panel-content { display: none; }
      #${id}.collapsed .collapse-btn { position: static; }
    </style>
    <button class="collapse-btn" onclick="this.parentElement.classList.toggle('collapsed')">×</button>
    <div class="panel-content">
      <h3>📋 Report Workflow</h3>
      <div class="workflow-steps">
        <div class="step"><div class="step-dot active">1</div><div class="step-label">Draft</div></div>
        <div class="step"><div class="step-dot pending">2</div><div class="step-label">Review</div></div>
        <div class="step"><div class="step-dot pending">3</div><div class="step-label">Approve</div></div>
        <div class="step"><div class="step-dot pending">4</div><div class="step-label">Final</div></div>
      </div>
      <div class="divider"></div>
      <div class="field">
        <label>Report Status</label>
        <span class="status-badge status-draft">DRAFT</span>
      </div>
      <div class="field">
        <label>Prepared By</label>
        <input type="text" id="mfg-preparer" placeholder="Your name">
      </div>
      <div class="field">
        <label>Reviewer Email</label>
        <input type="email" id="mfg-reviewer" placeholder="reviewer@company.com">
      </div>
      <div class="field">
        <label>Notes</label>
        <textarea id="mfg-notes" rows="2" placeholder="Any comments..."></textarea>
      </div>
      <button class="btn-primary" onclick="window.mfgSubmitForReview()">Submit for Review</button>
      <button class="btn-secondary" onclick="window.mfgExportPDF()">Export PDF</button>
      <button class="btn-secondary" onclick="window.mfgSaveDraft()">Save Draft</button>
    </div>
  `;

  document.body.appendChild(panel);

  // Global functions
  window.mfgSubmitForReview = async function() {
    var rid = getRid();
    var preparer = document.getElementById('mfg-preparer').value;
    var reviewer = document.getElementById('mfg-reviewer').value;
    var notes = document.getElementById('mfg-notes').value;
    
    if (!reviewer) { alert('Please enter reviewer email'); return; }
    
    var result = await submitForApproval({ rid: rid, preparer: preparer, reviewer: reviewer, notes: notes, status: 'pending_review' });
    if (result.ok) {
      alert('Report submitted for review!');
    } else {
      alert('Submission failed: ' + (result.error || 'Unknown error'));
    }
  };

  window.mfgExportPDF = function() {
    window.print();
  };

  window.mfgSaveDraft = function() {
    var reportHtml = document.querySelector('[data-report-content]')?.innerHTML || '';
    setLS('SI_MFG_DRAFT', JSON.stringify({ html: reportHtml, savedAt: new Date().toISOString() }));
    alert('Draft saved locally!');
  };
})();
