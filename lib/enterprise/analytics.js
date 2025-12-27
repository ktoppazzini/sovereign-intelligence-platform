// lib/enterprise/analytics.js
// [KT:ANALYTICS-v1.0] Enterprise Analytics & Telemetry System
// Real-time metrics, usage analytics, and business intelligence
// Supports custom events, funnels, cohorts, and predictive analytics

import Airtable from 'airtable';

const TAG = '[ENTERPRISE:ANALYTICS]';

// ============================================================================
// Airtable Configuration
// ============================================================================
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ''
);

// ============================================================================
// In-Memory Metrics Store (Replace with InfluxDB/TimescaleDB in production)
// ============================================================================
const metricsBuffer = [];
const counters = new Map();
const gauges = new Map();
const histograms = new Map();

// ============================================================================
// Metric Types
// ============================================================================
export const METRIC_TYPES = {
  COUNTER: 'counter', // Monotonically increasing (requests, errors)
  GAUGE: 'gauge', // Point-in-time value (active users, memory)
  HISTOGRAM: 'histogram', // Distribution (latencies, sizes)
  SUMMARY: 'summary', // Statistical summary with percentiles
};

// ============================================================================
// Event Categories
// ============================================================================
export const EVENT_CATEGORIES = {
  PAGE_VIEW: 'page_view',
  USER_ACTION: 'user_action',
  FEATURE_USAGE: 'feature_usage',
  ERROR: 'error',
  PERFORMANCE: 'performance',
  CONVERSION: 'conversion',
  ENGAGEMENT: 'engagement',
  SYSTEM: 'system',
};

// ============================================================================
// Pre-defined Metrics
// ============================================================================
export const STANDARD_METRICS = {
  // Request metrics
  http_requests_total: { type: 'counter', description: 'Total HTTP requests' },
  http_request_duration_ms: { type: 'histogram', description: 'Request duration in ms' },
  http_request_size_bytes: { type: 'histogram', description: 'Request size in bytes' },
  http_response_size_bytes: { type: 'histogram', description: 'Response size in bytes' },
  
  // Error metrics
  errors_total: { type: 'counter', description: 'Total errors' },
  error_rate: { type: 'gauge', description: 'Current error rate' },
  
  // User metrics
  active_users: { type: 'gauge', description: 'Currently active users' },
  daily_active_users: { type: 'gauge', description: 'Daily active users' },
  monthly_active_users: { type: 'gauge', description: 'Monthly active users' },
  sessions_total: { type: 'counter', description: 'Total sessions' },
  session_duration_seconds: { type: 'histogram', description: 'Session duration' },
  
  // Report metrics
  reports_generated_total: { type: 'counter', description: 'Total reports generated' },
  report_generation_time_ms: { type: 'histogram', description: 'Report generation time' },
  reports_exported_total: { type: 'counter', description: 'Total reports exported' },
  
  // AI metrics
  ai_requests_total: { type: 'counter', description: 'Total AI API requests' },
  ai_tokens_used_total: { type: 'counter', description: 'Total AI tokens consumed' },
  ai_latency_ms: { type: 'histogram', description: 'AI request latency' },
  
  // System metrics
  memory_usage_bytes: { type: 'gauge', description: 'Memory usage' },
  cpu_usage_percent: { type: 'gauge', description: 'CPU usage percentage' },
  database_connections: { type: 'gauge', description: 'Active DB connections' },
  cache_hit_rate: { type: 'gauge', description: 'Cache hit rate' },
};

// ============================================================================
// Counter Operations
// ============================================================================

/**
 * Increment a counter metric
 */
export function incrementCounter(name, value = 1, labels = {}) {
  const key = generateKey(name, labels);
  const current = counters.get(key) || { value: 0, labels };
  current.value += value;
  current.lastUpdated = Date.now();
  counters.set(key, current);
  
  // Buffer for batch persistence
  bufferMetric({
    name,
    type: 'counter',
    value: current.value,
    labels,
    timestamp: Date.now(),
  });
  
  return current.value;
}

