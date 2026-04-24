import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

socket.on("connect", () => {
    console.log("Connected for Unified Queue Audit.");
    socket.emit("RESET");
});

// Helper
function join(name, source, travelTime = '5') {
    const id = name.toLowerCase().replace(' ', '_');
    const payload = {
        id,
        name,
        preference: 'next_available',
        source,
        travelTime
    };
    if (source === 'remote') {
        socket.emit("JOIN_REMOTE", payload);
    } else {
        socket.emit("JOIN_QUEUE", payload);
    }
}

// Flow
setTimeout(() => {
    console.log("1. Joining 'Analog Dave' (Manual)...");
    join("Analog Dave", "manual");
}, 500);

setTimeout(() => {
    console.log("2. Joining 'Remote Ron' (Remote, 30+ min travel)...");
    join("Remote Ron", "remote", "30+");
}, 1000);

setTimeout(() => {
    console.log("3. Joining 'QR Quinn' (Scan)...");
    // Quinn joins AFTER Ron.
    // Ron (T) + 30m penalty.
    // Quinn (T+1s).
    // Expected: Quinn < Ron (Effective).
    // So Quinn should be picked before Ron.
    join("QR Quinn", "qr");
}, 2000);

setTimeout(() => {
    console.log("4. Calling Next (Expect Dave #1)...");
    socket.emit("CALL_NEXT", "Adam");
}, 3000);

setTimeout(() => {
    console.log("5. Calling Next Again (Expect Quinn #2, passing Ron)...");
    socket.emit("CALL_NEXT", "Adam");
}, 4000);

socket.on("SYNC_STATE", (state) => {
    const inChair = state.clients.filter(c => c.status === 'in_chair');
    const justTookChair = inChair[inChair.length - 1]; // Last one added?

    // We can just check the active list
    if (inChair.length > 0) {
        console.log("Current In Chair:", inChair.map(c => c.name));
    }
});

setTimeout(() => {
    console.log("Audit Complete. Checking logs manually.");
    // We will inspect state one last time
    socket.emit("request_state_check"); // Hack: just triggering a sync to read final state?
    // Actually, I'll just read variables via a final sync handler if I could, but process exit is easier.
    // I'll rely on the console logs of who got picked if I add listeners.
    process.exit(0);
}, 5000);
