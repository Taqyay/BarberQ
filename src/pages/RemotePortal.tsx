import { useState, useEffect } from 'react';
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
    const [showUatControls, setShowUatControls] = useState(false);

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
        const remainder = 15 - (now.getMinutes() % 15);
        const minStartRaw = now.getTime() + (remainder * 60000);
        const earliestStart = minStartRaw + (5 * 60000); // 5 min buffer

        const isSelectedDateToday = selectedDate.toDateString() === today.toDateString();

        if (isSelectedDateToday) {
            const slots = [];
            for (let i = 0; i < 16; i++) {
                const slotTime = earliestStart + (i * 15 * 60000);
                const cutoff = new Date(today);
                cutoff.setHours(21, 0, 0, 0);

                if (slotTime > Date.now() && slotTime < cutoff.getTime()) {
                    slots.push(slotTime);
                }
            }
            return slots;
        } else {
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(9, 0, 0, 0);
            const slots = [];
            for (let i = 0; i < 16; i++) {
                slots.push(startOfDay.getTime() + (i * 15 * 60000));
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

    // --- BARE BONES / MOBILE BASELINE ---
    // Minimal styling, native HTML elements, standard flow.
    return (
        <div className="p-4" style={{ fontFamily: 'sans-serif' }}>
            {/* Header */}
            <div className="mb-4 text-center border-b pb-2">
                <h1 className="text-xl font-bold">Book Appointment</h1>
                <div className="flex justify-center mt-2">
                    <ConnectionStatus showLabel={true} />
                </div>
                {showUatControls && <p className="text-red-500 font-bold text-xs">UAT MODE ACTIVE</p>}
            </div>

            {/* Name Input */}
            <div className="mb-6">
                <label className="block mb-1 font-bold">Client Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter Full Name"
                    className="w-full p-2 border border-black"
                />
            </div>

            {/* Barber Selection */}
            <div className="mb-6">
                <label className="block mb-2 font-bold">Select Professional</label>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedBarber('next_available')}
                        className={`p-2 border border-black ${selectedBarber === 'next_available' ? 'bg-black text-white' : 'bg-white'}`}
                    >
                        Next Available
                    </button>
                    {barbers.filter(b => b.isAvailable).map(barber => (
                        <button
                            key={barber.id}
                            onClick={() => setSelectedBarber(barber.id)}
                            className={`p-2 border border-black ${selectedBarber === barber.id ? 'bg-black text-white' : 'bg-white'}`}
                        >
                            {barber.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Date Selection */}
            <div className="mb-6">
                <label className="block mb-2 font-bold">Date</label>
                <div className="flex overflow-x-auto gap-2 pb-2">
                    {dates.map((dateObj, idx) => {
                        const isSelected = selectedDate.toDateString() === dateObj.toDateString();
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(dateObj)}
                                className={`p-2 border border-black min-w-[80px] ${isSelected ? 'bg-black text-white' : 'bg-white'}`}
                            >
                                <div className="text-xs">{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                <div className="text-lg font-bold">{dateObj.getDate()}</div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time Slots */}
            <div className="mb-8">
                <label className="block mb-2 font-bold">Available Time</label>
                {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                        {availableSlots.map((slot, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedTime(slot)}
                                className={`p-2 border border-black text-sm ${selectedTime === slot ? 'bg-black text-white' : 'bg-white'}`}
                            >
                                {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="p-4 border border-dashed border-gray-400 text-center">No slots available</p>
                )}
            </div>

            {/* Submit Button */}
            <button
                onClick={handleConfirmBooking}
                disabled={!selectedTime || !name.trim()}
                className={`w-full p-4 font-bold text-lg uppercase border border-black ${selectedTime && name.trim() ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}
            >
                Confirm Booking
            </button>

            {/* Confirmation Modal */}
            {bookingConfirmed && (
                <div className="fixed inset-0 bg-white z-50 p-6 flex flex-col items-center justify-center">
                    <h2 className="text-2xl font-bold mb-4">Confirmed</h2>
                    <p className="mb-2">Ticket: <strong>#{bookingConfirmed.id.slice(-4)}</strong></p>
                    <p className="mb-4">Time: <strong>{new Date(bookingConfirmed.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></p>
                    <p className="mb-8">Est. Wait: {bookingConfirmed.waitTime} mins</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full p-4 border border-black bg-white font-bold"
                    >
                        Book Another
                    </button>
                </div>
            )}
        </div>
    );
}
