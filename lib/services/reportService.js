/**
 * Sovereign Intelligence Platform
 * Report Service - Database-backed Reports
 * 
 * Full CRUD operations with workflow, versioning, and caching
 */

import { prisma } from '../db/prisma';
import { cache, CACHE_PREFIX, TTL } from '../cache/redis';
import { createAuditLog, AUDIT_ACTIONS } from '../middleware/auditLogger';
import { emitReportStatus, emitApprovalRequest } from '../realtime/websocket';
import { getCurrentOrgId, getCurrentUser } from '../middleware/multiTenant';

/**
 * Create a new report
 */
export async function createReport({
  title,
  description,
  vertical,
  language,
  inputData,
  organizationId,
  createdById,
  workflowId,
}) {
  const orgId = organizationId || getCurrentOrgId();
  const userId = createdById || getCurrentUser()?.id;
  
  const report = await prisma.report.create({
    data: {
      title,
      description,
      vertical,
      language: language || 'English',
      inputData,
      organizationId: orgId,
      createdById: userId,
      workflowId,
      status: 'DRAFT',
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
  
  await createAuditLog({
    action: AUDIT_ACTIONS.REPORT_CREATED,
    resource: 'report',
    resourceId: report.id,
    organizationId: orgId,
    userId,
    details: { title, vertical },
  });
  
  return report;
}

/**
 * Get report by ID with caching
 */
export async function getReport(reportId, organizationId) {
  const orgId = organizationId || getCurrentOrgId();
  const cacheKey = `${CACHE_PREFIX.REPORT}${reportId}`;
  
  return cache.getOrSet(cacheKey, async () => {
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        organizationId: orgId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        approvals: {
          orderBy: { requestedAt: 'desc' },
          include: {
            approver: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        attachments: true,
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return report;
  }, TTL.SHORT);
}

/**
 * List reports with pagination and filters
 */
export async function listReports({
  organizationId,
  status,
  vertical,
  createdById,
  search,
  page = 1,
  limit = 20,
  orderBy = 'createdAt',
  order = 'desc',
}) {
  const orgId = organizationId || getCurrentOrgId();
  const skip = (page - 1) * limit;
  
  const where = { organizationId: orgId };
  
  if (status) where.status = status;
  if (vertical) where.vertical = vertical;
  if (createdById) where.createdById = createdById;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderBy]: order },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.report.count({ where }),
  ]);
  
  return {
    reports,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update report
 */
export async function updateReport(reportId, data, organizationId, userId) {
  const orgId = organizationId || getCurrentOrgId();
  const user = userId || getCurrentUser()?.id;
  
  // Get current version for versioning
  const current = await prisma.report.findFirst({
    where: { id: reportId, organizationId: orgId },
  });
  
  if (!current) {
    throw new Error('Report not found');
  }
  
  // Create version snapshot
  await prisma.reportVersion.create({
    data: {
      reportId,
      version: current.version,
      inputData: current.inputData,
      aiResponse: current.aiResponse,
      htmlContent: current.htmlContent,
      createdById: user,
      changeNote: data.changeNote || 'Updated',
    },
  });
  
  // Update report
  const report = await prisma.report.update({
    where: { id: reportId },
    data: {
      ...data,
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  });
  
  // Invalidate cache
  await cache.del(`${CACHE_PREFIX.REPORT}${reportId}`);
  
  await createAuditLog({
    action: AUDIT_ACTIONS.REPORT_UPDATED,
    resource: 'report',
    resourceId: reportId,
    organizationId: orgId,
    userId: user,
    details: { version: report.version },
  });
  
  return report;
}

/**
 * Submit report for approval
 */
export async function submitReport(reportId, organizationId, userId) {
  const orgId = organizationId || getCurrentOrgId();
  const user = userId || getCurrentUser()?.id;
  
  const report = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      currentStage: 'review',
    },
    include: {
      workflow: true,
    },
  });
  
  // Create approval request if workflow exists
  if (report.workflowId) {
    const workflow = report.workflow;
    const stages = workflow?.stages || [];
    const firstStage = stages[0];
    
    if (firstStage) {
      await prisma.approval.create({
        data: {
          reportId,
          stage: firstStage.name,
          status: 'PENDING',
        },
      });
      
      // Emit real-time notification
      emitApprovalRequest(orgId, {
        reportId,
        title: report.title,
        stage: firstStage.name,
        submittedBy: user,
      });
    }
  }
  
  // Invalidate cache
  await cache.del(`${CACHE_PREFIX.REPORT}${reportId}`);
  
  // Emit status change
  emitReportStatus(orgId, reportId, 'SUBMITTED');
  
  await createAuditLog({
    action: AUDIT_ACTIONS.REPORT_SUBMITTED,
    resource: 'report',
    resourceId: reportId,
    organizationId: orgId,
    userId: user,
  });
  
  return report;
}

/**
 * Approve report
 */
export async function approveReport(reportId, approverId, comment, organizationId) {
  const orgId = organizationId || getCurrentOrgId();
  
  // Update pending approval
  const approval = await prisma.approval.updateMany({
    where: {
      reportId,
      status: 'PENDING',
    },
    data: {
      status: 'APPROVED',
      approverId,
      comment,
      respondedAt: new Date(),
    },
  });
  
  // Update report status
  const report = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  });
  
  // Invalidate cache
  await cache.del(`${CACHE_PREFIX.REPORT}${reportId}`);
  
  // Emit status change
  emitReportStatus(orgId, reportId, 'APPROVED', { approverId });
  
  await createAuditLog({
    action: AUDIT_ACTIONS.REPORT_APPROVED,
    resource: 'report',
    resourceId: reportId,
    organizationId: orgId,
    userId: approverId,
    details: { comment },
  });
  
  return report;
}

