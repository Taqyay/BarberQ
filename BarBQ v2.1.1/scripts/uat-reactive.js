import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';
const socket = io(SOCKET_URL);

console.log('--- Reactive State-Sync UAT Starting ---');

socket.on('connect', async () => {
    console.log('Connected to server.');

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    // 1. Reset State
    socket.emit('RESET', { secret: 'dev-secret' });
    await delay(200);

    // 2. Test MVS Reactivity
    console.log('\n[TEST] Hot MVS Update (15m -> 30m)...');
    socket.emit('UPDATE_SETTINGS', { mvsMinutes: 30 });
    await delay(300);

    // We expect the next SYNC_STATE to have 30m
    socket.emit('GET_STATE');
    socket.once('SYNC_STATE', (state) => {
        if (state.settings.mvsMinutes === 30) {
            console.log('[PASS] Server-side MVS Update persistent.');
        } else {
            console.error('[FAIL] MVS Update not reflected in state.');
            process.exit(1);
        }
    });
    await delay(200);

    // 3. Test Time Boundaries (Re-render Simulation)
    console.log('\n[TEST] Hot Opening Time Update (9 -> 11)...');
    socket.emit('UPDATE_SETTINGS', { firstCutTime: 11 });
    await delay(300);

    socket.emit('GET_STATE');
    socket.once('SYNC_STATE', (state) => {
        if (state.settings.firstCutTime === 11) {
            console.log('[PASS] Opening Time Update persistent.');
        } else {
            console.error('[FAIL] Opening Time Update not reflected.');
            process.exit(1);
        }
    });
    await delay(200);

    // 4. Verification complete
    console.log('\n--- UAT Complete: Reactive Sync Verified ---');
    process.exit(0);
});

setTimeout(() => {
    console.error('UAT Timeout');
    process.exit(1);
}, 10000);
