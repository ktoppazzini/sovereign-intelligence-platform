// lib/enterprise/backgroundJobs.js
// [KT:BACKGROUND-JOBS-v1.0] Enterprise Background Job Queue
// Async processing for heavy tasks, scheduled jobs, and retryable operations
// Supports priorities, delays, recurring schedules, and dead-letter queues

import Airtable from 'airtable';
import crypto from 'crypto';

const TAG = '[ENTERPRISE:JOBS]';

// ============================================================================
// Airtable Configuration
// ============================================================================
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ''
);

// ============================================================================
// Job Status & Priorities
// ============================================================================
export const JOB_STATUS = {
  PENDING: 'pending',
  SCHEDULED: 'scheduled',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DEAD: 'dead', // Moved to dead-letter queue
  CANCELLED: 'cancelled',
};

export const JOB_PRIORITY = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  CRITICAL: 100,
};

// ============================================================================
// Job Types
// ============================================================================
export const JOB_TYPES = {
  // Report jobs
  GENERATE_REPORT: {
    name: 'Generate Report',
    handler: 'generateReport',
    timeout: 300000, // 5 minutes
    retries: 3,
    priority: JOB_PRIORITY.NORMAL,
  },
  EXPORT_PDF: {
    name: 'Export PDF',
    handler: 'exportPdf',
    timeout: 120000, // 2 minutes
    retries: 3,
    priority: JOB_PRIORITY.NORMAL,
  },
  BULK_EXPORT: {
    name: 'Bulk Export',
    handler: 'bulkExport',
    timeout: 600000, // 10 minutes
    retries: 2,
    priority: JOB_PRIORITY.LOW,
  },
  
  // Email jobs
  SEND_EMAIL: {
    name: 'Send Email',
    handler: 'sendEmail',
    timeout: 30000,
    retries: 5,
    priority: JOB_PRIORITY.HIGH,
  },
  SEND_BULK_EMAIL: {
    name: 'Send Bulk Email',
    handler: 'sendBulkEmail',
    timeout: 300000,
    retries: 3,
    priority: JOB_PRIORITY.NORMAL,
  },
  
  // Data processing jobs
  SYNC_DATA: {
    name: 'Sync Data',
    handler: 'syncData',
    timeout: 300000,
    retries: 3,
    priority: JOB_PRIORITY.NORMAL,
  },
  IMPORT_DATA: {
    name: 'Import Data',
    handler: 'importData',
    timeout: 600000,
    retries: 2,
    priority: JOB_PRIORITY.LOW,
  },
  CLEANUP_OLD_DATA: {
    name: 'Cleanup Old Data',
    handler: 'cleanupOldData',
    timeout: 300000,
    retries: 1,
    priority: JOB_PRIORITY.LOW,
  },
  
  // AI jobs
  AI_ANALYSIS: {
    name: 'AI Analysis',
    handler: 'runAiAnalysis',
    timeout: 180000, // 3 minutes
    retries: 3,
    priority: JOB_PRIORITY.NORMAL,
  },
  AI_BATCH_PROCESS: {
    name: 'AI Batch Process',
    handler: 'aiBatchProcess',
    timeout: 600000,
    retries: 2,
    priority: JOB_PRIORITY.LOW,
  },
  
  // Notification jobs
  SEND_NOTIFICATION: {
    name: 'Send Notification',
    handler: 'sendNotification',
    timeout: 30000,
    retries: 3,
    priority: JOB_PRIORITY.HIGH,
  },
  TRIGGER_WEBHOOK: {
    name: 'Trigger Webhook',
    handler: 'triggerWebhook',
    timeout: 60000,
    retries: 5,
    priority: JOB_PRIORITY.NORMAL,
  },
  
  // Billing jobs
  PROCESS_USAGE: {
    name: 'Process Usage',
    handler: 'processUsage',
    timeout: 120000,
    retries: 3,
    priority: JOB_PRIORITY.HIGH,
  },
  GENERATE_INVOICE: {
    name: 'Generate Invoice',
    handler: 'generateInvoice',
    timeout: 60000,
    retries: 3,
    priority: JOB_PRIORITY.HIGH,
  },
  
  // Analytics jobs
  AGGREGATE_METRICS: {
    name: 'Aggregate Metrics',
    handler: 'aggregateMetrics',
    timeout: 300000,
    retries: 2,
    priority: JOB_PRIORITY.LOW,
  },
  GENERATE_ANALYTICS_REPORT: {
    name: 'Generate Analytics Report',
    handler: 'generateAnalyticsReport',
    timeout: 300000,
    retries: 2,
    priority: JOB_PRIORITY.LOW,
  },
};

