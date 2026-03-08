/**
 * EmailJS integration for transfer receipts.
 * Sends email receipts to the user after successful transfers.
 *
 * Setup:
 * 1. Add to .env: EXPO_PUBLIC_EMAILJS_SERVICE_ID, EXPO_PUBLIC_EMAILJS_PUBLIC_KEY
 * 2. In EmailJS Account → Security: enable "Allow API requests from non-browser apps"
 * 3. Templates in dashboard:
 *    - Inspire_Wallet_Transfer_V2: template_abzen1m (Available Balance)
 *    - Inspire_Wallet_Transfer_Agent_V2: template_t43wjqa (Agent Wallet)
 *
 * Template variables available: to_email, user_email, sender_name, recipient_name,
 * recipient_account, amount, description, date, transfer_type
 */

import { send } from "@emailjs/react-native";

const SERVICE_ID = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID ?? "";
const PUBLIC_KEY = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY ?? "";

/** Template IDs from EmailJS dashboard */
export const TEMPLATE_IDS = {
  /** Available Balance transfer receipt */
  AVAILABLE_BALANCE: "template_abzen1m",
  /** Agent Wallet transfer receipt */
  AGENT_WALLET: "template_t43wjqa",
} as const;

export interface TransferReceiptParams {
  /** Recipient email (user who made the transfer - they receive the receipt) */
  toEmail: string;
  /** Sender name (user who made the transfer) */
  senderName: string;
  /** Recipient name (who received the funds) */
  recipientName: string;
  /** Recipient account number */
  recipientAccount: string;
  /** Transfer amount (formatted, e.g. "1,234.56") */
  amount: string;
  /** Optional description */
  description?: string;
  /** Transfer type label for receipt */
  transferType: "available" | "agent";
}

function isEmailJSConfigured(): boolean {
  return Boolean(SERVICE_ID && PUBLIC_KEY);
}

/**
 * Send a transfer receipt email via EmailJS.
 * Fire-and-forget: does not block UI; logs errors.
 */
export async function sendTransferReceipt(params: TransferReceiptParams): Promise<void> {
  if (!isEmailJSConfigured()) {
    console.warn("[EmailReceipt] EmailJS not configured. Add EXPO_PUBLIC_EMAILJS_SERVICE_ID and EXPO_PUBLIC_EMAILJS_PUBLIC_KEY to .env");
    return;
  }
  if (!params.toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.toEmail)) {
    console.warn("[EmailReceipt] Invalid or missing recipient email, skipping receipt.");
    return;
  }

  const templateId =
    params.transferType === "available"
      ? TEMPLATE_IDS.AVAILABLE_BALANCE
      : TEMPLATE_IDS.AGENT_WALLET;

  const templateParams = {
    to_email: params.toEmail,
    user_email: params.toEmail,
    sender_name: params.senderName,
    recipient_name: params.recipientName,
    recipient_account: params.recipientAccount,
    amount: params.amount,
    description: params.description ?? "N/A",
    date: new Date().toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    transfer_type:
      params.transferType === "available"
        ? "Available Balance"
        : "Agent Wallet",
  };

  try {
    await send(SERVICE_ID, templateId, templateParams, { publicKey: PUBLIC_KEY });
  } catch (error) {
    console.error("[EmailReceipt] Failed to send receipt:", error);
  }
}
