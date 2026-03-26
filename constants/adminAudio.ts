export const DEFAULT_TRANSFER_SUCCESS_SOUND = require("../assets/sounds/pay_now.wav");

let adminTransferSuccessSound: string | null = null;
let inFlightRefresh: Promise<string | null> | null = null;

function getBackendBaseUrl() {
  return process.env.EXPO_PUBLIC_WALLET_BACKEND_URL?.replace(/\/$/, "") || "";
}

function getApiKey() {
  return process.env.EXPO_PUBLIC_API_KEY?.trim() || "";
}

export function setAdminTransferSuccessSound(uri: string | null) {
  adminTransferSuccessSound = uri?.trim() || null;
}

export async function refreshAdminTransferSuccessSound() {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
    const baseUrl = getBackendBaseUrl();
    if (!baseUrl) {
      adminTransferSuccessSound = null;
      return null;
    }

    try {
      const response = await fetch(`${baseUrl}/system-settings/transfer-success-audio`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": getApiKey(),
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return adminTransferSuccessSound;
      }

      const nextUrl =
        data?.data?.activeAudioUrl && typeof data.data.activeAudioUrl === "string"
          ? data.data.activeAudioUrl
          : null;
      adminTransferSuccessSound = nextUrl;
      return nextUrl;
    } catch {
      return adminTransferSuccessSound;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

export function getTransferSuccessSound() {
  return adminTransferSuccessSound
    ? { uri: adminTransferSuccessSound }
    : DEFAULT_TRANSFER_SUCCESS_SOUND;
}
