'use client';

import { useEffect, useRef } from 'react';

export default function PdfPreview({ pdfUrl }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (iframeRef.current && pdfUrl) {
      iframeRef.current.src = pdfUrl;
    }
  }, [pdfUrl]);

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem' }}>
      <h2>PDF Preview</h2>
      <iframe
        ref={iframeRef}
        title="PDF Preview"
        width="100%"
        height="600px"
        style={{ border: 'none' }}
      />
    </div>
  );
}
