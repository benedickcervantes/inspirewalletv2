/**
 * Simple pub/sub for TICKET_MESSAGE WebSocket events.
 * When the backend sends a new ticket message, the socket handler calls notifyNewTicketMessage(),
 * which triggers all subscribers (e.g. TicketList, TicketDetail) to update.
 */

type TicketMessageCallback = (message: any) => void;
const listeners = new Set<TicketMessageCallback>();

export function subscribeToNewTicketMessage(callback: TicketMessageCallback) {
  if (typeof callback === 'function') {
    listeners.add(callback);
    console.log(`[ticketingEvents] New subscriber added. Total subscribers: ${listeners.size}`);
  }
  return () => {
    listeners.delete(callback);
    console.log(`[ticketingEvents] Subscriber removed. Total subscribers: ${listeners.size}`);
  };
}

export function notifyNewTicketMessage(message: any) {
  console.log(`[ticketingEvents] Notifying ${listeners.size} subscribers about message:`, message.id);
  listeners.forEach((cb) => {
    try {
      cb(message);
    } catch (e) {
      console.warn('[ticketingEvents] Listener error:', e);
    }
  });
}

type TicketMessagesReadCallback = (ticketId: string) => void;
const readListeners = new Set<TicketMessagesReadCallback>();

export function subscribeToTicketMessagesRead(callback: TicketMessagesReadCallback) {
  if (typeof callback === 'function') {
    readListeners.add(callback);
  }
  return () => readListeners.delete(callback);
}

type TicketCreatedCallback = () => void;
const ticketCreatedListeners = new Set<TicketCreatedCallback>();

export function subscribeToTicketCreated(callback: TicketCreatedCallback) {
  if (typeof callback === 'function') {
    ticketCreatedListeners.add(callback);
  }
  return () => ticketCreatedListeners.delete(callback);
}

export function notifyTicketCreated() {
  ticketCreatedListeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.warn('[ticketingEvents] TicketCreated listener error:', e);
    }
  });
}

export function notifyTicketMessagesRead(ticketId: string) {
  if (!ticketId) return;
  readListeners.forEach((cb) => {
    try {
      cb(ticketId);
    } catch (e) {
      console.warn('[ticketingEvents] Read listener error:', e);
    }
  });
}
