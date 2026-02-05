import { useState } from 'react';
import { useQueue } from '../hooks/useQueue';
import { queueManager } from '../services/queueManager';
import type { BarberId, Client } from '../types';
import { CalendarView } from '../components/CalendarView';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Hardcoded BARBERS removed in favor of dynamic state
// const BARBERS...

export function BarberDashboard() {
    const { clients, barbers, settings } = useQueue();
    const [activeTab, setActiveTab] = useState<'queue' | 'calendar' | 'settings'>('queue');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newPreference, setNewPreference] = useState<BarberId>('next_available');
    const [newGroupSize, setNewGroupSize] = useState(1);

    // Calendar Quick-Add State
    const [prefillTime, setPrefillTime] = useState<Date | null>(null);

    const [editingGroupClient, setEditingGroupClient] = useState<Client | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement to start drag (prevents accidental clicks)
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = barbers.findIndex((b) => b.id === active.id);
            const newIndex = barbers.findIndex((b) => b.id === over?.id);
            const newOrder = arrayMove(barbers, oldIndex, newIndex).map(b => b.id);
            queueManager.reorderBarbers(newOrder);
        }
    };

    const handleAddWalkIn = () => {
        if (!newClientName.trim()) return;

        // If prefillTime is set, create a "reservation" (manual appointment)
        if (prefillTime) {
            const result = queueManager.addClient(newClientName, newPreference, 'manual', newGroupSize);
            // Immediately update time slot (since addClient doesn't support time yet)
            // Ideally addClient should support it, but this works for v0.6.0
            if (result && result.id) {
                queueManager.updateClientTimeSlot(result.id, prefillTime.getTime(), newPreference);
            }
        } else {
            queueManager.addClient(newClientName, newPreference, 'manual', newGroupSize);
        }

        setIsModalOpen(false);
        setNewClientName('');
        setNewPreference('next_available');
        setNewGroupSize(1);
        setPrefillTime(null);
    };

    const handleCalendarAdd = (barberId: string, time: Date) => {
        setNewPreference(barberId as BarberId);
        setPrefillTime(time);
        setNewClientName(''); // Reset name
        setIsModalOpen(true);
    };

    const handleUpdateGroupSize = (newSize: number) => {
        if (editingGroupClient) {
            queueManager.updateGroupSize(editingGroupClient.id, newSize);
            setEditingGroupClient(null);
        }
    };

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>
                            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <ConnectionStatus showLabel={false} />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', background: '#222', padding: '0.3rem', borderRadius: '8px' }}>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '6px',
                            background: '#eab308', // Gold/Yellow
                            color: '#000',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <span>+ Walk-in</span>
                    </button>
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
                    <button
                        onClick={() => setActiveTab('settings')}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '6px',
                            background: activeTab === 'settings' ? 'var(--color-primary)' : 'transparent',
                            color: activeTab === 'settings' ? '#000' : '#888',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Settings
                    </button>
                </div>
            </div>

            {/* Manual Entry Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#1d1d1d',
                        padding: '2rem',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '400px',
                        border: '1px solid #333',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }}>
                        <h2 style={{ color: '#fff', marginTop: 0, marginBottom: '1.5rem' }}>
                            {prefillTime ? `Book Appointment` : `Add Walk-in Client`}
                        </h2>

                        {prefillTime && (
                            <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#333', borderRadius: '4px', borderLeft: '3px solid var(--color-gold)' }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#fff' }}>
                                    <strong>Time:</strong> {prefillTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} <br />
                                    <strong>Barber:</strong> {newPreference}
                                </p>
                            </div>
                        )}

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Client Name</label>
                            <input
                                autoFocus
                                type="text"
                                value={newClientName}
                                onChange={e => setNewClientName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddWalkIn();
                                }}
                                placeholder="Enter name..."
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    background: '#111',
                                    border: '1px solid #333',
                                    color: '#fff',
                                    fontSize: '1.2rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Group Size</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {[1, 2, 3, 4, 5].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setNewGroupSize(num)}
                                        style={{
                                            flex: 1,
                                            padding: '0.8rem',
                                            borderRadius: '6px',
                                            background: newGroupSize === num ? 'var(--color-gold)' : '#333',
                                            color: newGroupSize === num ? '#000' : '#888',
                                            border: 'none',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', color: '#888', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Preference</label>
                            <select
                                value={newPreference}
                                onChange={e => setNewPreference(e.target.value as BarberId)}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    background: '#111',
                                    border: '1px solid #333',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            >
                                <option value="next_available">Next Available</option>
                                {barbers.map(b => {
                                    // Soft-Lock Check: Any reservation in next 30 mins?
                                    const now = Date.now();
                                    const hasUpcoming = clients.some(c =>
                                        c.barberPreference === b.id &&
                                        c.reservationTime &&
                                        c.reservationTime > now &&
                                        c.reservationTime - now < 30 * 60000
                                    );
                                    return (
                                        <option key={b.id} value={b.id}>
                                            {b.name} {hasUpcoming ? '(Reserved <30m)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => { setIsModalOpen(false); setPrefillTime(null); }}
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    background: 'transparent',
                                    color: '#888',
                                    border: '1px solid #333',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddWalkIn}
                                disabled={!newClientName.trim()}
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    background: 'var(--color-primary)',
                                    color: '#000',
                                    border: 'none',
                                    cursor: newClientName.trim() ? 'pointer' : 'not-allowed',
                                    fontWeight: 'bold',
                                    opacity: newClientName.trim() ? 1 : 0.5
                                }}
                            >
                                {prefillTime ? 'Book Slot' : 'Add Client'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Group Size Modal */}
            {editingGroupClient && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        background: '#1d1d1d', padding: '2rem', borderRadius: '16px',
                        width: '100%', maxWidth: '400px', border: '1px solid #333', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }}>
                        <h2 style={{ color: '#fff', marginTop: 0, marginBottom: '1rem' }}>Edit Group Size</h2>
                        <p style={{ color: '#aaa', marginBottom: '1.5rem' }}>
                            Reduce group size for <strong>{editingGroupClient.name}</strong>.<br />
                            <span style={{ fontSize: '0.8rem', color: '#666' }}>Current Remaining: {editingGroupClient.remainingSize}</span>
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '2rem' }}>
                            {Array.from({ length: (editingGroupClient.remainingSize || 0) - 1 }, (_, i) => i + 1).map(size => (
                                <button
                                    key={size}
                                    onClick={() => handleUpdateGroupSize(size)}
                                    style={{
                                        padding: '1rem', borderRadius: '8px',
                                        background: '#333', color: '#fff', border: '1px solid #444',
                                        cursor: 'pointer', fontWeight: 'bold'
                                    }}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setEditingGroupClient(null)}
                            style={{ width: '100%', padding: '1rem', borderRadius: '8px', background: 'transparent', color: '#888', border: '1px solid #333', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

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
                                    <ClientCard key={c.id} client={c} onEditGroup={setEditingGroupClient} />
                                ))}
                                {globalPool.length === 0 && <p style={{ opacity: 0.3, fontStyle: 'italic', padding: '1rem' }}>Empty</p>}

                                {/* Snoozed Next Available Clients */}
                                {clients.some(c => c.status === 'snoozed' && c.barberPreference === 'next_available') && (
                                    <div style={{ marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '0.5rem' }}>
                                        <h4 style={{ color: 'var(--color-gold)', marginBottom: '0.5rem', fontSize: '0.7rem' }}>SNOOZED / HOLDING</h4>
                                        {clients.filter(c => c.status === 'snoozed' && c.barberPreference === 'next_available').map(c => (
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
                                            <ClientCard key={c.id} client={c} onEditGroup={setEditingGroupClient} />
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
            ) : activeTab === 'calendar' ? (
                <CalendarView onAddClient={handleCalendarAdd} />
            ) : (
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', color: '#fff' }}>
                        <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '2rem' }}>Shop Configuration</h2>

                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ color: 'var(--color-gold)', marginBottom: '1rem' }}>Queue Management</h3>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#222', padding: '1rem', borderRadius: '8px' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold' }}>Snooze / "Not Here" Feature</label>
                                    <p style={{ fontSize: '0.8rem', color: '#888', margin: 0 }}>Allow barbers to snooze missing clients</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings?.snoozeEnabled ?? true}
                                    onChange={(e) => queueManager.updateSettings({ snoozeEnabled: e.target.checked })}
                                    style={{ width: '20px', height: '20px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem', opacity: settings?.snoozeEnabled ? 1 : 0.5, pointerEvents: settings?.snoozeEnabled ? 'auto' : 'none' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Snooze Duration (Minutes)</label>
                                <input
                                    type="number"
                                    value={settings?.snoozeDurationMinutes ?? 5}
                                    onChange={(e) => queueManager.updateSettings({ snoozeDurationMinutes: parseInt(e.target.value) || 5 })}
                                    style={{
                                        padding: '0.8rem',
                                        borderRadius: '6px',
                                        background: '#222',
                                        border: '1px solid #333',
                                        color: '#fff',
                                        width: '100%'
                                    }}
                                />
                                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>Clients are auto-cancelled after this time.</p>
                            </div>
                        </div>

                        <div>
                            <h3 style={{ color: 'var(--color-gold)', marginBottom: '1rem' }}>Staff Management</h3>

                            <div style={{ marginBottom: '1.5rem', background: '#222', padding: '1rem', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <input
                                        type="text"
                                        placeholder="New Barber Name"
                                        id="new-barber-name"
                                        style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#333', color: '#fff' }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const input = e.currentTarget;
                                                if (input.value.trim()) {
                                                    queueManager.addBarber(input.value.trim());
                                                    input.value = '';
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        className="btn-primary"
                                        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                        onClick={() => {
                                            const input = document.getElementById('new-barber-name') as HTMLInputElement;
                                            if (input && input.value.trim()) {
                                                queueManager.addBarber(input.value.trim());
                                                input.value = '';
                                            }
                                        }}
                                    >
                                        Add
                                    </button>
                                </div>

                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={barbers.map(b => b.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            {barbers.map(b => (
                                                <SortableBarberItem key={b.id} id={b.id} name={b.name} onDelete={() => {
                                                    if (confirm(`Remove ${b.name}?`)) {
                                                        queueManager.removeBarber(b.id);
                                                    }
                                                }} />
                                            ))}
                                            {barbers.length === 0 && <p style={{ color: '#666', fontStyle: 'italic' }}>No barbers configured.</p>}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>

                            <h3 style={{ color: 'var(--color-gold)', marginBottom: '1rem' }}>Calendar & Estimates</h3>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Average Cut Time (Minutes)</label>
                                <input
                                    type="number"
                                    value={settings?.averageCutTimeMinutes ?? 20}
                                    onChange={(e) => queueManager.updateSettings({ averageCutTimeMinutes: parseInt(e.target.value) || 20 })}
                                    style={{
                                        padding: '0.8rem',
                                        borderRadius: '6px',
                                        background: '#222',
                                        border: '1px solid #333',
                                        color: '#fff',
                                        width: '100%'
                                    }}
                                />
                                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>Used for Calendar slots and Wait Time calculations.</p>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Remote Booking Buffer (Minutes)</label>
                                <input
                                    type="number"
                                    value={settings?.remoteBufferMinutes ?? 30}
                                    onChange={(e) => queueManager.updateSettings({ remoteBufferMinutes: parseInt(e.target.value) || 30 })}
                                    style={{
                                        padding: '0.8rem',
                                        borderRadius: '6px',
                                        background: '#222',
                                        border: '1px solid #333',
                                        color: '#fff',
                                        width: '100%'
                                    }}
                                />
                                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>Safety margin added to "Earliest Available" slot.</p>
                            </div>
                        </div>
                    </div>
                </div>
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
                            const barberIds = [...barbers.map(b => b.id), 'next_available'];
                            const randomName = names[Math.floor(Math.random() * names.length)];
                            const randomBarber = barberIds[Math.floor(Math.random() * barberIds.length)];
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

function SortableBarberItem({ id, name, onDelete }: { id: string, name: string, onDelete: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: 'none' // Required for pointer sensors
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#333', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #444', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span {...listeners} style={{ cursor: 'grab', fontSize: '1.2rem', color: '#666' }}>☰</span>
                    <span>{name}</span>
                </div>
                <button
                    onClick={onDelete}
                    style={{ color: 'var(--color-danger)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                    title="Remove Barber"
                >
                    ×
                </button>
            </div>
        </div>
    );
}

function ClientCard({ client, onEditGroup }: { client: Client, onEditGroup: (client: Client) => void }) {
    const waitTime = Math.floor((Date.now() - client.checkInTime) / 60000);
    return (
        <div style={{ background: '#222', padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem', border: '1px solid #333', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {client.name}
                    {client.remainingSize && client.remainingSize > 1 && (
                        <span style={{ fontSize: '0.8rem', background: 'var(--color-gold)', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '4px', cursor: 'pointer' }} onClick={() => onEditGroup(client)} title="Edit Group Size">
                            +{client.remainingSize - 1} ✎
                        </span>
                    )}
                </div>
                {client.remainingSize && client.remainingSize > 1 && (
                    <button
                        onClick={() => onEditGroup(client)}
                        style={{ background: 'transparent', border: '1px solid #444', color: '#888', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                        Edit Size
                    </button>
                )}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>{waitTime}m ago</div>
        </div>
    );
}
