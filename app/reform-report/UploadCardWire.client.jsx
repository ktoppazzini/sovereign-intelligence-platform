'use client';
import { useRef, useState } from 'react';

const MAX_FILES = 10;

export default function UploadCardWire({ rid }) {
  const inputRef = useRef(null);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  function onPick(e) {
    const all = Array.from(e.target.files || []);
    const limited = all.slice(0, MAX_FILES);
    if (all.length > MAX_FILES) {
      alert(`Only the first ${MAX_FILES} files will be uploaded.`);
    }
    setSelected(limited);
  }

  async function onUpload() {
    if (!selected.length) return alert('Choose up to 10 files first.');
    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      if (rid) form.append('rid', rid);
      selected.forEach(f => form.append('files', f)); // key MUST be "files"

      // Debug: see what we send
      console.log('[upload] form entries:', [...form.entries()].map(([k, v]) =>
        [k, v instanceof File ? `File(${v.name}, ${v.size})` : String(v)]
      ));

      const res = await fetch('/api/uploads', { method: 'POST', body: form });
      const json = await res.json();
      setResult(json);
    } catch (e) {
      setResult({ ok: false, error: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        name="files"
        multiple
        onChange={onPick}
      />
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        Selected: {selected.length}/{MAX_FILES}
      </div>
      <button onClick={onUpload} disabled={busy || !selected.length}>
        {busy ? 'Uploading…' : 'Upload files'}
      </button>
      {result && (
        <pre className="text-xs whitespace-pre-wrap">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
