import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'crypto';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://barberq-491721.a.run.app',
  'https://barberq-491721.ue.r.appspot.com'
];

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/barberq';

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// --- MongoDB Schema & Models ---
const SettingSchema = new mongoose.Schema({
  key: { type: String, default: 'global' },
  snoozeEnabled: Boolean,
  snoozeDurationMinutes: Number,
  averageCutTimeMinutes: Number,
  remoteBufferMinutes: Number,
  firstCutTime: Number,
  lastCutTime: Number,
  mvsMinutes: Number,
  theme: String
});

const ClientSchema = new mongoose.Schema({
  id: String,
  name: String,
  barberPreference: String,
  assignedBarber: String,
  status: String,
  checkInTime: Number,
  originalCheckInTime: Number,
  source: String,
  groupSize: Number,
  remainingSize: Number,
  travelTime: String,
  reservationTime: Number,
  serviceStartTime: Number,
  serviceEndTime: Number,
  snoozeStartTime: Number
}, { timestamps: true });

const Setting = mongoose.model('Setting', SettingSchema);
const ClientModel = mongoose.model('Client', ClientSchema);

// --- Health Check ---
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    mode: useDB ? 'atlas' : 'local'
  });
});

// --- Static Assets (Production) ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// --- SPA Catch-all Routing ---
// Must be AFTER API and Health routes
app.get(/^(?!\/api|\/health).*$/, (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built. Run npm run build.');
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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
  remoteBufferMinutes: 30,
  firstCutTime: 9,
  lastCutTime: 18,
  mvsMinutes: 15,
  theme: 'golden-sand'
};

let state = {
  clients: [],
  barbers: DEFAULT_BARBERS,
  settings: DEFAULT_SETTINGS
};

// --- Settings Persistence (Refactored for MongoDB) ---
const syncStateWithDB = async () => {
  try {
    if (useDB) {
      // Sync Settings
      let dbSettings = await Setting.findOne({ key: 'global' });
      if (!dbSettings) {
        dbSettings = await Setting.create(DEFAULT_SETTINGS);
      }
      state.settings = dbSettings.toObject();

      // Sync Active Clients
      const activeClients = await ClientModel.find({ 
        status: { $in: ['waiting', 'in_chair', 'snoozed'] } 
      });
      state.clients = activeClients.map(c => c.toObject());
      console.log('[SOVEREIGN] State synchronized with MongoDB Atlas.');
    }
    io.emit('SYNC_STATE', state);
  } catch (err) {
    console.error('[SOVEREIGN] DB Sync Error:', err);
  }
};

const saveSettings = async (newSettings) => {
  try {
    state.settings = { ...state.settings, ...newSettings };
    if (useDB) {
      await Setting.findOneAndUpdate({ key: 'global' }, newSettings, { upsert: true });
    } else {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(state.settings, null, 2));
    }
    console.log('[SOVEREIGN] Settings persisted.');
  } catch (err) {
    console.error('[SOVEREIGN] Error saving settings:', err);
  }
};

let useDB = false;

