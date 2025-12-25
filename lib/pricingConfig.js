/**
 * Sovereign Intelligence - Pricing & Revenue Projections
 * 
 * Platform Capabilities:
 * - 10 Industry Verticals (Government Reform, Defense, Pharma, Finance, Manufacturing, Energy, Insurance, Logistics, Clinical, Financial Services)
 * - 207 Languages with real-time translation
 * - Enterprise Features: Team Collaboration, API Access, White-Label, Real-Time Dashboards
 * - Self-Learning AI that improves with every interaction
 * 
 * Target Markets:
 * - B2B: Fortune 500, Mid-Market enterprises
 * - B2G: Federal agencies, State/Local governments, International governments
 * - B2B2B: Consulting firms, System integrators
 */

// ============================================================================
// PRICING TIERS
// ============================================================================

export const PRICING_TIERS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small teams getting started with AI-powered intelligence',
    monthlyPrice: 499,
    annualPrice: 4990, // 2 months free
    features: [
      '5 Users included',
      '3 Industry Verticals',
      '50 Languages',
      '100 Reports/month',
      'Email support',
      'Basic analytics dashboard',
      'PDF & HTML exports',
      'Standard templates'
    ],
    limits: {
      users: 5,
      verticals: 3,
      languages: 50,
      reportsPerMonth: 100,
      apiCalls: 0,
      storage: '10 GB'
    }
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'For growing organizations requiring advanced intelligence capabilities',
    monthlyPrice: 1999,
    annualPrice: 19990, // 2 months free
    popular: true,
    features: [
      '25 Users included',
      'All 10 Industry Verticals',
      '207 Languages',
      'Unlimited Reports',
      'Priority support (24/7)',
      'Advanced analytics & KPIs',
      'Team collaboration workspace',
      'Scheduled reports',
      'Custom templates',
      'API Access (10K calls/month)',
      'Webhook integrations'
    ],
    limits: {
      users: 25,
      verticals: 10,
      languages: 207,
      reportsPerMonth: -1, // unlimited
      apiCalls: 10000,
      storage: '100 GB'
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Full platform access with white-label and unlimited scale',
    monthlyPrice: 9999,
    annualPrice: 99990, // 2 months free
    features: [
      'Unlimited Users',
      'All 10 Industry Verticals',
      '207 Languages',
      'Unlimited Reports',
      'Dedicated success manager',
      'Real-time intelligence dashboards',
      'White-label branding',
      'Custom domain',
      'SSO/SAML integration',
      'Unlimited API Access',
      'On-premise deployment option',
      'Custom AI model training',
      'SLA guarantee (99.9% uptime)',
      'Compliance packages (HIPAA, SOC2, FedRAMP)'
    ],
    limits: {
      users: -1, // unlimited
      verticals: 10,
      languages: 207,
      reportsPerMonth: -1,
      apiCalls: -1,
      storage: 'Unlimited'
    }
  },
  government: {
    id: 'government',
    name: 'Government',
    description: 'FedRAMP authorized solution for federal, state, and local agencies',
    monthlyPrice: null, // Custom pricing
    annualPrice: null,
    contactSales: true,
    features: [
      'Everything in Enterprise',
      'FedRAMP High authorization',
      'IL4/IL5 deployment options',
      'Air-gapped deployment',
      'Dedicated government cloud',
      'Clearance-level support staff',
      'Compliance documentation',
      'Audit trail & logging',
      'Multi-agency licensing',
      'Training & certification programs'
    ],
    limits: {
      users: -1,
      verticals: 10,
      languages: 207,
      reportsPerMonth: -1,
      apiCalls: -1,
      storage: 'Unlimited'
    }
  }
};

// ============================================================================
// REVENUE PROJECTIONS (Conservative Estimates)
// ============================================================================

