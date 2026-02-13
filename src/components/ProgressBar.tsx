import * as Progress from '@radix-ui/react-progress';

interface ProgressBarProps {
    progress: number; // 0-100
    className?: string;
}

export function ProgressBar({ progress, className = "" }: ProgressBarProps) {
    return (
        <Progress.Root
            className={`relative overflow-hidden bg-surface border border-border rounded-full w-full h-3 shadow-inner ${className}`}
            style={{
                // Fix overflow clipping in Safari
                // https://gist.github.com/clubber/118200
                transform: 'translateZ(0)',
            }}
            value={progress}
        >
            <Progress.Indicator
                className="bg-primary w-full h-full transition-transform duration-[660ms] ease-[cubic-bezier(0.65, 0, 0.35, 1)] shadow-[0_0_12px_rgba(197,160,89,0.3)]"
                style={{ transform: `translateX(-${100 - progress}%)` }}
            />
        </Progress.Root>
    );
}
