/**
 * Sovereign Intelligence Platform
 * Notification Service - Multi-channel Notifications
 */

import { prisma } from '../db/prisma';
import { emitNotification } from '../realtime/websocket';

/**
 * Notification types
 */
export const NOTIFICATION_TYPES = {
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  APPROVAL: 'APPROVAL',
  MENTION: 'MENTION',
  SYSTEM: 'SYSTEM',
};

/**
 * Notification channels
 */
export const CHANNELS = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  WEBHOOK: 'webhook',
};

/**
 * Create and send notification
 */
export async function createNotification({
  userId,
  organizationId,
  type,
  title,
  message,
  actionUrl,
  metadata = {},
  channels = [CHANNELS.IN_APP],
}) {
  // Create in-app notification
  const notification = await prisma.notification.create({
    data: {
      userId,
      organizationId,
      type,
      title,
      message,
      actionUrl,
      metadata,
    },
  });
  
  // Emit real-time notification
  if (channels.includes(CHANNELS.IN_APP)) {
    emitNotification(organizationId, userId, {
      id: notification.id,
      type,
      title,
      message,
      actionUrl,
      createdAt: notification.createdAt,
    });
  }
  
  // Send email notification (if enabled)
  if (channels.includes(CHANNELS.EMAIL)) {
    await sendEmailNotification(userId, { type, title, message, actionUrl });
  }
  
  return notification;
}

/**
 * Send email notification
 */
async function sendEmailNotification(userId, { type, title, message, actionUrl }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, preferences: true },
  });
  
  if (!user) return;
  
  // Check if user has email notifications enabled
  const prefs = user.preferences || {};
  if (prefs.emailNotifications === false) return;
  
  // TODO: Integrate with email service (SendGrid/Resend)
  console.log(`[EMAIL] To: ${user.email}, Subject: ${title}`);
}

/**
 * Get user notifications
 */
export async function getNotifications(userId, { page = 1, limit = 20, unreadOnly = false }) {
  const skip = (page - 1) * limit;
  
  const where = { userId };
  if (unreadOnly) {
    where.read = false;
  }
  
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);
  
  return {
    notifications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    unreadCount,
  };
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId, userId) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true, readAt: new Date() },
  });
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  });
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId, userId) {
  return prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  });
}

/**
 * Send approval request notification
 */
export async function notifyApprovalRequest(reportId, reportTitle, approverId, submittedByName) {
  const approver = await prisma.user.findUnique({ where: { id: approverId } });
  
  if (!approver) return;
  
  return createNotification({
    userId: approverId,
    organizationId: approver.organizationId,
    type: NOTIFICATION_TYPES.APPROVAL,
    title: 'Approval Request',
    message: `${submittedByName} submitted "${reportTitle}" for your approval`,
    actionUrl: `/reports/${reportId}`,
    channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
  });
}

/**
 * Send report status notification
 */
export async function notifyReportStatus(reportId, reportTitle, userId, status, comment) {
  const statusMessages = {
    APPROVED: 'Your report has been approved',
    REJECTED: `Your report was not approved: ${comment}`,
    FINALIZED: 'Your report has been finalized',
  };
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (!user) return;
  
  return createNotification({
    userId,
    organizationId: user.organizationId,
    type: status === 'REJECTED' ? NOTIFICATION_TYPES.WARNING : NOTIFICATION_TYPES.SUCCESS,
    title: `Report ${status.toLowerCase()}`,
    message: statusMessages[status] || `Report status changed to ${status}`,
    actionUrl: `/reports/${reportId}`,
    channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
  });
}

export default {
  NOTIFICATION_TYPES,
  CHANNELS,
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  notifyApprovalRequest,
  notifyReportStatus,
};
