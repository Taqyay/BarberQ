import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';
const socket = io(SOCKET_URL);

console.log('--- Sovereign Logic Stress Test Starting ---');

socket.on('connect', async () => {
    console.log('Connected to server.');

    // 1. MVS Snapping Test
    console.log('\n[TEST] MVS "Tetris" Snapping...');

    // Set MVS to 15m
    socket.emit('UPDATE_SETTINGS', { mvsMinutes: 15 });

    const barberId = 'Ibrahim';
    const now = Date.now();
    const anchorTime = now + (30 * 60 * 1000); // 30m from now
    const requestedTime = anchorTime + (30 * 60 * 1000);

    // Add client 1 (Anchor)
    const client1 = { id: 'test1', name: 'Anchor', preference: barberId, source: 'remote', reservationTime: anchorTime };
    socket.emit('JOIN_REMOTE', client1);

    // Wait for client 1 to settle
    setTimeout(() => {
        // Attempt to book client 2 with a 10m gap (violates 15m MVS)
        const client2 = { id: 'test2', name: 'MVS_Violator', preference: barberId, source: 'remote', reservationTime: requestedTime };

        socket.emit('JOIN_REMOTE', client2);

        // Wait for state sync
        setTimeout(() => {
            socket.emit('GET_STATE'); // Request sync
        }, 1000);
    }, 1000);

    socket.on('SYNC_STATE', (state) => {
        const c2 = state.clients.find(c => c.id === 'test2');
        if (c2) {
            console.log(`Requested: ${new Date(requestedTime).toLocaleTimeString()}`);
            console.log(`Actual:    ${new Date(c2.reservationTime).toLocaleTimeString()}`);

            if (c2.reservationTime !== requestedTime) {
                console.log('SUCCESS: System SNAPPED the booking to bridge the gap.');
            } else {
                console.error('FAILURE: System did NOT snap the booking.');
            }

            // Cleanup
            socket.emit('RESET', { secret: 'dev-secret' });
            process.exit(0);
        }
    });
});

setTimeout(() => {
    console.error('Timeout waiting for SYNC_STATE');
    process.exit(1);
}, 5000);
