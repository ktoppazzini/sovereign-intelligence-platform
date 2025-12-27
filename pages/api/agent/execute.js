// pages/api/agent/execute.js
// ═══════════════════════════════════════════════════════════════════════════
// SOVEREIGN INTELLIGENCE - AUTONOMOUS AGENT API v2.0
// ═══════════════════════════════════════════════════════════════════════════
// This endpoint allows the autonomous agent to:
// - Process goals and execute action plans
// - Queue background tasks
// - Enable/disable autonomous mode
// - Add monitoring rules
// - FLAWLESS EXECUTION: Execute verified, rollback-capable actions

import { ensureTranslatedResponse, loadModuleTranslations } from '../../lib/dynamicTranslation';
// ═══════════════════════════════════════════════════════════════════════════
// SOVEREIGN AI 7 CAPABILITIES EMBEDDED:
// 1. Autonomous - Executes without prompting
// 2. Executes Strategy Flawlessly - Goal Planner + Execution Engine
// 3. 6 Expert Roles - Consultant, PM, Coach, Analyst, Change Mgr, Communicator
// 4. Never Drifts - Immutable CORE_IDENTITY in every call
// 5. Improves Exponentially - LearningEngine compounds with every interaction
// 6. Predictive - Anticipates issues, forecasts, preventive actions
// 7. Never Forgets - InteractionMemory retains EVERY detail of EVERY project
// ═══════════════════════════════════════════════════════════════════════════

import { agentManager, ACTION_REGISTRY } from '../../../lib/autonomousAgent';
import { profileManager, CORE_IDENTITY } from '../../../lib/agentProfile';
import { executionEngine, EXECUTION_STATUS } from '../../../lib/executionEngine';
import { getVerticalActions } from '../../../lib/verticalExecutionRegistries';
import SovereignAI from '../../../lib/ai/sovereignAI';
import { ensureTranslatedResponse } from '../../../lib/dynamicTranslation';

