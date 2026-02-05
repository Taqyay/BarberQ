import { useQueue } from '../hooks/useQueue';
import { queueManager } from '../services/queueManager';
import { ConnectionStatus } from '../components/ConnectionStatus';

interface Props {
    clientId: string;
    onClear: () => void;
}

export function CustomerTicket({ clientId, onClear }: Props) {
    const { clients: allClients } = useQueue();
    const client = allClients.find(c => c.id === clientId);

    // Calculate position
    const position = client
        ? allClients
            .filter(c =>
                c.status === 'waiting' &&
                c.barberPreference === client.barberPreference && // Only count people in MY line
                c.id !== clientId
            )
            .filter(c => c.checkInTime < client.checkInTime)
            .length + 1
        : 0;

    if (!client || client.status === 'finished' || client.status === 'cancelled') {
        return (
            <div className="container fade-in" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2 style={{ color: 'var(--color-gold)' }}>You are all set!</h2>
                <p style={{ margin: '1rem 0', color: '#fff' }}>
                    {client?.status === 'finished' ? "We hope you enjoyed your cut!" : "Your spot has been cleared."}
                </p>
                <button className="btn-secondary" onClick={onClear}>Start Over</button>
            </div>
        );
    }

    return (
        <div className="container fade-in" style={{ textAlign: 'center', paddingTop: '4rem' }}>
            <div style={{
                background: 'var(--color-bg-card)',
                padding: '2rem',
                borderRadius: '16px',
                border: '1px solid var(--color-gold)',
                boxShadow: '0 0 30px rgba(212, 175, 55, 0.1)'
            }}>
                <h3 style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9rem' }}>
                    Digital Ticket
                </h3>

                <div style={{ margin: '2rem 0' }}>
                    <h1 style={{ fontSize: '4rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                        #{position}
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>in line for {client.barberPreference}</p>
                </div>

                {client.status === 'in_chair' && (
                    <div style={{ background: 'var(--color-success)', color: '#000', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 'bold' }}>
                        YOU ARE UP! PLEASE SEAT.
                    </div>
                )}

                {client.status === 'snoozed' && (
                    <div style={{ background: '#2a2211', border: '1px solid var(--color-gold)', color: '#fff', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                        <h2 style={{ color: 'var(--color-gold)', fontSize: '1.2rem', margin: 0 }}>MISSED CALL</h2>
                        <p style={{ margin: '0.5rem 0' }}>We are holding your spot!</p>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-gold)', animation: 'pulse 1s infinite' }}>
                            ~{Math.max(0, 5 - Math.floor((Date.now() - (client.snoozeStartTime || 0)) / 60000))}m remaining
                        </div>
                        <p style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.5rem' }}>Please return to the shop immediately to be reactivated.</p>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                    <ConnectionStatus />
                </div>

                <button
                    onClick={() => {
                        queueManager.cancelClient(clientId);
                        onClear();
                    }}
                    style={{
                        background: 'transparent',
                        color: 'var(--color-danger)',
                        border: '1px solid var(--color-danger)',
                        padding: '1rem 2rem',
                        borderRadius: '99px',
                        opacity: 0.8
                    }}
                >
                    Cancel My Spot
                </button>
            </div>

            <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#555' }}>
                Please stay close. If you miss your call, you may lose your spot.
            </p>
        </div>
    );
}
