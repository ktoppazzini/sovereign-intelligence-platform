'use client';
import { useState, useEffect } from 'react';

/**
 * Report Templates Component
 * Save, load, and manage report configuration templates
 */
export default function ReportTemplates({ 
  config,
  currentSettings,
  onLoadTemplate,
  color = '#3b82f6',
}) {
  const [templates, setTemplates] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load templates from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`SI_templates_${config?.id || 'default'}`);
    if (stored) {
      try {
        setTemplates(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse templates:', e);
      }
    }
  }, [config?.id]);

  const saveTemplate = () => {
    if (!templateName.trim()) return;

    const newTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      description: templateDescription.trim(),
      createdAt: new Date().toISOString(),
      settings: currentSettings,
    };

    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    localStorage.setItem(`SI_templates_${config?.id || 'default'}`, JSON.stringify(updatedTemplates));
    
    setTemplateName('');
    setTemplateDescription('');
    setShowSaveModal(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const deleteTemplate = (id) => {
    const updatedTemplates = templates.filter(t => t.id !== id);
    setTemplates(updatedTemplates);
    localStorage.setItem(`SI_templates_${config?.id || 'default'}`, JSON.stringify(updatedTemplates));
  };

  const loadTemplate = (template) => {
    if (onLoadTemplate) {
      onLoadTemplate(template.settings);
    }
  };

  const exportTemplate = (template) => {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}_template.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTemplate = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.settings) {
          const newTemplate = {
            ...imported,
            id: Date.now().toString(),
            importedAt: new Date().toISOString(),
          };
          const updatedTemplates = [...templates, newTemplate];
          setTemplates(updatedTemplates);
          localStorage.setItem(`SI_templates_${config?.id || 'default'}`, JSON.stringify(updatedTemplates));
        }
      } catch (err) {
        console.error('Failed to import template:', err);
        alert('Invalid template file');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const inputStyle = { 
    width: '100%', 
    padding: '12px 16px', 
    borderRadius: 8, 
    background: 'rgba(0,0,0,0.4)', 
    border: `1px solid ${color}30`, 
    color: '#fff', 
    fontSize: 15 
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowSaveModal(true)}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            background: color,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          💾 Save as Template
        </button>
        
        <label style={{
          padding: '10px 20px',
          borderRadius: 8,
          background: `${color}20`,
          color: color,
          border: `1px solid ${color}40`,
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          📥 Import
          <input
            type="file"
            accept=".json"
            onChange={importTemplate}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div style={{
          background: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 8,
          padding: '12px 16px',
          color: '#10b981',
          fontSize: 14,
        }}>
          ✓ Template saved successfully!
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${color}20`,
        }}>
          <h4 style={{ color: '#fff', margin: '0 0 16px 0', fontSize: 16 }}>Save Template</h4>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: 8, fontSize: 13 }}>
                Template Name *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Q4 Manufacturing Report"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: 8, fontSize: 13 }}>
                Description (optional)
              </label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="What is this template for?"
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={saveTemplate}
                disabled={!templateName.trim()}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  background: templateName.trim() ? '#10b981' : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: 'none',
                  cursor: templateName.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Templates List */}
      {templates.length > 0 && (
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 16,
          border: `1px solid ${color}20`,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${color}20`,
            background: `${color}10`,
          }}>
            <span style={{ color: '#fff', fontWeight: 600 }}>Saved Templates ({templates.length})</span>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {templates.map((template) => (
              <div
                key={template.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>{template.name}</div>
                  {template.description && (
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 4 }}>{template.description}</div>
                  )}
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                    Created {new Date(template.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => loadTemplate(template)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      background: color,
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    Load
                  </button>
                  <button
                    onClick={() => exportTemplate(template)}
                    title="Export"
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: `${color}20`,
                      color: color,
                      border: `1px solid ${color}40`,
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    📤
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    title="Delete"
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: 'rgba(239,68,68,0.15)',
                      color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.3)',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {templates.length === 0 && !showSaveModal && (
        <div style={{
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 12,
          padding: 24,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            No saved templates yet. Save your current configuration as a template for quick reuse.
          </div>
        </div>
      )}
    </div>
  );
}
