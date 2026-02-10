import { useQueue } from '../hooks/useQueue';
import { sortByEffectiveTime } from '../utils/clientSort';
import { simulationService } from '../services/simulation';

// M3 Filled Card - Surface Container Highest with no elevation
const M3FilledCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
        backgroundColor: 'var(--md-sys-color-surface-container-highest, #E6E0E9)',
        borderRadius: '12px',
        overflow: 'hidden'
    }}>
        {children}
    </div>
);

// M3 Elevated Card - Surface Container Low with Level 1 elevation
const M3ElevatedCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
        backgroundColor: 'var(--md-sys-color-surface-container-low, #F7F2FA)',
        borderRadius: '12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)',
        overflow: 'hidden'
    }}>
        {children}
    </div>
);

export function ShopDisplay() {
    const { clients, barbers } = useQueue();

    const handleUATTrigger = () => {
        console.log('🚀 UAT Time Warp Initiated from ShopDisplay');
        simulationService.start();
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            padding: '16px',
            minHeight: '100vh',
            backgroundColor: 'var(--md-sys-color-surface, #FEF7FF)'
        }}>
            {/* BARBER COLUMNS - Each in M3 Filled Card */}
            {barbers.map((barber) => {
                const barberId = barber.id;
                const barberName = barber.name;
                const isAvailable = barber.isAvailable;

                const inChair = clients.find(c => c.status === 'in_chair' && c.assignedBarber === barberId);

                const waiting = clients
                    .filter(c => {
                        // Only show clients who specifically requested this barber
                        const match = c.status === 'waiting' && c.barberPreference === barberId;
                        if (!match) return false;

                        if (c.reservationTime) {
                            const now = Date.now();
                            const visibleThreshold = c.reservationTime - (15 * 60 * 1000);
                            if (now < visibleThreshold) return false;
                        }

                        return true;
                    })
                    .sort(sortByEffectiveTime);

                const snoozed = clients.filter(c => c.status === 'snoozed' && (c.assignedBarber === barberId || (!c.assignedBarber && c.barberPreference === barberId)));

                return (
                    <M3FilledCard key={barberId}>
                        {/* BarberHeader - Dark grey with Archivo font */}
                        <div style={{ position: 'relative' }}>
                            {/* Header */}
                            <div style={{
                                height: '200px',
                                padding: '16px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                backgroundColor: '#3C3C3C'
                            }}>
                                <span style={{ fontFamily: 'Archivo, sans-serif', fontSize: '22px', fontWeight: 600, color: '#FFFFFF' }}>
                                    {barberName}
                                </span>
                                {/* Status Chip: Filled purple for Active, transparent otherwise */}
                                <span style={{
                                    padding: '6px 16px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    backgroundColor: isAvailable ? '#6750A4' : 'transparent',
                                    color: isAvailable ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                                    border: isAvailable ? 'none' : '1px solid rgba(255,255,255,0.3)'
                                }}>
                                    {isAvailable ? 'Active' : 'Away'}
                                </span>
                            </div>

                            {/* In-Chair Card - 65% above, 35% below header bottom */}
                            <div style={{
                                position: 'absolute',
                                bottom: '-61px', // 35% of 175px = 61px below header edge
                                left: '16px',
                                right: '16px',
                                height: '175px',
                                backgroundColor: 'var(--md-sys-color-surface-container-low, #F7F2FA)',
                                borderRadius: '12px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)', // Level 2
                                zIndex: 10,
                                padding: '16px'
                            }}>
                                {/* Progress indicator - top right */}
                                <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                                    <md-circular-progress value={0.5} />
                                </div>
                                {inChair ? (
                                    <div style={{ color: '#000000', fontWeight: 700, fontSize: '16px' }}>
                                        In-Chair: {inChair.name}
                                    </div>
                                ) : (
                                    <div style={{ color: '#000000', fontWeight: 700, fontSize: '16px' }}>Ready for Next!</div>
                                )}
                            </div>
                        </div>

                        {/* Spacer for overlapping card */}
                        <div style={{ height: '77px' }} /> {/* 61px overlap + 16px gap */}

                        <md-divider />

                        {/* Waiting Clients Section */}
                        <div style={{ padding: '16px' }}>
                            <span style={{ marginBottom: '12px', display: 'block', color: '#000000', fontWeight: 600, fontSize: '14px' }}>
                                Waiting Clients:
                            </span>
                            {waiting.length === 0 ? (
                                <md-list>
                                    <md-list-item>
                                        <span slot="headline">No specific requests</span>
                                    </md-list-item>
                                </md-list>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {waiting.map((client) => (
                                        <M3ElevatedCard key={client.id}>
                                            <md-list>
                                                <md-list-item>
                                                    <span slot="headline">{client.name}</span>
                                                    {client.source === 'remote' && (
                                                        <md-assist-chip slot="end" label="Remote" />
                                                    )}
                                                </md-list-item>
                                            </md-list>
                                        </M3ElevatedCard>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Snoozed Clients Section */}
                        {snoozed.length > 0 && (
                            <div style={{ padding: '0 16px 16px 16px' }}>
                                <div style={{
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    paddingTop: '12px',
                                    marginBottom: '8px'
                                }}>
                                    <span style={{
                                        color: '#d4af37',
                                        fontWeight: 700,
                                        fontSize: '12px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <md-icon style={{ fontSize: '14px' }}>snooze</md-icon> HOLDING
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {snoozed.map((client) => (
                                        <div key={client.id} style={{
                                            backgroundColor: '#2a2d36',
                                            borderRadius: '8px',
                                            padding: '12px',
                                            borderLeft: '3px solid #d4af37',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span style={{ color: '#E6E0E9', fontWeight: 600, fontSize: '14px' }}>{client.name}</span>
                                            <span style={{ color: '#9CA3AF', fontSize: '12px' }}>
                                                ~{Math.max(0, 5 - Math.floor((Date.now() - (client.snoozeStartTime || 0)) / 60000))}m
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </M3FilledCard>
                );
            })}

            {/* SIDEBAR: Next Available - M3 Filled Card */}
            <M3FilledCard>
                <div style={{ padding: '16px' }}>
                    <span className="md-typescale-title-large" style={{ color: '#000000' }}>Next Available</span>
                </div>

                <md-divider />

                {/* Next Available Queue */}
                <div style={{ padding: '16px' }}>
                    <span className="md-typescale-label-large" style={{ color: '#000000' }}>Queue Line</span>
                    {clients.filter(c => c.status === 'waiting' && c.barberPreference === 'next_available').length === 0 ? (
                        <div style={{ padding: '16px 0', color: 'var(--md-sys-color-on-surface-variant)' }}>
                            No one waiting
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                            {clients
                                .filter(c => c.status === 'waiting' && c.barberPreference === 'next_available')
                                .sort(sortByEffectiveTime)
                                .map((client) => (
                                    <M3ElevatedCard key={client.id}>
                                        <md-list>
                                            <md-list-item>
                                                <span slot="headline">{client.name}</span>
                                                {client.source === 'remote' && (
                                                    <md-assist-chip slot="end" label="Remote" />
                                                )}
                                            </md-list-item>
                                        </md-list>
                                    </M3ElevatedCard>
                                ))}
                        </div>
                    )}
                </div>

                {/* Snoozed Next Available Clients */}
                {clients.some(c => c.status === 'snoozed' && c.barberPreference === 'next_available') && (
                    <div style={{ padding: '0 16px 16px 16px' }}>
                        <div style={{
                            borderTop: '1px solid rgba(0,0,0,0.1)',
                            paddingTop: '12px',
                            marginBottom: '8px'
                        }}>
                            <span style={{
                                color: '#B45309', // Darker gold for light bg? Actually sidebar is NextAvailable which is light... wait M3FilledCard is Surface Container Highest (#E6E0E9). Gold #d4af37 might be low contrast. Let's use a darker bronze/gold.
                                fontWeight: 700,
                                fontSize: '12px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <md-icon style={{ fontSize: '14px' }}>snooze</md-icon> HOLDING
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {clients
                                .filter(c => c.status === 'snoozed' && c.barberPreference === 'next_available')
                                .map((client) => (
                                    <div key={client.id} style={{
                                        backgroundColor: 'rgba(0,0,0,0.05)',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        borderLeft: '3px solid #B45309',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ color: '#1D1B20', fontWeight: 600, fontSize: '14px' }}>{client.name}</span>
                                        <span style={{ color: '#49454F', fontSize: '12px' }}>
                                            ~{Math.max(0, 5 - Math.floor((Date.now() - (client.snoozeStartTime || 0)) / 60000))}m
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                <md-divider />

                <div style={{ padding: '16px' }}>
                    <span className="md-typescale-label-large" style={{ color: '#000000' }}>Est. Wait Time</span>
                    <md-list>
                        {barbers.map((barber, index) => (
                            <md-list-item key={barber.id}>
                                <span slot="headline">{barber.name}</span>
                                <span slot="trailing-supporting-text">{(index + 1) * 15} min</span>
                            </md-list-item>
                        ))}
                    </md-list>
                </div>

                <md-divider />

                <div style={{ padding: '16px' }}>
                    <span className="md-typescale-label-large" style={{ color: '#000000' }}>Book an Appointment</span>
                    <div style={{
                        marginTop: '16px',
                        aspectRatio: '1',
                        backgroundColor: 'var(--md-sys-color-on-surface, #1D1B20)',
                        borderRadius: '12px'
                    }}>
                        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                                <rect width="100" height="100" fill="white" />
                                <path d="M10,10 h30 v30 h-30 z M20,20 h10 v10 h-10 z M60,10 h30 v30 h-30 z M70,20 h10 v10 h-10 z M10,60 h30 v30 h-30 z M20,70 h10 v10 h-10 z" fill="black" />
                                <rect x="45" y="10" width="10" height="10" fill="black" />
                                <rect x="50" y="25" width="10" height="10" fill="black" />
                                <rect x="10" y="45" width="10" height="10" fill="black" />
                                <rect x="30" y="45" width="10" height="10" fill="black" />
                                <rect x="60" y="45" width="10" height="10" fill="black" />
                                <rect x="80" y="45" width="10" height="10" fill="black" />
                                <rect x="45" y="60" width="10" height="10" fill="black" />
                                <rect x="60" y="60" width="10" height="10" fill="black" />
                                <rect x="75" y="75" width="10" height="10" fill="black" />
                                <rect x="45" y="80" width="10" height="10" fill="black" />
                                <rect x="60" y="85" width="10" height="10" fill="black" />
                            </svg>
                        </div>
                    </div>
                </div>
            </M3FilledCard>

            {/* M3 FAB for UAT */}
            <md-fab
                label="TIME WARP"
                onClick={handleUATTrigger}
                style={{ position: 'fixed', bottom: '16px', right: '16px' } as React.CSSProperties}
            />
        </div>
    );
}