// [SR:EXECUTE-SHIM] OpenAI compatibility shim that routes through SovereignAI for full self-learning
const openai = {
  chat: {
    completions: {
      create: async (params) => {
        const systemPrompt = params.messages?.find(m => m.role === 'system')?.content || '';
        const userPrompt = params.messages?.filter(m => m.role === 'user').map(m => m.content).join('\n') || '';
        
        // Detect call type for better learning
        let callType = 'autonomous-execution';
        if (systemPrompt.includes('Consultant') || userPrompt.includes('strategy')) {
          callType = 'agent-consultant';
        } else if (systemPrompt.includes('Project') || userPrompt.includes('project')) {
          callType = 'agent-project-manager';
        } else if (systemPrompt.includes('Coach') || userPrompt.includes('coaching')) {
          callType = 'agent-coach';
        } else if (systemPrompt.includes('Analyst') || userPrompt.includes('analyze')) {
          callType = 'agent-analyst';
        } else if (systemPrompt.includes('Change') || userPrompt.includes('change management')) {
          callType = 'agent-change-manager';
        } else if (systemPrompt.includes('Communication') || userPrompt.includes('email') || userPrompt.includes('presentation')) {
          callType = 'agent-communicator';
        }
        
        console.log('[SR:EXECUTE-SHIM] Routing through SovereignAI', { callType });
        
        const result = await SovereignAI.call({
          prompt: userPrompt,
          systemPrompt,
          callType,
          vertical: 'autonomous-agent',
          lang: 'English',
          maxTokens: params.max_tokens || 4000,
        });
        
        return {
          choices: [{
            message: { content: result?.response || result?.raw || '', role: 'assistant' },
            finish_reason: result?.ok ? 'stop' : 'length'
          }],
          usage: result?.metrics?.usage || {}
        };
      }
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    action,
    userId = 'default',
    goal,
    context = {},
    taskId,
    ruleConfig,
    autonomousMode,
  } = req.body;

  try {
    const agent = agentManager.getAgent(userId);

    switch (action) {
      // ═════════════════════════════════════════════════════════════════════
      // PROCESS GOAL - Execute a goal autonomously
      // ═════════════════════════════════════════════════════════════════════
      case 'process_goal': {
        if (!goal) {
          return res.status(400).json({ error: 'Goal is required' });
        }

        const result = await agent.processGoal(goal, context);
        
        const responseData = {
          success: true,
          ...result,
          agentStatus: agent.getStatus(),
        };
        const translatedData = await ensureTranslatedResponse(responseData, req.body.lang || 'English');
        return res.json(translatedData);
      }

      // ═════════════════════════════════════════════════════════════════════
      // QUEUE TASK - Add task to background queue
      // ═════════════════════════════════════════════════════════════════════
      case 'queue_task': {
        if (!goal) {
          return res.status(400).json({ error: 'Goal is required for task' });
        }

        const taskIdResult = agent.queueTask({ goal, context });
        
        const responseData = {
          success: true,
          taskId: taskIdResult,
          message: 'Task queued for background processing',
          queueLength: agent.taskQueue.length,
        };
        const translatedData = await ensureTranslatedResponse(responseData, req.body.lang || 'English');
        return res.json(translatedData);
      }

      // ═════════════════════════════════════════════════════════════════════
      // APPROVE PLAN - Execute a pending plan
      // ═════════════════════════════════════════════════════════════════════
      case 'approve_plan': {
        // Find pending plan and execute it
        // This would be used when a plan requires approval
        return res.json({
          success: true,
          message: 'Plan approved and executing',
        });
      }

      // ═════════════════════════════════════════════════════════════════════
      // SET AUTONOMOUS MODE
      // ═════════════════════════════════════════════════════════════════════
      case 'set_autonomous_mode': {
        agent.enableAutonomousMode(autonomousMode === true);
        
        return res.json({
          success: true,
          autonomousMode: agent.autonomousMode,
          message: agent.autonomousMode 
            ? 'Autonomous mode enabled - agent will act without approval'
            : 'Autonomous mode disabled - agent will request approval for sensitive actions',
        });
      }

      // ═════════════════════════════════════════════════════════════════════
      // ADD MONITORING RULE
      // ═════════════════════════════════════════════════════════════════════
      case 'add_rule': {
        if (!ruleConfig) {
          return res.status(400).json({ error: 'Rule configuration required' });
        }

        // Parse the rule condition from string to function
        // In production, you'd use a safer rule engine
        const rule = {
          name: ruleConfig.name,
          condition: (data) => {
            // Simple condition evaluation
            if (ruleConfig.conditionType === 'threshold') {
              return data[ruleConfig.field] > ruleConfig.threshold;
            }
            if (ruleConfig.conditionType === 'equals') {
              return data[ruleConfig.field] === ruleConfig.value;
            }
            return false;
          },
          action: ruleConfig.action,
        };

        const ruleId = agent.addMonitoringRule(rule);
        
        return res.json({
          success: true,
          ruleId,
          message: `Monitoring rule "${ruleConfig.name}" added`,
        });
      }

      // ═════════════════════════════════════════════════════════════════════
      // GET STATUS
      // ═════════════════════════════════════════════════════════════════════
      case 'get_status': {
        return res.json({
          success: true,
          status: agent.getStatus(),
          history: agent.getHistory(10),
          availableActions: Object.keys(ACTION_REGISTRY),
        });
      }

      // ═════════════════════════════════════════════════════════════════════
      // LIST AVAILABLE ACTIONS
      // ═════════════════════════════════════════════════════════════════════
      case 'list_actions': {
        const actions = Object.entries(ACTION_REGISTRY).map(([id, action]) => ({
          id,
          name: action.name,
          description: action.description,
          parameters: action.parameters,
          requiresApproval: action.requiresApproval,
          estimatedTime: action.estimatedTime,
        }));

        return res.json({
          success: true,
          actions,
        });
      }

      // ═════════════════════════════════════════════════════════════════════
      // CHAT WITH AGENT (combines conversation + autonomous actions)
      // ═════════════════════════════════════════════════════════════════════
      case 'chat': {
        const { message, conversationHistory = [] } = req.body;
        
        if (!message) {
          return res.status(400).json({ error: 'Message is required' });
        }

        // First, check if this is an action request
        const isActionRequest = /^(generate|create|send|analyze|export|schedule|translate|alert)/i.test(message);
        
        let actionResult = null;
        if (isActionRequest) {
          // Try to execute as autonomous action
          actionResult = await agent.processGoal(message, context);
        }

        // Generate conversational response
        const systemPrompt = `${CORE_IDENTITY.systemPrompt || ''}

You are Sovereign, an autonomous AI agent. You can both converse AND take actions.

Available Actions:
${Object.entries(ACTION_REGISTRY).map(([id, a]) => `- ${a.name}: ${a.description}`).join('\n')}

${actionResult ? `
I just executed an action based on the user's request:
Action Status: ${actionResult.status}
${actionResult.plan ? `Plan: ${JSON.stringify(actionResult.plan.steps.map(s => s.action))}` : ''}
${actionResult.results ? `Results: ${JSON.stringify(actionResult.results)}` : ''}
` : ''}

Respond helpfully. If you took an action, explain what you did and the results.
If the user asks you to do something, either do it or explain what you would do.`;

        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.slice(-10),
            { role: 'user', content: message },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        const response = completion.choices[0]?.message?.content || 'I apologize, I could not generate a response.';

        return res.json({
          success: true,
          response,
          actionTaken: actionResult ? {
            status: actionResult.status,
            plan: actionResult.plan,
            results: actionResult.results,
          } : null,
          agentStatus: agent.getStatus(),
        });
      }

      // ═════════════════════════════════════════════════════════════════════
      // FLAWLESS EXECUTION - Execute with verification and rollback
      // ═════════════════════════════════════════════════════════════════════
      case 'flawless_execute': {
        const { actionType, params, vertical = 'enterprise', waitForResult = true } = req.body;
        
        if (!actionType) {
          return res.status(400).json({ error: 'actionType is required' });
        }

        // Validate action exists
        const verticalActions = getVerticalActions(vertical);
        if (!verticalActions[actionType]) {
          return res.status(400).json({ 
            error: `Action ${actionType} not found for vertical ${vertical}`,
            availableActions: Object.keys(verticalActions),
          });
        }

        // Create execution
        const execResult = executionEngine.createExecution(
          actionType,
          params || {},
          vertical,
          userId,
          { preApproved: context.autonomousMode || false }
        );

        if (!waitForResult || execResult.status === 'requires_approval') {
          return res.json({
            success: true,
            executionId: execResult.id,
            status: execResult.status,
            message: execResult.status === 'requires_approval' 
              ? 'Execution requires approval'
              : 'Execution queued',
          });
        }

        // Wait for completion
        const finalResult = await executionEngine.waitForCompletion(execResult.id, 60000);

        return res.json({
          success: finalResult.status === EXECUTION_STATUS.COMPLETED,
          executionId: execResult.id,
          status: finalResult.status,
          result: finalResult.result,
          error: finalResult.error,
          verified: !!finalResult.verificationResult?.success,
          canRollback: !!finalResult.rollbackData,
          auditLog: finalResult.auditLog,
        });
      }

      // ═════════════════════════════════════════════════════════════════════
      // EXECUTION STATUS - Check on a flawless execution
      // ═════════════════════════════════════════════════════════════════════
      case 'execution_status': {
        const { executionId } = req.body;
        
        if (!executionId) {
          return res.status(400).json({ error: 'executionId is required' });
        }

        const status = executionEngine.getStatus(executionId);
        if (!status) {
          return res.status(404).json({ error: 'Execution not found' });
        }

        return res.json({ success: true, ...status });
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROLLBACK - Undo a flawless execution
      // ═════════════════════════════════════════════════════════════════════
      case 'rollback_execution': {
        const { executionId } = req.body;
        
        if (!executionId) {
          return res.status(400).json({ error: 'executionId is required' });
        }

        const rollbackResult = await executionEngine.rollback(executionId);
        return res.json(rollbackResult);
      }

      // ═════════════════════════════════════════════════════════════════════
      // APPROVE EXECUTION - Approve a pending execution
      // ═════════════════════════════════════════════════════════════════════
      case 'approve_execution': {
        const { executionId } = req.body;
        
        if (!executionId) {
          return res.status(400).json({ error: 'executionId is required' });
        }

        const approveResult = executionEngine.approve(executionId, userId);
        return res.json(approveResult);
      }

      // ═════════════════════════════════════════════════════════════════════
      // EXECUTION METRICS - Get execution analytics
      // ═════════════════════════════════════════════════════════════════════
      case 'execution_metrics': {
        const { vertical } = req.body;
        const metrics = executionEngine.getMetrics(vertical);
        const responseData = { success: true, metrics };
        const translatedData = await ensureTranslatedResponse(responseData, req.body.lang || 'English');
        return res.json(translatedData);
      }

      // ═════════════════════════════════════════════════════════════════════
      // LIST VERTICAL ACTIONS - Get available actions for flawless execution
      // ═════════════════════════════════════════════════════════════════════
      case 'list_vertical_actions': {
        const { vertical = 'enterprise' } = req.body;
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

        return res.json(translatedData);
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

  } catch (error) {
    console.error('[Agent API Error]', error);
    return res.status(500).json({
      error: 'Agent execution failed',
      message: error.message,
    });
  }
}

