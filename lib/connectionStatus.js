/**
 * Tracks WebSocket connection status for the current user.
 * When connected, the backend marks the user as "online" (per API-USER-ACTIVITY.md).
 * Used by Message screen to show Online/Offline in the header.
 */

let isConnected = false;
const listeners = new Set();

export function getConnectionStatus() {
  return isConnected;
}

export function setConnectionStatus(connected) {
  if (isConnected === connected) return;
  isConnected = connected;
  listeners.forEach((cb) => {
    try {
      cb(connected);
    } catch (e) {
      if (__DEV__) console.warn('[connectionStatus] Listener error:', e);
    }
  });
}

export function subscribeToConnectionStatus(callback) {
  if (typeof callback === 'function') {
    listeners.add(callback);
    callback(isConnected);
  }
  return () => listeners.delete(callback);
}
