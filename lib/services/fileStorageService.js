/**
 * Sovereign Intelligence Platform
 * File Storage Service - S3/R2 Compatible Storage
 */

import { prisma } from '../db/prisma';
import { createAuditLog, AUDIT_ACTIONS } from '../middleware/auditLogger';
import crypto from 'crypto';

// Storage configuration
const STORAGE_CONFIG = {
  bucket: process.env.S3_BUCKET || 'sovereign-intelligence',
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT || null,
  accessKey: process.env.S3_ACCESS_KEY,
  secretKey: process.env.S3_SECRET_KEY,
};

// File type restrictions
const ALLOWED_TYPES = {
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  spreadsheets: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
  images: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  data: ['application/json', 'text/plain', 'text/xml'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Generate secure file path
 */
function generateFilePath(organizationId, filename) {
  const hash = crypto.randomBytes(8).toString('hex');
  const ext = filename.split('.').pop();
  const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${organizationId}/${new Date().toISOString().slice(0, 7)}/${hash}-${sanitizedName}`;
}

/**
 * Validate file type
 */
function validateFileType(mimeType, category = null) {
  if (category && ALLOWED_TYPES[category]) {
    return ALLOWED_TYPES[category].includes(mimeType);
  }
  return Object.values(ALLOWED_TYPES).flat().includes(mimeType);
}

/**
 * Upload file to storage
 */
export async function uploadFile({
  file,
  filename,
  mimeType,
  organizationId,
  userId,
  reportId = null,
  metadata = {},
}) {
  // Validate file type
  if (!validateFileType(mimeType)) {
    throw new Error('File type not allowed');
  }
  
  // Validate file size
  if (file.length > MAX_FILE_SIZE) {
    throw new Error('File too large (max 50MB)');
  }
  
  const path = generateFilePath(organizationId, filename);
  
  // Upload to S3/R2 (placeholder - implement based on provider)
  let storageUrl;
  
  if (STORAGE_CONFIG.accessKey && STORAGE_CONFIG.secretKey) {
    // Real S3 upload would go here
    // For now, store locally or use placeholder
    storageUrl = `https://${STORAGE_CONFIG.bucket}.s3.${STORAGE_CONFIG.region}.amazonaws.com/${path}`;
    
    // TODO: Implement actual S3 upload
    // const s3 = new S3Client({ ... });
    // await s3.send(new PutObjectCommand({ ... }));
  } else {
    // Local storage fallback for development
    const fs = await import('fs/promises');
    const localPath = `./uploads/${path}`;
    await fs.mkdir(`./uploads/${organizationId}/${new Date().toISOString().slice(0, 7)}`, { recursive: true });
    await fs.writeFile(localPath, file);
    storageUrl = `/uploads/${path}`;
  }
  
  // Create database record
  const attachment = await prisma.attachment.create({
    data: {
      filename,
      mimeType,
      size: file.length,
      path,
      url: storageUrl,
      organizationId,
      uploadedById: userId,
      reportId,
      metadata,
    },
  });
  
  // Update storage usage
  await prisma.usageMetric.create({
    data: {
      organizationId,
      metric: 'storage_bytes',
      value: file.length,
      metadata: { fileId: attachment.id },
    },
  });
  
  await createAuditLog({
    action: AUDIT_ACTIONS.FILE_UPLOADED,
    resource: 'attachment',
    resourceId: attachment.id,
    organizationId,
    userId,
    details: { filename, size: file.length, mimeType },
  });
  
  return attachment;
}

/**
 * Get file download URL (signed URL for private files)
 */
export async function getDownloadUrl(attachmentId, organizationId, userId) {
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, organizationId },
  });
  
  if (!attachment) {
    throw new Error('File not found');
  }
  
  // Log access
  await createAuditLog({
    action: AUDIT_ACTIONS.FILE_DOWNLOADED,
    resource: 'attachment',
    resourceId: attachmentId,
    organizationId,
    userId,
    details: { filename: attachment.filename },
  });
  
  // For S3, generate signed URL
  if (STORAGE_CONFIG.accessKey && STORAGE_CONFIG.secretKey) {
    // TODO: Generate presigned URL
    // const command = new GetObjectCommand({ Bucket, Key: attachment.path });
    // return getSignedUrl(s3, command, { expiresIn: 3600 });
  }
  
  return attachment.url;
}

/**
 * Delete file from storage
 */
export async function deleteFile(attachmentId, organizationId, userId) {
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, organizationId },
  });
  
  if (!attachment) {
    throw new Error('File not found');
  }
  
  // Delete from storage
  if (STORAGE_CONFIG.accessKey && STORAGE_CONFIG.secretKey) {
    // TODO: Delete from S3
    // await s3.send(new DeleteObjectCommand({ Bucket, Key: attachment.path }));
  } else {
    // Delete local file
    const fs = await import('fs/promises');
    await fs.unlink(`./uploads/${attachment.path}`).catch(() => {});
  }
  
  // Delete database record
  await prisma.attachment.delete({ where: { id: attachmentId } });
  
  // Update storage usage (negative value)
  await prisma.usageMetric.create({
    data: {
      organizationId,
      metric: 'storage_bytes',
      value: -attachment.size,
      metadata: { fileId: attachmentId, deleted: true },
    },
  });
  
  await createAuditLog({
    action: AUDIT_ACTIONS.FILE_DELETED,
    resource: 'attachment',
    resourceId: attachmentId,
    organizationId,
    userId,
    details: { filename: attachment.filename },
  });
  
  return { success: true };
}

/**
 * List files for a report
 */
export async function listReportFiles(reportId, organizationId) {
  return prisma.attachment.findMany({
    where: { reportId, organizationId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      createdAt: true,
      uploadedBy: {
        select: { id: true, name: true },
      },
    },
  });
}

/**
 * Get organization storage usage
 */
export async function getStorageUsage(organizationId) {
  const result = await prisma.usageMetric.aggregate({
    where: { organizationId, metric: 'storage_bytes' },
    _sum: { value: true },
  });
  
  const totalBytes = result._sum?.value || 0;
  
  // Get plan limits
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true },
  });
  
  const limits = {
    FREE: 1 * 1024 * 1024 * 1024, // 1GB
    STARTER: 10 * 1024 * 1024 * 1024, // 10GB
    PROFESSIONAL: 100 * 1024 * 1024 * 1024, // 100GB
    ENTERPRISE: 1024 * 1024 * 1024 * 1024, // 1TB
    GOVERNMENT: 10 * 1024 * 1024 * 1024 * 1024, // 10TB
  };
  
  const limit = limits[org?.plan] || limits.FREE;
  
  return {
    used: totalBytes,
    limit,
    percentage: Math.round((totalBytes / limit) * 100),
    formatted: {
      used: formatBytes(totalBytes),
      limit: formatBytes(limit),
    },
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
  uploadFile,
  getDownloadUrl,
  deleteFile,
  listReportFiles,
  getStorageUsage,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
};
