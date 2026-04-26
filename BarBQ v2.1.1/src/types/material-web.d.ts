import { MdFilledButton } from '@material/web/button/filled-button';
import { MdOutlinedButton } from '@material/web/button/outlined-button';
import { MdTextButton } from '@material/web/button/text-button';
import { MdIcon } from '@material/web/icon/icon';
import { MdTabs } from '@material/web/tabs/tabs';
import { MdPrimaryTab } from '@material/web/tabs/primary-tab';
import { MdSecondaryTab } from '@material/web/tabs/secondary-tab';
import { MdOutlinedTextField } from '@material/web/textfield/outlined-text-field';
import { MdOutlinedSelect } from '@material/web/select/outlined-select';
import { MdSelectOption } from '@material/web/select/select-option';
import { MdChipSet } from '@material/web/chips/chip-set';
import { MdFilterChip } from '@material/web/chips/filter-chip';
import { MdCircularProgress } from '@material/web/progress/circular-progress';
import { MdSwitch } from '@material/web/switch/switch';
import { MdList } from '@material/web/list/list';
import { MdListItem } from '@material/web/list/list-item';
import { MdDivider } from '@material/web/divider/divider';
import { MdElevation } from '@material/web/elevation/elevation';
import { MdFab } from '@material/web/fab/fab';
import { MdAssistChip } from '@material/web/chips/assist-chip';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            'md-filled-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdFilledButton>;
            'md-outlined-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdOutlinedButton>;
            'md-text-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdTextButton>;
            'md-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdIcon>;
            'md-tabs': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdTabs>;
            'md-primary-tab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdPrimaryTab>;
            'md-secondary-tab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdSecondaryTab>;
            'md-outlined-text-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdOutlinedTextField>;
            'md-outlined-select': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdOutlinedSelect>;
            'md-select-option': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdSelectOption>;
            'md-chip-set': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdChipSet>;
            'md-filter-chip': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdFilterChip>;
            'md-circular-progress': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdCircularProgress>;
            'md-switch': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdSwitch>;
            'md-list': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdList>;
            'md-list-item': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdListItem>;
            'md-divider': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdDivider>;
            'md-elevation': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdElevation>;
            'md-fab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdFab>;
            'md-assist-chip': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & Partial<MdAssistChip>;
        }
    }
}
