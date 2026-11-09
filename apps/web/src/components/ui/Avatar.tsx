import { cn } from '../../lib/utils'

const palettes = [
  { bg: '#DDF0EA', skin: '#9C5B34', hair: '#1C1411', shirt: '#0E7C72' },
  { bg: '#FCE8D5', skin: '#B06E3F', hair: '#241A14', shirt: '#1D4ED8' },
  { bg: '#E7E5FF', skin: '#7A4A2A', hair: '#16110E', shirt: '#7C3AED' },
  { bg: '#FDE2E2', skin: '#C68642', hair: '#2A1C14', shirt: '#BE123C' },
  { bg: '#E4F0D9', skin: '#8D5524', hair: '#151210', shirt: '#B45309' },
  { bg: '#FFF0C7', skin: '#A5673F', hair: '#1F1712', shirt: '#065F46' },
]

const sizes = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-24 w-24',
  xl: 'h-32 w-32',
}

export interface AvatarProps {
  name: string
  variant?: number
  size?: keyof typeof sizes
  className?: string
}

export function Avatar({ name, variant = 0, size = 'md', className }: AvatarProps) {
  const palette = palettes[Math.abs(variant) % palettes.length]
  const hairStyle = Math.abs(variant) % 4
  const hasBeard = Math.abs(variant) % 3 === 0

  return (
    <span
      role="img"
      aria-label={name}
      className={cn('inline-block shrink-0 overflow-hidden rounded-full', sizes[size], className)}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        <rect width="100" height="100" fill={palette.bg} />
        <path d="M12 102c2-19 17-29 38-29s36 10 38 29z" fill={palette.shirt} />
        <path d="M44 70h12v10a6 6 0 0 1-12 0z" fill={palette.skin} />
        <circle cx="50" cy="45" r="22" fill={palette.skin} />
        <circle cx="27" cy="46" r="4" fill={palette.skin} />
        <circle cx="73" cy="46" r="4" fill={palette.skin} />
        {hairStyle === 0 ? (
          <path d="M28 43c0-15 9-25 22-25s22 10 22 25c-4-8-11-13-22-13s-18 5-22 13z" fill={palette.hair} />
        ) : null}
        {hairStyle === 1 ? (
          <path d="M27 44c-1-16 10-27 24-27 13 0 23 9 23 24-6-3-9-9-10-14-7 6-20 8-30 5-2 3-4 7-7 12z" fill={palette.hair} />
        ) : null}
        {hairStyle === 2 ? (
          <path d="M28 41c0-14 10-23 22-23 13 0 22 9 22 23-3-10-11-15-22-15-10 0-18 5-22 15z" fill={palette.hair} />
        ) : null}
        {hairStyle === 3 ? (
          <path d="M29 39c2-12 10-21 21-21 12 0 20 8 21 21-5-7-12-10-21-10-8 0-16 3-21 10z" fill={palette.hair} />
        ) : null}
        <circle cx="42" cy="45" r="1.9" fill="#241812" />
        <circle cx="58" cy="45" r="1.9" fill="#241812" />
        <path d="M45 54c2 2 3 2 5 2s3 0 5-2" stroke="#6B3E2E" strokeWidth="1.7" strokeLinecap="round" fill="none" />
        {hasBeard ? (
          <path d="M34 50c1 10 6 16 16 16s15-6 16-16c-4 6-9 9-16 9s-12-3-16-9z" fill={palette.hair} opacity="0.85" />
        ) : null}
        <path d="M42 81c2 2 5 3 8 3s6-1 8-3" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
      </svg>
    </span>
  )
}
