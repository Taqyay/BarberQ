import type { Client, ClientStatus, BarberId, QueueState, BarberState } from '../types';
import { io, Socket } from 'socket.io-client';

// Use current hostname (works for localhost AND network IP)
const SERVER_URL = `http://${window.location.hostname}:3000`;

export class QueueManager {
  private socket: Socket;
  private state: QueueState = { clients: [], barbers: [] };
  private listeners: (() => void)[] = [];

  constructor() {
    this.socket = io(SERVER_URL);

    this.socket.on('connect', () => {
      console.log('Connected to Queue Server');
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

  // --- Write Actions (Emit to Server) ---

  addClient(name: string, preference: BarberId) {
    // Client-side ID generation for "My Ticket" tracking
    // crypto.randomUUID() requires Secure Context (HTTPS), using fallback for network IP
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    this.socket.emit('JOIN_QUEUE', { id, name, preference });
    // Return the ID so the UI can track it immediately
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

  snoozeClient(clientId: string) {
    this.socket.emit('SNOOZE_CLIENT', clientId);
  }

  reactivateClient(clientId: string) {
    this.socket.emit('REACTIVATE_CLIENT', clientId);
  }

  reset() {
    this.socket.emit('RESET');
  }
}

export const queueManager = new QueueManager();
