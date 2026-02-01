import { useState, useEffect } from 'react';
import { CustomerLanding } from './pages/CustomerLanding';
import { CustomerTicket } from './pages/CustomerTicket';
import { BarberDashboard } from './pages/BarberDashboard';

import { ShopDisplay } from './pages/ShopDisplay';

function App() {
  const [route, setRoute] = useState<'landing' | 'ticket' | 'dashboard' | 'shop'>('landing');
  const [ticketId, setTicketId] = useState<string | null>(null);

  useEffect(() => {
    // Simple routing via URL hash for demo/dev speed
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash === '#dashboard' || hash === '#staff') {
        setRoute('dashboard');
      } else if (hash === '#shop') {
        setRoute('shop');
      } else if (ticketId) {
        setRoute('ticket');
      } else {
        setRoute('landing');
      }
    };

    window.addEventListener('hashchange', checkHash);
    checkHash();

    return () => window.removeEventListener('hashchange', checkHash);
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
    if (saved && route !== 'dashboard' && route !== 'shop') {
      setTicketId(saved);
      setRoute('ticket');
    }
  }, []);

  if (route === 'shop') return <ShopDisplay />;
  if (route === 'dashboard') return <BarberDashboard />;
  if (route === 'ticket' && ticketId) return <CustomerTicket clientId={ticketId} onClear={handleClear} />;

  return <CustomerLanding onJoin={handleJoin} />;
}

export default App;
