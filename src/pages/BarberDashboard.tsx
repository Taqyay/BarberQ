import { useState, useEffect, type FC, type ReactNode, type ChangeEvent, type KeyboardEvent } from 'react';
import { useQueue } from '../hooks/useQueue';
import { queueManager } from '../services/queueManager';
import type { BarberId, Client, BarberState, Settings } from '../types';
import { CalendarView } from '../components/CalendarView';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { ProgressRing } from '../components/ProgressRing';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar } from '../components/Avatar';

// --- Headless UI Components (Tailwind) ---

const Card: FC<{ children: ReactNode, className?: string, onClick?: () => void }> = ({ children, className, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-surface rounded-2xl border border-border shadow-sm overflow-hidden ${className || ''}`}
    >
        {children}
    </div>
);

const Button: FC<{ children: ReactNode, onClick?: () => void, variant?: 'primary' | 'secondary' | 'outline' | 'ghost', className?: string, disabled?: boolean }> = ({ children, onClick, variant = 'primary', className, disabled }) => {
    const baseStyle = "h-10 px-4 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-primary text-background hover:brightness-110 shadow-[0_2px_8px_rgba(197,160,89,0.25)]",
        secondary: "bg-surfaceHighlight text-text-main hover:bg-border",
        outline: "border border-border text-text-secondary hover:text-text-main hover:border-text-secondary",
        ghost: "text-text-secondary hover:text-text-main hover:bg-surfaceHighlight/50"
    };

    return (
        <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className || ''}`}>
            {children}
        </button>
    );
};

interface BarberColumnProps {
    barber: BarberState;
    queue: Client[];
    inChair: Client | undefined;
    onCallNext: () => void;
    onSnooze: (id: string) => void;
    onToggleAvailability: () => void;
    onEditGroup: (client: Client) => void;
    progress: number;
}

interface SettingsViewProps {
    barbers: BarberState[];
    settings: Settings;
    onAddBarber: (name: string) => void;
    onRemoveBarber: (id: string) => void;
    sensors: any;
    handleDragEnd: (event: DragEndEvent) => void;
    onUpdateSettings: (settings: Partial<Settings>) => void;
}

