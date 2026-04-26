import { useState, useEffect } from 'react';
import { useQueue } from '../hooks/useQueue';
import { queueManager } from '../services/queueManager';
import { ConnectionStatus } from '../components/ConnectionStatus';
import type { BarberId } from '../types';

export function RemotePortal_Mobile() {
    const { barbers, clients, settings } = useQueue();

    // Form State
    const [name, setName] = useState('');
    const [selectedBarber, setSelectedBarber] = useState<BarberId>('next_available');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<number | null>(null);
    const [bookingConfirmed, setBookingConfirmed] = useState<{ id: string; time: number; waitTime: number } | null>(null);
    const [showUatControls, setShowUatControls] = useState(false);
    const [isMonthView, setIsMonthView] = useState(false);

    // UAT Time Warp Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'U') {
                setShowUatControls(prev => !prev);
                console.log("UAT Time Warp Toggled");
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Generate Dates (Next 14 Days)
    const dates = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

    // Time Slots Logic
    const generateSlots = () => {
        const today = new Date();
        const now = new Date();

        // Settings Defaults
        const startHour = settings?.firstCutTime ?? 9;
        const endHour = settings?.lastCutTime ?? 18;
        const bufferMinutes = settings?.remoteBufferMinutes ?? 30; // Use settings buffer

        // Smart Availability Formula: Now + (ActiveQueue * AvgCutTime / ActiveBarbers) + Buffer
        const waitingCount = clients.filter(c => c.status === 'waiting' || c.status === 'in_chair').length;
        const activeBarbers = barbers.filter(b => b.isAvailable).length || 1;
        const avgCutTime = 20;
        const queueDelayMinutes = Math.ceil((waitingCount * avgCutTime) / activeBarbers);
        const totalDelay = queueDelayMinutes + bufferMinutes;

        const mvsMinutes = settings?.mvsMinutes ?? 15;
        const remainder = mvsMinutes - (now.getMinutes() % mvsMinutes);
        const minStartRaw = now.getTime() + (remainder * 60000);
        const earliestStart = minStartRaw + (totalDelay * 60000);

        const isSelectedDateToday = selectedDate.toDateString() === today.toDateString();

        const slots = [];

        if (isSelectedDateToday) {
            const cutoff = new Date(today);
            cutoff.setHours(endHour, 0, 0, 0);

            let slotTime = earliestStart;
            // Ensure we don't start before opening time if it's early morning
            const openingTime = new Date(today);
            openingTime.setHours(startHour, 0, 0, 0);
            if (slotTime < openingTime.getTime()) {
                slotTime = openingTime.getTime();
            }

            while (slotTime < cutoff.getTime()) {
                slots.push(slotTime);
                slotTime += (mvsMinutes * 60 * 1000);
            }
        } else {
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(startHour, 0, 0, 0);
            const cutoff = new Date(selectedDate);
            cutoff.setHours(endHour, 0, 0, 0);

            let slotTime = startOfDay.getTime();
            while (slotTime < cutoff.getTime()) {
                slots.push(slotTime);
                slotTime += (mvsMinutes * 60 * 1000);
            }
        }
        return slots;
    };

    const availableSlots = generateSlots();

    const handleConfirmBooking = async () => {
        if (!name.trim() || !selectedTime) return;

        // Calculate estimated wait
        const waitingCount = clients.filter(c => c.status === 'waiting').length;
        const activeBarbers = barbers.filter(b => b.isAvailable).length || 1;
        const estWaitMins = Math.max(15, Math.ceil((waitingCount * 15) / activeBarbers));

        try {
            const { id } = queueManager.joinRemote(name, selectedBarber, 1, '30+', selectedTime);
            setBookingConfirmed({
                id: id,
                time: selectedTime,
                waitTime: estWaitMins
            });
        } catch (error) {
            console.error("Booking failed:", error);
            alert("Failed to book appointment. Please try again.");
        }
    };

    // --- 3-COLUMN SAFE-ZONE GRID (Lead Mobile Systems Architect) ---
    // The "No-Escape" Shell: grid grid-cols-[16px_1fr_16px]
    // Content Trap: All content in col-start-2
    return (
        <div className="fixed inset-0 bg-[#FEF7FF] grid grid-cols-[16px_1fr_16px] overflow-hidden font-sans text-[#1D1B20]">

            {/* Header: Placed in Middle Column */}
            <div className="col-start-2 flex-none h-14 flex items-center bg-[#FEF7FF] border-b border-[#E2E2EC]/50 z-10 w-full relative">
                <button
                    onClick={() => window.history.back()}
                    className="mr-3 -ml-2 p-2 text-[#1D1B20]"
                >
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </button>
                <h1 className="text-lg font-medium tracking-tight flex-1 truncate">Book Appointment</h1>
                <div className="transform scale-90 origin-right">
                    <ConnectionStatus showLabel={false} />
                </div>
            </div>

            {/* Scrollable Content: Trapped in Middle Column */}
            <div className="col-start-2 flex-1 overflow-y-auto pt-4 pb-32 no-scrollbar scroll-smooth">

                <div className="flex flex-col gap-y-6">

                    {/* UAT Indicator */}
                    {showUatControls && (
                        <div className="p-3 bg-red-100 text-red-700 text-xs font-bold text-center rounded-lg">
                            UAT MODE ACTIVE: Time Warp Enabled
                        </div>
                    )}

                    {/* Client Name Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#49454F] block ml-1">Client Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your name"
                            className="w-full h-14 px-4 rounded-xl border border-[#79747E] bg-white text-base outline-none focus:border-[#1D58B1] focus:ring-2 focus:ring-[#1D58B1]/20 placeholder-[#CAC4D0] transition-colors"
                        />
                    </div>

                    {/* Barber Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#49454F] block ml-1">Professional</label>
                        <div className="grid grid-cols-4 gap-2">
                            <button
                                onClick={() => setSelectedBarber('next_available')}
                                className={`flex flex-col items-center justify-center h-[90px] rounded-xl border transition-all ${selectedBarber === 'next_available'
                                    ? 'bg-[#1D58B1] border-[#1D58B1] text-white shadow-md'
                                    : 'bg-white border-[#CAC4D0] text-[#49454F]'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-3xl mb-1">chair</span>
                                <span className="text-xs font-medium">Any</span>
                            </button>

                            {barbers.filter(b => b.isAvailable).map(barber => (
                                <button
                                    key={barber.id}
                                    onClick={() => setSelectedBarber(barber.id)}
                                    className={`flex flex-col items-center justify-center h-[90px] rounded-xl border transition-all overflow-hidden ${selectedBarber === barber.id
                                        ? 'bg-[#1D58B1] border-[#1D58B1] text-white shadow-md'
                                        : 'bg-white border-[#CAC4D0] text-[#49454F]'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${selectedBarber === barber.id
                                        ? 'bg-white/20 text-white'
                                        : 'bg-[#E8DEF8] text-[#1D192B]'
                                        }`}>
                                        {barber.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-xs font-medium truncate w-full px-1 text-center">{barber.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Selection */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-sm font-medium text-[#49454F] block">Date</label>
                            <button
                                onClick={() => setIsMonthView(!isMonthView)}
                                className="text-[#1D58B1] text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full hover:bg-[#DCE2F9]/50 transition-colors"
                            >
                                {isMonthView ? 'Close Calendar' : 'View Calendar'}
                            </button>
                        </div>

                        {!isMonthView ? (
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1 -mx-1">
                                {dates.map((dateObj, idx) => {
                                    const isSelected = selectedDate.toDateString() === dateObj.toDateString();
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedDate(dateObj)}
                                            className={`flex-none w-[60px] h-[76px] rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${isSelected
                                                ? 'bg-[#1D58B1] text-white border-[#1D58B1] shadow-md'
                                                : 'bg-white border-[#CAC4D0] text-[#1D1B20]'
                                                }`}
                                        >
                                            <span className="text-[10px] uppercase font-bold tracking-wide">{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                            <span className="text-xl font-bold">{dateObj.getDate()}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-[#E2E2EC] p-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                <div className="text-center font-bold text-[#1D1B20] mb-4 capitalize text-lg">
                                    {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                        <div key={i} className="text-xs font-bold text-[#49454F]">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-2">
                                    {/* Seamless Grid Generation */}
                                    {(() => {
                                        const year = selectedDate.getFullYear();
                                        const month = selectedDate.getMonth();
                                        const firstDay = new Date(year, month, 1).getDay();
                                        const daysInMonth = new Date(year, month + 1, 0).getDate();

                                        const days = [];
                                        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
                                        for (let d = 1; d <= daysInMonth; d++) {
                                            const currentDate = new Date(year, month, d);
                                            const isSelected = selectedDate.toDateString() === currentDate.toDateString();
                                            const isPast = currentDate < new Date(new Date().setHours(0, 0, 0, 0));

                                            days.push(
                                                <button
                                                    key={d}
                                                    disabled={isPast}
                                                    onClick={() => {
                                                        setSelectedDate(currentDate);
                                                    }}
                                                    className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${isSelected
                                                        ? 'bg-[#1D58B1] text-white shadow-md z-10'
                                                        : isPast
                                                            ? 'text-gray-300 cursor-not-allowed'
                                                            : 'text-[#1D1B20] hover:bg-[#F2F0F4]'
                                                        }`}
                                                >
                                                    {d}
                                                </button>
                                            );
                                        }
                                        return days;
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Time Grid - EXACT SPECS: grid-cols-4 gap-2, h-[40px] */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#49454F] block ml-1">Available Time</label>
                        {availableSlots.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2">
                                {availableSlots.map((slot, i) => {
                                    const isSelected = selectedTime === slot;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedTime(slot)}
                                            // Chip Style: h-[40px], rounded-lg, #DCE2F9 container
                                            className={`h-[40px] rounded-lg text-sm font-medium flex items-center justify-center transition-all ${isSelected
                                                ? 'bg-[#1D58B1] text-white shadow-sm'
                                                : 'bg-[#DCE2F9] text-[#151B2C] hover:bg-[#DCE2F9]/80'
                                                }`}
                                        >
                                            {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-20 flex items-center justify-center border border-dashed border-[#CAC4D0] rounded-xl text-[#49454F] text-sm bg-gray-50">
                                No slots available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Action Button (FAB) Fix */}
            {/* Fixed bottom-6, left-4, right-4. Height 56px. */}
            <div className="fixed bottom-6 left-4 right-4 z-30">
                <button
                    onClick={handleConfirmBooking}
                    disabled={!selectedTime || !name.trim()}
                    className={`w-full h-[56px] rounded-xl flex items-center justify-center text-base font-medium tracking-wide shadow-xl transition-all ${selectedTime && name.trim()
                        ? 'bg-[#1D58B1] text-white active:scale-[0.98]'
                        : 'bg-[#1C1B1F]/12 text-[#1C1B1F]/38 cursor-not-allowed'
                        }`}
                >
                    Confirm Booking
                </button>
            </div>

            {/* Confirmation Modal */}
            {bookingConfirmed && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#FEF7FF] rounded-[28px] p-6 w-full max-w-[300px] shadow-2xl flex flex-col items-center text-center border border-white/50">
                        <div className="w-16 h-16 bg-[#E8DEF8] rounded-full flex items-center justify-center mb-4 text-[#1D58B1]">
                            <span className="material-symbols-outlined text-3xl">check</span>
                        </div>
                        <h3 className="text-xl font-bold text-[#1D1B20] mb-2">Confirmed!</h3>
                        <p className="text-[#49454F] text-sm mb-6">
                            Ticket <strong>#{bookingConfirmed.id.slice(-4)}</strong><br />
                            at <strong>{new Date(bookingConfirmed.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-[#1D58B1] font-bold text-sm py-3 px-8 rounded-full hover:bg-[#1D58B1]/10 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
