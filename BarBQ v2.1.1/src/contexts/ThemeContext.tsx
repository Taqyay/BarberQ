import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { queueManager } from '../services/queueManager';

export type ThemeId = 'sovereign-cobalt' | 'golden-sand' | 'classic-slate';

interface ThemeContextValue {
    theme: ThemeId;
    setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeId>(() => {
        const saved = localStorage.getItem('barberq-theme');
        return (saved as ThemeId) || 'golden-sand';
    });

    useEffect(() => {
        const unsubscribe = queueManager.subscribe(() => {
            const settings = queueManager.getSettings();
            if (settings.theme && settings.theme !== theme) {
                setThemeState(settings.theme as ThemeId);
            }
        });
        return unsubscribe;
    }, [theme]);

    useEffect(() => {
        console.log('🎨 Setting theme:', theme);
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('barberq-theme', theme);
    }, [theme]);

    const setTheme = (newTheme: ThemeId) => {
        setThemeState(newTheme);
        // Persist to server if it differs from current server setting
        const currentServerTheme = queueManager.getSettings().theme;
        if (newTheme !== currentServerTheme) {
            queueManager.updateSettings({ theme: newTheme });
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}

export const THEMES = {
    'sovereign-cobalt': {
        id: 'sovereign-cobalt' as const,
        name: 'Sovereign Cobalt',
        primary: '#1B22B1',
        font: 'Archivo',
    },
    'golden-sand': {
        id: 'golden-sand' as const,
        name: 'Golden Sand',
        primary: '#D0BB95',
        font: 'Manrope',
    },
    'classic-slate': {
        id: 'classic-slate' as const,
        name: 'Classic Slate',
        primary: '#41484a',
        font: 'Inter',
    },
} as const;
