export type BarberId = 'Mo' | 'Steve' | 'Sarah' | 'next_available';

export type ClientStatus = 'waiting' | 'in_chair' | 'finished' | 'cancelled' | 'snoozed';

export interface Client {
  id: string;
  name: string;
  barberPreference: BarberId;
  status: ClientStatus;
  checkInTime: number;
  assignedBarber?: BarberId; // If preference was 'next_available', this is who claimed them
  snoozeStartTime?: number; // Timestamp when they were marked 'Not Here'
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
}