export const REVENUE_PROJECTIONS = {
  assumptions: {
    marketSize: {
      tam: 150_000_000_000, // $150B - Global AI/BI market
      sam: 25_000_000_000,  // $25B - Enterprise intelligence platforms
      som: 500_000_000      // $500M - Realistic serviceable market Year 3
    },
    competitiveAdvantage: [
      '207 languages (competitors max ~40)',
      'Self-learning AI (no model drift)',
      '10 specialized verticals',
      'Real-time collaboration',
      'White-label capability'
    ],
    conversionRates: {
      trialToStarter: 0.15,      // 15% of trials convert to Starter
      trialToProfessional: 0.08, // 8% convert directly to Professional
      starterToProfessional: 0.25, // 25% upgrade within 12 months
      professionalToEnterprise: 0.15, // 15% upgrade within 12 months
      annualChurn: 0.08           // 8% annual churn (low for enterprise)
    }
  },

  // -------------------------------------------------------------------------
  // YEAR 1: Foundation & Early Adopters
  // -------------------------------------------------------------------------
  year1: {
    label: 'Year 1 - Foundation',
    description: 'Product-market fit, early adopter acquisition, government pilots',
    
    customers: {
      starter: 150,
      professional: 45,
      enterprise: 8,
      government: 2, // Pilot contracts
      total: 205
    },
    
    revenue: {
      starterMRR: 150 * 499,           // $74,850
      professionalMRR: 45 * 1999,      // $89,955
      enterpriseMRR: 8 * 9999,         // $79,992
      governmentARR: 2 * 500_000,      // $1M (avg contract)
      
      totalMRR: 244_797,
      totalARR: 3_937_564,
      
      breakdown: {
        starterARR: 150 * 4990,         // $748,500
        professionalARR: 45 * 19990,    // $899,550
        enterpriseARR: 8 * 99990,       // $799,920
        governmentARR: 1_000_000,       // $1,000,000
        servicesRevenue: 489_594        // Implementation, training
      }
    },
    
    metrics: {
      averageContractValue: 19_207,
      customerAcquisitionCost: 8_500,
      lifetimeValue: 115_000,
      ltcCacRatio: 13.5,
      netRevenueRetention: 1.15 // 115%
    },
    
    milestones: [
      'Launch all 10 verticals',
      '207 language support live',
      'First government contract',
      'SOC2 Type II certification',
      '1,000+ reports generated'
    ]
  },

  // -------------------------------------------------------------------------
  // YEAR 2: Growth & Expansion
  // -------------------------------------------------------------------------
  year2: {
    label: 'Year 2 - Growth',
    description: 'Market expansion, partner channel development, international growth',
    
    customers: {
      starter: 450,
      professional: 180,
      enterprise: 35,
      government: 12,
      total: 677
    },
    
    revenue: {
      starterMRR: 450 * 499,           // $224,550
      professionalMRR: 180 * 1999,     // $359,820
      enterpriseMRR: 35 * 9999,        // $349,965
      governmentARR: 12 * 750_000,     // $9M (contracts growing)
      
      totalMRR: 934_335,
      totalARR: 20_212_020,
      
      breakdown: {
        starterARR: 450 * 4990,          // $2,245,500
        professionalARR: 180 * 19990,    // $3,598,200
        enterpriseARR: 35 * 99990,       // $3,499,650
        governmentARR: 9_000_000,        // $9,000,000
        servicesRevenue: 1_868_670       // Growing services
      }
    },
    
    metrics: {
      averageContractValue: 29_856,
      customerAcquisitionCost: 7_200, // Improving efficiency
      lifetimeValue: 145_000,
      ltcCacRatio: 20.1,
      netRevenueRetention: 1.22, // 122%
      yoyGrowth: 4.13 // 413% YoY growth
    },
    
    milestones: [
      'FedRAMP authorization',
      'HIPAA compliance certified',
      'Partner ecosystem (50+ integrators)',
      'International expansion (EU, APAC)',
      '25,000+ reports generated monthly'
    ]
  },

  // -------------------------------------------------------------------------
  // YEAR 3: Scale & Market Leadership
  // -------------------------------------------------------------------------
  year3: {
    label: 'Year 3 - Scale',
    description: 'Market leadership, platform ecosystem, global enterprise adoption',
    
    customers: {
      starter: 1200,
      professional: 550,
      enterprise: 120,
      government: 45,
      total: 1915
    },
    
    revenue: {
      starterMRR: 1200 * 499,          // $598,800
      professionalMRR: 550 * 1999,     // $1,099,450
      enterpriseMRR: 120 * 9999,       // $1,199,880
      governmentARR: 45 * 1_000_000,   // $45M (larger contracts)
      
      totalMRR: 2_898_130,
      totalARR: 79_777_560,
      
      breakdown: {
        starterARR: 1200 * 4990,         // $5,988,000
        professionalARR: 550 * 19990,    // $10,994,500
        enterpriseARR: 120 * 99990,      // $11,998,800
        governmentARR: 45_000_000,       // $45,000,000
        servicesRevenue: 5_796_260       // Enterprise services
      }
    },
    
    metrics: {
      averageContractValue: 41_657,
      customerAcquisitionCost: 6_000,
      lifetimeValue: 195_000,
      ltcCacRatio: 32.5,
      netRevenueRetention: 1.28, // 128%
      yoyGrowth: 2.95 // 295% YoY growth
    },
    
    milestones: [
      'IPO readiness',
      '$100M ARR run rate',
      'Global presence (40+ countries)',
      'AI marketplace launch',
      '100,000+ reports generated monthly',
      'Industry analyst recognition (Gartner, Forrester)'
    ]
  }
};

