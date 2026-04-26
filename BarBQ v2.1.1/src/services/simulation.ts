import { queueManager } from './queueManager';

export class SimulationService {
    private isRunning = false;
    // Speed: 1 minute per second (Handled by timeout delays logic)

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("🚀 UAT TIME WARP ACTIVATED: Simulation Mode ONLY");

        // RESET SYSTEM
        queueManager.reset();

        // SCENARIO SCRIPT
        // 0s: Initial State
        this.log("Starting Simulation...");

        // 1s: 2 Walk-ins (QR)
        setTimeout(() => {
            this.log("Injecting: 2 Walk-ins");
            queueManager.addClient("Sim: John Walkin", "next_available");
            queueManager.addClient("Sim: Sarah Walkin", "next_available");
        }, 1000);

        // 2s: Remote Booking (Future +30m)
        setTimeout(() => {
            this.log("Injecting: Remote Booking");
            const now = Date.now();
            const futureTime = now + (45 * 60 * 1000); // 45 mins from now
            queueManager.joinRemote("Sim: Remote Roy", "Adam", 1, "30+", futureTime);
        }, 2000);

        // 3s: Barbers Start Cutting (Auto-Work)
        setTimeout(() => {
            this.log("Barbers Calling Next...");
            queueManager.callNext("Adam"); // Takes John
            queueManager.callNext("Vishal"); // Takes Sarah
        }, 3000);

        // 5s: Another Remote + Manual
        setTimeout(() => {
            this.log("Injecting: Remote + Manual");
            const now = Date.now();
            queueManager.joinRemote("Sim: Remote Rita", "Ibrahim", 1, "5", now + (60 * 60 * 1000));
            queueManager.addClient("Sim: Manual Mike", "Ibrahim", "manual"); // Manual assignment not strictly supported by addClient, it's 'manual' source
        }, 5000);

        // 7s: Fast Forward (Finish Cuts)
        setTimeout(() => {
            this.log("Finishing Cuts (Time Warp)...");
            queueManager.callNext("Adam"); // Finishes John, takes Next?
            queueManager.callNext("Vishal"); // Finishes Sarah
        }, 7000);

        // 8s: End
        setTimeout(() => {
            this.log("Simulation Complete.");
            this.isRunning = false;
        }, 8000);
    }

    private log(msg: string) {
        console.log(`%c[UAT VISA] ${msg}`, 'color: #ff00ff; font-weight: bold;');
    }
}

export const simulationService = new SimulationService();
