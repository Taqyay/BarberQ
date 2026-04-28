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
    const [serviceId, setServiceId] = useState('');
    const { clients, barbers, settings } = useQueue();

    const mainServices = settings?.services?.filter(s => s.category === 'Main Services') || [];

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
        const client = queueManager.addClient(name, preference, 'qr', groupSize, serviceId);
        onJoin(client.id);
    };

    const sortedActiveBarbers = [...activeBarbers].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="container fade-in">
            <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1 style={{ color: 'var(--color-gold)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>BarberQ</h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>Premium Cuts. Zero Wait.</p>
            </header>

            <div className="card" style={{ marginBottom: '2rem' }}>
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
                        background: 'var(--color-surface)',
                        border: '2px solid var(--color-border)',
                        color: 'var(--color-text-main)',
                        padding: '1rem',
                        fontSize: '1.25rem',
                        borderRadius: '12px',
                        outline: 'none',
                        marginBottom: '1.5rem',
                        transition: 'border-color 0.2s',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-gold)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                />

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
                                borderRadius: '12px',
                                border: groupSize === num ? '2px solid var(--color-gold)' : '1px solid var(--color-border)',
                                background: groupSize === num ? 'var(--color-gold)' : 'var(--color-surface)',
                                color: groupSize === num ? '#000' : 'var(--color-text-main)',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: groupSize === num ? '0 4px 12px rgba(212, 175, 55, 0.3)' : '0 2px 4px rgba(0,0,0,0.05)',
                                transform: groupSize === num ? 'scale(1.05)' : 'scale(1)'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = groupSize === num ? 'scale(1.05)' : 'scale(1)'}
                        >
                            {num}
                        </button>
                    ))}
                </div>

                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    MAIN SERVICE
                </label>
                <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    style={{
                        width: '100%',
                        background: 'var(--color-surface)',
                        border: '2px solid var(--color-border)',
                        color: 'var(--color-text-main)',
                        padding: '1rem',
                        fontSize: '1rem',
                        borderRadius: '12px',
                        outline: 'none',
                        appearance: 'none',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-gold)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                    <option value="">Select a service...</option>
                    {mainServices.map(s => (
                        <option key={s.id} value={s.id}>{s.name} - {s.price}</option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'grid', gap: '1.25rem' }}>
                <BarberButton
                    name={activeBarbers.length === 0 ? "Join Queue" : "Next Available"}
                    wait={`${getNextAvailableWait()}m`}
                    isSpecial
                    onClick={() => handleJoin('next_available')}
                    disabled={!name}
                />

                {sortedActiveBarbers.map(b => (
                    <BarberButton
                        key={b.id}
                        name={b.name}
                        wait={`${getWaitTime(b.id)}m`}
                        onClick={() => handleJoin(b.id)}
                        disabled={!name}
                    />
                ))}
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
                padding: '1.75rem',
                borderRadius: '16px',
                background: isSpecial ? 'var(--color-gold)' : 'var(--color-surface)',
                color: isSpecial ? '#000' : 'var(--color-text-main)',
                border: isSpecial ? 'none' : '2px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: disabled ? 0.6 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isSpecial 
                    ? '0 8px 24px rgba(212, 175, 55, 0.4)' 
                    : '0 4px 12px rgba(0,0,0,0.08)',
                transform: 'translateY(0)'
            }}
            onMouseOver={(e) => {
                if (!disabled) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = isSpecial 
                        ? '0 12px 32px rgba(212, 175, 55, 0.5)' 
                        : '0 8px 20px rgba(0,0,0,0.12)';
                    if (!isSpecial) e.currentTarget.style.borderColor = 'var(--color-gold)';
                }
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isSpecial 
                    ? '0 8px 24px rgba(212, 175, 55, 0.4)' 
                    : '0 4px 12px rgba(0,0,0,0.08)';
                if (!isSpecial) e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
        >
            <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{name}</span>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, opacity: isSpecial ? 0.9 : 1 }}>{wait}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 600 }}>current wait</div>
            </div>
        </button>
    );
}
