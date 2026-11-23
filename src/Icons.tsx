import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
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

export function LockIcon(props: IconProps) {
  return <svg {...base} {...props}><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
}

export function EyeIcon({ open = false, ...props }: IconProps & { open?: boolean }) {
  if (!open) return <svg {...base} {...props}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>
  return <svg {...base} {...props}><path d="m3 3 18 18" /><path d="M10.7 6.1A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a15.6 15.6 0 0 1-2.1 2.7M6.4 6.4C3.9 8.1 2.5 12 2.5 12s3.5 6 9.5 6c1.4 0 2.7-.3 3.8-.8" /></svg>
}

export function ShieldIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M12 3 5 6v5c0 4.6 2.8 8.5 7 10 4.2-1.5 7-5.4 7-10V6l-7-3Z" /><path d="m9.5 12 1.6 1.6 3.7-4" /></svg>
}

export function ArrowUpIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m5 11 7-7 7 7M12 4v16" /></svg>
}

export function ArrowDownIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m19 13-7 7-7-7M12 20V4" /></svg>
}

export function PlusIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M12 5v14M5 12h14" /></svg>
}

export function TrashIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
}

export function LogoutIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M10 17l5-5-5-5M15 12H3M14 4h4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4" /></svg>
}

export function WalletIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18v4H6a2 2 0 0 0 0 4h15v7H6.5A2.5 2.5 0 0 1 4 16.5v-10Z" /><path d="M18 12v-4M17 15.5h.01" /></svg>
}

export function EmptyIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M5 7h14v13H5zM8 4h8v3M8 11h8M8 15h5" /></svg>
}

export function ShareIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M12 16V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
}

export function MinusIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M5 12h14" /></svg>
}

export function SavingsIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M5 11a7 7 0 0 1 13-2h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2a7 7 0 0 1-2 2v3h-3v-2H9v2H6v-3a7 7 0 0 1-1-6Z" /><path d="M9 9h5M4 10 2 8M16 6l1-3" /><circle cx="16.5" cy="11" r=".5" fill="currentColor" stroke="none" /></svg>
}

export function CryptoIcon(props: IconProps) {
  return <svg {...base} {...props}><circle cx="12" cy="12" r="9" /><path d="M9 7h4.5a2.5 2.5 0 0 1 0 5H9h5a2.5 2.5 0 0 1 0 5H9M11 5v14M14 5v2M14 17v2" /></svg>
}

export function CalendarIcon(props: IconProps) {
  return <svg {...base} {...props}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
}

export function ReceiptIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>
}

export function CameraIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="4" /></svg>
}

export function ImageIcon(props: IconProps) {
  return <svg {...base} {...props}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m4 17 4.5-4.5 3.2 3.2 2.1-2.1L20 19" /></svg>
}

export function EditIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /><path d="m14 7 3 3" /></svg>
}

export function PeopleIcon(props: IconProps) {
  return <svg {...base} {...props}><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 4.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 4 4.9V20" /></svg>
}

export function HandCoinsIcon(props: IconProps) {
  return <svg {...base} {...props}><circle cx="17.5" cy="6.5" r="3.5" /><path d="M16 6.5h3M3 13h3l2.2-2a3 3 0 0 1 2-.8H14a2 2 0 0 1 0 4h-3M3 18h9.5a4 4 0 0 0 2.4-.8l5.1-3.8a2 2 0 0 0-2.5-3.1l-2.2 1.6" /></svg>
}

export function CheckIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m5 12 4 4L19 6" /></svg>
}

export function GearIcon(props: IconProps) {
  return <svg {...base} {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>
}

export function SunIcon(props: IconProps) {
  return <svg {...base} {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
}

export function MoonIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.7 8.7 0 1 0 20.5 14.2Z" /></svg>
}

export function DeviceIcon(props: IconProps) {
  return <svg {...base} {...props}><rect x="5" y="2.5" width="14" height="19" rx="3" /><path d="M10 18.5h4" /></svg>
}

export function CloseIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>
}
