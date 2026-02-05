import { useState } from 'react';
import { useQueue } from '../hooks/useQueue';
import { queueManager } from '../services/queueManager';
import { ConnectionStatus } from '../components/ConnectionStatus';
import type { BarberId } from '../types';

export function RemotePortal() {
    const { barbers, clients } = useQueue();

    // Form State
    const [name, setName] = useState('');
    const [selectedBarber, setSelectedBarber] = useState<BarberId>('next_available');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<number | null>(null);
    const [bookingConfirmed, setBookingConfirmed] = useState<{ id: string; time: number; waitTime: number } | null>(null);

    // Generate Dates (Next 14 Days)
    const dates = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

    // Time Slots Logic (Preserved)
    const generateSlots = () => {
        const today = new Date();
        const now = new Date();
        const remainder = 15 - (now.getMinutes() % 15);
        const minStartRaw = now.getTime() + (remainder * 60000);
        const earliestStart = minStartRaw + (5 * 60000); // 5 min buffer

        const isSelectedDateToday = selectedDate.toDateString() === today.toDateString();

        if (isSelectedDateToday) {
            const slots = [];
            for (let i = 0; i < 9; i++) {
                const slotTime = earliestStart + (i * 15 * 60000);
                if (slotTime > Date.now()) {
                    slots.push(slotTime);
                }
            }
            return slots;
        } else {
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(9, 0, 0, 0);
            const slots = [];
            for (let i = 0; i < 9; i++) {
                slots.push(startOfDay.getTime() + (i * 60 * 60000));
            }
            return slots;
        }
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

    // --- ShiftDash Mobile (v0.9.0) ---
    // Optimizations: h-dvh, Aspect Ratios for touch, Safe Area padding
    return (
        <div className="bg-shift-bg text-shift-text font-['Inter'] h-dvh flex flex-col overflow-hidden">

            <div className="w-full h-full sm:h-auto sm:max-w-[480px] sm:mx-auto sm:my-10 bg-white sm:shadow-sm sm:border sm:border-gray-200 sm:rounded-md flex flex-col">

                {/* Header - Compact */}
                <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white z-20">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.history.back()}
                            className="p-1.5 hover:bg-gray-50 rounded-md transition-colors -ml-1.5 text-shift-muted"
                        >
                            <span className="material-symbols-outlined text-xl">arrow_back</span>
                        </button>
                        <h1 className="text-sm font-bold tracking-tight text-shift-text uppercase">Book Appointment</h1>
                    </div>
                    <div className="transform scale-75 origin-right">
                        <ConnectionStatus showLabel={false} />
                    </div>
                </div>

                {/* Main Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 bg-white pb-24">

                    {/* Full Name */}
                    <div>
                        <label className="block text-xs font-bold text-shift-muted uppercase mb-1.5 pl-0.5">
                            Client Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter Name"
                            className="w-full h-11 bg-white border border-gray-200 rounded-[4px] px-3 text-sm font-medium focus:border-shift-primary focus:ring-1 focus:ring-shift-primary outline-none transition-all placeholder-gray-400"
                        />
                    </div>

                    {/* Barber Selection - Mobile Grid (Aspect Ratio Fix) */}
                    <div>
                        <label className="block text-xs font-bold text-shift-muted uppercase mb-2 pl-0.5">
                            Select Professional
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {/* ANY Button */}
                            <button
                                onClick={() => setSelectedBarber('next_available')}
                                className={`aspect-[4/3] flex flex-col items-center justify-center gap-1.5 rounded-[4px] border transition-all ${selectedBarber === 'next_available'
                                        ? 'bg-shift-primary text-white border-shift-primary'
                                        : 'bg-gray-50 text-shift-muted border-transparent active:bg-gray-100'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-2xl">event_available</span>
                                <span className="text-[10px] font-bold uppercase tracking-wide">Next Available</span>
                            </button>

                            {/* Barber List */}
                            {barbers.filter(b => b.isAvailable).map(barber => {
                                const isSelected = selectedBarber === barber.id;
                                return (
                                    <button
                                        key={barber.id}
                                        onClick={() => setSelectedBarber(barber.id)}
                                        className={`aspect-[4/3] flex flex-col items-center justify-center gap-0.5 rounded-[4px] border transition-all ${isSelected
                                                ? 'bg-shift-primary text-white border-shift-primary'
                                                : 'bg-gray-50 text-shift-muted border-transparent active:bg-gray-100'
                                            }`}
                                    >
                                        <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-shift-text'}`}>
                                            {barber.name.toUpperCase()}
                                        </div>
                                        <span className={`text-[9px] uppercase font-bold ${isSelected ? 'opacity-80' : 'opacity-50'}`}>
                                            Active
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Calendar - Horizontal Scroll */}
                    <div>
                        <div className="flex items-center justify-between mb-2 pl-0.5 pr-0.5">
                            <label className="text-xs font-bold text-shift-muted uppercase">DATE</label>
                            <span className="text-[10px] font-bold text-shift-primary bg-red-50 px-1.5 py-0.5 rounded-[2px]">
                                {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
                            {dates.map((dateObj, idx) => {
                                const isSelected = selectedDate.toDateString() === dateObj.toDateString();
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedDate(dateObj)}
                                        className={`flex-none w-14 h-16 flex flex-col items-center justify-center rounded-[4px] border transition-all ${isSelected
                                                ? 'bg-shift-secondary text-white border-shift-secondary shadow-sm'
                                                : 'bg-white border-gray-200 text-shift-muted active:border-shift-secondary/50'
                                            }`}
                                    >
                                        <span className="text-[9px] font-bold uppercase mb-0.5 opacity-80">
                                            {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                                        </span>
                                        <span className="text-lg font-bold leading-none">
                                            {dateObj.getDate()}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Time Slots - Touch Friendly Grid */}
                    <div>
                        <div className="flex items-center justify-between mb-2 pl-0.5 pr-0.5">
                            <label className="text-xs font-bold text-shift-muted uppercase">TIME</label>
                            <span className="text-[10px] font-bold text-gray-400">
                                {availableSlots.length} OPTIONS
                            </span>
                        </div>

                        {availableSlots.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {availableSlots.map((slot, i) => {
                                    const isSelected = selectedTime === slot;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedTime(slot)}
                                            className={`h-11 text-xs font-bold flex items-center justify-center rounded-[4px] border transition-all ${isSelected
                                                    ? 'bg-shift-primary text-white border-shift-primary'
                                                    : 'bg-white border-gray-200 text-shift-text active:border-gray-300'
                                                }`}
                                        >
                                            {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 border border-dashed border-gray-200 rounded-[4px] bg-gray-50/50">
                                <span className="material-symbols-outlined text-gray-300 mb-1 text-xl">schedule_off</span>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">No slots</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Confirm Footer - Fixed Safe Area */}
                <div className="flex-none p-4 pb-6 bg-white border-t border-gray-100 z-20">
                    <button
                        onClick={handleConfirmBooking}
                        disabled={!selectedTime || !name.trim()}
                        className={`w-full h-12 rounded-[4px] font-bold text-sm uppercase tracking-wide shadow-sm transition-all flex items-center justify-center gap-2 ${selectedTime && name.trim()
                                ? 'bg-shift-primary text-white active:bg-opacity-90'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        <span>Confirm</span>
                    </button>
                </div>

                {/* Confirmation Modal */}
                {bookingConfirmed && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm p-6 animate-in fade-in duration-200">
                        <div className="w-full max-w-xs bg-white border border-gray-200 shadow-xl rounded-[6px] p-5 text-center">
                            <div className="size-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600">
                                <span className="material-symbols-outlined text-2xl">check</span>
                            </div>

                            <h2 className="text-lg font-bold text-shift-text mb-1 uppercase tracking-tight">Confirmed</h2>
                            <p className="text-xs text-shift-muted mb-5 px-4 leading-relaxed">
                                You are scheduled for <strong>{new Date(bookingConfirmed.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                            </p>

                            <div className="bg-gray-50 border border-gray-100 rounded-[4px] p-3 mb-5">
                                <div className="flex justify-between mb-1.5">
                                    <span className="text-[10px] font-bold text-shift-muted uppercase">Ticket ID</span>
                                    <span className="font-mono text-sm font-bold text-shift-text">#{bookingConfirmed.id.slice(-4)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[10px] font-bold text-shift-muted uppercase">Est. Wait</span>
                                    <span className="text-xs font-bold text-shift-primary">~{bookingConfirmed.waitTime} min</span>
                                </div>
                            </div>

                            <button
                                onClick={() => window.location.reload()}
                                className="w-full h-9 border border-gray-200 rounded-[4px] text-xs font-bold text-shift-text active:bg-gray-50 transition-colors uppercase"
                            >
                                Book Another
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
