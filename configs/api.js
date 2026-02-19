/**
 * Wallet backend API helpers.
 * Uses EXPO_PUBLIC_WALLET_BACKEND_URL (InpireWalletv3_Backend).
 */

const getWalletBackendUrl = () => {
  const url = process.env.EXPO_PUBLIC_WALLET_BACKEND_URL;
  if (!url) return null;
  return url.replace(/\/$/, '');
};

/**
 * Submit a deposit request via the backend.
 * @param {string} firebaseIdToken - From auth.currentUser.getIdToken()
 * @param {Object} body - { type, amount, currency, depositMethod?, contractPeriod?, maturityDate?, userName?, userEmail? }
 * @returns {Promise<{ success: boolean, data?: { id }, error?: string }>}
 */
export async function submitDepositRequest(firebaseIdToken, body) {
  const base = getWalletBackendUrl();
  if (!base) {
    return { success: false, error: 'Backend URL not configured' };
  }
  try {
    const res = await fetch(`${base}/api/deposit-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firebaseIdToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.error || `Request failed (${res.status})`,
      };
    }
    return { success: true, data: data.data };
  } catch (e) {
    return {
      success: false,
      error: e.message || 'Network error. Is the backend running?',
    };
  }
}
