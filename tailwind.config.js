/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'm3-primary': 'var(--m3-primary)',
                'm3-on-primary': 'var(--m3-on-primary)',
                'm3-primary-container': 'var(--m3-primary-container)',
                'm3-on-primary-container': 'var(--m3-on-primary-container)',
                'm3-secondary': 'var(--m3-secondary)',
                'm3-on-secondary': 'var(--m3-on-secondary)',
                'm3-secondary-container': 'var(--m3-secondary-container)',
                'm3-on-secondary-container': 'var(--m3-on-secondary-container)',
                'm3-surface': 'var(--m3-surface)',
                'm3-on-surface': 'var(--m3-on-surface)',
                'm3-surface-variant': 'var(--m3-surface-variant)',
                'm3-on-surface-variant': 'var(--m3-on-surface-variant)',
                'm3-outline': 'var(--m3-outline)',
            },
            borderRadius: {
                'm3-xs': '4px',
                'm3-sm': '8px',
                'm3-md': '12px',
                'm3-lg': '16px',
                'm3-xl': '28px',
                'm3-full': '100px',
            }
        },
    },
    plugins: [],
}
