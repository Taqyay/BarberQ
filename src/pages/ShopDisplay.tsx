import { useQueue } from '../hooks/useQueue';
import type { BarberId } from '../types';

const BARBERS: { id: BarberId; name: string }[] = [
    { id: 'Mo', name: 'Mo' },
    { id: 'Steve', name: 'Steve' },
    { id: 'Sarah', name: 'Sarah' },
];

export function ShopDisplay() {
    const { clients, barbers } = useQueue();

    // Pool Logic
    const nextAvailableClients = clients
        .filter(c => c.status === 'waiting' && c.barberPreference === 'next_available')
        .sort((a, b) => a.checkInTime - b.checkInTime);

    return (
        <div className="fade-in" style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 22%) 1fr', // 22% fixed width for sidebar, rest for barbers
            height: '100vh',
            width: '100vw',
            background: '#111',
            color: '#fff',
            overflow: 'hidden',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Left: Next Available Pool */}
            <div style={{
                background: '#1a1a1a',
                borderRight: '1px solid #333',
                padding: '2vh 2%',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                containerType: 'inline-size'
            }}>
                <h2 style={{
                    fontSize: 'clamp(1.5rem, 12cqw, 3rem)',
                    marginBottom: '1vh',
                    color: '#ccc',
                    lineHeight: 1.1,
                    // REMOVED whiteSpace: nowrap to allow wrapping ("The Stack")
                    wordBreak: 'break-word'
                }}>
                    Next Available
                </h2>
                <div style={{ fontSize: 'clamp(0.8rem, 5cqw, 1.2rem)', color: '#666', marginBottom: '2vh' }}>
                    {nextAvailableClients.length} waiting
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1vh', overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                    {nextAvailableClients.length === 0 && (
                        <div style={{ opacity: 0.3, fontStyle: 'italic', fontSize: '1.2rem' }}>Empty</div>
                    )}
                    {nextAvailableClients.map(client => (
                        <div key={client.id} style={{
                            fontSize: 'clamp(1.5rem, 10cqw, 3rem)',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            padding: '0.2rem 0'
                        }}>
                            {client.name}
                        </div>
                    ))}
                </div>

                {/* Holding / Snoozed Section */}
                {clients.some(c => c.status === 'snoozed') && (
                    <div style={{ marginTop: '2vh', borderTop: '1px solid #333', paddingTop: '1vh' }}>
                        <h3 style={{ color: 'var(--color-gold)', fontSize: 'clamp(1rem, 6cqw, 1.5rem)', marginBottom: '1vh' }}>MISSED CALL</h3>
                        {clients.filter(c => c.status === 'snoozed').map(c => (
                            <div key={c.id} style={{
                                fontSize: 'clamp(1rem, 8cqw, 2rem)',
                                color: '#aaa',
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                <span>{c.name}</span>
                                <span style={{ color: 'var(--color-gold)' }}>
                                    {Math.max(0, 5 - Math.floor((Date.now() - (c.snoozeStartTime || 0)) / 60000))}m
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right: Barber Columns */}
            <div style={{
                padding: '2vh 2%',
                display: 'flex',
                gap: '2%',
                height: '100%',
                overflow: 'hidden'
            }}>
                {BARBERS.map(barberDef => {
                    const status = barbers.find(b => b.id === barberDef.id);
                    const isAvailable = status?.isAvailable ?? true;

                    const waiting = clients.filter(c =>
                        c.status === 'waiting' && c.barberPreference === barberDef.id
                    ).sort((a, b) => a.checkInTime - b.checkInTime);

                    const inChair = clients.find(c =>
                        c.status === 'in_chair' && c.assignedBarber === barberDef.id
                    );

                    return (
                        <div key={barberDef.id} style={{
                            flex: 1,
                            background: '#222',
                            borderRadius: '16px',
                            padding: '2vh 4%',
                            opacity: isAvailable ? 1 : 0.4,
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: 0,
                            height: '100%',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                            containerType: 'inline-size'
                        }}>
                            {/* Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '2vh',
                                borderBottom: '1px solid #444',
                                paddingBottom: '1vh'
                            }}>
                                <h2 style={{
                                    fontSize: 'clamp(2rem, 13cqw, 4rem)', // Increased min size
                                    fontWeight: 'bold',
                                    // Allowed wrapping to keep text large
                                    wordBreak: 'break-word',
                                    lineHeight: 1.1,
                                    marginRight: '0.5rem',
                                    minWidth: 0
                                }}>
                                    {barberDef.name}
                                </h2>
                                {!isAvailable && (
                                    <span style={{
                                        background: '#444',
                                        padding: '0.5vh 1cqw',
                                        borderRadius: '8px',
                                        fontSize: 'clamp(0.6rem, 3cqw, 1rem)',
                                        whiteSpace: 'nowrap'
                                    }}>OFF</span>
                                )}
                            </div>

                            {/* In Chair Section */}
                            <div style={{ marginBottom: '3vh', flexShrink: 0, minWidth: 0 }}>
                                <h4 style={{
                                    color: 'var(--color-gold)',
                                    marginBottom: '1vh',
                                    textTransform: 'uppercase',
                                    letterSpacing: '2px',
                                    fontSize: 'clamp(0.6rem, 4cqw, 1rem)',
                                    whiteSpace: 'nowrap'
                                }}>In Chair</h4>
                                {inChair ? (
                                    <div style={{
                                        // RELAXED MINIMUM: 1rem instead of 2rem to allow shrinking
                                        fontSize: 'clamp(1rem, 11cqw, 3.5rem)',
                                        fontWeight: 'bold',
                                        animation: 'pulse 2s infinite',
                                        color: '#fff',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {inChair.name}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 'clamp(1rem, 8cqw, 2.5rem)', opacity: 0.3 }}>Open</div>
                                )}
                            </div>

                            {/* Waiting List */}
                            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1vh', color: '#888', fontSize: 'clamp(0.6rem, 4cqw, 1rem)' }}>
                                    <span>WAITING</span>
                                    <span>({waiting.length})</span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1vh',
                                    overflowY: 'auto',
                                    paddingRight: '4px'
                                }}>
                                    {waiting.length === 0 && <div style={{ opacity: 0.3, fontSize: 'clamp(0.8rem, 5cqw, 1.2rem)' }}>No requests</div>}
                                    {waiting.map(c => (
                                        <div key={c.id} style={{
                                            // RELAXED MINIMUM: 1rem instead of 1.2rem
                                            fontSize: 'clamp(1rem, 9cqw, 2.5rem)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            padding: '0.2rem 0',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            {c.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
