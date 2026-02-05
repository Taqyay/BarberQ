import { queueManager } from './queueManager';

class UATSimulator {
    constructor() {
        this.isActive = false;
        this.simSpeed = 1000; // 1 second = 1 minute
        this.simTime = 9 * 60; // Start at 9:00 AM (in minutes from midnight)
        this.simInterval = null;
        this.keyBuffer = '';
        this.activationPhrase = 'uat time warp';
        this.names = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy', 'Mallory', 'Oscar'];

        this.initListener();
    }

    initListener() {
        if (typeof window === 'undefined') return;

        window.addEventListener('keydown', (e) => {
            if (this.isActive) return;

            // Only track letters and spaces
            if (e.key.length === 1) {
                this.keyBuffer += e.key.toLowerCase();
                if (this.keyBuffer.length > 20) {
                    this.keyBuffer = this.keyBuffer.slice(-20);
                }

                if (this.keyBuffer.endsWith(this.activationPhrase)) {
                    this.startSimulation();
                    this.keyBuffer = '';
                }
            }
        });

        console.log("UAT Simulator: Listening for activation phrase...");
    }

    startSimulation() {
        if (this.isActive) return;
        this.isActive = true;
        console.log("%c UAT TIME WARP ACTIVATED ", "background: #eab308; color: black; font-size: 20px; font-weight: bold;");
        alert("⏩ UAT TIME WARP ACTIVATED: 8 Hours in 8 Minutes");

        // Reset Queue for clean slate
        queueManager.reset();

        // Ensure strictly 3 barbers for consistency
        // (Assuming queueManager handles this or we just work with what we have)
        // Let's ensure we have our standard test crew if empty
        // queueManager.addBarber("Mo");
        // queueManager.addBarber("Steve"); 
        // queueManager.addBarber("Sarah");

        this.simInterval = setInterval(() => {
            this.tick();
        }, this.simSpeed);
    }

    stopSimulation() {
        if (this.simInterval) clearInterval(this.simInterval);
        this.isActive = false;
        console.log("Simulation Ended");
    }

    tick() {
        this.simTime++; // Advance 1 minute
        const hour = Math.floor(this.simTime / 60);
        const minute = this.simTime % 60;

        // Log current sim time
        console.log(`[SIM] ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);

        // End of day (17:00 / 5 PM)
        if (hour >= 17) {
            this.stopSimulation();
            alert("🏁 SIMULATION COMPLETE");
            return;
        }

        this.runScenario(hour, minute);
    }

    runScenario(hour, minute) {
        // Random Helper
        const chance = (percent) => Math.random() * 100 < percent;
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const barbers = ['Mo', 'Steve', 'Sarah', 'next_available']; // Hardcoded for sim simplicity or fetch dynamic?
        // Better to fetch dynamic if possible, but queueManager doesn't expose state directly easily here without subscription.
        // We'll trust the "random" logic or just use 'next_available' mostly + specific names.

        // SCENARIO SCRIPT

        // 09:05 - Morning Rush (Walk-ins)
        if (hour === 9 && minute === 5) {
            queueManager.addClient("Early Bird 1", "next_available", "qr");
            queueManager.addClient("Early Bird 2", "next_available", "qr");
        }

        // 09:30 - First Remote Booking (Arrival 10:00)
        // Earliest available logic will place them correctly
        if (hour === 9 && minute === 30) {
            // Simulate user booking for 10:30 (Now + 60m)
            const arrivalTime = Date.now() + (60 * 60000);
            queueManager.joinRemote("Remote Rex", "Mo", 1, "30+", arrivalTime);
        }

        // 10:00 - Steady Flow
        if (hour === 10 && chance(10)) { // 10% chance every minute = high traffic
            queueManager.addClient(`Walk-in ${hour}:${minute}`, "next_available", "qr");
        }

        // 12:00 - Lunch Rush
        if (hour === 12 && minute === 0) {
            queueManager.addClient("Lunch Crew 1", "Steve", "manual");
            queueManager.addClient("Lunch Crew 2", "Sarah", "manual");
            queueManager.addClient("Lunch Crew 3", "next_available", "qr");
        }

        // 14:00 - THE CONFLICT (Force Manual Add during Soft-Lock)
        if (hour === 14 && minute === 0) {
            // 1. Create Remote Booking for 14:30
            const conflictTime = Date.now() + (30 * 60000);
            queueManager.joinRemote("Conflict Connor", "Mo", 1, "30+", conflictTime);

            // 2. Alert user to try adding manually
            console.log("%c [TEST] Adding Manual Client to MO now should show Warning! ", "color: red");
            // We won't auto-add the conflict, we let the simulation run and maybe the user sees it visually? 
            // Requirement says "Force at least one Collision". Let's add it programmatically.
            setTimeout(() => {
                queueManager.addClient("Collision Carl", "Mo", "manual");
                console.log("Collision Carl added to Mo. Check Calendar for RED outline.");
            }, 5000);
        }

        // Continuous Drip (Walk-ins)
        if (chance(5)) {
            queueManager.addClient(`Random ${pick(this.names)}`, "next_available", "qr");
        }

        // --- BARBER SIMULATION (Auto-Work) ---
        // 1 tick = 1 minute.
        // Chance to Call Next (Finish previous + Start new) = 20% (approx every 5 mins? fast pace for sim)
        if (chance(20)) {
            const barbersList = ['Mo', 'Steve', 'Sarah'];
            const randomBarber = pick(barbersList);
            queueManager.callNext(randomBarber);
        }
    }
}

export const uatSimulator = new UATSimulator();
