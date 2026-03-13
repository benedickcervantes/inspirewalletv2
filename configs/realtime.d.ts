export interface WalletUpdatePayload {
  walletId?: string;
  balance?: number | string;
}

export interface RealtimeHandlers {
  onWalletUpdate?: (payload: WalletUpdatePayload) => void;
  onTransactionCreated?: (payload?: unknown) => void;
  onNewSupportMessage?: (payload?: unknown) => void;
  onSupportMessagesRead?: (payload?: unknown) => void;
  onTicketMessage?: (payload?: any) => void;
  onTicketMessagesRead?: (payload?: { ticketId?: string }) => void;
  onTicketCreated?: () => void;
  onAccountDeletionApproved?: () => void;
  onAccountDeletionRejected?: (payload?: { adminNotes?: string | null }) => void;
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onError?: (err?: unknown) => void;
}

export interface RealtimeSocket {
  disconnect: () => void;
  emit: (event: string, ...args: any[]) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
  connected: boolean;
}

export function createRealtimeConnection(
  accessToken: string,
  handlers?: RealtimeHandlers
): RealtimeSocket | null;

export function startHeartbeat(socket: RealtimeSocket | null): () => void;
