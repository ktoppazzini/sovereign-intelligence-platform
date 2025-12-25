/**
 * Alerts & Thresholds System for Sovereign Intelligence
 * Real-time monitoring and notifications - High engagement feature
 * Created: December 24, 2025
 */

// Alert types
export const ALERT_TYPES = {
  USAGE_THRESHOLD: 'usage_threshold',
  BUDGET_ALERT: 'budget_alert',
  ANOMALY_DETECTION: 'anomaly_detection',
  SCHEDULE_TRIGGER: 'schedule_trigger',
  METRIC_CHANGE: 'metric_change',
  SECURITY_ALERT: 'security_alert',
  COMPLIANCE_ALERT: 'compliance_alert',
  SYSTEM_ALERT: 'system_alert',
};

// Alert severity
export const ALERT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// Alert status
export const ALERT_STATUS = {
  ACTIVE: 'active',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  SNOOZED: 'snoozed',
};

// Notification channels
export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  SLACK: 'slack',
  TEAMS: 'teams',
  WEBHOOK: 'webhook',
  IN_APP: 'in_app',
  PUSH: 'push',
};

// Comparison operators
export const OPERATORS = {
  GREATER_THAN: 'gt',
  LESS_THAN: 'lt',
  EQUALS: 'eq',
  NOT_EQUALS: 'neq',
  GREATER_OR_EQUAL: 'gte',
  LESS_OR_EQUAL: 'lte',
  CONTAINS: 'contains',
  PERCENT_CHANGE: 'pct_change',
};

// In-memory storage
let alertRules = [];
let triggeredAlerts = [];
let ruleIdCounter = 1;
let alertIdCounter = 1;

// Prebuilt alert templates
const PREBUILT_ALERT_RULES = [
  {
    name: 'API Usage Warning',
    description: 'Alert when API usage reaches 80% of limit',
    type: ALERT_TYPES.USAGE_THRESHOLD,
    metric: 'apiCallsPerMonth',
    operator: OPERATORS.GREATER_OR_EQUAL,
    threshold: 80,
    thresholdUnit: 'percent',
    severity: ALERT_SEVERITY.MEDIUM,
    channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP],
    isPrebuilt: true,
  },
  {
    name: 'Report Limit Critical',
    description: 'Alert when report generation reaches 95% of limit',
    type: ALERT_TYPES.USAGE_THRESHOLD,
    metric: 'reportsPerMonth',
    operator: OPERATORS.GREATER_OR_EQUAL,
    threshold: 95,
    thresholdUnit: 'percent',
    severity: ALERT_SEVERITY.HIGH,
    channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.SMS, NOTIFICATION_CHANNELS.IN_APP],
    isPrebuilt: true,
  },
  {
    name: 'Cost Anomaly Detection',
    description: 'Alert on unusual spending patterns',
    type: ALERT_TYPES.ANOMALY_DETECTION,
    metric: 'overageCharges',
    operator: OPERATORS.PERCENT_CHANGE,
    threshold: 50,
    thresholdUnit: 'percent',
    comparisonPeriod: '7d',
    severity: ALERT_SEVERITY.HIGH,
    channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP],
    isPrebuilt: true,
  },
  {
    name: 'Security Event',
    description: 'Immediate alert on suspicious activity',
    type: ALERT_TYPES.SECURITY_ALERT,
    metric: 'securityEvents',
    operator: OPERATORS.GREATER_THAN,
    threshold: 0,
    severity: ALERT_SEVERITY.CRITICAL,
    channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.SMS, NOTIFICATION_CHANNELS.SLACK, NOTIFICATION_CHANNELS.IN_APP],
    isPrebuilt: true,
  },
  {
    name: 'Failed Login Attempts',
    description: 'Alert on multiple failed login attempts',
    type: ALERT_TYPES.SECURITY_ALERT,
    metric: 'failedLogins',
    operator: OPERATORS.GREATER_THAN,
    threshold: 5,
    timeWindow: '1h',
    severity: ALERT_SEVERITY.HIGH,
    channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP],
    isPrebuilt: true,
  },
  {
    name: 'Storage Limit Warning',
    description: 'Alert when storage usage exceeds 75%',
    type: ALERT_TYPES.USAGE_THRESHOLD,
    metric: 'storageGB',
    operator: OPERATORS.GREATER_OR_EQUAL,
    threshold: 75,
    thresholdUnit: 'percent',
    severity: ALERT_SEVERITY.MEDIUM,
    channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP],
    isPrebuilt: true,
  },
];

/**
 * Initialize with prebuilt rules
 */
