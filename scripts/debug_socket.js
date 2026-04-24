
import { io } from "socket.io-client";

console.log("Attempting to connect to http://localhost:3001...");
const socket = io("http://localhost:3001");

socket.on("connect", () => {
    console.log("Connected! Socket ID:", socket.id);

    const payload = {
        id: "debug-" + Date.now(),
        name: "DEBUG_TESTHERO",
        preference: "next_available",
        groupSize: 1,
        travelTime: "5"
    };

    console.log("Emitting JOIN_REMOTE with:", payload);
    socket.emit("JOIN_REMOTE", payload);
});

socket.on("SYNC_STATE", (state) => {
    console.log("SYNC_STATE received. Total clients:", state.clients.length);
    const found = state.clients.find(c => c.name === "DEBUG_TESTHERO");

    if (found) {
        console.log("✅ SUCCESS: DEBUG_TESTHERO is in the queue!");
        console.log("Client Status:", found.status);
        console.log("Wait Preference:", found.barberPreference);
        process.exit(0);
    } else {
        console.log("⚠️ DEBUG_TESTHERO not found in state yet.");
    }
});

socket.on("connect_error", (err) => {
    console.error("❌ Connection Error:", err.message);
    process.exit(1);
});

// Timeout after 5 seconds
setTimeout(() => {
    console.error("❌ Timeout: No success confirmation received.");
    process.exit(1);
}, 5000);
