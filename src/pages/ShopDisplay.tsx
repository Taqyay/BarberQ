import { useQueue } from '../hooks/useQueue';
// import type { BarberId } from '../types';

export function ShopDisplay() {
    const { clients, barbers } = useQueue();

    // Use dynamic barbers list for columns
    // const barberColumns = barbers.filter(b => b.isAvailable); // Unused
    // User request: "filter clients where assignedBarber === 'Adam'".
    // For dynamic, we iterate over `barbers`.

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-8 font-sans text-neutral-900">
            {/* TV FRAME: 16:9 Aspect Ratio Simulation */}
            <div className="w-full max-w-[1400px] aspect-video bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-neutral-100 overflow-hidden flex">

                {/* LEFT BRAND PANEL: Minimalist & Informational */}
                <aside className="w-1/4 bg-white p-12 flex flex-col justify-between border-r border-neutral-50">
                    <div className="space-y-10">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600 font-semibold mb-1">Established 2026</p>
                            <h1 className="text-4xl font-serif text-neutral-900 leading-tight">
                                GOLDEN<br />BARBERS
                            </h1>
                            <div className="w-12 h-[2px] bg-amber-500 mt-4" />
                        </div>

                        <div className="space-y-4">
                            <div className="w-40 h-40 bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-center">
                                {/* QR CODE PLACEHOLDER */}
                                <div className="w-full h-full bg-neutral-900 rounded-lg flex items-center justify-center">
                                    <span className="text-[10px] text-white tracking-tighter">QR SCAN</span>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 leading-relaxed max-w-[160px]">
                                Scan to join the chair and track your spot live on your phone.
                            </p>
                        </div>
                    </div>

                    {/* SNOOZE / HOLDING SECTION */}
                    {clients.some(c => c.status === 'snoozed') && (
                        <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Holding Area</span>
                            </div>
                            <div className="space-y-1">
                                {clients.filter(c => c.status === 'snoozed').map(c => (
                                    <p key={c.id} className="text-xs text-red-800 font-medium flex justify-between">
                                        {c.name}
                                        <span className="text-red-400 font-normal ml-2">
                                            ({Math.max(0, 5 - Math.floor((Date.now() - (c.snoozeStartTime || 0)) / 60000))}m)
                                        </span>
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>

                {/* MAIN QUEUE: Three Column Grid */}
                <main className="w-3/4 p-16 bg-white">
                    <div className="grid grid-cols-3 gap-16 h-full">

                        {/* COLUMN: DYNAMIC FOR EACH BARBER */}
                        {barbers.map((barber, i) => {
                            const barberId = barber.id;
                            const barberName = barber.name;
                            const isAvailable = barber.isAvailable;

                            const inChair = clients.find(c => c.status === 'in_chair' && c.assignedBarber === barberId);

                            const waiting = clients
                                .filter(c => {
                                    // Rule 1: Must be waiting and match barber preference
                                    const match = c.status === 'waiting' && ((c.barberPreference === barberId) || (c.barberPreference === 'next_available'));
                                    if (!match) return false;

                                    // Rule 2: Stealth Visibility (Smart Timeslots)
                                    // Hide if reservation is more than 15 mins in future
                                    if (c.reservationTime) {
                                        const now = Date.now();
                                        const visibleThreshold = c.reservationTime - (15 * 60 * 1000); // 15 mins before slot
                                        if (now < visibleThreshold) return false;
                                    }

                                    return true;
                                })
                                .sort((a, b) => {
                                    // Effective Time Logic (Matching Server)
                                    // If waiting > 30m? Add 30m penalty.
                                    const getEffectiveTime = (c: typeof a) => {
                                        // Smart Timeslot Priority: Treat reservation time as the effective sorting time
                                        if (c.reservationTime) {
                                            return c.reservationTime;
                                        }

                                        let time = c.originalCheckInTime || c.checkInTime;
                                        // Legacy remote penalty logic (optional, keep for safety)
                                        if (c.source === 'remote' && c.travelTime === '30+' && !c.reservationTime) {
                                            time += (30 * 60 * 1000);
                                        }
                                        return time;
                                    };
                                    return getEffectiveTime(a) - getEffectiveTime(b);
                                });

                            return (
                                <section key={i} className="flex flex-col h-full">
                                    {/* BARBER AVATAR & HEADER */}
                                    <div className="flex flex-col items-center mb-10">
                                        <div className="relative mb-6">
                                            <div className="w-28 h-28 rounded-full bg-neutral-100 border-[4px] border-white shadow-lg overflow-hidden flex items-center justify-center text-neutral-300 font-serif text-3xl">
                                                {/* Placeholder for Barber Image */}
                                                {barberName[0]}
                                            </div>
                                            {isAvailable ? (
                                                <div className="absolute -bottom-1 right-2 w-7 h-7 bg-green-500 border-4 border-white rounded-full" />
                                            ) : (
                                                <div className="absolute -bottom-1 right-2 w-7 h-7 bg-gray-400 border-4 border-white rounded-full" />
                                            )}
                                        </div>
                                        <h2 className="text-2xl font-medium text-neutral-900">{barberName}</h2>
                                        <span className="text-xs uppercase tracking-widest text-neutral-400 mt-2">{isAvailable ? 'On Shift' : 'Off Shift'}</span>
                                    </div>

                                    {/* NOW SERVING CARD */}
                                    <div className="bg-[#FDFCFB] border border-amber-100/50 rounded-[2.5rem] p-8 text-center shadow-sm mb-10 transition-all hover:shadow-md">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600 font-bold mb-4">Now Serving</p>
                                        <p className="text-4xl font-serif text-neutral-800 truncate leading-tight">
                                            {inChair ? inChair.name : <span className="text-neutral-300 text-2xl">Open</span>}
                                        </p>
                                    </div>

                                    {/* UP NEXT LIST */}
                                    <div className="flex-1 px-4 overflow-hidden flex flex-col">
                                        <p className="text-[11px] uppercase tracking-widest text-neutral-300 font-bold mb-8 border-b border-neutral-50 pb-3">Up Next</p>
                                        <ul className="space-y-8 overflow-y-auto pr-2">
                                            {waiting.length === 0 && <li className="text-base text-neutral-300 italic text-center py-4">No specific requests</li>}
                                            {waiting.map((client) => (
                                                <li key={client.id} className="flex items-center justify-between group">
                                                    <span className="text-lg text-neutral-600 font-medium truncate max-w-[70%] group-hover:text-neutral-900 transition-colors">
                                                        {client.name}
                                                        {client.barberPreference === 'next_available' && (
                                                            <span className="ml-2 text-[10px] text-neutral-400 font-normal uppercase tracking-wider">(Any)</span>
                                                        )}
                                                        {client.remainingSize && client.remainingSize > 1 && (
                                                            <span className="ml-3 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full ring-1 ring-amber-200">+{client.remainingSize - 1}</span>
                                                        )}
                                                    </span>
                                                    <div className="h-[1px] w-12 bg-neutral-100 group-hover:bg-neutral-200 transition-colors" />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </section>
                            );
                        })}

                    </div>
                </main>
            </div>
        </div>
    );
}
