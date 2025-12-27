/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SOVEREIGN INTELLIGENCE - EXECUTION API
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * API endpoint for the Flawless Execution System.
 * Handles: execute, status, approve, reject, rollback, chain, metrics
 * 
 * @version 1.0.0
 */

import { executionEngine, EXECUTION_STATUS, PRIORITY } from '../../../lib/executionEngine';
import { getVerticalActions } from '../../../lib/verticalExecutionRegistries';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    action,
    executionId,
    vertical = 'enterprise',
    userId = 'default',
    actionType,
    params = {},
    options = {},
    steps,
    approverId,
    rejecterId,
    reason,
  } = req.body;

  try {
    switch (action) {
      // ═══════════════════════════════════════════════════════════════════════
      // EXECUTE - Run a single action
      // ═══════════════════════════════════════════════════════════════════════
      case 'execute': {
        if (!actionType) {
          return res.status(400).json({ error: 'actionType is required' });
        }

        // Validate action exists for vertical
        const verticalActions = getVerticalActions(vertical);
        if (!verticalActions[actionType]) {
          return res.status(400).json({ 
            error: `Action ${actionType} not found for vertical ${vertical}`,
            availableActions: Object.keys(verticalActions),
          });
        }

        const result = executionEngine.createExecution(
          actionType,
          params,
          vertical,
          userId,
          options
        );

        return res.json({
          success: true,
          ...result,
          message: result.status === 'requires_approval' 
            ? 'Execution requires approval before proceeding'
            : 'Execution queued successfully',
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // EXECUTE_AND_WAIT - Run action and wait for completion
      // ═══════════════════════════════════════════════════════════════════════
      case 'execute_and_wait': {
        if (!actionType) {
          return res.status(400).json({ error: 'actionType is required' });
        }

        const verticalActions = getVerticalActions(vertical);
        if (!verticalActions[actionType]) {
          return res.status(400).json({ 
            error: `Action ${actionType} not found for vertical ${vertical}`,
          });
        }

        const execResult = executionEngine.createExecution(
          actionType,
          params,
          vertical,
          userId,
          { ...options, preApproved: true }
        );

        if (execResult.status === 'requires_approval') {
          return res.json({
            success: true,
            ...execResult,
            message: 'Execution requires approval',
          });
        }

        // Wait for completion (max 60 seconds)
        const timeout = options.timeout || 60000;
        const finalResult = await executionEngine.waitForCompletion(execResult.id, timeout);

        return res.json({
          success: finalResult.status === EXECUTION_STATUS.COMPLETED,
          executionId: execResult.id,
          status: finalResult.status,
          result: finalResult.result,
          error: finalResult.error,
          auditLog: finalResult.auditLog,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // CHAIN - Execute multiple actions in sequence
      // ═══════════════════════════════════════════════════════════════════════
      case 'chain': {
        if (!steps || !Array.isArray(steps) || steps.length === 0) {
          return res.status(400).json({ error: 'steps array is required for chain execution' });
        }

        const chainResult = await executionEngine.executeChain(
          steps,
          vertical,
          userId,
          options
        );

        return res.json({
          success: chainResult.success,
          chainId: chainResult.chainId,
          results: chainResult.results,
          failedAt: chainResult.failedAt,
          error: chainResult.error,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STATUS - Get execution status
      // ═══════════════════════════════════════════════════════════════════════
      case 'status': {
        if (!executionId) {
          return res.status(400).json({ error: 'executionId is required' });
        }

        const status = executionEngine.getStatus(executionId);
        if (!status) {
          return res.status(404).json({ error: 'Execution not found' });
        }

        return res.json({
          success: true,
          ...status,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // APPROVE - Approve pending execution
      // ═══════════════════════════════════════════════════════════════════════
      case 'approve': {
        if (!executionId) {
          return res.status(400).json({ error: 'executionId is required' });
        }

        const approveResult = executionEngine.approve(executionId, approverId || userId);
        
        return res.json({
          success: approveResult.success,
          ...approveResult,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // REJECT - Reject pending execution
      // ═══════════════════════════════════════════════════════════════════════
      case 'reject': {
        if (!executionId) {
          return res.status(400).json({ error: 'executionId is required' });
        }

        const rejectResult = executionEngine.reject(
          executionId, 
          rejecterId || userId, 
          reason || 'Rejected by user'
        );

        return res.json({
          success: rejectResult.success,
          ...rejectResult,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // ROLLBACK - Rollback completed execution
      // ═══════════════════════════════════════════════════════════════════════
      case 'rollback': {
        if (!executionId) {
          return res.status(400).json({ error: 'executionId is required' });
        }

        const rollbackResult = await executionEngine.rollback(executionId);

        return res.json({
          success: rollbackResult.success,
          ...rollbackResult,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // LIST - Get user's executions
      // ═══════════════════════════════════════════════════════════════════════
      case 'list': {
        const listOptions = {
          vertical: options.vertical,
          status: options.status,
          limit: options.limit || 50,
          offset: options.offset || 0,
        };

        const executions = executionEngine.getUserExecutions(userId, listOptions);

        return res.json({
          success: true,
          ...executions,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // METRICS - Get execution metrics
      // ═══════════════════════════════════════════════════════════════════════
      case 'metrics': {
        const metrics = executionEngine.getMetrics(options.vertical);

        return res.json({
          success: true,
          metrics,
        });
      }

      // ═══════════════════════════════════════════════════════════════════════
      // AVAILABLE_ACTIONS - List available actions for a vertical
      // ═══════════════════════════════════════════════════════════════════════
      case 'available_actions': {
        const verticalActions = getVerticalActions(vertical);
        const actions = Object.entries(verticalActions).map(([id, action]) => ({
          id,
          name: action.name,
          description: action.description,
          category: action.category,
          requiresApproval: action.requiresApproval || false,
          estimatedTime: action.estimatedTime,
          hasRollback: !!action.rollback,
          hasVerification: !!action.verify,
        }));

        return res.json({
          success: true,
          vertical,
          actions,
          count: actions.length,
        });
      }

      default:
        return res.status(400).json({ 
          error: `Unknown action: ${action}`,
          availableActions: [
            'execute',
            'execute_and_wait', 
            'chain',
            'status',
            'approve',
            'reject',
            'rollback',
            'list',
            'metrics',
            'available_actions',
          ],
        });
    }
  } catch (error) {
    console.error('[Execution API Error]', error);
    return res.status(500).json({
      error: 'Execution failed',
      message: error.message,
    });
  }
}
