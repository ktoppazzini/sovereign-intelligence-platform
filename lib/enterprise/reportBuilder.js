// lib/enterprise/reportBuilder.js
// [KT:REPORT-BUILDER-v1.0] Custom Report Builder
// Drag-and-drop report creation - major enterprise feature
// Enables: Self-service analytics, custom dashboards, scheduled reports

import Airtable from 'airtable';
import crypto from 'crypto';

const TAG = '[ENTERPRISE:REPORT-BUILDER]';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ''
);

// ============================================================================
// Report Components (Widgets)
// ============================================================================
export const REPORT_COMPONENTS = {
  // Visualizations
  bar_chart: {
    name: 'Bar Chart',
    icon: '📊',
    category: 'chart',
    configOptions: ['dataSource', 'xAxis', 'yAxis', 'groupBy', 'colors', 'orientation'],
  },
  line_chart: {
    name: 'Line Chart',
    icon: '📈',
    category: 'chart',
    configOptions: ['dataSource', 'xAxis', 'yAxis', 'series', 'smooth', 'area'],
  },
  pie_chart: {
    name: 'Pie Chart',
    icon: '🥧',
    category: 'chart',
    configOptions: ['dataSource', 'dimension', 'metric', 'donut', 'colors'],
  },
  scatter_plot: {
    name: 'Scatter Plot',
    icon: '⚬',
    category: 'chart',
    configOptions: ['dataSource', 'xAxis', 'yAxis', 'size', 'color', 'trendline'],
  },
  heatmap: {
    name: 'Heatmap',
    icon: '🗺️',
    category: 'chart',
    configOptions: ['dataSource', 'xAxis', 'yAxis', 'metric', 'colorScale'],
  },
  funnel: {
    name: 'Funnel Chart',
    icon: '⏬',
    category: 'chart',
    configOptions: ['dataSource', 'stages', 'metric', 'colors'],
  },
  gauge: {
    name: 'Gauge',
    icon: '⏱️',
    category: 'chart',
    configOptions: ['dataSource', 'metric', 'min', 'max', 'thresholds'],
  },
  
  // Data Display
  kpi_card: {
    name: 'KPI Card',
    icon: '🎯',
    category: 'data',
    configOptions: ['dataSource', 'metric', 'comparison', 'trend', 'format'],
  },
  data_table: {
    name: 'Data Table',
    icon: '📋',
    category: 'data',
    configOptions: ['dataSource', 'columns', 'sorting', 'pagination', 'search'],
  },
  pivot_table: {
    name: 'Pivot Table',
    icon: '🔄',
    category: 'data',
    configOptions: ['dataSource', 'rows', 'columns', 'values', 'aggregation'],
  },
  
  // Content
  text_block: {
    name: 'Text Block',
    icon: '📝',
    category: 'content',
    configOptions: ['content', 'formatting', 'variables'],
  },
  image: {
    name: 'Image',
    icon: '🖼️',
    category: 'content',
    configOptions: ['url', 'alt', 'size', 'alignment'],
  },
  divider: {
    name: 'Divider',
    icon: '➖',
    category: 'content',
    configOptions: ['style', 'color', 'margin'],
  },
  
  // Filters
  date_filter: {
    name: 'Date Filter',
    icon: '📅',
    category: 'filter',
    configOptions: ['field', 'defaultRange', 'presets'],
  },
  dropdown_filter: {
    name: 'Dropdown Filter',
    icon: '🔽',
    category: 'filter',
    configOptions: ['field', 'options', 'multiSelect', 'search'],
  },
  search_filter: {
    name: 'Search Filter',
    icon: '🔍',
    category: 'filter',
    configOptions: ['fields', 'placeholder'],
  },
  
  // AI-Powered
  ai_insights: {
    name: 'AI Insights',
    icon: '🤖',
    category: 'ai',
    configOptions: ['dataSource', 'analysisType', 'autoRefresh'],
    tier: 'professional',
  },
  ai_summary: {
    name: 'AI Summary',
    icon: '💡',
    category: 'ai',
    configOptions: ['dataSource', 'format', 'length'],
    tier: 'professional',
  },
  anomaly_detector: {
    name: 'Anomaly Detector',
    icon: '⚠️',
    category: 'ai',
    configOptions: ['dataSource', 'metric', 'sensitivity', 'alerting'],
    tier: 'enterprise',
  },
};

