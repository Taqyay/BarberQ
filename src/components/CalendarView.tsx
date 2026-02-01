import type { BarberId } from '../types';

const TIME_SLOTS: string[] = [];
for (let h = 9; h < 18; h++) {
    const hour = h.toString().padStart(2, '0');
    TIME_SLOTS.push(`${hour}:00`);
    TIME_SLOTS.push(`${hour}:20`);
    TIME_SLOTS.push(`${hour}:40`);
}
TIME_SLOTS.push('18:00');

const BARBERS: { id: BarberId; name: string }[] = [
    { id: 'Mo', name: 'Mo' },
    { id: 'Steve', name: 'Steve' },
    { id: 'Sarah', name: 'Sarah' },
];

const MOCK_APPOINTMENTS = [
    { id: 1, barberId: 'Mo', time: '09:00', client: 'James K.', type: 'Trim' },
    { id: 2, barberId: 'Mo', time: '11:00', client: 'Mike R.', type: 'Full Cut' },
    { id: 3, barberId: 'Steve', time: '10:00', client: 'Sarah L.', type: 'Color' },
    { id: 4, barberId: 'Steve', time: '14:00', client: 'Tom H.', type: 'Shave' },
    { id: 5, barberId: 'Sarah', time: '09:00', client: 'Emily W.', type: 'Style' },
    { id: 6, barberId: 'Sarah', time: '13:00', client: 'David P.', type: 'Cut & Wash' },
    { id: 7, barberId: 'Sarah', time: '16:00', client: 'Chris B.', type: 'Trim' },
];

export function CalendarView() {
    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#222', // Match Shop Card Background
            color: '#fff',
            borderRadius: '16px', // Match Shop Card Radius
            border: '1px solid #333',
            overflow: 'hidden', // CRITICAL: Clips content to rounded corners
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)' // Match Shop Elevation
        }}>
            <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: '60px 1fr 1fr 1fr',
                gridTemplateRows: '50px', // FIX: Explicitly set header row height
                gridAutoRows: '80px', // Slightly shorter for 20m slots
                paddingBottom: '2rem'
            }}>
                {/* Sticky Header Row */}
                <div style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    background: '#2a2a2a',
                    height: '50px', // Explicit height for header
                    borderBottom: '1px solid #444',
                    borderRight: '1px solid #444',
                    gridRow: '1', // Ensure it stays in first row visually if needed, though DOM order handles it
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}></div>

                {BARBERS.map((b, index) => (
                    <div key={b.id} style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        background: '#2a2a2a',
                        height: '50px',
                        padding: '1rem',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        borderRight: '1px solid #444',
                        borderBottom: '1px solid #444',
                        gridRow: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {b.name}
                    </div>
                ))}

                {/* Body Rows */}
                {TIME_SLOTS.map((time, timeIndex) => (
                    <>
                        {/* Time Label */}
                        <div key={time} style={{
                            padding: '0.5rem',
                            textAlign: 'right',
                            color: '#888',
                            fontSize: '0.8rem',
                            borderRight: '1px solid #444', // Visible border
                            borderBottom: '1px solid #444', // Visible border
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'flex-end',
                            background: '#222',
                            gridRow: timeIndex + 2 // Offset by 1 for header
                        }}>
                            {time}
                        </div>

                        {/* Barber Slots */}
                        {BARBERS.map(b => {
                            const apt = MOCK_APPOINTMENTS.find(a => a.barberId === b.id && a.time === time);
                            return (
                                <div key={`${b.id}-${time}`} style={{
                                    borderRight: '1px solid #444', // Visible border
                                    borderBottom: '1px solid #444', // Visible border
                                    padding: '0.2rem',
                                    position: 'relative',
                                    background: '#222',
                                    gridRow: timeIndex + 2
                                }}>
                                    {apt ? (
                                        <div style={{
                                            background: '#333',
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            borderLeft: '3px solid var(--color-gold)',
                                            height: '100%',
                                            fontSize: '0.8rem',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ fontWeight: 'bold', color: '#fff' }}>{apt.client}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#aaa' }}>{apt.type}</div>
                                        </div>
                                    ) : (
                                        <div style={{
                                            opacity: 0.05,
                                            color: '#fff',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.2rem'
                                        }}>
                                            +
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </>
                ))}
            </div>
        </div>
    );
}
