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
const app = express();
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';
let useDB = false;

// Enforce Database Presence in Production
const MONGO_URI = process.env.MONGO_URI;
if (NODE_ENV === 'production' && !MONGO_URI) {
  console.error('[SOVEREIGN] FATAL: MONGO_URI is missing in production environment. Halting.');
  process.exit(1);
}

const DB_URI = MONGO_URI || 'mongodb://localhost:27017/barberq';

console.log(`[SOVEREIGN] Runtime: ${NODE_ENV} | DB: ${MONGO_URI ? 'SECURED' : 'LOCAL'}`);

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://barberq-491721.a.run.app',
  'https://barberq-v1-651913574031.europe-west1.run.app',
  'https://barberq-v1-d57ut6nj3q-ew.a.run.app'
];

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

const BarberSchema = new mongoose.Schema({
  id: String,
  name: String,
  isAvailable: Boolean,
  waitDurationMinutes: Number,
  orderIndex: Number
});
const BarberModel = mongoose.model('Barber', BarberSchema);

// --- Health Check ---
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    mode: useDB ? 'atlas' : 'local'
  });
});

// Serve Static Assets in Production
if (NODE_ENV === 'production') {
  const rootDir = process.cwd();
  const distPath = path.resolve(rootDir, 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.error(`[SOVEREIGN] FATAL: Static directory missing at ${distPath}`);
    process.exit(1);
  }
  
  console.log(`[SOVEREIGN] Serving static assets from: ${distPath}`);
  app.use(express.static(distPath));
  
  // SPA Catch-all
  app.get(/^(?!\/api|\/health).*$/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

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

      // Sync Barbers
      const dbBarbers = await BarberModel.find({}).sort({ orderIndex: 1 });
      if (dbBarbers.length === 0) {
        await BarberModel.insertMany(DEFAULT_BARBERS.map((b, i) => ({ ...b, orderIndex: i })));
        state.barbers = DEFAULT_BARBERS;
      } else {
        state.barbers = dbBarbers.map(b => ({ ...b.toObject(), queue: [] }));
      }

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
    const { _id, __v, key, ...cleanSettings } = newSettings;
    state.settings = { ...state.settings, ...cleanSettings };
    if (useDB) {
      await Setting.findOneAndUpdate({ key: 'global' }, { $set: cleanSettings }, { upsert: true });
    } else {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(state.settings, null, 2));
    }
    console.log('[SOVEREIGN] Settings persisted.');
  } catch (err) {
    console.error('[SOVEREIGN] Error saving settings:', err);
  }
};

// --- Database Connection ---
mongoose.connect(DB_URI)
  .then(() => {
    console.log(`[SOVEREIGN] Connected to ${DB_URI.includes('cluster') ? 'MongoDB Atlas' : 'Local MongoDB'}`);
    useDB = true;
    syncStateWithDB();
  })
  .catch(err => {
    console.error('[SOVEREIGN] MongoDB Connection Failed.', err);
    if (NODE_ENV === 'production') process.exit(1);
    
    // Fallback: Read from settings.json if exists
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  });

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

  let snappedTime = requestedTime;

  // Tetris Gap Checking: Ensure no gaps smaller than MVS
  let changed;
  do {
    changed = false;
    for (const n of neighbors) {
      const nStart = n.reservationTime;
      const nEnd = nStart + cutMs;

      // Check gap before neighbor
      const gapBefore = nStart - (snappedTime + cutMs);
      if (gapBefore > 0 && gapBefore < mvsMs) {
        snappedTime = nStart - cutMs;
        changed = true;
      }

      // Check gap after neighbor
      const gapAfter = snappedTime - nEnd;
      if (gapAfter > 0 && gapAfter < mvsMs) {
        snappedTime = nEnd;
        changed = true;
      }
    }
  } while (changed);

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

  socket.on('REORDER_BARBERS', async (newOrderIds) => {
    if (!Array.isArray(newOrderIds)) return;

    if (useDB) {
      for (let i = 0; i < newOrderIds.length; i++) {
        await BarberModel.findOneAndUpdate({ id: newOrderIds[i] }, { $set: { orderIndex: i } });
      }
    } else {
      const barberMap = new Map();
      state.barbers.forEach(b => barberMap.set(b.id, b));
      const newBarbersList = [];
      newOrderIds.forEach(id => {
        if (barberMap.has(id)) {
          newBarbersList.push(barberMap.get(id));
          barberMap.delete(id);
        }
      });
      state.barbers.forEach(b => {
        if (barberMap.has(b.id)) {
          newBarbersList.push(b);
        }
      });
      state.barbers = newBarbersList;
    }
    await syncStateWithDB();
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

  socket.on('TOGGLE_SHIFT', async ({ barberId, isAvailable }) => {
    if (useDB) {
      await BarberModel.findOneAndUpdate({ id: barberId }, { $set: { isAvailable } });
    } else {
      state.barbers = state.barbers.map(b =>
        b.id === barberId ? { ...b, isAvailable } : b
      );
    }
    await syncStateWithDB();
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
  socket.on('ADD_BARBER', async ({ name }) => {
    const id = randomUUID();
    if (!state.barbers.find(b => b.name === name)) {
      const newBarber = {
        id,
        name,
        isAvailable: true,
        waitDurationMinutes: state.settings.averageCutTimeMinutes || 20,
        orderIndex: state.barbers.length
      };
      if (useDB) {
        await BarberModel.create(newBarber);
      } else {
        state.barbers.push({ ...newBarber, queue: [] });
      }
      await syncStateWithDB();
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

  socket.on('REMOVE_BARBER', async (barberId) => {
    if (useDB) {
      await BarberModel.findOneAndDelete({ id: barberId });
    } else {
      state.barbers = state.barbers.filter(b => b.id !== barberId);
    }
    await syncStateWithDB();
  });

  socket.on('RESET', async ({ secret }) => {
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-secret';
    if (secret !== ADMIN_SECRET) {
      console.error('[SOVEREIGN] Unauthorized RESET attempt.');
      return;
    }
    if (useDB) {
      await ClientModel.deleteMany({});
      await Setting.findOneAndUpdate({ key: 'global' }, DEFAULT_SETTINGS, { upsert: true });
    } else {
      state.clients = [];
      state.settings = DEFAULT_SETTINGS;
    }
    await syncStateWithDB();
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