// ============================================================================
// Data Sources
// ============================================================================
export const DATA_SOURCES = {
  // Internal
  reports: { name: 'Generated Reports', type: 'internal' },
  analytics: { name: 'Analytics Data', type: 'internal' },
  agents: { name: 'Agent Activity', type: 'internal' },
  users: { name: 'User Activity', type: 'internal' },
  billing: { name: 'Billing Data', type: 'internal' },
  
  // External (via connectors)
  salesforce: { name: 'Salesforce', type: 'connector' },
  hubspot: { name: 'HubSpot', type: 'connector' },
  snowflake: { name: 'Snowflake', type: 'connector' },
  bigquery: { name: 'BigQuery', type: 'connector' },
  
  // Custom
  csv_upload: { name: 'CSV Upload', type: 'upload' },
  api_endpoint: { name: 'API Endpoint', type: 'api' },
  sql_query: { name: 'SQL Query', type: 'query', tier: 'enterprise' },
};

// ============================================================================
// Report Management
// ============================================================================

/**
 * Create a new report
 */
export async function createReport({
  organizationId,
  name,
  description = '',
  layout = [],
  dataSources = [],
  filters = {},
  createdBy,
  folderId,
}) {
  const reportId = `report_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  
  try {
    await base('Custom Reports').create({
      'Report ID': reportId,
      'Organization ID': organizationId,
      'Name': name,
      'Description': description,
      'Layout': JSON.stringify(layout),
      'Data Sources': JSON.stringify(dataSources),
      'Filters': JSON.stringify(filters),
      'Created By': createdBy,
      'Folder ID': folderId || '',
      'Status': 'draft',
      'Created At': new Date().toISOString(),
      'Updated At': new Date().toISOString(),
      'Version': 1,
    });
    
    return {
      reportId,
      name,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(TAG, 'createReport.error', error);
    throw error;
  }
}

/**
 * Get report by ID
 */
export async function getReport(reportId) {
  try {
    const records = await base('Custom Reports')
      .select({ filterByFormula: `{Report ID} = "${reportId}"`, maxRecords: 1 })
      .firstPage();
    
    if (records.length === 0) return null;
    
    const r = records[0];
    return {
      reportId: r.fields['Report ID'],
      recordId: r.id,
      organizationId: r.fields['Organization ID'],
      name: r.fields['Name'],
      description: r.fields['Description'],
      layout: JSON.parse(r.fields['Layout'] || '[]'),
      dataSources: JSON.parse(r.fields['Data Sources'] || '[]'),
      filters: JSON.parse(r.fields['Filters'] || '{}'),
      createdBy: r.fields['Created By'],
      status: r.fields['Status'],
      version: r.fields['Version'],
      createdAt: r.fields['Created At'],
      updatedAt: r.fields['Updated At'],
    };
  } catch (error) {
    console.error(TAG, 'getReport.error', error);
    throw error;
  }
}

/**
 * Update report
 */
export async function updateReport(reportId, updates) {
  try {
    const report = await getReport(reportId);
    if (!report) throw new Error('Report not found');
    
    const updateFields = {
      'Updated At': new Date().toISOString(),
      'Version': report.version + 1,
    };
    
    if (updates.name) updateFields['Name'] = updates.name;
    if (updates.description !== undefined) updateFields['Description'] = updates.description;
    if (updates.layout) updateFields['Layout'] = JSON.stringify(updates.layout);
    if (updates.dataSources) updateFields['Data Sources'] = JSON.stringify(updates.dataSources);
    if (updates.filters) updateFields['Filters'] = JSON.stringify(updates.filters);
    if (updates.status) updateFields['Status'] = updates.status;
    
    await base('Custom Reports').update(report.recordId, updateFields);
    
    return {
      reportId,
      version: report.version + 1,
      updatedAt: updateFields['Updated At'],
    };
  } catch (error) {
    console.error(TAG, 'updateReport.error', error);
    throw error;
  }
}

/**
 * List reports for organization
 */
export async function listReports(organizationId, options = {}) {
  const { folderId, status, createdBy, search } = options;
  
  try {
    let formula = `{Organization ID} = "${organizationId}"`;
    if (folderId) formula = `AND(${formula}, {Folder ID} = "${folderId}")`;
    if (status) formula = `AND(${formula}, {Status} = "${status}")`;
    if (createdBy) formula = `AND(${formula}, {Created By} = "${createdBy}")`;
    
    const records = await base('Custom Reports')
      .select({
        filterByFormula: formula,
        sort: [{ field: 'Updated At', direction: 'desc' }],
      })
      .firstPage();
    
    let reports = records.map(r => ({
      reportId: r.fields['Report ID'],
      name: r.fields['Name'],
      description: r.fields['Description'],
      status: r.fields['Status'],
      createdBy: r.fields['Created By'],
      updatedAt: r.fields['Updated At'],
      version: r.fields['Version'],
    }));
    
    if (search) {
      const searchLower = search.toLowerCase();
      reports = reports.filter(r => 
        r.name.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower)
      );
    }
    
    return reports;
  } catch (error) {
    console.error(TAG, 'listReports.error', error);
    throw error;
  }
}

/**
 * Delete report
 */
export async function deleteReport(reportId) {
  try {
    const report = await getReport(reportId);
    if (!report) throw new Error('Report not found');
    
    await base('Custom Reports').destroy(report.recordId);
    return { deleted: true, reportId };
  } catch (error) {
    console.error(TAG, 'deleteReport.error', error);
    throw error;
  }
}

/**
 * Duplicate report
 */
export async function duplicateReport(reportId, newName, createdBy) {
  const original = await getReport(reportId);
  if (!original) throw new Error('Report not found');
  
  return createReport({
    organizationId: original.organizationId,
    name: newName || `${original.name} (Copy)`,
    description: original.description,
    layout: original.layout,
    dataSources: original.dataSources,
    filters: original.filters,
    createdBy,
    folderId: original.folderId,
  });
}

// ============================================================================
// Report Scheduling
// ============================================================================

/**
 * Schedule report delivery
 */
export async function scheduleReport({
  reportId,
  schedule, // cron expression or preset
  recipients,
  format = 'pdf', // pdf, excel, csv
  includeFilters = true,
}) {
  const scheduleId = `sched_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  try {
    await base('Report Schedules').create({
      'Schedule ID': scheduleId,
      'Report ID': reportId,
      'Schedule': schedule,
      'Recipients': recipients.join(','),
      'Format': format,
      'Include Filters': includeFilters,
      'Status': 'active',
      'Created At': new Date().toISOString(),
      'Last Run': '',
      'Next Run': calculateNextRun(schedule),
    });
    
    return {
      scheduleId,
      reportId,
      schedule,
      nextRun: calculateNextRun(schedule),
      status: 'active',
    };
  } catch (error) {
    console.error(TAG, 'scheduleReport.error', error);
    throw error;
  }
}

