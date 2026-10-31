'use client';
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import * as Dialog from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ArrowUpRight, Box, X, Compass, ImageIcon } from 'lucide-react';
export { ArrowUp, ArrowUpRight, ArrowLeft, ArrowRight, Check, CheckCheck, ChevronDown, ChevronRight, Clock3, Inbox, Link2, MessageSquare, MoreHorizontal, Package, Paperclip, Plus, Search, Send, ShieldCheck, Sparkles, Truck, X, RotateCcw, CalendarDays, PanelRight, CheckCircle2, AlertCircle, FileImage, LifeBuoy, Settings2, History } from 'lucide-react';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
// Adapted from the shadcn/ui Radix Button pattern (MIT).
const buttonVariants = cva('button', { variants: { variant: { default: 'button-primary', outline: 'button-outline', ghost: 'button-ghost', secondary: 'button-secondary' }, size: { default: '', sm: 'button-sm', icon: 'button-icon' } }, defaultVariants: { variant: 'default', size: 'default' } });
export function Button({ className, variant, size, asChild, type = 'button', ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp data-slot="button" type={asChild ? undefined : type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand"><span className="brand-symbol"><Compass size={23} strokeWidth={1.8} /></span>{!compact && <span>seaPilot<span className="brand-dot">.</span></span>}</span>;
}
export function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return <span aria-hidden="true" className={cn('avatar', small && 'avatar-small', name === 'Lan Nguyen' && 'avatar-customer')}>{name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>;
}
export function Badge({ children, tone = 'neutral', className }: { children: React.ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'blue'; className?: string }) {
  return <span className={cn('badge', `badge-${tone}`, className)}>{children}</span>;
}
export function SourceBadge({ source }: { source: 'customer' | 'system' | 'unverified' }) {
  return <Badge tone={source === 'system' ? 'green' : source === 'customer' ? 'blue' : 'amber'}>{source[0].toUpperCase() + source.slice(1)}</Badge>;
}
export function EvidenceTile({ parcel, onClick }: { parcel: 'A' | 'B'; onClick?: () => void }) {
  return <button type="button" className="evidence-tile" onClick={onClick} aria-label={`View parcel ${parcel} sample attachment`}><span className="evidence-art"><Box size={27} strokeWidth={1.3} /><span>Sample attachment</span></span><span className="evidence-caption"><ImageIcon size={14} />Parcel {parcel}{parcel === 'B' ? ' · opened' : ''}<ArrowUpRight size={14} /></span></button>;
}
export function Sheet({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; children: React.ReactNode }) {
  const returnFocus = React.useRef<HTMLElement | null>(null);
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="sheet-overlay" /><Dialog.Content className="sheet-content" onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }} onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus(); }}><div className="sheet-heading"><Dialog.Title>{title}</Dialog.Title><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close panel"><X size={20} /></Button></Dialog.Close></div><Dialog.Description className="sheet-description">{description}</Dialog.Description>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Box size={28} strokeWidth={1.3} /></span><h2>{title}</h2><p>{children}</p></div>;
}