// ============================================================================
// In-Memory Queue (Replace with Redis/SQS in production)
// ============================================================================
const jobQueue = [];
const runningJobs = new Map();
const scheduledJobs = new Map();
let isProcessing = false;

// ============================================================================
// Job Creation
// ============================================================================

/**
 * Create and enqueue a new job
 */
export async function enqueue({
  type,
  data = {},
  organizationId,
  userId,
  priority = null,
  delay = 0, // Delay in milliseconds
  scheduledFor = null, // ISO timestamp
  idempotencyKey = null,
  metadata = {},
}) {
  const jobType = JOB_TYPES[type];
  if (!jobType) {
    throw new Error(`Invalid job type: ${type}`);
  }
  
  const jobId = idempotencyKey || `job_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  
  // Check for duplicate idempotency key
  if (idempotencyKey) {
    const existing = await getJob(idempotencyKey);
    if (existing && existing.status !== JOB_STATUS.FAILED) {
      console.log(TAG, 'enqueue.duplicate', { jobId, status: existing.status });
      return existing;
    }
  }
  
  const now = Date.now();
  const runAt = scheduledFor 
    ? new Date(scheduledFor).getTime() 
    : (delay > 0 ? now + delay : now);
  
  const job = {
    id: jobId,
    type,
    typeName: jobType.name,
    handler: jobType.handler,
    data,
    organizationId: organizationId || null,
    userId: userId || null,
    priority: priority || jobType.priority,
    status: runAt > now ? JOB_STATUS.SCHEDULED : JOB_STATUS.PENDING,
    attempts: 0,
    maxRetries: jobType.retries,
    timeout: jobType.timeout,
    runAt,
    createdAt: now,
    metadata,
    result: null,
    error: null,
  };
  
  console.log(TAG, 'enqueue', { jobId, type, priority: job.priority, runAt: new Date(runAt).toISOString() });
  
  // Store in Airtable
  try {
    await base('Jobs').create({
      'Job ID': jobId,
      'Type': type,
      'Handler': jobType.handler,
      'Data': JSON.stringify(data),
      'Organization ID': organizationId || '',
      'User ID': userId || '',
      'Priority': job.priority,
      'Status': job.status,
      'Attempts': 0,
      'Max Retries': jobType.retries,
      'Timeout': jobType.timeout,
      'Run At': new Date(runAt).toISOString(),
      'Created At': new Date(now).toISOString(),
      'Metadata': JSON.stringify(metadata),
    });
  } catch (error) {
    console.error(TAG, 'enqueue.airtable.error', error);
  }
  
  // Add to in-memory queue
  if (job.status === JOB_STATUS.SCHEDULED) {
    scheduleJob(job);
  } else {
    addToQueue(job);
  }
  
  // Trigger processing
  processQueue();
  
  return {
    id: jobId,
    type,
    status: job.status,
    runAt: new Date(runAt).toISOString(),
  };
}

/**
 * Create a recurring job
 */
export async function scheduleRecurring({
  type,
  data = {},
  organizationId,
  schedule, // Cron expression or interval
  name,
  enabled = true,
}) {
  const scheduleId = `sched_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  console.log(TAG, 'scheduleRecurring', { scheduleId, type, schedule });
  
  try {
    await base('Scheduled Jobs').create({
      'Schedule ID': scheduleId,
      'Name': name || `${type} - Recurring`,
      'Type': type,
      'Data': JSON.stringify(data),
      'Organization ID': organizationId || '',
      'Schedule': schedule,
      'Enabled': enabled,
      'Last Run': null,
      'Next Run': calculateNextRun(schedule),
      'Created At': new Date().toISOString(),
    });
  } catch (error) {
    console.error(TAG, 'scheduleRecurring.error', error);
    throw error;
  }
  
  return {
    id: scheduleId,
    type,
    schedule,
    enabled,
    nextRun: calculateNextRun(schedule),
  };
}

