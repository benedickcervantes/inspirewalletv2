export interface WalletUpdatePayload {
  walletId?: string;
  balance?: number | string;
}

export interface RealtimeHandlers {
  onWalletUpdate?: (payload: WalletUpdatePayload) => void;
  onTransactionCreated?: (payload?: unknown) => void;
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onError?: (err?: unknown) => void;
}

export interface RealtimeSocket {
  disconnect: () => void;
}

export function createRealtimeConnection(
  accessToken: string,
  handlers?: RealtimeHandlers
): RealtimeSocket | null;

export function startHeartbeat(socket: RealtimeSocket | null): () => void;
