import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const defaults = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function LighthouseIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M9 3h6l1.5 18h-9L9 3Z"/><path d="M7.8 14h8.4M8.3 9h7.4M6 21h12"/><path d="m4 7-2 1M20 7l2 1M4 3l-2-1M20 3l2-1"/></svg>
}

export function DatabaseIcon(props: IconProps) {
  return <svg {...defaults} {...props}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>
}

export function ServerIcon(props: IconProps) {
  return <svg {...defaults} {...props}><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01M11 7h7M11 17h7"/></svg>
}

export function ClockIcon(props: IconProps) {
  return <svg {...defaults} {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
}

export function CodeIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14"/></svg>
}

export function RefreshIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M20 11a8 8 0 1 0-2.3 5.7L20 14"/><path d="M20 6v5h-5"/></svg>
}

export function CheckIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m5 12 4 4L19 6"/></svg>
}

export function PlusIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M12 5v14M5 12h14"/></svg>
}

export function ExternalLinkIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M14 4h6v6M10 14 20 4"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/></svg>
}
