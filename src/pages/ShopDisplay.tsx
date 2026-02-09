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
                        const match = c.status === 'waiting' && ((c.barberPreference === barberId) || (c.barberPreference === 'next_available'));
                        if (!match) return false;

                        if (c.reservationTime) {
                            const now = Date.now();
                            const visibleThreshold = c.reservationTime - (15 * 60 * 1000);
                            if (now < visibleThreshold) return false;
                        }

                        return true;
                    })
                    .sort(sortByEffectiveTime);

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
                                        <span slot="headline">No clients waiting</span>
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
                    </M3FilledCard>
                );
            })}

            {/* SIDEBAR: Next Available - M3 Filled Card */}
            <M3FilledCard>
                <div style={{ padding: '16px' }}>
                    <span className="md-typescale-title-large">Next Available</span>
                </div>

                <md-divider />

                <div style={{ padding: '16px' }}>
                    <span className="md-typescale-label-large">Walk-ins</span>
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
                    <span className="md-typescale-label-large">Book an Appointment</span>
                    <div style={{
                        marginTop: '16px',
                        aspectRatio: '1',
                        backgroundColor: 'var(--md-sys-color-on-surface, #1D1B20)',
                        borderRadius: '12px'
                    }}>
                        {/* QR Code placeholder */}
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
