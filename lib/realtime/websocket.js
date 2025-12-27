/**
 * Sovereign Intelligence Platform
 * WebSocket Real-Time Layer
 * 
 * Server-Sent Events + WebSocket for real-time updates
 * GRACEFUL DEGRADATION: Works without socket.io
 */

let Server;
let socketAvailable = false;
try {
  Server = require('socket.io').Server;
  socketAvailable = true;
} catch (e) {
  console.warn('[WebSocket] socket.io not installed - real-time disabled');
  socketAvailable = false;
}

let io = null;

// Channel names
export const CHANNELS = {
  REPORT_UPDATE: 'report:update',
  REPORT_STATUS: 'report:status',
  APPROVAL_REQUEST: 'approval:request',
  APPROVAL_RESPONSE: 'approval:response',
  NOTIFICATION: 'notification',
  PRESENCE: 'presence',
  SYSTEM: 'system',
};

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(server) {
  if (!socketAvailable) return null;
  if (io) return io;
  
  io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);
    
    // Join organization room
    socket.on('join:org', (orgId) => {
      socket.join(`org:${orgId}`);
      console.log(`[WS] ${socket.id} joined org:${orgId}`);
    });
    
    // Join report room (for collaborative editing)
    socket.on('join:report', (reportId) => {
      socket.join(`report:${reportId}`);
    });
    
    // Leave rooms
    socket.on('leave:org', (orgId) => {
      socket.leave(`org:${orgId}`);
    });
    
    socket.on('leave:report', (reportId) => {
      socket.leave(`report:${reportId}`);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get WebSocket instance
 */
export function getIO() {
  return io;
}

/**
 * Emit to organization
 */
export function emitToOrg(orgId, event, data) {
  if (!io) return;
  io.to(`org:${orgId}`).emit(event, data);
}

/**
 * Emit to report room
 */
export function emitToReport(reportId, event, data) {
  if (!io) return;
  io.to(`report:${reportId}`).emit(event, data);
}

/**
 * Emit report status change
 */
export function emitReportStatus(orgId, reportId, status, metadata = {}) {
  emitToOrg(orgId, CHANNELS.REPORT_STATUS, {
    reportId,
    status,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

/**
 * Emit approval request
 */
export function emitApprovalRequest(orgId, data) {
  emitToOrg(orgId, CHANNELS.APPROVAL_REQUEST, {
    ...data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit notification
 */
export function emitNotification(orgId, userId, notification) {
  if (!io) return;
  // Emit to specific user if online
  io.to(`user:${userId}`).emit(CHANNELS.NOTIFICATION, notification);
  // Also emit to org for dashboard updates
  emitToOrg(orgId, CHANNELS.NOTIFICATION, { ...notification, userId });
}

export default { initializeWebSocket, getIO, emitToOrg, emitToReport };
