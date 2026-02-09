import express from 'express';
import { randomUUID } from 'crypto';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const DEFAULT_BARBERS = [
  { id: 'Adam', name: 'Adam', isAvailable: true, waitDurationMinutes: 20, queue: [] },
  { id: 'Ibrahim', name: 'Ibrahim', isAvailable: true, waitDurationMinutes: 20, queue: [] },
  { id: 'Vishal', name: 'Vishal', isAvailable: true, waitDurationMinutes: 20, queue: [] },
];

const DEFAULT_SETTINGS = {
  snoozeEnabled: true,
  snoozeDurationMinutes: 5,
  averageCutTimeMinutes: 20,
  remoteBufferMinutes: 30, // Default 30 min buffer
  firstCutTime: 9,
  lastCutTime: 18
};

let state = {
  clients: [],
  barbers: DEFAULT_BARBERS,
  settings: DEFAULT_SETTINGS
};

const handleCallNext = (barberId) => {
  // 1. Finish currently assigned client (if in chair)
  // 1. Finish currently assigned client (if in chair)
  // 1. Finish currently assigned client (if in chair)
  // BUG FIX: Ensure we timestamp when they finished for history tracking
  const now = Date.now();
  state.clients = state.clients.map(c => {
    if (c.status === 'in_chair' && (c.assignedBarber === barberId || (c.barberPreference === barberId && !c.assignedBarber))) {
      return { ...c, status: 'finished', serviceEndTime: now };
    }
    return c;
  });

  // 2. Find next best candidate
  const candidates = state.clients.filter(c =>
    c.status === 'waiting' &&
    (c.barberPreference === barberId || c.barberPreference === 'next_available')
  ).sort((a, b) => {
    // PRIORITY LEAPFROG (S1/S4 -> S2):
    // If checkInTime is 0, this client was SNOOZED and is now REACTIVATED.
    // They must go to the top.
    const isLeapfrogA = a.checkInTime === 0;
    const isLeapfrogB = b.checkInTime === 0;

    if (isLeapfrogA && !isLeapfrogB) return -1; // A comes first
    if (!isLeapfrogA && isLeapfrogB) return 1;  // B comes first
    if (isLeapfrogA && isLeapfrogB) {
      // Both are leapfrogging, fall back to who arrived originally first
      return a.originalCheckInTime - b.originalCheckInTime;
    }

    // NORMAL LOGIC:
    const getEffectiveTime = (c) => {
      // RULE: Smart Timeslot / Reservation
      if (c.reservationTime) {
        return c.reservationTime;
      }

      // Base time is when they checked in (or originally checked in)
      // If we used originalCheckInTime blindly, we'd lose the 'reset' effect, 
      // but here we are in the 'Normal' block where checkInTime != 0.
      let time = c.originalCheckInTime || c.checkInTime;

      // Legacy Remote Penalty (kept for backward compatibility or non-reserved remote)
      // RULE: Remote Penalty? (User mentioned "Prioritize In-Shop over Remote")
      // If Remote & Travel > 30, maybe push back? 
      if (c.source === 'remote' && c.travelTime === '30+' && !c.reservationTime) {
        time += (30 * 60 * 1000);
      }

      // VERSION 3 MOVED TO FUTURE: Preferred Barber Bias removed.

      return time;
    };

    const timeA = getEffectiveTime(a);
    const timeB = getEffectiveTime(b);

    // DEBUG SORTING
    // console.log(`Comparing ${a.name} (${timeA}) vs ${b.name} (${timeB}) -> ${timeA - timeB}`);

    return timeA - timeB;
  });

  // LOG CANDIDATES
  console.log('Candidates for', barberId, candidates.map(c => `${c.name}:${c.reservationTime || 'NoRes'}`));

  if (candidates.length === 0) {
    // BUG FIX: Must emit state if we changed client status (finished someone) even if no one next
    io.emit('SYNC_STATE', state);
    return;
  }

  if (candidates.length > 0) {
    const nextClient = candidates[0];

    // Check for Group/Family Logic
    if (nextClient.remainingSize && nextClient.remainingSize > 1) {
      // SPLIT: Decrement remaining size of the waiting entry
      state.clients = state.clients.map(c =>
        c.id === nextClient.id
          ? { ...c, remainingSize: c.remainingSize - 1 }
          : c
      );

      // Create a specific entry for the person going to the chair
      const currentPersonIndex = (nextClient.groupSize || nextClient.remainingSize) - (nextClient.remainingSize - 1);
      const splitClient = {
        ...nextClient,
        id: nextClient.id + '_split_' + Date.now(), // Temporary ID for the individual
        name: `${nextClient.name} (${currentPersonIndex}/${nextClient.groupSize})`,
        status: 'in_chair',
        assignedBarber: barberId,
        serviceStartTime: Date.now(),
        remainingSize: 0, // Individual has no remaining stack
        groupSize: 1
      };
      state.clients.push(splitClient);

    } else {
      // NORMAL: Move whole entry to chair
      state.clients = state.clients.map(c =>
        c.id === nextClient.id
          ? { ...c, status: 'in_chair', assignedBarber: barberId, serviceStartTime: Date.now() }
          : c
      );
    }
  }

  io.emit('SYNC_STATE', state);
};

