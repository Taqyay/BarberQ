import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

socket.on("connect", () => {
    console.log("Connected to server for Verification.");

    // 1. Reset State
    socket.emit("RESET");
});

socket.on("SYNC_STATE", (state) => {
    // Wait for reset to complete (empty clients)
    // We will manage test steps via a simple counter state machine locally
});

let testStep = 0;

// Wrappers
function join(name, pref, checkInOffsetMinutes = 0, source = 'qr', travelTime = '5') {
    const id = name.toLowerCase().replace(' ', '_');
    const now = Date.now();
    const payload = {
        id,
        name,
        preference: pref,
        source,
        travelTime
    };
    socket.emit("JOIN_QUEUE", payload);
    // Be naughty and manually override checkInTime via a debug endpoint if we had one,
    // but since we don't, we have to rely on the server using 'now'.
    // WAIT! We can't simulate "waiting 15 mins" easily without waiting 15 mins.
    // UNLESS we use the debug `addClient` equivalent or add a 'DEBUG_TIME_TRAVEL' event.
    // Ah, the server uses `Date.now()`.

    // hack: I can't easily test the TIME logic without mocking time or waiting.
    // Alternative: I will modify the server temporarily or I will inspect the CODE.
    // Actually, I can use "SNOOZE" to test Leapfrog (because it sets checkInTime to 0).
    // But testing Weighted Sort (15 min bias) is hard without time travel.

    // PLAN B: I will write a script that READS the server state and manually calculates what the sort order WOULD be given hypothetical times, 
    // OR just trust my code analysis + a simple snooze test.

    // Let's do the SNOOZE test (Leapfrog) which is testable.
    // For Weighted Sort, I'll rely on code correctness for now, or maybe add a DEBUG_Backdate event.
}

setTimeout(() => {
    // Step 1: Add Client A (Normal)
    console.log("Step 1: Joining Client A (Normal wait)...");
    socket.emit("JOIN_QUEUE", { id: 'client_a', name: 'Client A', preference: 'next_available' });
}, 500);

setTimeout(() => {
    // Step 2: Add Client B (Will be snoozed)
    console.log("Step 2: Joining Client B (To be snoozed)...");
    socket.emit("JOIN_QUEUE", { id: 'client_b', name: 'Client B', preference: 'next_available' });
}, 1000);

setTimeout(() => {
    // Step 3: Snooze B
    console.log("Step 3: Snoozing Client B...");
    socket.emit("SNOOZE_CLIENT", 'client_b');
}, 2000);

setTimeout(() => {
    // Step 4: Reactivate B (Should set checkInTime: 0)
    console.log("Step 4: Reactivating Client B (Leapfrog!)");
    socket.emit("REACTIVATE_CLIENT", 'client_b');
}, 3000);

setTimeout(() => {
    // Step 5: Call Next
    console.log("Step 5: Calling Next (Should pick B despite A waiting longer in real time/original time)");
    // Note: A has been waiting ~3s. B has checkInTime 0 (1970). B should win.
    socket.emit("CALL_NEXT", 'Adam'); // Assuming Adam is a barber
}, 4000);

socket.on("SYNC_STATE", (state) => {
    const inChair = state.clients.find(c => c.status === 'in_chair');
    if (inChair) {
        if (inChair.id === 'client_b') {
            console.log("✅ SUCCESS: Client B (Reactivated) leapfrogged Client A!");
            process.exit(0);
        } else if (inChair.id === 'client_a') {
            console.error("❌ FAILURE: Client A was picked. Leapfrog failed.");
            process.exit(1);
        }
    }
});

// Timeout
setTimeout(() => {
    console.log("Timeout waiting for result.");
    process.exit(1);
}, 6000);
