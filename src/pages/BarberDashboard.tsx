import { useState } from 'react';
import { useQueue } from '../hooks/useQueue';
import { queueManager } from '../services/queueManager';
import type { BarberId, Client } from '../types';
import { CalendarView } from '../components/CalendarView';

const BARBERS: { id: BarberId; name: string }[] = [
    { id: 'Mo', name: 'Mo' },
    { id: 'Steve', name: 'Steve' },
    { id: 'Sarah', name: 'Sarah' },
];

export function BarberDashboard() {
    const { clients, barbers } = useQueue();
    const [activeTab, setActiveTab] = useState<'queue' | 'calendar'>('queue');

    const getQueueFor = (barberId: BarberId) =>
        clients.filter(c => c.status === 'waiting' && c.barberPreference === barberId);

    const globalPool = clients.filter(c => c.status === 'waiting' && c.barberPreference === 'next_available');

    const getInChair = (barberId: BarberId) =>
        clients.find(c => c.status === 'in_chair' && (c.assignedBarber === barberId || (c.barberPreference === barberId && !c.assignedBarber)));

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            overflow: 'hidden'
        }}>
            {/* Header & Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', margin: 0, lineHeight: 1.2 }}>Staff Dashboard</h1>
                    <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', background: '#222', padding: '0.3rem', borderRadius: '8px' }}>
                    <button
                        onClick={() => setActiveTab('queue')}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '6px',
                            background: activeTab === 'queue' ? 'var(--color-primary)' : 'transparent',
                            color: activeTab === 'queue' ? '#000' : '#888',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Live Queue
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '6px',
                            background: activeTab === 'calendar' ? 'var(--color-primary)' : 'transparent',
                            color: activeTab === 'calendar' ? '#000' : '#888',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Calendar
                    </button>
                </div>
            </div>

            {activeTab === 'queue' ? (
                <>
                    {/* Shift Manager Section */}
                    <div style={{
                        marginBottom: '1rem',
                        background: '#222',
                        padding: '0.8rem',
                        borderRadius: '12px',
                        border: '1px solid #333',
                        flexShrink: 0
                    }}>
                        <h3 style={{ marginBottom: '0.5rem', color: '#fff', fontSize: '1rem' }}>Shift Manager</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {barbers.map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => queueManager.toggleBarberAvailability(b.id, !b.isAvailable)}
                                    style={{
                                        flex: 1,
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        background: b.isAvailable ? 'var(--color-success)' : '#333',
                                        color: b.isAvailable ? '#000' : '#888',
                                        fontSize: '1rem',
                                        fontWeight: 'bold',
                                        border: b.isAvailable ? 'none' : '1px solid #444',
                                        opacity: b.isAvailable ? 1 : 0.8,
                                        transition: '0.2s'
                                    }}
                                >
                                    {b.name} <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{b.isAvailable ? 'ACTIVE' : 'OFF'}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Columns */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '1rem',
                        flex: 1,
                        minHeight: 0, // Important for nested scroll
                        overflow: 'hidden'
                    }}>
                        {/* Global Pool Column */}
                        <div className="barber-col" style={{ border: '1px dashed #333', display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
                            <div style={{ padding: '1rem', borderBottom: '1px solid #333' }}>
                                <h2 style={{ color: '#aaa', fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Next Available</h2>
                                <span style={{ fontSize: '0.8rem', color: '#666' }}>{globalPool.length} waiting</span>
                            </div>
                            <div style={{ padding: '0.5rem', overflowY: 'auto', flex: 1 }}>
                                {globalPool.map(c => (
                                    <ClientCard key={c.id} client={c} />
                                ))}
                                {globalPool.length === 0 && <p style={{ opacity: 0.3, fontStyle: 'italic', padding: '1rem' }}>Empty</p>}
                            </div>
                        </div>

                        {/* Barber Columns */}
                        {barbers.map(barber => {
                            const queue = getQueueFor(barber.id);
                            const inChair = getInChair(barber.id);
                            const snoozed = clients.filter(c => c.status === 'snoozed' && (c.assignedBarber === barber.id || (!c.assignedBarber && c.barberPreference === barber.id))); // assignedBarber is cleared on snooze, so check preference

                            return (
                                <div key={barber.id} className="barber-col" style={{
                                    opacity: barber.isAvailable ? 1 : 0.5,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%', // Ensure full height
                                    minWidth: 0 // CRITICAL: Allows flex child to shrink past content size
                                }}>
                                    <header style={{ padding: '1rem', background: '#222', borderBottom: '1px solid #333' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <h2 style={{ fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{barber.name}</h2>
                                            {!barber.isAvailable && <span style={{ background: '#333', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.6rem' }}>OFF</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                className="btn-primary"
                                                onClick={() => queueManager.callNext(barber.id)}
                                                style={{ fontSize: '0.9rem', padding: '0.6rem', flex: 1 }}
                                                disabled={!barber.isAvailable}
                                            >
                                                CALL NEXT
                                            </button>
                                            <button
                                                onClick={() => inChair && queueManager.snoozeClient(inChair.id)}
                                                disabled={!inChair}
                                                style={{
                                                    fontSize: '0.9rem',
                                                    padding: '0.6rem',
                                                    background: inChair ? 'var(--color-danger)' : '#333',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: inChair ? 'pointer' : 'default',
                                                    opacity: inChair ? 1 : 0.5
                                                }}
                                                title="Mark as Not Here (Snooze)"
                                            >
                                                NOT HERE
                                            </button>
                                        </div>
                                    </header>

                                    <div style={{ padding: '0.5rem', flex: 1, overflowY: 'auto', background: '#181b21' }}>
                                        {inChair && (
                                            <div style={{ marginBottom: '1rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--color-success)', borderRadius: '8px', padding: '0.8rem', minWidth: 0 }}>
                                                <span style={{ fontSize: '0.6rem', color: 'var(--color-success)', fontWeight: 'bold' }}>IN CHAIR</span>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inChair.name}</div>
                                            </div>
                                        )}

                                        <h4 style={{ color: '#666', marginBottom: '0.5rem', fontSize: '0.7rem' }}>WAITING ({queue.length})</h4>
                                        {queue.map(c => (
                                            <ClientCard key={c.id} client={c} />
                                        ))}
                                        {queue.length === 0 && <p style={{ opacity: 0.3, fontSize: '0.8rem', padding: '0.5rem' }}>No direct requests</p>}

                                        {snoozed.length > 0 && (
                                            <div style={{ marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '0.5rem' }}>
                                                <h4 style={{ color: 'var(--color-gold)', marginBottom: '0.5rem', fontSize: '0.7rem' }}>SNOOZED / HOLDING</h4>
                                                {snoozed.map(c => (
                                                    <div key={c.id} style={{ background: '#2a2211', border: '1px solid var(--color-gold)', borderRadius: '6px', padding: '0.5rem', marginBottom: '0.5rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{c.name}</span>
                                                            <button
                                                                onClick={() => queueManager.reactivateClient(c.id)}
                                                                style={{
                                                                    background: 'var(--color-gold)',
                                                                    color: '#000',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    padding: '0.2rem 0.5rem',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 'bold',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                REACTIVATE
                                                            </button>
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '0.2rem' }}>
                                                            Auto-cancel in ~{Math.max(0, 5 - Math.floor((Date.now() - (c.snoozeStartTime || 0)) / 60000))}m
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <CalendarView />
            )}

            {/* Debug Controls */}
            <div style={{ marginTop: '0', padding: '0.5rem 1rem', borderTop: '1px solid #333', opacity: 0.3 }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: '#666', fontSize: '0.8rem', textTransform: 'uppercase' }}>Debug:</span>
                    <button
                        className="btn-secondary"
                        style={{ width: 'auto', padding: '0.3rem 0.8rem', fontSize: '0.7rem' }}
                        onClick={() => {
                            const names = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi'];
                            const barbers: BarberId[] = ['Mo', 'Steve', 'Sarah', 'next_available'];
                            const randomName = names[Math.floor(Math.random() * names.length)];
                            const randomBarber = barbers[Math.floor(Math.random() * barbers.length)];
                            queueManager.addClient(randomName + ' ' + Math.floor(Math.random() * 100), randomBarber);
                        }}
                    >
                        + Add Random
                    </button>
                    <button
                        className="btn-secondary"
                        style={{ width: 'auto', padding: '0.3rem 0.8rem', fontSize: '0.7rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                        onClick={() => {
                            queueManager.reset();
                            window.location.reload();
                        }}
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
}

function ClientCard({ client }: { client: Client }) {
    const waitTime = Math.floor((Date.now() - client.checkInTime) / 60000);
    return (
        <div style={{ background: '#222', padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem', border: '1px solid #333', minWidth: 0 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>{waitTime}m ago</div>
        </div>
    );
}
