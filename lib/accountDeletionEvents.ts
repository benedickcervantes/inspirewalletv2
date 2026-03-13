/**
 * Pub/sub for account deletion WebSocket events.
 * When admin approves or rejects a deletion request, the backend emits real-time events.
 */

export type AccountDeletionApprovedCallback = () => void;
export type AccountDeletionRejectedCallback = (adminNotes?: string | null) => void;

const approvedListeners = new Set<AccountDeletionApprovedCallback>();
const rejectedListeners = new Set<AccountDeletionRejectedCallback>();

export function subscribeToAccountDeletionApproved(callback: AccountDeletionApprovedCallback) {
  if (typeof callback === 'function') {
    approvedListeners.add(callback);
  }
  return () => approvedListeners.delete(callback);
}

export function subscribeToAccountDeletionRejected(callback: AccountDeletionRejectedCallback) {
  if (typeof callback === 'function') {
    rejectedListeners.add(callback);
  }
  return () => rejectedListeners.delete(callback);
}

export function notifyAccountDeletionApproved() {
  approvedListeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.warn('[accountDeletionEvents] Approved listener error:', e);
    }
  });
}

export function notifyAccountDeletionRejected(adminNotes?: string | null) {
  rejectedListeners.forEach((cb) => {
    try {
      cb(adminNotes);
    } catch (e) {
      console.warn('[accountDeletionEvents] Rejected listener error:', e);
    }
  });
}