// ============================================================================
// Job Management
// ============================================================================

/**
 * Get job by ID
 */
export async function getJob(jobId) {
  // Check in-memory first
  const inMemory = jobQueue.find(j => j.id === jobId) || runningJobs.get(jobId);
  if (inMemory) {
    return formatJob(inMemory);
  }
  
  // Check Airtable
  try {
    const records = await base('Jobs')
      .select({
        filterByFormula: `{Job ID} = "${jobId}"`,
        maxRecords: 1,
      })
      .firstPage();
    
    if (records.length === 0) return null;
    
    const record = records[0];
    return {
      id: record.fields['Job ID'],
      recordId: record.id,
      type: record.fields['Type'],
      handler: record.fields['Handler'],
      data: JSON.parse(record.fields['Data'] || '{}'),
      organizationId: record.fields['Organization ID'],
      userId: record.fields['User ID'],
      priority: record.fields['Priority'],
      status: record.fields['Status'],
      attempts: record.fields['Attempts'],
      maxRetries: record.fields['Max Retries'],
      result: record.fields['Result'] ? JSON.parse(record.fields['Result']) : null,
      error: record.fields['Error'],
      runAt: record.fields['Run At'],
      startedAt: record.fields['Started At'],
      completedAt: record.fields['Completed At'],
      createdAt: record.fields['Created At'],
    };
  } catch (error) {
    console.error(TAG, 'getJob.error', error);
    throw error;
  }
}

/**
 * List jobs
 */
export async function listJobs(options = {}) {
  const { organizationId, status, type, limit = 50 } = options;
  
  try {
    const filters = [];
    if (organizationId) filters.push(`{Organization ID} = "${organizationId}"`);
    if (status) filters.push(`{Status} = "${status}"`);
    if (type) filters.push(`{Type} = "${type}"`);
    
    const formula = filters.length > 0 ? `AND(${filters.join(', ')})` : '';
    
    const records = await base('Jobs')
      .select({
        filterByFormula: formula || undefined,
        maxRecords: limit,
        sort: [{ field: 'Created At', direction: 'desc' }],
      })
      .firstPage();
    
    return records.map(record => ({
      id: record.fields['Job ID'],
      type: record.fields['Type'],
      status: record.fields['Status'],
      priority: record.fields['Priority'],
      attempts: record.fields['Attempts'],
      error: record.fields['Error'],
      createdAt: record.fields['Created At'],
      completedAt: record.fields['Completed At'],
    }));
  } catch (error) {
    console.error(TAG, 'listJobs.error', error);
    throw error;
  }
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId) {
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');
  
  if ([JOB_STATUS.COMPLETED, JOB_STATUS.CANCELLED, JOB_STATUS.RUNNING].includes(job.status)) {
    throw new Error(`Cannot cancel job in ${job.status} status`);
  }
  
  // Remove from queues
  const queueIndex = jobQueue.findIndex(j => j.id === jobId);
  if (queueIndex >= 0) {
    jobQueue.splice(queueIndex, 1);
  }
  scheduledJobs.delete(jobId);
  
  // Update Airtable
  if (job.recordId) {
    try {
      await base('Jobs').update(job.recordId, {
        'Status': JOB_STATUS.CANCELLED,
        'Cancelled At': new Date().toISOString(),
      });
    } catch (error) {
      console.error(TAG, 'cancelJob.airtable.error', error);
    }
  }
  
  return { jobId, status: JOB_STATUS.CANCELLED };
}

/**
 * Retry a failed job
 */
