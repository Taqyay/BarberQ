import { useState, useEffect, useRef } from 'react';

export type RouteState = 'landing' | 'ticket' | 'dashboard' | 'shop' | 'book' | 'join';

export function useRoute(ticketId: string | null) {
  const [route, setRoute] = useState<RouteState>('landing');
  const ticketIdRef = useRef(ticketId);

  useEffect(() => {
    ticketIdRef.current = ticketId;
  }, [ticketId]);

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
      } else if (ticketIdRef.current) {
        setRoute('ticket');
      } else {
        setRoute('landing');
      }
    };

    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);
    checkRoute();

    return () => {
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('popstate', checkRoute);
    };
  }, []);

  return { route, setRoute };
}
