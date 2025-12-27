/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SOVEREIGN INTELLIGENCE - FLAWLESS EXECUTION ENGINE v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This engine transforms AI recommendations into EXECUTED ACTIONS.
 * Not just advice - actual results.
 * 
 * Key Differentiators:
 * - VERIFICATION: Every action is verified after execution
 * - ROLLBACK: Failed actions can be reversed
 * - AUDIT TRAIL: Complete history of all executions
 * - MULTI-STEP: Chain complex actions together
 * - RETRY LOGIC: Intelligent retry with backoff
 * 
 * @version 1.0.0
 * @author Sovereign Intelligence Platform
 */

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTION STATUS CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
export const EXECUTION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  VERIFYING: 'verifying',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back',
  REQUIRES_APPROVAL: 'requires_approval',
  PAUSED: 'paused',
};

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTION PRIORITY LEVELS
// ═══════════════════════════════════════════════════════════════════════════
export const PRIORITY = {
  CRITICAL: 1,    // Execute immediately, alert on failure
  HIGH: 2,        // Execute ASAP
  NORMAL: 3,      // Standard queue
  LOW: 4,         // Background execution
  SCHEDULED: 5,   // Execute at specific time
};

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTION RECORD CLASS
// ═══════════════════════════════════════════════════════════════════════════
class ExecutionRecord {
  constructor(id, action, params, vertical, userId) {
    this.id = id;
    this.action = action;
    this.params = params;
    this.vertical = vertical;
    this.userId = userId;
    this.status = EXECUTION_STATUS.PENDING;
    this.priority = PRIORITY.NORMAL;
    this.createdAt = new Date().toISOString();
    this.startedAt = null;
    this.completedAt = null;
    this.result = null;
    this.error = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.verificationResult = null;
    this.rollbackData = null;
    this.parentExecutionId = null;
    this.childExecutionIds = [];
    this.auditLog = [];
  }

