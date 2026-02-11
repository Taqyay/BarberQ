interface ProgressRingProps {
    progress: number; // 0-100
    size?: number;
    strokeWidth?: number;
}

export function ProgressRing({ progress, size = 80, strokeWidth = 6 }: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            {/* Background Circle */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth={strokeWidth}
                opacity={0.3}
            />
            {/* Progress Circle */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
                style={{
                    filter: 'drop-shadow(0 0 8px var(--color-primary))'
                }}
            />
        </svg>
    );
}
