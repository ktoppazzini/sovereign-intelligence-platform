// ═══════════════════════════════════════════════════════════════════════════
// SOVEREIGN INTELLIGENCE - SHARED REPORT CONFIGURATION
// Vertical-specific theming and terminology for enterprise reports
// ═══════════════════════════════════════════════════════════════════════════

export const REPORT_VERTICALS = {
  'universal-reform': {
    id: 'universal-reform',
    name: 'Reform Report',
    icon: '🏛️',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    compliance: 'Government & Public Sector Standards',
    reportTypes: [
      { id: 'policy', label: 'Policy Analysis' },
      { id: 'budget', label: 'Budget Reform' },
      { id: 'workforce', label: 'Workforce Optimization' },
      { id: 'digital', label: 'Digital Transformation' },
      { id: 'comprehensive', label: 'Comprehensive Reform Report' },
    ],
    categories: [
      { id: 'efficiency', label: 'Operational Efficiency' },
      { id: 'cost', label: 'Cost Reduction' },
      { id: 'service', label: 'Service Delivery' },
      { id: 'compliance', label: 'Regulatory Compliance' },
      { id: 'transparency', label: 'Transparency' },
      { id: 'digital', label: 'Digitalization' },
    ],
    roles: ['Executive', 'Director', 'Manager', 'Analyst', 'Citizen'],
    basePath: '/reform-report',
  },

  'defense': {
    id: 'defense',
    name: 'Intelligence Report',
    icon: '🛡️',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    compliance: 'NIST • FedRAMP • IL4/IL5 Compliant',
    classification: true,
    reportTypes: [
      { id: 'threat', label: 'Threat Assessment' },
      { id: 'mission', label: 'Mission Analysis' },
      { id: 'intel', label: 'Intelligence Brief' },
      { id: 'cyber', label: 'Cyber Threat Report' },
      { id: 'comprehensive', label: 'Comprehensive Intel Report' },
    ],
    categories: [
      { id: 'threat', label: 'Threat Analysis' },
      { id: 'readiness', label: 'Operational Readiness' },
      { id: 'cyber', label: 'Cyber Security' },
      { id: 'logistics', label: 'Logistics & Supply' },
      { id: 'personnel', label: 'Personnel Security' },
      { id: 'intel', label: 'Intelligence Fusion' },
    ],
    roles: ['Commander', 'Director', 'Analyst', 'Operator', 'Liaison'],
    basePath: '/defense/intel-report',
  },

  'pharma': {
    id: 'pharma',
    name: 'Clinical Report',
    icon: '💊',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    compliance: 'HIPAA • GxP • 21 CFR Part 11 Compliant',
    reportTypes: [
      { id: 'clinical', label: 'Clinical Trial Analysis' },
      { id: 'safety', label: 'Drug Safety Report' },
      { id: 'regulatory', label: 'Regulatory Submission' },
      { id: 'pipeline', label: 'Pipeline Assessment' },
      { id: 'comprehensive', label: 'Comprehensive Clinical Report' },
    ],
    categories: [
      { id: 'efficacy', label: 'Efficacy Analysis' },
      { id: 'safety', label: 'Safety & Adverse Events' },
      { id: 'regulatory', label: 'Regulatory Compliance' },
      { id: 'manufacturing', label: 'CMC & Manufacturing' },
      { id: 'market', label: 'Market Access' },
      { id: 'ip', label: 'IP & Patents' },
    ],
    roles: ['Medical Director', 'Principal Investigator', 'Regulatory Affairs', 'Clinical Operations', 'Data Scientist'],
    basePath: '/pharma-platform/clinical-report',
  },

  'finance': {
    id: 'finance',
    name: 'Risk Report',
    icon: '💰',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    compliance: 'SOX • PCI-DSS • Basel III/IV • DORA Compliant',
    reportTypes: [
      { id: 'aml', label: 'AML/KYC Assessment' },
      { id: 'fraud', label: 'Fraud Analysis' },
      { id: 'market', label: 'Market Risk Report' },
      { id: 'credit', label: 'Credit Risk Assessment' },
      { id: 'operational', label: 'Operational Risk' },
      { id: 'comprehensive', label: 'Comprehensive Risk Report' },
    ],
    categories: [
      { id: 'aml', label: 'AML/KYC' },
      { id: 'fraud', label: 'Fraud Detection' },
      { id: 'market', label: 'Market Risk' },
      { id: 'credit', label: 'Credit Risk' },
      { id: 'liquidity', label: 'Liquidity Risk' },
      { id: 'operational', label: 'Operational Risk' },
      { id: 'cyber', label: 'Cyber Risk' },
      { id: 'model', label: 'Model Risk' },
    ],
    roles: ['Chief Risk Officer', 'Risk Director', 'Compliance Officer', 'Risk Analyst', 'Auditor'],
    basePath: '/finance-platform/risk-report',
  },

  'manufacturing': {
    id: 'manufacturing',
    name: 'Operations Report',
    icon: '🏭',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    compliance: 'ISO 9001 • ISO 45001 • IEC 62443 Compliant',
    reportTypes: [
      { id: 'oee', label: 'OEE & Performance' },
      { id: 'maintenance', label: 'Predictive Maintenance' },
      { id: 'quality', label: 'Quality Analysis' },
      { id: 'supply', label: 'Supply Chain Report' },
      { id: 'safety', label: 'Safety & Compliance' },
      { id: 'comprehensive', label: 'Comprehensive Ops Report' },
    ],
    categories: [
      { id: 'oee', label: 'OEE & Availability' },
      { id: 'throughput', label: 'Throughput' },
      { id: 'quality', label: 'Quality & Defects' },
      { id: 'maintenance', label: 'Equipment Health' },
      { id: 'energy', label: 'Energy & Sustainability' },
      { id: 'safety', label: 'Safety Incidents' },
      { id: 'inventory', label: 'Inventory' },
      { id: 'labor', label: 'Labor Productivity' },
    ],
    roles: ['Plant Manager', 'Operations Director', 'Quality Manager', 'Maintenance Lead', 'Production Supervisor'],
    basePath: '/manufacturing/ops-report',
  },

  'energy': {
    id: 'energy',
    name: 'Grid Report',
    icon: '⚡',
    color: '#eab308',
    gradient: 'linear-gradient(135deg, #eab308, #ca8a04)',
    compliance: 'NERC CIP • ISO 50001 • EPA Compliant',
    reportTypes: [
      { id: 'grid', label: 'Grid Stability Analysis' },
      { id: 'generation', label: 'Generation Performance' },
      { id: 'demand', label: 'Demand Forecasting' },
      { id: 'renewable', label: 'Renewable Integration' },
      { id: 'outage', label: 'Outage Analysis' },
      { id: 'comprehensive', label: 'Comprehensive Grid Report' },
    ],
    categories: [
      { id: 'reliability', label: 'Grid Reliability' },
      { id: 'generation', label: 'Generation Efficiency' },
      { id: 'transmission', label: 'Transmission & Distribution' },
      { id: 'renewable', label: 'Renewable Energy' },
      { id: 'demand', label: 'Demand Response' },
      { id: 'carbon', label: 'Carbon & Emissions' },
      { id: 'cyber', label: 'Cyber Security' },
      { id: 'regulatory', label: 'Regulatory Compliance' },
    ],
    roles: ['Grid Operator', 'Plant Manager', 'Reliability Engineer', 'Energy Analyst', 'Compliance Officer'],
    basePath: '/energy/grid-report',
  },

  'insurance': {
    id: 'insurance',
    name: 'Underwriting Report',
    icon: '🛡️',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    compliance: 'SOX • NAIC • Solvency II Compliant',
    reportTypes: [
      { id: 'underwriting', label: 'Underwriting Analysis' },
      { id: 'claims', label: 'Claims Analytics' },
      { id: 'fraud', label: 'Fraud Detection' },
      { id: 'actuarial', label: 'Actuarial Assessment' },
      { id: 'portfolio', label: 'Portfolio Risk' },
      { id: 'comprehensive', label: 'Comprehensive Risk Report' },
    ],
    categories: [
      { id: 'underwriting', label: 'Underwriting Risk' },
      { id: 'claims', label: 'Claims Experience' },
      { id: 'fraud', label: 'Fraud Detection' },
      { id: 'reserving', label: 'Loss Reserving' },
      { id: 'pricing', label: 'Pricing Adequacy' },
      { id: 'reinsurance', label: 'Reinsurance' },
      { id: 'catastrophe', label: 'Catastrophe Risk' },
      { id: 'regulatory', label: 'Regulatory Capital' },
    ],
    roles: ['Chief Underwriter', 'Claims Director', 'Actuary', 'Risk Manager', 'Compliance Officer'],
    basePath: '/insurance/underwriting-report',
  },

  'logistics': {
    id: 'logistics',
    name: 'Supply Chain Report',
    icon: '🚚',
    color: '#14b8a6',
    gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    compliance: 'ISO 28000 • C-TPAT • AEO Compliant',
    reportTypes: [
      { id: 'shipment', label: 'Shipment Analysis' },
      { id: 'inventory', label: 'Inventory Optimization' },
      { id: 'carrier', label: 'Carrier Performance' },
      { id: 'warehouse', label: 'Warehouse Efficiency' },
      { id: 'demand', label: 'Demand Planning' },
      { id: 'comprehensive', label: 'Comprehensive Supply Chain Report' },
    ],
    categories: [
      { id: 'delivery', label: 'On-Time Delivery' },
      { id: 'cost', label: 'Transportation Cost' },
      { id: 'inventory', label: 'Inventory Turns' },
      { id: 'warehouse', label: 'Warehouse Utilization' },
      { id: 'carrier', label: 'Carrier Performance' },
      { id: 'visibility', label: 'Supply Chain Visibility' },
      { id: 'sustainability', label: 'Sustainability' },
      { id: 'risk', label: 'Supply Risk' },
    ],
    roles: ['VP Supply Chain', 'Logistics Director', 'Warehouse Manager', 'Transportation Manager', 'Demand Planner'],
    basePath: '/logistics/supply-chain-report',
  },

  // Universal Industry config - supports dynamic industry/sub-industry selection
  'universal': {
    id: 'universal',
    name: 'Universal Industry Report',
    icon: '🌐',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    compliance: 'SOC 2 • ISO 27001 • GDPR Ready',
    supportsIndustries: true, // Flag to show industry/sub-industry selectors
    reportTypes: [
      { id: 'transformation', label: 'Digital Transformation' },
      { id: 'operational', label: 'Operational Excellence' },
      { id: 'strategic', label: 'Strategic Analysis' },
      { id: 'risk', label: 'Risk Assessment' },
      { id: 'comprehensive', label: 'Comprehensive Industry Report' },
    ],
    categories: [
      { id: 'efficiency', label: 'Operational Efficiency' },
      { id: 'cost', label: 'Cost Optimization' },
      { id: 'digital', label: 'Digital Transformation' },
      { id: 'customer', label: 'Customer Experience' },
      { id: 'workforce', label: 'Workforce Excellence' },
      { id: 'compliance', label: 'Compliance & Risk' },
      { id: 'innovation', label: 'Innovation & Growth' },
      { id: 'sustainability', label: 'Sustainability' },
    ],
    roles: ['Executive', 'Director', 'Manager', 'Analyst', 'Consultant'],
    basePath: '/universal-industry-plan',
  },
};

export function getReportConfig(verticalId) {
  // Handle aliases
  const aliases = {
    'reform': 'universal-reform',
    'universal-industry': 'universal',
    'universal-industry-plan': 'universal',
  };
  const resolvedId = aliases[verticalId] || verticalId;
  return REPORT_VERTICALS[resolvedId] || REPORT_VERTICALS['universal-reform'];
}

export default REPORT_VERTICALS;
