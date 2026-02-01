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
  { id: 'Mo', name: 'Mo', isAvailable: true, waitDurationMinutes: 30, queue: [] },
  { id: 'Steve', name: 'Steve', isAvailable: true, waitDurationMinutes: 10, queue: [] },
  { id: 'Sarah', name: 'Sarah', isAvailable: true, waitDurationMinutes: 15, queue: [] },
];

let state = {
  clients: [],
  barbers: DEFAULT_BARBERS
};

const handleCallNext = (barberId) => {
  // 1. Finish currently assigned client (if in chair)
  state.clients = state.clients.map(c => {
    if (c.status === 'in_chair' && (c.assignedBarber === barberId || (c.barberPreference === barberId && !c.assignedBarber))) {
      return { ...c, status: 'finished' };
    }
    return c;
  });

  // 2. Find next best candidate
  const candidates = state.clients.filter(c =>
    c.status === 'waiting' &&
    (c.barberPreference === barberId || c.barberPreference === 'next_available')
  ).sort((a, b) => a.checkInTime - b.checkInTime);

  // 3. Assign next client
  if (candidates.length > 0) {
    const nextClient = candidates[0];
    state.clients = state.clients.map(c =>
      c.id === nextClient.id
        ? { ...c, status: 'in_chair', assignedBarber: barberId }
        : c
    );
  }

  io.emit('SYNC_STATE', state);
};

// Background Worker: Auto-cancel snoozed clients after 5 minutes
setInterval(() => {
  const now = Date.now();
  let changed = false;
  state.clients = state.clients.map(c => {
    if (c.status === 'snoozed' && c.snoozeStartTime && (now - c.snoozeStartTime > 5 * 60 * 1000)) {
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

  socket.on('JOIN_QUEUE', ({ id, name, preference }) => {
    const newClient = {
      id: id || randomUUID(),
      name,
      barberPreference: preference,
      status: 'waiting',
      checkInTime: Date.now(),
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

  socket.on('RESET', () => {
    state = { clients: [], barbers: DEFAULT_BARBERS };
    io.emit('SYNC_STATE', state);
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
