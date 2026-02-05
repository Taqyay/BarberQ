import { useQueue } from '../hooks/useQueue';

export function ConnectionStatus({ showLabel = true }: { showLabel?: boolean }) {
    const { isConnected } = useQueue();

    if (isConnected) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
                <span className="dot" style={{
                    width: '8px',
                    height: '8px',
                    background: 'var(--color-success)',
                    borderRadius: '50%',
                    boxShadow: '0 0 10px var(--color-success)'
                }}></span>
                {showLabel && <span style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>Live</span>}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="dot" style={{
                width: '8px',
                height: '8px',
                background: 'var(--color-danger)',
                borderRadius: '50%',
                animation: 'pulse 1s infinite'
            }}></span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: 'bold' }}>Reconnecting...</span>
        </div>
    );
}
