import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';
const socket = io(SOCKET_URL);

console.log('--- Sequential UAT Protocol Execution ---');

socket.on('connect', async () => {
    console.log('Connected to server.');

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    // 1. Reset State
    socket.emit('RESET');
    await delay(200);

    // 2. MVS Persistence Test
    console.log('\n[TEST] Session Persistence (MVS)...');
    socket.emit('UPDATE_SETTINGS', { mvsMinutes: 25 });
    await delay(200);

    // 3. Stealth Filter Simulation
    console.log('\n[TEST] Stealth Arrival Filter...');
    const now = Date.now();
    const remoteClient = {
        id: 'stealth1',
        name: 'Stealth_User',
        preference: 'Ibrahim',
        source: 'remote',
        reservationTime: now + (45 * 60 * 1000)
    };
    socket.emit('JOIN_REMOTE', remoteClient);
    await delay(200);

    // 4. "One-Tap" Race Condition Simulation
    console.log('\n[TEST] "One-Tap" Race Condition...');
    socket.emit('JOIN_QUEUE', { id: 'finish_me', name: 'Leaver', preference: 'Adam', source: 'walk-in' });
    await delay(500);

    console.log('Triggering DONE and JOIN simultaneously...');
    socket.emit('FINISH_CLIENT', 'finish_me');
    socket.emit('JOIN_QUEUE', { id: 'joiner', name: 'Joiner', preference: 'Adam', source: 'walk-in' });
    await delay(500);

    // 5. Final Verification
    socket.emit('GET_STATE');

    socket.on('SYNC_STATE', (state) => {
        const stealthUser = state.clients.find(c => c.id === 'stealth1');
        const leaver = state.clients.find(c => c.id === 'finish_me');
        const joiner = state.clients.find(c => c.id === 'joiner');
        const mvsVal = state.settings.mvsMinutes;

        const isStealthOk = stealthUser !== undefined;
        const isOneTapOk = leaver?.status === 'finished' && joiner !== undefined;
        const isPersistenceOk = mvsVal === 25;

        if (isStealthOk && isOneTapOk && isPersistenceOk) {
            console.log('\n[PASS] Stealth Filter Simulation');
            console.log('[PASS] "One-Tap" Race Condition');
            console.log('[PASS] Session Persistence (MVS)');
            console.log('\n--- UAT Protocol Complete: ALL PASS ---');
            setTimeout(() => process.exit(0), 100);
        } else {
            // If we get here and all conditions were met previously, we're good.
            // If not, we wait for next sync.
        }
    });
});

setTimeout(() => {
    console.error('UAT Timeout');
    process.exit(1);
}, 10000);
