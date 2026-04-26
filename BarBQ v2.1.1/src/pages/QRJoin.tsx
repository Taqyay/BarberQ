import { QRCodeSVG } from 'qrcode.react';

export function QRJoin() {
  const joinUrl = `${window.location.origin}/book`;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center font-sans">
      <div className="max-w-md w-full bg-surface p-12 rounded-[32px] shadow-l border border-border flex flex-col items-center gap-8 fade-in">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-text-main">
            BarberQ <span className="text-primary">Join</span>
          </h1>
          <p className="text-text-secondary font-medium uppercase tracking-widest text-sm">
            Scan to Join the Line
          </p>
        </div>

        <div className="p-6 bg-white rounded-2xl border-4 border-primary shadow-m">
          <QRCodeSVG 
            value={joinUrl} 
            size={256}
            level="H"
            includeMargin={false}
            imageSettings={{
              src: "/vite.svg",
              x: undefined,
              y: undefined,
              height: 40,
              width: 40,
              excavate: true,
            }}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-text-main font-semibold justify-center">
            <span className="material-icons text-primary">smartphone</span>
            <span>No App Required</span>
          </div>
          <p className="text-text-tertiary text-sm leading-relaxed">
            Scan the QR code to check wait times, book your professional, and receive real-time notifications.
          </p>
        </div>
      </div>

      <footer className="mt-12 text-text-tertiary font-medium uppercase tracking-widest text-xs">
        &copy; 2026 BarberQ Digital Queue Sovereign
      </footer>
    </div>
  );
}
