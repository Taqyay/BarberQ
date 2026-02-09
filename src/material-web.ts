// Material Web Components - M3 Integration for React
// This file imports and registers Material Web components for use in the app

import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/chips/chip-set.js';
import '@material/web/chips/assist-chip.js';
import '@material/web/chips/filter-chip.js';
import '@material/web/divider/divider.js';
import '@material/web/elevation/elevation.js';
import '@material/web/fab/fab.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';
import '@material/web/menu/menu.js';
import '@material/web/menu/menu-item.js';
import '@material/web/progress/circular-progress.js';
import '@material/web/progress/linear-progress.js';
import '@material/web/radio/radio.js';
import '@material/web/ripple/ripple.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/slider/slider.js';
import '@material/web/switch/switch.js';
import '@material/web/tabs/tabs.js';
import '@material/web/tabs/primary-tab.js';
import '@material/web/tabs/secondary-tab.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/textfield/filled-text-field.js';

// Import typography styles
import { styles as typescaleStyles } from '@material/web/typography/md-typescale-styles.js';

// Apply typescale styles to document
if (typeof document !== 'undefined' && typescaleStyles.styleSheet) {
    document.adoptedStyleSheets.push(typescaleStyles.styleSheet);
}

// Declare global types for TypeScript/JSX support
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'md-filled-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { disabled?: boolean }, HTMLElement>;
            'md-outlined-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { disabled?: boolean }, HTMLElement>;
            'md-text-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { disabled?: boolean }, HTMLElement>;
            'md-checkbox': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { checked?: boolean; disabled?: boolean }, HTMLElement>;
            'md-circular-progress': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { value?: number; indeterminate?: boolean }, HTMLElement>;
            'md-linear-progress': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { value?: number; indeterminate?: boolean }, HTMLElement>;
            'md-elevation': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'md-divider': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'md-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'md-icon-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { disabled?: boolean }, HTMLElement>;
            'md-fab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string; variant?: string }, HTMLElement>;
            'md-list': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'md-list-item': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { headline?: string; supportingText?: string }, HTMLElement>;
            'md-ripple': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'md-switch': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { selected?: boolean; disabled?: boolean }, HTMLElement>;
            'md-tabs': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'md-primary-tab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { active?: boolean }, HTMLElement>;
            'md-secondary-tab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { active?: boolean }, HTMLElement>;
            'md-outlined-text-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string; value?: string }, HTMLElement>;
            'md-filled-text-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string; value?: string }, HTMLElement>;
            'md-chip-set': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'md-assist-chip': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string }, HTMLElement>;
            'md-filter-chip': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string; selected?: boolean }, HTMLElement>;
        }
    }
}

export { };
