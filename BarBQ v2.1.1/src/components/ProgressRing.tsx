import { type FC } from 'react';

interface ProgressRingProps {
    progress: number; // 0-100
    size?: number;
    strokeWidth?: number;
    className?: string;
    mode?: 'fill' | 'deplete';
}

export const ProgressRing: FC<ProgressRingProps> = ({
    progress,
    size = 48,
    strokeWidth = 4,
    className = "",
    mode = 'fill'
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const displayProgress = mode === 'deplete' ? (100 - progress) : progress;
    const offset = circumference - (displayProgress / 100) * circumference;

    // Dynamic color based on progress
    const getColor = () => {
        if (progress >= 100) return 'stroke-red-500';
        if (progress >= 90) return 'stroke-orange-500';
        return 'stroke-primary';
    };

    return (
        <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                {/* Background Circle */}
                <circle
                    className="stroke-surfaceHighlight"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                {/* Progress Circle */}
                <circle
                    className={`${getColor()} transition-all duration-500 ease-out`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-text-main">{Math.round(progress)}%</span>
            </div>
        </div>
    );
};
