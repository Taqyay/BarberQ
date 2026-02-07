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

export function BarberDashboard() {
    const { clients, barbers } = useQueue();
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
        <div className="h-screen flex flex-col p-4 overflow-hidden bg-[#0f1115] font-sans text-white">
            {/* Header & Tabs */}
            <div className="flex justify-between items-center mb-4 bg-[#1a1d24] p-4 rounded-xl shadow-sm border border-white/5">
                <div>
                    <h1 className="text-2xl font-bold text-white m-0 leading-tight">STAFF DASHBOARD</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <p className="m-0 text-gray-400 text-sm">
                            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <ConnectionStatus showLabel={false} />
                    </div>
                </div>
                <div className="flex gap-4 bg-black/20 p-1.5 rounded-lg border border-white/5">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-2 rounded-md bg-white text-black border-none font-bold cursor-pointer flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-sm"
                    >
                        <span>+ Walk-in</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('queue')}
                        className={`px-6 py-2 rounded-md border-none font-bold cursor-pointer transition-all ${activeTab === 'queue' ? 'bg-[#2a2d36] text-white shadow-md' : 'bg-transparent text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        Live Queue
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`px-6 py-2 rounded-md border-none font-bold cursor-pointer transition-all ${activeTab === 'calendar' ? 'bg-[#2a2d36] text-white shadow-md' : 'bg-transparent text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        Calendar
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-6 py-2 rounded-md border-none font-bold cursor-pointer transition-all ${activeTab === 'settings' ? 'bg-[#2a2d36] text-white shadow-md' : 'bg-transparent text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        Settings
                    </button>
                </div>
            </div>

            {/* Manual Entry Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-[#1a1d24] p-8 rounded-xl w-full max-w-md shadow-xl border border-white/10">
                        <h2 className="text-white m-0 mb-6 font-bold text-xl border-b border-white/10 pb-4">
                            {prefillTime ? `Book Appointment` : `Add Walk-in Client`}
                        </h2>

                        {prefillTime && (
                            <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border-l-4 border-blue-500">
                                <p className="m-0 text-sm text-gray-300">
                                    <strong>Time:</strong> {prefillTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} <br />
                                    <strong>Barber:</strong> {newPreference}
                                </p>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-gray-400 mb-2 text-sm font-medium">Client Name</label>
                            <input
                                autoFocus
                                type="text"
                                value={newClientName}
                                onChange={e => setNewClientName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddWalkIn();
                                }}
                                placeholder="Enter name..."
                                className="w-full p-4 rounded-xl bg-[#0f1115] border border-white/10 text-white text-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-400 mb-2 text-sm font-medium">Group Size</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setNewGroupSize(num)}
                                        className={`flex-1 p-3 rounded-lg border-none font-bold cursor-pointer transition-all ${newGroupSize === num ? 'bg-blue-600 text-white shadow-md' : 'bg-[#0f1115] text-gray-500 hover:bg-[#2a2d36]'
                                            }`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="block text-gray-400 mb-2 text-sm font-medium">Preference</label>
                            <select
                                value={newPreference}
                                onChange={e => setNewPreference(e.target.value as BarberId)}
                                className="w-full p-4 rounded-xl bg-[#0f1115] border border-white/10 text-white text-base outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                            >
                                <option value="next_available">Next Available</option>
                                {barbers.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => { setIsModalOpen(false); setPrefillTime(null); }}
                                className="flex-1 p-4 rounded-xl bg-transparent text-gray-400 border border-white/10 cursor-pointer font-bold hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddWalkIn}
                                disabled={!newClientName.trim()}
                                className={`flex-1 p-4 rounded-xl border-none font-bold cursor-pointer text-white shadow-md transition-all ${newClientName.trim() ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-700 cursor-not-allowed'
                                    }`}
                            >
                                {prefillTime ? 'Book Slot' : 'Add Client'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Group Size Modal */}
            {editingGroupClient && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-[#1a1d24] p-8 rounded-xl w-full max-w-md shadow-xl border border-white/10">
                        <h2 className="text-white m-0 mb-4 font-bold text-xl">Edit Group Size</h2>
                        <p className="text-gray-400 mb-6">
                            Reduce group size for <strong>{editingGroupClient.name}</strong>.<br />
                            <span className="text-xs text-gray-500">Current Remaining: {editingGroupClient.remainingSize}</span>
                        </p>

                        <div className="grid grid-cols-4 gap-2 mb-8">
                            {Array.from({ length: (editingGroupClient.remainingSize || 0) - 1 }, (_, i) => i + 1).map(size => (
                                <button
                                    key={size}
                                    onClick={() => handleUpdateGroupSize(size)}
                                    className="p-3 rounded-lg bg-[#0f1115] text-white border border-white/10 cursor-pointer font-bold hover:bg-blue-600 hover:border-blue-500 transition-all"
                                >
                                    {size}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setEditingGroupClient(null)}
                            className="w-full p-4 rounded-xl bg-transparent text-gray-400 border border-white/10 cursor-pointer hover:bg-white/5"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'queue' ? (
                <>
                    {/* Shift Manager Section */}
                    <div className="mb-4 bg-[#1a1d24] p-6 rounded-xl shadow-sm border border-white/5 flex-shrink-0">
                        <h3 className="mb-4 text-white font-bold text-lg uppercase tracking-wider">Shift Manager</h3>
                        <div className="flex gap-4">
                            {barbers.map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => queueManager.toggleBarberAvailability(b.id, !b.isAvailable)}
                                    className={`flex-1 h-16 rounded-xl text-base font-bold border-none transition-all shadow-sm ${b.isAvailable ? 'bg-blue-600/20 text-blue-400 ring-2 ring-blue-500/50' : 'bg-[#0f1115] text-gray-600 grayscale'
                                        }`}
                                >
                                    {b.name} <span className="block text-xs mt-1 opacity-70 uppercase tracking-widest">{b.isAvailable ? 'ACTIVE' : 'OFF'}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Columns */}
                    <div className="grid grid-cols-4 gap-4 flex-1 min-h-0 overflow-hidden">
                        {/* Global Pool Column */}
                        <div className="flex flex-col h-full min-w-0 bg-[#1a1d24] rounded-xl shadow-sm border border-white/5 overflow-hidden">
                            <div className="p-4 border-b border-white/5 bg-black/20">
                                <h2 className="text-gray-400 font-bold text-lg m-0 truncate uppercase tracking-wide">Next Available</h2>
                                <span className="text-xs font-bold text-gray-500">{globalPool.length} waiting</span>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 space-y-3">
                                {globalPool.map(c => (
                                    <ClientCard key={c.id} client={c} onEditGroup={setEditingGroupClient} />
                                ))}
                                {globalPool.length === 0 && <div className="text-gray-600 italic text-center py-8">No customers in queue</div>}
                            </div>
                        </div>

                        {/* Barber Columns */}
                        {barbers.map(barber => {
                            const queue = getQueueFor(barber.id);
                            const inChair = getInChair(barber.id);

                            return (
                                <div key={barber.id} className={`flex flex-col h-full min-w-0 bg-[#1a1d24] rounded-xl shadow-sm border border-white/5 overflow-hidden transition-opacity ${barber.isAvailable ? 'opacity-100' : 'opacity-60'}`}>
                                    <header className="p-4 border-b border-white/5 bg-black/20">
                                        <div className="flex justify-between items-center mb-3">
                                            <h2 className="text-xl font-bold text-white m-0 truncate uppercase">{barber.name}</h2>
                                            {!barber.isAvailable && <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded text-xs font-bold">OFF</span>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => queueManager.callNext(barber.id)}
                                                className="flex-1 py-3 bg-white text-black hover:bg-gray-200 text-sm font-bold border-none rounded-lg cursor-pointer transition-colors shadow-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!barber.isAvailable}
                                            >
                                                CALL NEXT
                                            </button>
                                            <button
                                                onClick={() => inChair && queueManager.snoozeClient(inChair.id)}
                                                disabled={!inChair}
                                                className={`px-4 py-3 text-sm font-bold border-none rounded-lg cursor-pointer transition-colors shadow-sm uppercase tracking-wide ${inChair ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-800 text-gray-600 cursor-default'
                                                    }`}
                                            >
                                                Not Here
                                            </button>
                                        </div>
                                    </header>

                                    <div className="p-4 flex-1 overflow-y-auto bg-black/20 space-y-3">
                                        {inChair && (
                                            <div className="mb-4 bg-blue-500/10 border-l-4 border-blue-500 rounded-r-lg p-4 shadow-sm">
                                                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-1">IN CHAIR</span>
                                                <div className="text-lg font-bold text-white truncate">{inChair.name}</div>
                                            </div>
                                        )}

                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">WAITING ({queue.length})</h4>
                                        {queue.map(c => (
                                            <ClientCard key={c.id} client={c} onEditGroup={setEditingGroupClient} />
                                        ))}
                                        {queue.length === 0 && <p className="text-gray-600 text-sm italic py-2">No direct requests</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : activeTab === 'calendar' ? (
                // Calendar Container - Dark Mode
                <div className="flex-1 bg-[#1a1d24] rounded-xl shadow-sm border border-white/5 overflow-hidden">
                    <CalendarView onAddClient={handleCalendarAdd} />
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto bg-[#1a1d24] rounded-xl shadow-sm border border-white/5 p-8">
                    <div className="max-w-2xl mx-auto">
                        <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4 mb-8">Shop Configuration</h2>

                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Staff Management</h3>
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        id="new-barber-name"
                                        placeholder="New Barber Name"
                                        className="flex-1 p-3 rounded-lg bg-[#0f1115] border border-white/10 text-white outline-none focus:border-blue-500"
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
                                        onClick={() => {
                                            const input = document.getElementById('new-barber-name') as HTMLInputElement;
                                            if (input && input.value.trim()) {
                                                queueManager.addBarber(input.value.trim());
                                                input.value = '';
                                            }
                                        }}
                                        className="px-6 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
                                    >
                                        Add
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
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/10 opacity-50">
                            <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Debug</h3>
                            <button
                                className="px-4 py-2 bg-[#0f1115] rounded text-gray-500 text-xs font-bold mr-4 border border-white/5"
                                onClick={() => {
                                    const names = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank'];
                                    const barberIds = [...barbers.map(b => b.id), 'next_available'];
                                    queueManager.addClient(names[Math.floor(Math.random() * names.length)], barberIds[Math.floor(Math.random() * barberIds.length)]);
                                }}
                            >
                                + Random
                            </button>
                            <button
                                className="px-4 py-2 bg-red-500/10 text-red-500 rounded text-xs font-bold border border-red-500/20"
                                onClick={() => { queueManager.reset(); window.location.reload(); }}
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
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
        <div className="bg-[#2a2d36] p-4 rounded-xl shadow-sm border border-white/5 hover:border-white/20 transition-colors group">
            <div className="flex justify-between items-center mb-1">
                <div className="font-bold text-white text-base truncate flex items-center gap-2">
                    {client.name}
                    {client.remainingSize && client.remainingSize > 1 && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold cursor-pointer hover:bg-blue-500/30" onClick={() => onEditGroup(client)}>
                            +{client.remainingSize - 1} 👥
                        </span>
                    )}
                </div>
                <div className="text-xs text-white/20 font-mono font-bold group-hover:text-blue-400 transition-colors">
                    #{client.id.slice(-3)}
                </div>
            </div>
            <div className="text-xs text-gray-500 font-medium flex justify-between">
                <span>Waiting {waitTime}m</span>
                {client.remainingSize && client.remainingSize > 1 && (
                    <button onClick={() => onEditGroup(client)} className="text-gray-500 hover:text-blue-400 underline decoration-dotted bg-transparent border-none cursor-pointer p-0">
                        Edit
                    </button>
                )}
            </div>
        </div>
    );
}
