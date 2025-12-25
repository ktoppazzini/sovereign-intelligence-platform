/**
 * Saved Report Templates System for Sovereign Intelligence
 * High-value sticky feature for enterprise retention
 * Created: December 24, 2025
 */

// Template categories
export const TEMPLATE_CATEGORIES = {
  GOVERNMENT: 'government',
  DEFENSE: 'defense',
  PHARMA: 'pharma',
  FINANCE: 'finance',
  CLINICAL: 'clinical',
  MANUFACTURING: 'manufacturing',
  ENERGY: 'energy',
  INSURANCE: 'insurance',
  LOGISTICS: 'logistics',
  CUSTOM: 'custom',
};

// Template visibility
export const TEMPLATE_VISIBILITY = {
  PRIVATE: 'private',      // Only creator can see
  TEAM: 'team',            // Team members can see
  ORGANIZATION: 'organization', // Entire org can see
  PUBLIC: 'public',        // Published to marketplace
};

// In-memory storage (replace with database in production)
let templates = [];
let templateIdCounter = 1;

// Pre-built templates for each vertical
const PREBUILT_TEMPLATES = [
  {
    name: 'Government Efficiency Audit',
    description: 'Comprehensive analysis of department spending, redundancies, and optimization opportunities',
    category: TEMPLATE_CATEGORIES.GOVERNMENT,
    vertical: 'reform',
    fields: {
      agencyName: '',
      fiscalYear: new Date().getFullYear(),
      budgetRange: '$10M - $100M',
      analysisType: 'comprehensive',
    },
    tags: ['audit', 'efficiency', 'cost-reduction'],
    isPrebuilt: true,
  },
  {
    name: 'Defense Intelligence Brief',
    description: 'Threat assessment and strategic intelligence summary for defense operations',
    category: TEMPLATE_CATEGORIES.DEFENSE,
    vertical: 'defense',
    fields: {
      region: '',
      threatLevel: 'medium',
      classification: 'unclassified',
      timeframe: '30 days',
    },
    tags: ['intelligence', 'threat-assessment', 'strategic'],
    isPrebuilt: true,
  },
  {
    name: 'Clinical Trial Analysis',
    description: 'Drug trial efficacy and safety analysis with statistical breakdowns',
    category: TEMPLATE_CATEGORIES.CLINICAL,
    vertical: 'clinical',
    fields: {
      trialPhase: 'Phase 3',
      drugName: '',
      indication: '',
      sampleSize: 1000,
    },
    tags: ['clinical-trial', 'efficacy', 'safety'],
    isPrebuilt: true,
  },
  {
    name: 'Financial Risk Assessment',
    description: 'Portfolio risk analysis with market exposure and hedging recommendations',
    category: TEMPLATE_CATEGORIES.FINANCE,
    vertical: 'finance',
    fields: {
      portfolioValue: '',
      riskTolerance: 'moderate',
      timeHorizon: '5 years',
      assetClasses: ['equities', 'bonds'],
    },
    tags: ['risk', 'portfolio', 'investment'],
    isPrebuilt: true,
  },
  {
    name: 'Pharmaceutical Compliance Report',
    description: 'FDA compliance status and regulatory milestone tracking',
    category: TEMPLATE_CATEGORIES.PHARMA,
    vertical: 'pharma',
    fields: {
      productName: '',
      regulatoryBody: 'FDA',
      submissionType: 'NDA',
      targetDate: '',
    },
    tags: ['compliance', 'regulatory', 'FDA'],
    isPrebuilt: true,
  },
  {
    name: 'Manufacturing Efficiency Dashboard',
    description: 'Production line efficiency, downtime analysis, and optimization recommendations',
    category: TEMPLATE_CATEGORIES.MANUFACTURING,
    vertical: 'manufacturing',
    fields: {
      facilityName: '',
      productLine: '',
      shiftPattern: '3-shift',
      targetOEE: 85,
    },
    tags: ['efficiency', 'OEE', 'production'],
    isPrebuilt: true,
  },
  {
    name: 'Energy Grid Analysis',
    description: 'Power distribution analysis, renewable integration, and load forecasting',
    category: TEMPLATE_CATEGORIES.ENERGY,
    vertical: 'energy',
    fields: {
      gridRegion: '',
      capacityMW: 0,
      renewablePercent: 0,
      peakDemand: '',
    },
    tags: ['grid', 'renewable', 'forecasting'],
    isPrebuilt: true,
  },
  {
    name: 'Insurance Claims Analysis',
    description: 'Claims pattern analysis, fraud detection, and reserve recommendations',
    category: TEMPLATE_CATEGORIES.INSURANCE,
    vertical: 'insurance',
    fields: {
      lineOfBusiness: 'auto',
      claimPeriod: 'quarterly',
      region: '',
      lossRatioTarget: 60,
    },
    tags: ['claims', 'fraud', 'actuarial'],
    isPrebuilt: true,
  },
  {
    name: 'Supply Chain Optimization',
    description: 'Logistics network analysis, inventory optimization, and supplier performance',
    category: TEMPLATE_CATEGORIES.LOGISTICS,
    vertical: 'logistics',
    fields: {
      networkType: 'hub-and-spoke',
      inventoryTurns: 12,
      leadTimeTarget: '3 days',
      supplierCount: 0,
    },
    tags: ['supply-chain', 'inventory', 'logistics'],
    isPrebuilt: true,
  },
];

