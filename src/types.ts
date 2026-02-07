export type BarberId = string; // Dynamic IDs, plus 'next_available' as a reserved preference

export type ClientStatus = 'waiting' | 'in_chair' | 'finished' | 'cancelled' | 'snoozed';

export interface Client {
  id: string;
  name: string;
  barberPreference: BarberId;
  status: ClientStatus;
  checkInTime: number;
  assignedBarber?: BarberId; // If preference was 'next_available', this is who claimed them
  snoozeStartTime?: number; // Timestamp when they were marked 'Not Here'
  source?: 'qr' | 'manual' | 'remote';
  groupSize?: number;
  remainingSize?: number;
  originalCheckInTime?: number; // Track initial join time for priority leapfrog
  travelTime?: '5' | '15' | '30+';
  reservationTime?: number; // Smart Timeslot: Timestamp of booking slot
  serviceStartTime?: number; // Timestamp when they sat in the chair (for accurate calendar rendering)
  serviceEndTime?: number; // Timestamp when they finished (for history)
}

export interface Settings {
  snoozeEnabled: boolean;
  snoozeDurationMinutes: number;
  averageCutTimeMinutes: number;
  remoteBufferMinutes: number; // Configurable buffer for smart timeslots
  firstCutTime: number; // Hour of day (0-23) for opening
  lastCutTime: number; // Hour of day (0-23) for last booking
}

export interface BarberState {
  id: BarberId;
  name: string;
  waitDurationMinutes: number;
  isAvailable: boolean;
  queue: Client[];
}

export interface QueueState {
  clients: Client[];
  barbers: BarberState[];
  settings: Settings;
}