export function initializeAlertRules() {
  if (alertRules.length === 0) {
    PREBUILT_ALERT_RULES.forEach(rule => {
      alertRules.push({
        id: `RULE-${String(ruleIdCounter++).padStart(6, '0')}`,
        ...rule,
        enabled: true,
        createdBy: 'system',
        orgId: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastTriggered: null,
        triggerCount: 0,
      });
    });
  }
  return alertRules;
}

/**
 * Create a custom alert rule
 */
export function createAlertRule(data) {
  const rule = {
    id: `RULE-${String(ruleIdCounter++).padStart(6, '0')}`,
    name: data.name,
    description: data.description || '',
    type: data.type || ALERT_TYPES.METRIC_CHANGE,
    metric: data.metric,
    operator: data.operator || OPERATORS.GREATER_THAN,
    threshold: data.threshold,
    thresholdUnit: data.thresholdUnit || 'absolute',
    comparisonPeriod: data.comparisonPeriod || null,
    timeWindow: data.timeWindow || null,
    severity: data.severity || ALERT_SEVERITY.MEDIUM,
    channels: data.channels || [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP],
    isPrebuilt: false,
    enabled: true,
    createdBy: data.userId,
    orgId: data.orgId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastTriggered: null,
    triggerCount: 0,
    cooldownMinutes: data.cooldownMinutes || 60,
    recipients: data.recipients || [],
    metadata: data.metadata || {},
  };

  alertRules.push(rule);
  return rule;
}

/**
 * Update an alert rule
 */
export function updateAlertRule(ruleId, updates, userId) {
  const index = alertRules.findIndex(r => r.id === ruleId);
  if (index === -1) return null;

  const rule = alertRules[index];
  if (rule.createdBy !== userId && rule.createdBy !== 'system') {
    return { error: 'Permission denied' };
  }

  alertRules[index] = {
    ...rule,
    ...updates,
    id: rule.id,
    createdBy: rule.createdBy,
    createdAt: rule.createdAt,
    updatedAt: new Date().toISOString(),
  };

  return alertRules[index];
}

/**
 * Delete an alert rule
 */
export function deleteAlertRule(ruleId, userId) {
  const index = alertRules.findIndex(r => r.id === ruleId);
  if (index === -1) return { error: 'Rule not found' };

  const rule = alertRules[index];
  if (rule.isPrebuilt) {
    return { error: 'Cannot delete prebuilt rules' };
  }

  alertRules.splice(index, 1);
  return { success: true };
}

/**
 * Get alert rules
 */
export function getAlertRules(filters = {}) {
  initializeAlertRules();
  
  let results = [...alertRules];

  if (filters.orgId) {
    results = results.filter(r => r.orgId === filters.orgId || r.orgId === 'system');
  }

  if (filters.type) {
    results = results.filter(r => r.type === filters.type);
  }

  if (filters.severity) {
    results = results.filter(r => r.severity === filters.severity);
  }

  if (filters.enabled !== undefined) {
    results = results.filter(r => r.enabled === filters.enabled);
  }

  return results;
}

/**
 * Evaluate and trigger alerts based on current metrics
 */
export function evaluateAlerts(orgId, currentMetrics) {
  const rules = getAlertRules({ orgId, enabled: true });
  const triggered = [];

  rules.forEach(rule => {
    const metricValue = currentMetrics[rule.metric];
    if (metricValue === undefined) return;

    let shouldTrigger = false;
    let calculatedValue = metricValue;

    // Calculate threshold based on unit
    let effectiveThreshold = rule.threshold;
    if (rule.thresholdUnit === 'percent' && currentMetrics[`${rule.metric}Limit`]) {
      effectiveThreshold = (rule.threshold / 100) * currentMetrics[`${rule.metric}Limit`];
      calculatedValue = (metricValue / currentMetrics[`${rule.metric}Limit`]) * 100;
    }

    // Evaluate condition
    switch (rule.operator) {
      case OPERATORS.GREATER_THAN:
        shouldTrigger = metricValue > effectiveThreshold;
        break;
      case OPERATORS.LESS_THAN:
        shouldTrigger = metricValue < effectiveThreshold;
        break;
      case OPERATORS.EQUALS:
        shouldTrigger = metricValue === effectiveThreshold;
        break;
      case OPERATORS.GREATER_OR_EQUAL:
        shouldTrigger = metricValue >= effectiveThreshold;
        break;
      case OPERATORS.LESS_OR_EQUAL:
        shouldTrigger = metricValue <= effectiveThreshold;
        break;
      case OPERATORS.PERCENT_CHANGE:
        if (currentMetrics[`${rule.metric}Previous`]) {
          const pctChange = ((metricValue - currentMetrics[`${rule.metric}Previous`]) / currentMetrics[`${rule.metric}Previous`]) * 100;
          shouldTrigger = Math.abs(pctChange) >= rule.threshold;
          calculatedValue = pctChange;
        }
        break;
    }

    // Check cooldown
    if (shouldTrigger && rule.lastTriggered) {
      const cooldownMs = (rule.cooldownMinutes || 60) * 60 * 1000;
      if (Date.now() - new Date(rule.lastTriggered).getTime() < cooldownMs) {
        shouldTrigger = false;
      }
    }

    if (shouldTrigger) {
      const alert = triggerAlert(rule, {
        orgId,
        metricValue,
        calculatedValue,
        threshold: rule.threshold,
        thresholdUnit: rule.thresholdUnit,
      });
      triggered.push(alert);

      // Update rule
      rule.lastTriggered = new Date().toISOString();
      rule.triggerCount++;
    }
  });

  return triggered;
}

