import type { Client } from '../types';

/**
 * Calculates the 'Effective Time' for sorting clients.
 * Matches Server Logic:
 * 1. Reservation Time (Smart Timeslot) overrides everything.
 * 2. Original Check-in Time (for accuracy across resets/edits).
 * 3. Fallback to Check-in Time.
 * 4. Adds 30m penalty for Remote '30+' travel (Legacy).
 */
export const getEffectiveTime = (c: Client): number => {
    // RULE: Smart Timeslot / Reservation
    if (c.reservationTime) {
        return c.reservationTime;
    }

    // Base time
    let time = c.originalCheckInTime || c.checkInTime;

    // Legacy Remote Penalty
    if (c.source === 'remote' && c.travelTime === '30+' && !c.reservationTime) {
        time += (30 * 60 * 1000);
    }

    return time;
};

/**
 * Standard Comparator for Queue Sorting.
 * Sorts by Effective Time ASC (Earliest first).
 */
export const sortByEffectiveTime = (a: Client, b: Client): number => {
    return getEffectiveTime(a) - getEffectiveTime(b);
};