// Background Worker: Auto-cancel snoozed clients dynamically
setInterval(() => {
  if (!state.settings.snoozeEnabled) return;
  const now = Date.now();
  const snoozeLimit = state.settings.snoozeDurationMinutes * 60 * 1000;

  let changed = false;
  state.clients = state.clients.map(c => {
    if (c.status === 'snoozed' && c.snoozeStartTime && (now - c.snoozeStartTime > snoozeLimit)) {
      changed = true;
      return { ...c, status: 'cancelled' };
    }
    return c;
  });
  if (changed) io.emit('SYNC_STATE', state);
}, 10000); // Check every 10 seconds

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);
  socket.emit('SYNC_STATE', state);

  socket.on('REORDER_BARBERS', (newOrderIds) => {
    if (!Array.isArray(newOrderIds)) return;

    // Create Map for fast lookup
    const barberMap = new Map();
    state.barbers.forEach(b => barberMap.set(b.id, b));

    const newBarbersList = [];

    newOrderIds.forEach(id => {
      if (barberMap.has(id)) {
        newBarbersList.push(barberMap.get(id));
        barberMap.delete(id);
      }
    });

    // Append remaining (e.g. newly added ones not in the reorder list)
    state.barbers.forEach(b => {
      if (barberMap.has(b.id)) {
        newBarbersList.push(b);
      }
    });

    state.barbers = newBarbersList;
    io.emit('SYNC_STATE', state);
  });

  socket.on('JOIN_QUEUE', (payload) => {
    const { id, name, preference, source } = payload;
    const now = Date.now();
    const newClient = {
      id: id || randomUUID(),
      name,
      barberPreference: preference,
      status: 'waiting',
      checkInTime: now,
      originalCheckInTime: now, // Capture initial time for leapfrog
      source: source || 'qr',
      groupSize: payload.groupSize || 1,
      remainingSize: payload.groupSize || 1
    };
    state.clients.push(newClient);
    io.emit('SYNC_STATE', state);
  });

  socket.on('JOIN_REMOTE', (payload) => {
    console.log('RECEIVED JOIN_REMOTE:', payload);
    const { id, name, preference, groupSize, travelTime, reservationTime } = payload;
    const now = Date.now();
    const newClient = {
      id: id || randomUUID(),
      name,
      barberPreference: preference,
      status: 'waiting',
      checkInTime: now, // Initial check-in
      originalCheckInTime: now,
      source: 'remote',
      groupSize: groupSize || 1,
      remainingSize: groupSize || 1,
      travelTime: travelTime, // Deprecated in v0.4.5 but kept for backward compatibility if needed
      reservationTime: reservationTime || now, // V0.4.5 Smart Timeslot
      lastTravelUpdate: now
    };

    state.clients.push(newClient);
    io.emit('SYNC_STATE', state);
  });

  socket.on('CANCEL_CLIENT', (clientId) => {
    state.clients = state.clients.map(c =>
      c.id === clientId ? { ...c, status: 'cancelled' } : c
    );
    io.emit('SYNC_STATE', state);
  });

  socket.on('TOGGLE_SHIFT', ({ barberId, isAvailable }) => {
    state.barbers = state.barbers.map(b =>
      b.id === barberId ? { ...b, isAvailable } : b
    );
    io.emit('SYNC_STATE', state);
  });

  socket.on('CALL_NEXT', (barberId) => {
    handleCallNext(barberId);
  });

  socket.on('SNOOZE_CLIENT', (clientId) => {
    if (!state.settings.snoozeEnabled) return;
    let barberToUpdate = null;
    state.clients = state.clients.map(c => {
      if (c.id === clientId) {
        // If they were assigned to someone, track who, so we can call next for them
        if (c.assignedBarber) barberToUpdate = c.assignedBarber;
        return {
          ...c,
          status: 'snoozed',
          snoozeStartTime: Date.now(),
          assignedBarber: undefined
        };
      }
      return c;
    });

    // Leapfrog: Immediately call next for the barber who just snoozed someone
    if (barberToUpdate) {
      handleCallNext(barberToUpdate);
    } else {
      io.emit('SYNC_STATE', state); // Just sync if they weren't assigned
    }
  });

  socket.on('REACTIVATE_CLIENT', (clientId) => {
    state.clients = state.clients.map(c =>
      c.id === clientId
        ? { ...c, status: 'waiting', snoozeStartTime: undefined, checkInTime: 0 } // Priority #1
        : c
    );
    io.emit('SYNC_STATE', state);
  });

  socket.on('UPDATE_SETTINGS', (newSettings) => {
    state.settings = { ...state.settings, ...newSettings };
    io.emit('SYNC_STATE', state);
  });

  socket.on('UPDATE_GROUP_SIZE', ({ clientId, newSize }) => {
    state.clients = state.clients.map(c => {
      if (c.id === clientId) {
        // Restriction: Can only reduce size, not increase
        if (newSize < c.remainingSize && newSize >= 1) {
          return { ...c, remainingSize: newSize, groupSize: newSize };
        }
      }
      return c;
    });
    io.emit('SYNC_STATE', state);
  });

  // Dynamic Barber Management
  socket.on('ADD_BARBER', ({ name }) => {
    const id = name; // Use name as ID for simplicity in this demo, or randomUUID()
    if (!state.barbers.find(b => b.id === id)) {
      state.barbers.push({
        id,
        name,
        isAvailable: true,
        waitDurationMinutes: state.settings.averageCutTimeMinutes || 20,
        queue: []
      });
      io.emit('SYNC_STATE', state);
    }
  });

  socket.on('UPDATE_CLIENT_TIME_SLOT', ({ clientId, newTime, barberId }) => {
    state.clients = state.clients.map(c => {
      if (c.id === clientId) {
        // If barberId is provided (dragged to a specific barber's column), update preference
        const updates = {
          reservationTime: newTime,
          // If dragging to a specific barber, set expectation.
          // Note: If they were assigned, we might need to clear assignedBarber if moving to a different one? 
          // For now, let's just set preference. The queue logic handles assignment.
          ...(barberId ? { barberPreference: barberId, assignedBarber: null } : {})
        };
        return { ...c, ...updates };
      }
      return c;
    });
    // Trigger sorting/assignment pass?
    // For now, just sync. The queue display logic handles sorting on render/getters.
    io.emit('SYNC_STATE', state);
  });

  socket.on('REMOVE_BARBER', (barberId) => {
    state.barbers = state.barbers.filter(b => b.id !== barberId);
    // Also reset any clients assigned to this barber?
    // Or move them to 'next_available'?
    // For now, let's keep it simple: unassign them so they go back to waiting pool (if distinct preference)
    // If preference was THIS barber, they are now stuck.
    // Ideally, we shouldn't delete active barbers, but for now just remove.
    io.emit('SYNC_STATE', state);
  });

  socket.on('RESET', () => {
    state = { clients: [], barbers: DEFAULT_BARBERS, settings: DEFAULT_SETTINGS };
    io.emit('SYNC_STATE', state);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