// Connect to MongoDB with timeout
const connectDB = async () => {
  try {
    console.log(`[SOVEREIGN] Connecting to ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI, { 
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    console.log('[SOVEREIGN] Connected to MongoDB Atlas.');
    useDB = true;
    await syncStateWithDB();
  } catch (err) {
    console.error('[SOVEREIGN] MongoDB Connection Failed. Falling back to Local Persistence.');
    useDB = false;
    // Fallback: Read from settings.json if exists
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  }
};

connectDB();

// --- Sovereign MVS Snapping Logic ---
const getSnappedTime = (clientId, barberId, requestedTime, settings, allClients) => {
  if (!barberId || barberId === 'next_available') return requestedTime;

  const mvsMs = (settings.mvsMinutes || 15) * 60 * 1000;
  const cutMs = (settings.averageCutTimeMinutes || 20) * 60 * 1000;

  // Filter clients for this barber on the same day
  const d = new Date(requestedTime);
  const dayStart = new Date(d).setHours(0, 0, 0, 0);
  const dayEnd = new Date(d).setHours(23, 59, 59, 999);

  const neighbors = allClients.filter(c =>
    c.id !== clientId &&
    (c.assignedBarber === barberId || c.barberPreference === barberId) &&
    c.reservationTime >= dayStart &&
    c.reservationTime <= dayEnd &&
    c.status !== 'cancelled' &&
    c.status !== 'finished'
  ).sort((a, b) => a.reservationTime - b.reservationTime);

  console.log(`[SOVEREIGN] getSnappedTime for ${clientId}: Found ${neighbors.length} neighbors for ${barberId}.`);
  neighbors.forEach(n => console.log(` - Neighbor ${n.id}: ${new Date(n.reservationTime).toLocaleTimeString()}`));

  let snappedTime = requestedTime;

  // Tetris Gap Checking: Ensure no gaps smaller than MVS
  for (const n of neighbors) {
    const nStart = n.reservationTime;
    const nEnd = nStart + cutMs;

    // Check gap before neighbor
    const gapBefore = nStart - (snappedTime + cutMs);
    if (gapBefore > 0 && gapBefore < mvsMs) {
      snappedTime = nStart - cutMs;
    }

    // Check gap after neighbor
    const gapAfter = snappedTime - nEnd;
    if (gapAfter > 0 && gapAfter < mvsMs) {
      snappedTime = nEnd;
    }
  }

  return snappedTime;
};

const handleCallNext = async (barberId) => {
  const barber = state.barbers.find(b => b.id === barberId);
  const isAway = barber ? !barber.isAvailable : false;
  const now = Date.now();

  // 1. Finish current client
  if (useDB) {
    await ClientModel.updateMany(
      { status: 'in_chair', $or: [{ assignedBarber: barberId }, { barberPreference: barberId, assignedBarber: null }] },
      { status: 'finished', serviceEndTime: now }
    );
  } else {
    state.clients = state.clients.map(c => {
      if (c.status === 'in_chair' && (c.assignedBarber === barberId || (c.barberPreference === barberId && !c.assignedBarber))) {
        return { ...c, status: 'finished', serviceEndTime: now };
      }
      return c;
    });
  }

  if (isAway) {
    await syncStateWithDB();
    return;
  }

  // 2. Find next best candidate
  const candidates = state.clients.filter(c => 
    c.status === 'waiting' && (c.barberPreference === barberId || c.barberPreference === 'next_available')
  ).sort((a, b) => {
    const isLeapfrogA = a.checkInTime === 0;
    const isLeapfrogB = b.checkInTime === 0;
    if (isLeapfrogA && !isLeapfrogB) return -1;
    if (!isLeapfrogA && isLeapfrogB) return 1;
    if (isLeapfrogA && isLeapfrogB) return a.originalCheckInTime - b.originalCheckInTime;

    const getEffectiveTime = (c) => {
      if (c.reservationTime) return c.reservationTime;
      let time = c.originalCheckInTime || c.checkInTime;
      if (c.source === 'remote' && c.travelTime === '30+' && !c.reservationTime) time += (30 * 60 * 1000);
      return time;
    };
    return getEffectiveTime(a) - getEffectiveTime(b);
  });

  if (candidates.length > 0) {
    const nextClient = candidates[0];
    if (nextClient.remainingSize && nextClient.remainingSize > 1) {
      // Group Split Logic
      if (useDB) {
        await ClientModel.findOneAndUpdate({ id: nextClient.id }, { remainingSize: nextClient.remainingSize - 1 });
        const currentPersonIndex = (nextClient.groupSize || nextClient.remainingSize) - (nextClient.remainingSize - 1);
        await ClientModel.create({
          ...nextClient,
          _id: new mongoose.Types.ObjectId(),
          id: nextClient.id + '_split_' + Date.now(),
          name: `${nextClient.name} (${currentPersonIndex}/${nextClient.groupSize})`,
          status: 'in_chair',
          assignedBarber: barberId,
          serviceStartTime: Date.now(),
          remainingSize: 0,
          groupSize: 1
        });
      } else {
        state.clients = state.clients.map(c => 
          c.id === nextClient.id ? { ...c, remainingSize: c.remainingSize - 1 } : c
        );
        const currentPersonIndex = (nextClient.groupSize || nextClient.remainingSize) - (nextClient.remainingSize - 1);
        state.clients.push({
          ...nextClient,
          id: nextClient.id + '_split_' + Date.now(),
          name: `${nextClient.name} (${currentPersonIndex}/${nextClient.groupSize})`,
          status: 'in_chair',
          assignedBarber: barberId,
          serviceStartTime: Date.now(),
          remainingSize: 0,
          groupSize: 1
        });
      }
    } else {
      if (useDB) {
        await ClientModel.findOneAndUpdate({ id: nextClient.id }, { status: 'in_chair', assignedBarber: barberId, serviceStartTime: Date.now() });
      } else {
        state.clients = state.clients.map(c => 
          c.id === nextClient.id ? { ...c, status: 'in_chair', assignedBarber: barberId, serviceStartTime: Date.now() } : c
        );
      }
    }
  }

  await syncStateWithDB();
};

// Background Worker: Auto-cancel snoozed clients dynamically
setInterval(async () => {
  if (!state.settings.snoozeEnabled) return;
  const now = Date.now();
  const snoozeLimit = state.settings.snoozeDurationMinutes * 60 * 1000;

  if (useDB) {
    const results = await ClientModel.updateMany(
      { status: 'snoozed', snoozeStartTime: { $lt: now - snoozeLimit } },
      { status: 'cancelled' }
    );
    if (results.modifiedCount > 0) await syncStateWithDB();
  } else {
    let changed = false;
    state.clients = state.clients.map(c => {
      if (c.status === 'snoozed' && c.snoozeStartTime && (now - c.snoozeStartTime > snoozeLimit)) {
        changed = true;
        return { ...c, status: 'cancelled' };
      }
      return c;
    });
    if (changed) io.emit('SYNC_STATE', state);
  }
}, 10000);

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

  socket.on('JOIN_QUEUE', async (payload) => {
    const { id, name, preference, source } = payload;
    const now = Date.now();
    const newClientData = {
      id: id || randomUUID(),
      name,
      barberPreference: preference,
      status: 'waiting',
      checkInTime: now,
      originalCheckInTime: now,
      source: source || 'qr',
      groupSize: payload.groupSize || 1,
      remainingSize: payload.groupSize || 1
    };
    if (useDB) {
      await ClientModel.create(newClientData);
    } else {
      state.clients.push(newClientData);
    }
    await syncStateWithDB();
  });

  socket.on('JOIN_REMOTE', async (payload) => {
    const { id, name, preference, groupSize, travelTime, reservationTime } = payload;
    const now = Date.now();
    const snappedTime = getSnappedTime(id, preference, reservationTime || now, state.settings, state.clients);

    const newClientData = {
      id: id || randomUUID(),
      name,
      barberPreference: preference,
      status: 'waiting',
      checkInTime: now,
      originalCheckInTime: now,
      source: 'remote',
      groupSize: groupSize || 1,
      remainingSize: groupSize || 1,
      travelTime: travelTime,
      reservationTime: snappedTime,
      lastTravelUpdate: now
    };

    if (useDB) {
      await ClientModel.create(newClientData);
    } else {
      state.clients.push(newClientData);
    }
    await syncStateWithDB();
  });

  socket.on('CANCEL_CLIENT', async (clientId) => {
    if (useDB) {
      await ClientModel.findOneAndUpdate({ id: clientId }, { status: 'cancelled' });
    } else {
      state.clients = state.clients.map(c => c.id === clientId ? { ...c, status: 'cancelled' } : c);
    }
    await syncStateWithDB();
  });

  socket.on('TOGGLE_SHIFT', ({ barberId, isAvailable }) => {
    state.barbers = state.barbers.map(b =>
      b.id === barberId ? { ...b, isAvailable } : b
    );
    io.emit('SYNC_STATE', state);
  });

  socket.on('CALL_NEXT', async (barberId) => {
    await handleCallNext(barberId);
  });

  socket.on('FINISH_CLIENT', async (clientId) => {
    if (useDB) {
      await ClientModel.findOneAndUpdate({ id: clientId }, { status: 'finished', serviceEndTime: Date.now() });
    } else {
      state.clients = state.clients.map(c => c.id === clientId ? { ...c, status: 'finished', serviceEndTime: Date.now() } : c);
    }
    await syncStateWithDB();
  });

  socket.on('SNOOZE_CLIENT', async (clientId) => {
    if (!state.settings.snoozeEnabled) return;
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;

    const barberToUpdate = client.assignedBarber;
    if (useDB) {
      await ClientModel.findOneAndUpdate(
        { id: clientId },
        { status: 'snoozed', snoozeStartTime: Date.now(), assignedBarber: undefined }
      );
    } else {
      state.clients = state.clients.map(c => 
        c.id === clientId ? { ...c, status: 'snoozed', snoozeStartTime: Date.now(), assignedBarber: undefined } : c
      );
    }

    if (barberToUpdate) {
      await handleCallNext(barberToUpdate);
    } else {
      await syncStateWithDB();
    }
  });

  socket.on('REACTIVATE_CLIENT', async (clientId) => {
    if (useDB) {
      await ClientModel.findOneAndUpdate(
        { id: clientId },
        { status: 'waiting', snoozeStartTime: undefined, checkInTime: 0 }
      );
    } else {
      state.clients = state.clients.map(c => 
        c.id === clientId ? { ...c, status: 'waiting', snoozeStartTime: undefined, checkInTime: 0 } : c
      );
    }
    await syncStateWithDB();
  });

  socket.on('UPDATE_SETTINGS', async (newSettings) => {
    await saveSettings(newSettings);
    await syncStateWithDB();
  });

  socket.on('UPDATE_GROUP_SIZE', async ({ clientId, newSize }) => {
    const client = state.clients.find(c => c.id === clientId);
    if (client && newSize < client.remainingSize && newSize >= 1) {
      if (useDB) {
        await ClientModel.findOneAndUpdate({ id: clientId }, { remainingSize: newSize, groupSize: newSize });
      } else {
        state.clients = state.clients.map(c => 
          c.id === clientId ? { ...c, remainingSize: newSize, groupSize: newSize } : c
        );
      }
      await syncStateWithDB();
    }
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

  socket.on('UPDATE_CLIENT_TIME_SLOT', async ({ clientId, newTime, barberId }) => {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;

    const finalBarberId = barberId || client.assignedBarber || client.barberPreference;
    const snappedTime = getSnappedTime(clientId, finalBarberId, newTime, state.settings, state.clients);

    const updates = {
      reservationTime: snappedTime,
      ...(barberId ? { barberPreference: barberId, assignedBarber: null } : {})
    };
    if (useDB) {
      await ClientModel.findOneAndUpdate({ id: clientId }, updates);
    } else {
      state.clients = state.clients.map(c => c.id === clientId ? { ...c, ...updates } : c);
    }
    await syncStateWithDB();
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

  socket.on('RESET', async () => {
    await ClientModel.deleteMany({});
    await Setting.findOneAndUpdate({ key: 'global' }, DEFAULT_SETTINGS, { upsert: true });
    await syncStateWithDB();
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
