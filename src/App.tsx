import { useState, useEffect, lazy, Suspense } from 'react';
import { simulationService } from './services/simulation';

const CustomerLanding = lazy(() => import('./pages/CustomerLanding').then(module => ({ default: module.CustomerLanding })));
const CustomerTicket = lazy(() => import('./pages/CustomerTicket').then(module => ({ default: module.CustomerTicket })));
const BarberDashboard = lazy(() => import('./pages/BarberDashboard').then(module => ({ default: module.BarberDashboard })));
const ShopDisplay = lazy(() => import('./pages/ShopDisplay').then(module => ({ default: module.ShopDisplay })));
const RemotePortal_Mobile = lazy(() => import('./pages/RemotePortal_Mobile').then(module => ({ default: module.RemotePortal_Mobile })));
const QRJoin = lazy(() => import('./pages/QRJoin').then(module => ({ default: module.QRJoin })));

function App() {
  // Global UAT Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'U') {
        simulationService.start();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [route, setRoute] = useState<'landing' | 'ticket' | 'dashboard' | 'shop' | 'book' | 'join'>('landing');
  const [ticketId, setTicketId] = useState<string | null>(null);

  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;

      if (path === '/dashboard' || hash === '#dashboard' || hash === '#staff') {
        setRoute('dashboard');
      } else if (path === '/shop' || hash === '#shop') {
        setRoute('shop');
      } else if (path === '/join' || hash === '#join' || path === '/qr' || hash === '#qr') {
        setRoute('join');
      } else if (path === '/book' || hash === '#remote' || hash === '#book') {
        setRoute('book');
      } else if (ticketId) {
        setRoute('ticket');
      } else {
        setRoute('landing');
      }
    };

    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute); // Handle browser back/forward
    checkRoute();

    return () => {
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('popstate', checkRoute);
    };
  }, [ticketId]);

  const handleJoin = (id: string) => {
    setTicketId(id);
    localStorage.setItem('barberq_my_ticket', id); // Persist refresh
    setRoute('ticket');
  };

  const handleClear = () => {
    setTicketId(null);
    localStorage.removeItem('barberq_my_ticket');
    setRoute('landing');
  };

  // Restore session
  useEffect(() => {
    const saved = localStorage.getItem('barberq_my_ticket');
    if (saved && route !== 'dashboard' && route !== 'shop' && route !== 'book' && route !== 'join') {
      setTicketId(saved);
      setRoute('ticket');
    }
  }, []);

  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#888' }}>Loading...</div>}>
      {route === 'shop' && <ShopDisplay />}
      {route === 'dashboard' && <BarberDashboard />}
      {route === 'book' && <RemotePortal_Mobile />}
      {route === 'join' && <QRJoin />}
      {route === 'ticket' && ticketId && <CustomerTicket clientId={ticketId} onClear={handleClear} />}
      {route === 'landing' && <CustomerLanding onJoin={handleJoin} />}
    </Suspense>
  );
}

export default App;