/**
 * Initialize templates with prebuilt ones
 */
export function initializeTemplates() {
  if (templates.length === 0) {
    PREBUILT_TEMPLATES.forEach(t => {
      templates.push({
        id: `TPL-${String(templateIdCounter++).padStart(6, '0')}`,
        ...t,
        createdBy: 'system',
        createdByName: 'Sovereign AI',
        orgId: 'system',
        visibility: TEMPLATE_VISIBILITY.PUBLIC,
        usageCount: Math.floor(Math.random() * 1000) + 100,
        rating: (4 + Math.random()).toFixed(1),
        ratingCount: Math.floor(Math.random() * 100) + 10,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      });
    });
  }
  return templates;
}

/**
 * Create a new template
 */
export function createTemplate(data) {
  const template = {
    id: `TPL-${String(templateIdCounter++).padStart(6, '0')}`,
    name: data.name,
    description: data.description || '',
    category: data.category || TEMPLATE_CATEGORIES.CUSTOM,
    vertical: data.vertical || 'custom',
    fields: data.fields || {},
    tags: data.tags || [],
    isPrebuilt: false,
    createdBy: data.userId,
    createdByName: data.userName,
    orgId: data.orgId,
    visibility: data.visibility || TEMPLATE_VISIBILITY.PRIVATE,
    usageCount: 0,
    rating: 0,
    ratingCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };

  templates.push(template);
  return template;
}

/**
 * Update a template
 */
export function updateTemplate(templateId, updates, userId) {
  const index = templates.findIndex(t => t.id === templateId);
  if (index === -1) return null;

  const template = templates[index];
  
  // Check permission
  if (template.createdBy !== userId && template.createdBy !== 'system') {
    return { error: 'Permission denied' };
  }

  templates[index] = {
    ...template,
    ...updates,
    id: template.id, // Prevent ID change
    createdBy: template.createdBy, // Prevent creator change
    createdAt: template.createdAt, // Prevent creation date change
    updatedAt: new Date().toISOString(),
    version: template.version + 1,
  };

  return templates[index];
}

/**
 * Delete a template
 */
export function deleteTemplate(templateId, userId) {
  const index = templates.findIndex(t => t.id === templateId);
  if (index === -1) return { error: 'Template not found' };

  const template = templates[index];
  if (template.createdBy !== userId && template.isPrebuilt) {
    return { error: 'Cannot delete prebuilt templates' };
  }

  templates.splice(index, 1);
  return { success: true };
}

/**
 * Get templates for a user
 */
export function getTemplates(filters = {}) {
  initializeTemplates();
  
  let results = [...templates];

  // Filter by organization and visibility
  if (filters.orgId) {
    results = results.filter(t => 
      t.visibility === TEMPLATE_VISIBILITY.PUBLIC ||
      t.orgId === filters.orgId ||
      t.orgId === 'system'
    );
  }

  // Filter by category
  if (filters.category) {
    results = results.filter(t => t.category === filters.category);
  }

  // Filter by vertical
  if (filters.vertical) {
    results = results.filter(t => t.vertical === filters.vertical);
  }

  // Filter by tags
  if (filters.tags && filters.tags.length > 0) {
    results = results.filter(t => 
      filters.tags.some(tag => t.tags.includes(tag))
    );
  }

  // Search by name or description
  if (filters.search) {
    const term = filters.search.toLowerCase();
    results = results.filter(t =>
      t.name.toLowerCase().includes(term) ||
      t.description.toLowerCase().includes(term)
    );
  }

  // Filter by prebuilt
  if (filters.prebuiltOnly) {
    results = results.filter(t => t.isPrebuilt);
  }

  // Filter by user's own templates
  if (filters.myTemplatesOnly && filters.userId) {
    results = results.filter(t => t.createdBy === filters.userId);
  }

  // Sort
  const sortBy = filters.sortBy || 'usageCount';
  const sortOrder = filters.sortOrder || 'desc';
  
  results.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    return sortOrder === 'desc' ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
  });

  return results;
}

