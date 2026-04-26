
interface AvatarProps {
    name: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

// Pastel color palette for avatars
const AVATAR_COLORS = [
    '#E8D4F8', // Lavender
    '#D4E8F8', // Sky blue
    '#F8E8D4', // Peach
    '#D4F8E8', // Mint
    '#F8D4E8', // Pink
    '#E8F8D4', // Light green
];

// Generate consistent color based on name
function getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
}

// Get initials from name
function getInitials(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 1).toUpperCase();
}

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
    const bgColor = getAvatarColor(name);
    const initials = getInitials(name);

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-base',
        lg: 'w-16 h-16 text-xl',
    };

    return (
        <div
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold ${className}`}
            style={{ backgroundColor: bgColor, color: '#1F1F1F' }}
        >
            {initials}
        </div>
    );
}
