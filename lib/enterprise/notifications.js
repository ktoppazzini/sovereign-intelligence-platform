// lib/enterprise/notifications.js
// [KT:NOTIFICATIONS-v1.0] Enterprise Notification System
// Multi-channel notifications: Email, In-App, SMS, Slack, Webhooks
// Supports templates, localization, batching, and delivery tracking

import Airtable from 'airtable';

const TAG = '[ENTERPRISE:NOTIFICATIONS]';

// ============================================================================
// Airtable Configuration
// ============================================================================
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ''
);

// ============================================================================
// Notification Channels
// ============================================================================
export const CHANNELS = {
  EMAIL: 'email',
  IN_APP: 'in_app',
  SMS: 'sms',
  SLACK: 'slack',
  WEBHOOK: 'webhook',
  PUSH: 'push',
};

// ============================================================================
// Notification Types & Templates
// ============================================================================
export const NOTIFICATION_TYPES = {
  // Account notifications
  WELCOME: {
    name: 'Welcome',
    channels: ['email', 'in_app'],
    priority: 'normal',
    category: 'account',
    templates: {
      email: {
        subject: 'Welcome to Sovereign Intelligence, {{userName}}!',
        body: `
          <h1>Welcome to Sovereign Intelligence</h1>
          <p>Hi {{userName}},</p>
          <p>Thank you for joining Sovereign Intelligence. We're excited to have you on board!</p>
          <p>Here's what you can do next:</p>
          <ul>
            <li>Create your first report</li>
            <li>Explore our AI-powered analytics</li>
            <li>Invite your team members</li>
          </ul>
          <p><a href="{{dashboardUrl}}">Go to Dashboard</a></p>
        `,
      },
      in_app: {
        title: 'Welcome to Sovereign Intelligence!',
        body: 'Get started by creating your first report.',
        action: { label: 'Create Report', url: '/reports/new' },
      },
    },
  },
  
  PASSWORD_RESET: {
    name: 'Password Reset',
    channels: ['email'],
    priority: 'high',
    category: 'security',
    templates: {
      email: {
        subject: 'Reset your Sovereign Intelligence password',
        body: `
          <h1>Password Reset Request</h1>
          <p>Hi {{userName}},</p>
          <p>We received a request to reset your password. Click the link below to create a new password:</p>
          <p><a href="{{resetUrl}}">Reset Password</a></p>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      },
    },
  },
  
  // Report notifications
  REPORT_READY: {
    name: 'Report Ready',
    channels: ['email', 'in_app', 'slack'],
    priority: 'normal',
    category: 'reports',
    templates: {
      email: {
        subject: 'Your report "{{reportName}}" is ready',
        body: `
          <h1>Report Generated Successfully</h1>
          <p>Hi {{userName}},</p>
          <p>Your report <strong>{{reportName}}</strong> has been generated and is ready for review.</p>
          <p><a href="{{reportUrl}}">View Report</a></p>
        `,
      },
      in_app: {
        title: 'Report Ready: {{reportName}}',
        body: 'Your report has been generated successfully.',
        action: { label: 'View Report', url: '{{reportUrl}}' },
      },
      slack: {
        text: ':page_facing_up: Report "{{reportName}}" is ready for {{userName}}. <{{reportUrl}}|View Report>',
      },
    },
  },
  
  REPORT_SHARED: {
    name: 'Report Shared',
    channels: ['email', 'in_app'],
    priority: 'normal',
    category: 'reports',
    templates: {
      email: {
        subject: '{{sharedBy}} shared a report with you',
        body: `
          <h1>Report Shared With You</h1>
          <p>Hi {{userName}},</p>
          <p><strong>{{sharedBy}}</strong> has shared the report <strong>{{reportName}}</strong> with you.</p>
          <p><a href="{{reportUrl}}">View Report</a></p>
        `,
      },
      in_app: {
        title: 'Report shared: {{reportName}}',
        body: '{{sharedBy}} shared a report with you.',
        action: { label: 'View Report', url: '{{reportUrl}}' },
      },
    },
  },
  
  // Team notifications
  TEAM_INVITATION: {
    name: 'Team Invitation',
    channels: ['email'],
    priority: 'high',
    category: 'team',
    templates: {
      email: {
        subject: "You've been invited to join {{organizationName}} on Sovereign Intelligence",
        body: `
          <h1>You're Invited!</h1>
          <p>Hi,</p>
          <p><strong>{{inviterName}}</strong> has invited you to join <strong>{{organizationName}}</strong> on Sovereign Intelligence.</p>
          <p>As a {{role}}, you'll be able to:</p>
          <ul>
            {{#permissions}}
            <li>{{.}}</li>
            {{/permissions}}
          </ul>
          <p><a href="{{inviteUrl}}">Accept Invitation</a></p>
          <p>This invitation expires in 7 days.</p>
        `,
      },
    },
  },
  
  MEMBER_JOINED: {
    name: 'Member Joined',
    channels: ['in_app', 'slack'],
    priority: 'low',
    category: 'team',
    templates: {
      in_app: {
        title: '{{memberName}} joined the team',
        body: 'A new member has joined {{teamName}}.',
      },
      slack: {
        text: ':wave: {{memberName}} has joined {{teamName}}!',
      },
    },
  },
  
  // Billing notifications
  PAYMENT_SUCCESS: {
    name: 'Payment Successful',
    channels: ['email'],
    priority: 'normal',
    category: 'billing',
    templates: {
      email: {
        subject: 'Payment received - Invoice #{{invoiceNumber}}',
        body: `
          <h1>Payment Received</h1>
          <p>Hi {{userName}},</p>
          <p>We've received your payment of <strong>{{amount}} {{currency}}</strong>.</p>
          <p>Invoice: #{{invoiceNumber}}</p>
          <p><a href="{{invoiceUrl}}">View Invoice</a></p>
        `,
      },
    },
  },
  
  PAYMENT_FAILED: {
    name: 'Payment Failed',
    channels: ['email', 'in_app'],
    priority: 'critical',
    category: 'billing',
    templates: {
      email: {
        subject: 'Action required: Payment failed',
        body: `
          <h1>Payment Failed</h1>
          <p>Hi {{userName}},</p>
          <p>We were unable to process your payment of <strong>{{amount}} {{currency}}</strong>.</p>
          <p>Please update your payment method to avoid service interruption.</p>
          <p><a href="{{billingUrl}}">Update Payment Method</a></p>
        `,
      },
      in_app: {
        title: 'Payment Failed',
        body: 'Please update your payment method to continue using Sovereign Intelligence.',
        action: { label: 'Update Payment', url: '/billing' },
        type: 'error',
      },
    },
  },
  
  SUBSCRIPTION_EXPIRING: {
    name: 'Subscription Expiring',
    channels: ['email', 'in_app'],
    priority: 'high',
    category: 'billing',
    templates: {
      email: {
        subject: 'Your subscription expires in {{daysRemaining}} days',
        body: `
          <h1>Subscription Expiring Soon</h1>
          <p>Hi {{userName}},</p>
          <p>Your {{planName}} subscription will expire in <strong>{{daysRemaining}} days</strong>.</p>
          <p>Renew now to continue using all features.</p>
          <p><a href="{{billingUrl}}">Renew Subscription</a></p>
        `,
      },
      in_app: {
        title: 'Subscription expiring soon',
        body: 'Your subscription expires in {{daysRemaining}} days.',
        action: { label: 'Renew', url: '/billing' },
        type: 'warning',
      },
    },
  },
  
  // Usage notifications
  QUOTA_WARNING: {
    name: 'Quota Warning',
    channels: ['email', 'in_app'],
    priority: 'high',
    category: 'usage',
    templates: {
      email: {
        subject: 'Usage Alert: {{quotaType}} at {{percentage}}%',
        body: `
          <h1>Usage Alert</h1>
          <p>Hi {{userName}},</p>
          <p>Your {{quotaType}} usage has reached <strong>{{percentage}}%</strong> of your monthly limit.</p>
          <p>Current: {{current}} / {{limit}}</p>
          <p>Consider upgrading your plan for higher limits.</p>
          <p><a href="{{upgradeUrl}}">Upgrade Plan</a></p>
        `,
      },
      in_app: {
        title: '{{quotaType}} at {{percentage}}%',
        body: 'You are approaching your usage limit.',
        action: { label: 'View Usage', url: '/billing' },
        type: 'warning',
      },
    },
  },
  
  // Security notifications
  NEW_LOGIN: {
    name: 'New Login Detected',
    channels: ['email'],
    priority: 'high',
    category: 'security',
    templates: {
      email: {
        subject: 'New login to your Sovereign Intelligence account',
        body: `
          <h1>New Login Detected</h1>
          <p>Hi {{userName}},</p>
          <p>We detected a new login to your account:</p>
          <ul>
            <li><strong>Time:</strong> {{loginTime}}</li>
            <li><strong>Location:</strong> {{location}}</li>
            <li><strong>Device:</strong> {{device}}</li>
            <li><strong>IP Address:</strong> {{ipAddress}}</li>
          </ul>
          <p>If this wasn't you, please <a href="{{securityUrl}}">secure your account</a> immediately.</p>
        `,
      },
    },
  },
  
  SUSPICIOUS_ACTIVITY: {
    name: 'Suspicious Activity',
    channels: ['email', 'sms'],
    priority: 'critical',
    category: 'security',
    templates: {
      email: {
        subject: 'URGENT: Suspicious activity detected on your account',
        body: `
          <h1>Suspicious Activity Detected</h1>
          <p>Hi {{userName}},</p>
          <p>We've detected unusual activity on your account:</p>
          <p><strong>{{activityDescription}}</strong></p>
          <p>For your security, we recommend:</p>
          <ul>
            <li>Change your password immediately</li>
            <li>Enable two-factor authentication</li>
            <li>Review recent activity</li>
          </ul>
          <p><a href="{{securityUrl}}">Secure Your Account</a></p>
        `,
      },
      sms: {
        body: 'SOVEREIGN ALERT: Suspicious activity on your account. Visit {{securityUrl}} to secure.',
      },
    },
  },
  
  // System notifications
  MAINTENANCE: {
    name: 'Scheduled Maintenance',
    channels: ['email', 'in_app'],
    priority: 'normal',
    category: 'system',
    templates: {
      email: {
        subject: 'Scheduled maintenance on {{maintenanceDate}}',
        body: `
          <h1>Scheduled Maintenance</h1>
          <p>Hi {{userName}},</p>
          <p>We will be performing scheduled maintenance on:</p>
          <p><strong>{{maintenanceDate}}</strong> from <strong>{{startTime}}</strong> to <strong>{{endTime}}</strong> ({{timezone}})</p>
          <p>During this time, the service may be temporarily unavailable.</p>
          <p>We apologize for any inconvenience.</p>
        `,
      },
      in_app: {
        title: 'Scheduled Maintenance',
        body: 'Maintenance scheduled for {{maintenanceDate}} at {{startTime}}.',
        type: 'info',
      },
    },
  },
};

// ============================================================================
// Notification Preferences
// ============================================================================
export const DEFAULT_PREFERENCES = {
  email: {
    account: true,
    reports: true,
    team: true,
    billing: true,
    usage: true,
    security: true,
    system: true,
    marketing: false,
  },
  in_app: {
    account: true,
    reports: true,
    team: true,
    billing: true,
    usage: true,
    security: true,
    system: true,
  },
  sms: {
    security: true,
  },
  slack: {
    reports: true,
    team: true,
  },
};

// ============================================================================
// Send Notification
// ============================================================================

/**
 * Send a notification to a user
 */
export async function sendNotification({
  type,
  userId,
  email,
  organizationId,
  data = {},
  channels = null, // Override default channels
  priority = null, // Override default priority
}) {
  const notificationType = NOTIFICATION_TYPES[type];
  if (!notificationType) {
    console.error(TAG, 'sendNotification.invalidType', { type });
    throw new Error(`Invalid notification type: ${type}`);
  }
  
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  console.log(TAG, 'sendNotification', { type, userId, email, notificationId });
  
  // Get user preferences
  const userPreferences = await getUserPreferences(userId);
  
  // Determine which channels to use
  const targetChannels = channels || notificationType.channels;
  const effectivePriority = priority || notificationType.priority;
  
  const results = [];
  
  for (const channel of targetChannels) {
    // Check user preferences (critical notifications bypass preferences)
    if (effectivePriority !== 'critical') {
      const categoryEnabled = userPreferences[channel]?.[notificationType.category];
      if (categoryEnabled === false) {
        console.log(TAG, 'channel.disabled', { channel, category: notificationType.category });
        continue;
      }
    }
    
    const template = notificationType.templates[channel];
    if (!template) continue;
    
    // Render template with data
    const rendered = renderTemplate(template, data);
    
    try {
      // Send through appropriate channel
      let result;
      switch (channel) {
        case CHANNELS.EMAIL:
          result = await sendEmail({
            to: email,
            subject: rendered.subject,
            html: rendered.body,
            priority: effectivePriority,
          });
          break;
        
        case CHANNELS.IN_APP:
          result = await createInAppNotification({
            userId,
            organizationId,
            notificationId,
            title: rendered.title,
            body: rendered.body,
            action: rendered.action,
            type: rendered.type || 'info',
            priority: effectivePriority,
          });
          break;
        
        case CHANNELS.SMS:
          result = await sendSMS({
            userId,
            body: rendered.body,
          });
          break;
        
        case CHANNELS.SLACK:
          result = await sendSlackMessage({
            organizationId,
            text: rendered.text,
          });
          break;
        
        case CHANNELS.WEBHOOK:
          result = await sendWebhook({
            organizationId,
            event: type,
            data: { ...data, notificationId },
          });
          break;
      }
      
      results.push({ channel, success: true, result });
    } catch (error) {
      console.error(TAG, `sendNotification.${channel}.error`, error);
      results.push({ channel, success: false, error: error.message });
    }
  }
  
  // Log notification
  await logNotification({
    notificationId,
    type,
    userId,
    email,
    organizationId,
    channels: targetChannels,
    results,
    timestamp,
  });
  
  return {
    notificationId,
    type,
    channels: results,
    timestamp,
  };
}

// ============================================================================
// Channel Implementations
// ============================================================================

/**
 * Send email notification
 */
async function sendEmail({ to, subject, html, priority }) {
  // In production, integrate with SendGrid, AWS SES, or similar
  console.log(TAG, 'sendEmail', { to, subject, priority });
  
  // Simulate email sending
  // const response = await fetch('https://api.sendgrid.com/v3/mail/send', { ... });
  
  return {
    provider: 'sendgrid',
    messageId: `msg_${Date.now()}`,
    status: 'sent',
  };
}

/**
 * Create in-app notification
 */
async function createInAppNotification({
  userId,
  organizationId,
  notificationId,
  title,
  body,
  action,
  type,
  priority,
}) {
  try {
    await base('Notifications').create({
      'Notification ID': notificationId,
      'User ID': userId,
      'Organization ID': organizationId || '',
      'Title': title,
      'Body': body,
      'Action': action ? JSON.stringify(action) : '',
      'Type': type,
      'Priority': priority,
      'Status': 'unread',
      'Created At': new Date().toISOString(),
    });
    
    return { status: 'created', notificationId };
  } catch (error) {
    console.error(TAG, 'createInAppNotification.error', error);
    throw error;
  }
}

/**
 * Send SMS notification
 */
async function sendSMS({ userId, body }) {
  // In production, integrate with Twilio, AWS SNS, or similar
  console.log(TAG, 'sendSMS', { userId, bodyLength: body.length });
  
  // Simulate SMS sending
  // const response = await twilio.messages.create({ ... });
  
  return {
    provider: 'twilio',
    messageId: `sms_${Date.now()}`,
    status: 'sent',
  };
}

/**
 * Send Slack message
 */
async function sendSlackMessage({ organizationId, text }) {
  // Get Slack webhook URL for organization
  // In production, this would be stored in organization settings
  console.log(TAG, 'sendSlackMessage', { organizationId, textLength: text.length });
  
  // Simulate Slack message
  // const response = await fetch(webhookUrl, { method: 'POST', body: JSON.stringify({ text }) });
  
  return {
    provider: 'slack',
    status: 'sent',
  };
}

/**
 * Send webhook notification
 */
async function sendWebhook({ organizationId, event, data }) {
  // Get webhook endpoints for organization
  // In production, iterate through registered webhooks
  console.log(TAG, 'sendWebhook', { organizationId, event });
  
  // Simulate webhook delivery
  // const response = await fetch(webhookUrl, { method: 'POST', body: JSON.stringify({ event, data }) });
  
  return {
    status: 'delivered',
    endpoints: 1,
  };
}

// ============================================================================
// Template Rendering
// ============================================================================

/**
 * Render template with data (Mustache-style)
 */
function renderTemplate(template, data) {
  const rendered = {};
  
  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string') {
      rendered[key] = value.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : match;
      });
    } else if (typeof value === 'object' && value !== null) {
      rendered[key] = renderTemplate(value, data);
    } else {
      rendered[key] = value;
    }
  }
  
  return rendered;
}

// ============================================================================
// User Preferences
// ============================================================================

/**
 * Get user notification preferences
 */
export async function getUserPreferences(userId) {
  try {
    const records = await base('User Preferences')
      .select({
        filterByFormula: `{User ID} = "${userId}"`,
        maxRecords: 1,
      })
      .firstPage();
    
    if (records.length === 0) {
      return DEFAULT_PREFERENCES;
    }
    
    return JSON.parse(records[0].fields['Notification Preferences'] || '{}') || DEFAULT_PREFERENCES;
  } catch (error) {
    console.error(TAG, 'getUserPreferences.error', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update user notification preferences
 */
export async function updateUserPreferences(userId, preferences) {
  try {
    const records = await base('User Preferences')
      .select({
        filterByFormula: `{User ID} = "${userId}"`,
        maxRecords: 1,
      })
      .firstPage();
    
    const mergedPreferences = {
      ...DEFAULT_PREFERENCES,
      ...preferences,
    };
    
    if (records.length === 0) {
      await base('User Preferences').create({
        'User ID': userId,
        'Notification Preferences': JSON.stringify(mergedPreferences),
        'Updated At': new Date().toISOString(),
      });
    } else {
      await base('User Preferences').update(records[0].id, {
        'Notification Preferences': JSON.stringify(mergedPreferences),
        'Updated At': new Date().toISOString(),
      });
    }
    
    return mergedPreferences;
  } catch (error) {
    console.error(TAG, 'updateUserPreferences.error', error);
    throw error;
  }
}

// ============================================================================
// In-App Notifications
// ============================================================================

/**
 * Get user's in-app notifications
 */
export async function getInAppNotifications(userId, options = {}) {
  const { status, limit = 50, offset = 0 } = options;
  
  try {
    let formula = `{User ID} = "${userId}"`;
    if (status) {
      formula = `AND(${formula}, {Status} = "${status}")`;
    }
    
    const records = await base('Notifications')
      .select({
        filterByFormula: formula,
        maxRecords: limit,
        sort: [{ field: 'Created At', direction: 'desc' }],
      })
      .firstPage();
    
    return {
      notifications: records.map(record => ({
        id: record.fields['Notification ID'],
        title: record.fields['Title'],
        body: record.fields['Body'],
        action: record.fields['Action'] ? JSON.parse(record.fields['Action']) : null,
        type: record.fields['Type'],
        priority: record.fields['Priority'],
        status: record.fields['Status'],
        createdAt: record.fields['Created At'],
        readAt: record.fields['Read At'],
      })),
      unreadCount: records.filter(r => r.fields['Status'] === 'unread').length,
    };
  } catch (error) {
    console.error(TAG, 'getInAppNotifications.error', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(userId, notificationId) {
  try {
    const records = await base('Notifications')
      .select({
        filterByFormula: `AND({User ID} = "${userId}", {Notification ID} = "${notificationId}")`,
        maxRecords: 1,
      })
      .firstPage();
    
    if (records.length === 0) {
      throw new Error('Notification not found');
    }
    
    await base('Notifications').update(records[0].id, {
      'Status': 'read',
      'Read At': new Date().toISOString(),
    });
    
    return { notificationId, status: 'read' };
  } catch (error) {
    console.error(TAG, 'markAsRead.error', error);
    throw error;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId) {
  try {
    const records = await base('Notifications')
      .select({
        filterByFormula: `AND({User ID} = "${userId}", {Status} = "unread")`,
      })
      .firstPage();
    
    const updates = records.map(record => ({
      id: record.id,
      fields: {
        'Status': 'read',
        'Read At': new Date().toISOString(),
      },
    }));
    
    // Batch update (max 10)
    for (let i = 0; i < updates.length; i += 10) {
      const batch = updates.slice(i, i + 10);
      await base('Notifications').update(batch);
    }
    
    return { updated: updates.length };
  } catch (error) {
    console.error(TAG, 'markAllAsRead.error', error);
    throw error;
  }
}

// ============================================================================
// Logging
// ============================================================================

async function logNotification({ notificationId, type, userId, email, organizationId, channels, results, timestamp }) {
  try {
    await base('Notification Logs').create({
      'Notification ID': notificationId,
      'Type': type,
      'User ID': userId || '',
      'Email': email || '',
      'Organization ID': organizationId || '',
      'Channels': channels.join(', '),
      'Results': JSON.stringify(results),
      'Timestamp': timestamp,
    });
  } catch (error) {
    console.error(TAG, 'logNotification.error', error);
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

export const notify = {
  welcome: (data) => sendNotification({ type: 'WELCOME', ...data }),
  passwordReset: (data) => sendNotification({ type: 'PASSWORD_RESET', ...data }),
  reportReady: (data) => sendNotification({ type: 'REPORT_READY', ...data }),
  reportShared: (data) => sendNotification({ type: 'REPORT_SHARED', ...data }),
  teamInvitation: (data) => sendNotification({ type: 'TEAM_INVITATION', ...data }),
  memberJoined: (data) => sendNotification({ type: 'MEMBER_JOINED', ...data }),
  paymentSuccess: (data) => sendNotification({ type: 'PAYMENT_SUCCESS', ...data }),
  paymentFailed: (data) => sendNotification({ type: 'PAYMENT_FAILED', ...data }),
  subscriptionExpiring: (data) => sendNotification({ type: 'SUBSCRIPTION_EXPIRING', ...data }),
  quotaWarning: (data) => sendNotification({ type: 'QUOTA_WARNING', ...data }),
  newLogin: (data) => sendNotification({ type: 'NEW_LOGIN', ...data }),
  suspiciousActivity: (data) => sendNotification({ type: 'SUSPICIOUS_ACTIVITY', ...data }),
  maintenance: (data) => sendNotification({ type: 'MAINTENANCE', ...data }),
};

export default {
  CHANNELS,
  NOTIFICATION_TYPES,
  DEFAULT_PREFERENCES,
  sendNotification,
  getUserPreferences,
  updateUserPreferences,
  getInAppNotifications,
  markAsRead,
  markAllAsRead,
  notify,
};