/**
 * Calculate next run time from schedule
 */
function calculateNextRun(schedule) {
  // Simplified - in production use cron parser
  const presets = {
    'daily': new Date(Date.now() + 24 * 60 * 60 * 1000),
    'weekly': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    'monthly': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
  
  return (presets[schedule] || new Date(Date.now() + 24 * 60 * 60 * 1000)).toISOString();
}

/**
 * Get report schedules
 */
export async function getReportSchedules(reportId) {
  try {
    const records = await base('Report Schedules')
      .select({
        filterByFormula: `AND({Report ID} = "${reportId}", {Status} = "active")`,
      })
      .firstPage();
    
    return records.map(r => ({
      scheduleId: r.fields['Schedule ID'],
      schedule: r.fields['Schedule'],
      recipients: (r.fields['Recipients'] || '').split(','),
      format: r.fields['Format'],
      lastRun: r.fields['Last Run'],
      nextRun: r.fields['Next Run'],
    }));
  } catch (error) {
    console.error(TAG, 'getReportSchedules.error', error);
    throw error;
  }
}

// ============================================================================
// Report Execution
// ============================================================================

/**
 * Execute/render a report
 */
export async function executeReport(reportId, options = {}) {
  const { filters = {}, format = 'json' } = options;
  
  const report = await getReport(reportId);
  if (!report) throw new Error('Report not found');
  
  const executionId = `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  // Process each component in the layout
  const results = await Promise.all(
    report.layout.map(async (component) => {
      return executeComponent(component, filters);
    })
  );
  
  const execution = {
    executionId,
    reportId,
    reportName: report.name,
    filters,
    results,
    executedAt: new Date().toISOString(),
  };
  
  // Generate output format
  if (format === 'pdf') {
    return { ...execution, format: 'pdf', downloadUrl: `/api/reports/${executionId}/download.pdf` };
  } else if (format === 'excel') {
    return { ...execution, format: 'excel', downloadUrl: `/api/reports/${executionId}/download.xlsx` };
  }
  
  return execution;
}

/**
 * Execute a single component
 */
async function executeComponent(component, filters) {
  const { type, config } = component;
  
  // Mock data execution - in production, query actual data sources
  const mockData = {
    bar_chart: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      datasets: [{ label: 'Revenue', data: [12, 19, 3, 5, 2] }],
    },
    line_chart: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{ label: 'Users', data: [100, 150, 200, 280] }],
    },
    kpi_card: {
      value: 42567,
      change: 12.5,
      trend: 'up',
    },
    data_table: {
      columns: ['Name', 'Value', 'Status'],
      rows: [
        ['Item A', 100, 'Active'],
        ['Item B', 200, 'Pending'],
      ],
    },
    ai_insights: {
      insights: [
        'Revenue increased 15% compared to last month',
        'User engagement is trending upward',
        'Consider scaling infrastructure for projected growth',
      ],
    },
  };
  
  return {
    componentId: component.id,
    type,
    data: mockData[type] || {},
  };
}

// ============================================================================
// Report Templates
// ============================================================================
export const REPORT_TEMPLATES = {
  executive_summary: {
    name: 'Executive Summary',
    description: 'High-level KPIs and trends for leadership',
    layout: [
      { id: 'kpi1', type: 'kpi_card', config: { metric: 'total_revenue' } },
      { id: 'kpi2', type: 'kpi_card', config: { metric: 'active_users' } },
      { id: 'kpi3', type: 'kpi_card', config: { metric: 'conversion_rate' } },
      { id: 'chart1', type: 'line_chart', config: { dataSource: 'revenue_trend' } },
      { id: 'ai1', type: 'ai_summary', config: { format: 'executive' } },
    ],
  },
  sales_dashboard: {
    name: 'Sales Dashboard',
    description: 'Sales pipeline and performance metrics',
    layout: [
      { id: 'filter1', type: 'date_filter', config: { defaultRange: 'last_30_days' } },
      { id: 'funnel1', type: 'funnel', config: { stages: ['Lead', 'Qualified', 'Proposal', 'Closed'] } },
      { id: 'table1', type: 'data_table', config: { dataSource: 'deals' } },
    ],
  },
  operational_report: {
    name: 'Operational Report',
    description: 'System health and operational metrics',
    layout: [
      { id: 'gauge1', type: 'gauge', config: { metric: 'system_health' } },
      { id: 'chart1', type: 'line_chart', config: { dataSource: 'api_latency' } },
      { id: 'anomaly1', type: 'anomaly_detector', config: { metric: 'error_rate' } },
    ],
  },
};

/**
 * Create report from template
 */
export async function createFromTemplate(organizationId, templateName, name, createdBy) {
  const template = REPORT_TEMPLATES[templateName];
  if (!template) throw new Error(`Template not found: ${templateName}`);
  
  return createReport({
    organizationId,
    name: name || template.name,
    description: template.description,
    layout: template.layout,
    createdBy,
  });
}

export default {
  REPORT_COMPONENTS,
  DATA_SOURCES,
  REPORT_TEMPLATES,
  createReport,
  getReport,
  updateReport,
  listReports,
  deleteReport,
  duplicateReport,
  scheduleReport,
  getReportSchedules,
  executeReport,
  createFromTemplate,
};
