import React from 'react';
import { useSocket } from '../../context/SocketContext';
import ServerOffline from './ServerOffline';

export const OfflineWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isServerOffline } = useSocket();

    if (isServerOffline) {
        return <ServerOffline />;
    }

    return <>{children}</>;
};

export default OfflineWrapper;
