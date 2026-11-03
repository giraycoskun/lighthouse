import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement>
const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

export function BeaconIcon(props: Props) { return <svg {...base} {...props}><path d="M9 3h6l1.5 18h-9L9 3Z"/><path d="M7.8 14h8.4M8.3 9h7.4M6 21h12M4 7 2 8m18-1 2 1M4 3 2 2m18 1 2-1"/></svg> }
export function PulseIcon(props: Props) { return <svg {...base} {...props}><path d="M3 12h4l2-6 4 12 2-6h6"/></svg> }
export function ClockIcon(props: Props) { return <svg {...base} {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> }
export function CloudIcon(props: Props) { return <svg {...base} {...props}><path d="M17.5 19H7a5 5 0 1 1 1.7-9.7A6 6 0 0 1 20 12a3.5 3.5 0 0 1-2.5 7Z"/></svg> }
export function ShieldIcon(props: Props) { return <svg {...base} {...props}><path d="M12 3 5 6v5c0 4.5 2.8 8.4 7 10 4.2-1.6 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg> }
export function RefreshIcon(props: Props) { return <svg {...base} {...props}><path d="M20 11a8 8 0 1 0-2.3 5.7L20 14"/><path d="M20 6v5h-5"/></svg> }
