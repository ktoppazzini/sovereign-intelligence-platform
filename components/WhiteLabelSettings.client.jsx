'use client';

import { useState, useEffect } from 'react';
import { getUiTranslations } from '../lib/i18nClient';

/**
 * WhiteLabelSettings - Custom branding for enterprise clients
 * Features:
 * - Logo upload
 * - Color customization
 * - Custom domain support
 * - Brand guidelines
 * Supports 207 languages via dynamic translation
 */

const BASE_UI = {
  whiteLabel: 'White Label',
  whiteLabelSettings: 'White Label Settings',
  customizeBranding: 'Customize your platform branding',
  branding: 'Branding',
  colors: 'Colors',
  typography: 'Typography',
  domain: 'Domain',
  companyName: 'Company Name',
  tagline: 'Tagline',
  logoUrl: 'Logo URL',
  faviconUrl: 'Favicon URL',
  primaryColor: 'Primary Color',
  secondaryColor: 'Secondary Color',
  accentColor: 'Accent Color',
  backgroundColor: 'Background Color',
  textColor: 'Text Color',
  fontFamily: 'Font Family',
  borderRadius: 'Border Radius',
  customDomain: 'Custom Domain',
  emailDomain: 'Email Domain',
  showPoweredBy: 'Show "Powered by Sovereign"',
  customCss: 'Custom CSS',
  preview: 'Preview',
  previewOn: 'Preview ON',
  unsaved: 'Unsaved',
  save: 'Save',
  reset: 'Reset',
  colorPresets: 'Color Presets',
  savedSuccess: 'Branding settings saved successfully!',
};

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian', 'Pashto', 'Sindhi'];

