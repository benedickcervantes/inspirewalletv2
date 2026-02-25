/**
 * Simple pub/sub for NEW_SUPPORT_MESSAGE WebSocket events.
 * When the backend sends a new support message, the socket handler calls notifyNewSupportMessage(),
 * which triggers all subscribers (e.g. Message screen) to refetch.
 */

const listeners = new Set();

export function subscribeToNewSupportMessage(callback) {
  if (typeof callback === 'function') {
    listeners.add(callback);
  }
  return () => listeners.delete(callback);
}

export function notifyNewSupportMessage() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      if (__DEV__) console.warn('[messagingEvents] Listener error:', e);
    }
  });
}