/**
 * Get a single template
 */
export function getTemplate(templateId) {
  initializeTemplates();
  return templates.find(t => t.id === templateId);
}

/**
 * Use a template (increment usage count)
 */
export function useTemplate(templateId) {
  const template = templates.find(t => t.id === templateId);
  if (template) {
    template.usageCount++;
    return template;
  }
  return null;
}

/**
 * Rate a template
 */
export function rateTemplate(templateId, rating, userId) {
  const template = templates.find(t => t.id === templateId);
  if (!template) return null;

  // Simple rating calculation (in production, track individual ratings)
  const totalRating = parseFloat(template.rating) * template.ratingCount;
  template.ratingCount++;
  template.rating = ((totalRating + rating) / template.ratingCount).toFixed(1);

  return template;
}

/**
 * Duplicate a template
 */
export function duplicateTemplate(templateId, userId, userName, orgId) {
  const original = getTemplate(templateId);
  if (!original) return null;

  return createTemplate({
    name: `${original.name} (Copy)`,
    description: original.description,
    category: original.category,
    vertical: original.vertical,
    fields: { ...original.fields },
    tags: [...original.tags],
    userId,
    userName,
    orgId,
    visibility: TEMPLATE_VISIBILITY.PRIVATE,
  });
}

// UI Translation keys
export const TEMPLATES_UI_KEYS = {
  title: 'Report Templates',
  subtitle: 'Save time with reusable report configurations',
  
  // Actions
  createTemplate: 'Create Template',
  saveAsTemplate: 'Save as Template',
  useTemplate: 'Use Template',
  editTemplate: 'Edit Template',
  deleteTemplate: 'Delete Template',
  duplicateTemplate: 'Duplicate',
  shareTemplate: 'Share Template',
  
  // Form
  templateName: 'Template Name',
  templateDescription: 'Description',
  templateCategory: 'Category',
  templateTags: 'Tags',
  templateVisibility: 'Visibility',
  
  // Visibility options
  private: 'Private - Only you',
  team: 'Team - Your team members',
  organization: 'Organization - Everyone in your org',
  public: 'Public - Available to all users',
  
  // Filters
  allTemplates: 'All Templates',
  myTemplates: 'My Templates',
  prebuiltTemplates: 'Prebuilt Templates',
  teamTemplates: 'Team Templates',
  searchTemplates: 'Search templates...',
  filterByCategory: 'Filter by Category',
  filterByVertical: 'Filter by Industry',
  sortBy: 'Sort By',
  
  // Sort options
  mostUsed: 'Most Used',
  highestRated: 'Highest Rated',
  newest: 'Newest',
  alphabetical: 'Alphabetical',
  
  // Stats
  usageCount: 'times used',
  rating: 'Rating',
  version: 'Version',
  lastUpdated: 'Last Updated',
  createdBy: 'Created By',
  
  // Categories
  government: 'Government',
  defense: 'Defense',
  pharma: 'Pharmaceutical',
  finance: 'Finance',
  clinical: 'Clinical',
  manufacturing: 'Manufacturing',
  energy: 'Energy',
  insurance: 'Insurance',
  logistics: 'Logistics',
  custom: 'Custom',
  
  // Empty states
  noTemplates: 'No templates found',
  noTemplatesDescription: 'Create your first template to save time on future reports',
  startFromScratch: 'Start from Scratch',
  
  // Success messages
  templateSaved: 'Template saved successfully',
  templateDeleted: 'Template deleted',
  templateDuplicated: 'Template duplicated',
  
  // Prebuilt badge
  prebuilt: 'Prebuilt',
  official: 'Official',
  popular: 'Popular',
};

export default {
  TEMPLATE_CATEGORIES,
  TEMPLATE_VISIBILITY,
  TEMPLATES_UI_KEYS,
  initializeTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplates,
  getTemplate,
  useTemplate,
  rateTemplate,
  duplicateTemplate,
};