/**
 * Reject report
 */
export async function rejectReport(reportId, approverId, comment, organizationId) {
  const orgId = organizationId || getCurrentOrgId();
  
  await prisma.approval.updateMany({
    where: {
      reportId,
      status: 'PENDING',
    },
    data: {
      status: 'REJECTED',
      approverId,
      comment,
      respondedAt: new Date(),
    },
  });
  
  const report = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: 'REJECTED',
    },
  });
  
  await cache.del(`${CACHE_PREFIX.REPORT}${reportId}`);
  emitReportStatus(orgId, reportId, 'REJECTED', { approverId, comment });
  
  await createAuditLog({
    action: AUDIT_ACTIONS.REPORT_REJECTED,
    resource: 'report',
    resourceId: reportId,
    organizationId: orgId,
    userId: approverId,
    details: { comment },
  });
  
  return report;
}

/**
 * Finalize report
 */
export async function finalizeReport(reportId, organizationId, userId) {
  const orgId = organizationId || getCurrentOrgId();
  const user = userId || getCurrentUser()?.id;
  
  const report = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: 'FINALIZED',
      finalizedAt: new Date(),
    },
  });
  
  await cache.del(`${CACHE_PREFIX.REPORT}${reportId}`);
  emitReportStatus(orgId, reportId, 'FINALIZED');
  
  await createAuditLog({
    action: AUDIT_ACTIONS.REPORT_FINALIZED,
    resource: 'report',
    resourceId: reportId,
    organizationId: orgId,
    userId: user,
  });
  
  return report;
}

/**
 * Delete report (soft delete)
 */
export async function deleteReport(reportId, organizationId, userId) {
  const orgId = organizationId || getCurrentOrgId();
  const user = userId || getCurrentUser()?.id;
  
  const report = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: 'ARCHIVED',
      archivedAt: new Date(),
    },
  });
  
  await cache.del(`${CACHE_PREFIX.REPORT}${reportId}`);
  
  await createAuditLog({
    action: AUDIT_ACTIONS.REPORT_DELETED,
    resource: 'report',
    resourceId: reportId,
    organizationId: orgId,
    userId: user,
  });
  
  return report;
}

/**
 * Get report analytics
 */
export async function getReportAnalytics(organizationId, startDate, endDate) {
  const orgId = organizationId || getCurrentOrgId();
  
  const [
    totalReports,
    byStatus,
    byVertical,
    recentActivity,
  ] = await Promise.all([
    prisma.report.count({
      where: {
        organizationId: orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.report.groupBy({
      by: ['status'],
      where: {
        organizationId: orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    }),
    prisma.report.groupBy({
      by: ['vertical'],
      where: {
        organizationId: orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
    }),
    prisma.report.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    }),
  ]);
  
  return {
    totalReports,
    byStatus: byStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {}),
    byVertical: byVertical.reduce((acc, item) => {
      acc[item.vertical] = item._count;
      return acc;
    }, {}),
    recentActivity,
  };
}

export default {
  createReport,
  getReport,
  listReports,
  updateReport,
  submitReport,
  approveReport,
  rejectReport,
  finalizeReport,
  deleteReport,
  getReportAnalytics,
};
