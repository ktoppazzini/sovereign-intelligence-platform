/**
 * Sovereign Intelligence Platform
 * Workflow Service - Approval Workflow Management
 */

import { prisma } from '../db/prisma';
import { cache, CACHE_PREFIX, TTL } from '../cache/redis';
import { createAuditLog, AUDIT_ACTIONS } from '../middleware/auditLogger';

/**
 * Default workflow templates
 */
export const WORKFLOW_TEMPLATES = {
  SIMPLE: {
    name: 'Simple Approval',
    description: 'Single approval before finalization',
    stages: [
      { name: 'review', approvers: ['manager'], required: 1 },
    ],
  },
  STANDARD: {
    name: 'Standard Review',
    description: 'Two-stage review process',
    stages: [
      { name: 'peer_review', approvers: ['analyst'], required: 1 },
      { name: 'manager_approval', approvers: ['manager'], required: 1 },
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise Compliance',
    description: 'Multi-stage review with compliance sign-off',
    stages: [
      { name: 'peer_review', approvers: ['analyst'], required: 1 },
      { name: 'manager_approval', approvers: ['manager'], required: 1 },
      { name: 'compliance_review', approvers: ['compliance'], required: 1 },
      { name: 'executive_sign_off', approvers: ['executive'], required: 1 },
    ],
  },
  GOVERNMENT: {
    name: 'Government Security',
    description: 'High-security multi-stage review',
    stages: [
      { name: 'analyst_review', approvers: ['analyst'], required: 2 },
      { name: 'senior_review', approvers: ['senior'], required: 1 },
      { name: 'security_clearance', approvers: ['security'], required: 1 },
      { name: 'director_approval', approvers: ['director'], required: 1 },
    ],
  },
};

/**
 * Create workflow
 */
export async function createWorkflow({
  name,
  description,
  stages,
  organizationId,
  createdById,
  isDefault = false,
}) {
  // If setting as default, unset existing default
  if (isDefault) {
    await prisma.workflow.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    });
  }
  
  const workflow = await prisma.workflow.create({
    data: {
      name,
      description,
      stages,
      organizationId,
      createdById,
      isDefault,
      isActive: true,
    },
  });
  
  await createAuditLog({
    action: AUDIT_ACTIONS.WORKFLOW_CREATED,
    resource: 'workflow',
    resourceId: workflow.id,
    organizationId,
    userId: createdById,
    details: { name, stages: stages.length },
  });
  
  // Invalidate cache
  await cache.del(`${CACHE_PREFIX.ORG}${organizationId}:workflows`);
  
  return workflow;
}

/**
 * Get organization workflows
 */
export async function getWorkflows(organizationId) {
  const cacheKey = `${CACHE_PREFIX.ORG}${organizationId}:workflows`;
  
  return cache.getOrSet(cacheKey, async () => {
    return prisma.workflow.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }, TTL.MEDIUM);
}

/**
 * Get workflow by ID
 */
export async function getWorkflow(workflowId, organizationId) {
  return prisma.workflow.findFirst({
    where: { id: workflowId, organizationId },
  });
}

/**
 * Update workflow
 */
export async function updateWorkflow(workflowId, data, organizationId, userId) {
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, organizationId },
  });
  
  if (!workflow) {
    throw new Error('Workflow not found');
  }
  
  // If setting as default, unset existing default
  if (data.isDefault) {
    await prisma.workflow.updateMany({
      where: { organizationId, isDefault: true, id: { not: workflowId } },
      data: { isDefault: false },
    });
  }
  
  const updated = await prisma.workflow.update({
    where: { id: workflowId },
    data: {
      name: data.name,
      description: data.description,
      stages: data.stages,
      isDefault: data.isDefault,
      isActive: data.isActive,
    },
  });
  
  await cache.del(`${CACHE_PREFIX.ORG}${organizationId}:workflows`);
  
  await createAuditLog({
    action: AUDIT_ACTIONS.WORKFLOW_UPDATED,
    resource: 'workflow',
    resourceId: workflowId,
    organizationId,
    userId,
    details: { updated: Object.keys(data) },
  });
  
  return updated;
}

/**
 * Delete workflow
 */
export async function deleteWorkflow(workflowId, organizationId, userId) {
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, organizationId },
  });
  
  if (!workflow) {
    throw new Error('Workflow not found');
  }
  
  // Check if any reports are using this workflow
  const reportsUsingWorkflow = await prisma.report.count({
    where: { workflowId, status: { in: ['DRAFT', 'SUBMITTED', 'IN_REVIEW'] } },
  });
  
  if (reportsUsingWorkflow > 0) {
    throw new Error('Cannot delete workflow with active reports');
  }
  
  await prisma.workflow.update({
    where: { id: workflowId },
    data: { isActive: false },
  });
  
  await cache.del(`${CACHE_PREFIX.ORG}${organizationId}:workflows`);
  
  await createAuditLog({
    action: AUDIT_ACTIONS.WORKFLOW_DELETED,
    resource: 'workflow',
    resourceId: workflowId,
    organizationId,
    userId,
  });
  
  return { success: true };
}

/**
 * Create workflow from template
 */
export async function createFromTemplate(templateName, organizationId, createdById) {
  const template = WORKFLOW_TEMPLATES[templateName];
  
  if (!template) {
    throw new Error('Template not found');
  }
  
  return createWorkflow({
    name: template.name,
    description: template.description,
    stages: template.stages,
    organizationId,
    createdById,
  });
}

/**
 * Get next approvers for a report's current stage
 */
export async function getNextApprovers(reportId) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { workflow: true },
  });
  
  if (!report || !report.workflow) {
    return [];
  }
  
  const currentStage = report.currentStage;
  const stages = report.workflow.stages || [];
  const stage = stages.find(s => s.name === currentStage);
  
  if (!stage) {
    return [];
  }
  
  // Get users with matching roles
  const approvers = await prisma.user.findMany({
    where: {
      organizationId: report.organizationId,
      role: { in: stage.approvers.map(r => r.toUpperCase()) },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
  
  return approvers;
}

/**
 * Advance report to next workflow stage
 */
export async function advanceWorkflowStage(reportId, organizationId, userId) {
  const report = await prisma.report.findFirst({
    where: { id: reportId, organizationId },
    include: { workflow: true },
  });
  
  if (!report || !report.workflow) {
    throw new Error('Report or workflow not found');
  }
  
  const stages = report.workflow.stages || [];
  const currentIndex = stages.findIndex(s => s.name === report.currentStage);
  
  if (currentIndex === -1 || currentIndex >= stages.length - 1) {
    // No more stages - report can be finalized
    return prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'APPROVED',
        currentStage: 'complete',
        approvedAt: new Date(),
      },
    });
  }
  
  const nextStage = stages[currentIndex + 1];
  
  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      currentStage: nextStage.name,
      status: 'IN_REVIEW',
    },
  });
  
  // Create approval record for next stage
  await prisma.approval.create({
    data: {
      reportId,
      stage: nextStage.name,
      status: 'PENDING',
    },
  });
  
  return updated;
}

export default {
  WORKFLOW_TEMPLATES,
  createWorkflow,
  getWorkflows,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
  createFromTemplate,
  getNextApprovers,
  advanceWorkflowStage,
};
