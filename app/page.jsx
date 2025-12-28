'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getUiTranslations } from '@/lib/i18nClient';
import { COLORS, TYPOGRAPHY, COMPONENTS, PAGE_STYLES, HEADER_STYLES, KEYFRAMES, TRANSITIONS, VERTICAL_GRADIENTS } from '@/lib/designSystem';

const BASE_UI = {
  // Header
  logoText: 'Sovereign Intelligence',
  navProducts: 'Products',
  navSolutions: 'Solutions',
  navVerticals: 'Industries',
  navPricing: 'Pricing',
  navResources: 'Resources',
  signIn: 'Sign In',
  getStarted: 'Get Started Free',
  
  // Hero
  badge: 'AI-POWERED ENTERPRISE PLATFORM',
  announcementNew: 'NEW',
  announcementText: '207 Language Support Now Available',
  title: 'Intelligence That Executes',
  subtitle: '10+ years ahead of any AI model. Sub-100ms MACH SPEED execution with zero drift, infinite memory, and flawless delivery. Self-replicates, orchestrates, and optimizes autonomously across 10 verticals, 207 languages.',
  ctaPrimary: 'Start Free Trial',
  ctaSecondary: 'Watch Demo',
  trustedBy: 'Trusted by industry leaders worldwide',
  
  // Stats
  stat1Value: '207',
  stat1Label: 'Languages',
  stat2Value: '10',
  stat2Label: 'Verticals',
  stat3Value: '0%',
  stat3Label: 'Drift',
  stat4Value: '∞',
  stat4Label: 'Memory',
  
  // Products Section
  productsTitle: 'One Platform, Unlimited Possibilities',
  productsSubtitle: 'Comprehensive AI solutions for every business need',
  
  product1Title: 'Command Center',
  product1Desc: 'Executive dashboard with AI predictions, real-time metrics, and system health monitoring.',
  product1Cta: 'Open Command Center',
  
  product2Title: 'Reports Hub',
  product2Desc: 'Generate comprehensive reports across all 10 industry verticals with one-click export.',
  product2Cta: 'View Reports',
  
  product3Title: 'Data Explorer',
  product3Desc: 'Advanced query builder with AI-assisted natural language queries and visualizations.',
  product3Cta: 'Explore Data',
  
  product4Title: 'Integration Marketplace',
  product4Desc: 'Connect with 50+ enterprise tools including Salesforce, SAP, Snowflake, and more.',
  product4Cta: 'Browse Integrations',
  
  product5Title: 'AI Business Partner',
  product5Desc: 'Your autonomous AI that handles project management, consulting, coaching, change management, and communications.',
  product5Cta: 'Meet Your AI Partner',
  
  // Industries Section
  industriesTitle: 'Built for Your Industry',
  industriesSubtitle: 'Pre-trained models and specialized workflows for every sector',
  
  industry1: 'Government',
  industry1Desc: 'Reform analysis & efficiency optimization',
  industry2: 'Defense',
  industry2Desc: 'Intelligence & threat assessment',
  industry3: 'Pharmaceutical',
  industry3Desc: 'Drug discovery & compliance',
  industry4: 'Financial Services',
  industry4Desc: 'Risk analytics & market intelligence',
  industry5: 'Healthcare',
  industry5Desc: 'Clinical decisions & outcomes',
  industry6: 'Manufacturing',
  industry6Desc: 'Supply chain & predictive maintenance',
  
  viewAllIndustries: 'View All Industries',
  
  // Features Section
  featuresTitle: 'What Makes Us Different',
  featuresSubtitle: 'Not a chatbot. Not a copilot. A full-stack AI business partner.',
  
  feature1Title: 'Zero Drift',
  feature1Desc: 'Immutable core identity. Never changes personality or gives inconsistent answers like ChatGPT or Claude.',
  
  feature2Title: 'Infinite Memory',
  feature2Desc: 'Remembers every interaction, project, and preference forever. No context windows. True organizational knowledge.',
  
  feature3Title: 'Flawless Execution',
  feature3Desc: 'Actually executes strategies with verification, audit trails, and rollback capability. Not just advice—results.',
  
  feature4Title: 'MACH SPEED Performance',
  feature4Desc: 'Sub-100ms response initiation, <1ms cached retrieval, 10k LRU cache, parallel processing, streaming responses, 40% token compression, 3x batch throughput. Performance impossible for others for 10+ years.',
  
  feature5Title: '207 Languages',
  feature5Desc: 'Full enterprise capability in every major language with RTL support. Not translation—native intelligence.',
  
  // Why We're Different Section
  whyDifferentBadge: '10+ YEARS AHEAD',
  whyDifferentTitle: 'Technology That Doesn\'t Exist Yet',
  whyDifferentSubtitle: 'Not incremental improvement. A fundamental leap that solves problems current AI cannot approach for the next decade.',
  
  // Differentiator Cards
  diff1Title: 'MACH SPEED Execution',
  diff1Desc: 'Sub-100ms response initiation with 10k LRU cache, parallel processing, streaming responses, 40% token compression, and 3x batch throughput. <1ms cached retrieval - impossibly fast.',
  diff1Badge1: '⚡ <100ms',
  diff1Badge2: '🚀 10k Cache',
  diff1Badge3: '💨 Parallel',
  
  diff2Title: 'Self-Replication Orchestration',
  diff2Desc: 'Creates autonomous AI copies that run entire projects proactively. Each assumes different roles (architect, developer, reviewer, tester) and executes without waiting for prompts.',
  diff2Badge1: '🤖 Autonomous',
  diff2Badge2: '⚡ Multi-Agent',
  diff2Badge3: '🎯 Proactive',
  
  diff3Title: 'Predictive Refactoring',
  diff3Desc: 'Restructures code BEFORE technical debt emerges. Anticipates system evolution 6-12 months ahead and refactors proactively to prevent future problems entirely.',
  diff3Badge1: '🔮 Anticipates',
  diff3Badge2: '🏗️ Prevents',
  diff3Badge3: '⚡ Zero Debt',
  
  diff4Title: 'Real-Time Optimization',
  diff4Desc: 'Continuously monitors and tunes performance during runtime. Auto-identifies bottlenecks, optimizes queries, adjusts resource allocation - all without human intervention.',
  diff4Badge1: '📊 Live Tuning',
  diff4Badge2: '⚡ Auto-Fix',
  diff4Badge3: '🎯 Zero Touch',
  
  diff5Title: 'Strategic Orchestration',
  diff5Desc: 'Manages entire product roadmaps end-to-end autonomously. Coordinates multi-team initiatives, balances priorities, allocates resources across complex organizational matrices.',
  diff5Badge1: '🎼 Roadmaps',
  diff5Badge2: '📋 Multi-Team',
  diff5Badge3: '🎯 Enterprise',
  
  diff6Title: 'Zero Drift + Infinite Memory',
  diff6Desc: 'Immutable core identity that never changes. Unlike ChatGPT or Claude that drift and forget, maintains consistent personality with unlimited organizational memory forever.',
  diff6Badge1: '∞ Memory',
  diff6Badge2: '🔒 Immutable',
  diff6Badge3: '📚 Self-Learning',
  
  // Comparison Banner
  comparisonTitle: '10+ Years Ahead of Any AI Model',
  comparisonDesc: 'ChatGPT/Claude chat and advise. Copilot suggests code. Sovereign executes strategies flawlessly, self-replicates for parallel orchestration, optimizes in real-time, and delivers enterprise transformation autonomously at MACH SPEED.',
  comparisonCta: 'Experience the Future Now',
  
  feature6Title: 'Full-Stack AI Partner',
  feature6Desc: 'Consulting + Coaching + Project Management + Change Management + Communications. One AI that replaces five consultants.',
  
  feature7Title: '10 Industry Verticals',
  feature7Desc: 'Pre-built domain expertise for Government, Defense, Pharma, Finance, Clinical, Manufacturing, Insurance, Logistics, Energy & Enterprise.',
  
  // Vertical Links - All 10
  verticalGov: 'Government',
  verticalDefense: 'Defense',
  verticalPharma: 'Pharma',
  verticalFinance: 'Finance',
  verticalClinical: 'Clinical',
  verticalMfg: 'Manufacturing',
  verticalInsurance: 'Insurance',
  verticalLogistics: 'Logistics',
  verticalEnergy: 'Energy',
  verticalEnterprise: 'Enterprise',
  
  // Social Proof
  testimonialTitle: 'Trusted by Leaders',
  testimonial1: '"Sovereign Intelligence transformed how we analyze government efficiency. The AI insights are unprecedented."',
  testimonial1Author: 'Director of Operations',
  testimonial1Company: 'Federal Agency',
  
  testimonial2: '"The pharmaceutical analysis capabilities have accelerated our drug discovery timeline by 40%."',
  testimonial2Author: 'Chief Scientific Officer',
  testimonial2Company: 'Global Pharma',
  
  // CTA Section
  ctaTitle: 'Ready to Transform Your Organization?',
  ctaSubtitle: 'Join thousands of enterprises using Sovereign Intelligence to make better decisions.',
  ctaButton: 'Start Your Free Trial',
  ctaNote: 'No credit card required • 14-day trial • Full feature access',
  
  // Footer
  footerTagline: 'The intelligent platform for the modern enterprise',
  footerProducts: 'Products',
  footerSolutions: 'Solutions',
  footerResources: 'Resources',
  footerCompany: 'Company',
  // Footer Links - Products
  linkAIPartner: 'AI Business Partner',
  linkCommandCenter: 'Command Center',
  linkReportsHub: 'Reports Hub',
  linkDataExplorer: 'Data Explorer',
  // Footer Links - Solutions
  linkGovernment: 'Government Reform',
  linkDefenseIntel: 'Defense Intel',
  linkPharmaceutical: 'Pharmaceutical',
  linkUniversalIndustry: 'Universal Industry',
  // Footer Links - Resources
  linkAPIDocs: 'API Documentation',
  linkPricing: 'Pricing',
  linkSupport: 'Support',
  linkStatusPage: 'Status',
  // Footer Links - Company
  linkAbout: 'About Us',
  linkCareers: 'Careers',
  linkContact: 'Contact',
  linkBlog: 'Blog',
  footerCopyright: '© 2025 Sovereign Intelligence. All rights reserved.',
  footerPrivacy: 'Privacy',
  footerTerms: 'Terms',
  footerSecurity: 'Security',
  footerStatus: 'Status',
};