/**
 * Get counter value
 */
export function getCounter(name, labels = {}) {
  const key = generateKey(name, labels);
  return counters.get(key)?.value || 0;
}

// ============================================================================
// Gauge Operations
// ============================================================================

/**
 * Set a gauge metric
 */
export function setGauge(name, value, labels = {}) {
  const key = generateKey(name, labels);
  gauges.set(key, {
    value,
    labels,
    lastUpdated: Date.now(),
  });
  
  bufferMetric({
    name,
    type: 'gauge',
    value,
    labels,
    timestamp: Date.now(),
  });
  
  return value;
}

/**
 * Increment/decrement a gauge
 */
export function adjustGauge(name, delta, labels = {}) {
  const key = generateKey(name, labels);
  const current = gauges.get(key)?.value || 0;
  return setGauge(name, current + delta, labels);
}

/**
 * Get gauge value
 */
export function getGauge(name, labels = {}) {
  const key = generateKey(name, labels);
  return gauges.get(key)?.value || 0;
}

// ============================================================================
// Histogram Operations
// ============================================================================

/**
 * Record a histogram observation
 */
export function recordHistogram(name, value, labels = {}) {
  const key = generateKey(name, labels);
  let histogram = histograms.get(key);
  
  if (!histogram) {
    histogram = {
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      values: [],
      labels,
    };
  }
  
  histogram.count++;
  histogram.sum += value;
  histogram.min = Math.min(histogram.min, value);
  histogram.max = Math.max(histogram.max, value);
  histogram.values.push(value);
  histogram.lastUpdated = Date.now();
  
  // Keep only last 1000 values for percentile calculation
  if (histogram.values.length > 1000) {
    histogram.values = histogram.values.slice(-1000);
  }
  
  histograms.set(key, histogram);
  
  bufferMetric({
    name,
    type: 'histogram',
    value,
    labels,
    timestamp: Date.now(),
  });
  
  return histogram;
}

/**
 * Get histogram statistics
 */
