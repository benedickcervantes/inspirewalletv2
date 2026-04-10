/**
 * Real-time WebSocket (Socket.IO) connection for Inspire Wallet.
 * Uses EXPO_PUBLIC_WALLET_BACKEND_URL from .env.
 * Auth: Option 2 - token as query parameter.
 *
 * @see docs/backenddocs/API-REALTIME.md
 */

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_WALLET_BACKEND_URL;
  if (!url) return null;
  return url.replace(/\/$/, '');
};

/**
 * Creates a Socket.IO connection for real-time wallet and transaction updates.
 * Uses query parameter for JWT: { token: accessToken }
 *
 * @param {string} accessToken - JWT from AsyncStorage
 * @param {object} handlers - { onWalletUpdate, onTransactionCreated, onConnect, onDisconnect, onError }
 * @returns {object|null} socket instance or null if URL/token missing
 */
export function createRealtimeConnection(accessToken, handlers = {}) {
  const baseUrl = getBaseUrl();
  if (!baseUrl || !accessToken) return null;

  try {
     
    const { io } = require('socket.io-client');

    const socket = io(baseUrl, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      query: { token: accessToken },
    });

    socket.on('WALLET_UPDATE', (payload) => {
      console.log('[realtime.js] WALLET_UPDATE received');
      handlers.onWalletUpdate?.(payload);
    });

    socket.on('TRANSACTION_CREATED', (payload) => {
      handlers.onTransactionCreated?.(payload);
    });

    socket.on('NEW_SUPPORT_MESSAGE', (payload) => {
      console.log('[realtime.js] NEW_SUPPORT_MESSAGE received');
      handlers.onNewSupportMessage?.(payload);
    });

    socket.on('SUPPORT_MESSAGES_READ', (payload) => {
      console.log('[realtime.js] SUPPORT_MESSAGES_READ received');
      handlers.onSupportMessagesRead?.(payload);
    });

    socket.on('TICKET_MESSAGE', (payload) => {
      console.log('[realtime.js] TICKET_MESSAGE received:', payload?.id, 'for ticket:', payload?.ticketId);
      handlers.onTicketMessage?.(payload);
    });

    socket.on('TICKET_MESSAGES_READ', (payload) => {
      handlers.onTicketMessagesRead?.(payload);
    });

    socket.on('TICKET_CREATED', (payload) => {
      handlers.onTicketCreated?.(payload);
    });

    socket.on('ACCOUNT_DELETION_APPROVED', () => {
      handlers.onAccountDeletionApproved?.();
    });

    socket.on('ACCOUNT_DELETION_REJECTED', (payload) => {
      handlers.onAccountDeletionRejected?.(payload);
    });

    socket.on('MAINTENANCE_UPDATED', (payload) => {
      handlers.onMaintenanceUpdated?.(payload);
    });

    socket.on('TRANSFER_PROCESSING_FEES_UPDATED', (payload) => {
      handlers.onTransferProcessingFeesUpdated?.(payload);
    });

    socket.on('connect', () => {
      handlers.onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      handlers.onDisconnect?.(reason);
    });

    socket.on('connect_error', (err) => {
      handlers.onError?.(err);
    });

    return socket;
  } catch (e) {
    handlers.onError?.(e);
    return null;
  }
}

/**
 * Start heartbeat (PING every 30s) to keep connection alive.
 * @param {object} socket - Socket.IO instance
 * @returns {function} cleanup function to clear the interval
 */
export function startHeartbeat(socket) {
  if (!socket) return () => { };
  const pingInterval = setInterval(() => {
    if (socket.connected) socket.emit('PING');
  }, 30000);
  return () => clearInterval(pingInterval);
}
