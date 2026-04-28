import type { BarberId, QueueState } from '../types';
import { io, Socket } from 'socket.io-client';

// PROD SYNC: Default to same-origin for Cloud Run portability
const socket = io();

export class QueueManager {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  private socket: Socket;
  private state: QueueState = {
    clients: [],
    barbers: [],
    settings: {
      snoozeEnabled: true,
      snoozeDurationMinutes: 5,
      averageCutTimeMinutes: 20,
      remoteBufferMinutes: 30,
      firstCutTime: 9,
      lastCutTime: 18,
      mvsMinutes: 15
    }
  };
  private isConnected = false;
  private listeners: (() => void)[] = [];

  constructor() {
    this.socket = socket;

    this.socket.on('connect', () => {
      console.log('Connected to Queue Server');
      this.isConnected = true;
      this.notifyListeners();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.notifyListeners();
    });

    this.socket.on('connect_error', () => {
      this.isConnected = false;
      this.notifyListeners();
    });

    this.socket.on('SYNC_STATE', (newState: QueueState) => {
      this.state = newState;
      this.notifyListeners();
    });
  }

  subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  // --- Read Actions (Local State) ---
  getClients() { return this.state.clients; }
  getBarbers() { return this.state.barbers; }
  getSettings() { return this.state.settings; }
  getConnectionStatus() { return this.isConnected; }

  // --- Write Actions (Emit to Server) ---

  updateSettings(settings: Partial<QueueState['settings']>) {
    this.socket.emit('UPDATE_SETTINGS', settings);
  }

  updateGroupSize(clientId: string, newSize: number) {
    this.socket.emit('UPDATE_GROUP_SIZE', { clientId, newSize });
  }

  addBarber(name: string) {
    this.socket.emit('ADD_BARBER', { name });
  }

  removeBarber(id: string) {
    this.socket.emit('REMOVE_BARBER', id);
  }

  reorderBarbers(newOrderIds: string[]) {
    this.socket.emit('REORDER_BARBERS', newOrderIds);
  }

  addClient(name: string, preference: BarberId, source: 'qr' | 'manual' = 'qr', groupSize: number = 1, serviceId?: string) {
    // Client-side ID generation for "My Ticket" tracking
    // crypto.randomUUID() requires Secure Context (HTTPS), using fallback for network IP
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    this.socket.emit('JOIN_QUEUE', { id, name, preference, source, groupSize, serviceId });
    // Return the ID so the UI can track it immediately
    return { id };
  }

  joinRemote(name: string, preference: BarberId, groupSize: number, travelTime: string, reservationTime: number) {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    this.socket.emit('JOIN_REMOTE', { id, name, preference, groupSize, travelTime, reservationTime });
    return { id };
  }

  cancelClient(id: string) {
    this.socket.emit('CANCEL_CLIENT', id);
  }

  toggleBarberAvailability(barberId: BarberId, isAvailable: boolean) {
    this.socket.emit('TOGGLE_SHIFT', { barberId, isAvailable });
  }

  callNext(barberId: BarberId) {
    this.socket.emit('CALL_NEXT', barberId);
  }

  finishClient(clientId: string) {
    this.socket.emit('FINISH_CLIENT', clientId);
  }

  snoozeClient(clientId: string) {
    this.socket.emit('SNOOZE_CLIENT', clientId);
  }

  reactivateClient(clientId: string) {
    this.socket.emit('REACTIVATE_CLIENT', clientId);
  }

  updateClientTimeSlot(clientId: string, newTime: number, barberId?: string) {
    this.socket.emit('UPDATE_CLIENT_TIME_SLOT', { clientId, newTime, barberId });
  }

  reset(secret: string = 'dev-secret') {
    this.socket.emit('RESET', { secret });
  }
}

export const queueManager = new QueueManager();
