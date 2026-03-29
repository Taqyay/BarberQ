import { useState, useEffect } from 'react';
import { useQueue } from '../hooks/useQueue';
import { queueManager } from '../services/queueManager';
import { io } from "socket.io-client";
import type { BarberId } from '../types';

interface Props {
    onJoin: (clientId: string) => void;
}

// Hardcoded BARBERS removed. Using dynamic state.

export function CustomerLanding({ onJoin }: Props) {
    const [name, setName] = useState('');
    const [groupSize, setGroupSize] = useState(1);
    const { clients, barbers } = useQueue();

    const getWaitTime = (barberId: BarberId) => {
        // 1. Count people in chair or waiting for this specific barber
        // Note: This is an estimation. 
        // "In Chair" = 15m remaining (avg). "Waiting" = +15m each.

        // Filter active clients for this barber
        const relevantClients = clients.filter(c =>
            (c.status === 'in_chair' || c.status === 'waiting') &&
            (c.assignedBarber === barberId || (!c.assignedBarber && c.barberPreference === barberId))
        );

        // Basic calc: 15 mins per person
        // If someone is in chair, maybe count them as partial? using 15m for simplicity.
        const peopleCount = relevantClients.reduce((sum, c) => sum + (c.remainingSize || 1), 0);
        const wait = peopleCount * 15;
        return wait;
    };

    const activeBarbers = barbers.filter(b => b.isAvailable);

    const getNextAvailableWait = () => {
        // Min of specific queues
        if (activeBarbers.length === 0) return 5; // Default assumption if all off shift? or just 0?
        const waits = activeBarbers.map(b => getWaitTime(b.id));
        return Math.min(...waits);
    };

    useEffect(() => {
        // Intent Tracking: Track that someone scanned the QR / opened the landing page
        const socket = io();
        socket.emit('TRACK_SCAN');
        return () => {
            socket.disconnect();
        };
    }, []);

    const handleJoin = (preference: BarberId) => {
        if (!name.trim()) return;
        const client = queueManager.addClient(name, preference, 'qr', groupSize);
        onJoin(client.id);
    };

    return (
        <div className="container fade-in">
            <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1 style={{ color: 'var(--color-gold)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>BarberQ</h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>Premium Cuts. Zero Wait.</p>
            </header>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    GROUP SIZE
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {[1, 2, 3, 4, 5].map(num => (
                        <button
                            key={num}
                            onClick={() => setGroupSize(num)}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                borderRadius: '8px',
                                border: groupSize === num ? '1px solid var(--color-gold)' : '1px solid rgba(255,255,255,0.1)',
                                background: groupSize === num ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255,255,255,0.05)',
                                color: groupSize === num ? 'var(--color-gold)' : '#fff',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: '0.2s'
                            }}
                        >
                            {num}
                        </button>
                    ))}
                </div>

                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    YOUR FIRST NAME
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Abdur"
                    style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        padding: '1rem',
                        fontSize: '1.25rem',
                        borderRadius: '8px',
                        outline: 'none'
                    }}
                />
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {activeBarbers.map(b => (
                    <BarberButton
                        key={b.id}
                        name={b.name}
                        wait={`${getWaitTime(b.id)}m`}
                        onClick={() => handleJoin(b.id)}
                        disabled={!name}
                    />
                ))}

                <BarberButton
                    name={activeBarbers.length === 0 ? "Join Queue" : "Next Available"}
                    wait={`${getNextAvailableWait()}m`}
                    isSpecial
                    onClick={() => handleJoin('next_available')}
                    disabled={!name}
                />
            </div>
        </div>
    );
}

function BarberButton({ name, wait, onClick, disabled, isSpecial }: any) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                width: '100%',
                padding: '1.5rem',
                borderRadius: '12px',
                background: isSpecial ? 'var(--color-gold)' : 'var(--color-bg-card)',
                color: isSpecial ? '#000' : '#fff',
                border: isSpecial ? 'none' : '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: disabled ? 0.5 : 1,
                transition: '0.2s',
                boxShadow: isSpecial ? '0 4px 12px rgba(212, 175, 55, 0.2)' : 'none'
            }}
        >
            <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{name}</span>
            <span style={{ fontSize: '1rem', opacity: isSpecial ? 0.8 : 0.5 }}>{wait} wait</span>
        </button>
    );
}