// ============================================================================
// REVENUE SUMMARY
// ============================================================================

export const REVENUE_SUMMARY = {
  year1: {
    arr: 3_937_564,
    formatted: '$3.94M',
    customers: 205,
    highlight: 'Product-Market Fit'
  },
  year2: {
    arr: 20_212_020,
    formatted: '$20.2M',
    customers: 677,
    highlight: '5x Growth'
  },
  year3: {
    arr: 79_777_560,
    formatted: '$79.8M',
    customers: 1915,
    highlight: 'Market Leadership'
  },
  threeYearTotal: {
    cumulativeRevenue: 103_927_144,
    formatted: '$104M',
    cagr: 3.5, // 350% compound annual growth
    highlight: '350% CAGR'
  }
};

// ============================================================================
// VERTICAL-SPECIFIC PRICING MULTIPLIERS
// ============================================================================

export const VERTICAL_PRICING = {
  'universal-reform': { multiplier: 1.5, reason: 'Government/Public sector premium' },
  'defense': { multiplier: 2.0, reason: 'Security clearance & compliance requirements' },
  'pharma': { multiplier: 1.8, reason: 'Regulatory compliance (FDA, EMA)' },
  'finance': { multiplier: 1.6, reason: 'Financial regulations (SEC, FINRA)' },
  'manufacturing': { multiplier: 1.2, reason: 'Standard enterprise' },
  'energy': { multiplier: 1.4, reason: 'Critical infrastructure' },
  'insurance': { multiplier: 1.5, reason: 'Actuarial & compliance needs' },
  'logistics': { multiplier: 1.2, reason: 'Standard enterprise' },
  'clinical': { multiplier: 1.7, reason: 'HIPAA & clinical trial compliance' },
  'financial-services': { multiplier: 1.6, reason: 'Regulatory requirements' }
};

// ============================================================================
// LANGUAGE TIER PRICING
// ============================================================================

export const LANGUAGE_TIERS = {
  tier1: {
    count: 10,
    languages: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Japanese', 'Korean', 'Chinese'],
    included: 'All plans',
    premium: 0
  },
  tier2: {
    count: 40,
    description: 'Major world languages',
    included: 'Professional+',
    premium: 0
  },
  tier3: {
    count: 157,
    description: 'All 207 languages including rare/indigenous',
    included: 'Professional+',
    premium: 0,
    note: 'Full 207 language support is a key differentiator - no extra charge'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function formatCurrency(amount, currency = 'USD') {
  if (amount === null) return 'Contact Sales';
  if (amount === -1) return 'Unlimited';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function getTierByUsers(userCount) {
  if (userCount <= 5) return PRICING_TIERS.starter;
  if (userCount <= 25) return PRICING_TIERS.professional;
  return PRICING_TIERS.enterprise;
}

export function calculateAnnualSavings(tier) {
  const monthly = PRICING_TIERS[tier]?.monthlyPrice;
  const annual = PRICING_TIERS[tier]?.annualPrice;
  if (!monthly || !annual) return 0;
  return (monthly * 12) - annual;
}

export function getProjectedRevenue(year) {
  const key = `year${year}`;
  return REVENUE_PROJECTIONS[key]?.revenue?.totalARR || 0;
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  PRICING_TIERS,
  REVENUE_PROJECTIONS,
  REVENUE_SUMMARY,
  VERTICAL_PRICING,
  LANGUAGE_TIERS,
  formatCurrency,
  getTierByUsers,
  calculateAnnualSavings,
  getProjectedRevenue
};
