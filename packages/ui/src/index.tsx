'use client';
import * as React from 'react';
import { ArrowUpRight, Box, ImageIcon } from 'lucide-react';
import { Button as ShadcnButton, type ButtonProps } from './components/button';
import { Badge as ShadcnBadge } from './components/badge';
import { Avatar as ShadcnAvatar, AvatarFallback } from './components/avatar';
import { Sheet as SheetRoot, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './components/sheet';
import { Card, CardContent } from './components/card';
import { BrandMark } from './brand';
import { cn } from './lib/utils';

export { cn } from './lib/utils';
export { Input } from './components/input';
export { Textarea } from './components/textarea';
export { Label } from './components/label';
export { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './components/card';
export { Alert, AlertDescription, AlertTitle } from './components/alert';
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './components/select';
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './components/accordion';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/tabs';
export { ArrowUp, ArrowUpRight, ArrowLeft, ArrowRight, Check, CheckCheck, ChevronDown, ChevronRight, Clock3, Inbox, Link2, MessageSquare, MoreHorizontal, Package, Paperclip, Plus, Search, Send, ShieldCheck, Sparkles, Truck, X, RotateCcw, CalendarDays, PanelRight, CheckCircle2, AlertCircle, FileImage, LifeBuoy, Settings2, History } from 'lucide-react';

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => (
    <ShadcnButton ref={ref} type={type} variant={variant} size={size}
      className={cn('button', `button-${variant === 'default' ? 'primary' : variant}`, size !== 'default' && `button-${size}`, className)} {...props} />
  ),
);
Button.displayName = 'Button';

export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand" aria-label={compact ? 'seaPilot' : undefined}>
    <span className="brand-symbol"><BrandMark width={28} height={28} /></span>
    {!compact && <span>seaPilot<span className="brand-dot">.</span></span>}
  </span>;
}
export function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return <ShadcnAvatar aria-hidden="true" className={cn('avatar', small && 'avatar-small', name === 'Lan Nguyen' && 'avatar-customer')}>
    <AvatarFallback className="avatar-fallback">{name.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback>
  </ShadcnAvatar>;
}
export function Badge({ children, tone = 'neutral', className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { children: React.ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'blue' }) {
  return <ShadcnBadge variant="secondary" className={cn('badge', `badge-${tone}`, className)} {...props}>{children}</ShadcnBadge>;
}
export function SourceBadge({ source }: { source: 'customer' | 'system' | 'unverified' }) {
  return <Badge tone={source === 'system' ? 'green' : source === 'customer' ? 'blue' : 'amber'}>{source[0].toUpperCase() + source.slice(1)}</Badge>;
}
export function EvidenceTile({ parcel, onClick }: { parcel: 'A' | 'B'; onClick?: () => void }) {
  return <Button variant="ghost" className="evidence-tile" onClick={onClick} aria-label={`View parcel ${parcel} sample attachment`}>
    <span className="evidence-art"><Box size={27} strokeWidth={1.3} /><span>Sample attachment</span></span>
    <span className="evidence-caption"><ImageIcon size={14} />Parcel {parcel}{parcel === 'B' ? ' · opened' : ''}<ArrowUpRight size={14} /></span>
  </Button>;
}
export function Sheet({ open, onOpenChange, title, description, children, onCloseFocus }: { onCloseFocus?: () => void; open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; children: React.ReactNode }) {
  const returnFocus = React.useRef<HTMLElement | null>(null);
  return <SheetRoot open={open} onOpenChange={onOpenChange}>
    <SheetContent className="sheet-content" onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
      onCloseAutoFocus={event => { event.preventDefault(); if (onCloseFocus) onCloseFocus(); else returnFocus.current?.focus(); }}>
      <SheetHeader className="sheet-heading"><SheetTitle>{title}</SheetTitle></SheetHeader>
      <SheetDescription className="sheet-description">{description}</SheetDescription>
      {children}
    </SheetContent>
  </SheetRoot>;
}
export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card className="empty-state"><CardContent className="empty-state-content">
    <span className="empty-icon"><Box size={28} strokeWidth={1.3} /></span><h2>{title}</h2><p>{children}</p>
  </CardContent></Card>;
}