export async function retryJob(jobId) {
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');
  
  if (job.status !== JOB_STATUS.FAILED && job.status !== JOB_STATUS.DEAD) {
    throw new Error('Can only retry failed or dead jobs');
  }
  
  // Create new job with same parameters
  return enqueue({
    type: job.type,
    data: job.data,
    organizationId: job.organizationId,
    userId: job.userId,
    priority: job.priority,
    metadata: { ...job.metadata, retriedFrom: jobId },
  });
}

// ============================================================================
// Queue Processing
// ============================================================================

/**
 * Add job to queue (sorted by priority and runAt)
 */
function addToQueue(job) {
  // Insert in sorted position
  let inserted = false;
  for (let i = 0; i < jobQueue.length; i++) {
    if (job.priority > jobQueue[i].priority || 
        (job.priority === jobQueue[i].priority && job.runAt < jobQueue[i].runAt)) {
      jobQueue.splice(i, 0, job);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    jobQueue.push(job);
  }
}

/**
 * Schedule a delayed job
 */
function scheduleJob(job) {
  const delay = Math.max(0, job.runAt - Date.now());
  
  const timeout = setTimeout(() => {
    scheduledJobs.delete(job.id);
    job.status = JOB_STATUS.PENDING;
    addToQueue(job);
    processQueue();
  }, delay);
  
  scheduledJobs.set(job.id, { job, timeout });
}

/**
 * Process the job queue
 */
async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;
  
  try {
    while (jobQueue.length > 0) {
      const job = jobQueue.shift();
      if (!job) break;
      
      // Skip if not ready
      if (job.runAt > Date.now()) {
        scheduleJob(job);
        continue;
      }
      
      await executeJob(job);
    }
  } finally {
    isProcessing = false;
  }
}

/**
 * Execute a single job
 */
async function executeJob(job) {
  console.log(TAG, 'executeJob.start', { jobId: job.id, type: job.type, attempt: job.attempts + 1 });
  
  job.status = JOB_STATUS.RUNNING;
  job.attempts++;
  job.startedAt = Date.now();
  runningJobs.set(job.id, job);
  
  // Update status in Airtable
  await updateJobStatus(job.id, {
    status: JOB_STATUS.RUNNING,
    attempts: job.attempts,
    startedAt: new Date(job.startedAt).toISOString(),
  });
  
  try {
    // Set up timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Job timeout')), job.timeout);
    });
    
    // Get and execute handler
    const handler = JOB_HANDLERS[job.handler];
    if (!handler) {
      throw new Error(`Handler not found: ${job.handler}`);
    }
    
    const result = await Promise.race([
      handler(job.data, job),
      timeoutPromise,
    ]);
    
    // Success
    job.status = JOB_STATUS.COMPLETED;
    job.result = result;
    job.completedAt = Date.now();
    
    console.log(TAG, 'executeJob.success', { jobId: job.id, duration: job.completedAt - job.startedAt });
    
    await updateJobStatus(job.id, {
      status: JOB_STATUS.COMPLETED,
      result: JSON.stringify(result),
      completedAt: new Date(job.completedAt).toISOString(),
    });
  } catch (error) {
    console.error(TAG, 'executeJob.error', { jobId: job.id, error: error.message });
    
    job.error = error.message;
    
    // Retry or fail
    if (job.attempts < job.maxRetries) {
      // Calculate backoff delay
      const backoffDelay = Math.min(30000 * Math.pow(2, job.attempts - 1), 300000);
      job.status = JOB_STATUS.SCHEDULED;
      job.runAt = Date.now() + backoffDelay;
      
      console.log(TAG, 'executeJob.retry', { jobId: job.id, attempt: job.attempts, nextRunIn: backoffDelay });
      
      await updateJobStatus(job.id, {
        status: JOB_STATUS.SCHEDULED,
        error: error.message,
        runAt: new Date(job.runAt).toISOString(),
      });
      
      scheduleJob(job);
    } else {
      // Move to dead letter queue
      job.status = JOB_STATUS.DEAD;
      job.completedAt = Date.now();
      
      console.error(TAG, 'executeJob.dead', { jobId: job.id, attempts: job.attempts });
      
      await updateJobStatus(job.id, {
        status: JOB_STATUS.DEAD,
        error: error.message,
        completedAt: new Date(job.completedAt).toISOString(),
      });
    }
  } finally {
    runningJobs.delete(job.id);
  }
}