export function getHistogramStats(name, labels = {}) {
  const key = generateKey(name, labels);
  const histogram = histograms.get(key);
  
  if (!histogram || histogram.count === 0) {
    return null;
  }
  
  const sorted = [...histogram.values].sort((a, b) => a - b);
  
  return {
    count: histogram.count,
    sum: histogram.sum,
    mean: histogram.sum / histogram.count,
    min: histogram.min,
    max: histogram.max,
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

// ============================================================================
// Event Tracking
// ============================================================================

/**
 * Track an analytics event
 */
export async function trackEvent({
  eventName,
  category = 'user_action',
  organizationId,
  userId,
  sessionId,
  properties = {},
  timestamp = Date.now(),
}) {
  const event = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    eventName,
    category,
    organizationId,
    userId,
    sessionId,
    properties,
    timestamp,
    receivedAt: Date.now(),
  };
  
  // Buffer for batch persistence
  bufferEvent(event);
  
  // Update relevant counters
  incrementCounter(`events_${category}_total`, 1, { event: eventName });
  incrementCounter('events_total', 1, { organizationId });
  
  return event;
}

/**
 * Track page view
 */
export async function trackPageView({
  organizationId,
  userId,
  sessionId,
  page,
  referrer,
  userAgent,
  duration,
}) {
  return trackEvent({
    eventName: 'page_view',
    category: EVENT_CATEGORIES.PAGE_VIEW,
    organizationId,
    userId,
    sessionId,
    properties: { page, referrer, userAgent, duration },
  });
}

/**
 * Track feature usage
 */
export async function trackFeatureUsage({
  organizationId,
  userId,
  featureName,
  featureCategory,
  metadata = {},
}) {
  incrementCounter('feature_usage_total', 1, { feature: featureName });
  
  return trackEvent({
    eventName: 'feature_used',
    category: EVENT_CATEGORIES.FEATURE_USAGE,
    organizationId,
    userId,
    properties: { featureName, featureCategory, ...metadata },
  });
}

/**
 * Track error
 */
export async function trackError({
  organizationId,
  userId,
  errorType,
  errorMessage,
  stackTrace,
  context = {},
}) {
  incrementCounter('errors_total', 1, { type: errorType });
  
  return trackEvent({
    eventName: 'error',
    category: EVENT_CATEGORIES.ERROR,
    organizationId,
    userId,
    properties: { errorType, errorMessage, stackTrace, context },
  });
}

/**
 * Track performance metric
 */
export async function trackPerformance({
  organizationId,
  metricName,
  value,
  unit,
  context = {},
}) {
  recordHistogram(`performance_${metricName}`, value, { unit });
  
  return trackEvent({
    eventName: 'performance',
    category: EVENT_CATEGORIES.PERFORMANCE,
    organizationId,
    properties: { metricName, value, unit, context },
  });
}

/**
 * Track conversion
 */
export async function trackConversion({
  organizationId,
  userId,
  conversionType, // signup, subscription, upgrade, etc.
  conversionValue,
  currency = 'USD',
  metadata = {},
}) {
  incrementCounter('conversions_total', 1, { type: conversionType });
  incrementCounter('conversion_value_total', conversionValue, { currency });
  
  return trackEvent({
    eventName: 'conversion',
    category: EVENT_CATEGORIES.CONVERSION,
    organizationId,
    userId,
    properties: { conversionType, conversionValue, currency, ...metadata },
  });
}

// ============================================================================
// Session Management
// ============================================================================

const sessions = new Map();

/**
 * Start a new session
 */
export function startSession({
  organizationId,
  userId,
  userAgent,
  ipAddress,
  referrer,
}) {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const session = {
    sessionId,
    organizationId,
    userId,
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
    userAgent,
    ipAddress,
    referrer,
    pageViews: 0,
    events: 0,
    isActive: true,
  };
  
  sessions.set(sessionId, session);
  incrementCounter('sessions_total', 1, { organizationId });
  adjustGauge('active_sessions', 1, { organizationId });
  
  return session;
}

/**
 * Update session activity
 */
export function updateSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivityAt = Date.now();
    session.events++;
  }
  return session;
}

/**
 * End a session
 */
export function endSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session && session.isActive) {
    session.isActive = false;
    session.endedAt = Date.now();
    session.duration = session.endedAt - session.startedAt;
    
    adjustGauge('active_sessions', -1, { organizationId: session.organizationId });
    recordHistogram('session_duration_seconds', session.duration / 1000);
  }
  return session;
}

// ============================================================================
// Dashboard Metrics
// ============================================================================

/**
 * Get real-time dashboard metrics
 */
export function getDashboardMetrics(organizationId) {
  const orgLabels = { organizationId };
  
  return {
    timestamp: Date.now(),
    
    // User metrics
    activeSessions: getGauge('active_sessions', orgLabels),
    dailyActiveUsers: getGauge('daily_active_users', orgLabels),
    monthlyActiveUsers: getGauge('monthly_active_users', orgLabels),
    
    // Usage metrics
    totalReports: getCounter('reports_generated_total', orgLabels),
    totalExports: getCounter('reports_exported_total', orgLabels),
    totalApiCalls: getCounter('api_calls_total', orgLabels),
    totalAiTokens: getCounter('ai_tokens_used_total', orgLabels),
    
    // Performance
    avgReportGenerationTime: getHistogramStats('report_generation_time_ms', orgLabels),
    avgAiLatency: getHistogramStats('ai_latency_ms', orgLabels),
    avgResponseTime: getHistogramStats('http_request_duration_ms', orgLabels),
    
    // Errors
    totalErrors: getCounter('errors_total', orgLabels),
    errorRate: getGauge('error_rate', orgLabels),
    
    // Conversions
    totalConversions: getCounter('conversions_total', orgLabels),
  };
}

