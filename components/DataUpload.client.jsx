'use client';
import { useState, useCallback, useRef } from 'react';

/**
 * DataUpload Component
 * Supports CSV, Excel (.xlsx), and JSON file uploads
 * Parses data and provides preview before analysis
 */
export default function DataUpload({ onDataLoaded, color = '#3b82f6', lang = 'English' }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [rowCount, setRowCount] = useState(0);
  const [columnCount, setColumnCount] = useState(0);
  const fileInputRef = useRef(null);

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return { headers: [], rows: [], data: [] };
    
    // Handle potential quoted fields with commas
    const parseLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(line => parseLine(line));
    
    // Convert to array of objects
    const data = rows.map(row => {
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = row[idx] || '';
      });
      return obj;
    });

    return { headers, rows, data };
  };

  const parseJSON = (text) => {
    const data = JSON.parse(text);
    const rows = Array.isArray(data) ? data : [data];
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { 
      headers, 
      rows: rows.map(obj => headers.map(h => obj[h] || '')),
      data: rows 
    };
  };

  const processFile = async (file) => {
    setUploading(true);
    setError('');
    setFileName(file.name);
    setFileSize(file.size);

    try {
      const extension = file.name.split('.').pop().toLowerCase();
      let result;

      if (extension === 'csv') {
        const text = await file.text();
        result = parseCSV(text);
      } else if (extension === 'json') {
        const text = await file.text();
        result = parseJSON(text);
      } else if (extension === 'xlsx' || extension === 'xls') {
        // For Excel, we'll send to API
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch('/api/data/parse-excel', {
          method: 'POST',
          body: formData,
        });
        
        if (!res.ok) {
          // Fallback: try parsing as CSV (some Excel files export as CSV)
          const text = await file.text();
          result = parseCSV(text);
        } else {
          result = await res.json();
        }
      } else if (extension === 'txt') {
        // Try to parse as CSV
        const text = await file.text();
        result = parseCSV(text);
      } else {
        throw new Error(`Unsupported file format: ${extension}`);
      }

      setRowCount(result.rows.length);
      setColumnCount(result.headers.length);
      
      // Create preview (first 10 rows)
      setPreview({
        headers: result.headers,
        rows: result.rows.slice(0, 10),
        totalRows: result.rows.length,
      });

      // Pass full data to parent
      if (onDataLoaded) {
        onDataLoaded({
          fileName: file.name,
          fileSize: file.size,
          headers: result.headers,
          rows: result.rows,
          data: result.data,
          summary: generateDataSummary(result),
        });
      }
    } catch (err) {
      console.error('File parse error:', err);
      setError(`Failed to parse file: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const generateDataSummary = (result) => {
    const { headers, rows, data } = result;
    const summary = {
      totalRows: rows.length,
      totalColumns: headers.length,
      columns: {},
    };

    headers.forEach((header, idx) => {
      const values = rows.map(row => row[idx]).filter(v => v !== '' && v !== null && v !== undefined);
      const numericValues = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
      
      summary.columns[header] = {
        name: header,
        totalValues: values.length,
        uniqueValues: new Set(values).size,
        nullCount: rows.length - values.length,
        isNumeric: numericValues.length > values.length * 0.5,
      };

      if (numericValues.length > 0) {
        summary.columns[header].min = Math.min(...numericValues);
        summary.columns[header].max = Math.max(...numericValues);
        summary.columns[header].avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        summary.columns[header].sum = numericValues.reduce((a, b) => a + b, 0);
      }
    });

    return summary;
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const clearData = () => {
    setPreview(null);
    setFileName('');
    setFileSize(0);
    setRowCount(0);
    setColumnCount(0);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onDataLoaded) {
      onDataLoaded(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? color : `${color}40`}`,
          borderRadius: 16,
          padding: '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? `${color}10` : 'rgba(0,0,0,0.2)',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json,.txt"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {uploading ? (
          <div>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Processing file...</div>
          </div>
        ) : preview ? (
          <div>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>{fileName}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 8 }}>
              {formatFileSize(fileSize)} • {rowCount.toLocaleString()} rows • {columnCount} columns
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              Upload Your Data
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              Drag & drop or click to select
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 12 }}>
              Supports CSV, Excel (.xlsx), JSON
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 12,
          padding: 16,
          color: '#ef4444',
          fontSize: 14,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Data Preview */}
      {preview && !error && (
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 16,
          border: `1px solid ${color}20`,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            background: `${color}10`,
            borderBottom: `1px solid ${color}20`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <span style={{ color: '#fff', fontWeight: 600 }}>Data Preview</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 12, fontSize: 13 }}>
                Showing {Math.min(10, preview.totalRows)} of {preview.totalRows.toLocaleString()} rows
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); clearData(); }}
              style={{
                background: 'rgba(239,68,68,0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8,
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Clear Data
            </button>
          </div>
          
          <div style={{ overflowX: 'auto', maxHeight: 300 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                  {preview.headers.map((header, idx) => (
                    <th
                      key={idx}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        color: color,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        borderBottom: `1px solid ${color}20`,
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    style={{
                      background: rowIdx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.2)',
                    }}
                  >
                    {row.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        style={{
                          padding: '10px 16px',
                          color: 'rgba(255,255,255,0.8)',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
