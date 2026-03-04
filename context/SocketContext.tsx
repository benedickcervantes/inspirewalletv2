import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createRealtimeConnection, startHeartbeat } from '../configs/realtime';
import { notifyNewSupportMessage } from '../lib/messagingEvents';
import { notifyNewTicketMessage } from '../lib/ticketingEvents';

interface SocketContextType {
    isConnected: boolean;
    getSocket: () => any | null;
    refreshConnection: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<any>(null);
    const heartbeatCleanupRef = useRef<(() => void) | null>(null);

    const connect = async () => {
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
                if (socket) {
                    heartbeatCleanupRef.current = startHeartbeat(socket) as () => void;
                }
            },
            onDisconnect: () => {
                console.log('[SocketProvider] Disconnected');
                setIsConnected(false);
                heartbeatCleanupRef.current?.();
                heartbeatCleanupRef.current = null;
            },
            onNewSupportMessage: () => {
                notifyNewSupportMessage();
            },
            onTicketMessage: (payload: any) => {
                notifyNewTicketMessage(payload);
            },
            onWalletUpdate: (payload: any) => {
                // We could also notify here if there was a wallet events lib
                console.log('[SocketProvider] Wallet update received', payload);
            },
            onTransactionCreated: () => {
                console.log('[SocketProvider] Transaction created');
            },
            onError: (err: any) => {
                console.error('[SocketProvider] Error:', err);
            }
        });

        if (socket) {
            socketRef.current = socket;
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
        await connect();
    };

    // Provide a getter function to always access the current socket
    const getSocket = () => socketRef.current;

    return (
        <SocketContext.Provider value={{ isConnected, getSocket, refreshConnection }}>
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