/**
 * Get time-series metrics
 */
export async function getTimeSeriesMetrics({
  organizationId,
  metricName,
  startTime,
  endTime,
  interval = '1h', // 1m, 5m, 15m, 1h, 1d
}) {
  // In production, this would query TimescaleDB/InfluxDB
  // For now, aggregate from buffer
  
  const intervalMs = parseInterval(interval);
  const buckets = [];
  
  let current = startTime;
  while (current < endTime) {
    buckets.push({
      timestamp: current,
      value: 0,
      count: 0,
    });
    current += intervalMs;
  }
  
  // Aggregate metrics from buffer
  const relevantMetrics = metricsBuffer.filter(m =>
    m.name === metricName &&
    m.timestamp >= startTime &&
    m.timestamp <= endTime &&
    (!organizationId || m.labels?.organizationId === organizationId)
  );
  
  relevantMetrics.forEach(metric => {
    const bucketIndex = Math.floor((metric.timestamp - startTime) / intervalMs);
    if (buckets[bucketIndex]) {
      buckets[bucketIndex].value += metric.value;
      buckets[bucketIndex].count++;
    }
  });
  
  return {
    metricName,
    interval,
    startTime,
    endTime,
    data: buckets,
  };
}

// ============================================================================
// Funnel Analysis
// ============================================================================

/**
 * Define a conversion funnel
 */
export async function analyzeFunnel({
  organizationId,
  funnelName,
  steps, // Array of event names in order
  startDate,
  endDate,
}) {
  // In production, query event store
  // For now, return mock funnel data
  
  const stepResults = steps.map((step, index) => {
    const baseCount = 1000 - (index * 200); // Simulate drop-off
    return {
      step: index + 1,
      eventName: step,
      count: Math.max(baseCount, 100),
      conversionRate: index === 0 ? 100 : ((baseCount / (1000 - ((index - 1) * 200))) * 100).toFixed(1),
    };
  });
  
  return {
    funnelName,
    organizationId,
    period: { startDate, endDate },
    steps: stepResults,
    overallConversion: ((stepResults[stepResults.length - 1]?.count / stepResults[0]?.count) * 100).toFixed(1),
  };
}

// ============================================================================
// Cohort Analysis
// ============================================================================

/**
 * Generate cohort retention analysis
 */
export async function analyzeCohort({
  organizationId,
  cohortType = 'weekly', // weekly, monthly
  metric = 'active_users',
  periods = 8,
}) {
  // In production, query user activity data
  // For now, return simulated cohort data
  
  const cohorts = [];
  const now = new Date();
  
  for (let i = periods - 1; i >= 0; i--) {
    const cohortDate = new Date(now);
    if (cohortType === 'weekly') {
      cohortDate.setDate(cohortDate.getDate() - (i * 7));
    } else {
      cohortDate.setMonth(cohortDate.getMonth() - i);
    }
    
    const retention = [];
    const initialUsers = Math.floor(100 + Math.random() * 50);
    
    for (let j = 0; j <= periods - i - 1; j++) {
      const retentionRate = Math.pow(0.85, j); // Simulate 15% drop-off per period
      retention.push({
        period: j,
        users: Math.floor(initialUsers * retentionRate),
        rate: (retentionRate * 100).toFixed(1),
      });
    }
    
    cohorts.push({
      cohortDate: cohortDate.toISOString().split('T')[0],
      initialUsers,
      retention,
    });
  }
  
  return {
    organizationId,
    cohortType,
    metric,
    cohorts,
    averageRetention: cohorts.map((c, i) => ({
      period: i,
      rate: (cohorts.reduce((sum, coh) => {
        const ret = coh.retention[i];
        return sum + (ret ? parseFloat(ret.rate) : 0);
      }, 0) / cohorts.filter(c => c.retention[i]).length).toFixed(1),
    })),
  };
}

