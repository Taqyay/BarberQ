import { useState, useEffect } from 'react';
import { useQueue } from '../hooks/useQueue';

import type { Client } from '../types';

export function ShopDisplay() {
    const { clients, barbers } = useQueue();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Logic: In-Chair clients
    const activeClients = clients.filter(c => c.status === 'in_chair');

    // Logic: Next Available Queue (Waiting)
    // Filter out clients who are assigned to a specific barber
    const nextAvailableQueue = clients.filter(c => c.status === 'waiting' && c.barberPreference === 'next_available');

    return (
        <div className="min-h-screen bg-background text-text-main font-sans selection:bg-primary/30 overflow-hidden flex flex-col">
            {/* --- Header --- */}
            <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-surface/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                        <span className="material-icons text-primary text-2xl">content_cut</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-text-main">BarberQ <span className="text-primary">Live</span></h1>
                        <p className="text-xs text-text-secondary font-medium tracking-widest uppercase">Shop Status Monitor</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-3xl font-bold leading-none text-text-main tabular-nums">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-text-secondary font-medium uppercase tracking-widest">
                            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                </div>
            </header>

            {/* --- Main Grid Content --- */}
            <main className="flex-1 p-8 grid grid-cols-4 gap-6 content-start">

                {/* --- Column 1: Next Available Queue --- */}
                <section className="col-span-1 flex flex-col gap-4 h-full">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(197,160,89,0.5)]"></span>
                            Next Available
                        </h2>
                        <span className="bg-surfaceHighlight px-2.5 py-0.5 rounded-md text-xs font-bold text-text-secondary border border-border">
                            {nextAvailableQueue.length}
                        </span>
                    </div>

                    <div className="flex-1 bg-surface/30 rounded-2xl border border-border/50 p-4 overflow-y-auto space-y-3 shadow-inner">
                        {nextAvailableQueue.length === 0 ? (
                            <div className="h-32 flex flex-col items-center justify-center text-text-secondary/40 italic">
                                <span>No clients waiting</span>
                            </div>
                        ) : (
                            nextAvailableQueue.map((client, i) => (
                                <QueueCard key={client.id} client={client} index={i} />
                            ))
                        )}

                        {/* QR Code Placeholder (Visual Only) */}
                        <div className="mt-auto pt-6 flex flex-col items-center gap-3 opacity-60">
                            <div className="w-24 h-24 bg-white p-1 rounded-lg">
                                {/* Placeholder for QR */}
                                <div className="w-full h-full bg-black/10"></div>
                            </div>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest">Join Queue Remotely</p>
                        </div>
                    </div>
                </section>

                {/* --- Columns 2-4: Barber Stations --- */}
                {barbers.map(barber => {
                    const clientInChair = activeClients.find(c =>
                        c.assignedBarber === barber.id ||
                        (c.assignedBarber === undefined && c.barberPreference === barber.id) // Fallback logic
                    );

                    // Specific Waiting for this barber
                    const barberQueue = clients.filter(c => c.status === 'waiting' && c.barberPreference === barber.id);

                    return (
                        <section key={barber.id} className="col-span-1 flex flex-col gap-4">
                            {/* Barber Header */}
                            <div className="flex items-center gap-3 mb-2 p-2 rounded-xl bg-surface/40 border border-border/50">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 ${barber.isAvailable ? 'border-primary text-primary bg-primary/10' : 'border-text-secondary/30 text-text-secondary/30 bg-text-secondary/10'}`}>
                                    {barber.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className={`text-xl font-bold ${barber.isAvailable ? 'text-text-main' : 'text-text-secondary/50'}`}>
                                        {barber.name}
                                    </h2>
                                    <span className={`text-[10px] uppercase font-bold tracking-widest ${barber.isAvailable ? 'text-primary' : 'text-text-secondary/50'}`}>
                                        {barber.isAvailable ? 'Available' : 'Away'}
                                    </span>
                                </div>
                            </div>

                            {/* In-Chair Status Card */}
                            <div className="relative h-40 w-full">
                                {clientInChair ? (
                                    <div className="absolute inset-0 bg-surface border border-primary/30 rounded-2xl shadow-[0_0_15px_rgba(197,160,89,0.15)] p-5 flex flex-col justify-between overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <span className="material-icons text-6xl text-primary">chair</span>
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 block">In Chair</span>
                                            <h3 className="text-2xl font-bold text-text-main truncate leading-tight">{clientInChair.name}</h3>
                                            <p className="text-xs text-text-secondary mt-1">
                                                Started: {clientInChair.serviceStartTime ? new Date(clientInChair.serviceStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </p>
                                        </div>

                                        <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                                            <div className="h-full bg-primary w-2/3 shadow-[0_0_10px_rgba(197,160,89,0.8)] animate-pulse"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 bg-surface/20 border border-border border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 text-text-secondary/40">
                                        <span className="material-icons text-3xl">event_seat</span>
                                        <span className="text-xs font-bold uppercase tracking-widest">Station Open</span>
                                    </div>
                                )}
                            </div>

                            {/* Barber Specific Queue */}
                            <div className="flex-1 bg-surface/10 rounded-2xl border border-border/30 p-3 min-h-[200px]">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Requests</span>
                                    <span className="text-[10px] font-bold text-text-secondary">{barberQueue.length}</span>
                                </div>
                                <div className="space-y-2">
                                    {barberQueue.map((client, i) => (
                                        <div key={client.id} className="p-3 bg-surface border border-border rounded-xl flex justify-between items-center group hover:border-primary/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary">
                                                    {i + 1}
                                                </div>
                                                <span className="text-sm font-bold text-text-main">{client.name}</span>
                                            </div>
                                            <span className="text-[10px] font-medium text-text-secondary">
                                                {Math.floor((Date.now() - client.checkInTime) / 60000)}m
                                            </span>
                                        </div>
                                    ))}
                                    {barberQueue.length === 0 && (
                                        <p className="text-xs text-text-secondary/30 text-center py-4 italic">No requests</p>
                                    )}
                                </div>
                            </div>
                        </section>
                    );
                })}

            </main>
        </div>
    );
}

// --- Components ---

function QueueCard({ client, index }: { client: Client, index: number }) {
    const waitTime = Math.floor((Date.now() - client.checkInTime) / 60000);
    const isTop3 = index < 3;

    return (
        <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${isTop3 ? 'bg-surface border-border shadow-sm' : 'bg-surface/50 border-border/50 opacity-80'}`}>
            <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${isTop3 ? 'bg-primary/20 text-primary' : 'bg-background text-text-secondary'}`}>
                    {index + 1}
                </div>
                <div>
                    <h3 className="font-bold text-text-main text-sm">{client.name}</h3>
                    <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Walk-in</p>
                </div>
            </div>
            <div className="text-right">
                <span className="text-xs font-bold text-text-main block">{waitTime}m</span>
                <span className="text-[9px] text-text-secondary">wait</span>
            </div>
        </div>
    );
}