/**
 * Trigger an alert
 */
export function triggerAlert(rule, context) {
  const alert = {
    id: `ALERT-${String(alertIdCounter++).padStart(8, '0')}`,
    ruleId: rule.id,
    ruleName: rule.name,
    type: rule.type,
    severity: rule.severity,
    status: ALERT_STATUS.ACTIVE,
    
    message: generateAlertMessage(rule, context),
    
    orgId: context.orgId,
    metric: rule.metric,
    metricValue: context.metricValue,
    calculatedValue: context.calculatedValue,
    threshold: context.threshold,
    thresholdUnit: context.thresholdUnit,
    operator: rule.operator,
    
    channels: rule.channels,
    recipients: rule.recipients,
    
    triggeredAt: new Date().toISOString(),
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    resolvedBy: null,
    
    snoozedUntil: null,
    notes: [],
  };

  triggeredAlerts.push(alert);

  // Keep only last 10000 alerts in memory
  if (triggeredAlerts.length > 10000) {
    triggeredAlerts = triggeredAlerts.slice(-10000);
  }

  return alert;
}

/**
 * Generate alert message
 */
function generateAlertMessage(rule, context) {
  const unitSuffix = context.thresholdUnit === 'percent' ? '%' : '';
  return `${rule.name}: ${rule.metric} is ${context.calculatedValue.toFixed(1)}${unitSuffix} (threshold: ${context.threshold}${unitSuffix})`;
}

/**
 * Get triggered alerts
 */
export function getTriggeredAlerts(filters = {}) {
  let results = [...triggeredAlerts];

  if (filters.orgId) {
    results = results.filter(a => a.orgId === filters.orgId);
  }

  if (filters.status) {
    results = results.filter(a => a.status === filters.status);
  }

  if (filters.severity) {
    results = results.filter(a => a.severity === filters.severity);
  }

  if (filters.startDate) {
    results = results.filter(a => new Date(a.triggeredAt) >= new Date(filters.startDate));
  }

  if (filters.endDate) {
    results = results.filter(a => new Date(a.triggeredAt) <= new Date(filters.endDate));
  }

  // Sort by triggered date descending
  results.sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));

  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const offset = (page - 1) * limit;

  return {
    alerts: results.slice(offset, offset + limit),
    pagination: {
      page,
      limit,
      total: results.length,
      totalPages: Math.ceil(results.length / limit),
    },
  };
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(alertId, userId, userName) {
  const alert = triggeredAlerts.find(a => a.id === alertId);
  if (!alert) return null;

  alert.status = ALERT_STATUS.ACKNOWLEDGED;
  alert.acknowledgedAt = new Date().toISOString();
  alert.acknowledgedBy = { userId, userName };

  return alert;
}

/**
 * Resolve an alert
 */
export function resolveAlert(alertId, userId, userName, notes = '') {
  const alert = triggeredAlerts.find(a => a.id === alertId);
  if (!alert) return null;

  alert.status = ALERT_STATUS.RESOLVED;
  alert.resolvedAt = new Date().toISOString();
  alert.resolvedBy = { userId, userName };
  if (notes) {
    alert.notes.push({
      text: notes,
      addedBy: userName,
      addedAt: new Date().toISOString(),
    });
  }

  return alert;
}

/**
 * Snooze an alert
 */
export function snoozeAlert(alertId, snoozeDurationMinutes) {
  const alert = triggeredAlerts.find(a => a.id === alertId);
  if (!alert) return null;

  alert.status = ALERT_STATUS.SNOOZED;
  alert.snoozedUntil = new Date(Date.now() + snoozeDurationMinutes * 60 * 1000).toISOString();

  return alert;
}

/**
 * Get alert statistics
 */