  addAuditEntry(event, details = {}) {
    this.auditLog.push({
      timestamp: new Date().toISOString(),
      event,
      details,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════
class ExecutionEngine {
  constructor() {
    this.executions = new Map();        // All execution records
    this.queue = [];                    // Pending executions
    this.activeExecutions = new Map();  // Currently running
    this.verticalRegistries = {};       // Vertical-specific action registries
    this.maxConcurrent = 5;             // Max parallel executions
    this.isProcessing = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTER VERTICAL ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  registerVertical(verticalId, actionRegistry) {
    this.verticalRegistries[verticalId] = actionRegistry;
    console.log(`[ExecutionEngine] Registered ${Object.keys(actionRegistry).length} actions for ${verticalId}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════
  createExecution(action, params, vertical, userId, options = {}) {
    const id = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record = new ExecutionRecord(id, action, params, vertical, userId);
    
    if (options.priority) record.priority = options.priority;
    if (options.parentExecutionId) record.parentExecutionId = options.parentExecutionId;
    if (options.maxRetries) record.maxRetries = options.maxRetries;

    record.addAuditEntry('created', { action, params, vertical });
    this.executions.set(id, record);

    // Check if action requires approval
    const registry = this.verticalRegistries[vertical] || this.verticalRegistries['universal'];
    const actionDef = registry?.[action];
    
    if (actionDef?.requiresApproval && !options.preApproved) {
      record.status = EXECUTION_STATUS.REQUIRES_APPROVAL;
      record.addAuditEntry('awaiting_approval');
      return { id, status: 'requires_approval', record };
    }

    // Add to queue
    this.queue.push(id);
    this.queue.sort((a, b) => this.executions.get(a).priority - this.executions.get(b).priority);
    
    // Start processing if not already
    this.processQueue();

    return { id, status: 'queued', record };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS EXECUTION QUEUE
  // ═══════════════════════════════════════════════════════════════════════════
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0 && this.activeExecutions.size < this.maxConcurrent) {
      const execId = this.queue.shift();
      const record = this.executions.get(execId);
      
      if (!record || record.status !== EXECUTION_STATUS.PENDING) continue;

      this.activeExecutions.set(execId, record);
      this.executeWithRetry(record).then(() => {
        this.activeExecutions.delete(execId);
        this.processQueue(); // Continue processing
      });
    }

    this.isProcessing = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTE WITH RETRY LOGIC
  // ═══════════════════════════════════════════════════════════════════════════
  async executeWithRetry(record) {
    record.status = EXECUTION_STATUS.IN_PROGRESS;
    record.startedAt = new Date().toISOString();
    record.addAuditEntry('started');

    const registry = this.verticalRegistries[record.vertical] || this.verticalRegistries['universal'];
    const actionDef = registry?.[record.action];

    if (!actionDef) {
      record.status = EXECUTION_STATUS.FAILED;
      record.error = `Action ${record.action} not found in ${record.vertical} registry`;
      record.addAuditEntry('failed', { error: record.error });
      return;
    }

    while (record.retryCount <= record.maxRetries) {
      try {
        // Execute the action
        const result = await actionDef.execute(record.params, {
          userId: record.userId,
          vertical: record.vertical,
          executionId: record.id,
        });

        // Store rollback data if provided
        if (result.rollbackData) {
          record.rollbackData = result.rollbackData;
        }

        // Verify execution if verification function exists
        if (actionDef.verify) {
          record.status = EXECUTION_STATUS.VERIFYING;
          record.addAuditEntry('verifying');
          
          const verificationResult = await actionDef.verify(result, record.params);
          record.verificationResult = verificationResult;

          if (!verificationResult.success) {
            throw new Error(`Verification failed: ${verificationResult.reason}`);
          }
        }

        // Success!
        record.status = EXECUTION_STATUS.COMPLETED;
        record.result = result;
        record.completedAt = new Date().toISOString();
        record.addAuditEntry('completed', { result: this.sanitizeResult(result) });
        
        return;

      } catch (error) {
        record.retryCount++;
        record.addAuditEntry('retry', { 
          attempt: record.retryCount, 
          error: error.message 
        });

        if (record.retryCount > record.maxRetries) {
          record.status = EXECUTION_STATUS.FAILED;
          record.error = error.message;
          record.completedAt = new Date().toISOString();
          record.addAuditEntry('failed', { error: error.message });

          // Attempt rollback if possible
          if (record.rollbackData && actionDef.rollback) {
            await this.rollback(record.id);
          }
          return;
        }

        // Exponential backoff
        await this.sleep(Math.pow(2, record.retryCount) * 1000);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLLBACK EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════
  async rollback(executionId) {
    const record = this.executions.get(executionId);
    if (!record) return { success: false, error: 'Execution not found' };

    const registry = this.verticalRegistries[record.vertical] || this.verticalRegistries['universal'];
    const actionDef = registry?.[record.action];

    if (!actionDef?.rollback) {
      return { success: false, error: 'Rollback not supported for this action' };
    }

    if (!record.rollbackData) {
      return { success: false, error: 'No rollback data available' };
    }

    try {
      record.addAuditEntry('rollback_started');
      await actionDef.rollback(record.rollbackData, record.params);
      record.status = EXECUTION_STATUS.ROLLED_BACK;
      record.addAuditEntry('rollback_completed');
      return { success: true };
    } catch (error) {
      record.addAuditEntry('rollback_failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPROVE PENDING EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════
  approve(executionId, approverId) {
    const record = this.executions.get(executionId);
    if (!record) return { success: false, error: 'Execution not found' };

    if (record.status !== EXECUTION_STATUS.REQUIRES_APPROVAL) {
      return { success: false, error: 'Execution does not require approval' };
    }

    record.status = EXECUTION_STATUS.PENDING;
    record.addAuditEntry('approved', { approverId });
    this.queue.push(executionId);
    this.processQueue();

    return { success: true, id: executionId };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REJECT PENDING EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════
  reject(executionId, rejecterId, reason) {
    const record = this.executions.get(executionId);
    if (!record) return { success: false, error: 'Execution not found' };

    record.status = EXECUTION_STATUS.FAILED;
    record.error = `Rejected: ${reason}`;
    record.addAuditEntry('rejected', { rejecterId, reason });

    return { success: true, id: executionId };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAIN EXECUTIONS (Multi-step workflows)
  // ═══════════════════════════════════════════════════════════════════════════
  async executeChain(steps, vertical, userId, options = {}) {
    const chainId = `chain_${Date.now()}`;
    const results = [];
    let previousResult = null;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Allow steps to reference previous results
      const params = typeof step.params === 'function' 
        ? step.params(previousResult, results) 
        : step.params;

      const { id, status, record } = this.createExecution(
        step.action,
        params,
        step.vertical || vertical,
        userId,
        {
          ...options,
          parentExecutionId: chainId,
        }
      );

      // Wait for execution to complete
      const result = await this.waitForCompletion(id, step.timeout || 60000);
      results.push({ step: i, id, action: step.action, result });

      if (result.status === EXECUTION_STATUS.FAILED) {
        // Stop chain on failure unless configured otherwise
        if (!step.continueOnFailure) {
          return {
            chainId,
            success: false,
            failedAt: i,
            results,
            error: result.error,
          };
        }
      }

      previousResult = result;
    }

    return {
      chainId,
      success: true,
      results,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WAIT FOR EXECUTION COMPLETION
  // ═══════════════════════════════════════════════════════════════════════════
  async waitForCompletion(executionId, timeout = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const record = this.executions.get(executionId);
      if (!record) return { status: EXECUTION_STATUS.FAILED, error: 'Execution not found' };

      if ([EXECUTION_STATUS.COMPLETED, EXECUTION_STATUS.FAILED, EXECUTION_STATUS.ROLLED_BACK]
          .includes(record.status)) {
        return record;
      }

      await this.sleep(500);
    }

    return { status: EXECUTION_STATUS.FAILED, error: 'Timeout waiting for execution' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET EXECUTION STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  getStatus(executionId) {
    const record = this.executions.get(executionId);
    if (!record) return null;

    return {
      id: record.id,
      action: record.action,
      status: record.status,
      vertical: record.vertical,
      createdAt: record.createdAt,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      result: record.result,
      error: record.error,
      retryCount: record.retryCount,
      verificationResult: record.verificationResult,
      auditLog: record.auditLog,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET ALL EXECUTIONS FOR USER
  // ═══════════════════════════════════════════════════════════════════════════
  getUserExecutions(userId, options = {}) {
    const { vertical, status, limit = 50, offset = 0 } = options;
    
    let results = Array.from(this.executions.values())
      .filter(r => r.userId === userId)
      .filter(r => !vertical || r.vertical === vertical)
      .filter(r => !status || r.status === status)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = results.length;
    results = results.slice(offset, offset + limit);

    return {
      executions: results.map(r => this.getStatus(r.id)),
      total,
      limit,
      offset,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  sanitizeResult(result) {
    // Remove sensitive data from audit logs
    const sanitized = { ...result };
    delete sanitized.rollbackData;
    delete sanitized.credentials;
    delete sanitized.tokens;
    return sanitized;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // METRICS & ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════
  getMetrics(vertical = null) {
    const executions = Array.from(this.executions.values())
      .filter(r => !vertical || r.vertical === vertical);

    const completed = executions.filter(r => r.status === EXECUTION_STATUS.COMPLETED);
    const failed = executions.filter(r => r.status === EXECUTION_STATUS.FAILED);

    return {
      total: executions.length,
      completed: completed.length,
      failed: failed.length,
      pending: executions.filter(r => r.status === EXECUTION_STATUS.PENDING).length,
      inProgress: executions.filter(r => r.status === EXECUTION_STATUS.IN_PROGRESS).length,
      successRate: executions.length > 0 
        ? ((completed.length / executions.length) * 100).toFixed(1) + '%' 
        : 'N/A',
      avgExecutionTime: this.calculateAvgTime(completed),
      byVertical: this.groupByVertical(executions),
      byAction: this.groupByAction(executions),
    };
  }

  calculateAvgTime(completedExecutions) {
    if (completedExecutions.length === 0) return 'N/A';
    
    const totalMs = completedExecutions.reduce((sum, r) => {
      if (r.startedAt && r.completedAt) {
        return sum + (new Date(r.completedAt) - new Date(r.startedAt));
      }
      return sum;
    }, 0);

    return (totalMs / completedExecutions.length / 1000).toFixed(2) + 's';
  }

  groupByVertical(executions) {
    return executions.reduce((acc, r) => {
      acc[r.vertical] = (acc[r.vertical] || 0) + 1;
      return acc;
    }, {});
  }

  groupByAction(executions) {
    return executions.reduce((acc, r) => {
      acc[r.action] = (acc[r.action] || 0) + 1;
      return acc;
    }, {});
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════
export const executionEngine = new ExecutionEngine();

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT FOR USE
// ═══════════════════════════════════════════════════════════════════════════
export default executionEngine;