export default function WhiteLabelSettings({ verticalId, color = '#3b82f6', lang = 'English', organizationName = '' }) {
  const [ui, setUi] = useState(BASE_UI);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('branding');
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const isRTL = RTL_LANGUAGES.includes(lang);

  // Load translations
  useEffect(() => {
    (async () => {
      try {
        const { t } = await getUiTranslations({
          base: BASE_UI,
          lang,
          cachePrefix: 'SI_WhiteLabelSettings',
          setDir: false,
        });
        setUi(t || BASE_UI);
      } catch (err) {
        console.warn('WhiteLabelSettings translation failed:', err);
      }
    })();
  }, [lang]);
  
  // Branding settings
  const [brandSettings, setBrandSettings] = useState({
    companyName: organizationName || 'Your Company',
    tagline: 'Powered by Sovereign Intelligence',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: color,
    secondaryColor: '#8b5cf6',
    accentColor: '#10b981',
    backgroundColor: '#0a1628',
    textColor: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '12',
    customDomain: '',
    emailDomain: '',
    showPoweredBy: true,
    customCss: '',
  });

  const [previewMode, setPreviewMode] = useState(false);

  const handleChange = (key, value) => {
    setBrandSettings(prev => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };

  const handleSave = () => {
    // In production, save to database/API
    localStorage.setItem(`whitelabel_${verticalId}`, JSON.stringify(brandSettings));
    setUnsavedChanges(false);
    alert(ui.savedSuccess);
  };

  const handleReset = () => {
    setBrandSettings({
      companyName: organizationName || 'Your Company',
      tagline: 'Powered by Sovereign Intelligence',
      logoUrl: '',
      faviconUrl: '',
      primaryColor: color,
      secondaryColor: '#8b5cf6',
      accentColor: '#10b981',
      backgroundColor: '#0a1628',
      textColor: '#ffffff',
      fontFamily: 'Inter, system-ui, sans-serif',
      borderRadius: '12',
      customDomain: '',
      emailDomain: '',
      showPoweredBy: true,
      customCss: '',
    });
    setUnsavedChanges(false);
  };

  const colorPresets = [
    { name: 'Corporate Blue', primary: '#3b82f6', secondary: '#1d4ed8', accent: '#60a5fa' },
    { name: 'Enterprise Green', primary: '#10b981', secondary: '#059669', accent: '#34d399' },
    { name: 'Professional Purple', primary: '#8b5cf6', secondary: '#7c3aed', accent: '#a78bfa' },
    { name: 'Finance Gold', primary: '#f59e0b', secondary: '#d97706', accent: '#fbbf24' },
    { name: 'Healthcare Teal', primary: '#14b8a6', secondary: '#0d9488', accent: '#2dd4bf' },
    { name: 'Defense Red', primary: '#ef4444', secondary: '#dc2626', accent: '#f87171' },
  ];

  const fontOptions = [
    { name: 'Inter', value: 'Inter, system-ui, sans-serif' },
    { name: 'Roboto', value: 'Roboto, Arial, sans-serif' },
    { name: 'Open Sans', value: '"Open Sans", Arial, sans-serif' },
    { name: 'Lato', value: 'Lato, Arial, sans-serif' },
    { name: 'Montserrat', value: 'Montserrat, Arial, sans-serif' },
    { name: 'Source Sans Pro', value: '"Source Sans Pro", Arial, sans-serif' },
  ];

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: 20,
  };

  const contentStyle = {
    background: previewMode 
      ? `linear-gradient(135deg, ${brandSettings.backgroundColor} 0%, ${brandSettings.backgroundColor}ee 100%)`
      : 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1f35 100%)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 900,
    maxHeight: '95vh',
    overflow: 'hidden',
    border: `1px solid ${previewMode ? brandSettings.primaryColor : color}33`,
    boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
    fontFamily: previewMode ? brandSettings.fontFamily : 'inherit',
    direction: isRTL ? 'rtl' : 'ltr',
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '12px 20px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${color}44`,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          transition: 'all 0.2s',
          direction: isRTL ? 'rtl' : 'ltr',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = `${color}22`;
          e.currentTarget.style.borderColor = color;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.borderColor = `${color}44`;
        }}
      >
        <span style={{ fontSize: 18 }}>🎨</span>
        {ui.whiteLabel}
      </button>

      {/* Modal */}
      {isOpen && (
        <div style={modalStyle} onClick={() => setIsOpen(false)}>
          <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: `1px solid rgba(255,255,255,0.1)`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>🎨</span>
                <div>
                  <h2 style={{ margin: 0, color: previewMode ? brandSettings.textColor : '#fff', fontSize: 18, fontWeight: 700 }}>
                    White Label Settings
                  </h2>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    Customize your platform branding
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: previewMode ? `${brandSettings.primaryColor}22` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${previewMode ? brandSettings.primaryColor : 'rgba(255,255,255,0.1)'}`,
                    color: previewMode ? brandSettings.primaryColor : 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {previewMode ? '👁️ Preview ON' : '👁️ Preview'}
                </button>
                {unsavedChanges && (
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    background: 'rgba(245,158,11,0.15)',
                    color: '#f59e0b',
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    Unsaved
                  </span>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 10px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              padding: '0 24px',
            }}>
              {[
                { id: 'branding', label: 'Branding', icon: '🏷️' },
                { id: 'colors', label: 'Colors', icon: '🎨' },
                { id: 'typography', label: 'Typography', icon: '🔤' },
                { id: 'domain', label: 'Domain', icon: '🌐' },
                { id: 'advanced', label: 'Advanced', icon: '⚙️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab.id 
                      ? `2px solid ${previewMode ? brandSettings.primaryColor : color}` 
                      : '2px solid transparent',
                    color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    marginBottom: -1,
                  }}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ padding: 24, maxHeight: 'calc(95vh - 180px)', overflowY: 'auto' }}>
              {/* Branding Tab */}
              {activeTab === 'branding' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={brandSettings.companyName}
                        onChange={(e) => handleChange('companyName', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: parseInt(brandSettings.borderRadius) / 2,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          fontSize: 14,
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
                        Tagline
                      </label>
                      <input
                        type="text"
                        value={brandSettings.tagline}
                        onChange={(e) => handleChange('tagline', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: parseInt(brandSettings.borderRadius) / 2,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          fontSize: 14,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={brandSettings.logoUrl}
                      onChange={(e) => handleChange('logoUrl', e.target.value)}
                      placeholder="https://yourcompany.com/logo.png"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: parseInt(brandSettings.borderRadius) / 2,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: 14,
                      }}
                    />
                    {brandSettings.logoUrl && (
                      <div style={{ marginTop: 12, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                        <img src={brandSettings.logoUrl} alt="Logo preview" style={{ maxHeight: 60, maxWidth: '100%' }} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 500 }}>Show "Powered by Sovereign Intelligence"</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Display attribution in footer</div>
                    </div>
                    <button
                      onClick={() => handleChange('showPoweredBy', !brandSettings.showPoweredBy)}
                      style={{
                        width: 48,
                        height: 26,
                        borderRadius: 13,
                        background: brandSettings.showPoweredBy ? brandSettings.primaryColor : 'rgba(255,255,255,0.2)',
                        border: 'none',
                        padding: 2,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: brandSettings.showPoweredBy ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff' }} />
                    </button>
                  </div>
                </div>
              )}

              {/* Colors Tab */}
              {activeTab === 'colors' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <h4 style={{ color: '#fff', margin: '0 0 12px', fontSize: 14 }}>Quick Presets</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {colorPresets.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => {
                            handleChange('primaryColor', preset.primary);
                            handleChange('secondaryColor', preset.secondary);
                            handleChange('accentColor', preset.accent);
                          }}
                          style={{
                            padding: '12px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.03)',
                            border: brandSettings.primaryColor === preset.primary 
                              ? `2px solid ${preset.primary}` 
                              : '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 4, background: preset.primary }} />
                            <div style={{ width: 20, height: 20, borderRadius: 4, background: preset.secondary }} />
                            <div style={{ width: 20, height: 20, borderRadius: 4, background: preset.accent }} />
                          </div>
                          <div style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>{preset.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                      { key: 'primaryColor', label: 'Primary Color' },
                      { key: 'secondaryColor', label: 'Secondary Color' },
                      { key: 'accentColor', label: 'Accent Color' },
                      { key: 'backgroundColor', label: 'Background' },
                      { key: 'textColor', label: 'Text Color' },
                    ].map((colorField) => (
                      <div key={colorField.key}>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
                          {colorField.label}
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="color"
                            value={brandSettings[colorField.key]}
                            onChange={(e) => handleChange(colorField.key, e.target.value)}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 8,
                              border: '1px solid rgba(255,255,255,0.2)',
                              cursor: 'pointer',
                              padding: 2,
                            }}
                          />
                          <input
                            type="text"
                            value={brandSettings[colorField.key]}
                            onChange={(e) => handleChange(colorField.key, e.target.value)}
                            style={{
                              flex: 1,
                              padding: '10px 12px',
                              borderRadius: 8,
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#fff',
                              fontSize: 13,
                              fontFamily: 'monospace',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Typography Tab */}
              {activeTab === 'typography' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
                      Font Family
                    </label>
                    <select
                      value={brandSettings.fontFamily}
                      onChange={(e) => handleChange('fontFamily', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: 14,
                      }}
                    >
                      {fontOptions.map((font) => (
                        <option key={font.name} value={font.value} style={{ background: '#1a2d4a', fontFamily: font.value }}>
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
                      Border Radius (px)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={brandSettings.borderRadius}
                      onChange={(e) => handleChange('borderRadius', e.target.value)}
                      style={{ width: '100%', accentColor: brandSettings.primaryColor }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                      <span>Square (0px)</span>
                      <span>{brandSettings.borderRadius}px</span>
                      <span>Round (24px)</span>
                    </div>
                  </div>

                  {/* Typography Preview */}
                  <div style={{
                    padding: 20,
                    background: previewMode ? brandSettings.backgroundColor : 'rgba(255,255,255,0.03)',
                    borderRadius: parseInt(brandSettings.borderRadius),
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontFamily: brandSettings.fontFamily,
                  }}>
                    <h3 style={{ color: previewMode ? brandSettings.textColor : '#fff', margin: '0 0 8px' }}>Typography Preview</h3>
                    <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 12px', fontSize: 14 }}>
                      This is how your text will appear with the selected font family.
                    </p>
                    <button style={{
                      padding: '10px 20px',
                      borderRadius: parseInt(brandSettings.borderRadius) / 2,
                      background: brandSettings.primaryColor,
                      border: 'none',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}>
                      Sample Button
                    </button>
                  </div>
                </div>
              )}

              {/* Domain Tab */}
              {activeTab === 'domain' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{
                    padding: 16,
                    background: 'rgba(59,130,246,0.1)',
                    borderRadius: 8,
                    border: '1px solid rgba(59,130,246,0.2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span>ℹ️</span>
                      <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: 14 }}>Enterprise Feature</span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>
                      Custom domains require Enterprise plan. Contact sales for setup assistance.
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
                      Custom Domain
                    </label>
                    <input
                      type="text"
                      value={brandSettings.customDomain}
                      onChange={(e) => handleChange('customDomain', e.target.value)}
                      placeholder="reports.yourcompany.com"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: 14,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
                      Email Domain (for notifications)
                    </label>
                    <input
                      type="text"
                      value={brandSettings.emailDomain}
                      onChange={(e) => handleChange('emailDomain', e.target.value)}
                      placeholder="notifications@yourcompany.com"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: 14,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Advanced Tab */}
              {activeTab === 'advanced' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>
                      Custom CSS (Advanced)
                    </label>
                    <textarea
                      value={brandSettings.customCss}
                      onChange={(e) => handleChange('customCss', e.target.value)}
                      placeholder="/* Add custom CSS overrides here */"
                      rows={8}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: 13,
                        fontFamily: 'monospace',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div style={{
                    padding: 16,
                    background: 'rgba(239,68,68,0.05)',
                    borderRadius: 8,
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}>
                    <h4 style={{ color: '#ef4444', margin: '0 0 12px', fontSize: 14 }}>Reset All Settings</h4>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '0 0 12px' }}>
                      This will reset all branding settings to their defaults.
                    </p>
                    <button
                      onClick={handleReset}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 6,
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      Reset to Defaults
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
            }}>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!unsavedChanges}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  background: unsavedChanges 
                    ? `linear-gradient(135deg, ${brandSettings.primaryColor}, ${brandSettings.primaryColor}cc)` 
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: unsavedChanges ? '#fff' : 'rgba(255,255,255,0.4)',
                  cursor: unsavedChanges ? 'pointer' : 'not-allowed',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
