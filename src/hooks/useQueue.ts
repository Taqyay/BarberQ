import { useState, useEffect } from 'react';
import { queueManager } from '../services/queueManager';
import type { Client, BarberState, Settings } from '../types';

export function useQueue() {
    const [data, setData] = useState<{ clients: Client[], barbers: BarberState[], settings: Settings, isConnected: boolean }>({
        clients: queueManager.getClients(),
        barbers: queueManager.getBarbers(),
        settings: queueManager.getSettings(),
        isConnected: queueManager.getConnectionStatus()
    });

    useEffect(() => {
        const sync = () => {
            setData({
                clients: queueManager.getClients(),
                barbers: queueManager.getBarbers(),
                settings: queueManager.getSettings(),
                isConnected: queueManager.getConnectionStatus()
            });
        };

        // Initial fetch
        sync();

        // Subscribe
        const unsubscribe = queueManager.subscribe(sync);

        return unsubscribe;
    }, []);

    return data;
}