export function getAlertStats(orgId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const alerts = triggeredAlerts.filter(a => 
    a.orgId === orgId && new Date(a.triggeredAt) >= startDate
  );

  return {
    total: alerts.length,
    active: alerts.filter(a => a.status === ALERT_STATUS.ACTIVE).length,
    acknowledged: alerts.filter(a => a.status === ALERT_STATUS.ACKNOWLEDGED).length,
    resolved: alerts.filter(a => a.status === ALERT_STATUS.RESOLVED).length,
    bySeverity: {
      critical: alerts.filter(a => a.severity === ALERT_SEVERITY.CRITICAL).length,
      high: alerts.filter(a => a.severity === ALERT_SEVERITY.HIGH).length,
      medium: alerts.filter(a => a.severity === ALERT_SEVERITY.MEDIUM).length,
      low: alerts.filter(a => a.severity === ALERT_SEVERITY.LOW).length,
    },
    byType: alerts.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {}),
    avgResolutionTimeMinutes: calculateAvgResolutionTime(alerts),
  };
}

function calculateAvgResolutionTime(alerts) {
  const resolved = alerts.filter(a => a.resolvedAt);
  if (resolved.length === 0) return 0;
  
  const totalMinutes = resolved.reduce((sum, a) => {
    return sum + (new Date(a.resolvedAt) - new Date(a.triggeredAt)) / (1000 * 60);
  }, 0);
  
  return Math.round(totalMinutes / resolved.length);
}

// UI Translation keys
export const ALERTS_UI_KEYS = {
  title: 'Alerts & Monitoring',
  subtitle: 'Configure thresholds and receive real-time notifications',
  
  // Tabs
  activeAlerts: 'Active Alerts',
  alertRules: 'Alert Rules',
  alertHistory: 'History',
  
  // Actions
  createRule: 'Create Alert Rule',
  editRule: 'Edit Rule',
  deleteRule: 'Delete Rule',
  enableRule: 'Enable',
  disableRule: 'Disable',
  acknowledge: 'Acknowledge',
  resolve: 'Resolve',
  snooze: 'Snooze',
  viewDetails: 'View Details',
  
  // Form fields
  ruleName: 'Rule Name',
  ruleDescription: 'Description',
  alertType: 'Alert Type',
  metric: 'Metric',
  operator: 'Condition',
  threshold: 'Threshold',
  severity: 'Severity',
  channels: 'Notification Channels',
  cooldown: 'Cooldown Period',
  recipients: 'Recipients',
  
  // Alert types
  usageThreshold: 'Usage Threshold',
  budgetAlert: 'Budget Alert',
  anomalyDetection: 'Anomaly Detection',
  scheduleTrigger: 'Schedule Trigger',
  metricChange: 'Metric Change',
  securityAlert: 'Security Alert',
  complianceAlert: 'Compliance Alert',
  systemAlert: 'System Alert',
  
  // Operators
  greaterThan: 'Greater than',
  lessThan: 'Less than',
  equals: 'Equals',
  notEquals: 'Not equals',
  greaterOrEqual: 'Greater or equal',
  lessOrEqual: 'Less or equal',
  percentChange: 'Percent change',
  
  // Severity levels
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
  
  // Status
  active: 'Active',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
  snoozed: 'Snoozed',
  
  // Channels
  email: 'Email',
  sms: 'SMS',
  slack: 'Slack',
  teams: 'Microsoft Teams',
  webhook: 'Webhook',
  inApp: 'In-App',
  push: 'Push Notification',
  
  // Stats
  totalAlerts: 'Total Alerts',
  activeCount: 'Active',
  avgResolutionTime: 'Avg Resolution Time',
  minutes: 'minutes',
  
  // Snooze options
  snooze15m: '15 minutes',
  snooze1h: '1 hour',
  snooze4h: '4 hours',
  snooze24h: '24 hours',
  snoozeCustom: 'Custom',
  
  // Empty states
  noAlerts: 'No active alerts',
  noAlertsDescription: 'All systems operating normally',
  noRules: 'No alert rules configured',
  noRulesDescription: 'Create rules to monitor your usage and metrics',
  
  // Prebuilt
  prebuilt: 'Prebuilt',
  custom: 'Custom',
  
  // Time
  triggeredAt: 'Triggered',
  acknowledgedAt: 'Acknowledged',
  resolvedAt: 'Resolved',
  lastTriggered: 'Last Triggered',
  never: 'Never',
};

export default {
  ALERT_TYPES,
  ALERT_SEVERITY,
  ALERT_STATUS,
  NOTIFICATION_CHANNELS,
  OPERATORS,
  ALERTS_UI_KEYS,
  initializeAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  getAlertRules,
  evaluateAlerts,
  triggerAlert,
  getTriggeredAlerts,
  acknowledgeAlert,
  resolveAlert,
  snoozeAlert,
  getAlertStats,
};
