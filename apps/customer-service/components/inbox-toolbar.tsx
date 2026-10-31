'use client';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@seapilot/ui';
export function InboxToolbar({ count, oldestFirst, onSort }: { count: number; oldestFirst: boolean; onSort: (oldest: boolean) => void }) {
  return <div className="inbox-toolbar"><span role="status">{count} {count === 1 ? 'conversation' : 'conversations'}</span><Select value={oldestFirst ? 'oldest' : 'newest'} onValueChange={value => onSort(value === 'oldest')}><SelectTrigger aria-label="Sort conversations by start time"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest first</SelectItem><SelectItem value="oldest">Oldest first</SelectItem></SelectContent></Select></div>;
}
