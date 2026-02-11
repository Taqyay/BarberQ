import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
    theme: {
        extend: {
            colors: {
                primary: 'var(--color-primary)',
                surface: 'var(--color-surface)',
                surfaceHighlight: 'var(--color-surfaceHighlight)',
                background: 'var(--color-background)',
                border: 'var(--color-border)',
                'text-main': 'var(--color-text-main)',
                'text-secondary': 'var(--color-text-secondary)',
            },
            fontFamily: {
                heading: 'var(--font-heading)',
                body: 'var(--font-body)',
                sans: 'var(--font-body)',
            },
            boxShadow: {
                's': 'var(--shadow-s)',
                'm': 'var(--shadow-m)',
                'l': 'var(--shadow-l)',
            },
            borderRadius: {
                'xl': '20px',
                '2xl': '24px',
            }
        }
    },
    plugins: [require("tailwindcss-animate")],
} satisfies Config;
