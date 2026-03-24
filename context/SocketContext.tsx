import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createRealtimeConnection, startHeartbeat } from '../configs/realtime';
import { notifyAccountDeletionApproved, notifyAccountDeletionRejected } from '../lib/accountDeletionEvents';
import { notifyNewSupportMessage } from '../lib/messagingEvents';
import { notifyNewTicketMessage, notifyTicketMessagesRead, notifyTicketCreated } from '../lib/ticketingEvents';

interface SocketContextType {
    isConnected: boolean;
    isServerOffline: boolean;
    getSocket: () => any | null;
    refreshConnection: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isServerOffline, setIsServerOffline] = useState(false);
    const socketRef = useRef<any>(null);
    const heartbeatCleanupRef = useRef<(() => void) | null>(null);
    const isConnectingRef = useRef(false);

    const connect = async () => {
        if (isConnectingRef.current) return;
        isConnectingRef.current = true;
        try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setIsConnected(false);
            return;
        }

        if (socketRef.current && socketRef.current.connected) return;

        console.log('[SocketProvider] Connecting to WebSocket...');
        const socket = createRealtimeConnection(token, {
            onConnect: () => {
                console.log('[SocketProvider] Connected');
                setIsConnected(true);
                setIsServerOffline(false);
                if (socket) {
                    heartbeatCleanupRef.current = startHeartbeat(socket) as () => void;
                }
            },
            onDisconnect: (reason?: string) => {
                console.log('[SocketProvider] Disconnected, reason:', reason);
                setIsConnected(false);
                heartbeatCleanupRef.current?.();
                heartbeatCleanupRef.current = null;
                
                // If it's a transport close or ping timeout, server might be offline
                if (reason === 'transport close' || reason === 'transport error' || reason === 'ping timeout') {
                    setIsServerOffline(true);
                }
            },
            onNewSupportMessage: () => {
                notifyNewSupportMessage();
            },
            onSupportMessagesRead: () => {
                notifyNewSupportMessage();
            },
            onTicketMessage: (payload: any) => {
                notifyNewTicketMessage(payload);
            },
            onTicketMessagesRead: (payload: any) => {
                if (payload?.ticketId) notifyTicketMessagesRead(payload.ticketId);
            },
            onTicketCreated: () => {
                notifyTicketCreated();
            },
            onAccountDeletionApproved: () => {
                notifyAccountDeletionApproved();
            },
            onAccountDeletionRejected: (payload?: { adminNotes?: string | null }) => {
                notifyAccountDeletionRejected(payload?.adminNotes);
            },
            onWalletUpdate: (payload: any) => {
                // We could also notify here if there was a wallet events lib
                console.log('[SocketProvider] Wallet update received', payload);
            },
            onTransactionCreated: () => {
                console.log('[SocketProvider] Transaction created');
            },
            onError: (err: any) => {
                console.error('[SocketProvider] Error:', err?.message || err);
                // Broaden the offline detection for any connection error
                if (
                    err?.message?.includes('websocket error') || 
                    String(err).includes('websocket error') ||
                    err?.message?.includes('xhr poll error') ||
                    err?.message?.includes('Network Error') ||
                    err?.message?.includes('timeout') ||
                    err?.type === 'TransportError'
                ) {
                    setIsServerOffline(true);
                } else {
                    // Fallback: any connect_error might mean server is offline for socket.io
                    setIsServerOffline(true);
                }
            }
        });

        if (socket) {
            socketRef.current = socket;
        }
        } finally {
            isConnectingRef.current = false;
        }
    };

    useEffect(() => {
        // Initial attempt
        connect();

        // Periodic check to support connecting after login if the app was started without a token
        const interval = setInterval(() => {
            if (!isConnected && !socketRef.current?.connected) {
                console.log('[SocketProvider] Not connected, checking for token...');
                connect();
            }
        }, 5000); // Check every 5 seconds if not connected

        return () => {
            clearInterval(interval);
            if (socketRef.current) {
                console.log('[SocketProvider] Cleaning up socket connection');
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            heartbeatCleanupRef.current?.();
        };
    }, []);

    const refreshConnection = async () => {
        console.log('[SocketProvider] Manual refresh requested');
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setIsServerOffline(false); // Optimistically set false so UI updates
        await connect();
    };

    // Provide a getter function to always access the current socket
    const getSocket = () => socketRef.current;

    return (
        <SocketContext.Provider value={{ isConnected, isServerOffline, getSocket, refreshConnection }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
