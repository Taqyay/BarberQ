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
import { simulationService } from '../services/simulation'; // Import simulationService

// M3 Filled Card - Surface Container Highest
const M3FilledCard: React.FC<{ children: React.ReactNode, style?: React.CSSProperties, onClick?: () => void }> = ({ children, style, onClick }) => (
    <div
        onClick={onClick}
        style={{
            backgroundColor: '#1a1d24',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.05)',
            ...style
        }}>
        {children}
    </div>
);

// M3 Elevated Card - Surface Container Low
const M3ElevatedCard: React.FC<{ children: React.ReactNode, style?: React.CSSProperties }> = ({ children, style }) => (
    <div style={{
        backgroundColor: '#21252b',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
        ...style
    }}>
        {children}
    </div>
);

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
                distance: 8,
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
        if (prefillTime) {
            const result = queueManager.addClient(newClientName, newPreference, 'manual', newGroupSize);
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
        setNewClientName('');
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
        <div className="h-screen flex flex-col p-6 overflow-hidden bg-[#0f1115] font-sans text-white">
            {/* Header & Tabs */}
            <div className="flex justify-between items-center mb-6 bg-[#1a1d24] p-4 rounded-xl shadow-sm border border-white/5">
                <div>
                    <h1 className="text-3xl font-bold text-white m-0 leading-tight tracking-tight">STAFF DASHBOARD</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <p className="m-0 text-gray-400 text-sm font-medium">
                            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <ConnectionStatus showLabel={false} />
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-[#d4af37] text-black px-4 py-2 rounded-full font-bold hover:bg-[#b4941f] transition-colors"
                    >
                        <span>+</span> Walk-in
                    </button>

                    <div className="flex bg-black/20 p-1 rounded-full border border-white/5">
                        <button
                            onClick={() => setActiveTab('queue')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'queue' ? 'bg-[#2a2d36] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Queue
                        </button>
                        <button
                            onClick={() => setActiveTab('calendar')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'calendar' ? 'bg-[#2a2d36] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Calendar
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-[#2a2d36] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Settings
                        </button>
                    </div>
                </div>
            </div>

            {/* Manual Entry Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-[#1e2229] p-8 rounded-2xl w-full max-w-md shadow-2xl border border-white/10 flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-white m-0 font-bold text-2xl">
                                {prefillTime ? `Book Appointment` : `Add Walk-in`}
                            </h2>
                        </div>

                        {prefillTime && (
                            <div className="p-4 bg-[#d4af37]/10 rounded-xl border border-[#d4af37]/30">
                                <p className="m-0 text-sm text-[#d4af37]">
                                    <strong>{new Date(prefillTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> with <strong>{newPreference}</strong>
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-gray-400 text-sm font-medium mb-2">Client Name</label>
                            <input
                                type="text"
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37]"
                                value={newClientName}
                                onInput={(e: any) => setNewClientName(e.target.value)}
                                onKeyDown={(e: any) => { if (e.key === 'Enter') handleAddWalkIn(); }}
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 mb-3 text-sm font-medium">Group Size</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setNewGroupSize(num)}
                                        className={`w-10 h-10 rounded-full font-bold transition-colors ${newGroupSize === num ? 'bg-[#d4af37] text-black' : 'bg-black/20 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {!prefillTime && (
                            <div>
                                <label className="block text-gray-400 text-sm font-medium mb-2">Barber Preference</label>
                                <select
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37]"
                                    value={newPreference}
                                    onChange={(e) => setNewPreference(e.target.value as BarberId)}
                                >
                                    <option value="next_available">Next Available</option>
                                    {barbers.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex gap-4 justify-end mt-4">
                            <button
                                onClick={() => { setIsModalOpen(false); setPrefillTime(null); }}
                                className="px-4 py-2 text-gray-400 hover:text-white font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddWalkIn}
                                disabled={!newClientName.trim()}
                                className="bg-[#d4af37] text-black px-6 py-2 rounded-lg font-bold hover:bg-[#b4941f] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {prefillTime ? 'Book Slot' : 'Check In'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Group Size Modal */}
            {editingGroupClient && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-[#1e2229] p-8 rounded-2xl w-full max-w-md shadow-2xl border border-white/10 flex flex-col gap-6">
                        <h2 className="text-white m-0 font-bold text-2xl">Edit Group Size</h2>
                        <p className="text-gray-400">
                            Reduce group size for <strong>{editingGroupClient.name}</strong>.<br />
                            <span className="text-xs text-gray-500">Current Remaining: {editingGroupClient.remainingSize}</span>
                        </p>

                        <div className="flex gap-2 flex-wrap">
                            {Array.from({ length: (editingGroupClient.remainingSize || 0) - 1 }, (_, i) => i + 1).map(size => (
                                <button
                                    key={size}
                                    onClick={() => handleUpdateGroupSize(size)}
                                    className="px-4 py-2 rounded-full bg-black/20 text-gray-300 hover:bg-[#d4af37] hover:text-black transition-colors font-bold"
                                >
                                    {size}
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-end">
                            <button onClick={() => setEditingGroupClient(null)} className="text-gray-400 hover:text-white px-4 py-2">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'queue' ? (
                <>
                    {/* Shift Manager Section */}
                    <div className="mb-6">
                        <div className="bg-[#1a1d24] p-4 rounded-xl border border-white/5 flex items-center gap-6 shadow-sm">
                            <h3 className="text-white font-bold text-sm uppercase tracking-wider m-0">Shift Manager</h3>
                            <div className="h-6 w-px bg-white/10"></div>
                            <div className="flex gap-2">
                                {barbers.map(b => (
                                    <button
                                        key={b.id}
                                        onClick={() => queueManager.toggleBarberAvailability(b.id, !b.isAvailable)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${b.isAvailable ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}`}
                                    >
                                        {b.name}: {b.isAvailable ? 'Active' : 'Away'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Columns */}
                    <div className="grid grid-cols-4 gap-6 flex-1 min-h-0 overflow-hidden">
                        {/* Global Pool Column */}
                        <M3FilledCard style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center">
                                <h2 className="text-gray-400 font-bold text-sm m-0 truncate uppercase tracking-widest" style={{ fontFamily: 'Archivo, sans-serif' }}>Next Available</h2>
                                <span className="bg-white/10 text-gray-300 px-2 py-1 rounded-full text-xs font-bold">{globalPool.length}</span>
                            </div>

                            <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                                {globalPool.map(c => (
                                    <ClientCard key={c.id} client={c} onEditGroup={setEditingGroupClient} />
                                ))}
                                {globalPool.length === 0 && <div className="text-gray-600 italic text-center py-8 text-sm">Queue Empty</div>}

                                {/* Snoozed Next Available Clients */}
                                {clients.some(c => c.status === 'snoozed' && c.barberPreference === 'next_available') && (
                                    <div className="mt-4 border-t border-white/10 pt-4">
                                        <h4 className="text-[#d4af37] mb-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                            HOLDING
                                        </h4>
                                        {clients.filter(c => c.status === 'snoozed' && c.barberPreference === 'next_available').map(c => (
                                            <div key={c.id} className="bg-[#2a2d36] rounded-lg p-3 mb-2 flex justify-between items-center border-l-2 border-[#d4af37]">
                                                <div>
                                                    <span className="font-bold text-sm text-gray-200 block">{c.name}</span>
                                                    <span className="text-xs text-gray-500">Expires in ~{Math.max(0, 5 - Math.floor((Date.now() - (c.snoozeStartTime || 0)) / 60000))}m</span>
                                                </div>
                                                <button onClick={() => queueManager.reactivateClient(c.id)} className="text-[#d4af37] text-xs font-bold hover:underline">RE-ADD</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </M3FilledCard>

                        {/* Barber Columns */}
                        {barbers.map(barber => {
                            const queue = getQueueFor(barber.id);
                            const inChair = getInChair(barber.id);
                            const snoozed = clients.filter(c => c.status === 'snoozed' && (c.assignedBarber === barber.id || (!c.assignedBarber && c.barberPreference === barber.id)));

                            return (
                                <M3FilledCard key={barber.id} style={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    opacity: barber.isAvailable ? 1 : 0.6,
                                    filter: barber.isAvailable ? 'none' : 'grayscale(100%)',
                                    transition: 'all 0.3s'
                                }}>
                                    <div className="p-4 bg-black/20 border-b border-white/5">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${barber.isAvailable ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
                                                <h2 className="text-lg font-bold text-white m-0" style={{ fontFamily: 'Archivo, sans-serif' }}>{barber.name}</h2>
                                            </div>
                                            <button onClick={() => queueManager.toggleBarberAvailability(barber.id, !barber.isAvailable)} className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors uppercase tracking-wider ${barber.isAvailable ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                {barber.isAvailable ? 'Active' : 'Away'}
                                            </button>
                                        </div>

                                        {inChair ? (
                                            <div className="bg-[#1e2229] p-4 rounded-xl border border-white/5 shadow-inner relative overflow-hidden">
                                                <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#d4af37]"></div>
                                                <div className="flex justify-between items-start mb-4 pl-2">
                                                    <div>
                                                        <span className="text-[10px] text-[#d4af37] font-bold uppercase tracking-widest block mb-1">Serving</span>
                                                        <div className="text-white font-bold text-xl">{inChair.name}</div>
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-mono font-bold bg-black/40 px-2 py-1 rounded flex items-center gap-1">
                                                        {Math.floor((Date.now() - (inChair.serviceStartTime || Date.now())) / 60000)}m
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 pl-2">
                                                    <button onClick={() => queueManager.snoozeClient(inChair.id)} className="border border-white/10 text-gray-400 rounded-lg py-2 text-sm font-bold hover:bg-white/5 hover:text-white transition-colors">Not Here</button>
                                                    <button onClick={() => queueManager.finishClient(inChair.id)} className="bg-[#6750A4] text-white rounded-lg py-2 text-sm font-bold hover:bg-[#5f4996] transition-colors shadow-lg shadow-[#6750A4]/20">Done</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => queueManager.callNext(barber.id)}
                                                disabled={!barber.isAvailable}
                                                className="w-full bg-[#d4af37] text-black font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#b4941f] transition-colors shadow-lg shadow-[#d4af37]/20"
                                            >
                                                Call Next
                                            </button>
                                        )}
                                    </div>

                                    <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                                        <div style={{ marginBottom: '12px', color: '#000000', fontWeight: 600, fontSize: '14px' }}>
                                            Waiting:
                                        </div>
                                        {queue.map(c => (
                                            <ClientCard key={c.id} client={c} onEditGroup={setEditingGroupClient} />
                                        ))}

                                        {queue.length === 0 && <p className="text-gray-600 text-sm italic py-4 text-center">No assignments</p>}

                                        {snoozed.length > 0 && (
                                            <div className="mt-6 border-t border-white/10 pt-4">
                                                <h4 className="text-[#d4af37] mb-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                                    HOLDING
                                                </h4>
                                                {snoozed.map(c => (
                                                    <div key={c.id} className="bg-[#2a2d36] rounded-lg p-3 mb-2 flex justify-between items-center border-l-2 border-[#d4af37]">
                                                        <div>
                                                            <span className="font-bold text-sm text-gray-200 block">{c.name}</span>
                                                            <span className="text-xs text-gray-500">Expires in ~{Math.max(0, 5 - Math.floor((Date.now() - (c.snoozeStartTime || 0)) / 60000))}m</span>
                                                        </div>
                                                        <button onClick={() => queueManager.reactivateClient(c.id)} className="text-[#d4af37] text-xs font-bold hover:underline">RE-ADD</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </M3FilledCard>

                            );
                        })}
                    </div>
                </>
            ) : activeTab === 'calendar' ? (
                // Calendar Container - M3 Surfaced
                <div className="flex-1 bg-[#1a1d24] rounded-xl shadow-sm border border-white/5 overflow-hidden">
                    <CalendarView onAddClient={handleCalendarAdd} />
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto bg-[#1a1d24] rounded-xl shadow-sm border border-white/5 p-8 custom-scrollbar">
                    <div className="max-w-2xl mx-auto">
                        <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4 mb-8">Shop Configuration</h2>

                        {/* Queue Management Settings */}
                        <div className="mb-10">
                            <h3 className="text-sm font-bold text-[#d4af37] uppercase tracking-wider mb-6">Queue Management</h3>

                            <div className="flex justify-between items-center mb-6 bg-black/20 p-5 rounded-xl border border-white/5">
                                <div>
                                    <label className="block font-bold text-white text-lg">Snooze Feature</label>
                                    <p className="text-sm text-gray-500 m-0 mt-1">Allow barbers to snooze missing clients ("Not Here")</p>
                                </div>
                                <div
                                    onClick={() => queueManager.updateSettings({ snoozeEnabled: !settings?.snoozeEnabled })}
                                    className={`w-14 h-8 rounded-full cursor-pointer relative transition-colors ${settings?.snoozeEnabled ? 'bg-[#d4af37]' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${settings?.snoozeEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </div>
                            </div>

                            <div className={`mb-6 p-5 rounded-xl border border-white/5 bg-black/20 transition-all ${settings?.snoozeEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                <label className="block text-gray-400 text-sm font-medium mb-2">Snooze Duration (Minutes)</label>
                                <input
                                    type="number"
                                    className="w-full bg-[#0f1115] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37]"
                                    value={settings?.snoozeDurationMinutes?.toString() ?? '5'}
                                    onInput={(e: any) => queueManager.updateSettings({ snoozeDurationMinutes: parseInt(e.target.value) || 5 })}
                                />
                                <p className="text-xs text-gray-500 mt-2">Clients are auto-cancelled after this time.</p>
                            </div>
                        </div>

                        <div className="mb-10">
                            <h3 className="text-sm font-bold text-[#d4af37] uppercase tracking-wider mb-6">Staff Management</h3>
                            <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                                <div className="flex gap-4 mb-6 items-end">
                                    <div className="flex-1">
                                        <label className="block text-gray-400 text-sm font-medium mb-2">New Barber Name</label>
                                        <input
                                            id="new-barber-name"
                                            placeholder="e.g. Mo"
                                            className="w-full bg-[#0f1115] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37]"
                                            onKeyDown={(e: any) => {
                                                if (e.key === 'Enter') {
                                                    const input = e.target as HTMLInputElement;
                                                    if (input.value.trim()) {
                                                        queueManager.addBarber(input.value.trim());
                                                        input.value = '';
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById('new-barber-name') as HTMLInputElement;
                                            if (input && input.value.trim()) {
                                                queueManager.addBarber(input.value.trim());
                                                input.value = '';
                                            }
                                        }}
                                        className="bg-[#d4af37] text-black px-6 py-3 rounded-lg font-bold hover:bg-[#b4941f]"
                                    >
                                        Add Barber
                                    </button>
                                </div>

                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={barbers.map(b => b.id)} strategy={verticalListSortingStrategy}>
                                        <div className="flex flex-col gap-2">
                                            {barbers.map(b => (
                                                <SortableBarberItem key={b.id} id={b.id} name={b.name} onDelete={() => {
                                                    if (confirm(`Remove ${b.name}?`)) queueManager.removeBarber(b.id);
                                                }} />
                                            ))}
                                            {barbers.length === 0 && <p className="text-gray-500 italic text-sm text-center py-4">No barbers configured.</p>}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        </div>

                        {/* Calendar & Estimates Settings */}
                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-[#d4af37] uppercase tracking-wider mb-6">Calendar & Estimates</h3>
                            <div className="grid grid-cols-1 gap-6 mb-6">
                                <div>
                                    <label className="block text-gray-400 text-sm font-medium mb-2">Average Cut Time (Minutes)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-[#0f1115] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37]"
                                        value={settings?.averageCutTimeMinutes?.toString() ?? '20'}
                                        onInput={(e: any) => queueManager.updateSettings({ averageCutTimeMinutes: parseInt(e.target.value) || 20 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm font-medium mb-2">Remote Booking Buffer (Minutes)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-[#0f1115] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37]"
                                        value={settings?.remoteBufferMinutes?.toString() ?? '30'}
                                        onInput={(e: any) => queueManager.updateSettings({ remoteBufferMinutes: parseInt(e.target.value) || 30 })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-gray-400 text-sm font-medium mb-2">First Cut (Hour 0-23)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="23"
                                        className="w-full bg-[#0f1115] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37]"
                                        value={settings?.firstCutTime?.toString() ?? '9'}
                                        onInput={(e: any) => queueManager.updateSettings({ firstCutTime: parseInt(e.target.value) || 9 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm font-medium mb-2">Last Cut (Hour 0-23)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="23"
                                        className="w-full bg-[#0f1115] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37]"
                                        value={settings?.lastCutTime?.toString() ?? '18'}
                                        onInput={(e: any) => queueManager.updateSettings({ lastCutTime: parseInt(e.target.value) || 18 })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Persistent Margin for Debug Footer */}
            <div className="h-16 flex-shrink-0"></div>

            {/* Global Debug Tools Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#1a1d24] border-t border-white/10 p-3 z-40 flex justify-between items-center px-6 shadow-2xl">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded">Debug Mode</span>
                    <span className="text-xs text-gray-500">v0.8.1_100226</span>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            const names = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'George', 'Harry'];
                            // Only pick available barbers or next_available
                            const availableBarbers = barbers.filter(b => b.isAvailable).map(b => b.id);
                            const barberIds = [...availableBarbers, 'next_available'];
                            queueManager.addClient(names[Math.floor(Math.random() * names.length)], barberIds[Math.floor(Math.random() * barberIds.length)]);
                        }}
                        className="border border-white/20 text-gray-300 px-4 py-2 rounded-lg font-bold hover:bg-white/5 hover:text-white transition-colors text-sm"
                    >
                        + Random Client
                    </button>
                    <button
                        onClick={() => { if (confirm('Reset all data?')) { queueManager.reset(); window.location.reload(); } }}
                        className="text-red-500 font-bold hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                        Reset System
                    </button>
                </div>
            </div>
        </div >
    );
}

function SortableBarberItem({ id, name, onDelete }: { id: string, name: string, onDelete: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, touchAction: 'none' };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="flex justify-between items-center bg-[#0f1115] p-3 rounded-lg border border-white/5 shadow-sm hover:border-white/10 transition-all">
            <div className="flex items-center gap-4">
                <span {...listeners} className="cursor-grab text-gray-600 hover:text-gray-400">☰</span>
                <span className="font-medium text-gray-300 text-sm">{name}</span>
            </div>
            <button onClick={onDelete} className="text-red-500/50 bg-transparent border-none cursor-pointer font-bold hover:text-red-500 px-2 text-lg">×</button>
        </div>
    );
}

function ClientCard({ client, onEditGroup }: { client: Client, onEditGroup: (client: Client) => void }) {
    const waitTime = Math.floor((Date.now() - client.checkInTime) / 60000);
    return (
        <M3ElevatedCard style={{ padding: '16px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
            {/* Removed local hover/bg styles as M3ElevatedCard handles container. Keeping internal layout. */}
            <div className="flex justify-between items-center mb-1">
                <div className="font-bold text-white text-base truncate flex items-center gap-2">
                    {client.name}
                    {client.remainingSize && client.remainingSize > 1 && (
                        <span className="text-xs bg-[#d4af37]/20 text-[#d4af37] px-1.5 py-0.5 rounded font-bold cursor-pointer hover:bg-[#d4af37]/30" onClick={() => onEditGroup(client)}>
                            +{client.remainingSize - 1} 👥
                        </span>
                    )}
                </div>
                <div className="text-xs text-white/20 font-mono font-bold group-hover:text-blue-400 transition-colors">
                    #{client.id.slice(-3)}
                </div>
            </div>
            <div className="text-xs text-gray-400 font-medium flex justify-between">
                <span>Waiting {waitTime}m</span>
                {client.remainingSize && client.remainingSize > 1 && (
                    <button onClick={() => onEditGroup(client)} className="text-gray-400 hover:text-blue-400 underline decoration-dotted bg-transparent border-none cursor-pointer p-0">
                        Edit
                    </button>
                )}
            </div>
        </M3ElevatedCard>
    );
}