/**
 * Update job status in Airtable
 */
async function updateJobStatus(jobId, updates) {
  try {
    const records = await base('Jobs')
      .select({
        filterByFormula: `{Job ID} = "${jobId}"`,
        maxRecords: 1,
      })
      .firstPage();
    
    if (records.length > 0) {
      const fields = {};
      if (updates.status) fields['Status'] = updates.status;
      if (updates.attempts) fields['Attempts'] = updates.attempts;
      if (updates.error) fields['Error'] = updates.error;
      if (updates.result) fields['Result'] = updates.result;
      if (updates.startedAt) fields['Started At'] = updates.startedAt;
      if (updates.completedAt) fields['Completed At'] = updates.completedAt;
      if (updates.runAt) fields['Run At'] = updates.runAt;
      
      await base('Jobs').update(records[0].id, fields);
    }
  } catch (error) {
    console.error(TAG, 'updateJobStatus.error', error);
  }
}

// ============================================================================
// Job Handlers
// ============================================================================

const JOB_HANDLERS = {
  // Report handlers
  async generateReport(data, job) {
    console.log(TAG, 'handler.generateReport', { reportId: data.reportId });
    // Simulate report generation
    await sleep(2000);
    return { reportId: data.reportId, status: 'generated' };
  },
  
  async exportPdf(data, job) {
    console.log(TAG, 'handler.exportPdf', { reportId: data.reportId });
    await sleep(1000);
    return { reportId: data.reportId, pdfUrl: `/exports/${data.reportId}.pdf` };
  },
  
  async bulkExport(data, job) {
    console.log(TAG, 'handler.bulkExport', { count: data.reportIds?.length });
    await sleep(5000);
    return { exported: data.reportIds?.length || 0 };
  },
  
  // Email handlers
  async sendEmail(data, job) {
    console.log(TAG, 'handler.sendEmail', { to: data.to });
    // In production, call email service
    return { sent: true, to: data.to };
  },
  
  async sendBulkEmail(data, job) {
    console.log(TAG, 'handler.sendBulkEmail', { count: data.recipients?.length });
    return { sent: data.recipients?.length || 0 };
  },
  
  // Data handlers
  async syncData(data, job) {
    console.log(TAG, 'handler.syncData', { source: data.source });
    await sleep(3000);
    return { synced: true, records: 100 };
  },
  
  async importData(data, job) {
    console.log(TAG, 'handler.importData', { source: data.source });
    await sleep(5000);
    return { imported: 500 };
  },
  
  async cleanupOldData(data, job) {
    console.log(TAG, 'handler.cleanupOldData', { olderThan: data.olderThan });
    return { deleted: 50 };
  },
  
  // AI handlers
  async runAiAnalysis(data, job) {
    console.log(TAG, 'handler.runAiAnalysis', { type: data.analysisType });
    await sleep(3000);
    return { analysis: 'completed', insights: 5 };
  },
  
  async aiBatchProcess(data, job) {
    console.log(TAG, 'handler.aiBatchProcess', { items: data.items?.length });
    await sleep(10000);
    return { processed: data.items?.length || 0 };
  },
  
  // Notification handlers
  async sendNotification(data, job) {
    console.log(TAG, 'handler.sendNotification', { type: data.type });
    // Call notification service
    return { sent: true };
  },
  
  async triggerWebhook(data, job) {
    console.log(TAG, 'handler.triggerWebhook', { event: data.event });
    // Call webhook service
    return { triggered: true };
  },
  
  // Billing handlers
  async processUsage(data, job) {
    console.log(TAG, 'handler.processUsage', { organizationId: data.organizationId });
    return { processed: true };
  },
  
  async generateInvoice(data, job) {
    console.log(TAG, 'handler.generateInvoice', { customerId: data.customerId });
    return { invoiceId: `inv_${Date.now()}` };
  },
  
  // Analytics handlers
  async aggregateMetrics(data, job) {
    console.log(TAG, 'handler.aggregateMetrics', { period: data.period });
    return { aggregated: true };
  },
  
  async generateAnalyticsReport(data, job) {
    console.log(TAG, 'handler.generateAnalyticsReport', { type: data.reportType });
    return { reportUrl: '/analytics/report.pdf' };
  },
};

