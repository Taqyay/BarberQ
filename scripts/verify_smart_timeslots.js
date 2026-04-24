import { io } from "socket.io-client";

const socket = io("http://localhost:3001");
const now = Date.now();

socket.on("connect", () => {
    console.log("Connected for Smart Timeslot Verification.");
    socket.emit("RESET");
});

setTimeout(() => {
    // 1. Join Manual Client (Now)
    console.log("1. Joining 'Manual Mike' (Now)");
    socket.emit("JOIN_QUEUE", { id: 'mike', name: 'Manual Mike', preference: 'next_available', source: 'manual' });
}, 500);

setTimeout(() => {
    // 2. Join Remote Client (Future Reservation + 20m)
    console.log("2. Joining 'Future Fiona' (Reservation: Now + 20m)");
    socket.emit("JOIN_REMOTE", {
        id: 'fiona',
        name: 'Future Fiona',
        preference: 'next_available',
        groupSize: 1,
        travelTime: '30+', // Legacy
        reservationTime: now + (20 * 60 * 1000)
    });
}, 1000);

setTimeout(() => {
    // 3. Join Remote Client (Near Future Reservation + 2m)
    // Should still be AFTER Mike? Mike is Now. Fiona is +20.
    // 'Near Nick' is +2m.
    console.log("3. Joining 'Near Nick' (Reservation: Now + 2m)");
    socket.emit("JOIN_REMOTE", {
        id: 'nick',
        name: 'Near Nick',
        preference: 'next_available',
        groupSize: 1,
        travelTime: '5',
        reservationTime: now + (2 * 60 * 1000)
    });
}, 1500);

setTimeout(() => {
    console.log("4. Calling Next (Expect Mike #1)...");
    socket.emit("CALL_NEXT", "Adam");
}, 2500);

setTimeout(() => {
    console.log("5. Calling Next (Expect Nick #2)...");
    socket.emit("CALL_NEXT", "Adam");
}, 3500);

socket.on("SYNC_STATE", (state) => {
    const inChair = state.clients.filter(c => c.status === 'in_chair');
    if (inChair.length > 0) {
        console.log("Current In Chair:", inChair.map(c => c.name));
    }

    // Check Visibility Logic (Simulation)
    const fiona = state.clients.find(c => c.id === 'fiona');
    if (fiona) {
        console.log("Fiona State:", JSON.stringify(fiona));
        const isVisible = fiona.reservationTime - (15 * 60 * 1000) < Date.now();
        console.log(`Fiona Visibility Check: ${isVisible ? 'VISIBLE' : 'HIDDEN (Stealth)'}`);
    }
    const nick = state.clients.find(c => c.id === 'nick');
    if (nick) {
        console.log("Nick State:", JSON.stringify(nick));
    } else {
        console.log("Nick NOT FOUND in state!");
    }

    console.log("All Clients:", state.clients.map(c => `${c.name} (${c.status}) [Res:${c.reservationTime}]`));
});

setTimeout(() => {
    process.exit(0);
}, 5000);