const RTL_LANGUAGES = ['Arabic', 'Hebrew', 'Urdu', 'Persian', 'Pashto', 'Sindhi'];

export default function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lang = searchParams.get('lang') || 'English';
  const [ui, setUi] = useState(BASE_UI);
  const [loading, setLoading] = useState(true);
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [hoveredIndustry, setHoveredIndustry] = useState(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [hoveredStat, setHoveredStat] = useState(null);
  
  const isRTL = RTL_LANGUAGES.includes(lang);
  
  useEffect(() => {
    (async () => {
      const { t } = await getUiTranslations({
        base: BASE_UI,
        lang,
        cachePrefix: 'SI_HOME_PAGE',
        setDir: true,
      });
      setUi(t || BASE_UI);
      setLoading(false);
    })();
  }, [lang]);
  
  const products = [
    { icon: '🤖', title: ui.product5Title, desc: ui.product5Desc, cta: ui.product5Cta, href: '/universal-industry-plan/assistant', gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', featured: true },
    { icon: '🎛️', title: ui.product1Title, desc: ui.product1Desc, cta: ui.product1Cta, href: '/command-center', gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' },
    { icon: '📊', title: ui.product2Title, desc: ui.product2Desc, cta: ui.product2Cta, href: '/reports', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    { icon: '📈', title: ui.product3Title, desc: ui.product3Desc, cta: ui.product3Cta, href: '/data-explorer', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
    { icon: '🔌', title: ui.product4Title, desc: ui.product4Desc, cta: ui.product4Cta, href: '/marketplace', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' },
  ];
  
  const industries = [
    { name: ui.industry1, desc: ui.industry1Desc, icon: '🏛️', gradient: VERTICAL_GRADIENTS.reform, href: '/verticals/reform' },
    { name: ui.industry2, desc: ui.industry2Desc, icon: '🛡️', gradient: VERTICAL_GRADIENTS.defense, href: '/verticals/defense' },
    { name: ui.industry3, desc: ui.industry3Desc, icon: '🧬', gradient: VERTICAL_GRADIENTS.pharma, href: '/verticals/pharma' },
    { name: ui.industry4, desc: ui.industry4Desc, icon: '💎', gradient: VERTICAL_GRADIENTS.finance, href: '/verticals/finance' },
    { name: ui.industry5, desc: ui.industry5Desc, icon: '🩺', gradient: VERTICAL_GRADIENTS.clinical, href: '/verticals/clinical' },
    { name: ui.industry6, desc: ui.industry6Desc, icon: '🏭', gradient: VERTICAL_GRADIENTS.manufacturing, href: '/verticals/manufacturing' },
  ];
  
  const features = [
    { icon: '⚡', title: ui.feature3Title, desc: ui.feature3Desc },
    { icon: '🎯', title: ui.feature1Title, desc: ui.feature1Desc },
    { icon: '🧠', title: ui.feature2Title, desc: ui.feature2Desc },
    { icon: '🌍', title: ui.feature5Title, desc: ui.feature5Desc },
    { icon: '🤖', title: ui.feature6Title, desc: ui.feature6Desc },
    { icon: '🏢', title: ui.feature7Title, desc: ui.feature7Desc, hasVerticalLinks: true, verticals: [
      { name: ui.verticalGov, href: '/verticals/reform' },
      { name: ui.verticalDefense, href: '/verticals/defense' },
      { name: ui.verticalPharma, href: '/verticals/pharma' },
      { name: ui.verticalFinance, href: '/verticals/finance' },
      { name: ui.verticalClinical, href: '/verticals/clinical' },
      { name: ui.verticalMfg, href: '/verticals/manufacturing' },
      { name: ui.verticalInsurance, href: '/verticals/insurance' },
      { name: ui.verticalLogistics, href: '/verticals/logistics' },
      { name: ui.verticalEnergy, href: '/verticals/energy' },
      { name: ui.verticalEnterprise, href: '/universal-industry' },
    ]},
  ];
  
  const stats = [
    { value: ui.stat1Value, label: ui.stat1Label, icon: '🌐' },
    { value: ui.stat2Value, label: ui.stat2Label, icon: '💰' },
    { value: ui.stat3Value, label: ui.stat3Label, icon: '⚡' },
    { value: ui.stat4Value, label: ui.stat4Label, icon: '🚀' },
  ];
  
  return (
    <div style={{
      ...PAGE_STYLES.wrapper,
      background: 'linear-gradient(180deg, #030308 0%, #0a0f1a 20%, #0f172a 50%, #0a0f1a 80%, #030308 100%)',
      direction: isRTL ? 'rtl' : 'ltr',
      fontFamily: TYPOGRAPHY.fontFamily,
    }}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES + `
        .product-card:hover { transform: translateY(-8px) scale(1.02); }
        .industry-card:hover { transform: translateY(-6px); }
        .feature-card:hover { transform: translateY(-5px); }
        .stat-item:hover { transform: translateY(-3px); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5); }
        .nav-link:hover { color: #fff !important; }
        
        @keyframes hero-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        
        @keyframes shimmer-border {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes announcement-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.5); }
        }
        
        .hero-visual {
          animation: hero-float 6s ease-in-out infinite;
        }
      `}} />
      
      {/* Premium Background Effects */}
      <div style={{
        ...PAGE_STYLES.backgroundOrb1,
        width: '1000px',
        height: '1000px',
        top: '-400px',
        right: '-300px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 60%)',
        animation: 'hero-glow 10s ease-in-out infinite',
      }} />
      <div style={{
        ...PAGE_STYLES.backgroundOrb2,
        width: '800px',
        height: '800px',
        bottom: '20%',
        left: '-300px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 60%)',
        animation: 'hero-glow 12s ease-in-out infinite 3s',
      }} />
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 60%)',
        filter: 'blur(60px)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />
      <div style={PAGE_STYLES.gridPattern} />
      
      {/* Premium Header */}
      <header style={{
        ...HEADER_STYLES.container,
        background: 'rgba(3, 3, 8, 0.85)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={HEADER_STYLES.logo}>
          <img 
            src="/images/secure.png" 
            alt="Sovereign Intelligence" 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.5)',
            }}
          />
          <span style={HEADER_STYLES.logoText}>{ui.logoText}</span>
        </div>
        
        <nav style={HEADER_STYLES.nav}>
          <span className="nav-link" style={HEADER_STYLES.navLink} onClick={() => router.push(`/reports?lang=${lang}`)}>{ui.navProducts}</span>
          <span className="nav-link" style={HEADER_STYLES.navLink} onClick={() => router.push(`/universal-industry?lang=${lang}`)}>{ui.navSolutions}</span>
          <span className="nav-link" style={HEADER_STYLES.navLink} onClick={() => router.push(`/verticals/enterprise?lang=${lang}`)}>{ui.navVerticals}</span>
          <span className="nav-link" style={HEADER_STYLES.navLink} onClick={() => router.push(`/pricing?lang=${lang}`)}>{ui.navPricing}</span>
          <span className="nav-link" style={HEADER_STYLES.navLink} onClick={() => router.push(`/api-docs?lang=${lang}`)}>{ui.navResources}</span>
          <span className="nav-link" style={{ ...HEADER_STYLES.navLink, marginRight: '8px' }} onClick={() => router.push(`/auth?lang=${lang}`)}>{ui.signIn}</span>
          <button 
            onClick={() => router.push(`/onboarding?lang=${lang}`)}
            style={{
              ...COMPONENTS.buttonPrimary,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              padding: '10px 20px',
              fontSize: '14px',
              cursor: 'pointer',
            }}>
            {ui.getStarted}
          </button>
        </nav>
      </header>
      
      {/* Hero Section */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '100px 40px 80px',
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '80px',
        alignItems: 'center',
        minHeight: '80vh',
      }}>
        {/* Left Content */}
        <div style={{ maxWidth: '650px' }}>
          {/* Announcement Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 8px 8px 10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '100px',
            marginBottom: '32px',
            animation: 'fade-in 0.6s ease, announcement-glow 3s ease-in-out infinite',
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              padding: '4px 10px',
              borderRadius: '100px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.05em',
            }}>{ui.announcementNew}</span>
            <span style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.8)',
            }}>{ui.announcementText}</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>→</span>
          </div>
          
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '100px',
            marginBottom: '28px',
            animation: 'fade-in 0.6s ease 0.1s both',
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981',
            }} />
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#a5b4fc',
              letterSpacing: '0.08em',
            }}>{ui.badge}</span>
          </div>
          
          {/* Main Title */}
          <h1 style={{
            fontSize: 'clamp(42px, 5vw, 64px)',
            fontWeight: 800,
            color: '#fff',
            marginBottom: '24px',
            animation: 'fade-in 0.6s ease 0.2s both',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #fff 0%, #e0e7ff 50%, #a5b4fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>{ui.title}</span>
          </h1>
          
          {/* Subtitle */}
          <p style={{
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.65)',
            marginBottom: '40px',
            animation: 'fade-in 0.6s ease 0.3s both',
            lineHeight: 1.7,
          }}>
            {ui.subtitle}
          </p>
          
          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            animation: 'fade-in 0.6s ease 0.4s both',
            marginBottom: '48px',
          }}>
            <button 
              className="btn-primary" 
              onClick={() => router.push(`/onboarding?lang=${lang}`)}
              style={{
                ...COMPONENTS.buttonPrimary,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                padding: '16px 32px',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
              }}>
              <span>✨</span>
              {ui.ctaPrimary}
            </button>
            <button 
              onClick={() => window.open('https://www.youtube.com/watch?v=demo', '_blank')}
              style={{
                ...COMPONENTS.buttonSecondary,
                padding: '16px 32px',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
              }}>
              <span>▶️</span>
              {ui.ctaSecondary}
            </button>
          </div>
          
          {/* Mini Stats */}
          <div style={{
            display: 'flex',
            gap: '32px',
            animation: 'fade-in 0.6s ease 0.5s both',
          }}>
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="stat-item"
                onMouseEnter={() => setHoveredStat(idx)}
                onMouseLeave={() => setHoveredStat(null)}
                style={{
                  textAlign: 'center',
                  transition: TRANSITIONS.normal,
                  transform: hoveredStat === idx ? 'translateY(-3px)' : 'translateY(0)',
                  cursor: 'default',
                }}
              >
                <div style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '-0.02em',
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontWeight: 500,
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right Visual */}
        <div className="hero-visual" style={{
          position: 'relative',
          animation: 'fade-in 0.8s ease 0.3s both',
        }}>
          {/* Decorative Card Stack */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '500px',
          }}>
            {/* Back Card */}
            <div style={{
              position: 'absolute',
              top: '40px',
              left: '40px',
              right: '0',
              height: '380px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
              borderRadius: '24px',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }} />
            
            {/* Middle Card */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              right: '20px',
              height: '400px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)',
              borderRadius: '24px',
              border: '1px solid rgba(99, 102, 241, 0.25)',
            }} />
            
            {/* Main Card */}
            <div style={{
              ...COMPONENTS.glassCard,
              position: 'absolute',
              top: '0',
              left: '0',
              right: '40px',
              padding: '32px',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            }}>
              {/* Mini Dashboard Preview */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}>📊</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Report Analysis</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Generating insights...</div>
                  </div>
                </div>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#10b981',
                  animation: 'pulse-glow 2s ease infinite',
                }} />
              </div>
              
              {/* Fake Chart */}
              <div style={{
                height: '180px',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: '16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-end',
                padding: '20px',
                gap: '8px',
              }}>
                {[60, 80, 45, 90, 70, 85, 95].map((h, i) => (
                  <div key={i} style={{
                    flex: 1,
                    height: `${h}%`,
                    background: `linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)`,
                    borderRadius: '8px 8px 0 0',
                    opacity: 0.8,
                  }} />
                ))}
              </div>
              
              {/* Stats Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
              }}>
                {[
                  { label: 'Accuracy', value: '98.7%', color: '#10b981' },
                  { label: 'Processed', value: '1.2M', color: '#6366f1' },
                  { label: 'Saved', value: '$4.2B', color: '#f59e0b' },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Trusted By */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '40px 40px 80px',
        maxWidth: '1400px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '13px',
          color: 'rgba(255, 255, 255, 0.4)',
          marginBottom: '24px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>{ui.trustedBy}</p>
        <div style={{
          display: 'flex',
          gap: '48px',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          {['Fortune 500', 'Government', 'Healthcare', 'Finance', 'Defense', 'Pharma'].map((logo, idx) => (
            <span key={idx} style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.35)',
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '8px',
              transition: TRANSITIONS.normal,
            }}>{logo}</span>
          ))}
        </div>
      </section>

      {/* Key Differentiators Section */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '80px 40px',
        maxWidth: '1400px',
        margin: '0 auto',
        background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.03) 0%, transparent 100%)',
        borderRadius: '32px',
        border: '1px solid rgba(99, 102, 241, 0.1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '100px',
            marginBottom: '24px',
          }}>
            <span style={{ fontSize: '14px' }}>🏆</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{ui.whyDifferentBadge}</span>
          </div>
          <h2 style={{
            fontSize: '42px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '16px',
          }}>
            {ui.whyDifferentTitle}
          </h2>
          <p style={{
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.6)',
            maxWidth: '700px',
            margin: '0 auto',
          }}>
            {ui.whyDifferentSubtitle}
          </p>
        </div>

        {/* Differentiator Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '48px',
        }}>
          {/* Differentiator 1: Flawless Execution */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.02) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '20px',
            padding: '32px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '20px',
              boxShadow: '0 8px 30px rgba(99, 102, 241, 0.4)',
            }}>⚡</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{ui.diff1Title}</h3>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '20px' }}>
              {ui.diff1Desc}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 12px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#a5b4fc' }}>{ui.diff1Badge1}</span>
              <span style={{ padding: '6px 12px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#a5b4fc' }}>{ui.diff1Badge2}</span>
              <span style={{ padding: '6px 12px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#a5b4fc' }}>{ui.diff1Badge3}</span>
            </div>
          </div>

          {/* Differentiator 2: No Drift */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '20px',
            padding: '32px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '20px',
              boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)',
            }}>🎯</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{ui.diff2Title}</h3>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '20px' }}>
              {ui.diff2Desc}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 12px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#34d399' }}>{ui.diff2Badge1}</span>
              <span style={{ padding: '6px 12px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#34d399' }}>{ui.diff2Badge2}</span>
              <span style={{ padding: '6px 12px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#34d399' }}>{ui.diff2Badge3}</span>
            </div>
          </div>

          {/* Differentiator 3: Infinite Memory */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.02) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '20px',
            padding: '32px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '20px',
              boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)',
            }}>🧠</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{ui.diff3Title}</h3>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '20px' }}>
              {ui.diff3Desc}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 12px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#c4b5fd' }}>{ui.diff3Badge1}</span>
              <span style={{ padding: '6px 12px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#c4b5fd' }}>{ui.diff3Badge2}</span>
              <span style={{ padding: '6px 12px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#c4b5fd' }}>{ui.diff3Badge3}</span>
            </div>
          </div>

          {/* Differentiator 4: 207 Languages */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '20px',
            padding: '32px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '20px',
              boxShadow: '0 8px 30px rgba(245, 158, 11, 0.4)',
            }}>🌍</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{ui.diff4Title}</h3>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '20px' }}>
              {ui.diff4Desc}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 12px', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#fcd34d' }}>{ui.diff4Badge1}</span>
              <span style={{ padding: '6px 12px', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#fcd34d' }}>{ui.diff4Badge2}</span>
              <span style={{ padding: '6px 12px', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#fcd34d' }}>{ui.diff4Badge3}</span>
            </div>
          </div>

          {/* Differentiator 5: Full-Stack AI Partner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(236, 72, 153, 0.02) 100%)',
            border: '1px solid rgba(236, 72, 153, 0.2)',
            borderRadius: '20px',
            padding: '32px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '20px',
              boxShadow: '0 8px 30px rgba(236, 72, 153, 0.4)',
            }}>🤖</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{ui.diff5Title}</h3>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '20px' }}>
              {ui.diff5Desc}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 12px', background: 'rgba(236, 72, 153, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#f9a8d4' }}>{ui.diff5Badge1}</span>
              <span style={{ padding: '6px 12px', background: 'rgba(236, 72, 153, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#f9a8d4' }}>{ui.diff5Badge2}</span>
              <span style={{ padding: '6px 12px', background: 'rgba(236, 72, 153, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#f9a8d4' }}>{ui.diff5Badge3}</span>
            </div>
          </div>

          {/* Differentiator 6: 10 Verticals */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(6, 182, 212, 0.02) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: '20px',
            padding: '32px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '20px',
              boxShadow: '0 8px 30px rgba(6, 182, 212, 0.4)',
            }}>🏢</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{ui.diff6Title}</h3>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '20px' }}>
              {ui.diff6Desc}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ padding: '6px 12px', background: 'rgba(6, 182, 212, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#67e8f9' }}>{ui.diff6Badge1}</span>
              <span style={{ padding: '6px 12px', background: 'rgba(6, 182, 212, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#67e8f9' }}>{ui.diff6Badge2}</span>
              <span style={{ padding: '6px 12px', background: 'rgba(6, 182, 212, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#67e8f9' }}>{ui.diff6Badge3}</span>
            </div>
          </div>
        </div>

        {/* Comparison Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '16px',
          padding: '32px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
        }}>
          <div>
            <h4 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              {ui.comparisonTitle}
            </h4>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
              {ui.comparisonDesc}
            </p>
          </div>
          <button 
            onClick={() => router.push(`/universal-industry-plan/assistant?lang=${lang}`)}
            style={{
              ...COMPONENTS.buttonPrimary,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              padding: '14px 28px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
            <span>🤖</span>
            {ui.comparisonCta}
          </button>
        </div>
      </section>
      
      {/* Products Section */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '80px 40px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{
            fontSize: '42px',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '16px',
          }}>
            {ui.productsTitle}
          </h2>
          <p style={{
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.6)',
            maxWidth: '600px',
            margin: '0 auto',
          }}>
            {ui.productsSubtitle}
          </p>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          {products.map((product, idx) => (
            <div
              key={idx}
              className="product-card"
              onMouseEnter={() => setHoveredProduct(idx)}
              onMouseLeave={() => setHoveredProduct(null)}
              onClick={() => router.push(`${product.href}?lang=${lang}`)}
              style={{
                ...COMPONENTS.glassCard,
                padding: '36px',
                cursor: 'pointer',
                transition: TRANSITIONS.normal,
                transform: hoveredProduct === idx ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
                borderColor: hoveredProduct === idx ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: product.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                marginBottom: '24px',
                boxShadow: hoveredProduct === idx ? '0 8px 30px rgba(99, 102, 241, 0.3)' : '0 4px 15px rgba(0, 0, 0, 0.3)',
                transition: TRANSITIONS.normal,
              }}>
                {product.icon}
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#fff',
                marginBottom: '12px',
              }}>
                {product.title}
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '24px',
                lineHeight: 1.6,
              }}>
                {product.desc}
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#6366f1',
                fontSize: '14px',
                fontWeight: 600,
              }}>
                {product.cta}
                <span style={{
                  transition: TRANSITIONS.normal,
                  transform: hoveredProduct === idx ? 'translateX(4px)' : 'translateX(0)',
                }}>→</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* Industries Section */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '80px 40px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '42px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>{ui.industriesTitle}</h2>
          <p style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.6)', maxWidth: '600px', margin: '0 auto' }}>{ui.industriesSubtitle}</p>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}>
          {industries.map((industry, idx) => (
            <div
              key={idx}
              className="industry-card"
              onMouseEnter={() => setHoveredIndustry(idx)}
              onMouseLeave={() => setHoveredIndustry(null)}
              onClick={() => router.push(`${industry.href}?lang=${lang}`)}
              style={{
                ...COMPONENTS.glassCard,
                padding: '28px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: TRANSITIONS.normal,
                transform: hoveredIndustry === idx ? 'translateY(-6px)' : 'translateY(0)',
                borderColor: hoveredIndustry === idx ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: industry.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                margin: '0 auto 16px',
                boxShadow: hoveredIndustry === idx ? '0 8px 25px rgba(99, 102, 241, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.3)',
                transition: TRANSITIONS.normal,
              }}>
                {industry.icon}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>{industry.name}</h3>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>{industry.desc}</p>
            </div>
          ))}
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={() => router.push(`/verticals/enterprise?lang=${lang}`)}
            style={{
              ...COMPONENTS.buttonSecondary,
              padding: '14px 28px',
              fontSize: '14px',
            }}
          >
            {ui.viewAllIndustries} →
          </button>
        </div>
      </section>
      
      {/* Features Section */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '80px 40px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '42px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>{ui.featuresTitle}</h2>
          <p style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.6)', maxWidth: '600px', margin: '0 auto' }}>{ui.featuresSubtitle}</p>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="feature-card"
              onMouseEnter={() => setHoveredFeature(idx)}
              onMouseLeave={() => setHoveredFeature(null)}
              style={{
                ...COMPONENTS.glassCard,
                padding: '32px',
                transition: TRANSITIONS.normal,
                transform: hoveredFeature === idx ? 'translateY(-5px)' : 'translateY(0)',
              }}
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '20px',
              }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>{feature.title}</h3>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', margin: 0, lineHeight: 1.6 }}>{feature.desc}</p>
              {feature.hasVerticalLinks && feature.verticals && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                  {feature.verticals.map((vertical, vidx) => (
                    <span 
                      key={vidx}
                      onClick={() => router.push(`${vertical.href}?lang=${lang}`)}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#a5b4fc',
                        cursor: 'pointer',
                        transition: TRANSITIONS.normal,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.4)';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                        e.currentTarget.style.color = '#a5b4fc';
                      }}
                    >
                      {vertical.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      
      {/* Bottom CTA Section */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '80px 40px 120px',
        maxWidth: '1000px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div style={{
          ...COMPONENTS.glassCard,
          padding: '80px 64px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '500px',
            height: '200px',
            background: 'radial-gradient(ellipse, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
            filter: 'blur(50px)',
            pointerEvents: 'none',
          }} />
          
          <h2 style={{
            fontSize: '40px',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '16px',
            position: 'relative',
          }}>
            {ui.ctaTitle}
          </h2>
          <p style={{
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.7)',
            maxWidth: '600px',
            margin: '0 auto 40px',
            position: 'relative',
          }}>
            {ui.ctaSubtitle}
          </p>
          <button 
            className="btn-primary" 
            onClick={() => router.push(`/onboarding?lang=${lang}`)}
            style={{
              ...COMPONENTS.buttonPrimary,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              fontSize: '17px',
              padding: '20px 48px',
              position: 'relative',
              cursor: 'pointer',
            }}>
            {ui.ctaButton}
          </button>
          <p style={{
            marginTop: '20px',
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.5)',
            position: 'relative',
          }}>
            {ui.ctaNote}
          </p>
        </div>
      </section>
      
      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        padding: '60px 40px 40px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr repeat(4, 1fr)',
          gap: '40px',
          marginBottom: '60px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <img 
                src="/images/secure.png" 
                alt="Sovereign Intelligence" 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                }}
              />
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{ui.logoText}</span>
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.6, maxWidth: '280px' }}>{ui.footerTagline}</p>
          </div>
          
          {[ui.footerProducts, ui.footerSolutions, ui.footerResources, ui.footerCompany].map((section, idx) => {
            const footerLinks = [
              // Products
              [
                { label: ui.linkAIPartner, href: '/universal-industry-plan/assistant' },
                { label: ui.linkCommandCenter, href: '/command-center' },
                { label: ui.linkReportsHub, href: '/reports' },
                { label: ui.linkDataExplorer, href: '/data-explorer' },
              ],
              // Solutions
              [
                { label: ui.linkGovernment, href: '/verticals/reform' },
                { label: ui.linkDefenseIntel, href: '/verticals/defense' },
                { label: ui.linkPharmaceutical, href: '/verticals/pharma' },
                { label: ui.linkUniversalIndustry, href: '/universal-industry' },
              ],
              // Resources
              [
                { label: ui.linkAPIDocs, href: '/api-docs' },
                { label: ui.linkPricing, href: '/pricing' },
                { label: ui.linkSupport, href: '/support' },
                { label: ui.linkStatusPage, href: '/status' },
              ],
              // Company
              [
                { label: ui.linkAbout, href: '/about' },
                { label: ui.linkCareers, href: '/careers' },
                { label: ui.linkContact, href: '/contact' },
                { label: ui.linkBlog, href: '/blog' },
              ],
            ];
            return (
              <div key={idx}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>{section}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {footerLinks[idx].map((link, lidx) => (
                    <span 
                      key={lidx} 
                      className="nav-link" 
                      onClick={() => router.push(`${link.href}?lang=${lang}`)}
                      style={{ ...HEADER_STYLES.navLink, fontSize: '13px', cursor: 'pointer' }}
                    >
                      {link.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          paddingTop: '32px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)' }}>{ui.footerCopyright}</span>
          <div style={{ display: 'flex', gap: '24px' }}>
            <span className="nav-link" onClick={() => router.push(`/privacy?lang=${lang}`)} style={{ ...HEADER_STYLES.navLink, fontSize: '13px', cursor: 'pointer' }}>{ui.footerPrivacy}</span>
            <span className="nav-link" onClick={() => router.push(`/terms?lang=${lang}`)} style={{ ...HEADER_STYLES.navLink, fontSize: '13px', cursor: 'pointer' }}>{ui.footerTerms}</span>
            <span className="nav-link" onClick={() => router.push(`/security?lang=${lang}`)} style={{ ...HEADER_STYLES.navLink, fontSize: '13px', cursor: 'pointer' }}>{ui.footerSecurity}</span>
            <span className="nav-link" onClick={() => router.push(`/status?lang=${lang}`)} style={{ ...HEADER_STYLES.navLink, fontSize: '13px', cursor: 'pointer' }}>{ui.footerStatus}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
