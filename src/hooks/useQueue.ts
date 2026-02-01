import { useState, useEffect } from 'react';
import { queueManager } from '../services/queueManager';
import type { Client, BarberState } from '../types';

export function useQueue() {
    const [data, setData] = useState<{ clients: Client[], barbers: BarberState[] }>({
        clients: queueManager.getClients(),
        barbers: queueManager.getBarbers()
    });

    useEffect(() => {
        const sync = () => {
            setData({
                clients: queueManager.getClients(),
                barbers: queueManager.getBarbers()
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
