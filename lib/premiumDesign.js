// ═══════════════════════════════════════════════════════════════════════════════════════
// SOVEREIGN INTELLIGENCE - PREMIUM DESIGN SYSTEM
// Enterprise-grade visual components for maximum commercial appeal
// Revenue-optimized UI patterns with 207-language support
// ═══════════════════════════════════════════════════════════════════════════════════════

export const PREMIUM_COLORS = {
  // Core gradients
  background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0d0d2a 100%)',
  headerGradient: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.15) 100%)',
  cardGradient: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
  
  // Primary actions
  primary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  secondary: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
  success: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
  warning: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
  danger: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
  premium: 'linear-gradient(135deg, #f472b6 0%, #c084fc 100%)',
  
  // Text colors
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',
  textDisabled: 'rgba(255,255,255,0.3)',
  
  // Borders
  borderLight: 'rgba(255,255,255,0.08)',
  borderMedium: 'rgba(255,255,255,0.15)',
  borderAccent: 'rgba(99,102,241,0.3)',
  
  // Glass effect
  glass: 'rgba(255,255,255,0.03)',
  glassBorder: '1px solid rgba(255,255,255,0.08)',
};

export const PREMIUM_STYLES = {
  // Page wrapper
  page: {
    minHeight: '100vh',
    background: PREMIUM_COLORS.background,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: PREMIUM_COLORS.textPrimary,
  },
  
  // Container
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '32px',
  },
  
  // Premium header with gradient
  header: {
    marginBottom: '32px',
    padding: '40px',
    background: PREMIUM_COLORS.headerGradient,
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  
  // Animated background orbs
  headerOrb: (position) => ({
    position: 'absolute',
    width: position.size || '200px',
    height: position.size || '200px',
    borderRadius: '50%',
    background: position.color,
    filter: 'blur(100px)',
    opacity: 0.3,
    top: position.top,
    left: position.left,
    right: position.right,
    animation: 'float 20s ease-in-out infinite',
  }),
  
  // Title with gradient
  title: {
    fontSize: '36px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '12px',
  },
  
  subtitle: {
    color: PREMIUM_COLORS.textSecondary,
    fontSize: '18px',
    lineHeight: '1.6',
  },
  
  // Glass cards
  card: {
    background: PREMIUM_COLORS.glass,
    border: PREMIUM_COLORS.glassBorder,
    borderRadius: '16px',
    padding: '24px',
    backdropFilter: 'blur(20px)',
    transition: 'all 0.3s ease',
  },
  
  cardHover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    borderColor: 'rgba(99,102,241,0.3)',
  },
  
  // Stats grid
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  
  statCard: {
    background: PREMIUM_COLORS.glass,
    border: PREMIUM_COLORS.glassBorder,
    borderRadius: '16px',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    marginBottom: '16px',
  },
  
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '4px',
  },
  
  statLabel: {
    color: PREMIUM_COLORS.textMuted,
    fontSize: '14px',
  },
  
  statTrend: (positive) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    background: positive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
    color: positive ? '#10b981' : '#ef4444',
  }),
  
  // Buttons
  btnPrimary: {
    padding: '14px 28px',
    background: PREMIUM_COLORS.primary,
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
  },
  
  btnSecondary: {
    padding: '14px 28px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.2s ease',
  },
  
  btnPremium: {
    padding: '14px 28px',
    background: PREMIUM_COLORS.premium,
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 4px 20px rgba(244,114,182,0.4)',
  },
  
  // Form inputs
  input: {
    width: '100%',
    padding: '14px 18px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '15px',
    transition: 'all 0.2s ease',
  },
  
  inputFocus: {
    borderColor: '#6366f1',
    outline: 'none',
    boxShadow: '0 0 0 3px rgba(99,102,241,0.2)',
  },
  
  label: {
    display: 'block',
    color: PREMIUM_COLORS.textSecondary,
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
  },
  
  // Tables
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0 8px',
  },
  
  th: {
    padding: '14px 16px',
    color: PREMIUM_COLORS.textMuted,
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  
  td: {
    padding: '16px',
    color: PREMIUM_COLORS.textSecondary,
    fontSize: '14px',
    background: 'rgba(0,0,0,0.2)',
  },
  
  // Badges
  badge: (variant) => {
    const variants = {
      success: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
      warning: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
      danger: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
      info: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
      purple: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
    };
    const v = variants[variant] || variants.info;
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      background: v.bg,
      color: v.color,
    };
  },
  
  // Tabs
  tabs: {
    display: 'flex',
    gap: '4px',
    padding: '6px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '14px',
    marginBottom: '24px',
  },
  
  tab: (active) => ({
    padding: '12px 24px',
    borderRadius: '10px',
    border: 'none',
    background: active ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
    color: active ? '#fff' : 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  }),
  
  // Modal
  modal: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  
  modalContent: {
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0d0d2a 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    padding: '32px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  
  // Empty state
  emptyState: {
    textAlign: 'center',
    padding: '64px 32px',
    color: PREMIUM_COLORS.textMuted,
  },
  
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  
  // Loading spinner
  spinner: {
    width: '48px',
    height: '48px',
    border: '3px solid rgba(99,102,241,0.2)',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  
  // Revenue-focused upgrade banner
  upgradeBanner: {
    background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(244,114,182,0.15) 100%)',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  
  // Feature grid for upsell
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  
  featureCard: {
    background: PREMIUM_COLORS.glass,
    border: PREMIUM_COLORS.glassBorder,
    borderRadius: '16px',
    padding: '28px',
    transition: 'all 0.3s ease',
  },
  
  featureIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    marginBottom: '20px',
  },
  
  featureTitle: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  
  featureDesc: {
    color: PREMIUM_COLORS.textMuted,
    fontSize: '14px',
    lineHeight: '1.6',
  },
};

