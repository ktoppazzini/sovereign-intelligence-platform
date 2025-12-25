/**
 * Sovereign Intelligence Premium Design System
 * Ultra-professional, enterprise-grade UI components
 * Created: December 24, 2025
 */

// Premium Color Palette
export const COLORS = {
  // Primary gradient backgrounds
  bgPrimary: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
  bgSecondary: 'linear-gradient(180deg, #0c1222 0%, #162032 100%)',
  bgCard: 'rgba(255, 255, 255, 0.02)',
  bgCardHover: 'rgba(255, 255, 255, 0.04)',
  bgGlass: 'rgba(255, 255, 255, 0.03)',
  
  // Premium accent colors
  primary: '#6366f1',      // Indigo
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  
  secondary: '#8b5cf6',    // Purple
  secondaryLight: '#a78bfa',
  secondaryDark: '#7c3aed',
  
  accent: '#06b6d4',       // Cyan
  accentLight: '#22d3ee',
  accentDark: '#0891b2',
  
  success: '#10b981',
  successLight: '#34d399',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  error: '#ef4444',
  errorLight: '#f87171',
  
  // Text colors
  textPrimary: '#f8fafc',
  textSecondary: 'rgba(248, 250, 252, 0.7)',
  textMuted: 'rgba(248, 250, 252, 0.5)',
  textDisabled: 'rgba(248, 250, 252, 0.3)',
  
  // Border colors
  border: 'rgba(255, 255, 255, 0.06)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  borderFocus: 'rgba(99, 102, 241, 0.5)',
  
  // Glow effects
  glowPrimary: '0 0 40px rgba(99, 102, 241, 0.15)',
  glowSecondary: '0 0 40px rgba(139, 92, 246, 0.15)',
  glowAccent: '0 0 40px rgba(6, 182, 212, 0.15)',
};

// Typography
export const TYPOGRAPHY = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
  
  h1: { fontSize: '48px', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' },
  h2: { fontSize: '36px', fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em' },
  h3: { fontSize: '24px', fontWeight: 600, lineHeight: 1.3 },
  h4: { fontSize: '18px', fontWeight: 600, lineHeight: 1.4 },
  body: { fontSize: '15px', fontWeight: 400, lineHeight: 1.6 },
  bodySmall: { fontSize: '13px', fontWeight: 400, lineHeight: 1.5 },
  caption: { fontSize: '11px', fontWeight: 500, lineHeight: 1.4, letterSpacing: '0.05em' },
};

// Shadows
export const SHADOWS = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  glow: '0 0 60px rgba(99, 102, 241, 0.2)',
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
};

// Spacing
export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
  xxxl: '64px',
};

// Border Radius
export const RADIUS = {
  sm: '6px',
  md: '10px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
};

// Transitions
export const TRANSITIONS = {
  fast: 'all 0.15s ease',
  normal: 'all 0.25s ease',
  slow: 'all 0.4s ease',
  bounce: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// Component Styles
export const COMPONENTS = {
  // Premium Card
  card: {
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '20px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  
  // Glass Card
  glassCard: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
    backdropFilter: 'blur(40px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  
  // Premium Button
  buttonPrimary: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 28px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
    transition: 'all 0.25s ease',
  },
  
  buttonSecondary: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '14px 28px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.25s ease',
  },
  
  // Premium Input
  input: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '14px 18px',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.25s ease',
  },
  
  // Stat Card
  statCard: {
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: '20px',
    padding: '28px',
    position: 'relative',
    overflow: 'hidden',
  },
  
  // Badge
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '100px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  
  // Table
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0 8px',
  },
  
  tableHeader: {
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '16px 24px',
    textAlign: 'left',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  
  tableRow: {
    background: 'rgba(255, 255, 255, 0.02)',
    transition: 'all 0.2s ease',
  },
  
  tableCell: {
    padding: '20px 24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
};

// Gradient presets for verticals
export const VERTICAL_GRADIENTS = {
  reform: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  defense: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
  pharma: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  finance: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  clinical: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  manufacturing: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  energy: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  insurance: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  logistics: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  financialServices: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
};

// Icon backgrounds with glow
export const ICON_STYLES = {
  reform: { bg: 'rgba(59, 130, 246, 0.15)', glow: '0 0 30px rgba(59, 130, 246, 0.3)' },
  defense: { bg: 'rgba(220, 38, 38, 0.15)', glow: '0 0 30px rgba(220, 38, 38, 0.3)' },
  pharma: { bg: 'rgba(16, 185, 129, 0.15)', glow: '0 0 30px rgba(16, 185, 129, 0.3)' },
  finance: { bg: 'rgba(139, 92, 246, 0.15)', glow: '0 0 30px rgba(139, 92, 246, 0.3)' },
  clinical: { bg: 'rgba(6, 182, 212, 0.15)', glow: '0 0 30px rgba(6, 182, 212, 0.3)' },
};

// Animation keyframes (as CSS string)
export const KEYFRAMES = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.2); }
    50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.4); }
  }
  
  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;

// Premium page wrapper styles
export const PAGE_STYLES = {
  wrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0c1222 0%, #0f172a 50%, #0c1222 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  
  // Animated background orbs
  backgroundOrb1: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
    filter: 'blur(60px)',
    top: '-200px',
    right: '-200px',
    pointerEvents: 'none',
  },
  
  backgroundOrb2: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)',
    filter: 'blur(60px)',
    bottom: '-150px',
    left: '-150px',
    pointerEvents: 'none',
  },
  
  backgroundOrb3: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)',
    filter: 'blur(50px)',
    top: '40%',
    left: '30%',
    pointerEvents: 'none',
  },
  
  // Grid pattern overlay
  gridPattern: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
    `,
    backgroundSize: '50px 50px',
    pointerEvents: 'none',
  },
  
  // Content wrapper
  content: {
    position: 'relative',
    zIndex: 1,
    padding: '40px',
    maxWidth: '1600px',
    margin: '0 auto',
  },
};

// Premium Header Component Style
export const HEADER_STYLES = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 40px',
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  logoIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
  },
  
  logoText: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.01em',
  },
  
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  
  navLink: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '14px',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    cursor: 'pointer',
  },
  
  navLinkActive: {
    color: '#fff',
  },
};

export default {
  COLORS,
  TYPOGRAPHY,
  SHADOWS,
  SPACING,
  RADIUS,
  TRANSITIONS,
  COMPONENTS,
  VERTICAL_GRADIENTS,
  ICON_STYLES,
  KEYFRAMES,
  PAGE_STYLES,
  HEADER_STYLES,
};
