/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                google: {
                    blue: '#4285F4',
                    red: '#EA4335',
                    yellow: '#FBBC05',
                    green: '#34A853',
                    gray: {
                        50: '#F8F9FA',
                        100: '#F1F3F4',
                        200: '#E8EAED',
                        300: '#DADCE0',
                        400: '#BDC1C6',
                        500: '#9AA0A6',
                        600: '#80868B',
                        700: '#5F6368',
                        800: '#3C4043',
                        900: '#202124',
                    }
                }
            },
            boxShadow: {
                'google': '0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
                'google-hover': '0 1px 3px 0 rgba(60,64,67,.3), 0 4px 8px 3px rgba(60,64,67,.15)',
            },
            borderRadius: {
                'google': '8px',
            }
        },
    },
    plugins: [],
}