export function BarberDashboard() {
    const { clients, barbers, settings } = useQueue();
    const [activeTab, setActiveTab] = useState<'queue' | 'calendar' | 'settings'>('queue');
    const [selectedBarberId, setSelectedBarberId] = useState<string | 'all'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPoolOpen, setIsPoolOpen] = useState(true);
    const [isNavExpanded, setIsNavExpanded] = useState(false);

    // Orientation state
    const [isLandscape, setIsLandscape] = useState(() => window.matchMedia('(orientation: landscape)').matches);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(orientation: landscape)');
        const handleChange = (e: MediaQueryListEvent) => {
            setIsLandscape(e.matches);
            // Reset to default view automatically upon rotation
            setSelectedBarberId('all');
            setActiveTab('queue');
            setIsPoolOpen(true);
        };
        
        // Ensure initial state is correct in case it changed before hydration
        setIsLandscape(mediaQuery.matches);

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // Modal State
    const [newClientName, setNewClientName] = useState('');
    const [newPreference, setNewPreference] = useState<BarberId>('next_available');
    const [newGroupSize, setNewGroupSize] = useState(1);
    const [prefillTime, setPrefillTime] = useState<Date | null>(null);
    const [editingGroupClient, setEditingGroupClient] = useState<Client | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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
        const result = queueManager.addClient(newClientName, newPreference, 'manual', newGroupSize);
        if (prefillTime && result && result.id) {
            queueManager.updateClientTimeSlot(result.id, prefillTime.getTime(), newPreference);
        }
        setIsModalOpen(false);
        resetModal();
    };

    const resetModal = () => {
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

    const getInChair = (barberId: BarberId) =>
        clients.find(c => c.status === 'in_chair' && (c.assignedBarber === barberId || (c.barberPreference === barberId && !c.assignedBarber)));

    const globalPool = clients.filter(c => c.status === 'waiting' && c.barberPreference === 'next_available');

    // Derived Metrics
    const activeBarbersCount = barbers.filter(b => b.isAvailable).length;
    const avgWeightPerBarber = activeBarbersCount > 0 ? (globalPool.length * (settings.averageCutTimeMinutes || 20)) / activeBarbersCount : 0;
    const avgWait = Math.round(avgWeightPerBarber);

    // Progress Calculation Logic
    const useServiceProgress = (client: Client | undefined) => {
        const [progress, setProgress] = useState(0);

        useEffect(() => {
            if (!client || !client.serviceStartTime) {
                setProgress(0);
                return;
            }

            const interval = setInterval(() => {
                const elapsedMs = Date.now() - client.serviceStartTime!;
                const totalMs = (settings.averageCutTimeMinutes || 20) * 60 * 1000;

                // Linear progress from 0 to 95%
                const rawProgress = (elapsedMs / totalMs) * 95;
                setProgress(Math.min(rawProgress, 95));
            }, 1000);

            return () => clearInterval(interval);
        }, [client, settings.averageCutTimeMinutes]);

        return progress;
    };

    return (
        <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-background font-sans text-text-main selection:bg-primary/30">
            {/* --- Left Navigation Rail --- */}
            <nav className={`
                ${isNavExpanded ? 'w-48' : 'w-20'} 
                bg-background border-r border-border flex flex-col items-center py-6 z-30 shrink-0 transition-all duration-300
                hidden md:flex
            `}>
                <button onClick={() => {
                    setSelectedBarberId('all');
                    setActiveTab('calendar');
                    setIsPoolOpen(false);
                }} className={`w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/20 transition-all duration-300 ${selectedBarberId === 'all' ? 'shadow-[0_0_15px_rgba(197,160,89,0.4)] scale-105' : 'hover:bg-primary/20'}`} title="All Barbers (Calendar)">
                    <span className="material-icons text-primary text-2xl">groups</span>
                </button>

                <div className="flex flex-col gap-4 mb-8 w-full max-h-[40vh] overflow-y-auto no-scrollbar items-center">
                    {barbers.filter(b => b.isAvailable).map(b => (
                        <button key={b.id} onClick={() => {
                            setSelectedBarberId(b.id);
                            if (activeTab === 'calendar') setActiveTab('queue'); // Default to queue when selecting a single barber? The prompt says "main stage should display all the information for that barber", we can stay on the active tab or default to queue. Let's keep active tab, user can switch to calendar or queue for that barber.
                        }} className={`flex flex-col items-center gap-1.5 group w-full shrink-0`}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${selectedBarberId === b.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105' : 'opacity-70 hover:opacity-100'}`}>
                                <Avatar name={b.name} size="md" />
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${selectedBarberId === b.id ? 'text-primary' : 'text-text-secondary group-hover:text-text-main'}`}>{b.name.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-6 mt-auto">
                    <NavButton
                        icon="view_quilt"
                        label="Queue"
                        isActive={activeTab === 'queue'}
                        onClick={() => setActiveTab('queue')}
                    />
                    <NavButton
                        icon="calendar_today"
                        label="Calendar"
                        isActive={activeTab === 'calendar'}
                        onClick={() => setActiveTab('calendar')}
                    />
                    <NavButton
                        icon="settings"
                        label="Configs"
                        isActive={activeTab === 'settings'}
                        onClick={() => setActiveTab('settings')}
                    />
                </div>

                <div className="flex flex-col gap-4 mt-6 mb-4 items-center">
                    <div title={new Date().toLocaleTimeString()} className="text-[10px] text-text-secondary font-mono">
                        {new Date().getHours()}:{new Date().getMinutes().toString().padStart(2, '0')}
                    </div>
                    <ConnectionStatus showLabel={false} />
                </div>
            </nav>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden h-16 bg-background border-t border-border flex items-center justify-around z-30 shrink-0">
                <NavButton
                    icon="view_quilt"
                    label="Queue"
                    isActive={activeTab === 'queue'}
                    onClick={() => setActiveTab('queue')}
                    compact
                />
                <NavButton
                    icon="calendar_today"
                    label="Calendar"
                    isActive={activeTab === 'calendar'}
                    onClick={() => setActiveTab('calendar')}
                    compact
                />
                <NavButton
                    icon="settings"
                    label="Configs"
                    isActive={activeTab === 'settings'}
                    onClick={() => setActiveTab('settings')}
                    compact
                />
                <button 
                    onClick={() => setIsPoolOpen(!isPoolOpen)}
                    className={`flex flex-col items-center gap-1 ${isPoolOpen ? 'text-primary' : 'text-text-secondary'}`}
                >
                    <span className="material-icons">group</span>
                    <span className="text-[9px] font-bold uppercase">Pool</span>
                </button>
            </nav>

            {/* --- Main Content Area --- */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-16 bg-background/90 backdrop-blur-md border-b border-border flex items-center px-4 md:px-6 justify-between z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsNavExpanded(!isNavExpanded)}
                            className="hidden md:flex p-2 hover:bg-surfaceHighlight rounded-lg text-text-secondary transition-colors"
                        >
                            <span className="material-icons">{isNavExpanded ? 'menu_open' : 'menu'}</span>
                        </button>
                        <h1 className="text-lg font-bold tracking-tight text-text-main">Staff Hub</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <StatPill label="Wait" value={`~${avgWait}m`} />
                            <StatPill label="Queue" value={globalPool.length.toString()} className="hidden sm:flex" />
                            <StatPill label="Active" value={`${activeBarbersCount}/${barbers.length}`} highlight className="hidden sm:flex" />
                        </div>
                        <button 
                            onClick={() => setIsPoolOpen(!isPoolOpen)}
                            className={`p-2 rounded-lg transition-all ${isPoolOpen ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surfaceHighlight'}`}
                        >
                            <span className="material-icons">group</span>
                        </button>
                    </div>
                </header>

                {/* Content Body */}
                <main className="flex-1 overflow-hidden relative bg-background">
                    {activeTab === 'queue' && (
                        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar">
                            <div className={isLandscape ? "flex flex-row gap-4 pb-8 w-full" : "grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 auto-rows-min pb-8 w-full"}>
                                {/* Barber Columns */}
                                {barbers
                                    .filter(b => selectedBarberId === 'all' || b.id === selectedBarberId)
                                    .map(barber => (
                                     <div key={barber.id} className={isLandscape ? "flex-1 min-w-0" : ""}>
                                         <BarberColumnWrapper
                                             barber={barber}
                                             queue={getQueueFor(barber.id)}
                                             inChair={getInChair(barber.id)}
                                             onCallNext={() => queueManager.callNext(barber.id)}
                                             onSnooze={(clientId: string) => queueManager.snoozeClient(clientId)}
                                             onToggleAvailability={() => queueManager.toggleBarberAvailability(barber.id, !barber.isAvailable)}
                                             onEditGroup={setEditingGroupClient}
                                             useServiceProgress={useServiceProgress}
                                             settings={settings}
                                         />
                                     </div>
                                 ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'calendar' && (
                        <div className="h-full p-4">
                            <Card className="h-full flex flex-col bg-surface/50">
                                <CalendarView onAddClient={handleCalendarAdd} selectedBarberId={selectedBarberId} />
                            </Card>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                            <SettingsView
                                barbers={barbers}
                                settings={settings}
                                onAddBarber={(name) => queueManager.addBarber(name)}
                                onRemoveBarber={(id) => queueManager.removeBarber(id)}
                                sensors={sensors}
                                handleDragEnd={handleDragEnd}
                                onUpdateSettings={queueManager.updateSettings}
                            />
                        </div>
                    )}
                </main>

                {/* Footer / Debug Bar */}
                <footer className="h-10 px-4 bg-background border-t border-border flex items-center justify-between text-[10px] text-text-secondary font-medium shrink-0">
                    <div className="flex items-center gap-6">
                        <span>Ver 1.0_290326</span>
                        <span className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${true ? 'bg-primary' : 'bg-red-500'}`}></div>
                            HEADLESS UI
                        </span>
                    </div>
                    <div className="flex items-center gap-6">
                        <button onClick={() => { if (confirm('Reset?')) { queueManager.reset(); window.location.reload(); } }} className="hover:text-primary transition-colors font-bold uppercase tracking-wider">
                            RESET SYSTEM
                        </button>
                        <button onClick={() => {
                            const names = ['Alice', 'Bob', 'Charlie', 'David', 'Eva'];
                            const availableBarbers = barbers.filter(b => b.isAvailable).map(b => b.id);
                            const barberIds = [...availableBarbers, 'next_available'];
                            queueManager.addClient(names[Math.floor(Math.random() * names.length)], barberIds[Math.floor(Math.random() * barberIds.length)]);
                        }} className="hover:text-primary transition-colors font-bold uppercase tracking-wider">
                            + RANDOM
                        </button>
                    </div>
                </footer>
            </div>

            {/* --- Right Sidebar: Next Available Pool --- */}
            <aside className={`
                ${isPoolOpen ? 'translate-x-0 w-64' : 'translate-x-full w-0'} 
                fixed md:relative top-0 right-0 h-full bg-background border-l border-border flex flex-col z-40 shadow-2xl shrink-0 transition-all duration-300 overflow-hidden
            `}>
                <div className="p-5 border-b border-border bg-background sticky top-0">
                    <h2 className="text-lg font-extrabold text-text-main leading-tight flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(197,160,89,0.5)]"></span>
                        Next Available Pool
                    </h2>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1 ml-4">{globalPool.length} Clients waiting</p>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6">
                    {/* Holding / Snoozed Section */}
                    {clients.some(c => c.status === 'snoozed') && (
                        <div>
                            <h3 className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                                Holding
                                <div className="flex-1 h-[1px] bg-primary/20"></div>
                            </h3>
                            <div className="flex flex-col gap-2">
                                {clients.filter(c => c.status === 'snoozed').map(c => (
                                    <div key={c.id} className="p-3 rounded-lg border border-primary/30 bg-primary/5 flex items-center gap-3 cursor-pointer hover:bg-primary/10 transition-all group">
                                        <Avatar name={c.name} size="sm" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-text-main truncate">{c.name}</p>
                                        </div>
                                        <button onClick={() => queueManager.reactivateClient(c.id)} className="material-icons text-lg text-primary hover:scale-110 transition-transform">restore</button>
                                        <button onClick={() => queueManager.cancelClient(c.id)} className="material-icons text-lg text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">close</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                            Upcoming
                            <div className="flex-1 h-[1px] bg-border"></div>
                        </h3>
                        <div className="space-y-3">
                            {globalPool.map((client: Client, idx: number) => (
                                <SidebarClientCard key={client.id} client={client} index={idx} />
                            ))}
                            {globalPool.length === 0 && (
                                <div className="p-8 text-center border-2 border-dashed border-border rounded-3xl opacity-20">
                                    <span className="material-icons text-4xl block mb-2">person_add_disabled</span>
                                    <p className="text-[10px] font-bold uppercase tracking-tighter">Pool is empty</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-background border-t border-border">
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full h-12 text-sm shadow-lg shadow-primary/20"
                    >
                        <span className="material-icons text-xl">add</span>
                        WALK-IN CHECK-IN
                    </Button>
                </div>
            </aside>

            {/* --- Modals --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <Card className="p-8 w-full max-w-md flex flex-col gap-6 bg-background border-primary/20 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                        <h2 className="text-text-main m-0 font-bold text-2xl">
                            {prefillTime ? `Book Appointment` : `Add Walk-in`}
                        </h2>

                        <div>
                            <label className="block text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">Client Name</label>
                            <input
                                type="text"
                                className="w-full bg-surface border border-border rounded-lg p-3 text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-text-secondary/30 transition-all"
                                value={newClientName}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewClientName(e.target.value)}
                                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleAddWalkIn(); }}
                                placeholder="Enter name..."
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-text-secondary mb-3 text-xs font-bold uppercase tracking-wider">Group Size</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setNewGroupSize(num)}
                                        className={`w-10 h-10 rounded-lg font-bold transition-all border ${newGroupSize === num ? 'bg-primary text-background border-primary' : 'bg-surface text-text-secondary border-border hover:border-text-secondary'}`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {!prefillTime && (
                            <div>
                                <label className="block text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">Barber Preference</label>
                                <select
                                    className="w-full bg-surface border border-border rounded-lg p-3 text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none"
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

                        <div className="flex gap-3 justify-end mt-4">
                            <Button variant="ghost" onClick={() => { setIsModalOpen(false); resetModal(); }}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddWalkIn}
                                disabled={!newClientName.trim()}
                            >
                                {prefillTime ? 'Book Slot' : 'Check In'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Edit Group Size Modal */}
            {editingGroupClient && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <Card className="p-8 w-full max-w-md flex flex-col gap-6">
                        <h2 className="text-text-main m-0 font-bold text-2xl">Edit Group Size</h2>
                        <div className="flex gap-2 flex-wrap">
                            {Array.from({ length: (editingGroupClient.remainingSize || 0) + 5 }, (_, i) => i + 1).slice(0, 10).map(size => (
                                <button
                                    key={size}
                                    onClick={() => handleUpdateGroupSize(size)}
                                    className={`px-4 py-2 rounded-lg font-bold transition-all border ${editingGroupClient.remainingSize === size ? 'bg-primary text-background border-primary' : 'bg-surface text-text-secondary border-border hover:border-text-secondary'}`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end">
                            <Button variant="ghost" onClick={() => setEditingGroupClient(null)}>Cancel</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

// --- Sub-Components ---

function NavButton({ icon, label, isActive, onClick, compact }: { icon: string, label: string, isActive: boolean, onClick: () => void, compact?: boolean }) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center gap-1.5 group ${compact ? '' : 'w-full'}`}>
            <div className={`
                ${compact ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 rounded-2xl'} 
                flex items-center justify-center transition-all duration-300 
                ${isActive ? 'bg-primary text-background shadow-[0_0_15px_rgba(197,160,89,0.4)] scale-105' : 'text-text-secondary group-hover:bg-surfaceHighlight group-hover:text-primary'}
            `}>
                <span className={`material-icons ${compact ? 'text-xl' : 'text-2xl'}`}>{icon}</span>
            </div>
            {!compact && <span className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-primary' : 'text-text-secondary group-hover:text-text-main'}`}>{label}</span>}
        </button>
    );
}

function StatPill({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
    return (
        <div className={`px-4 py-1.5 rounded-full border flex items-center gap-3 backdrop-blur-md ${highlight ? 'bg-primary/10 border-primary/30' : 'bg-surface/50 border-border/50'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${highlight ? 'text-primary' : 'text-text-secondary'}`}>
                {label}
            </span>
            <span className={`text-xs font-bold ${highlight ? 'text-text-main' : 'text-text-main'}`}>
                {value}
            </span>
        </div>
    );
}

function BarberColumnWrapper({ barber, onCallNext, useServiceProgress, ...props }: any) {
    const [isCompleting, setIsCompleting] = useState(false);
    const progress = useServiceProgress(props.inChair);

    const handleCallNext = () => {
        if (props.inChair) {
            setIsCompleting(true);
            // Brief delay to show 100% before actually calling next
            setTimeout(() => {
                onCallNext();
                setIsCompleting(false);
            }, 600);
        } else {
            onCallNext();
        }
    };

    return <BarberColumn {...props} barber={barber} onCallNext={handleCallNext} progress={isCompleting ? 100 : progress} key={`${barber.id}-${JSON.stringify(props.settings)}`} />;
}

function BarberColumn({ barber, queue, inChair, onCallNext, onSnooze, onToggleAvailability, onEditGroup, progress }: BarberColumnProps) {
    return (
        <div className="flex flex-col gap-4 h-full min-w-0">
            {/* Barber Header Card */}
            <Card className={`p-4 flex items-center justify-between transition-all duration-200 shadow-m ${barber.isAvailable ? 'opacity-100' : 'opacity-60'}`}>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Avatar name={barber.name} size="lg" />
                        {barber.isAvailable && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-surface shadow-sm"></div>}
                    </div>
                    <div>
                        <span className="font-semibold text-base text-text-main block leading-tight">{barber.name}</span>
                        <span className="text-xs text-text-secondary">{barber.isAvailable ? 'Active' : 'Offline'}</span>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={barber.isAvailable} onChange={onToggleAvailability} />
                    <div className="w-11 h-6 bg-surface border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary/20 peer-checked:border-primary peer-checked:after:bg-primary"></div>
                </label>
            </Card>

            {/* Action Buttons */}
            <div className={`grid grid-cols-2 gap-3 transition-opacity ${barber.isAvailable ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <Button onClick={onCallNext} className="h-12 text-sm shadow-md">
                    <span className="material-icons text-xl">play_circle</span>
                    CALL NEXT
                </Button>
                <Button variant="secondary" onClick={() => inChair && onSnooze(inChair.id)} disabled={!inChair} className="h-12 text-sm border border-border/50">
                    <span className="material-icons text-xl">snooze</span>
                    NOT HERE
                </Button>
            </div>

            {/* In-Chair Card - 160px Fixed Height */}
            <div className={`rounded-2xl border border-dashed border-border p-1 h-[160px] flex flex-col ${inChair ? 'bg-surfaceHighlight' : 'bg-transparent'}`}>
                {inChair ? (
                    <div className="bg-surface rounded-xl p-4 shadow-m border-l-4 border-primary h-full flex items-center gap-4 relative overflow-hidden">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            <Avatar name={inChair.name} size="lg" />
                        </div>

                        {/* Client Info */}
                        <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-md mb-1 inline-block uppercase tracking-wider">
                                In Service
                            </span>
                            <h3 className="font-bold text-xl text-text-main leading-tight mb-1 truncate">{inChair.name}</h3>
                            <p className="text-[10px] text-text-secondary font-mono">
                                Started: {new Date(inChair.serviceStartTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>

                        <div className="flex-shrink-0 flex flex-col items-center gap-1">
                            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Progress</span>
                            <ProgressRing progress={progress} size={56} strokeWidth={5} mode="deplete" />
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <span className="material-icons text-4xl mb-2 text-text-secondary">event_seat</span>
                        <span className="text-xs text-text-secondary font-bold uppercase tracking-widest">Station Empty</span>
                    </div>
                )}
            </div>

            {/* Queue List with Radix ScrollArea */}
            <Card className="flex-1 p-0 flex flex-col overflow-hidden min-h-[300px] bg-surface/50">
                <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">Queue</span>
                    <span className="text-[10px] font-bold text-text-main bg-background px-2 py-1 rounded-md border border-border">{queue.length}</span>
                </div>
                <ScrollArea.Root className="flex-1 overflow-hidden">
                    <ScrollArea.Viewport className="w-full h-full p-3">
                        <div className="space-y-2">
                            {queue.map((client: Client, idx: number) => (
                                <div key={client.id} className="relative pl-6 py-1 group">
                                    {/* Connector Line */}
                                    {idx !== queue.length - 1 && (
                                        <div className="absolute left-[9px] top-6 bottom-[-8px] w-[2px] bg-border group-hover:bg-border/70 transition-colors"></div>
                                    )}

                                    {/* Dot */}
                                    <div className={`absolute left-0 top-1.5 w-5 h-5 rounded-full border-2 bg-surface flex items-center justify-center z-10 ${idx === 0 ? 'border-primary text-primary' : 'border-border text-text-secondary'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? 'bg-primary' : 'bg-transparent'}`}></div>
                                    </div>

                                    <div className="bg-surface border border-border rounded-2xl p-4 hover:border-primary/30 hover:shadow-m transition-all flex items-center gap-3">
                                        <Avatar name={client.name} size="md" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-sm font-semibold text-text-main flex items-center gap-2">
                                                    {client.name}
                                                    {(client.remainingSize || 0) > 1 && (
                                                        <button onClick={() => onEditGroup(client)} className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-md hover:bg-primary/25 font-medium">
                                                            +{client.remainingSize! - 1}
                                                        </button>
                                                    )}
                                                </p>
                                                <span className="text-xs text-text-secondary">
                                                    {new Date(client.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-text-secondary">
                                                Wait: <span className="text-text-main font-medium">{Math.floor((Date.now() - client.checkInTime) / 60000)}m</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {queue.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-text-secondary/30 py-8">
                                    <span className="text-xs italic">No requests</span>
                                </div>
                            )}
                        </div>
                    </ScrollArea.Viewport>
                    <ScrollArea.Scrollbar className="flex select-none touch-none p-0.5 bg-background/50 transition-colors duration-150 ease-out hover:bg-background/80 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5" orientation="vertical">
                        <ScrollArea.Thumb className="flex-1 bg-border rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
                    </ScrollArea.Scrollbar>
                </ScrollArea.Root>
            </Card>
        </div>
    );
}

function SidebarClientCard({ client, index }: { client: Client, index: number }) {
    const waitTime = Math.floor((Date.now() - client.checkInTime) / 60000);
    const isNext = index === 0;

    return (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer group shadow-s hover:shadow-m ${isNext ? 'bg-surface border-primary shadow-m' : 'bg-surface border-border'}`}>
            <Avatar name={client.name} size="md" />
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                    <p className="text-sm font-semibold truncate text-text-main">{client.name}</p>
                    <span className="text-xs text-text-secondary">{new Date(client.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                    <span className="text-xs text-text-secondary">Wait: {waitTime}m</span>
                    {isNext && <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Next</span>}
                </div>
            </div>
        </div>
    );
}

function SettingsView({ barbers, settings, onAddBarber, onRemoveBarber, sensors, handleDragEnd, onUpdateSettings }: SettingsViewProps) {
    const [localSettings, setLocalSettings] = useState(settings);

    // Sync local settings when external settings prop changes
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const updateLocalSetting = (update: Partial<Settings>) => {
        setLocalSettings(prev => ({ ...prev, ...update }));
    };

    const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings);

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold text-text-main border-b border-border pb-4">Configuration</h2>

            <section>
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-1">Shop Parameters</h3>
                        <p className="text-xs text-text-secondary">Core business logic & timing</p>
                    </div>
                    {hasChanges && (
                        <Button onClick={() => onUpdateSettings(localSettings)} className="animate-in fade-in slide-in-from-right-4">
                            SAVE CHANGES
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-6 bg-surface p-6 rounded-2xl border border-border shadow-s">
                    <ConfigInput
                        label="Avg Cut Time (min)"
                        value={localSettings.averageCutTimeMinutes || 20}
                        onChange={(val) => updateLocalSetting({ averageCutTimeMinutes: Number(val) })}
                    />
                    <ConfigInput
                        label="Remote Buffer (min)"
                        value={localSettings.remoteBufferMinutes || 0}
                        onChange={(val) => updateLocalSetting({ remoteBufferMinutes: Number(val) })}
                    />
                    <ConfigInput
                        label="Shop Opening"
                        type="time"
                        value={String(localSettings.firstCutTime || 9).padStart(2, '0') + ":00"}
                        onChange={(val) => {
                            const hour = parseInt(String(val).split(':')[0]);
                            updateLocalSetting({ firstCutTime: hour });
                        }}
                    />
                    <ConfigInput
                        label="Shop Closing"
                        type="time"
                        value={String(localSettings.lastCutTime || 18).padStart(2, '0') + ":00"}
                        onChange={(val) => {
                            const hour = parseInt(String(val).split(':')[0]);
                            updateLocalSetting({ lastCutTime: hour });
                        }}
                    />
                    <div className="col-span-2 pt-4 border-t border-border mt-2">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                                MVS (Minimum Viable Slot): <span className="text-primary">{localSettings.mvsMinutes || 15}m</span>
                            </label>
                            <span className="text-[10px] text-text-tertiary italic">Snaps bookings to prevent fragmentation</span>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="30"
                            step="5"
                            className="w-full accent-primary bg-background h-1.5 rounded-lg appearance-none cursor-pointer"
                            value={localSettings.mvsMinutes || 15}
                            onChange={(e) => updateLocalSetting({ mvsMinutes: parseInt(e.target.value) })}
                        />
                        <div className="flex justify-between text-[10px] text-text-tertiary mt-2 font-bold px-1">
                            <span>5m</span>
                            <span>15m (Stable)</span>
                            <span>30m</span>
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">Staff Directory</h3>
                <Card className="p-6 bg-surface/50 border-dashed">
                    <div className="flex gap-2 mb-6">
                        <input
                            type="text"
                            id="new-barber-name"
                            className="flex-1 bg-background border border-border rounded-lg px-4 text-sm focus:outline-none focus:border-primary transition-colors"
                            placeholder="Add new barber..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const input = e.currentTarget;
                                    if (input.value.trim()) {
                                        onAddBarber(input.value.trim());
                                        input.value = '';
                                    }
                                }
                            }}
                        />
                        <Button onClick={() => {
                            const input = document.getElementById('new-barber-name') as HTMLInputElement;
                            if (input.value.trim()) {
                                onAddBarber(input.value.trim());
                                input.value = '';
                            }
                        }}>ADD</Button>
                    </div>

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={barbers.map(b => b.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {barbers.map((barber) => (
                                    <SortableBarberItem key={barber.id} id={barber.id} name={barber.name} onDelete={() => onRemoveBarber(barber.id)} />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </Card>
            </section>

            <section>
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">Services & Pricing</h3>
                <Card className="p-6 bg-surface/50 border-dashed">
                    {['Main Services', 'Add-ons', 'Treatments', 'Surcharges'].map(category => (
                        <div key={category} className="mb-8 last:mb-0">
                            <h4 className="text-xs font-bold text-text-main border-b border-border pb-2 mb-4 flex items-center gap-2">
                                {category}
                            </h4>
                            {/* Column Headings */}
                            {(localSettings.services || []).filter(s => s.category === category).length > 0 && (
                                <div className="flex gap-2 px-3 mb-2 text-[9px] font-bold text-text-tertiary uppercase tracking-widest">
                                    <div className="flex-1">Service</div>
                                    <div className="w-24">Cost</div>
                                    <div className="w-16 hidden sm:block text-right pr-6">Time</div>
                                    <div className="w-8 ml-1"></div>
                                </div>
                            )}
                            <div className="space-y-3">
                                {(localSettings.services || []).filter(s => s.category === category).map(service => (
                                    <div key={service.id} className="flex gap-2 items-center bg-background p-2 rounded-xl border border-border shadow-sm focus-within:border-primary/50 transition-colors">
                                        <input
                                            className="flex-1 bg-transparent border-none text-sm font-medium text-text-main focus:outline-none min-w-0"
                                            value={service.name}
                                            onChange={(e) => {
                                                const updated = (localSettings.services || []).map(s => s.id === service.id ? { ...s, name: e.target.value } : s);
                                                updateLocalSetting({ services: updated });
                                            }}
                                            placeholder="Service Name"
                                        />
                                        <div className="w-[1px] h-6 bg-border mx-2"></div>
                                        <input
                                            className="w-24 bg-transparent border-none text-sm text-text-main focus:outline-none"
                                            value={service.price}
                                            onChange={(e) => {
                                                const updated = (localSettings.services || []).map(s => s.id === service.id ? { ...s, price: e.target.value } : s);
                                                updateLocalSetting({ services: updated });
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    let num = parseFloat(service.price.replace(/[^0-9.-]/g, ''));
                                                    if (!isNaN(num)) {
                                                        const formatted = `£${num.toFixed(2)}`;
                                                        const updated = (localSettings.services || []).map(s => s.id === service.id ? { ...s, price: formatted } : s);
                                                        updateLocalSetting({ services: updated });
                                                    }
                                                    e.currentTarget.blur();
                                                }
                                            }}
                                            placeholder="Price"
                                        />
                                        <div className="w-[1px] h-6 bg-border mx-2 hidden sm:block"></div>
                                        <div className="relative hidden sm:flex items-center">
                                            <input
                                                type="number"
                                                className="w-16 bg-transparent border-none text-sm text-text-main focus:outline-none text-right pr-6"
                                                value={service.durationMinutes || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value ? parseInt(e.target.value) : null;
                                                    const updated = (localSettings.services || []).map(s => s.id === service.id ? { ...s, durationMinutes: val } : s);
                                                    updateLocalSetting({ services: updated });
                                                }}
                                                placeholder="--"
                                            />
                                            <span className="absolute right-0 text-xs text-text-secondary pointer-events-none">m</span>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const updated = (localSettings.services || []).filter(s => s.id !== service.id);
                                                updateLocalSetting({ services: updated });
                                            }} 
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-red-500/10 hover:text-red-500 transition-colors ml-1"
                                            title="Remove Service"
                                        >
                                            <span className="material-icons text-sm">close</span>
                                        </button>
                                    </div>
                                ))}
                                <Button variant="ghost" onClick={() => {
                                    const newService = { id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2), category, name: '', price: '£0.00', durationMinutes: 20 };
                                    updateLocalSetting({ services: [...(localSettings.services || []), newService] });
                                }} className="text-xs font-bold uppercase tracking-wider opacity-70 hover:opacity-100">
                                    <span className="material-icons text-sm mr-1">add</span>
                                    Add Service
                                </Button>
                            </div>
                        </div>
                    ))}
                </Card>
            </section>
            {/* Theme Selector - Temporarily Disabled (Tailwind v4 Config Issue)
            <section>
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">Theme</h3>
                <Card className="p-6 bg-surface/50">
                    <ThemeSelector />
                </Card>
            </section>
            */}
        </div>
    );
}

function SortableBarberItem({ id, name, onDelete }: { id: string, name: string, onDelete: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, touchAction: 'none' };
    return (
        <div ref={setNodeRef} style={style} {...attributes} className="flex justify-between items-center bg-background p-3 rounded-xl border border-border shadow-sm group hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4">
                <span {...listeners} className="cursor-grab text-text-secondary hover:text-text-main material-icons text-sm bg-surface p-1 rounded">drag_indicator</span>
                <span className="font-bold text-text-main text-sm">{name}</span>
            </div>
            <button onClick={onDelete} className="text-text-secondary hover:text-red-500 material-icons text-sm opacity-0 group-hover:opacity-100 transition-opacity">close</button>
        </div>
    );
}

function ConfigInput({ label, value, onChange, type = "number" }: { label: string, value: string | number, onChange: (val: string | number) => void, type?: "number" | "time" }) {
    const [localValue, setLocalValue] = useState<string | number>(value);

    // Sync local value when external prop changes (e.g. from another client or server)
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    return (
        <div>
            <label className="block text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">{label}</label>
            <input
                type={type}
                className="bg-background border border-border rounded-lg p-2 text-text-main w-full focus:outline-none focus:border-primary transition-colors"
                value={localValue}
                onChange={(e) => {
                    const rawVal = e.target.value;
                    if (type === "number") {
                        // Allow empty string to avoid leading zeros while typing
                        if (rawVal === '') {
                            setLocalValue('');
                            onChange(0);
                        } else {
                            const parsed = parseInt(rawVal);
                            setLocalValue(parsed);
                            onChange(parsed);
                        }
                    } else {
                        setLocalValue(rawVal);
                        onChange(rawVal);
                    }
                }}
            />
        </div>
    );
}
