/**
 * Pub/sub for TRANSFER_PROCESSING_FEES_UPDATED WebSocket events.
 * SocketProvider calls notifyTransferProcessingFeesUpdated; transfer screens subscribe.
 */

import {
  feeConfigFromApiData,
  type TransferProcessingFeesConfig,
} from "../app/ServicesFunction/Transfer/transferProcessingFee";

type Listener = (config: TransferProcessingFeesConfig) => void;
const listeners = new Set<Listener>();

export function subscribeTransferProcessingFeesUpdated(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function parseSocketPayload(raw: unknown): TransferProcessingFeesConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const overflow = Number(o.overflowFeePhp);
  const bracketsRaw = o.brackets;
  if (!Array.isArray(bracketsRaw) || !Number.isFinite(overflow)) return null;
  const brackets: { maxAmount: number; feePhp: number }[] = [];
  for (const item of bracketsRaw) {
    if (!item || typeof item !== "object") continue;
    const b = item as Record<string, unknown>;
    const maxAmount = Number(b.maxAmount);
    const feePhp = Number(b.feePhp);
    if (Number.isFinite(maxAmount) && Number.isFinite(feePhp)) {
      brackets.push({ maxAmount, feePhp });
    }
  }
  if (brackets.length === 0) return null;
  return feeConfigFromApiData({ brackets, overflowFeePhp: overflow });
}

export function notifyTransferProcessingFeesUpdated(payload: unknown) {
  const config = parseSocketPayload(payload);
  if (!config) return;
  listeners.forEach((cb) => {
    try {
      cb(config);
    } catch (e) {
      console.warn("[transferProcessingFeesEvents] listener error", e);
    }
  });
}