// ============================================================================
// Business Intelligence
// ============================================================================

/**
 * Generate usage report for billing/business purposes
 */
export async function generateUsageReport({
  organizationId,
  startDate,
  endDate,
}) {
  const metrics = getDashboardMetrics(organizationId);
  
  return {
    organizationId,
    period: { startDate, endDate },
    generatedAt: new Date().toISOString(),
    
    summary: {
      totalReports: metrics.totalReports,
      totalExports: metrics.totalExports,
      totalApiCalls: metrics.totalApiCalls,
      totalAiTokens: metrics.totalAiTokens,
      uniqueUsers: metrics.monthlyActiveUsers,
    },
    
    performance: {
      avgResponseTime: metrics.avgResponseTime?.mean || 0,
      p95ResponseTime: metrics.avgResponseTime?.p95 || 0,
      errorRate: metrics.errorRate,
      uptime: '99.95%', // Would be calculated from actual data
    },
    
    billing: {
      baseUsage: {
        reports: metrics.totalReports,
        apiCalls: metrics.totalApiCalls,
        aiTokens: metrics.totalAiTokens,
      },
      // Overage calculations would go here
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateKey(name, labels) {
  const labelStr = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
  return labelStr ? `${name}{${labelStr}}` : name;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function parseInterval(interval) {
  const match = interval.match(/^(\d+)([mhd])$/);
  if (!match) return 60 * 60 * 1000; // Default 1 hour
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000;
  }
}

// ============================================================================
// Buffering & Persistence
// ============================================================================

const eventBuffer = [];
const BUFFER_SIZE = 100;
const FLUSH_INTERVAL = 30000; // 30 seconds

function bufferMetric(metric) {
  metricsBuffer.push(metric);
  
  // Keep buffer size manageable
  if (metricsBuffer.length > 10000) {
    metricsBuffer.splice(0, 5000);
  }
}

function bufferEvent(event) {
  eventBuffer.push(event);
  
  if (eventBuffer.length >= BUFFER_SIZE) {
    flushEvents();
  }
}

async function flushEvents() {
  if (eventBuffer.length === 0) return;
  
  const events = eventBuffer.splice(0, BUFFER_SIZE);
  
  try {
    // Batch insert to Airtable
    const records = events.map(event => ({
      fields: {
        'Event ID': event.eventId,
        'Event Name': event.eventName,
        'Category': event.category,
        'Organization ID': event.organizationId || '',
        'User ID': event.userId || '',
        'Session ID': event.sessionId || '',
        'Properties': JSON.stringify(event.properties),
        'Timestamp': new Date(event.timestamp).toISOString(),
      },
    }));
    
    // Airtable batch insert (max 10 records)
    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10);
      await base('Analytics Events').create(batch.map(r => r.fields));
    }
    
    console.log(TAG, 'flushEvents.complete', { count: events.length });
  } catch (error) {
    console.error(TAG, 'flushEvents.error', error);
    // Re-add events to buffer on failure
    eventBuffer.unshift(...events);
  }
}

// Periodic flush
if (typeof setInterval !== 'undefined') {
  setInterval(flushEvents, FLUSH_INTERVAL);
}

export default {
  METRIC_TYPES,
  EVENT_CATEGORIES,
  STANDARD_METRICS,
  incrementCounter,
  getCounter,
  setGauge,
  adjustGauge,
  getGauge,
  recordHistogram,
  getHistogramStats,
  trackEvent,
  trackPageView,
  trackFeatureUsage,
  trackError,
  trackPerformance,
  trackConversion,
  startSession,
  updateSession,
  endSession,
  getDashboardMetrics,
  getTimeSeriesMetrics,
  analyzeFunnel,
  analyzeCohort,
  generateUsageReport,
};