/**
 * Register a custom job handler
 */
export function registerHandler(name, handler) {
  JOB_HANDLERS[name] = handler;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatJob(job) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    priority: job.priority,
    attempts: job.attempts,
    maxRetries: job.maxRetries,
    result: job.result,
    error: job.error,
    runAt: job.runAt ? new Date(job.runAt).toISOString() : null,
    startedAt: job.startedAt ? new Date(job.startedAt).toISOString() : null,
    completedAt: job.completedAt ? new Date(job.completedAt).toISOString() : null,
    createdAt: job.createdAt ? new Date(job.createdAt).toISOString() : null,
  };
}

function calculateNextRun(schedule) {
  // Simple interval parsing (in production, use cron parser)
  // Format: "every 5 minutes", "every 1 hour", "daily at 00:00"
  
  const now = new Date();
  
  if (schedule.includes('minute')) {
    const minutes = parseInt(schedule.match(/\d+/)?.[0] || '5');
    return new Date(now.getTime() + minutes * 60 * 1000).toISOString();
  }
  
  if (schedule.includes('hour')) {
    const hours = parseInt(schedule.match(/\d+/)?.[0] || '1');
    return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
  }
  
  if (schedule.includes('daily')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }
  
  // Default: 1 hour
  return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Queue Statistics
// ============================================================================

export function getQueueStats() {
  const stats = {
    pending: jobQueue.filter(j => j.status === JOB_STATUS.PENDING).length,
    scheduled: scheduledJobs.size,
    running: runningJobs.size,
    total: jobQueue.length + scheduledJobs.size + runningJobs.size,
    byType: {},
    byPriority: {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
    },
  };
  
  jobQueue.forEach(job => {
    stats.byType[job.type] = (stats.byType[job.type] || 0) + 1;
    
    if (job.priority >= JOB_PRIORITY.CRITICAL) stats.byPriority.critical++;
    else if (job.priority >= JOB_PRIORITY.HIGH) stats.byPriority.high++;
    else if (job.priority >= JOB_PRIORITY.NORMAL) stats.byPriority.normal++;
    else stats.byPriority.low++;
  });
  
  return stats;
}

// ============================================================================
// Convenience Functions
// ============================================================================

export const jobs = {
  generateReport: (data) => enqueue({ type: 'GENERATE_REPORT', data }),
  exportPdf: (data) => enqueue({ type: 'EXPORT_PDF', data }),
  bulkExport: (data) => enqueue({ type: 'BULK_EXPORT', data }),
  sendEmail: (data) => enqueue({ type: 'SEND_EMAIL', data }),
  sendBulkEmail: (data) => enqueue({ type: 'SEND_BULK_EMAIL', data }),
  syncData: (data) => enqueue({ type: 'SYNC_DATA', data }),
  importData: (data) => enqueue({ type: 'IMPORT_DATA', data }),
  runAiAnalysis: (data) => enqueue({ type: 'AI_ANALYSIS', data }),
  sendNotification: (data) => enqueue({ type: 'SEND_NOTIFICATION', data }),
  triggerWebhook: (data) => enqueue({ type: 'TRIGGER_WEBHOOK', data }),
  processUsage: (data) => enqueue({ type: 'PROCESS_USAGE', data }),
  aggregateMetrics: (data) => enqueue({ type: 'AGGREGATE_METRICS', data }),
};

export default {
  JOB_STATUS,
  JOB_PRIORITY,
  JOB_TYPES,
  enqueue,
  scheduleRecurring,
  getJob,
  listJobs,
  cancelJob,
  retryJob,
  registerHandler,
  getQueueStats,
  jobs,
};
