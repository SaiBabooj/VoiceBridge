import { cn } from '../../lib/utils'

const heights = ['h-3', 'h-6', 'h-9', 'h-5', 'h-8', 'h-6', 'h-3']

export function Waveform({ active, className }: { active: boolean; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('flex h-10 items-center justify-center gap-1.5', className)}
    >
      {heights.map((height, index) => (
        <span
          key={index}
          className={cn(
            'w-1.5 rounded-full transition-colors',
            height,
            active ? 'animate-wave bg-brand' : 'bg-line',
          )}
          style={active ? { animationDelay: `${index * 90}ms` } : undefined}
        />
      ))}
    </div>
  )
}
