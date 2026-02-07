import { useState, useMemo } from 'react';
import { useQueue } from '../hooks/useQueue';
import { queueManager } from '../services/queueManager';
import type { Client } from '../types';
import { DndContext, useDraggable, useDroppable, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// --- Types ---
type CalendarEvent = {
    id: string;
    client: Client;
    barberId: string;
    startTime: number; // Timestamp
    endTime: number;
    type: 'remote' | 'walk-in' | 'in-chair' | 'finished';
    isConflict?: boolean;
};

interface CalendarViewProps {
    onAddClient: (barberId: string, time: Date) => void;
}

// --- Helpers ---
// --- Helpers ---
// Dynamic constants now derived from settings in component
const PIXELS_PER_MINUTE = 2;

const getTopOffset = (timestamp: number, startHour: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const totalMinutes = (hours * 60) + minutes - (startHour * 60);
    return Math.max(0, totalMinutes * PIXELS_PER_MINUTE);
};

const getTimeFromOffset = (yOffset: number, startHour: number) => {
    const totalMinutes = (yOffset / PIXELS_PER_MINUTE) + (startHour * 60);
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setMinutes(totalMinutes);
    return date.getTime();
};

export function CalendarView({ onAddClient }: CalendarViewProps) {
    const { clients, barbers, settings } = useQueue();
    const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);

    const startHour = settings?.firstCutTime ?? 9;
    const endHour = settings?.lastCutTime ?? 18;
    const avgCutTime = settings?.averageCutTimeMinutes || 20;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const useMemoResult = useMemo(() => {
        const evts: CalendarEvent[] = [];
        const barberFinishTimes: Record<string, number> = {};

        const now = Date.now();
        barbers.forEach(b => {
            const dayStart = new Date();
            dayStart.setHours(startHour, 0, 0, 0);
            barberFinishTimes[b.id] = Math.max(now, dayStart.getTime());
        });

        // Sort: Time-based (Reservation or Check-in updates)
        const sortedClients = [...clients].sort((a, b) => {
            const timeA = a.reservationTime || a.checkInTime;
            const timeB = b.reservationTime || b.checkInTime;
            return timeA - timeB;
        });

        sortedClients.forEach(c => {
            let barberId = c.assignedBarber || c.barberPreference;
            if (barberId === 'next_available') {
                const bestBarber = barbers.reduce((best, current) => {
                    const finishTime = barberFinishTimes[current.id] || 0;
                    const bestTime = barberFinishTimes[best.id] || 0;
                    return finishTime < bestTime ? current : best;
                }, barbers[0]);
                barberId = bestBarber?.id;
            }

            if (!barberId || !barberFinishTimes[barberId]) return;

            let startTime = c.reservationTime;
            let durationMs = avgCutTime * 60000;

            // DEV MODE: Fixed 20 mins for everything? User said "assume each cut is 20minutes".
            // We should use this for In-Chair and Finished to be consistent.

            if (c.status === 'finished' && c.serviceStartTime) {
                // History: Use actual start and end
                startTime = c.serviceStartTime;
                if (c.serviceEndTime) {
                    // durationMs = c.serviceEndTime - c.serviceStartTime; // Real duration
                    durationMs = 20 * 60000; // FOR DEV: Fixed 20 mins as requested
                }
            } else if (c.status === 'in_chair' && c.serviceStartTime) {
                // In Chair: Fixed start
                startTime = c.serviceStartTime;
                durationMs = 20 * 60000; // FOR DEV: Fixed 20 mins
            } else if (!startTime) {
                // Waiting: Predicted start
                startTime = barberFinishTimes[barberId];
            }

            const endTime = startTime + durationMs;

            // Update availability cursor only if this is a future/active event affecting queue
            // Finished events shouldn't push the cursor if they are in the past, 
            // BUT if we are reconstructing the day, we need to respect them.
            if (endTime > barberFinishTimes[barberId]) {
                barberFinishTimes[barberId] = endTime;
            }

            evts.push({
                id: c.id,
                client: c,
                barberId,
                startTime,
                endTime,
                type: c.reservationTime ? 'remote' : (c.status === 'in_chair' ? 'in-chair' : (c.status === 'finished' ? 'finished' : 'walk-in'))
            });
        });

        // Conflict Detection
        // Sort events by start time per barber
        // Simple O(N^2) checkout for overlaps
        evts.forEach(target => {
            const overlapping = evts.find(other =>
                other.id !== target.id &&
                other.barberId === target.barberId &&
                other.startTime < target.endTime &&
                other.endTime > target.startTime
            );
            if (overlapping) {
                target.isConflict = true;
                if (overlapping) overlapping.isConflict = true;
            }
        });

        // Calculate max time to expand calendar dynamically if needed
        let maxEventTime = now;
        evts.forEach(e => {
            if (e.endTime > maxEventTime) maxEventTime = e.endTime;
        });

        // Convert maxEventTime to hour
        const maxEventHour = new Date(maxEventTime).getHours() + 1;
        const dynamicEndHour = Math.max(endHour, maxEventHour);

        return { evts, dynamicEndHour };
    }, [clients, barbers, avgCutTime, startHour, endHour]);

    const events = useMemoResult.evts;
    const currentEndHour = useMemoResult.dynamicEndHour;

    const handleDragStart = (event: any) => {
        const { active } = event;
        const found = events.find(e => e.id === active.id);
        if (found) setDraggedEvent(found);
    };

    const handleDragEnd = (event: any) => {
        const { active, over, delta } = event;
        setDraggedEvent(null);
        if (!over) return;

        const evt = events.find(e => e.id === active.id);
        if (!evt) return;

        const originalY = getTopOffset(evt.startTime, startHour);
        const newY = originalY + delta.y;
        const snappedY = Math.round(newY / 30) * 30;
        const newTime = getTimeFromOffset(snappedY, startHour);
        const newBarberId = over.id;

        queueManager.updateClientTimeSlot(evt.client.id, newTime, newBarberId);
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div style={{
                height: '100%', display: 'flex', flexDirection: 'column', background: '#0f1115',
                color: '#fff', borderRadius: '16px', border: '1px solid #333', overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #333', background: '#1a1d24' }}>
                    <div style={{ width: '60px', borderRight: '1px solid #333' }}></div>
                    {barbers.map(b => (
                        <div key={b.id} style={{ flex: 1, padding: '1rem', textAlign: 'center', fontWeight: 'bold', borderRight: '1px solid #333', color: '#ccc', fontFamily: 'serif', fontSize: '1.1rem' }}>
                            {b.name}
                        </div>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', position: 'relative', background: 'repeating-linear-gradient(0deg, #1a1d24 0px, transparent 1px, transparent 59px, #1a1d24 60px)' }}>

                    {Array.from({ length: currentEndHour - startHour + 1 }, (_, i) => i + startHour).map(hour => (
                        <div key={hour} style={{
                            position: 'absolute',
                            top: (hour - startHour) * 60 * PIXELS_PER_MINUTE,
                            left: 0, width: '60px', textAlign: 'right', paddingRight: '10px',
                            fontSize: '0.8rem', color: '#666', transform: 'translateY(-50%)'
                        }}>
                            {hour}:00
                        </div>
                    ))}

                    <div style={{ position: 'relative', height: (currentEndHour - startHour) * 60 * PIXELS_PER_MINUTE + 'px', marginLeft: '60px', display: 'flex' }}>
                        {barbers.map(b => (
                            <DroppableColumn
                                key={b.id}
                                id={b.id}
                                onClick={(e) => {
                                    const offsetY = e.nativeEvent.offsetY;
                                    const snappedY = Math.round(offsetY / 30) * 30;
                                    const time = getTimeFromOffset(snappedY, startHour);
                                    onAddClient(b.id, new Date(time));
                                }}
                            >
                                {/* Render Soft-Lock Zones (Behind events) */}
                                {events.filter(e => e.barberId === b.id && e.type === 'remote').map(evt => {
                                    // Soft Lock: 30 mins before start
                                    const bufferMs = 30 * 60000;
                                    const lockStart = evt.startTime - bufferMs;
                                    const top = getTopOffset(lockStart, startHour);
                                    const height = (bufferMs / 60000) * PIXELS_PER_MINUTE;

                                    return (
                                        <div key={`lock-${evt.id}`} style={{
                                            position: 'absolute',
                                            top: `${top}px`,
                                            height: `${height}px`,
                                            left: '4px', right: '4px',
                                            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%)',
                                            borderTop: '1px dashed rgba(234, 179, 8, 0.5)',
                                            borderRadius: '6px 6px 0 0',
                                            zIndex: 5,
                                            pointerEvents: 'none',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <span style={{ fontSize: '0.6rem', color: 'rgba(234, 179, 8, 0.8)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                Soft Lock
                                            </span>
                                        </div>
                                    );
                                })}

                                {events.filter(e => e.barberId === b.id).map(evt => (
                                    <DraggableEvent key={evt.id} event={evt} startHour={startHour} />
                                ))}
                            </DroppableColumn>
                        ))}
                    </div>
                </div>
                <DragOverlay>
                    {draggedEvent ? <EventCard event={draggedEvent} isOverlay /> : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
}

function DroppableColumn({ id, children, onClick }: { id: string, children: React.ReactNode, onClick: (e: React.MouseEvent) => void }) {
    const { setNodeRef } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            style={{ flex: 1, position: 'relative', borderRight: '1px solid #222', cursor: 'cell' }}
        >
            {children}
        </div>
    );
}

function DraggableEvent({ event, startHour }: { event: CalendarEvent, startHour: number }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: event.id, data: event });
    const style = {
        transform: CSS.Translate.toString(transform),
        position: 'absolute' as const,
        top: getTopOffset(event.startTime, startHour) + 'px',
        height: (event.endTime - event.startTime) / 60000 * PIXELS_PER_MINUTE + 'px',
        left: '4px', right: '4px', opacity: isDragging ? 0.3 : 1, zIndex: isDragging ? 20 : 10,
    };
    // Stop propagation on click to allow dragging without triggering column click
    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={(e) => e.stopPropagation()}>
            <EventCard event={event} />
        </div>
    );
}

function EventCard({ event, isOverlay }: { event: CalendarEvent, isOverlay?: boolean }) {
    const isRemote = event.type === 'remote';
    const isInChair = event.type === 'in-chair';
    const isFinished = event.type === 'finished';
    const isConflict = event.isConflict;

    return (
        <div style={{
            height: '100%',
            background: isFinished ? '#2d333b' : (isInChair ? 'rgba(34, 197, 94, 0.2)' : (isRemote ? '#2a2a2a' : 'rgba(255,255,255,0.05)')),
            border: isConflict ? '2px solid var(--color-danger)' : (isFinished ? '1px solid #333' : (isInChair ? '1px solid var(--color-success)' : (isRemote ? '1px solid #444' : '1px dashed #444'))),
            borderLeft: isRemote ? '3px solid var(--color-gold)' : undefined,
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '0.75rem',
            overflow: 'hidden',
            color: isFinished ? '#aaa' : '#eee', // Dim text for history
            cursor: 'grab',
            opacity: isFinished ? 0.8 : 1,
            boxShadow: isOverlay ? '0 5px 15px rgba(0,0,0,0.5)' : 'none',
            display: 'flex', flexDirection: 'column', justifyContent: 'center'
        }}>
            <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isRemote && <span>🌎</span>}
                {isConflict && <span style={{ color: 'var(--color-danger)' }}>⚠</span>}
                {event.client.name}
            </div>
            <div style={{ color: '#888', fontSize: '0.7rem' }}>
                {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            {isRemote && !isOverlay && (
                <div style={{
                    position: 'absolute', top: -30 * PIXELS_PER_MINUTE + 'px', left: 0, right: 0,
                    height: 30 * PIXELS_PER_MINUTE + 'px',
                    background: 'linear-gradient(to bottom, transparent, rgba(234, 179, 8, 0.1))',
                    pointerEvents: 'none', borderRadius: '6px 6px 0 0'
                }} title="Soft-Lock Buffer" />
            )}
        </div>
    );
}
