import { useQueue } from '../hooks/useQueue';
import { sortByEffectiveTime } from '../utils/clientSort';

export function ShopDisplay() {
    const { clients, barbers } = useQueue();

    return (
        <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-8 font-sans text-neutral-900">
            {/* TV FRAME: 16:9 Aspect Ratio Simulation */}
            <div className="w-full max-w-[1400px] aspect-video bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex">

                {/* LEFT BRAND PANEL: Minimalist & Informational */}
                <aside className="w-1/4 bg-[#FAFAFA] p-12 flex flex-col justify-between border-r border-neutral-200">
                    <div className="space-y-10">
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-amber-600 font-bold mb-2">Since 2026</p>
                            <h1 className="text-5xl font-serif text-neutral-900 leading-none tracking-tight">
                                GOLDEN<br />BARBERS
                            </h1>
                            <div className="w-16 h-1 bg-amber-500 mt-6" />
                        </div>

                        <div className="space-y-6">
                            <div className="w-48 h-48 bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-center">
                                {/* QR CODE PLACEHOLDER */}
                                <div className="w-full h-full bg-neutral-900 rounded-xl flex items-center justify-center">
                                    <span className="text-xs text-neutral-500 font-mono tracking-widest">QR CODE</span>
                                </div>
                            </div>
                            <p className="text-sm text-neutral-500 leading-relaxed max-w-[200px] font-medium">
                                Scan to join the queue or book your next appointment instantly.
                            </p>
                        </div>
                    </div>

                    {/* SNOOZE / HOLDING SECTION - If any snoozed clients */}
                    {clients.some(c => c.status === 'snoozed') && (
                        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Holding Area</span>
                            </div>
                            <div className="space-y-2">
                                {clients.filter(c => c.status === 'snoozed').map(c => (
                                    <p key={c.id} className="text-sm text-neutral-700 font-medium flex justify-between">
                                        {c.name}
                                        <span className="text-amber-600/60 font-mono text-xs">
                                            ({Math.max(0, 5 - Math.floor((Date.now() - (c.snoozeStartTime || 0)) / 60000))}m)
                                        </span>
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>

                {/* MAIN QUEUE: Three Column Grid */}
                <main className="w-3/4 p-12 bg-white">
                    <div className="grid grid-cols-3 gap-12 h-full">

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
                                .sort(sortByEffectiveTime);

                            return (
                                <section key={i} className={`flex flex-col h-full transition-opacity duration-500 ${isAvailable ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                                    {/* BARBER HEADER */}
                                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-neutral-100">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full bg-neutral-200 border-2 border-white shadow-md overflow-hidden flex items-center justify-center text-neutral-400 font-serif text-2xl">
                                                {barberName[0]}
                                            </div>
                                            {isAvailable && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">{barberName}</h2>
                                            <span className="text-xs uppercase tracking-widest text-neutral-400 font-bold">{isAvailable ? 'Available' : 'Unavailable'}</span>
                                        </div>
                                    </div>

                                    {/* NOW SERVING CARD */}
                                    <div className="bg-neutral-900 rounded-2xl p-6 text-center shadow-lg mb-8 relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
                                        <p className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-bold mb-2">Serving Now</p>
                                        <p className="text-3xl font-serif text-white truncate leading-tight">
                                            {inChair ? inChair.name : <span className="text-neutral-700 text-2xl font-sans font-light">Chair Open</span>}
                                        </p>
                                    </div>

                                    {/* UP NEXT LIST */}
                                    <div className="flex-1 overflow-hidden flex flex-col">
                                        <div className="flex items-center justify-between mb-6">
                                            <p className="text-xs uppercase tracking-widest text-neutral-400 font-bold">Up Next</p>
                                            <span className="bg-neutral-100 text-neutral-500 text-xs px-2 py-1 rounded-md font-bold">{waiting.length}</span>
                                        </div>

                                        <ul className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                                            {waiting.length === 0 && (
                                                <li className="flex flex-col items-center justify-center h-32 text-neutral-300 border-2 border-dashed border-neutral-100 rounded-xl">
                                                    <span className="text-sm font-medium">No clients waiting</span>
                                                </li>
                                            )}
                                            {waiting.map((client, idx) => (
                                                <li key={client.id} className="flex items-center justify-between bg-white px-1 py-1 group">
                                                    <div className="flex items-center gap-3 w-full">
                                                        <span className="text-neutral-300 font-bold font-mono text-sm w-4">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="text-lg text-neutral-700 font-medium truncate flex-1 group-hover:text-black transition-colors">
                                                            {client.name}
                                                            {client.barberPreference === 'next_available' && (
                                                                <span className="ml-2 text-[10px] text-neutral-400 font-normal uppercase border border-neutral-200 px-1 rounded align-middle">Any</span>
                                                            )}
                                                        </span>
                                                        {client.remainingSize && client.remainingSize > 1 && (
                                                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-bold">
                                                                +{client.remainingSize - 1}
                                                            </span>
                                                        )}
                                                    </div>
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