// RTL Support
export const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian', 'Pashto', 'Sindhi', 'Dari', 'Yiddish'];

// Animation keyframes CSS string
export const PREMIUM_ANIMATIONS = `
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3); }
  50% { box-shadow: 0 0 40px rgba(99,102,241,0.5); }
}
`;

// Premium page template generator
export const createPremiumPage = (config) => {
  const { isRTL, title, subtitle, stats, features } = config;
  
  return {
    pageStyle: {
      ...PREMIUM_STYLES.page,
      direction: isRTL ? 'rtl' : 'ltr',
    },
    headerStyle: PREMIUM_STYLES.header,
    titleStyle: PREMIUM_STYLES.title,
    subtitleStyle: PREMIUM_STYLES.subtitle,
    containerStyle: PREMIUM_STYLES.container,
    cardStyle: PREMIUM_STYLES.card,
    statsGridStyle: PREMIUM_STYLES.statsGrid,
    statCardStyle: PREMIUM_STYLES.statCard,
    btnPrimaryStyle: PREMIUM_STYLES.btnPrimary,
    btnSecondaryStyle: PREMIUM_STYLES.btnSecondary,
    inputStyle: PREMIUM_STYLES.input,
    labelStyle: PREMIUM_STYLES.label,
    tableStyle: PREMIUM_STYLES.table,
    thStyle: { ...PREMIUM_STYLES.th, textAlign: isRTL ? 'right' : 'left' },
    tdStyle: PREMIUM_STYLES.td,
  };
};

// High-value feature flags (for premium tier gating)
export const PREMIUM_FEATURES = {
  STARTER: ['basic_reports', 'manual_export', 'email_support'],
  PROFESSIONAL: ['advanced_analytics', 'api_access', 'team_workspace', 'scheduled_reports', 'priority_support'],
  ENTERPRISE: ['unlimited_everything', 'sso_saml', 'custom_integrations', 'dedicated_support', 'sla_guarantee', 'white_label', 'on_premise'],
};

// Revenue optimization helpers
export const getUpgradeMessage = (currentPlan, feature) => {
  const upgrades = {
    api_access: { plan: 'Professional', price: '$1,999/mo', cta: 'Unlock API Access' },
    sso_saml: { plan: 'Enterprise', price: 'Custom', cta: 'Enable SSO' },
    white_label: { plan: 'Enterprise', price: 'Custom', cta: 'Remove Branding' },
    unlimited_everything: { plan: 'Enterprise', price: 'Custom', cta: 'Go Unlimited' },
  };
  return upgrades[feature] || { plan: 'Enterprise', price: 'Custom', cta: 'Upgrade Now' };
};

export default PREMIUM_STYLES;
